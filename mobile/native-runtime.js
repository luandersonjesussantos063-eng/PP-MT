// Executado apenas nos pacotes Android e iOS, nunca no site público.
(()=>{
 'use strict';
 window.__PPMT_NATIVE__=true;
 document.documentElement.classList.add('ppmt-native-store');
 const blocked=u=>{
  try{const url=new URL(u,location.href);return url.hostname==='www.mercadopago.com.br'||
    (url.pathname.includes('/planos/')&&/\/(?:pix|centavo|billing-test|diagnostico|testar-pagamento)[^/]*\.html$/i.test(url.pathname));}
  catch{return false;}
 };
 document.addEventListener('click',event=>{
  const link=event.target?.closest?.('a[href]');if(!link)return;
  if(blocked(link.getAttribute('href'))){event.preventDefault();event.stopImmediatePropagation();
   location.href=new URL('planos/assinar.html',new URL('./',location.href)).href;}
 },true);
 // O login Google exige configuração nativa de OAuth e deep links antes da revisão das lojas.
 // Login por e-mail/senha permanece disponível enquanto isso.
 const scrub=()=>{
  for(const el of document.querySelectorAll('#googleSignIn,#google-login-btn,#google-login-btn-alt,#google-login-btn-pay')){
   if(!el.hidden)el.hidden=true;
  }
  for(const el of document.querySelectorAll('a[href*="mercadopago.com.br/checkout"],a[href*="mercadopago.com.br/subscriptions"]')){
   if(!el.hidden)el.hidden=true;
  }
 };
 new MutationObserver(scrub).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener('DOMContentLoaded',scrub);
})();
