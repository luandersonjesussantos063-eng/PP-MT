import {signIn,verifiedUser,runMonthlyBilling} from '../auth.js?v=2.14.0';
const $=id=>document.getElementById(id);
let busy=false,enabled=false;
function notice(msg,error=false){$('feedback').hidden=!msg;$('feedback').textContent=msg||'';$('feedback').classList.toggle('is-error',error);}
function safeLink(value){
 if(typeof value!=='string')return null;
 try{const u=new URL(value);if(u.protocol==='https:'&&u.hostname==='www.mercadopago.com.br'&&!u.port&&!u.username&&!u.password)return u.href;}catch{}return null;
}
function statusDate(value){
 const ms=Date.parse(value);return Number.isFinite(ms)?new Date(ms).toLocaleDateString('pt-BR'):'';
}
function busyState(value){
 busy=value;
 $('login-btn').disabled=value;$('refresh-btn').disabled=value;
 $('card-btn').disabled=value||!enabled;$('manual-btn').disabled=value||!enabled;
 $('cancel-btn').disabled=value;
}
function showLink(id,url){
 const a=$(id),safe=safeLink(url);
 a.hidden=!safe;
 if(safe)a.href=safe;else a.removeAttribute('href');
}
function display(data){
 enabled=data.enabled===true;
 $('availability').textContent=enabled?'Cobranças disponíveis. Confira seu plano antes de gerar outra mensalidade.':'Cadastro e estudos gratuitos disponíveis. O checkout comercial ainda está em implantação; nenhuma cobrança nova será gerada.';
 $('card-btn').disabled=busy||!enabled;$('manual-btn').disabled=busy||!enabled;
 const valid=!!data.premium,expiry=statusDate(data.current_period_end);
 $('membership-state').textContent=valid?'Premium ativo.':'Você não possui uma mensalidade Premium ativa.';
 $('next-bill').textContent=valid&&expiry?'Acesso pago até '+expiry+'. Renove pelo site próximo ao vencimento.':'Se houver um pagamento pendente, aguarde a aprovação ou consulte novamente.';
 if(data.card){
  const states={pending:'Autorização do cartão pendente.',authorized:'Assinatura de cartão autorizada; cobranças mensais automáticas.',cancelled:'Cobranças futuras canceladas.',paused:'Assinatura pausada.',needs_review:'Assinatura em revisão. Não autorize outra.'};
  $('card-state').textContent=states[data.card.state]||'Verifique sua assinatura.';
  showLink('card-link',data.card.checkout_url);
  $('cancel-btn').hidden=!['authorized','pending','paused'].includes(data.card.state);
  $('card-btn').disabled=true;
 }else{
  $('card-state').textContent='Nenhuma assinatura de cartão cadastrada.';
  showLink('card-link',null);$('cancel-btn').hidden=true;
 }
 if(data.manual){
  const states={pending:'Mensalidade aguardando pagamento.',paid:'Mensalidade aprovada.',needs_review:'Cobrança em revisão. Não tente pagar novamente.',creating:'Cobrança sendo preparada.'};
  $('manual-state').textContent=states[data.manual.state]||'Consulte sua mensalidade.';
  showLink('manual-link',data.manual.checkout_url);
  if(data.manual.state==='pending'||data.manual.state==='needs_review')$('manual-btn').disabled=true;
 }else{
  $('manual-state').textContent='Nenhuma cobrança pendente.';
  showLink('manual-link',null);
 }
}
async function action(value){
 if(busy)return;busyState(true);notice('');
 try{
  const data=await runMonthlyBilling(value);
  if(value==='card_cancel')notice('Renovação do cartão cancelada. Os pagamentos já aprovados seguem válidos até o vencimento.');
  display(data);
 }catch(e){notice(e instanceof Error?e.message:'Não foi possível consultar.',true);}
 finally{busyState(false);}
}
async function load(){
 busyState(true);notice('');
 try{
  const user=await verifiedUser();
  $('login-panel').hidden=!!user;$('payment-panel').hidden=!user;
  if(user){busyState(false);await action('status');}
  else $('availability').textContent='Entre com sua conta PP-MT para consultar seu plano.';
 }catch{$('login-panel').hidden=false;$('payment-panel').hidden=true;notice('Não foi possível verificar sua sessão.',true);}
 finally{busyState(false);}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;busyState(true);notice('');
 try{await signIn($('buyer-email').value.trim(),$('buyer-pass').value);$('buyer-pass').value='';}
 catch{notice('Confira login, senha e confirmação do e-mail.',true);busyState(false);return;}
 busyState(false);await load();
});
$('refresh-btn').addEventListener('click',()=>action('status'));
$('card-btn').addEventListener('click',()=>{if(!enabled||busy)return;if(window.confirm('Autorizar assinatura de R$ 19,99 POR MÊS no cartão? As cobranças serão automáticas até o cancelamento.'))action('card_start');});
$('manual-btn').addEventListener('click',()=>{if(!enabled||busy)return;if(window.confirm('Gerar uma mensalidade de R$ 19,99 para pagar por Pix, boleto ou débito? Sem débito automático.'))action('manual_checkout');});
$('cancel-btn').addEventListener('click',()=>{if(!busy&&window.confirm('Cancelar as próximas cobranças automáticas do cartão?'))action('card_cancel');});
load();