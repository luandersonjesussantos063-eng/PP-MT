import {signIn,verifiedUser,runMonthlyBilling} from '../auth.js?v=2.15.0';
import {loginWithGoogle,myPremiumOffers} from '../account-services.js?v=2.18.0';

const $=id=>document.getElementById(id);
const pendingStates=new Set(['pending','creating','needs_review']);
const cancelable=new Set(['authorized','pending','paused']);
let busy=false,enabled=false,lastBilling=null,discountOffer=null;

async function loadDiscount(){
 try{
  const offers=await myPremiumOffers();
  const requested=new URLSearchParams(location.search).get('oferta');
  const discounts=offers.filter(o=>o.kind==='monthly_discount'&&Date.parse(o.expires_at)>Date.now());
  discountOffer=(requested?discounts.find(o=>o.id===requested):null)||discounts[0]||null;
  const panel=$('discount-notice');if(!panel)return;panel.hidden=!discountOffer;
  if(discountOffer){
   const cents=Math.max(1,Math.round(1999*(100-discountOffer.discount_percent)/100));
   const amount=(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
   $('discount-message').textContent='Oferta de '+discountOffer.discount_percent+'%: de R$ 19,99 por '+amount+' nesta mensalidade avulsa, válida até '+new Date(discountOffer.expires_at).toLocaleDateString('pt-BR')+'. O valor final será confirmado no Mercado Pago.';
   const label=$('manual-btn').querySelector('small');if(label)label.textContent=amount+' por 1 mês · sem renovação automática';
   $('card-btn').disabled=true;
  }
 }catch{discountOffer=null;const panel=$('discount-notice');if(panel)panel.hidden=true;}
}
function setBusy(on){
 busy=on;
 for(const id of ['login-btn','google-login-btn','manual-btn','card-btn','refresh-btn','retry-btn','cancel-btn','switch-to-pix-btn']){
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
function showError(message='',title='Não conseguimos consultar seu pagamento agora'){
 $('error-panel').querySelector('h2').textContent=title;
 $('error-message').textContent=message||'Não foi possível confirmar sua situação agora. Consulte seu plano antes de criar outra cobrança.';
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
 // A troca só é oferecida enquanto a autorização do cartão ainda não foi concluída.
 // O servidor revalida e cancela no provedor antes de exibir novas opções.
 const maySwitchToPix=cs==='pending' && !pendingStates.has(ms) && data.premium!==true;
 $('switch-to-pix-btn').hidden=!maySwitchToPix;
 $('switch-to-pix-help').hidden=!maySwitchToPix;
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
async function action(value,{switchToPix=false}={}){
 if(busy)return null;
 setBusy(true);notice('');
 try{
  const data=await runMonthlyBilling(value);
  if(value==='status'){
   render(data);
   return data;
  }
  if(value==='card_cancel'){
   // Uma falha na consulta posterior nunca é tratada como autorização para cobrar.
   const updated=await runMonthlyBilling('status');
   render(updated);
   if(switchToPix){
    if(updated?.card?.state==='cancelled' && updated?.premium===false &&
       !['creating','pending','needs_review'].includes(updated?.manual?.state)){
      notice('Autorização do cartão cancelada no Mercado Pago. Agora você pode escolher Pagar com Pix.',true);
    }else{
      notice('Aguarde a confirmação do cancelamento antes de escolher Pix. Nenhum pagamento foi criado.');
    }
   }else{
    notice('Solicitação de cartão cancelada. Se havia período já pago, ele permanece válido.',true);
   }
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
  // Não repetir automaticamente chamadas de status que já falharam.
  if(value==='status'){
   showError('Não foi possível verificar seu plano. Tente novamente antes de gerar outra cobrança.');
   return null;
  }
  // Falhar após o POST não comprova que nenhuma cobrança foi registrada.
  const reason=String(e instanceof Error?e.message:'O provedor não confirmou a operação.').slice(0,220);
  try{
   const current=await runMonthlyBilling('status');
   render(current);
   const waiting=['pending','creating','needs_review'].includes(current?.manual?.state)||
    ['pending','creating','needs_review','authorized','paused'].includes(current?.card?.state);
   if(current?.premium===true){
    notice('Seu Premium está ativo. Verifique o histórico antes de realizar outra compra.',true);
   }else if(waiting){
    notice('Operação em verificação. '+reason+' Não realize outra compra antes de confirmar.',false);
   }else{
    showError(reason+' Confira os dados e tente novamente apenas depois de verificar seu plano.',
      'Não foi possível iniciar o pagamento');
   }
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
 if(!data)return;
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
 const watchdog=setTimeout(()=>{if(!$('loading-panel').hidden)showError('A verificação demorou mais que o esperado. Você pode tentar novamente sem gerar cobrança.');},10000);
 try{
  if(location.protocol!=='https:'){showError('É necessário abrir o pagamento por HTTPS.');return;}
  const user=await Promise.race([verifiedUser(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout_auth')),9000))]);
  if(!user){show('login');return;}
  setBusy(false);
  const data=await Promise.race([runMonthlyBilling('status'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout_billing')),11000))]);
  render(data);
  void loadDiscount().catch(()=>{});
  await reconcileAfterCheckout();
 }catch(e){
  showError('Não foi possível concluir a verificação de acesso. Toque em Tentar novamente; se persistir, abra no Chrome e entre na sua conta.');
 }finally{clearTimeout(watchdog);setBusy(false);}
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
 if(discountOffer){notice('Seu desconto é válido para pagamento avulso por Pix, boleto ou débito. O cartão recorrente permanece com preço normal.');return;}if(!busy&&enabled&&lastBilling?.premium===false&&window.confirm('Confirmar assinatura de R$ 19,99 POR MÊS no cartão? Há renovação automática até o cancelamento.'))action('card_start');
});
$('switch-to-pix-btn').addEventListener('click',()=>{
 if(busy || lastBilling?.card?.state!=='pending' || lastBilling?.premium===true ||
    ['creating','pending','needs_review'].includes(lastBilling?.manual?.state))return;
 if(window.confirm('Trocar cartão por Pix? Vamos cancelar sua autorização PENDENTE no Mercado Pago. Nenhuma cobrança Pix será criada até você escolher Pagar com Pix.')){
  action('card_cancel',{switchToPix:true});
 }
});
$('refresh-btn').addEventListener('click',()=>action('status'));
$('retry-btn').addEventListener('click',()=>action('status'));
$('cancel-btn').addEventListener('click',()=>{
 if(!busy&&cancelable.has(lastBilling?.card?.state)&&window.confirm('Cancelar a renovação automática ou a autorização de cartão? Acesso já pago continua até o vencimento.'))action('card_cancel');
});
load();
