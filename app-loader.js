/* Startup is independent from the account/module graph, so failures remain recoverable. */
(function(){
 'use strict';
 const panel=document.getElementById('app-startup');
 if(!panel)return;
 const status=document.getElementById('startup-status');
 const recovery=document.getElementById('startup-recovery');
 const retry=document.getElementById('startup-retry');
 let ready=false;
 const showRecovery=message=>{if(ready||!panel.isConnected)return;status.textContent=message;recovery.hidden=false};
 retry.addEventListener('click',()=>window.location.reload());
 const timer=setTimeout(()=>showRecovery('O carregamento está demorando. Você pode tentar novamente sem apagar seus estudos.'),15000);
 window.addEventListener('pmmg:ready',()=>{ready=true;clearTimeout(timer)},{once:true});
 window.addEventListener('error',()=>showRecovery('Não foi possível abrir o app. Tente carregar novamente.'),{once:true});
 import('./app.bundle.js?v=3.2.0').catch(error=>{
  clearTimeout(timer);console.error('PMMG: falha no carregamento do aplicativo',error);
  showRecovery('Não foi possível carregar o app. Verifique a conexão e tente novamente.');
 });
})();
