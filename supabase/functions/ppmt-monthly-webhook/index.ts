import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {webhookHandler} from './logic.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>(r:{data:T,error:unknown}):T{if(r.error)throw new Error('Database unavailable');return r.data;}
const db={
 async centavoByPayment(paymentId:string){
  if(!/^[0-9]{1,25}$/.test(paymentId))return null;
  return checked(await admin.from('ppmt_centavo_premium_orders').select('id,provider_payment_id')
   .eq('provider_payment_id',paymentId).maybeSingle());
 },
 async approveCentavo(orderId:string,paymentId:string){
  checked(await admin.rpc('ppmt_approve_centavo_premium',{p_order_id:orderId,p_payment_id:paymentId}));
 },
 async revokeCentavo(orderId:string,paymentId:string){
  checked(await admin.rpc('ppmt_revoke_centavo_premium',{p_order_id:orderId,p_payment_id:paymentId}));
 },
 async orderById(reference:string){
  if(!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(String(reference||'')))return null;
  return checked(await admin.from('ppmt_monthly_orders').select('*').eq('id',reference).maybeSingle());
 },
 async cardByProvider(providerId:string){
  if(!providerId||typeof providerId!=='string'||providerId.length>150)return null;
  return checked(await admin.from('ppmt_monthly_cards').select('*').eq('provider_id',providerId).maybeSingle());
 },
 async updateOrder(orderId:string,fields:Record<string,unknown>){
  checked(await admin.from('ppmt_monthly_orders').update({...fields,updated_at:new Date().toISOString()}).eq('id',orderId).select('id').single());
 },
 async updateCard(userId:string,fields:Record<string,unknown>){
  checked(await admin.from('ppmt_monthly_cards').update({...fields,updated_at:new Date().toISOString()}).eq('user_id',userId).select('user_id').single());
 },
 async credit(userId:string,payment:any,source:string,reference?:string){
  if(!payment.date_approved||!Number.isFinite(Date.parse(payment.date_approved)))throw new Error('Invalid approval date');
  if(source==='manual'){
    if(!reference)throw new Error('Referência da mensalidade ausente.');
    checked(await admin.rpc('ppmt_credit_verified_manual_payment',{
      p_user_id:userId,p_payment_id:String(payment.id),p_paid_at:payment.date_approved,p_reference:reference
    }));
    return;
  }
  checked(await admin.rpc('ppmt_credit_verified_monthly_payment',{
   p_user_id:userId,p_payment_id:String(payment.id),p_source:source,p_paid_at:payment.date_approved
  }));
 },
 async void(id:string){checked(await admin.rpc('ppmt_void_verified_monthly_payment',{p_payment_id:String(id)}));}
};
Deno.serve(webhookHandler({
 db,
 secret:async()=>Deno.env.get('MP_WEBHOOK_SECRET')||null,
 token:async()=>Deno.env.get('MP_ACCESS_TOKEN_PROD')||null,
 async mp(token:string,path:string){
  const res=await fetch('https://api.mercadopago.com'+path,{
   headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   signal:AbortSignal.timeout(12000),redirect:'error'
  });
  if(!res.ok)throw new Error('API response '+res.status);
  return await res.json();
 }
}));
