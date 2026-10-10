import {signIn,verifiedUser,runMonthlyBilling} from '../auth.js?v=2.15.0';
import {loginWithGoogle} from '../account-services.js?v=2.18.0';

const $=id=>document.getElementById(id);
const pendingStates=new Set(['pending','creating','needs_review']);
const cancelable=new Set(['authorized','pending','paused']);
let busy=false,enabled=false,lastBilling=null;

function setBusy(on){
 busy=on;
 for(const id of ['login-btn','google-login-btn','manual-btn','card-btn','refresh-btn','retry-btn','cancel-btn']){
  const el=$(id);if(el)el.disabled=on;
 }
}
function show(section){
 $('loading-panel').hidden=true;
 $('login-panel').hidden=section!=='login';
 $('payment-panel').hidden=section==='login';
 for(const [id,name] of [['paid-panel','paid'],['pending-panel','pending'],['offer-panel','offer'],['error-panel','error']]){
  $(id).hidden=section!==name;
 }
 if(section==='loading'){
  $('loading-panel').hidden=false;
  $('payment-panel').hidden=true;
  $('login-panel').hidden=true;
 }
}
function notice(msg='',success=false){
 const el=$('feedback');
 el.hidden=!msg;el.textContent=msg;el.dataset.success=String(success);
}
function safeLink(url,card=false){
 if(typeof url!=='string')return null;
 try{
  const u=new URL(url);
  if(u.protocol!=='https:'||u.hostname!=='www.mercadopago.com.br'||u.port||u.username||u.password)return null;
  if(card)return u.pathname==='/subscriptions/checkout'?u.href:null;
  return u.pathname==='/checkout/v1/redirect'||u.pathname.startsWith('/checkout/')||u.pathname.startsWith('/sales/checkout/')?u.href:null;
 }catch{return null;}
}
function existingLink(id,value,card=false){
 const a=$(id),url=safeLink(value,card);
 a.hidden=!url;
 if(url)a.href=url;
 else a.removeAttribute('href');
 return !!url;
}
function showError(message=''){
 $('error-message').textContent=message||'Não foi possível confirmar sua situação agora. Nenhuma nova cobrança foi criada por esta consulta.';
 $('manage-panel').hidden=true;
 show('error');
}
function render(data){
 if(!data||typeof data.premium!=='boolean'){
  showError('Resposta de pagamento indisponível. Não inicie outra cobrança sem consultar seu plano.');return;
 }
 enabled=data.enabled===true;
 lastBilling=data;
 const card=data.card,manual=data.manual,cs=card?.state,ms=manual?.state;
 const hasPending=pendingStates.has(cs)||pendingStates.has(ms)||(cs==='authorized'&&!data.premium)||cs==='paused';
 const manages=cancelable.has(cs);
 $('manage-panel').hidden=!manages;
 $('cancel-btn').hidden=!manages;
 $('manage-hint').textContent=cs==='pending'
  ?'Uma autorização foi iniciada. Cancele somente se não quiser continuar com este pagamento.'
  :'Cancelar a renovação impede novas cobranças automáticas; o período já pago permanece até vencer.';
 $('cancel-btn').textContent=cs==='pending'?'Cancelar solicitação de cartão':'Cancelar renovação automática';
 if(data.premium===true){
  const validUntil=Date.parse(data.current_period_end);
  $('paid-date').textContent=Number.isFinite(validUntil)?
   'Acesso válido até '+new Date(validUntil).toLocaleDateString('pt-BR')+'. Você não precisa pagar novamente agora.':
   'Sua assinatura está ativa. Você não precisa pagar novamente agora.';
  show('paid');return;
 }
 if(hasPending){
  $('card-state').textContent='';
  $('manual-state').textContent='';
  const cardPending=pendingStates.has(cs)||cs==='authorized'||cs==='paused';
  const manualPending=pendingStates.has(ms);
  const cardLink=existingLink('card-link',cardPending&&cs==='pending'?card.checkout_url:null,true);
  const manualLink=existingLink('manual-link',manualPending&&ms==='pending'?manual.checkout_url:null,false);
  if(data.provider_sync_available===false){
   $('pending-message').textContent='Seu pagamento está registrado, mas o Mercado Pago não respondeu à verificação agora. Não faça outro pagamento.';
  }else if(cs==='authorized'&&!data.premium){
   $('pending-message').textContent='Seu cartão foi autorizado. O Premium será liberado após confirmação do pagamento.';
  }else if(cs==='paused'){
   $('pending-message').textContent='Sua assinatura está pausada. Consulte a situação antes de tentar pagar novamente.';
  }else if(cs==='needs_review'||ms==='needs_review'){
   $('pending-message').textContent='Seu pagamento precisa de verificação. Evite uma segunda cobrança e fale com o suporte se necessário.';
  }else if(cardLink||manualLink){
   $('pending-message').textContent='Continue o pagamento que você já começou. Não gere outra cobrança.';
  }else{
   $('pending-message').textContent='Aguardando confirmação. Use “Já paguei” para verificar novamente antes de tentar outro pagamento.';
  }
  if(cardPending)$('card-state').textContent='Cartão: '+(cs==='pending'?'aguardando autorização':cs==='authorized'?'autorizado, aguardando pagamento':'em análise');
  if(manualPending)$('manual-state').textContent='Pix / boleto / débito: '+(ms==='pending'?'aguardando pagamento':'em análise');
  show('pending');return;
 }
 if(data.provider_sync_available===false){
  showError('O Mercado Pago não respondeu à conferência. Aguarde ou consulte novamente antes de criar outra cobrança.');return;
 }
 if(!enabled){
  showError('Os pagamentos estão temporariamente indisponíveis. Você pode continuar estudando no Grátis.');return;
 }
 show('offer');
}
async function action(value){
 if(busy)return null;
 setBusy(true);notice('');
 try{
  const data=await runMonthlyBilling(value);
  if(value==='status'){
   render(data);
   return data;
  }
  if(value==='card_cancel'){
   const updated=await runMonthlyBilling('status');
   render(updated);
   notice('Solicitação de cartão cancelada. Se havia período já pago, ele permanece válido.',true);
   return updated;
  }
  // Nunca redirecionar antes de confirmar a origem HTTPS do provedor.
  const url=value==='card_start'?safeLink(data?.card?.checkout_url,true):
   safeLink(data?.manual?.checkout_url);
  if(url){
   render(data);
   window.location.assign(url);
   return data;
  }
  render(data);
  notice('Solicitação registrada. Verifique a situação antes de gerar outro pagamento.');
  return data;
 }catch(e){
  // Um erro após o POST não comprova que nenhuma solicitação foi criada.
  // Faça uma consulta de leitura para identificar checkout eventualmente já existente.
  try{
   const current=await runMonthlyBilling('status');
   render(current);
   if(value==='status')notice('Não foi possível confirmar todos os dados. Confira sua situação novamente.');
   else notice('Não foi possível concluir a operação. Confira a situação antes de tentar novamente.');
  }catch{
   showError('Não conseguimos verificar o pagamento neste momento. Não tente outra cobrança até confirmar sua situação.');
  }
  return null;
 }finally{setBusy(false);}
}
async function reconcileAfterCheckout(){
 const outcome=new URLSearchParams(location.search).get('resultado');
 if(!['aprovado','pendente','falhou'].includes(outcome))return;
 const data=lastBilling;
 if(outcome==='falhou'){
  notice('O pagamento não foi concluído. Não pague novamente sem conferir sua situação.');
 }else if(data?.premium===true){
  notice('Seu Premium já está ativo!',true);
 }else{
  // Mesmo que o redirect diga "aprovado", só o servidor pode confirmar o crédito.
  $('pending-message').textContent='O Mercado Pago retornou ao app. Seu pagamento ainda está sendo confirmado. Não pague novamente.';
  show('pending');
  notice('Pagamento em verificação. Use “Já paguei” para consultar o resultado.');
 }
 history.replaceState(null,'',location.pathname);
}
async function load(){
 setBusy(true);show('loading');notice('');
 try{
  if(location.protocol!=='https:'){
   showError('Aguarde o HTTPS deste endereço ser ativado antes de usar pagamentos.');
   return;
  }
  const user=await verifiedUser();
  if(!user){show('login');return;}
  setBusy(false);
  await action('status');
  await reconcileAfterCheckout();
 }catch(e){
  showError('Não conseguimos verificar sua sessão. Entre novamente com sua conta no PP-MT.');
 }finally{setBusy(false);}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 setBusy(true);notice('');
 try{
  await signIn($('buyer-email').value.trim(),$('buyer-pass').value);
  $('buyer-pass').value='';
  setBusy(false);await load();
 }catch{setBusy(false);notice('Confira seu e-mail, sua senha e a confirmação da conta.');}
});
$('google-login-btn').addEventListener('click',async()=>{
 if(busy)return;setBusy(true);notice('');
 try{await loginWithGoogle('checkout');}
 catch{setBusy(false);notice('Não foi possível entrar com Google. Tente novamente ou use e-mail e senha.');}
});
$('manual-btn').addEventListener('click',()=>{if(!busy&&enabled&&lastBilling?.premium===false)action('manual_checkout')});
$('card-btn').addEventListener('click',()=>{
 if(!busy&&enabled&&lastBilling?.premium===false&&window.confirm('Confirmar assinatura de R$ 19,99 POR MÊS no cartão? Há renovação automática até o cancelamento.'))action('card_start');
});
$('refresh-btn').addEventListener('click',()=>action('status'));
$('retry-btn').addEventListener('click',()=>action('status'));
$('cancel-btn').addEventListener('click',()=>{
 if(!busy&&cancelable.has(lastBilling?.card?.state)&&window.confirm('Cancelar a renovação automática ou a autorização de cartão? Acesso já pago continua até o vencimento.'))action('card_cancel');
});
load();
