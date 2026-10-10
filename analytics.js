// PP-MT: métricas próprias agregadas. Sem cookies de publicidade, identificadores de clique ou e-mails.
(()=>{
 if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl)return;
 const ENDPOINT='https://fermfbmhwlafwopwndoj.supabase.co/functions/v1/ppmt-pageview';
 const EVENTS=new Set(['signup_click','premium_click','install_click','whatsapp_click','start_study_click']);
 const page=(location.pathname.replace(/^\/PP-MT(?=\/|$)/,'')||'/').replace(/\/+/g,'/');
 const cleanTag=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/[^a-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,50);
 const query=new URLSearchParams(location.search);
 let attribution={source:'direct',medium:'none',campaign:'none'};
 try{
  const prior=sessionStorage.getItem('ppmt-attribution');
  if(prior){
   const data=JSON.parse(prior);
   if(['source','medium','campaign'].every(k=>/^[a-z0-9_-]{1,50}$/.test(data[k])))
    attribution={source:data.source,medium:data.medium,campaign:data.campaign};
  }
  if(query.has('utm_source')||query.has('utm_medium')||query.has('utm_campaign')){
   attribution={
    source:cleanTag(query.get('utm_source'))||'direct',
    medium:cleanTag(query.get('utm_medium'))||'none',
    campaign:cleanTag(query.get('utm_campaign'))||'none'
   };
   sessionStorage.setItem('ppmt-attribution',JSON.stringify(attribution));
  }
 }catch{}
 function send(data){
  const json=JSON.stringify(data);
  fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:json,keepalive:true,credentials:'omit'}).catch(()=>{});
 }
 try{
  const key='ppmt-view:'+page,last=Number(sessionStorage.getItem(key)||0);
  if(Date.now()-last>=1800000){
   sessionStorage.setItem(key,String(Date.now()));
   send({page});
  }
 }catch{send({page})}
 function track(event){
  if(!EVENTS.has(event))return;
  // Bloqueia múltiplos cliques do mesmo botão no intervalo de uma segunda.
  const key='ppmt-event:'+page+':'+event;
  const now=Date.now();
  if(track.last&&track.last.key===key&&now-track.last.at<1000)return;
  track.last={key,at:now};
  send({page,event,...attribution});
 }
 window.ppmtTrack=track;
 document.addEventListener('click',e=>{
  const anchor=e.target?.closest?.('a,button');
  if(!anchor)return;
  let event=anchor.getAttribute('data-ppmt-event');
  if(!event&&anchor.tagName==='A'){
   const link=anchor.getAttribute('href')||'';
   if(/[?&]cadastro=1(?:&|#|$)/.test(link))event='signup_click';
   else if(/assinar\.html(?:[?#]|$)/.test(link))event='premium_click';
   else if(/instalar\.html(?:[?#]|$)/.test(link))event='install_click';
   else if(/^(?:https?:)?\/\/wa\.me\//.test(link))event='whatsapp_click';
   else if(/\/#inicio(?:\?|$)/.test(link))event='start_study_click';
  }
  if(event)track(event);
 },{passive:true});
})();
