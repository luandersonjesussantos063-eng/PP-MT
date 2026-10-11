// Executado SOMENTE quando o APK debug ativa o fluxo externo.
// O bundle de distribuição não inclui este script.
import {Browser} from '@capacitor/browser';
const url='https://ppmt.novabytesolucoes.com.br/planos/assinar.html';
const button=document.getElementById('open-mercado-pago');
const message=document.getElementById('browser-message');
const fallback=document.getElementById('browser-fallback');
button?.addEventListener('click',async()=>{
 button.disabled=true;
 message.textContent='Abrindo o site de pagamentos do PP-MT…';
 try{
  // Chrome Custom Tabs usa o navegador externo e separa a sessão web do app.
  await Browser.open({url});
  message.textContent='Use a mesma conta PP-MT no site. Quando terminar, volte ao aplicativo e consulte Meu plano.';
 }catch{
  message.textContent='O navegador não abriu automaticamente. Utilize o link abaixo.';
  fallback.hidden=false;
 }finally{
  button.disabled=false;
 }
});
