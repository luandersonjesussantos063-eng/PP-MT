// Somente o backend vê gabarito e explicações até a questão ser respondida.
// Conteúdo Premium permanece no Supabase com RLS, fora do GitHub Pages.
export class PracticeError extends Error{
 constructor(status,message){super(message);this.status=status;}
}
const deny=(status,message)=>{throw new PracticeError(status,message);};
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const validId=id=>typeof id==='string'&&/^mt-premium-[a-z0-9-]{4,90}$/.test(id);
export const paidMembership=member=>Boolean(member?.status==='active'&&typeof member.current_period_end==='string'&&Date.parse(member.current_period_end)>Date.now());

export function makePracticeHandler({authenticate,db}){
 return async(req)=>{
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const send=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return send({error:'Origem não autorizada.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return send({error:'Método inválido.'},405);
  try{
   const jwt=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!jwt)deny(401,'Entre na conta PP-MT.');
   const user=await authenticate(jwt);
   if(!user||user.is_anonymous||!user.email_confirmed_at)deny(401,'Entre em uma conta com e-mail confirmado.');
   const raw=await req.text();if(raw.length>350)deny(413,'Solicitação muito grande.');
   let input;try{input=JSON.parse(raw);}catch{deny(400,'Solicitação inválida.');}
   if(!['status','next','answer'].includes(input?.action))deny(400,'Ação inválida.');
   const member=await db.member(user.id);
   if(!paidMembership(member))return send({premium:false,state:'locked',upgrade_url:'./assinar.html'},input.action==='status'?200:402);
   if(input.action==='status'){
    const summary=await db.summary(user.id);
    return send({premium:true,state:'active',current_period_end:member.current_period_end,...summary});
   }
   if(input.action==='next'){
    const q=await db.next(user.id);
    if(!q)return send({premium:true,state:'empty',message:'Novas questões em preparação.'});
    return send({premium:true,state:'question',question:{
     id:q.id,subject:q.subject,topic:q.topic,statement:q.statement,options:q.options
    }});
   }
   if(!validId(input.id)||!Number.isInteger(input.selected_index)||input.selected_index<0||input.selected_index>4)
    deny(400,'Resposta inválida.');
   const q=await db.get(input.id);
   if(!q||!q.active||!Array.isArray(q.options)||input.selected_index>=q.options.length)
    deny(404,'Questão indisponível.');
   // O resultado é calculado no servidor; jamais aceite o gabarito informado pelo aluno.
   const correct=input.selected_index===q.answer_index;
   await db.record(user.id,q.id,input.selected_index,correct);
   return send({premium:true,state:'answered',correct,answer_index:q.answer_index,explanation:q.explanation});
  }catch(e){
   return send({error:e instanceof PracticeError?e.message:'Não foi possível carregar seu treino Premium.'},e instanceof PracticeError?e.status:503);
  }
 };
}
