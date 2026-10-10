import {createClient} from './assets/vendor/supabase-2.117.2.js';
// A chave sb_publishable é pública; segredos de cobrança permanecem no servidor.
const supabase=createClient(
 'https://fermfbmhwlafwopwndoj.supabase.co',
 'sb_publishable_Nz1NSEvEmmIHI7LUREPNyg_Wxsrn5ZN',
 {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
export async function loginWithGoogle(destination='app'){
 const routes={app:null,checkout:'/PP-MT/planos/assinar.html',premium:'/PP-MT/planos/premium.html'};
 if(!(destination in routes))throw new Error('Destino de login inválido.');
 if(routes[destination])sessionStorage.setItem('ppmt-google-oauth-return',routes[destination]);
 else sessionStorage.removeItem('ppmt-google-oauth-return');
 if(navigator.onLine===false)throw new Error('É necessário estar conectado para entrar com Google.');
 const redirectTo='https://luandersonjesussantos063-eng.github.io/PP-MT/';
 const {data,error}=await supabase.auth.signInWithOAuth({
  provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}
 });
 if(error)throw error;
 return data;
}
export function takeGoogleReturn(){
 const target=sessionStorage.getItem('ppmt-google-oauth-return');
 sessionStorage.removeItem('ppmt-google-oauth-return');
 if(['/PP-MT/planos/assinar.html','/PP-MT/planos/premium.html'].includes(target))return target;
 return null;
}
export async function studyQuota(action='status',units=1,eventId=null){
 if(navigator.onLine===false)throw new Error('Conecte-se para consultar o limite do plano gratuito.');
 if(!['status','question','exam','block'].includes(action))throw new Error('Ação inválida.');
 const {data,error}=await supabase.rpc('ppmt_study_quota',{
  p_action:action,p_event_id:action==='status'?null:(eventId||crypto.randomUUID()),
  p_units:action==='status'?1:units
 });
 if(error)throw new Error('Não foi possível consultar a cota. Verifique a conexão e tente novamente.');
 if(!data||typeof data.allowed!=='boolean')throw new Error('Resposta de limite inválida.');
 return data;
}
