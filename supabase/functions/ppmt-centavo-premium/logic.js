// Pix real de R$ 0,01: somente conta autorizada. Libera TESTE Premium por 24h.
// NUNCA altera a cobrança oficial (R$ 19,99/mês) nem memberships.
// Valor, vendedor, método Pix e prazo são impostos pelo servidor.
export const CENT=0.01;
export const SELLER=740298583;
export const ORIGIN='https://luandersonjesussantos063-eng.github.io';
export class PilotError extends Error{
 constructor(status,message){super(message);this.status=status;}
}
const fail=(status,message)=>{throw new PilotError(status,message);};
const digits=value=>/^[0-9]{1,25}$/.test(String(value||''));
export function exactPayment(payment,row){
 return !!payment && !!row?.provider_payment_id &&
  digits(payment.id) && String(payment.id)===String(row.provider_payment_id) &&
  payment.live_mode===true && Number(payment.collector_id)===SELLER &&
  Number(payment.transaction_amount)===CENT &&
  payment.currency_id==='BRL' && payment.payment_method_id==='pix' &&
  String(payment.external_reference||'')===String(row.id);
}
const safeTicket=value=>{
 if(typeof value!=='string')return null;
 try{const url=new URL(value);
  return url.protocol==='https:'&&
  ['www.mercadopago.com.br','mercadopago.com.br'].includes(url.hostname)&&
  !url.port&&!url.username&&!url.password?url.href:null;
 }catch{return null;}
};
const safePixCode=value=>typeof value==='string'&&value.length>20&&value.length<2500?value:null;
const statusName=value=>['approved','pending','refunded','cancelled','rejected','expired','needs_review'].includes(value)?value:'pending';
const active=row=>row?.state==='approved'&&typeof row.premium_until==='string'&&Date.parse(row.premium_until)>Date.now();
function result(row,payment){
 const detail=payment?.point_of_interaction?.transaction_data||{};
 return {amount:CENT,pilot:true,recurring:false,state:row?.state||'none',
  premium_test_active:Boolean(active(row)),premium_until:row?.premium_until||null,
  payment_confirmed:row?.state==='approved',
  pix_code:row?.state==='pending'?safePixCode(detail.qr_code):null,
  ticket_url:row?.state==='pending'?safeTicket(detail.ticket_url):null
 };
}
export function makeHandler({authenticate,db,mp}){
 return async req=>{
  const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',
   'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin',
   'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
   'Access-Control-Allow-Methods':'POST,OPTIONS'};
  const send=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers});
  if(req.headers.get('Origin')&&req.headers.get('Origin')!==ORIGIN)return send({error:'Origem não permitida.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return send({error:'Use POST.'},405);
  try{
   const token=req.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)fail(401,'Entre na sua conta PP-MT.');
   const user=await authenticate(token);
   if(!user||user.is_anonymous||!user.email_confirmed_at||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email||''))fail(401,'Confirme o e-mail da conta PP-MT.');
   if(!await db.isTester(user.id))fail(403,'Teste reservado à conta administradora.');
   const bodyText=await req.text();
   if(bodyText.length>160)fail(413,'Solicitação muito grande.');
   let input;try{input=JSON.parse(bodyText);}catch{fail(400,'JSON inválido.');}
   if(!['check','create','status'].includes(input?.action))fail(400,'Ação inválida.');
   const enabled=await db.enabled();
   const access=await db.token();
   if(input.action==='check'){
    return send({amount:CENT,pilot:true,enabled:Boolean(enabled&&access),recurring:false});
   }
   // Após desligar o piloto, continua possível consultar pagamentos existentes
   // sem criar novos. Só o administrador consegue usar esse endpoint.
   if(input.action==='create'&&(!enabled||!access))fail(503,'Teste de um centavo ainda não autorizado.');
   if(!access)fail(503,'Credencial Mercado Pago indisponível.');
   const seller=await mp(access,'/users/me','GET');
   if(Number(seller?.id)!==SELLER||seller?.site_id!=='MLB'||seller?.tags?.includes('test_user'))
     fail(503,'Credencial não corresponde à conta real do Mercado Pago.');
   let row=await db.get(user.id);
   if(input.action==='status'&&!row)return send(result(null,null));
   if(input.action==='create'&&!row){
    row=await db.claim(user.id);
    if(!row)fail(409,'O pagamento já está sendo criado. Consulte o status.');
    try{
     const payment=await mp(access,'/v1/payments','POST',{
      transaction_amount:CENT,
      description:'PP-MT Premium — teste único de 1 centavo (24 horas)',
      payment_method_id:'pix',payer:{email:user.email},external_reference:row.id
     },row.id);
     const record={...row,provider_payment_id:String(payment?.id??'')};
     if(!exactPayment(payment,record)){
      await db.update(row.id,{state:'needs_review'});
      fail(502,'Dados da cobrança não conferem. Consulte o suporte antes de tentar novamente.');
     }
     await db.update(row.id,{provider_payment_id:record.provider_payment_id,
      state:payment.status==='approved'?'pending':statusName(payment.status)});
     row=await db.get(user.id);
    }catch(err){
     await db.update(row.id,{state:'needs_review'});
     throw err;
    }
   }
   if(!row?.provider_payment_id)fail(409,'Cobrança anterior em revisão. Nenhuma nova cobrança será criada.');
   const payment=await mp(access,'/v1/payments/'+encodeURIComponent(row.provider_payment_id),'GET');
   if(!exactPayment(payment,row))fail(502,'O pagamento não corresponde ao valor e destinatário esperados.');
   if(payment.status==='approved'&&Number(payment.transaction_amount_refunded||0)===0){
    await db.approve(row.id,row.provider_payment_id);
   }else if(['refunded','charged_back'].includes(payment.status)||Number(payment.transaction_amount_refunded||0)>0){
    await db.revoke(row.id,row.provider_payment_id);
   }else if(row.state!=='approved'&&row.state!=='refunded'){
    await db.update(row.id,{state:statusName(payment.status)});
   }
   row=await db.get(user.id);
   return send(result(row,payment));
  }catch(err){
   return send({error:err instanceof PilotError?err.message:'Não foi possível confirmar o Pix. Consulte o status antes de repetir.'},
    err instanceof PilotError?err.status:503);
  }
 };
}
