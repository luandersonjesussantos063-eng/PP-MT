import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {makeHandler,PilotError} from './logic.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
 auth:{persistSession:false,autoRefreshToken:false}
});
function checked<T>(r:{data:T,error:unknown}):T{
 if(r.error)throw new Error('Operação no banco indisponível');
 return r.data;
}
const table='ppmt_centavo_premium_orders';
const db={
 async isTester(userId:string){
  return Boolean(checked(await admin.from('billing_sandbox_testers').select('user_id').eq('user_id',userId).maybeSingle()));
 },
 async enabled(){
  const flags=checked(await admin.from('ppmt_commercial_flags')
   .select('delivery_ready,private_pilot_enabled').eq('id',1).single());
  return flags.delivery_ready===true && flags.private_pilot_enabled===true;
 },
 async token(){return Deno.env.get('MP_ACCESS_TOKEN_PROD')||null;},
 async get(userId:string){
  return checked(await admin.from(table).select('*').eq('user_id',userId).maybeSingle());
 },
 async claim(userId:string){
  const r=await admin.from(table).insert({user_id:userId}).select('*').single();
  if(r.error?.code==='23505')return null;
  return checked(r);
 },
 async update(id:string,fields:Record<string,unknown>){
  checked(await admin.from(table).update({...fields,updated_at:new Date().toISOString()}).eq('id',id).select('id').single());
 },
 async approve(id:string,paymentId:string){
  checked(await admin.rpc('ppmt_approve_centavo_premium',{p_order_id:id,p_payment_id:paymentId}));
 },
 async revoke(id:string,paymentId:string){
  checked(await admin.rpc('ppmt_revoke_centavo_premium',{p_order_id:id,p_payment_id:paymentId}));
 }
};
Deno.serve(makeHandler({
 db,
 async authenticate(jwt:string){const {data,error}=await admin.auth.getUser(jwt);return error?null:data.user;},
 async mp(access:string,path:string,method='GET',body:unknown=null,idempotency:string|null=null){
  const headers:Record<string,string>={'Authorization':'Bearer '+access,'Content-Type':'application/json'};
  if(method==='POST'){
   if(!idempotency)throw new PilotError(500,'Chave de idempotência ausente.');
   headers['X-Idempotency-Key']=idempotency;
  }
  const response=await fetch('https://api.mercadopago.com'+path,{
   method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),redirect:'error'
  });
  if(!response.ok)throw new PilotError(503,'Mercado Pago não concluiu a operação. Consulte o status antes de repetir.');
  return await response.json();
 }
}));
