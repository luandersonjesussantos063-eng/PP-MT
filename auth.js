import {rememberAccount,cachedAccount,forgetAccount} from './offline.js?v=47';
import { createClient } from './assets/vendor/supabase-2.117.2.js';

const SUPABASE_URL = 'https://fermfbmhwlafwopwndoj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Nz1NSEvEmmIHI7LUREPNyg_Wxsrn5ZN';

let supabase;
const online=()=>navigator.onLine!==false;
function client(){return supabase??=createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  global:{fetch:async(input,options={})=>{
    if(!online())throw new TypeError("Sem conexão");
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    options.signal?.addEventListener("abort",()=>controller.abort(),{once:true});
    try{return await fetch(input,{...options,signal:controller.signal})}finally{clearTimeout(timer)}
  }}
})}

export async function getCurrentUser() {
  if(!online())return cachedAccount(localStorage);
  const {data,error}=await client().auth.getUser();
  if(error){
    if(error.name==='AuthRetryableFetchError'||error.name==='AbortError'||error instanceof TypeError)return cachedAccount(localStorage);
    forgetAccount(localStorage);return null;
  }
  if(data.user)rememberAccount(localStorage,data.user);else forgetAccount(localStorage);
  return data.user??null;
}
export async function verifiedUser(){
 if(!online())return null;
 const {data,error}=await client().auth.getUser();
 if(error)throw error;
 if(data.user)rememberAccount(localStorage,data.user);
 return data.user??null;
}

export async function signIn(email, password) {
  const { data, error } = await client().auth.signInWithPassword({ email, password });
  if (error) throw error;
  rememberAccount(localStorage,data.user);
  return data.user;
}

export async function signUp(email, password) {
  const { data, error } = await client().auth.signUp({ email, password });
  if (error) throw error;
  if(data.session&&data.user)rememberAccount(localStorage,data.user);
  return data;
}

export async function signOut() {
  if(online()){
    const {error}=await client().auth.signOut({scope:'local'});
    if(error)throw error;
  }else{
    // Do not refresh an expired session while the device is offline.
    localStorage.removeItem('sb-fermfbmhwlafwopwndoj-auth-token');
    await supabase?.auth.stopAutoRefresh();
    supabase=null;
  }
  forgetAccount(localStorage);
}

