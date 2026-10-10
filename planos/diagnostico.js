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
  $('merchant').textContent=(flags.merchant_valid?'✓ ':'✕ ')+'Conta de recebimento de produção';
  $('webhook').textContent=(flags.webhook_secret_present?'✓ ':'✕ ')+'Chave secreta do webhook';
  $('delivery').textContent=(flags.delivery_flag?'✓ ':'✕ ')+'Entrega Premium liberada';
  $('billing').textContent=(flags.billing_flag?'✓ ':'✕ ')+'Abertura comercial autorizada';
  $('pilot').textContent=result.pilot_enabled?'✓ Piloto comercial privado autorizado.':'✕ Piloto comercial privado desligado.';
  $('sales').textContent=result.enabled?'Checkout habilitado. Faça conferência completa antes de divulgar.':'Vendas bloqueadas até completar as validações.';
  show('status-box',true);$('message').textContent='';
 }catch(e){$('message').textContent=e?.message||'Não foi possível consultar.';}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();$('message').textContent='Entrando…';
 try{await signIn($('email').value.trim(),$('password').value);$('password').value='';await check();}
 catch{$('message').textContent='Confira seu login e sua autorização de administrador.';}
});
$('refresh').addEventListener('click',check);check();
