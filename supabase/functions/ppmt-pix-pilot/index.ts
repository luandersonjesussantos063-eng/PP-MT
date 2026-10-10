import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createHandler,PixError} from './logic.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>(result:{data:T,error:unknown}):T {if(result.error)throw new Error('Falha na operação do banco');return result.data;}
const db={
 async isTester(userId:string){
   return Boolean(checked(await admin.from('billing_sandbox_testers').select('user_id').eq('user_id',userId).maybeSingle()));
 },
 async isEnabled(){return Deno.env.get('PIX_PILOT_ENABLED')==='true';},
 async token(){return Deno.env.get('MP_ACCESS_TOKEN_PROD')||null;},
 async get(userId:string){return checked(await admin.from('pix_pilot_orders').select('*').eq('user_id',userId).maybeSingle());},
 async claim(userId:string){
   const r=await admin.from('pix_pilot_orders').insert({user_id:userId}).select('*').single();
   if(r.error?.code==='23505')return null;
   return checked(r);
 },
 async update(id:string,patch:Record<string,unknown>){
   checked(await admin.from('pix_pilot_orders').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('id').single());
 }
};
Deno.serve(createHandler({
 db,
 async authenticate(jwt:string){const {data,error}=await admin.auth.getUser(jwt);return error?null:data.user;},
 async mercado(token:string,path:string,method:string,body:unknown,idempotency:string|null){
   const headers:Record<string,string>={'Authorization':'Bearer '+token,'Content-Type':'application/json'};
   if(method==='POST'){
     if(!idempotency)throw new PixError(500,'Chave de idempotência ausente.');
     headers['X-Idempotency-Key']=idempotency;
   }
   const response=await fetch('https://api.mercadopago.com'+path,{
     method,headers,body:body?JSON.stringify(body):undefined,
     signal:AbortSignal.timeout(12000),redirect:'error'
   });
   if(!response.ok){
     if(method==='POST'&&response.status===400)throw new PixError(422,'O Mercado Pago recusou a cobrança de R$ 0,01. O valor não foi aumentado automaticamente.');
     throw new PixError(503,'Mercado Pago não concluiu a operação (HTTP '+response.status+'). Consulte a situação antes de tentar novamente.');
   }
   return await response.json();
 }
}));
