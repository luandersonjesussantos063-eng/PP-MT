import {signIn,verifiedUser,runMonthlyBilling} from '../auth.js?v=2.15.0';
const $=id=>document.getElementById(id);
function show(id,visible){$(id).hidden=!visible;}
async function check(){
 $('message').textContent='Conferindo configurações…';
 try{
  const user=await verifiedUser();show('login-box',!user);show('status-box',false);
  if(!user){$('message').textContent='Entre na sua conta PP-MT.';return;}
  const result=await runMonthlyBilling('readiness');
  const flags=result.checks||{};
  const merchantStatus=flags.merchant_http_status;
  const reason=flags.merchant_valid?'Conta de recebimento de produção validada':
    !flags.production_token_present?'Token de produção ausente':
    merchantStatus===401||merchantStatus===403?'API de identidade do vendedor recusou acesso (HTTP '+merchantStatus+'). Confira a API de Checkout Pro abaixo':
    merchantStatus?'Conta de recebimento não validada (HTTP '+merchantStatus+')':'Não foi possível verificar a conta recebedora';
  $('merchant').textContent=(flags.merchant_valid?'✓ ':'✕ ')+reason+(flags.merchant_error_code?' · Código: '+flags.merchant_error_code:'');
  const checkoutStatus=flags.checkout_api_http_status;
  const checkLabel=flags.checkout_api_error_code==='invalid_token'?
    'Credencial de produção inválida no Mercado Pago. Atualize o Access Token de produção nos Secrets do Supabase':
    flags.checkout_api_authorized?
    flags.checkout_seller_matches===true?'API de Checkout Pro aceitou o token e confirmou o recebedor':
    flags.checkout_seller_matches===false?'ATENÇÃO: conta recebedora diferente da configurada':
    'API de Checkout Pro aceitou o token (identidade do recebedor ainda não confirmada)':
    checkoutStatus?'API de Checkout Pro recusou consulta sem cobrança (HTTP '+checkoutStatus+')':
    'API de Checkout Pro não respondeu à consulta sem cobrança';
  $('checkout-api').textContent=(flags.checkout_api_authorized&&flags.checkout_seller_matches!==false?'✓ ':'✕ ')+checkLabel+(flags.checkout_api_error_code?' · Código: '+flags.checkout_api_error_code:'');
  $('webhook').textContent=(flags.webhook_secret_present?'✓ ':'✕ ')+'Chave secreta do webhook';
  $('webhook-real').textContent=(flags.webhook_real_verified?'✓ ':'✕ ')+(flags.webhook_real_verified?'Notificação de pagamento REAL autenticada e registrada':'Webhook real de pagamento ainda não foi validado');
  $('monthly-manual').textContent=(flags.manual_monthly_verified?'✓ ':'✕ ')+(flags.manual_monthly_verified?'Mensalidade REAL de R$ 19,99 validada (pagamento avulso)':'Mensalidade REAL de R$ 19,99 por Pix/boleto ainda não testada');
  $('monthly-card').textContent=(flags.card_monthly_verified?'✓ ':'✕ ')+(flags.card_monthly_verified?'Cobrança recorrente REAL de R$ 19,99 registrada':'Assinatura no cartão ainda sem cobrança REAL validada');
  $('delivery').textContent=(flags.delivery_flag?'✓ ':'✕ ')+'Entrega Premium liberada';
  $('billing').textContent=(flags.billing_flag?'✓ ':'✕ ')+'Abertura comercial autorizada';
  $('pilot').textContent=result.pilot_enabled?'✓ Piloto comercial privado autorizado.':'✕ Piloto comercial privado desligado.';
  $('sales').textContent=flags.billing_flag?'Vendas públicas autorizadas no servidor — confira os fluxos pagos antes de divulgar.':result.pilot_enabled?'Somente piloto privado autorizado. Vendas públicas ainda bloqueadas.':'Vendas públicas e testes comerciais bloqueados.';
  show('status-box',true);$('message').textContent='';
 }catch(e){$('message').textContent=e?.message||'Não foi possível consultar.';}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();$('message').textContent='Entrando…';
 try{await signIn($('email').value.trim(),$('password').value);$('password').value='';await check();}
 catch{$('message').textContent='Confira seu login e sua autorização de administrador.';}
});
$('refresh').addEventListener('click',check);check();
