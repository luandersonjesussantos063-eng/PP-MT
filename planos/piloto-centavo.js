import {signIn,verifiedUser,runCentavoPremium,runMercadoPagoDiagnostic} from '../auth.js?v=2.15.0-mpdiag1';
const $=id=>document.getElementById(id);
let busy=false,enabled=false,created=false;
function info(msg,error=false){
 $('feedback').hidden=!msg;$('feedback').textContent=msg||'';
 $('feedback').classList.toggle('error',error);
}
function controls(value){
 busy=value;
 $('login-btn').disabled=value;
 $('status-btn').disabled=value;
 $('api-test-btn').disabled=value;
 $('pay-btn').disabled=value||!enabled||created;
}
function safeTicket(value){
 if(typeof value!=='string')return null;
 try{
  const u=new URL(value);
  return u.protocol==='https:'&&['www.mercadopago.com.br','mercadopago.com.br'].includes(u.hostname)&&
    !u.port&&!u.username&&!u.password?u.href:null;
 }catch{return null;}
}
function display(data){
 const state=String(data?.state||'none');
 created=state!=='none';
 $('pix-result').hidden=true;
 $('success').hidden=true;
 if(state==='approved'){
  const until=Date.parse(data.premium_until);
  if(data.premium_test_active===true && Number.isFinite(until)){
   $('state').textContent='✓ Pagamento real de R$ 0,01 confirmado. Premium de teste ativo.';
   $('expiry').textContent='Acesso válido até '+new Date(until).toLocaleString('pt-BR')+'.';
   $('success').hidden=false;
  }else{
   $('state').textContent='Pagamento de R$ 0,01 confirmado. Acesso de teste encerrado.';
  }
 }else if(state==='pending'){
  $('state').textContent='Pix criado. Aguardando confirmação oficial do pagamento.';
  const code=typeof data.pix_code==='string'?data.pix_code:'';
  $('pix-code').value=code;
  const link=safeTicket(data.ticket_url);
  $('ticket-link').hidden=!link;
  if(link)$('ticket-link').href=link;
  else $('ticket-link').removeAttribute('href');
  $('pix-result').hidden=!(code||link);
 }else if(state==='none'){
  $('state').textContent='Nenhum Pix deste teste foi gerado ainda.';
 }else{
  $('state').textContent='Situação: '+state+'. Verifique com o suporte antes de gerar outro pagamento.';
 }
 $('pay-btn').disabled=busy||!enabled||created;
}
async function run(action){
 if(busy)return;
 controls(true);info('');
 try{
  const data=await runCentavoPremium(action);
  if(action==='check'){
   enabled=data.enabled===true;
   if(!enabled){
    $('state').textContent=typeof data.reason==='string' ? 'Piloto bloqueado: '+data.reason : 'Piloto indisponível no momento. Nenhuma cobrança foi criada.';
    if(typeof data.reason==='string')info('Nenhuma cobrança foi criada. Corrija a autorização do Mercado Pago antes de gerar Pix.',true);
    $('status-btn').textContent='Revalidar Mercado Pago ↻';
   }else{
    $('status-btn').textContent='Verificar pagamento ↻';
    const status=await runCentavoPremium('status');
    display(status);
   }
  }else{
   display(data);
   if(action==='create'&&data.state==='pending')info('Pix gerado. Pague somente R$ 0,01 e depois verifique o status.');
  }
 }catch(e){
  if(action==='create'){
   created=true;
   $('state').textContent='Não foi possível confirmar a criação da cobrança. Verifique o status antes de tentar novamente.';
  }
  info(e?.message||'Não foi possível consultar o teste.',true);
 }
 finally{controls(false);}
}
async function load(){
 controls(true);info('');
 try{
  const user=await verifiedUser();
  $('login-panel').hidden=!!user;$('pilot-panel').hidden=!user;
  $('session').textContent=user?'Conta PP-MT conectada.':'Entre na sua conta PP-MT para continuar.';
  controls(false);
  if(user)await run('check');
 }catch{
  $('login-panel').hidden=false;$('pilot-panel').hidden=true;
  $('session').textContent='Não foi possível confirmar sua sessão.';
 }finally{controls(false);}
}
$('login-form').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 controls(true);info('');
 try{
  await signIn($('email').value.trim(),$('password').value);
  $('password').value='';
  controls(false);await load();
 }catch{info('Confira seu login e a confirmação do e-mail.',true);}
 finally{controls(false);}
});
$('pay-btn').addEventListener('click',()=>{
 if(busy||!enabled||created)return;
 if(window.confirm('Gerar um Pix REAL de R$ 0,01, sem renovação, para testar o Premium por 24 horas?'))run('create');
});
$('status-btn').addEventListener('click',()=>run(enabled?'status':'check'));
$('copy-btn').addEventListener('click',async()=>{
 const code=$('pix-code').value;
 if(!code)return;
 try{await navigator.clipboard.writeText(code);info('Código Pix copiado.');}
 catch{$('pix-code').select();info('Selecione e copie o código Pix acima.');}
});
load();
// Diagnóstico somente leitura; nenhuma cobrança é criada.
$('api-test-btn').addEventListener('click',async()=>{
 if(busy)return;
 controls(true);
 const output=$('api-test-result');
 output.hidden=false;
 output.textContent='Consultando as APIs do Mercado Pago (sem cobrança)…';
 try{
  const data=await runMercadoPagoDiagnostic();
  const payment=data.payments,identity=data.identity;
  const statusCode=r=>r.http_status===0?'sem resposta':String(r.http_status);
  const provider=r=>r.code?' / '+r.code:'';
  let conclusion='As APIs não confirmaram autorização; não gere uma cobrança ainda.';
  if(payment.authorized && !identity.authorized)
   conclusion='A API de pagamentos autorizou a leitura; o bloqueio está na consulta de identidade. O piloto permanece protegido até corrigir a validação do vendedor.';
  else if(payment.authorized && identity.authorized)
   conclusion='As duas APIs responderam. Revalide o piloto para conferir se a conta recebedora corresponde à configuração.';
  output.textContent='Pagamentos: HTTP '+statusCode(payment)+provider(payment)+
    ' | Identificação: HTTP '+statusCode(identity)+provider(identity)+'. '+conclusion;
 }catch(error){output.textContent=error?.message||'Falha ao verificar a conexão.';}
 finally{controls(false);}
});
