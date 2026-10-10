import {signIn,verifiedUser,runMonthlyBilling} from '../auth.js?v=2.15.0';
import {loginWithGoogle} from '../account-services.js?v=2.18.0';

const $=id=>document.getElementById(id);
const paymentMethods=[...document.querySelectorAll('input[name="pay-method"]')];
let busy=false,enabled=false,lastBilling=null;
const incomplete=new Set(['pending','creating','needs_review']);
const liveCard=new Set(['pending','authorized','paused','creating','needs_review']);
const cancelableCard=new Set(['authorized','pending','paused']);

function paidFarFromExpiry(){
 const expiry=Date.parse(lastBilling?.current_period_end);
 return lastBilling?.premium===true && Number.isFinite(expiry) && expiry-Date.now()>7*86400000;
}
function canStartCard(){
 return enabled && !paidFarFromExpiry() &&
  (!lastBilling?.card || lastBilling.card.state==='cancelled') &&
  !incomplete.has(lastBilling?.manual?.state);
}
function canStartManual(){
 return enabled && !paidFarFromExpiry() &&
  !liveCard.has(lastBilling?.card?.state) &&
  !incomplete.has(lastBilling?.manual?.state);
}
function notice(msg,error=false){
 const el=$('feedback');el.hidden=!msg;el.textContent=msg||'';
 el.classList.toggle('is-error',error);
}
function safeLink(value){
 if(typeof value!=='string')return null;
 try{
  const u=new URL(value);
  if(u.protocol==='https:' && u.hostname==='www.mercadopago.com.br' && !u.port && !u.username && !u.password)return u.href;
 }catch{}
 return null;
}
function statusDate(value){
 const ms=Date.parse(value);
 return Number.isFinite(ms)?new Date(ms).toLocaleDateString('pt-BR'):'';
}
function showLink(id,url){
 const a=$(id),safe=safeLink(url);
 a.hidden=!safe;
 if(safe)a.href=safe;else a.removeAttribute('href');
}
function selectedMethod(){
 return paymentMethods.find(input=>input.checked)?.value||null;
}
function choosePaymentUI(){
 const method=selectedMethod(),canCard=canStartCard(),canManual=canStartManual();
 const choices=$('payment-choices');
 const show=!!lastBilling && !busy && (canCard||canManual) &&
  !incomplete.has(lastBilling?.card?.state) && !incomplete.has(lastBilling?.manual?.state);
 // Não apaga a escolha enquanto a consulta estiver ocupada.
 if(!show){
  choices.hidden=true;
  $('pay-next').hidden=true;
  $('card-btn').hidden=true;$('manual-btn').hidden=true;
  return;
 }
 choices.hidden=false;
 for(const input of paymentMethods){
  const can=input.value==='card'?canCard:canManual;
  input.disabled=!can;
  input.closest('.pay-method')?.classList.toggle('is-disabled',!can);
 }
 const validSelection=(method==='card'&&canCard)||(method==='manual'&&canManual);
 $('pay-next').hidden=!validSelection;
 $('card-btn').hidden=method!=='card';
 $('manual-btn').hidden=method!=='manual';
 if(method==='card'&&canCard){
  $('pay-next-title').textContent='Assinatura com renovação automática';
  $('pay-next-detail').textContent='R$ 19,99 por mês no cartão. Antes de continuar, o Mercado Pago solicitará sua autorização.';
 }else if(method==='manual'&&canManual){
  $('pay-next-title').textContent='Pagamento sem renovação automática';
  $('pay-next-detail').textContent='R$ 19,99 por 1 mês de acesso. Você poderá escolher Pix, boleto ou débito no Mercado Pago.';
 }
}
function busyState(value){
 busy=value;
 $('login-btn').disabled=value;
 $('refresh-btn').disabled=value;
 $('card-btn').disabled=value||!canStartCard();
 $('manual-btn').disabled=value||!canStartManual();
 $('cancel-btn').disabled=value||!cancelableCard.has(lastBilling?.card?.state);
 paymentMethods.forEach(i=>i.disabled=value||(i.value==='card'?!canStartCard():!canStartManual()));
}
function display(data){
 enabled=data.enabled===true;
 lastBilling=data;
 const availability=$('availability');
 availability.hidden=enabled;
 availability.textContent=enabled?'':'Os pagamentos estão temporariamente indisponíveis. Você ainda pode usar o plano Grátis.';
 const valid=data.premium===true,expiry=statusDate(data.current_period_end);
 $('membership-state').textContent=valid?'✓ Premium ativo':'Plano gratuito';
 $('next-bill').textContent=valid&&expiry?'Acesso válido até '+expiry:'';
 $('paid-panel').hidden=!valid;
 const card=data.card||null,manual=data.manual||null;
 const cardState=card?.state,manualState=manual?.state;
 const isPendingCard=incomplete.has(cardState)||(cardState==='authorized'&&!valid)||cardState==='paused';
 const isPendingManual=incomplete.has(manualState);
 const hasPending=isPendingCard||isPendingManual;
 $('pending-panel').hidden=!hasPending;
 const cardMessages={pending:'Cartão: aguardando sua autorização.',authorized:'Cartão autorizado. Estamos verificando a confirmação do pagamento.',paused:'Assinatura pausada. Consulte a situação antes de tentar outra cobrança.',creating:'Preparando a assinatura no cartão.',needs_review:'Assinatura em análise. Não inicie uma segunda.'};
 const manualMessages={pending:'Pagamento gerado: aguardando confirmação.',creating:'Preparando seu pagamento.',needs_review:'Pagamento em análise. Não gere outro.'};
 $('card-state').textContent=isPendingCard?(cardMessages[cardState]||'Cartão em análise.'):'';
 $('manual-state').textContent=isPendingManual?(manualMessages[manualState]||'Pagamento em análise.'):'';
 $('pending-message').textContent=isPendingCard?
  'Já existe uma autorização de cartão vinculada à sua conta. Se ainda não concluiu, continue pelo botão abaixo.':
  'Já existe um pagamento gerado para sua conta. Confira ou finalize a operação existente.';
 showLink('card-link',isPendingCard&&incomplete.has(cardState)?card.checkout_url:null);
 showLink('manual-link',isPendingManual&&manualState==='pending'?manual.checkout_url:null);
 const canCancel=cancelableCard.has(cardState);
 $('manage-panel').hidden=!canCancel;
 $('cancel-btn').hidden=!canCancel;
 busyState(busy);
 choosePaymentUI();
}
async function action(value){
 if(busy)return;
 busyState(true);notice('');
 try{
  const data=await runMonthlyBilling(value);
  display(data);
  if(value==='card_cancel'){
   const verified=await runMonthlyBilling('status');
   display(verified);
   notice('Renovação automática cancelada. Seu período já pago continua válido.');
   return verified;
  }
  if(value==='card_start'){
   notice('Assinatura iniciada. Se necessário, use “Continuar autorização” para concluir no Mercado Pago.');
  }
  if(value==='manual_checkout'){
   notice('Pagamento gerado. Use “Abrir meu pagamento” para escolher Pix, boleto ou débito no Mercado Pago.');
  }
  return data;
 }catch(e){notice(e instanceof Error?e.message:'Não foi possível consultar sua conta.',true);}
 finally{
  busyState(false);
  choosePaymentUI();
 }
}
async function load(){
 busyState(true);notice('');
 try{
  const user=await verifiedUser();
  $('login-panel').hidden=!!user;
  $('payment-panel').hidden=!user;
  if(user){
   busyState(false);
   await action('status');
   await reconcileAfterCheckout();
  }else{
   $('availability').hidden=true;
  }
 }catch{
  $('login-panel').hidden=false;$('payment-panel').hidden=true;
  $('availability').hidden=true;
  notice('Não foi possível verificar sua sessão. Entre para continuar.',true);
 }finally{busyState(false);choosePaymentUI();}
}
// Nunca considera Premium ativo pelo redirect. Sempre consulta o servidor.
let reconciling=false;
async function reconcileAfterCheckout(){
 const resultado=new URLSearchParams(window.location.search).get('resultado');
 if(reconciling||!['aprovado','pendente','falhou'].includes(resultado))return;
 if(resultado==='falhou'){
  notice('O pagamento não foi confirmado. Consulte a situação antes de tentar novamente.',true);
  return;
 }
 reconciling=true;
 notice('Aguardando confirmação oficial do pagamento. Não gere outra cobrança.');
 try{
  for(let tentativa=0;tentativa<10;tentativa++){
   if(tentativa>0)await new Promise(resolve=>setTimeout(resolve,6000));
   const data=await action('status');
   if(data?.premium===true){
    notice('Seu plano Premium está ativo. Confira a validade em “Meu plano” para verificar se a nova mensalidade já foi creditada.');
    window.history.replaceState(null,'',window.location.pathname);
    return;
   }
  }
  notice('Ainda não foi possível confirmar este novo pagamento. Use “Verificar situação” para consultar depois; não pague novamente antes de verificar.');
 }finally{reconciling=false;}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 busyState(true);notice('');
 try{await signIn($('buyer-email').value.trim(),$('buyer-pass').value);$('buyer-pass').value='';}
 catch{notice('Confira login, senha e confirmação do e-mail.',true);busyState(false);return;}
 busyState(false);await load();
});
$('refresh-btn').addEventListener('click',()=>action('status'));
paymentMethods.forEach(input=>input.addEventListener('change',choosePaymentUI));
$('card-btn').addEventListener('click',()=>{
 if(busy||!canStartCard()||selectedMethod()!=='card')return;
 if(window.confirm('Autorizar assinatura de R$ 19,99 POR MÊS no cartão? As cobranças serão automáticas até o cancelamento.'))action('card_start');
});
$('manual-btn').addEventListener('click',()=>{
 if(busy||!canStartManual()||selectedMethod()!=='manual')return;
 if(window.confirm('Gerar pagamento de R$ 19,99 para um mês de Premium via Pix, boleto ou débito? Sem renovação automática.'))action('manual_checkout');
});
$('cancel-btn').addEventListener('click',()=>{
 if(!busy&&cancelableCard.has(lastBilling?.card?.state)&&window.confirm('Cancelar as próximas cobranças automáticas do cartão? O período já pago permanece ativo.'))action('card_cancel');
});
$('google-login-btn').addEventListener('click',async()=>{
 const button=$('google-login-btn');button.disabled=true;
 notice('Abrindo login seguro do Google…');
 try{await loginWithGoogle('checkout');}
 catch(e){button.disabled=false;notice(e?.message||'Login com Google indisponível. Use e-mail e senha.',true);}
});
load();
