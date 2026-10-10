import {createClient} from './assets/vendor/supabase-2.117.2.js';
// A chave sb_publishable é pública; segredos de cobrança permanecem no servidor.
const supabase=createClient(
 'https://fermfbmhwlafwopwndoj.supabase.co',
 'sb_publishable_Nz1NSEvEmmIHI7LUREPNyg_Wxsrn5ZN',
 {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
// Rota relativa ao aplicativo permite manter o GitHub Pages como endereço antigo
// e usar um subdomínio próprio sem misturar cookies ou sessões entre origens.
const APP_ROOT=new URL('./',import.meta.url);
const AUTH_DESTINATIONS=new Map([
 ['checkout',new URL('planos/assinar.html',APP_ROOT).pathname],
 ['premium',new URL('planos/premium.html',APP_ROOT).pathname]
]);
export async function loginWithGoogle(destination='app'){
 if(destination!=='app'&&!AUTH_DESTINATIONS.has(destination))throw new Error('Destino de login inválido.');
 const returnPath=AUTH_DESTINATIONS.get(destination);
 if(returnPath)sessionStorage.setItem('ppmt-google-oauth-return',returnPath);
 else sessionStorage.removeItem('ppmt-google-oauth-return');
 if(navigator.onLine===false)throw new Error('É necessário estar conectado para entrar com Google.');
 const redirectTo=APP_ROOT.href;
 const {data,error}=await supabase.auth.signInWithOAuth({
  provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}
 });
 if(error)throw error;
 return data;
}
export function takeGoogleReturn(){
 const target=sessionStorage.getItem('ppmt-google-oauth-return');
 sessionStorage.removeItem('ppmt-google-oauth-return');
 if([...AUTH_DESTINATIONS.values()].includes(target))return target;
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

export async function myPremiumOffers(){
 const {data:sessionData,error:sessionError}=await supabase.auth.getSession();
 if(sessionError||!sessionData.session)throw new Error('Entre na sua conta para consultar as notificações.');
 const {data,error}=await supabase.functions.invoke('ppmt-my-offers',{headers:{Authorization:'Bearer '+sessionData.session.access_token}});
 if(error||!Array.isArray(data?.offers))throw new Error('Não foi possível carregar as ofertas.');
 return data.offers;
}
