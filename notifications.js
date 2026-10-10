import {loadNewsFeed} from './concurso-news.js?v=2.15.0';

const VAPID_PUBLIC='BIkG5_uAcgMp8fGstYJqXr_CAi7atm1Pm2wa-M8ilhieaqI3rENUpFZGQxDhWgF4v33Xp2pvTm5GkNI7BdGiln4';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=id=>'ppmt-notice-center-v1:'+id;
const fresh=()=>({initialized:false,known:[],read:[]});
const parse=x=>{try{const obj=JSON.parse(x);return obj&&Array.isArray(obj.known)&&Array.isArray(obj.read)?obj:fresh()}catch{return fresh()}};
const jsonArray=base64=>Uint8Array.from(atob((base64+'==='.slice((base64.length+3)%4)).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const supported=()=>typeof Notification!=='undefined'&&'serviceWorker' in navigator&&'PushManager' in window&&window.isSecureContext;
const canAlert=()=>typeof Notification!=='undefined'&&Notification.permission==='granted'&&'serviceWorker' in navigator;
const first=items=>items.sort((a,b)=>Date.parse(b.date||0)-Date.parse(a.date||0));
export function createNotificationCenter({loadOffers,registerPush,toast}){
 let userId=null,items=[],state=fresh(),timer=null,busy=false,ready=false,channel=null;
 const seenSet=()=>new Set(state.known);
 const save=()=>{if(userId)try{localStorage.setItem(key(userId),JSON.stringify({...state,known:state.known.slice(-500),read:state.read.slice(-500)}))}catch{}};
 const unread=()=>items.filter(i=>!state.read.includes(i.id)).length;
 function paintBell(){
  const bell=document.querySelector('#notificationBell');if(!bell||!userId)return;
  const count=unread();bell.style.opacity=count?'1':'.86';
  bell.innerHTML='🔔'+(count?'<span class="notification-badge">'+Math.min(99,count)+'</span>':'');
  bell.setAttribute('aria-label',count?count+' notificações não lidas':'Notificações');
 }
 async function localAlert(item){
  if(!canAlert())return;
  try{
   const reg=await navigator.serviceWorker.ready;
   await reg.showNotification(item.title,{body:item.body,icon:new URL('./icon-192.png',location.href).href,tag:item.id,badge:new URL('./icon-192.png',location.href).href,data:{url:new URL(item.href,location.origin+location.pathname).href}});
  }catch{/* Notification permission can be revoked at any time. */}
 }
 function rows(offers,feed){
  const out=[];
  for(const o of offers||[]){
   if(!o?.id)continue;
   const discount=o.kind==='monthly_discount';
   out.push({id:'offer:'+o.id,kind:'offer',title:discount?'🎁 Desconto exclusivo no Premium':'✦ Cortesia Premium',body:discount?'Você recebeu '+Number(o.discount_percent||0)+'% de desconto na assinatura.':'Você recebeu '+Number(o.days||0)+' dia(s) de Premium gratuito.',href:'#ofertas',date:o.created_at||new Date().toISOString(),offer:o});
  }
  for(const n of feed?.items||[]){
   if(!n?.id||!n?.title)continue;
   const kind= n.kind==='novo-concurso'?'Novo concurso':n.kind==='convocacao'?'Convocação / nomeação':n.kind==='seletivo'?'Processo seletivo':'Publicação oficial';
   out.push({id:'news:'+n.id,kind:'news',title:'📢 '+kind,body:String(n.title).slice(0,250),href:'#noticias',date:n.firstSeenAt||n.publishedAt||new Date().toISOString(),source:n.source});
  }
  return first(out);
 }
 async function refresh({notify=true}={}){
  if(!userId||busy)return;
  busy=true;const id=userId;
  try{
   const [offersResponse,newsResponse]=await Promise.allSettled([loadOffers(),loadNewsFeed()]);
   if(id!==userId)return;
   const offers=offersResponse.status==='fulfilled'?offersResponse.value:items.filter(i=>i.kind==='offer').map(i=>i.offer);
   const news=newsResponse.status==='fulfilled'?newsResponse.value.feed:null;
   const all=rows(offers,news);
   if(newsResponse.status!=='fulfilled'||!news){
    all.push(...items.filter(i=>i.kind==='news'&&!all.some(x=>x.id===i.id)));
   }
   const known=seenSet(),newRows=all.filter(x=>!known.has(x.id));
   if(!state.initialized){
    state.initialized=true;
    // Older official publications should not all become unread on first visit.
    for(const n of all.filter(x=>x.kind==='news'&&Date.now()-Date.parse(x.date)>24*3600000))state.read.push(n.id);
   }
   state.known=[...new Set([...state.known,...all.map(i=>i.id)])];
   items=first(all);save();paintBell();
   const panel=document.querySelector('#notificationHub');if(panel&&panel.isConnected)draw(panel,false);
   if(ready&&notify&&newRows.length){
    for(const n of newRows.slice(0,3))await localAlert(n);
   }
   ready=true;
  }finally{busy=false}
 }
 function markRead(){
  state.read=[...new Set([...state.read,...items.map(x=>x.id)])];
  save();paintBell();
 }
 function statusText(){
  if(!supported())return 'Este navegador não permite alertas em segundo plano. No iPhone, instale o aplicativo na tela inicial antes de ativar.';
  if(Notification.permission==='denied')return 'Notificações bloqueadas nas configurações do navegador. Libere a permissão do PP-MT.';
  if(Notification.permission==='granted')return 'Permissão concedida. Avisos importantes podem chegar mesmo com o aplicativo fechado, quando a inscrição neste aparelho estiver ativa.';
  return 'Ative para receber alertas de ofertas e novidades do concurso no celular ou PC, mesmo com o app fechado.';
 }
 async function enable(){
  if(!supported()){toast('Instale o PP-MT na tela inicial ou use um navegador compatível com Web Push.');return;}
  try{
   // Permission must be requested directly from a user interaction.
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){toast('Sem a permissão, os avisos continuam disponíveis no sininho.');drawIfOpen();return;}
   const reg=await navigator.serviceWorker.ready;
   const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:jsonArray(VAPID_PUBLIC)});
   await registerPush('subscribe',subscription.toJSON());
   toast('Alertas ativados neste aparelho!');drawIfOpen();
  }catch(e){toast('Não foi possível ativar o envio: '+String(e?.message||'verifique a conexão').slice(0,105));drawIfOpen();}
 }
 async function disable(){
  try{
   const reg=await navigator.serviceWorker.ready,subscription=await reg.pushManager.getSubscription();
   if(subscription){await registerPush('unsubscribe',subscription.toJSON());await subscription.unsubscribe();}
   toast('Avisos deste aparelho desativados.');drawIfOpen();
  }catch{toast('Não foi possível desativar. Verifique sua conexão.')}
 }
 async function testDelivery(){
  if(!supported()||Notification.permission!=='granted'){toast('Primeiro ative as notificações neste aparelho.');return;}
  try{await registerPush('test',null);toast('Teste enviado pelo servidor. Confira os avisos do aparelho.');}
  catch{toast('O envio de teste não foi confirmado. Ative os alertas e tente novamente.');}
 }
 function drawIfOpen(){const panel=document.querySelector('#notificationHub');if(panel)draw(panel,false)}
 async function renderInbox(panel){
  if(!panel)return;
  panel.innerHTML='<p class="muted">Carregando avisos e notícias oficiais…</p>';
  if(!busy)await refresh({notify:false});
  draw(panel,true);
 }
 function draw(panel,mark=false){
  if(mark)markRead();
  const cards=items.map(item=>{
   const entry=item.kind==='offer' ? (()=>{const o=item.offer||{};const link=o.kind==='monthly_discount'?' <a class="button primary" href="./planos/assinar.html?oferta='+encodeURIComponent(o.id||'')+'">Ver desconto →</a>':'';return '<p class="muted">Oferta válida até '+esc(o.expires_at?new Date(o.expires_at).toLocaleDateString('pt-BR'):'data informada no checkout')+'. Confira o valor antes de pagar.</p>'+link;})()
     :'<p class="muted">'+esc(item.source||'Órgão oficial')+'</p><a class="button secondary" href="#noticias">Conferir publicação e fonte oficial →</a>';
   return '<article class="card ppmt-notice-card"><div class="row"><strong>'+esc(item.title)+'</strong><small>'+esc(item.date?new Date(item.date).toLocaleDateString('pt-BR'):'')+'</small></div><p>'+esc(item.body)+'</p>'+entry+'</article>';
  }).join('');
  panel.innerHTML='<section class="card ppmt-notice-config"><h2>🔔 Central de notificações</h2><p class="muted">Avisos de descontos, cortesias e publicações oficiais da Polícia Penal MT.</p><p>'+esc(statusText())+'</p><div class="row"><button id="ppmtEnablePush" class="primary">Ativar alertas no aparelho</button><button id="ppmtDisablePush" class="secondary">Desativar neste aparelho</button><button id="ppmtTestPush" class="secondary">Testar notificação</button><button id="ppmtRefreshNotices" class="secondary">Atualizar</button></div><p class="muted">As notificações dependem da permissão do aparelho e da conexão. Confirme sempre prazos e editais na fonte oficial.</p></section><div class="ppmt-notice-list">'+(cards||'<section class="card"><p>Sem notificações no momento.</p></section>')+'</div>';
  const on=id=>panel.querySelector(id);
  on('#ppmtEnablePush')?.addEventListener('click',enable);
  on('#ppmtDisablePush')?.addEventListener('click',disable);
  on('#ppmtRefreshNotices')?.addEventListener('click',()=>refresh({notify:false}));
  on('#ppmtTestPush')?.addEventListener('click',testDelivery);
  if(!supported()){on('#ppmtEnablePush').disabled=true;on('#ppmtDisablePush').disabled=true;on('#ppmtTestPush').disabled=true;}
 }
 function start(user){
  stop();if(!user?.id)return;
  userId=user.id;state=parse(localStorage.getItem(key(userId)));items=[];ready=false;paintBell();
  void refresh({notify:false});
  timer=setInterval(()=>{if(navigator.onLine!==false)void refresh()},60000);
  window.addEventListener('focus',onFocus);
  document.addEventListener('visibilitychange',onVisible);
  window.addEventListener('online',onFocus);
  // Restore the server registration when returning to an account on the same device.
  void (async()=>{try{if(!supported()||Notification.permission!=='granted')return;const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(sub)await registerPush('subscribe',sub.toJSON());}catch{}})();
 }
 async function unregisterOnLogout(){
  if(!supported()||Notification.permission!=='granted')return;
  try{
   const reg=await navigator.serviceWorker.ready;
   const sub=await reg.pushManager.getSubscription();
   if(!sub)return;
   try{await registerPush('unsubscribe',sub.toJSON());}catch{}
   await sub.unsubscribe();
  }catch{}
 }
 function onFocus(){if(userId)void refresh()}
 function onVisible(){if(!document.hidden)onFocus()}
 function stop(){
  if(timer)clearInterval(timer);timer=null;userId=null;ready=false;items=[];state=fresh();
  window.removeEventListener('focus',onFocus);window.removeEventListener('online',onFocus);document.removeEventListener('visibilitychange',onVisible);
 }
 return {start,stop,refresh,renderInbox,paintBell,unregisterOnLogout};
}
