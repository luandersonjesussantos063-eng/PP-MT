import {signIn,verifiedUser,runBillingSandbox} from '../auth.js?v=2.13.0';
const el=id=>document.getElementById(id);
const login=el('login-card'),billing=el('billing-card'),session=el('session-status'),feedback=el('feedback');
let busy=false;
const safeCheckout=url=>{
  try{
    const u=new URL(url);
    return u.protocol==='https:'&&u.hostname==='www.mercadopago.com.br'&&u.pathname==='/subscriptions/checkout'&&!u.username&&!u.password&&!u.port ? u.href : null;
  }catch{return null;}
};
function notice(message,isError=false){
  feedback.hidden=!message;feedback.textContent=message||'';
  feedback.classList.toggle('is-error',isError);
}
function showCheckout(url){
  const good=safeCheckout(url);
  el('checkout-area').hidden=!good;
  if(good)el('checkout-link').href=good;
  else el('checkout-link').removeAttribute('href');
}
function showState(data){
  const states={none:'Nenhum teste criado.',creating:'Preparando teste.',needs_review:'Revisão necessária: não inicie outra cobrança antes de verificar o resultado.',pending:'Aguardando autorização no Mercado Pago.',authorized:'Assinatura de teste autorizada.',cancelled:'Assinatura de teste cancelada.',paused:'Teste pausado.'};
  const state=String(data?.state||'none');
  el('billing-status').textContent=(states[state]||('Estado informado pelo provedor: '+state.slice(0,40)))+
    (data?.payment_confirmed?' Pagamento de teste aprovado e conferido.':' Nenhum pagamento de teste aprovado foi confirmado nesta consulta.');
  showCheckout(data?.checkout_url);
}
function setBusy(value){
  busy=value;
  for(const id of ['login-button','create-button','check-button','cancel-button']){
    const b=el(id);if(b)b.disabled=value;
  }
}
async function loadSession(){
  setBusy(true);notice('');
  try{
    const user=await verifiedUser();
    login.hidden=!!user;billing.hidden=!user;
    session.textContent=user?'Conectado à conta PPMT. O teste é permitido somente para usuários previamente autorizados.':'Entre na sua conta do PPMT para começar.';
  }catch{
    login.hidden=false;billing.hidden=true;session.textContent='Não foi possível verificar o login. Confira sua conexão.';
  }finally{setBusy(false);}
}
async function request(action,payerEmail){
  if(busy)return;
  setBusy(true);notice('');
  if(action==='create')showCheckout(null);
  try{
    const result=await runBillingSandbox(action,payerEmail);
    showState(result);
    notice('Consulta efetuada no ambiente de teste. O Premium real permanece indisponível.');
  }catch(error){
    const message=error instanceof Error?error.message:'Não foi possível concluir o teste.';
    notice(message,true);
    if(message.includes('Faça login'))await loadSession();
  }finally{setBusy(false);}
}
el('login-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;
  setBusy(true);notice('');
  let loggedIn=false;
  try{
    await signIn(el('user-email').value.trim(),el('user-password').value);
    el('user-password').value='';
    loggedIn=true;
  }catch{notice('Não foi possível entrar. Confira e-mail, senha e confirmação da conta.',true);}
  finally{setBusy(false);}
  if(loggedIn)await loadSession();
});
el('create-form').addEventListener('submit',e=>{
  e.preventDefault();
  const email=el('buyer-email').value.trim().toLowerCase();
  if(!/^[a-z0-9._+-]+@testuser\.com$/.test(email))return notice('Informe uma conta compradora de teste válida @testuser.com.',true);
  request('create',email);
});
el('check-button').addEventListener('click',()=>request('status'));
el('cancel-button').addEventListener('click',()=>{
  if(window.confirm('Cancelar a assinatura de TESTE vinculada à sua conta PPMT?'))request('cancel');
});
loadSession();
