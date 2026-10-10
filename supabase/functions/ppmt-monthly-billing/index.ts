import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {makeHandler,BillingError} from './logic.js';
import {providerErrorCode} from './provider-error.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>(r:{data:T,error:unknown}):T{
 if(r.error)throw new Error('Erro de banco de dados');return r.data;
}
const db={
 // Flags privadas consultadas em cada pedido; nunca concedemos acesso de escrita ao navegador.
 async flags(){
  return checked(await admin.from('ppmt_commercial_flags')
   .select('delivery_ready,private_pilot_enabled,public_sales_enabled')
   .eq('id',1).single());
 },
 async enabled(){
  const flags=await this.flags();
  return flags.public_sales_enabled===true && flags.delivery_ready===true &&
   Deno.env.get('PPMT_MONTHLY_BILLING_ENABLED')==='true' &&
   Boolean(Deno.env.get('MP_WEBHOOK_SECRET'));
 },
 async privatePilot(id:string){
  const flags=await this.flags();
  if(flags.private_pilot_enabled!==true||flags.delivery_ready!==true||
     !Deno.env.get('MP_WEBHOOK_SECRET'))return false;
  return this.isTester(id);
 },
 async isTester(id:string){
  return Boolean(checked(await admin.from('billing_sandbox_testers').select('user_id')
   .eq('user_id',id).maybeSingle()));
 },
 async diagnostics(){
  const flags=await this.flags();
  return {
   webhook_secret_present:Boolean(Deno.env.get('MP_WEBHOOK_SECRET')),
   delivery_flag:flags.delivery_ready===true,
   billing_flag:flags.public_sales_enabled===true &&
    Deno.env.get('PPMT_MONTHLY_BILLING_ENABLED')==='true',
   private_pilot_flag:flags.private_pilot_enabled===true
  };
 },
 async token(){return Deno.env.get('MP_ACCESS_TOKEN_PROD')||null;},
 async member(id:string){return checked(await admin.from('memberships').select('status,current_period_end').eq('user_id',id).maybeSingle());},
 async card(id:string){return checked(await admin.from('ppmt_monthly_cards').select('*').eq('user_id',id).maybeSingle());},
 async claimCard(id:string){
  const r=await admin.from('ppmt_monthly_cards').insert({user_id:id}).select('*').single();
  if(r.error?.code==='23505')return null;return checked(r);
 },
 async updateCard(userId:string,fields:Record<string,unknown>){
  checked(await admin.from('ppmt_monthly_cards').update({...fields,updated_at:new Date().toISOString()}).eq('user_id',userId).select('user_id').single());
 },
 async openOrder(id:string){
  return checked(await admin.from('ppmt_monthly_orders').select('*').eq('user_id',id).in('state',['creating','pending','needs_review']).order('created_at',{ascending:false}).limit(1).maybeSingle());
 },
 async claimOrder(id:string){
  const r=await admin.from('ppmt_monthly_orders').insert({user_id:id}).select('*').single();
  if(r.error?.code==='23505')return null;return checked(r);
 },
 async updateOrder(id:string,fields:Record<string,unknown>){
  checked(await admin.from('ppmt_monthly_orders').update({...fields,updated_at:new Date().toISOString()}).eq('id',id).select('id').single());
 },
 async credit(userId:string,payment:any,source:string,reference?:string){
  const approvedAt=payment.date_approved;
  if(!approvedAt||!Number.isFinite(Date.parse(approvedAt)))return;
  if(source==='manual'){
    if(!reference)throw new Error('Referência da mensalidade ausente.');
    checked(await admin.rpc('ppmt_credit_verified_manual_payment',{
      p_user_id:userId,p_payment_id:String(payment.id),p_paid_at:payment.date_approved,p_reference:reference
    }));
    return;
  }
  checked(await admin.rpc('ppmt_credit_verified_monthly_payment',{
   p_user_id:userId,p_payment_id:String(payment.id),p_source:source,p_paid_at:approvedAt
  }));
 },
 async void(id:string){checked(await admin.rpc('ppmt_void_verified_monthly_payment',{p_payment_id:String(id)}));}
};
Deno.serve(makeHandler({
 db,
 async authenticate(jwt:string){const {data,error}=await admin.auth.getUser(jwt);return error?null:data.user;},
 async mp(token:string,path:string,method='GET',body:unknown=null,key:string|null=null){
  const headers:Record<string,string>={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  if(key&&method==='POST')headers['X-Idempotency-Key']=key;
  // Mercado Pago documenta a API de identidade do vendedor no dominio Mercado Livre.
  // Apenas /users/me usa esse host; pagamentos e assinaturas ficam em api.mercadopago.com.
  const host=path==='/users/me'?'https://api.mercadolibre.com':'https://api.mercadopago.com';
  const res=await fetch(host+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!res.ok){
   // Log apenas da etapa e do HTTP; sem token, e-mail, pedido ou resposta do provedor.
   const operation=path==='/users/me'?'merchant_validation':
    path==='/checkout/preferences'?'manual_checkout':
    path.startsWith('/checkout/preferences/search')?'checkout_api_readonly':
    path==='/preapproval'?'card_subscription':
    path.startsWith('/preapproval/')?'subscription_status':
    path.startsWith('/authorized_payments')?'authorized_payment_status':
    path.startsWith('/v1/payments/')?'payment_verification':'other';
   // Somente identificadores de erro com caracteres estritamente controlados.
   // Nunca registrar mensagem livre, detalhes da resposta, access token ou email.
   let code=null;
   try{
    const payload=await res.json();
    code=providerErrorCode(payload);
   }catch{}
   console.warn('PPMT Mercado Pago recusou etapa', {operation,status:res.status,code});
   throw new BillingError(res.status>=500?503:422,
    code==='invalid_token'?
    'O Mercado Pago recusou a credencial de produção (invalid_token). O administrador precisa atualizar o Access Token no servidor. Nenhuma nova cobrança foi confirmada.':
    res.status===401||res.status===403?
    'A credencial de produção do Mercado Pago precisa ser verificada pelo administrador. Nenhuma nova cobrança foi confirmada.':
    'O Mercado Pago não concluiu a operação. Consulte o status antes de criar nova cobrança.',
    res.status,code);
  }
  return await res.json();
 }
}));
