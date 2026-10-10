// Endpoint SOMENTE para diagnosticar conectividade POST do simulador Mercado Pago.
// Nunca usa credenciais, Supabase DB ou API financeira e jamais concede assinatura.
const TYPES=new Set(['subscription_preapproval','subscription_authorized_payment','payment']);
export function makeConnectivityTestHandler(){
 const reply=(status,message)=>new Response(message,{status,headers:{
  'content-type':'text/plain; charset=utf-8','cache-control':'no-store'
 }});
 return async req=>{
  if(req.method!=='POST')return reply(405,'Envie o teste por POST.');
  try{
   const contentType=String(req.headers.get('content-type')||'');
   if(!/^application\/json(?:\s*;|$)/i.test(contentType))return reply(415,'Envie JSON.');
   if(Number(req.headers.get('content-length')||0)>4096)return reply(413,'Payload excedeu o limite.');
   const body=await req.text();
   if(body.length>4096)return reply(413,'Payload excedeu o limite.');
   let event;try{event=JSON.parse(body);}catch{return reply(400,'JSON invalido.');}
   if(!event||typeof event!=='object'||
      !TYPES.has(event.type)||String(event.data?.id)!=='123456'||
      !['updated','created'].includes(event.action))return reply(422,'Somente notificacoes ficticias com data.id=123456 sao aceitas.');
   // Sem acesso ao banco, pagamentos ou gabaritos; sucesso significa SOMENTE conectividade.
   return reply(200,'TESTE RECEBIDO — nenhuma cobranca ou assinatura alterada.');
  }catch{return reply(400,'Falha na leitura do teste.');}
 };
}
