// Serviço de explicação de questões após erro, independente do frontend e testável sem rede.
const ORIGINS=new Set([
 'https://luandersonjesussantos063-eng.github.io',
 'https://ppmt.novabytesolucoes.com.br'
]);
export function validateQuestion(input){
 const q=input?.question;
 if(!q||typeof q!=='object')return null;
 const bounded=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max;
 if(!bounded(q.statement,20,3500)||!bounded(q.subject,3,120)||
    !bounded(q.topic,2,180)||!Array.isArray(q.options)||
    q.options.length<2||q.options.length>5||!q.options.every(o=>bounded(o,1,550))||
    !Number.isInteger(q.answer_index)||q.answer_index<0||q.answer_index>=q.options.length||
    !Number.isInteger(q.selected_index)||q.selected_index<0||q.selected_index>=q.options.length||
    q.selected_index===q.answer_index)return null;
 return {
  id:typeof q.id==='string'?q.id.slice(0,140):'',
  subject:q.subject.trim(),topic:q.topic.trim(),statement:q.statement.trim(),
  options:q.options.map(x=>x.trim()),selected_index:q.selected_index,
  answer_index:q.answer_index,
  existing_explanation:typeof q.existing_explanation==='string'?q.existing_explanation.slice(0,1200):''
 };
}
export async function cacheKey(question){
 const data=new TextEncoder().encode(JSON.stringify(question));
 const digest=await crypto.subtle.digest('SHA-256',data);
 return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
const cleanSources=list=>(Array.isArray(list)?list:[]).filter(x=>{
 try{const u=new URL(x.url);return u.protocol==='https:'&&u.hostname.length>3&&
 typeof x.title==='string'&&x.title.length>0;}catch{return false}
}).slice(0,5).map(x=>({url:x.url,title:x.title.slice(0,160)}));
export function makeExplainHandler({authenticate,db,generate}){
 return async req=>{
  const origin=req.headers.get('Origin')||'';
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
    'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://luandersonjesussantos063-eng.github.io',
    'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
    'Access-Control-Allow-Methods':'POST,OPTIONS'};
  const send=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
  if(origin&&!ORIGINS.has(origin))return send({error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return send({error:'Método não permitido.'},405);
  try{
   const jwt=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!jwt)return send({error:'Entre na sua conta para consultar a IA.'},401);
   const user=await authenticate(jwt);
   if(!user||user.is_anonymous||!user.email_confirmed_at)return send({error:'Confirme seu e-mail e entre na conta.'},401);
   const raw=await req.text();if(raw.length>7800)return send({error:'Questão longa demais.'},413);
   let input;try{input=JSON.parse(raw)}catch{return send({error:'Solicitação inválida.'},400)}
   if(input.action!=='explain')return send({error:'Ação inválida.'},400);
   const question=validateQuestion(input);
   if(!question)return send({error:'A IA só analisa questões respondidas incorretamente.'},422);
   const key=await cacheKey(question);
   const saved=await db.cached(key);
   if(saved?.explanation)return send({explanation:saved.explanation,sources:cleanSources(saved.sources),cached:true,grounded:saved.sources?.length>0});
   if(!await db.ready())return send({error:'A IA ainda não foi conectada pelo administrador. As explicações existentes continuam gratuitas.'},503);
   const tier=await db.tier(user.id);
   const dailyLimit=tier==='premium'?10:2;
   const allowed=await db.reserve(user.id,new Date().toISOString().slice(0,10),dailyLimit);
   if(!allowed)return send({error:'Seu limite diário de explicações por IA foi alcançado. Continue com as explicações do app e tente amanhã.'},429);
   let result;
   try{result=await generate(question)}catch{
    return send({error:'A pesquisa com IA está indisponível agora. Use o comentário da questão e tente mais tarde.'},503)
   }
   if(!result||typeof result.explanation!=='string'||result.explanation.trim().length<60)
    return send({error:'A IA não conseguiu produzir uma explicação confiável. Consulte o comentário da questão.'},503);
   const explanation=result.explanation.trim().slice(0,8000);
   const sources=cleanSources(result.sources);
   await db.save(key,explanation,sources).catch(()=>{});
   return send({explanation,sources,grounded:sources.length>0,cached:false});
  }catch{
   return send({error:'Não foi possível processar a explicação agora. Tente novamente.'},503);
  }
 };
}
