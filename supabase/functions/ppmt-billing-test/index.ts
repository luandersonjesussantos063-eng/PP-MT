import {createClient} from 'npm:@supabase/supabase-js@2.117.2';
import {createHandler, BillingError} from './logic.js';

const admin = createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked<T>({data,error}:{data:T,error:unknown}):T { if(error) throw new Error('Database operation failed'); return data; }
const db = {
 async isTester(id:string) { return !!checked(await admin.from('billing_sandbox_testers').select('user_id').eq('user_id',id).maybeSingle()); },
 async get(id:string) { return checked(await admin.from('billing_sandbox').select('*').eq('user_id',id).maybeSingle()); },
 async token() { return checked(await admin.rpc('billing_sandbox_token')); },
 async claim(id:string) {
  const result = await admin.from('billing_sandbox').insert({user_id:id}).select('*').single();
  if(result.error?.code === '23505') return null;
  return checked(result);
 },
 async update(id:string,patch:Record<string,unknown>) { checked(await admin.from('billing_sandbox').update({...patch,updated_at:new Date().toISOString()}).eq('user_id',id)); }
};
Deno.serve(createHandler({db,
 async authenticate(jwt:string) { const {data,error} = await admin.auth.getUser(jwt); return error ? null : data.user; },
 async mercado(token:string,path:string,method:string,body:unknown) {
  const response = await fetch(`https://api.mercadopago.com${path}`,{
   method, headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
   body:body ? JSON.stringify(body) : undefined, signal:AbortSignal.timeout(12000)
  });
  if(!response.ok) throw new BillingError(502,`O Mercado Pago não concluiu a solicitação (HTTP ${response.status}). Consulte o resultado antes de tentar outro teste.`);
  return await response.json();
 }
}));