export async function loadUserState(userId) {
  if(!online())return null;
  const { data, error } = await client()
    .from('user_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data?.state ?? null;
}

export async function saveUserState(userId, state) {
  const { error } = await client()
    .from('user_state')
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}

// Read-only membership status, evaluated using the server clock and RLS.
export async function loadMembership(){
 if(!online())throw new Error('Conecte-se para consultar sua assinatura.');
 const {data:userData,error:userError}=await client().auth.getUser();
 if(userError)throw userError;
 if(!userData.user)throw new Error('Entre na sua conta.');
 const {data,error}=await client().rpc('my_membership');
 if(error)throw error;
 return data;
}


// Teste de assinaturas: exige usuário verificado, envia apenas a ação e, na criação,
// e-mail de comprador de teste. O token Mercado Pago nunca sai do Supabase.
export async function runBillingSandbox(action, payerEmail) {
  if(!online())throw new Error('Conecte-se à internet para testar pagamentos.');
  if(!['create','status','cancel','buyer_info'].includes(action))throw new Error('Ação inválida.');
  const user=await verifiedUser();
  if(!user)throw new Error('Faça login com sua conta PPMT antes de continuar.');
  const body={action};
  if(action==='create')body.payer_email=String(payerEmail||'').trim().toLowerCase();
  const {data,error}=await client().functions.invoke('ppmt-billing-test',{body});
  if(error){
    let message='';
    if(error.context && typeof error.context.json==='function'){
      try{message=String((await error.context.json())?.error||'');}catch{}
    }
    throw new Error(message.slice(0,220)||'A consulta de teste falhou. Confira sua autorização e tente novamente.');
  }
  if(data?.sandbox!==true)throw new Error('Resposta de teste inválida.');
  return data;
}


// Piloto real e restrito: compra ÚNICA por Pix, valor fixado no servidor (R$ 0,01).
// A função não altera memberships; não é assinatura nem paywall.
export async function runPixPilot(action){
  if(!online())throw new Error('Conecte-se à internet para consultar o Pix.');
  if(!['check','create','status'].includes(action))throw new Error('Ação Pix inválida.');
  const user=await verifiedUser();
  if(!user)throw new Error('Entre na sua conta PPMT.');
  const {data,error}=await client().functions.invoke('ppmt-pix-pilot',{body:{action}});
  if(error){
    let message='';
    if(typeof error.context?.json==='function'){
      try{message=String((await error.context.json())?.error||'');}catch{}
    }
    throw new Error(message.slice(0,230)||'A consulta Pix falhou; verifique o status antes de repetir.');
  }
  if(Number(data?.amount)!==0.01)throw new Error('O valor do Pix retornado não corresponde a R$ 0,01.');
  return data;
}


// Portal do PPMT Premium R$ 19,99/mês. Cartão recorrente; Pix/boleto/débito renovados no site.
export async function runMonthlyBilling(action) {
 if(!online())throw new Error('Conecte-se à internet para consultar sua mensalidade.');
 if(!['status','manual_checkout','card_start','card_cancel','cancel_manual','readiness'].includes(action))throw new Error('Ação de cobrança inválida.');
 const user=await verifiedUser();
 if(!user)throw new Error('Entre na sua conta PP-MT.');
 const {data,error}=await client().functions.invoke('ppmt-monthly-billing',{body:{action}});
 if(error){
  let message='';
  if(typeof error.context?.json==='function')try{message=String((await error.context.json())?.error||'');}catch{}
  throw new Error(message.slice(0,220)||'Não foi possível consultar seu pagamento. Confira a situação antes de repetir.');
 }
 if(data?.month!==true)throw new Error('Resposta de mensalidade inválida.');
 if(data.price!=null && (!Number.isFinite(Number(data.price))||Number(data.price)<0.01||Number(data.price)>19.99))throw new Error('Valor de pagamento fora do intervalo permitido.');
 if(action==='card_start' && data.price!=null && Number(data.price)!==19.99)throw new Error('Assinatura recorrente exige o preço integral.');
 return data;
}


// Treino pago: JWT do aluno, gabarito nunca incluído no script público.
export async function runPremiumPractice(action,fields={}) {
  if(!navigator.onLine)throw new Error('O treino Premium exige conexão para verificar o acesso.');
  if(!['status','next','answer'].includes(action))throw new Error('Ação inválida.');
  const user=await verifiedUser();
  if(!user)throw new Error('Entre na conta PP-MT.');
  const body={action};
  if(action==='answer'){body.id=fields.id;body.selected_index=fields.selected_index;}
  const {data,error}=await client().functions.invoke('ppmt-premium-practice',{body});
  if(error) {
    let message='';
    if(typeof error.context?.json==='function')try{message=String((await error.context.json())?.error||'');}catch{}
    if(error.context?.status===402)return {premium:false,state:'locked'};
    throw new Error(message.slice(0,220)||'Não foi possível consultar o treino Premium.');
  }
  return data;
}


// Teste financeiro privado: Pix REAL de um centavo, sem assinatura.
export async function runCentavoPremium(action){
 if(!online())throw new Error('Conecte-se para testar o Pix.');
 if(!['check','create','status'].includes(action))throw new Error('Ação inválida.');
 const user=await verifiedUser();
 if(!user)throw new Error('Entre na conta PP-MT.');
 const {data,error}=await client().functions.invoke('ppmt-centavo-premium',{body:{action}});
 if(error){
  let message='';
  if(typeof error.context?.json==='function'){
   try{message=String((await error.context.json())?.error||'');}catch{}
  }
  throw new Error(message.slice(0,220)||'Não foi possível consultar o Pix. Verifique a situação antes de repetir.');
 }
 if(data?.pilot!==true||Number(data?.amount)!==0.01||data?.recurring!==false)
  throw new Error('A resposta do teste não corresponde a R$ 0,01.');
 return data;
}


// Consulta privada e somente leitura; token de produção permanece no servidor.
export async function runMercadoPagoDiagnostic(){
 if(!online())throw new Error('Conecte-se para verificar o Mercado Pago.');
 const user=await verifiedUser();
 if(!user)throw new Error('Entre na sua conta PP-MT.');
 const {data,error}=await client().functions.invoke('ppmt-mp-readonly-diagnostic',{body:{action:'probe'}});
 if(error){
  let message='';
  if(typeof error.context?.json==='function')try{message=String((await error.context.json())?.error||'');}catch{}
  throw new Error(message.slice(0,200)||'Falha na consulta de diagnóstico.');
 }
 if(data?.read_only!==true || typeof data?.payments?.http_status!=='number' || typeof data?.identity?.http_status!=='number')
  throw new Error('O servidor retornou um diagnóstico incompleto.');
 return data;
}
