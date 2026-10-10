import {signIn,verifiedUser,runPixPilot} from '../auth.js?v=2.13.3';
const $=id=>document.getElementById(id);
let working=false,ready=false;
function info(message,error=false){
  $('feedback').hidden=!message;$('feedback').textContent=message||'';
  $('feedback').classList.toggle('error',error);
}
function busy(value){
  working=value;
  $('create-button').disabled=value||!ready;
  $('status-button').disabled=value;
  $('login-button').disabled=value;
}
function safeTicket(value){
  if(typeof value!=='string')return null;
  try{
    const u=new URL(value);
    return u.protocol==='https:' && ['mercadopago.com.br','www.mercadopago.com.br'].includes(u.hostname) && !u.port && !u.username && !u.password?u.href:null;
  }catch{return null;}
}
function showResult(data){
  const state=String(data.state||'');
  if(state==='approved'){
    $('readiness').textContent='Pagamento de R$ 0,01 aprovado e confirmado no Mercado Pago. A etapa financeira de teste foi concluída.';
    $('create-button').disabled=true;
    $('pix-result').hidden=true;
    info('Pagamento único confirmado. Não existe assinatura nem acesso Premium automático.');
    ready=false;return;
  }
  if(['needs_review','rejected','cancelled','expired','refunded'].includes(state)){
    $('readiness').textContent='Situação: '+state+'. Não tente outra cobrança sem revisar.';
    $('create-button').disabled=true;ready=false;$('pix-result').hidden=true;return;
  }
  if(state==='pending'){
    $('readiness').textContent='Pix gerado e aguardando pagamento.';
    $('create-button').disabled=true;ready=false;
    const code=typeof data.pix_code==='string'?data.pix_code:'';
    $('pix-code').value=code;
    const link=safeTicket(data.ticket_url);
    $('ticket-link').hidden=!link;
    if(link)$('ticket-link').href=link;
    else $('ticket-link').removeAttribute('href');
    $('pix-result').hidden=!code&&!link;
    return;
  }
  if(state==='none'){$('readiness').textContent='Nenhum Pix gerado nesta conta.';}
}
async function checkReady(){
  busy(true);info('');
  try{
    const data=await runPixPilot('check');
    ready=data.enabled===true;
    $('readiness').textContent=ready
      ? 'Conta recebedora de produção validada. Pix de R$ 0,01 pronto para tentativa (o Mercado Pago ainda pode recusar o valor mínimo).'
      : (typeof data.reason==='string'&&data.reason.length<220 ? data.reason : 'Aguardando habilitação da credencial Mercado Pago de produção. Nenhuma cobrança será criada.');
    if(ready)await fetchOrder('status',true);
  }catch(e){ready=false;info(e.message||'Não foi possível consultar a integração.',true);}
  finally{busy(false);}
}
async function fetchOrder(action,nested=false){
  if(working&&!nested)return;
  busy(true);info('');
  try{const data=await runPixPilot(action);showResult(data);}
  catch(e){info(e.message||'Erro ao consultar o Pix. Confirme a situação antes de tentar novamente.',true);}
  finally{busy(false);}
}
async function load(){
  busy(true);
  try{
    const user=await verifiedUser();
    $('login-section').hidden=!!user;$('checkout-section').hidden=!user;
    $('session').textContent=user?'Conta PPMT conectada.':'Entre na sua conta do PPMT para continuar.';
    if(user)await checkReady();
  }catch{
    $('login-section').hidden=false;
    $('checkout-section').hidden=true;
    $('session').textContent='Não foi possível verificar sua sessão.';
  }finally{busy(false);}
}
$('login-form').addEventListener('submit',async event=>{
  event.preventDefault();if(working)return;
  busy(true);info('');
  try{
    await signIn($('email').value.trim(),$('password').value);
    $('password').value='';
    await load();
  }catch{info('Falha no login. Confira seu e-mail e sua senha do PPMT.',true);}
  finally{busy(false);}
});
$('create-button').addEventListener('click',()=>{
  if(working||!ready)return;
  if(!window.confirm('Confirmar a geração de uma cobrança Pix REAL e ÚNICA de R$ 0,01?'))return;
  fetchOrder('create');
});
$('status-button').addEventListener('click',()=>fetchOrder('status'));
$('copy-button').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('pix-code').value);info('Código Pix copiado.');}
  catch{$('pix-code').focus();$('pix-code').select();info('Selecione e copie o código Pix acima.');}
});
load();