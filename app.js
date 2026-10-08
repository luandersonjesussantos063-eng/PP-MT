import {minutesFor,dueReviews,nextReview,learningMetrics,selectLearningQuestions} from './learning.js?v=26';
import {IMPORTED_EXAMS} from './imported-exams.js?v=15';
import {QUESTIONS} from './data.js?v=15';
import {MT_EXAM,MT_QUESTIONS,OFFICIAL_QUESTIONS} from './official.js?v=27';
import {EXAM_SOURCES,SOURCE_TOTAL,IMPORTED_SOURCE_TOTAL} from './exam-sources.js?v=15';
const BUILTIN=[...OFFICIAL_QUESTIONS.filter(q=>q.displayMode!=='source-pdf'),...QUESTIONS];
const PENDING_OFFICIAL=OFFICIAL_QUESTIONS.filter(q=>q.displayMode==='source-pdf');
import {validateBank,shuffle,latestErrors,summary} from './core.js?v=15';
import {getCurrentUser,signIn,signUp,signOut,loadUserState,saveUserState} from './auth.js?v=15';
import {questionCommand,trapWords,microLesson,findSimilar} from './help.js?v=27';
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP_VERSION='v42';
queueMicrotask(()=>{document.querySelectorAll('.app-version-badge').forEach(el=>{el.textContent=APP_VERSION;el.title='JavaScript '+APP_VERSION+' carregado'})});
const KEY='ppmt-v2';
const emptyStore=()=>({attempts:[],favorites:[],custom:[],sessions:[],program:null});
let store=emptyStore(),currentUser=null,legacyStore=null;
try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(validStore(s))legacyStore=s}}catch{}
function validStore(s){try{return !!(s&&Array.isArray(s.attempts)&&Array.isArray(s.favorites)&&Array.isArray(s.sessions)&&Array.isArray(s.custom)&&(validateBank(s.custom)||true))}catch{return false}}
function normalizeStore(s){return validStore(s)?{...emptyStore(),...s,program:s.program||null}:emptyStore()}
function userKey(id=currentUser?.id){return id?`${KEY}:${id}`:KEY}
function localDay(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function ensureProgram(){if(!store.program||typeof store.program!=='object')store.program={startDate:localDay(),completed:{},xp:0};if(!store.program.startDate)store.program.startDate=localDay();if(!store.program.completed)store.program.completed={};if(!Number.isFinite(store.program.xp))store.program.xp=0;if(!store.program.studySeconds||typeof store.program.studySeconds!=='object')store.program.studySeconds={};if(!Number.isFinite(store.program.dailyGoalMinutes)||store.program.dailyGoalMinutes<5)store.program.dailyGoalMinutes=20;if(!store.program.reviewMastered||typeof store.program.reviewMastered!=='object')store.program.reviewMastered={}}
let tab='inicio',filter={search:'',subject:'',kind:'prova',exam:''},index=0,selection=null,answered=false,queue=[],run=null,examResult=null,assistState=Object.create(null),strikeState=Object.create(null),deferredInstallPrompt=null,reviewState=null;const studyTracker={lastActivity:Date.now(),lastTick:Date.now(),localFlush:0,cloudFlush:0};
const pages=[['inicio','⌂','Hoje'],['estudar','▦','Estudar'],['erros','↺','Revisar'],['simulados','◷','Simulado'],['desempenho','▥','Progresso'],['rotina','⚙','Minha rotina'],['conteudos','▤','Comentários MT'],['provas','▧','Provas'],['mais','☰','Mais'],['materias','▦','Matérias'],['questoes','▤','Banco'],['favoritos','☆','Favoritos'],['dados','⚙','Meus dados']];
const LAST_EDITAL_SUBJECTS=[
 'Língua Portuguesa',
 'História e Geografia de Mato Grosso',
 'Ética e Filosofia',
 'Direito Constitucional',
 'Administração Geral',
 'Direito Administrativo',
 'Direito Penal e Processual Penal',
 'Direitos Humanos',
 'Legislação Básica'
];
const LAST_EDITAL_SUBJECT_SET=new Set(LAST_EDITAL_SUBJECTS);
function normalizedSubject(q){
 if(!q)return q;
 const mapped=({
  'Administração':'Administração Geral',
  'Direito Penal':'Direito Penal e Processual Penal',
  'Direito Processual Penal':'Direito Penal e Processual Penal',
  'Legislação Penal':'Legislação Básica'
 })[q.subject]||q.subject;
 return mapped===q.subject?q:{...q,subject:mapped};
}
function isLastEditalQuestion(q){return !!q&&LAST_EDITAL_SUBJECT_SET.has(q.subject)}
const rawBank=()=>[...BUILTIN,...store.custom].map(normalizedSubject);
const bank=()=>rawBank().filter(isLastEditalQuestion);
function save(){if(!currentUser)return false;try{store.updatedAt=new Date().toISOString();localStorage.setItem(userKey(),JSON.stringify(store));saveUserState(currentUser.id,store).catch(()=>toast('Seu progresso ficou salvo neste aparelho, mas a sincronização falhou.'));return true}catch{toast('Não foi possível salvar neste navegador. Exporte um backup.');return false}}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4200)}
function accountUI(){const el=$('#account');if(!el)return;if(!currentUser){el.innerHTML='';return}el.innerHTML=`<span class="account-email">${esc(currentUser.email||'Usuário')}</span><button id="logout" class="account-logout">Sair</button>`;$('#logout').onclick=async()=>{if(!confirm('Sair da sua conta?'))return;try{await signOut();currentUser=null;store=emptyStore();renderAuth()}catch(e){toast(e.message||'Não foi possível sair.')}}}
async function loadAccount(user){run=null;reviewState=null;assistState=Object.create(null);strikeState=Object.create(null);currentUser=user;let cloud=null;try{cloud=await loadUserState(user.id)}catch{toast('Não foi possível carregar seus dados da nuvem.')}
 let local=null;try{const raw=localStorage.getItem(userKey(user.id));if(raw){const parsed=JSON.parse(raw);if(validStore(parsed))local=parsed}}catch{}
 if(local&&(!cloud||Date.parse(local.updatedAt||0)>Date.parse(cloud.updatedAt||0)))store=normalizeStore(local);
 else if(cloud&&validStore(cloud))store=normalizeStore(cloud);
 else if(local)store=normalizeStore(local);
 else if(legacyStore){store=normalizeStore(legacyStore);localStorage.removeItem(KEY);legacyStore=null}
 else store=emptyStore();
 ensureProgram();accountUI();save();navigate()}
function renderAuth(){currentUser=null;$('#nav').innerHTML='';accountUI();const c=$('#content');c.innerHTML=`<section class="auth-shell"><div class="auth-card"><img src="./icon.svg" alt="PP MT" class="auth-logo"><div class="eyebrow">PP MT • ACESSO DO CANDIDATO</div><h1>Seu progresso é só seu.</h1><p class="muted">Seu plano diário, revisões e progresso ficam vinculados à sua conta.</p><div class="auth-tabs"><button id="loginTab" class="active">Entrar</button><button id="signupTab">Criar conta</button></div><form id="authForm"><label>E-mail<input id="authEmail" type="email" autocomplete="email" required placeholder="seuemail@exemplo.com"></label><label>Senha<input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo 6 caracteres"></label><button class="primary auth-submit" type="submit">Entrar</button></form><p id="authHint" class="muted auth-hint">Use seu e-mail e senha para continuar.</p></div></section>`;
 let mode='login';const setMode=m=>{mode=m;$('#loginTab').classList.toggle('active',m==='login');$('#signupTab').classList.toggle('active',m==='signup');$('.auth-submit').textContent=m==='login'?'Entrar':'Criar conta';$('#authPassword').autocomplete=m==='login'?'current-password':'new-password';$('#authHint').textContent=m==='login'?'Use seu e-mail e senha para continuar.':'Crie uma conta. Se a confirmação de e-mail estiver ativa, você receberá uma mensagem para confirmar.'};$('#loginTab').onclick=()=>setMode('login');$('#signupTab').onclick=()=>setMode('signup');
 $('#authForm').onsubmit=async e=>{e.preventDefault();const email=$('#authEmail').value.trim(),password=$('#authPassword').value,btn=$('.auth-submit');btn.disabled=true;btn.textContent='Aguarde...';try{if(mode==='login'){const user=await signIn(email,password);await loadAccount(user)}else{const data=await signUp(email,password);if(data.session&&data.user){await loadAccount(data.user)}else{setMode('login');$('#authHint').textContent='Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.'}}}catch(err){$('#authHint').textContent=err.message||'Não foi possível autenticar.'}finally{btn.disabled=false;btn.textContent=mode==='login'?'Entrar':'Criar conta'}}}
async function bootstrap(){const user=await getCurrentUser();if(user)await loadAccount(user);else renderAuth()}
function title(t,d){return `<h1>${t}</h1><p class="muted">${d}</p>`}
function todayStudySeconds(){ensureProgram();return Math.max(0,Number(store.program.studySeconds[localDay()])||0)}
function studyGoalSeconds(){ensureProgram();return (store.program.shortDay===localDay()?10:minutesFor(store.program.profile))*60}
function formatStudyTime(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function formatStudyShort(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m} min`}
function studyRemaining(){return Math.max(0,studyGoalSeconds()-todayStudySeconds())}
function studyPct(){return Math.min(100,Math.round(todayStudySeconds()/Math.max(1,studyGoalSeconds())*100))}
function noteStudyActivity(){studyTracker.lastActivity=Date.now()}
function studyEligible(){return !!(currentUser&&document.visibilityState==='visible'&&document.querySelector('.question, .learning-session')&&!studyTracker.paused&&Date.now()-studyTracker.lastActivity<180000)}
function persistStudyLocal(){if(!currentUser)return;try{store.updatedAt=new Date().toISOString();localStorage.setItem(userKey(),JSON.stringify(store))}catch{}}
function syncStudyClockUI(){const sec=todayStudySeconds(),pct=studyPct(),rem=studyRemaining();document.querySelectorAll('[data-study-time]').forEach(x=>x.textContent=formatStudyTime(sec));document.querySelectorAll('[data-study-progress]').forEach(x=>x.style.width=pct+'%');document.querySelectorAll('[data-study-percent]').forEach(x=>x.textContent=pct+'%');document.querySelectorAll('[data-study-remaining]').forEach(x=>x.textContent=rem?formatStudyShort(rem)+' restantes':'meta concluída');const mini=$('#studyClockMini');if(mini){mini.textContent='⏱ '+formatStudyTime(sec)+(studyEligible()?' · Pausar':' · Retomar');mini.classList.toggle('counting',studyEligible())}}
function studyTick(){const now=Date.now(),delta=Math.min(2,Math.max(0,(now-studyTracker.lastTick)/1000));studyTracker.lastTick=now;if(studyEligible()){ensureProgram();store.program.studySeconds[localDay()]=todayStudySeconds()+delta;studyTracker.localFlush+=delta;studyTracker.cloudFlush+=delta;if(studyTracker.localFlush>=15){persistStudyLocal();studyTracker.localFlush=0}if(studyTracker.cloudFlush>=120){save();studyTracker.cloudFlush=0}}syncStudyClockUI()}
['pointerdown','touchstart','keydown','scroll'].forEach(type=>document.addEventListener(type,noteStudyActivity,{passive:true,capture:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){persistStudyLocal();if(studyTracker.cloudFlush>5){save();studyTracker.cloudFlush=0}}else noteStudyActivity()});
setInterval(studyTick,1000);
function studyClockCardHTML(){const sec=todayStudySeconds(),pct=studyPct(),rem=studyRemaining();return `<section class="card study-clock-card"><div class="study-clock-top"><div><span class="eyebrow">TEMPO LÍQUIDO DE ESTUDO</span><h2 data-study-time>${formatStudyTime(sec)}</h2></div><div class="study-goal-badge"><b data-study-percent>${pct}%</b><span>meta de ${formatStudyShort(studyGoalSeconds())}</span></div></div><div class="track study-time-track"><i data-study-progress style="width:${pct}%"></i></div><div class="study-clock-foot"><span>Conta em estudo ativo. Pausa ao sair do app ou após 3 minutos sem interação. Use o botão do relógio para pausar ou retomar.</span><b data-study-remaining>${rem?formatStudyShort(rem)+' restantes':'meta concluída'}</b></div></section>`}
function postMissionStep(){const rem=Math.ceil(studyRemaining()/60),errors=pendingErrorIds(),weak=weakestSubject(),today=localDay(),extra=store.attempts.filter(a=>localDay(new Date(a.at))===today&&a.mode!=='mission').length,extraSessions=store.sessions.filter(s=>localDay(new Date(s.at))===today&&s.mode!=='missao'&&s.mode!=='mission').length;if(rem<=0)return{key:'done',title:'Estudo do dia concluído',desc:'Você bateu sua meta líquida. Agora encerre o estudo e volte amanhã.',minutes:0,count:0};if(errors.size)return{key:'errors',title:'Agora: revisar seus erros',desc:`Há ${errors.size} questões pendentes para revisar. Corrija isso antes de avançar.`,minutes:Math.min(25,rem),count:Math.min(15,errors.size)};if(extra<20)return{key:'weak',title:'Agora: atacar o ponto fraco',desc:`Faça um bloco em ${weak}, sua matéria com menor desempenho.`,minutes:Math.min(35,rem),count:20,subject:weak};if(!extraSessions)return{key:'mixed',title:'Agora: simulado curto',desc:'Misture matérias e treine em ritmo de prova.',minutes:Math.min(35,rem),count:25};return{key:'weak',title:'Continue no ponto fraco',desc:`Use o tempo restante para reforçar ${weak}.`,minutes:Math.min(35,rem),count:20,subject:weak}}
function postMissionCardHTML(){if(!todayDone())return '';const s=postMissionStep(),done=s.key==='done';return `<section class="card continuation-card ${done?'done':''}"><div class="row"><div><span class="eyebrow">${done?'CARGA DO DIA FECHADA':'SEU PRÓXIMO PASSO'}</span><h2>${esc(s.title)}</h2></div><span class="tag">${done?'✓ COMPLETO':s.minutes+' MIN'}</span></div><p class="muted">${esc(s.desc)}</p>${done?'':`<div class="continuation-facts"><span><b>${s.count}</b> questões</span><span><b>${formatStudyShort(studyRemaining())}</b> faltam na meta</span></div><button id="continueStudy" class="primary">COMEÇAR PRÓXIMO BLOCO →</button>`}</section>`}
function startRecommendedBlock(){const s=postMissionStep();if(s.key==='done')return;if(s.key==='errors'){tab='erros';reviewState=null;history.replaceState(null,'','#erros');renderErrorReview();return}let qs=[],all=realBank();if(s.key==='weak')qs=all.filter(q=>q.subject===s.subject);else qs=all.slice();if(!qs.length)qs=all.slice();qs=shuffle(qs).slice(0,Math.min(s.count,qs.length));if(!qs.length){toast('Ainda não há questões suficientes para este bloco.');return}run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+Math.max(5,s.minutes)*60000,originTab:'simulados',label:s.title,guided:true};tab='simulados';history.replaceState(null,'','#simulados');showExamQuestion()}
function bindStudyGoal(){const el=$('#studyGoal');if(!el)return;el.value=String(store.program.dailyGoalMinutes||120);el.onchange=()=>{store.program.dailyGoalMinutes=Number(el.value);save();render();toast('Meta líquida diária atualizada.')}}

function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
function isIOSDevice(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function closeInstallGuide(){document.querySelector('.install-overlay')?.remove()}
function installGuide(){
 closeInstallGuide();
 const ios=isIOSDevice();
 const body=ios
  ? '<ol><li>Abra o PP MT no Safari.</li><li>Toque em <b>Compartilhar</b> (quadrado com seta para cima).</li><li>Escolha <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li></ol><p>Depois ele abre em tela cheia, como um aplicativo comum.</p>'
  : '<ol><li>Abra o menu do navegador.</li><li>Toque em <b>Instalar aplicativo</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme a instalação.</li></ol><p>No Android, quando o navegador liberar a instalação automática, o botão “Instalar” faz isso direto.</p>';
 document.body.insertAdjacentHTML('beforeend',`<div class="install-overlay" role="dialog" aria-modal="true" aria-label="Instalar PP MT"><div class="install-sheet"><div class="install-sheet-head"><div><span class="eyebrow">PP MT NO CELULAR</span><h2>${ios?'Instalar no iPhone/iPad':'Instalar no Android'}</h2></div><button id="closeInstallGuide" class="secondary">✕</button></div>${body}</div></div>`);
 $('#closeInstallGuide').onclick=closeInstallGuide;
 document.querySelector('.install-overlay').onclick=e=>{if(e.target.classList.contains('install-overlay'))closeInstallGuide()}
}
async function installApp(){
 if(isStandalone()){toast('O PP MT já está instalado neste aparelho.');return}
 if(deferredInstallPrompt){
  deferredInstallPrompt.prompt();
  const choice=await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  if(choice.outcome==='accepted')toast('Instalação do PP MT iniciada.');
  syncInstallUI();
  return;
 }
 installGuide();
}
function installCardHTML(){
 if(isStandalone())return '<section class="card install-card installed"><div class="install-app-icon"><img src="./icon.svg" alt=""></div><div><span class="eyebrow">APLICATIVO INSTALADO</span><h2>PP MT já está no seu celular</h2><p class="muted">Abra pelo ícone da tela inicial para usar em modo aplicativo.</p></div></section>';
 return `<section class="card install-card"><div class="install-app-icon"><img src="./icon.svg" alt=""></div><div><span class="eyebrow">USAR COMO APP</span><h2>Instale o PP MT no celular</h2><p class="muted">Sem Play Store e sem App Store: ele entra na tela inicial e abre em tela cheia. Compatível com Android e iPhone/iPad.</p><button class="primary" data-install-app>${isIOSDevice()?'Como instalar no iPhone':'⇩ Instalar aplicativo'}</button></div></section>`
}
function syncInstallUI(){
 const top=$('#installTop');
 if(top){top.hidden=isStandalone();top.onclick=installApp}
 document.querySelectorAll('[data-install-app]').forEach(b=>b.onclick=installApp)
}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;syncInstallUI()});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;syncInstallUI();toast('PP MT instalado. Agora ele pode ser aberto pela tela inicial.');if(tab==='mais')renderMore()});
const HELP_COSTS={armadilhas:0,comando:0,similar:0,aula60:0,eliminacao:30};
function questionWeight(q){const n=Number(q?.weight);return Number.isFinite(n)&&n>0?Math.min(3,n):1}
function questionDifficulty(q){
 const explicit=String(q?.difficulty||'').toLocaleLowerCase('pt-BR');
 if(['facil','fácil','easy'].includes(explicit))return{key:'facil',label:'Fácil',base:8};
 if(['media','média','medium'].includes(explicit))return{key:'media',label:'Média',base:12};
 if(['dificil','difícil','hard'].includes(explicit))return{key:'dificil',label:'Difícil',base:18};
 const statement=String(q?.statement||''),opts=(q?.options||[]).join(' ');let score=0;
 if(statement.length>650)score+=2;else if(statement.length>300)score+=1;
 if((statement.match(/\b(?:I|II|III|IV|V)\./g)||[]).length>=3)score++;
 if(opts.length>500)score++;
 if(/\b(exceto|incorreta|apenas|somente|sempre|nunca)\b/i.test(statement))score++;
 if(score>=3)return{key:'dificil',label:'Difícil',base:18};
 if(score>=1)return{key:'media',label:'Média',base:12};
 return{key:'facil',label:'Fácil',base:8}
}
function questionXP(q){const d=questionDifficulty(q),w=questionWeight(q);return Math.max(1,Math.round(d.base*w))}
function alreadyEarnedToday(id){const day=localDay();return store.attempts.some(a=>a.id===id&&a.xpAwarded>0&&Number.isFinite(Date.parse(a.at))&&localDay(new Date(a.at))===day)}
function xpForAnswer(q,correct){if(q.historicalOnly)return 0;if(alreadyEarnedToday(q.id))return 0;const full=questionXP(q);return correct?full:Math.max(2,Math.round(full*.25))}
function applyQuestionXP(q,correct){const gain=xpForAnswer(q,correct);if(gain>0){store.program.xp+=gain}return gain}
function spendAssistXP(q,type,{repeatable=false}={}){
 const a=assistFor(q.id),cost=HELP_COSTS[type]||0;
 if(!repeatable&&a.used.includes(type))return true;
 if((store.program.xp||0)<cost){toast(`Você precisa de ${cost} XP para essa ajuda. Saldo atual: ${store.program.xp||0} XP.`);return false}
 store.program.xp-=cost;a.spent=(a.spent||0)+cost;noteAssist(q,type);save();return true
}
function assistFor(id){return assistState[id]||(assistState[id]={eliminated:[],used:[],spent:0})}
function manualStrikes(id){
 const bag=run?(run.strikes||(run.strikes=Object.create(null))):strikeState;
 return bag[id]||(bag[id]=[]);
}
function toggleStrike(btn,indexFn,strikeKey,blockedFn=()=>false){
 if(blockedFn())return false;
 const i=indexFn(),strikes=manualStrikes(strikeKey),pos=strikes.indexOf(i),adding=pos<0;
 if(adding)strikes.push(i);else strikes.splice(pos,1);
 btn.classList.toggle('struck',adding);
 btn.setAttribute('aria-label',`Alternativa ${String.fromCharCode(65+i)}${adding?', riscada':''}`);
 btn.querySelector('.strike-label')?.remove();
 if(adding)btn.insertAdjacentHTML('beforeend','<small class="strike-label">RISCADA</small>');
 if(navigator.vibrate)navigator.vibrate(20);
 toast(`Alternativa ${String.fromCharCode(65+i)} ${adding?'riscada':'restaurada'}.`);
 return true;
}
const strikeSwipe={btn:null,pointerId:null,startX:0,startY:0,lastX:0,lastY:0,horizontal:false,guardUntil:0};
function strikeBlocked(btn){
 return !!(!btn||btn.getAttribute('aria-disabled')==='true'||btn.classList.contains('locked-answer')||btn.classList.contains('eliminated'));
}
function strikeReset(){
 const btn=strikeSwipe.btn;
 if(btn){btn.classList.remove('swiping');btn.style.removeProperty('--swipe-x')}
 strikeSwipe.btn=null;strikeSwipe.pointerId=null;strikeSwipe.horizontal=false;
}
function strikeFinish(x=strikeSwipe.lastX,y=strikeSwipe.lastY){
 const btn=strikeSwipe.btn;
 if(!btn)return false;
 const dx=x-strikeSwipe.startX,dy=y-strikeSwipe.startY,ax=Math.abs(dx),ay=Math.abs(dy);
 let changed=false;
 if(strikeSwipe.horizontal&&ax>=32&&ax>ay*1.02&&!strikeBlocked(btn)){
  const key=btn.dataset.strikeKey,index=Number(btn.dataset.strikeIndex??btn.dataset.option??btn.dataset.reviewAnswer??btn.dataset.learningAnswer??btn.dataset.reviewOption);
  if(key&&Number.isInteger(index)&&toggleStrike(btn,()=>index,key,()=>strikeBlocked(btn))){
   strikeSwipe.guardUntil=Date.now()+750;changed=true;
  }
 }
 strikeReset();
 return changed;
}
document.addEventListener('pointerdown',e=>{
 const btn=e.target.closest?.('.option[data-strike-key]');
 if(!btn||strikeBlocked(btn)||e.button!==0)return;
 strikeSwipe.btn=btn;strikeSwipe.pointerId=e.pointerId;
 strikeSwipe.startX=strikeSwipe.lastX=e.clientX;
 strikeSwipe.startY=strikeSwipe.lastY=e.clientY;
 strikeSwipe.horizontal=false;
 try{btn.setPointerCapture?.(e.pointerId)}catch{}
},{capture:true});
document.addEventListener('pointermove',e=>{
 const btn=strikeSwipe.btn;
 if(!btn||e.pointerId!==strikeSwipe.pointerId)return;
 strikeSwipe.lastX=e.clientX;strikeSwipe.lastY=e.clientY;
 const dx=e.clientX-strikeSwipe.startX,dy=e.clientY-strikeSwipe.startY,ax=Math.abs(dx),ay=Math.abs(dy);
 if(!strikeSwipe.horizontal&&ay>20&&ay>ax*1.35){strikeReset();return}
 if(ax>6&&ax>ay*.9){
  strikeSwipe.horizontal=true;
  btn.classList.add('swiping');
  btn.style.setProperty('--swipe-x',Math.max(-88,Math.min(88,dx))+'px');
  if(e.cancelable)e.preventDefault();
 }
},{capture:true});
document.addEventListener('pointerup',e=>{
 if(!strikeSwipe.btn||e.pointerId!==strikeSwipe.pointerId)return;
 strikeFinish(e.clientX,e.clientY);
},{capture:true});
document.addEventListener('pointercancel',e=>{
 if(!strikeSwipe.btn||e.pointerId!==strikeSwipe.pointerId)return;
 strikeFinish(strikeSwipe.lastX,strikeSwipe.lastY);
},{capture:true});
document.addEventListener('click',e=>{
 const btn=e.target.closest?.('.option[data-strike-key]');
 if(btn&&(Date.now()<strikeSwipe.guardUntil||btn.classList.contains('struck'))){e.preventDefault();e.stopPropagation()}
},{capture:true});
function runAnswered(id){return !!(run&&Object.prototype.hasOwnProperty.call(run.answers,id))}
function noteAssist(q,type){const a=assistFor(q.id);if(!a.used.includes(type))a.used.push(type);if(run){run.assists=run.assists||{};run.assists[q.id]=[...a.used]}}
function closeTacticalHelp(){document.querySelector('.tactical-overlay')?.remove()}
function openTacticalHelp(q){
 closeTacticalHelp();
 const a=assistFor(q.id),cmd=questionCommand(q),traps=trapWords(q),similar=findSimilar(q,realBank()),balance=store.program.xp||0;
 const action=(id,icon,title,desc,type,disabled=false)=>`<button class="tactical-action" id="${id}" ${disabled?'disabled':''}><b>${icon} ${title}</b><span>${desc}</span><small>${a.used.includes(type)&&type!=='eliminacao'?'COMPRADO':HELP_COSTS[type]+' XP'}</small></button>`;
 document.body.insertAdjacentHTML('beforeend',`<div class="tactical-overlay" role="dialog" aria-modal="true" aria-label="Ajuda tática"><div class="tactical-sheet"><div class="tactical-head"><div><span class="eyebrow">AJUDA TÁTICA</span><h2>Ajuda para aprender.</h2><p class="xp-wallet">Saldo: <b>${balance} XP</b></p></div><button id="closeTactical" class="secondary">✕</button></div><div class="tactical-grid">${action('termsHelp','⚠️','Palavras-armadilha','Mostra termos que mudam completamente a resposta.','armadilhas')}${action('simplifyHelp','🧭','Entender o comando','Traduz o que a banca quer de você.','comando')}${action('similarHelp','🧩','Questão parecida','Abre outra questão do mesmo assunto para aquecer.','similar',!similar)}${action('lessonHelp','⚡','Aula de 60s','Revisa o conceito central sem sair da questão.','aula60')}${action('eliminateHelp','✂️','Eliminar 1','Remove uma alternativa errada sem revelar a correta.','eliminacao')}</div><div id="tacticalContent" class="tactical-content"><p class="muted">Explicações e orientação são gratuitas. Apenas eliminar alternativas custa XP. Depois de comprar uma ajuda nesta questão, você pode reabrir a mesma ajuda sem pagar novamente. “Eliminar 1” cobra a cada alternativa removida.</p></div></div></div>`);
 $('#closeTactical').onclick=closeTacticalHelp;document.querySelector('.tactical-overlay').onclick=e=>{if(e.target.classList.contains('tactical-overlay'))closeTacticalHelp()};
 $('#simplifyHelp').onclick=()=>{if(!spendAssistXP(q,'comando'))return;$('#tacticalContent').innerHTML=`<h3>O que a banca quer</h3><p>${esc(cmd.command)}</p><div class="tactical-tip">${esc(cmd.tip)}</div>`;openTacticalHelpRefresh()};
 $('#termsHelp').onclick=()=>{if(!spendAssistXP(q,'armadilhas'))return;$('#tacticalContent').innerHTML=`<h3>Palavras que merecem atenção</h3>${traps.length?`<div class="trap-chips">${traps.map(w=>`<span>${esc(w)}</span>`).join('')}</div><p class="muted">Leia de novo a frase que contém essas palavras. “Apenas”, “exceto”, “incorreta”, “sempre” e “nunca” costumam decidir a questão.</p>`:'<p class="muted">Não encontrei palavra-armadilha clássica. Foque no conceito e no comando final.</p>'}`;openTacticalHelpRefresh()};
 $('#lessonHelp').onclick=()=>{if(!spendAssistXP(q,'aula60'))return;$('#tacticalContent').innerHTML=`<h3>Aula de 60 segundos</h3><p>${microLesson(q)}</p>`;openTacticalHelpRefresh()};
 if(similar)$('#similarHelp').onclick=()=>{if(!spendAssistXP(q,'similar'))return;$('#tacticalContent').innerHTML=`<h3>Questão parecida</h3><p class="mini-statement">${esc(similar.statement)}</p><details><summary>Ver alternativas e gabarito</summary><ol class="mini-options">${similar.options.map((o,i)=>`<li class="${i===similar.answer?'mini-correct':''}"><b>${String.fromCharCode(65+i)}.</b> ${esc(o)}</li>`).join('')}</ol><p><b>Gabarito: ${String.fromCharCode(65+similar.answer)}</b></p></details>`;openTacticalHelpRefresh()};
 $('#eliminateHelp').onclick=()=>{const candidates=q.options.map((_,i)=>i).filter(i=>i!==q.answer&&i!==selection&&!a.eliminated.includes(i));if(!candidates.length){$('#tacticalContent').innerHTML='<p class="muted">Não há outra alternativa errada disponível para eliminar.</p>';return}if(!spendAssistXP(q,'eliminacao',{repeatable:true}))return;const picked=candidates[0];a.eliminated.push(picked);closeTacticalHelp();if(run)showExamQuestion();else showQuestion();toast(`Alternativa ${String.fromCharCode(65+picked)} eliminada. -${HELP_COSTS.eliminacao} XP`)};
 function openTacticalHelpRefresh(){const wallet=document.querySelector('.xp-wallet b');if(wallet)wallet.textContent=`${store.program.xp||0} XP`;document.querySelectorAll('.tactical-action').forEach(btn=>{const b=btn.querySelector('small');if(!b)return;const map={termsHelp:'armadilhas',simplifyHelp:'comando',similarHelp:'similar',lessonHelp:'aula60'};const type=map[btn.id];if(type&&assistFor(q.id).used.includes(type))b.textContent='COMPRADO'})}
}
function bindTacticalHelp(q){const b=$('#tacticalHelp');if(b)b.onclick=()=>{openTacticalHelp(q)};document.querySelectorAll('[data-error-reason]').forEach(btn=>btn.onclick=()=>{const last=[...store.attempts].reverse().find(a=>a.id===q.id);if(!last)return;last.reason=btn.dataset.errorReason;save();document.querySelectorAll('[data-error-reason]').forEach(x=>x.classList.toggle('selected-reason',x===btn));toast('Motivo do erro registrado. Isso vai ajudar o app a ajustar seus treinos.')})}
function lastAttemptFor(id){for(let i=store.attempts.length-1;i>=0;i--)if(store.attempts[i].id===id)return store.attempts[i];return null}
function pendingErrorIds(){ensureProgram();const active=new Set(bank().filter(q=>!q.historicalOnly).map(q=>q.id));return new Set(dueReviews(store.attempts,store.program.reviews||{}).filter(id=>active.has(id)))}
function markErrorMastered(id,correct=true){ensureProgram();store.program.reviews||={};store.program.reviews[id]=nextReview(store.program.reviews[id],correct);save()}
function errorReasonLabel(reason){return({conteudo:'Não sabia o conteúdo',interpretacao:'Interpretei errado',duvida:'Fiquei entre duas',chute:'Chutei'})[reason]||'Motivo não registrado'}
function reviewLearnHTML(q,pos,total){const last=lastAttemptFor(q.id);return `<section class="card question review-learning-card"><div class="meta">Revisão ${pos+1} de ${total} · ${esc(q.subject)}</div><h2>${esc(q.topic)}</h2><p>${microLesson(q)}</p><details class="spaced"><summary>Ver a questão e minha resposta anterior</summary>${supportHTML(q)}<p>${esc(q.statement)}</p><p><b>Você marcou:</b> ${esc(q.options[last?.selected]||'Não respondida')}</p><p><b>Resposta correta:</b> ${esc(q.options[q.answer])}</p></details><details class="spaced"><summary>Entender melhor: explicação, exemplo e fontes</summary>${explanationHTML(q)}</details><p id="reviewInstruction" class="muted spaced"></p><button id="reviewTransfer" class="primary">Continuar revisão</button></section>`}
function reviewTransferHTML(original,q,pos,total){const rs=reviewState,chosen=rs.selected,done=rs.answered,key=`review-transfer:${q.id}`,strikes=manualStrikes(key);return `<section class="card question review-transfer-card"><div class="review-stage"><span>REVISÃO ATIVA</span><b>2/2 · TRANSFERIR O CONCEITO</b></div><div class="meta">${esc(q.subject)} / ${esc(q.topic)} • erro ${pos+1} de ${total}</div><h1>Agora prove que aprendeu em uma questão diferente.</h1><p class="statement">${esc(q.statement)}</p>${supportHTML(q)}<div class="options review-options">${q.options.map((o,i)=>{const struck=!done&&strikes.includes(i),cls=done?(i===q.answer?'correct':i===chosen&&chosen!==q.answer?'wrong':''):(i===chosen?'selected':'');return `<div class="option ${struck?'struck':''} ${cls}" data-review-option="${i}" data-strike-index="${i}" data-strike-key="${esc(key)}" role="button" tabindex="${done?'-1':'0'}" aria-disabled="${done}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!done?'<p class="strike-hint">Deslize a alternativa para o lado para riscar. Deslize novamente para desfazer.</p>':''}${done?`<div class="review-transfer-result ${chosen===q.answer?'ok':'bad'}"><b>${chosen===q.answer?'Conceito confirmado.':'Ainda não consolidou.'}</b>${explanationHTML(q)}${chosen===q.answer?'<p>Revisão agendada para outro dia; um acerto não comprova retenção.</p>':'<p>O erro continua na sua fila. Volte ao conceito e tente novamente depois.</p>'}</div>`:''}<div class="actions spaced">${done&&chosen===q.answer?'<button id="nextReview" class="primary">PRÓXIMO ERRO →</button>':done?'<button id="backToLesson" class="primary">REVER O CONCEITO →</button>':'<span class="muted">Marque uma alternativa para conferir na hora.</span>'}</div></section>`}
function initReviewState(){reviewState={ids:[...pendingErrorIds()],index:0,originalId:null}}
function advanceReview(){reviewState.index++;reviewState.originalId=null;renderErrorReview();window.scrollTo({top:0,behavior:'auto'})}
function renderErrorReview(){
 const all=bank().filter(q=>!q.historicalOnly);
 if(!reviewState?.ids)initReviewState();
 const r=reviewState;
 while(r.index<r.ids.length&&!all.some(q=>q.id===r.ids[r.index]))r.index++;
 if(r.index>=r.ids.length){$('#content').innerHTML=title('Revisão concluída.',`${r.ids.length} itens percorridos. As próximas revisões aparecem na data agendada.`)+'<a class="button primary" href="#inicio">Voltar ao plano</a>';return}
 if(!r.originalId){r.originalId=r.ids[r.index];r.retention=!!store.program.reviews?.[r.originalId];r.phase=r.retention?'test':'learn';r.selected=null;r.answered=false}
 const q=all.find(q=>q.id===r.originalId),similar=findSimilar(q,all),test=similar||q;
 const nextLabel=r.index+1<r.ids.length?'Próxima revisão':'Concluir revisão';
 if(r.phase==='learn'){
  $('#content').innerHTML=title('Revisar um ponto por vez.','Leia a ideia principal. Abra os detalhes se precisar.')+reviewLearnHTML(q,r.index,r.ids.length);
  $('#reviewInstruction').textContent=similar?'Depois da leitura, tente uma questão relacionada.':'Sem questão equivalente disponível. Agende uma tentativa para amanhã e siga para o próximo item. A leitura não conta como acerto.';
  $('#reviewTransfer').textContent=similar?'Praticar o conceito':`Agendar para amanhã e ${nextLabel.toLowerCase()}`;
  $('#reviewTransfer').onclick=()=>{if(!similar){markErrorMastered(q.id,false);advanceReview();return}r.phase='test';renderErrorReview();window.scrollTo({top:0,behavior:'auto'})};return;
 }
 const reviewStrikeKey=`review:${test.id}`,reviewStrikes=manualStrikes(reviewStrikeKey);
 $('#content').innerHTML=title(`Revisão ${r.index+1} de ${r.ids.length}`,similar?'Questão relacionada por matéria e assunto; a correspondência é aproximada.':'Ainda não há equivalente. Tente explicar a regra antes de responder à questão original.')+`<section class="card question">${supportHTML(test)}<p class="statement">${esc(test.statement)}</p>${originalHTML(test)}<div class="options">${test.options.map((o,i)=>{const struck=!r.answered&&reviewStrikes.includes(i);return `<div class="option ${struck?'struck':''} ${r.answered?(i===test.answer?'correct':i===r.selected?'wrong':''):''}" data-review-answer="${i}" data-strike-key="${esc(reviewStrikeKey)}" role="button" tabindex="${r.answered?'-1':'0'}" aria-label="Alternativa ${String.fromCharCode(65+i)}${struck?', riscada':''}" aria-disabled="${r.answered}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!r.answered?'<p class="strike-hint">Deslize a alternativa para o lado. Ao soltar, ela será riscada; deslize novamente para desfazer.</p>':''}${r.answered?`<div class="feedback"><b>${r.selected===test.answer?'Acertou.':'Vamos reforçar este ponto.'}</b><p>Próxima revisão: ${new Date(store.program.reviews[q.id].dueAt).toLocaleDateString('pt-BR')}.</p><button id="reviewNext" class="primary">${nextLabel}</button><details class="spaced"><summary>Entender a resposta</summary>${explanationHTML(test)}</details></div>`:'<p class="muted">Responda antes de consultar a explicação.</p>'}</section>`;
 document.querySelectorAll('[data-review-answer]').forEach(btn=>{
  const idx=()=>Number(btn.dataset.reviewAnswer);
  const activate=()=>{
   if(r.answered||btn.getAttribute('aria-disabled')==='true'||btn.classList.contains('struck'))return;
   r.selected=idx();r.answered=true;
   const correct=r.selected===test.answer;
   store.attempts.push({id:test.id,selected:r.selected,correct,at:new Date().toISOString(),mode:r.retention?'retention':'review-transfer',reviewOf:q.id});
   markErrorMastered(q.id,correct);renderErrorReview();
  };
  btn.onclick=e=>{e.preventDefault();activate()};
  btn.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
 $('#reviewNext')?.addEventListener('click',advanceReview);
}

function stats(){const active=new Set(bank().map(q=>q.id)),s=summary(store.attempts.filter(a=>active.has(a.id)));return `<div class="stats">${[['Questões respondidas',s.total,'tentativas do foco atual'],['Aproveitamento',s.rate+'%','nas matérias do último edital'],['Para revisar',pendingErrorIds().size,'erros que ainda precisam ser dominados'],['Simulados feitos',store.sessions.length,'finalizados']].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('')}</div>`}
function subjects(){const present=new Set(bank().map(q=>q.subject));return LAST_EDITAL_SUBJECTS.filter(s=>present.has(s))}
function progress(){return subjects().map(s=>{const ids=new Set(bank().filter(q=>q.subject===s&&!q.historicalOnly).map(q=>q.id)),r=summary(store.attempts.filter(a=>ids.has(a.id)));return `<div class="subject"><div class="row"><span>${esc(s)}</span><span class="muted">${r.total?r.rate+'%':'Sem respostas'}</span></div><div class="track"><i style="width:${r.rate}%"></i></div></div>`}).join('')}
function daysBetween(a,b){const [ay,am,ad]=a.split('-').map(Number),[by,bm,bd]=b.split('-').map(Number);return Math.floor((Date.UTC(by,bm-1,bd)-Date.UTC(ay,am-1,ad))/86400000)}
function programDay(){return Math.max(1,Math.min(90,daysBetween(store.program.startDate,localDay())+1))}
function todayDone(){return !!store.program.completed[localDay()]}
function streak(){let n=0,d=new Date();for(;;){const k=localDay(d);if(!store.program.completed[k])break;n++;d.setDate(d.getDate()-1)}return n}
function rankName(){const x=store.program.xp||0;if(x>=20000)return'ELITE';if(x>=10000)return'OPERACIONAL';if(x>=5000)return'AGENTE';if(x>=1500)return'ALUNO';return'RECRUTA'}
function realBank(){return bank().filter(q=>q.origin==='prova'&&!q.historicalOnly)}
function subjectPerformance(name){const ids=new Set(realBank().filter(q=>q.subject===name).map(q=>q.id));return summary(store.attempts.filter(a=>ids.has(a.id)))}
function weakestSubject(){const ss=[...new Set(realBank().map(q=>q.subject))];return ss.map(name=>({name,s:subjectPerformance(name)})).sort((a,b)=>{const ar=a.s.total?a.s.rate:-1,br=b.s.total?b.s.rate:-1;return ar-br||a.s.total-b.s.total})[0]?.name||ss[0]}
function rotateSubject(offset=0){const ss=[...new Set(realBank().map(q=>q.subject))];return ss[(programDay()-1+offset)%ss.length]}
function phaseInfo(day){if(day<=21)return{name:'FUNDAÇÃO',target:60};if(day<=45)return{name:'CONSOLIDAÇÃO',target:70};if(day<=70)return{name:'FASE DE PROVA',target:75};return{name:'OPERAÇÃO APROVAÇÃO',target:80}}
function missionSpec(){const day=programDay(),cycle=(day-1)%7,weak=weakestSubject(),s1=rotateSubject(0),s2=rotateSubject(3),phase=phaseInfo(day);let plans;
 if(day<=21)plans=[
  {type:'subject',title:'Base do dia',desc:`Construa a base em ${s1}. Leia, responda e aprenda com cada correção.`,subject:s1,count:20,minutes:35},
  {type:'subject',title:'Base do dia',desc:`Hoje o foco é ${s2}. O objetivo é entender antes de acelerar.`,subject:s2,count:20,minutes:35},
  {type:'subject',title:'Fundamento essencial',desc:`Treino guiado em ${weak}. O app começa a mapear seus pontos fracos.`,subject:weak,count:20,minutes:35},
  {type:'dual',title:'Dupla de fundamentos',desc:`${s1} + ${s2}. Duas matérias, sem sobrecarregar o início da jornada.`,subjects:[s1,s2],count:20,minutes:40},
  {type:'subject',title:'Fixação',desc:`Mais uma rodada em ${rotateSubject(2)} para consolidar o conteúdo da semana.`,subject:rotateSubject(2),count:20,minutes:35},
  {type:'mixed',title:'Fechamento da base',desc:'Questões de várias matérias para testar a retenção da semana.',count:25,minutes:45},
  {type:'errors',title:'Acerto de contas',desc:'Hoje não é dia de correr atrás de novidade: revise os erros da semana.',subject:weak,count:20,minutes:40}
 ];
 else if(day<=45)plans=[
  {type:'weak',title:'Matéria fraca',desc:`Prioridade em ${weak}. O app aumenta a carga onde seu desempenho está menor.`,subject:weak,count:30,minutes:45},
  {type:'mixed',title:'Questões misturadas',desc:'Treino de consolidação com matérias alternadas e maior volume.',count:30,minutes:45},
  {type:'errors',title:'Revisão obrigatória',desc:'Reveja os erros recentes antes de avançar.',subject:weak,count:25,minutes:40},
  {type:'dual',title:'Duas matérias',desc:`${s1} + ${s2}. Consolidação cruzada para evitar estudo isolado.`,subjects:[s1,s2],count:30,minutes:50},
  {type:'mixed',title:'Simulado de consolidação',desc:'Treino cronometrado para transformar conhecimento em desempenho.',count:40,minutes:60},
  {type:'weak',title:'Recuperação de desempenho',desc:`Volte ao seu ponto mais fraco: ${weak}.`,subject:weak,count:30,minutes:45},
  {type:'errors',title:'Revisão semanal',desc:'A semana só fecha depois que você enfrentar os erros acumulados.',subject:weak,count:30,minutes:50}
 ];
 else if(day<=70)plans=[
  {type:'mixed',title:'Bloco de prova',desc:'Questões variadas em ritmo de prova.',count:40,minutes:55},
  {type:'errors',title:'Correção do bloco',desc:'Ataque os erros do treino anterior e reforce o ponto fraco.',subject:weak,count:30,minutes:45},
  {type:'mixed',title:'Simulado de prova',desc:'Simulado mais longo e cronometrado. O foco agora é desempenho.',count:50,minutes:70},
  {type:'errors',title:'Correção do simulado',desc:'Sem pular correção: hoje a missão é entender os erros.',subject:weak,count:30,minutes:45},
  {type:'dual',title:'Duas piores matérias',desc:`${weak} + ${s2}. O app concentra energia onde você mais perde pontos.`,subjects:[weak,s2],count:40,minutes:55},
  {type:'full',title:'Prova antiga completa',desc:'Resolva a prova real completa, em ordem e com cronômetro.',count:realBank().length,minutes:270},
  {type:'errors',title:'Revisão inteligente',desc:'Feche a semana revendo erros e questões que precisam reaparecer.',subject:weak,count:30,minutes:45}
 ];
 else plans=[
  {type:'full',title:'Prova completa',desc:'Modo reta final: prova real completa e sem atalhos.',count:realBank().length,minutes:270},
  {type:'errors',title:'Pós-prova',desc:'Revise os erros da prova e elimine reincidências.',subject:weak,count:35,minutes:50},
  {type:'weak',title:'Ataque ao ponto fraco',desc:`Sua prioridade hoje é ${weak}.`,subject:weak,count:40,minutes:55},
  {type:'mixed',title:'Simulado de alta pressão',desc:'Volume alto, tempo controlado e matérias misturadas.',count:50,minutes:65},
  {type:'errors',title:'Repetição espaçada',desc:'Questões erradas voltam para confirmar se o aprendizado ficou.',subject:weak,count:35,minutes:50},
  {type:'full',title:'Prova completa',desc:'Segunda prova completa da semana para medir consistência.',count:realBank().length,minutes:270},
  {type:'errors',title:'Revisão de elite',desc:'Feche a semana atacando erros reincidentes e seus três pontos mais frágeis.',subject:weak,count:40,minutes:55}
 ];
 return {...plans[cycle],day,phase:phase.name,target:phase.target}}
function missionDisplayTitle(spec){if(spec.type==='subject')return `OPERAÇÃO: ${spec.subject}`;if(spec.type==='weak')return `OPERAÇÃO RECUPERAÇÃO: ${spec.subject}`;if(spec.type==='dual')return 'MISSÃO DUPLA';if(spec.type==='errors')return 'ACERTO DE CONTAS';if(spec.type==='full')return 'PROVA DE COMBATE';return 'TESTE DE COMBATE'}
function renderMore(){const items=[['rotina','⚙','Minha rotina','Ajuste horários, dias de estudo e escala.'],['provas','▧','Acervo de provas','Consulte e refaça provas completas.'],['materias','▦','Matérias','Escolha uma disciplina para praticar.'],['questoes','▤','Banco de questões','Pesquise e filtre o banco completo.'],['simulados','◷','Simulados','Treine o tempo e a resolução de prova.'],['erros','↺','Revisar erros','Volte às questões que você errou.'],['favoritos','☆','Favoritos','Acesse suas questões salvas.'],['dados','⚙','Meus dados','Backup e configurações locais.']];$('#content').innerHTML=title('Mais','Ferramentas extras do preparatório.')+installCardHTML()+`<div class="more-grid">${items.map(([id,icon,name,desc])=>{const locked=lockStudy(id);return `<a class="card more-item ${locked?'locked-card':''}" href="#${locked?'missao':id}"><span class="more-icon">${locked?'🔒':icon}</span><div><h2>${name}</h2><p class="muted">${locked?'Conclua a missão de hoje para liberar.':desc}</p></div></a>`}).join('')}</div>`;syncInstallUI()}
function missionQuestions(spec){const all=realBank();let qs=[];if(spec.type==='subject'||spec.type==='weak')qs=all.filter(q=>q.subject===spec.subject);else if(spec.type==='dual')qs=all.filter(q=>spec.subjects.includes(q.subject));else if(spec.type==='errors'){const ids=latestErrors(store.attempts);qs=all.filter(q=>ids.has(q.id));if(qs.length<spec.count){const fill=all.filter(q=>q.subject===spec.subject&&!qs.includes(q));qs=[...qs,...fill]}}else qs=all.slice();if(spec.type==='full')return MT_QUESTIONS.slice().sort((a,b)=>Number(a.source?.number||0)-Number(b.source?.number||0));return shuffle(qs).slice(0,Math.min(spec.count,qs.length))}
function missionHeader(){const d=programDay(),pct=Math.max(1,Math.round(d/90*100)),p=phaseInfo(d);return `<section class="mission-status"><div><span class="eyebrow">PROJETO APROVAÇÃO • ${p.name}</span><div class="mission-progress-row"><h2>Dia ${d} de 90</h2><b>${pct}% concluído</b></div><div class="track"><i style="width:${pct}%"></i></div></div><div class="mission-kpis"><span><b>${streak()}</b>dias seguidos</span><span><b>${store.program.xp}</b>XP</span><span><b>${rankName()}</b>patente</span></div></section>`}
function renderMission(){
 if(run&&run.originTab==='missao'){showExamQuestion();return}
 const spec=missionSpec(),done=todayDone(),last=store.program.completed[localDay()];
 $('#content').innerHTML=missionHeader()+`<section class="card daily-mission ${done?'done':''}"><div class="mission-badge">${done?'✓':'◆'}</div><div class="eyebrow">${done?'MISSÃO CONCLUÍDA':'MISSÃO DO DIA'}</div><h1>${esc(missionDisplayTitle(spec))}</h1><p>${esc(spec.desc)}</p><div class="mission-facts"><span><b>${spec.count}</b> questões</span><span><b>${spec.minutes}</b> min</span><span><b>${spec.target}%</b> meta</span><span><b>+${100}</b> XP base</span></div>${done?`<div class="mission-result"><b>${last.correct}/${last.total} acertos</b><span>${last.rate}% de aproveitamento</span></div><p class="muted">A missão obrigatória acabou. Continue no próximo bloco até fechar sua meta líquida de estudo.</p>`:`<button id="startMission" class="primary mission-cta">INICIAR MISSÃO →</button><p class="muted">As áreas de treino ficam bloqueadas até você concluir a missão de hoje.</p>`}</section>${done?studyClockCardHTML()+postMissionCardHTML():''}<section class="card spaced"><div class="row"><h2>Como funciona</h2><span class="tag">AUTOMÁTICO</span></div><p class="muted">Primeiro você cumpre a missão obrigatória. Depois o app direciona revisão, ponto fraco e simulados até completar a meta líquida do dia.</p></section>`;
 if(!done)$('#startMission').onclick=()=>startMission(spec);else $('#continueStudy')?.addEventListener('click',startRecommendedBlock);
 syncStudyClockUI();
}
function startMission(spec=missionSpec()){const qs=missionQuestions(spec);if(!qs.length){toast('Ainda não há questões suficientes para esta missão.');return}examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+spec.minutes*60000,originTab:'missao',label:missionDisplayTitle(spec),missionDay:spec.day};if(tab!=='missao'){tab='missao';history.replaceState(null,'','#missao');render();return}showExamQuestion()}
function lockStudy(){return false}
function renderSubjects(){
 const real=bank().filter(q=>q.origin==='prova');
 const groups=[...new Set(real.map(q=>q.subject))].map(name=>({name,count:real.filter(q=>q.subject===name).length}));
 $('#content').innerHTML=title('Estudar por matéria','Foco enxuto com base no último edital do Agente Penitenciário de Mato Grosso (SEJUDH/MT 2016/2017).')+`<div class="notice"><b>Foco do último edital:</b> Português, História/Geografia de MT, Ética e Filosofia, Constitucional, Administração, Administrativo, Penal e Processo Penal, Direitos Humanos e Legislação Básica. Informática, Raciocínio Lógico, Atualidades e matérias específicas de outros estados ficam fora do treino ativo.</div><div class="subject-grid spaced">${groups.map(g=>`<section class="card subject-card"><div class="subject-check">✓</div><div><h2>${esc(g.name)}</h2><p class="muted">${g.count} questão${g.count===1?'':'ões'} disponível${g.count===1?'':'is'}</p><button class="primary subject-start" data-subject="${esc(g.name)}">Responder →</button></div></section>`).join('')}</div>`;
 document.querySelectorAll('.subject-start').forEach(b=>b.onclick=()=>{filter={search:'',subject:b.dataset.subject,kind:'prova',exam:''};location.hash='questoes'});
}
function navigate(){if(!currentUser){renderAuth();return}let dest=location.hash.slice(1)||'inicio';if(lockStudy(dest)){toast('Conclua a missão do dia para liberar o treino livre.');dest='missao';if(location.hash!=='#missao'){location.hash='missao';return}}if(run&&dest!==(run.originTab||'simulados')){if(!confirm('Sair desta missão? As respostas desta sessão não serão salvas.')){location.hash=run.originTab||'missao';return}run=null}tab=pages.some(p=>p[0]===dest)?dest:'inicio';index=0;selection=null;answered=false;render()}
window.addEventListener('hashchange',navigate);
function render(){
 $('#nav').innerHTML=pages.map(([id,icon,name])=>{const locked=lockStudy(id),mobilePrimary=['inicio','estudar','erros','simulados','desempenho'].includes(id);return `<a href="#${locked?'missao':id}" class="${tab===id?'active':''} ${locked?'locked':''} ${mobilePrimary?'mobile-primary':'mobile-extra'}" ${tab===id?'aria-current="page"':''}><span class="navicon">${locked?'🔒':icon}</span>${name}</a>`}).join('');
 const c=$('#content');
 if(tab==='inicio'||tab==='missao')renderToday();
 if(tab==='estudar')renderLearn();
 if(tab==='rotina')renderRoutine();
 if(tab==='conteudos')renderLessonLibrary();
 if(tab==='mais')renderMore();
 if(tab==='materias')renderSubjects();
 if(['questoes','erros','favoritos'].includes(tab)){if(tab==='erros')reviewState=null;renderPractice();}
 if(tab==='simulados')renderExam();
 if(tab==='provas')renderArchive();
 if(tab==='desempenho')renderLearningProgress();
 if(tab==='dados')renderData();
}
function pool(){const errors=pendingErrorIds();return bank().filter(q=>(!q.historicalOnly||!!filter.exam)&&(tab!=='erros'||errors.has(q.id))&&(tab!=='favoritos'||store.favorites.includes(q.id))&&(!filter.exam||examId(q)===filter.exam)&&(!filter.subject||q.subject===filter.subject)&&(!filter.kind||q.origin===filter.kind)&&(!filter.search||(q.statement+' '+q.topic+' '+(q.context||'')+' '+(q.source?.exam||'')).toLocaleLowerCase('pt-BR').includes(filter.search.toLocaleLowerCase('pt-BR'))));}
function renderPractice(){
 if(tab==='erros'){renderErrorReview();return}
 const heading=tab==='favoritos'?['Seu caderno de favoritos.','Guarde questões para retomar depois.']:['Banco de questões','Questões completas para responder dentro do aplicativo, com enunciado, alternativas, gabarito e fonte oficial para conferência.'];
 $('#content').innerHTML=title(...heading)+`<div class="filters"><label>Buscar número, enunciado ou assunto<input id="search" placeholder="Ex.: questão 21 ou constitucional" value="${esc(filter.search)}"></label><label>Matéria<select id="subject"><option value="">Todas as matérias</option>${subjects().map(s=>`<option ${s===filter.subject?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Prova<select id="exam"><option value="">Todas as provas</option>${examChoices(filter.exam)}</select></label><label>Origem<select id="kind"><option value="">Todas</option><option value="autoral" ${filter.kind==='autoral'?'selected':''}>Autorais</option><option value="prova" ${filter.kind==='prova'?'selected':''}>Provas reais</option></select></label></div><p class="muted filter-note">Enunciados e alternativas no aplicativo. Textos de apoio e imagens preservam os detalhes da prova. A correção segue o gabarito histórico identificado na fonte.</p><div id="questionArea"></div>`;
 for(const key of ['search','subject','kind','exam'])$('#'+key).addEventListener(key==='search'?'input':'change',e=>{filter[key]=e.target.value;index=0;answered=false;selection=null;queue=pool();showQuestion()});
 queue=pool();showQuestion();
}
function showQuestion(){
 const area=$('#questionArea');if(!queue.length){area.innerHTML='<div class="card empty"><h2>Nenhuma questão por aqui.</h2><p>Altere os filtros ou comece uma nova sessão de estudo.</p><button id="clearFilters">Limpar filtros</button></div>';$('#clearFilters').onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:''};renderPractice()};return}
 index=Math.min(index,queue.length-1);const q=queue[index];area.innerHTML=questionHTML(q,false)+`<div class="actions spaced"><button id="prev" ${index===0?'disabled':''}>← Anterior</button><button id="respond" class="primary" ${selection===null||answered?'disabled':''}>Conferir resposta</button><button id="next" ${index===queue.length-1?'disabled':''}>Próxima →</button><span class="muted">${index+1} de ${queue.length}</span></div>`;
 bindOptions(q,()=>showQuestion());bindTacticalHelp(q);$('#guessed')?.addEventListener('click',()=>{const a=lastAttemptFor(q.id);if(a){a.guessed=true;save();toast('Registrado. Esta questão entra na revisão.')}});$('#favorite').onclick=()=>{toggleFavorite(q.id);showQuestion()};
 $('#respond').onclick=()=>{if(selection===null||answered)return;answered=true;const correct=selection===q.answer,gain=applyQuestionXP(q,correct);store.attempts.push({id:q.id,selected:selection,correct,at:new Date().toISOString(),mode:'practice',assists:[...assistFor(q.id).used],assistXp:assistFor(q.id).spent||0,xpAwarded:gain,difficulty:questionDifficulty(q).key,weight:questionWeight(q)});save();showQuestion();if(gain)toast(`+${gain} XP ${correct?'pelo acerto':'pela tentativa'}.`)};
 for(const [id,delta] of [['prev',-1],['next',1]])$('#'+id).onclick=()=>{index+=delta;selection=null;answered=false;showQuestion()};
}
function questionHTML(q,exam){const inline=q.displayMode!=='source-pdf',assist=assistFor(q.id),strikes=manualStrikes(q.id),examAnswered=exam&&run?.originTab==='missao'&&runAnswered(q.id),diff=questionDifficulty(q),reward=questionXP(q),weight=questionWeight(q),xp=store.program.xp||0;return `<article class="card question">${historicalNotice(q)}<div class="row"><div class="meta">${esc(q.subject)} / ${esc(q.topic)}<br>${q.origin==='autoral'?'AUTORAL • DEMONSTRAÇÃO':esc(q.source.board)+' • '+esc(q.source.year)+' • '+esc(q.source.exam)+' • Q'+esc(q.source.number)+(q.source.version?' • Caderno '+esc(q.source.version):'')}<div class="question-xp-meta"><span>${diff.label}</span><span>Peso ${weight}</span><span>+${reward} XP se acertar</span></div></div>${!exam?`<button id="favorite" class="secondary" aria-label="${store.favorites.includes(q.id)?'Remover dos':'Adicionar aos'} favoritos">${store.favorites.includes(q.id)?'★ Salva':'☆ Salvar'}</button>`:''}</div>${supportHTML(q)}<p class="statement">${esc(q.statement)}</p>${originalHTML(q)}${inline?'':referenceReader(q)}<div class="options" role="group" aria-label="Alternativas">${q.options.map((o,i)=>{const eliminated=assist.eliminated.includes(i),struck=strikes.includes(i),instant=examAnswered?(i===q.answer?'correct':i===selection&&selection!==q.answer?'wrong':''):'';return `<div class="option ${selection===i?'selected':''} ${eliminated?'eliminated':''} ${struck?'struck':''} ${examAnswered?'locked-answer':''} ${instant||answered&&!exam?(instant||(i===q.answer?'correct':i===selection?'wrong':'')):''}" data-option="${i}" data-strike-key="${esc(q.id)}" role="button" tabindex="${eliminated||answered&&!exam||examAnswered?'-1':'0'}" aria-label="Alternativa ${String.fromCharCode(65+i)}${struck?', riscada':''}" aria-pressed="${selection===i}" aria-disabled="${eliminated||answered&&!exam||examAnswered}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${inline?esc(o):'Alternativa '+String.fromCharCode(65+i)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}${eliminated?'<small class="elim-label">ELIMINADA</small>':''}</div>`}).join('')}</div>${!examAnswered?'<p class="strike-hint">Deslize a alternativa para o lado. Ao soltar, ela será riscada; deslize novamente para desfazer.</p>':''}<div class="question-tools"><button id="tacticalHelp" class="tactical-help ${xp<=0?'xp-locked':''}" ${exam?'disabled':''}>💡 Entender o conteúdo · grátis</button>${assist.spent?`<span class="assist-used">-${assist.spent} XP em ajuda nesta questão</span>`:''}</div>${q.origin==='prova'&&inline?`<div class="question-source"><a href="${esc(q.source.examUrl)}#page=${Number(q.source.page)||1}" target="_blank" rel="noopener noreferrer">Ver questão na prova original ↗</a></div>`:''}${answered&&!exam?feedback(q,selection):''}${answered&&!exam?'<button id=guessed class=secondary>Acertei, mas chutei / fiquei em dúvida</button>':''}</article>`}
function feedback(q,selected){const last=[...store.attempts].reverse().find(a=>a.id===q.id),gain=last?.xpAwarded||0,xpNote=last?`<div class="xp-earned">${gain>0?`+${gain} XP nesta questão`:'XP desta questão já coletado hoje'}</div>`:'';const diagnosis=selected!==undefined&&selected!==q.answer?`<div class="error-diagnosis"><b>Onde você caiu?</b><p class="muted">Marque o motivo. O app pode usar isso para ajustar missões futuras.</p><div class="reason-buttons"><button data-error-reason="conteudo">Não sabia o conteúdo</button><button data-error-reason="interpretacao">Interpretei errado</button><button data-error-reason="duvida">Fiquei entre duas</button><button data-error-reason="chute">Chutei</button></div></div>`:'';return `<div class="feedback ${selected!==q.answer?'bad':''}" role="status"><b>${selected===q.answer?'Resposta correta!':selected===undefined?'Não respondida.':'Ainda não foi dessa vez.'} Gabarito: ${q.options.length===2?esc(q.options[q.answer]):String.fromCharCode(65+q.answer)}.</b>${xpNote}${explanationHTML(q)}${diagnosis}${q.origin==='prova'?`<a href="${esc(q.source.examUrl)}" target="_blank" rel="noopener noreferrer">Consultar prova</a> · <a href="${esc(q.source.answerUrl)}${q.source.answerPage?'#page='+Number(q.source.answerPage):''}" target="_blank" rel="noopener noreferrer">Consultar gabarito</a><p>${q.displayMode==='source-pdf'?'Conferência documental do gabarito histórico':'Revisão declarada na importação'}: ${esc(q.source.reviewedAt)}.</p>`:'<small>Questão autoral para demonstração da plataforma.</small>'}</div>`}
function bindOptions(q,fn){
 const buttons=[...document.querySelectorAll('[data-option]')];
 buttons.forEach(b=>{
  const index=()=>Number(b.dataset.option);
  const blocked=()=>b.getAttribute('aria-disabled')==='true'||(run?.originTab==='missao'&&runAnswered(q.id));
  const activate=()=>{
   if(blocked()||b.classList.contains('struck')||answered&&!run)return;
   selection=index();
   if(run)run.answers[q.id]=selection;
   buttons.forEach(el=>{
    const yes=Number(el.dataset.option)===selection;
    el.classList.toggle('selected',yes);
    el.setAttribute('aria-pressed',String(yes));
    if(run?.originTab==='missao'){
     const optionIndex=Number(el.dataset.option);
     el.classList.toggle('correct',optionIndex===q.answer);
     el.classList.toggle('wrong',yes&&selection!==q.answer);
     el.classList.add('locked-answer');
     el.setAttribute('aria-disabled','true');
     el.setAttribute('tabindex','-1');
    }
   });
   if($('#respond'))$('#respond').disabled=false;
   if($('#answeredCount')&&run)$('#answeredCount').textContent=Object.keys(run.answers).length;
  };
  b.onclick=e=>{e.preventDefault();activate()};
  b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
}
function toggleFavorite(id){store.favorites=store.favorites.includes(id)?store.favorites.filter(x=>x!==id):[...store.favorites,id];save()}
function renderExam(){
 if(run){showExamQuestion();return}
 if(examResult){const r=examResult;$('#content').innerHTML=title('Treino concluído.','Confira o resultado e revise cada resposta.')+`<div class="card"><span class="result-score">${Math.round(r.correct/r.questions.length*100)}%</span><p>${r.correct} de ${r.questions.length} acertos • ${r.unanswered} sem resposta</p><button id="newExam" class="primary">Novo simulado</button></div>`+r.questions.map((q,i)=>`<section class="card spaced"><h3>${i+1}. ${esc(q.statement)}</h3><p class="muted">Sua resposta: ${r.answers[q.id]===undefined?'Não respondida':esc(q.options[r.answers[q.id]])}</p>${feedback(q,r.answers[q.id])}</section>`).join('');$('#newExam').onclick=()=>{examResult=null;renderExam()};return}
 $('#content').innerHTML=title('Simule o dia da prova.','Questões aleatórias, tempo definido por você e correção ao finalizar.')+`<section class="card"><h2>Monte seu treino</h2><div class="filters exam-filters"><label>Origem<select id="examOrigin"><option value="prova">Provas reais</option><option value="autoral">Treino autoral</option><option value="">Todas</option></select></label><label>Prova<select id="examSource"><option value="">Todas as provas</option>${examChoices()}</select></label><label>Matéria<select id="examSubject"><option value="">Todas as matérias</option>${subjects().map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label>Quantidade<input id="examCount" type="number" min="1" max="${bank().length}" value="10"></label><label>Tempo em minutos<input id="examTime" type="number" min="1" max="180" value="20"></label></div><p class="muted" id="available"></p><button id="startExam" class="primary">Iniciar simulado →</button><div class="notice">Treino livre: todas as questões valem um acerto, sem os pesos da prova original. Anuladas excluídas. A fonte oficial pode exigir internet; o gabarito jurídico é histórico, sem revisão de vigência. A sessão em andamento não é recuperada ao fechar a página.</div></section>`;
 const examPool=()=>bank().filter(q=>(!q.historicalOnly||!!$('#examSource').value)&&(!$('#examSource').value||examId(q)===$('#examSource').value)&&(!$('#examSubject').value||q.subject===$('#examSubject').value)&&(!$('#examOrigin').value||q.origin===$('#examOrigin').value));const update=()=>{const n=examPool().length;$('#examCount').max=n;if(Number($('#examCount').value)>n)$('#examCount').value=n;$('#available').textContent=`${n} questões disponíveis neste recorte. ${$('#examSource').value?'Prova histórica: pode conter itens com ressalva, identificados durante a correção.':'Itens de MT com ressalvas críticas foram excluídos do sorteio.'}`};$('#examSubject').onchange=update;$('#examOrigin').onchange=update;$('#examSource').onchange=update;update();
 $('#startExam').onclick=()=>{const count=Number($('#examCount').value),minutes=Number($('#examTime').value),qs=examPool();if(!Number.isInteger(count)||count<1||count>qs.length||!Number.isInteger(minutes)||minutes<1||minutes>180){toast('Confira a quantidade e o tempo do simulado.');return}run={questions:shuffle(qs).slice(0,count),answers:Object.create(null),index:0,deadline:Date.now()+minutes*60000,originTab:'simulados',label:'Simulado'};showExamQuestion()};
}
function showExamQuestion(){const q=run.questions[run.index];selection=run.answers[q.id]??null;answered=false;$('#content').innerHTML=`<div class="row"><h1>${esc(run.label||'Simulado')} em andamento</h1><span class="timer" id="timer"></span></div><p class="muted">Questão ${run.index+1} de ${run.questions.length} • <span id="answeredCount">${Object.keys(run.answers).length}</span> respondidas</p>`+questionHTML(q,true)+`<div class="actions spaced"><button id="examPrev" ${run.index===0?'disabled':''}>← Anterior</button><button id="examNext" ${run.index===run.questions.length-1?'disabled':''}>Próxima →</button><button id="finish" class="primary">Finalizar simulado</button></div>`;bindOptions(q,showExamQuestion);bindTacticalHelp(q);$('#examPrev').onclick=()=>{run.index--;showExamQuestion()};$('#examNext').onclick=()=>{run.index++;showExamQuestion()};$('#finish').onclick=()=>{const missing=run.questions.length-Object.keys(run.answers).length;if(confirm(missing?`Faltam ${missing} respostas. Finalizar mesmo assim?`:'Finalizar e conferir o gabarito?'))finishExam()};tick()}
function tick(){if(!run)return;const secs=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));if($('#timer'))$('#timer').textContent=`${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;if(!secs)finishExam()}
setInterval(tick,1000);
function finishExam(){if(!run)return;const r=run;run=null;const at=new Date().toISOString();let correct=0,unanswered=0;for(const q of r.questions){const selected=r.answers[q.id];if(selected===q.answer)correct++;if(selected===undefined)unanswered++;const isCorrect=selected===q.answer,gain=applyQuestionXP(q,isCorrect);store.attempts.push({id:q.id,selected:selected??null,correct:isCorrect,at,mode:r.originTab==='missao'?'mission':'exam',assists:r.assists?.[q.id]||[],assistXp:assistFor(q.id).spent||0,xpAwarded:gain,difficulty:questionDifficulty(q).key,weight:questionWeight(q)})}store.sessions.push({at,total:r.questions.length,correct,mode:r.originTab||'simulados'});if(r.originTab==='missao'){const rate=Math.round(correct/r.questions.length*100),xp=100;store.program.completed[localDay()]={at,total:r.questions.length,correct,rate,day:r.missionDay,xp,target:phaseInfo(r.missionDay||programDay()).target};store.program.xp+=xp}save();examResult={...r,correct,unanswered};if(r.originTab==='missao')renderMission();else if(r.guided){tab='inicio';history.replaceState(null,'','#inicio');render();toast('Bloco concluído. Próximo passo recalculado.')}else if(r.originTab==='provas'){tab='simulados';renderExam();}else renderExam()}
window.addEventListener('beforeunload',e=>{if(run){e.preventDefault();e.returnValue=''}});
function download(name,value){const u=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function renderData(){
 $('#content').innerHTML=title('Seu estudo, seus dados.','O progresso fica salvo neste navegador. Faça backup para levar a outro aparelho.')+`<div class="columns"><section class="card"><h2>Backup do progresso</h2><p class="muted">Inclui respostas, favoritos, simulados e questões importadas. Faça uma cópia adicional do seu progresso, mesmo usando a sincronização da conta.</p><button id="export" class="primary">Exportar backup</button><label class="spaced">Restaurar backup (.json)<input id="restore" type="file" accept=".json,application/json"></label><p class="muted">A restauração substitui os dados atuais após sua confirmação.</p></section><section class="card"><h2>Adicionar questões</h2><p class="muted">Importe um JSON no formato do projeto. Questões de provas exigem links da prova e do gabarito. A importação é local e não publica para outros usuários.</p><button id="template">Baixar modelo JSON</button><label class="spaced">Importar questões (.json)<input id="import" type="file" accept=".json,application/json"></label><p class="muted">${store.custom.length} questões importadas.</p></section></div><div class="notice">Limpar os dados do navegador pode apagar o progresso. Não armazene senhas ou dados pessoais nos arquivos de questões.</div>`;
 $('#export').onclick=()=>download('pp-mt-backup.json',{version:2,data:store});$('#template').onclick=()=>download('modelo-questoes.json',[{...QUESTIONS[0],id:'minha-questao-001'}]);
 $('#import').onchange=async e=>{try{const list=validateBank(await readFile(e.target.files[0]));const ids=new Set(bank().map(q=>q.id));if(list.some(q=>ids.has(q.id)))throw Error('Já existe uma questão com um dos IDs. Use IDs novos.');if(store.custom.length+list.length>5000)throw Error('Limite local de 5.000 questões importadas.');store.custom.push(...list);save();toast(`${list.length} questões importadas.`);renderData()}catch(err){toast(err.message)}};
 $('#restore').onchange=async e=>{try{const b=await readFile(e.target.files[0]),s=b.data;if(b.version!==2||!s||!Array.isArray(s.attempts)||!Array.isArray(s.favorites)||!Array.isArray(s.sessions))throw Error('Backup inválido.');validateBank(s.custom);const combined=[...BUILTIN,...s.custom],ids=new Set(combined.map(q=>q.id));if(ids.size!==combined.length)throw Error('IDs repetidos no backup.');if(s.attempts.some(a=>!a||!ids.has(a.id)||typeof a.correct!=='boolean'||!Number.isFinite(Date.parse(a.at))||!(a.selected===null||Number.isInteger(a.selected)&&a.selected>=0&&a.selected<combined.find(q=>q.id===a.id).options.length))||s.favorites.some(id=>!ids.has(id))||s.sessions.some(x=>!x||!Number.isFinite(Date.parse(x.at))||!Number.isInteger(x.total)||x.total<1||!Number.isInteger(x.correct)||x.correct<0||x.correct>x.total))throw Error('O backup contém registros inválidos.');if(confirm('Substituir todo o progresso atual por este backup?')){store={attempts:s.attempts,favorites:[...new Set(s.favorites)],sessions:s.sessions,custom:s.custom,program:s.program||{startDate:localDay(),completed:{},xp:0}};ensureProgram();save();toast('Backup restaurado.');renderData()}}catch(err){toast(err.message)}};
}
async function readFile(f){if(!f)throw Error('Selecione um arquivo.');if(f.size>10*1024*1024)throw Error('O arquivo deve ter até 10 MB.');try{return JSON.parse(await f.text())}catch{throw Error('Não foi possível ler o JSON.')}}

function referenceReader(q){if(q.displayMode!=='source-pdf')return '';const page=Number(q.source.page)||1;return `<section class="source-reader pending-transcription"><p><b>Transcrição pendente.</b> Esta questão ainda está no formato antigo. A nova versão do banco mostrará o enunciado e as alternativas diretamente aqui.</p><a class="button secondary" href="${esc(q.source.examUrl)}#page=${page}" target="_blank" rel="noopener noreferrer">Ver questão na prova original ↗</a></section>`}
function renderArchive(){
 if(run&&run.originTab==='provas'){showExamQuestion();return}
 if(examResult&&examResult.originTab==='provas'){const r=examResult;$('#content').innerHTML=title('Prova concluída.','Resultado da prova completa.')+`<div class="card"><span class="result-score">${Math.round(r.correct/r.questions.length*100)}%</span><p>${r.correct} de ${r.questions.length} acertos • ${r.unanswered} sem resposta</p><button id="redoFullExam" class="primary">Refazer prova completa</button></div>`;$('#redoFullExam').onclick=()=>{examResult=null;renderArchive()};return}
 const e=MT_EXAM;$('#content').innerHTML=title('Acervo de provas','Provas reais localizadas para ampliar o banco nacional de Polícia Penal.')+`<section class="card archive-card"><div class="archive-head"><img class="archive-seal" src="./icon.svg" alt="Escudo do preparatório PP MT"><div><div class="eyebrow">ACERVO DE PROVAS / MATO GROSSO</div><h2>Agente Penitenciário · SEJUDH/MT</h2><span class="muted">IBADE · Edital 001/2016 · Prova aplicada em ${e.date}</span></div></div><div class="exam-facts"><div><b>S05 T</b><small>Caderno cadastrado</small></div><div><b>60</b><small>Questões na prova</small></div><div><b>57</b><small>Válidas para treinar</small></div><div><b>3</b><small>Anuladas, fora do treino</small></div></div><p class="muted">O objetivo do banco é resolver tudo dentro do aplicativo: enunciado e alternativas completos. O PDF original fica apenas como fonte de conferência. As questões ainda pendentes de transcrição não entram no treino.</p><div class="source-links"><button class="primary" id="fullOfficial">Responder prova completa →</button><button class="secondary" id="trainOfficial">Estudar questões desta prova →</button><a class="button secondary" href="${e.examUrl}" target="_blank" rel="noopener noreferrer">Prova original ↗</a><a class="button secondary" href="${e.answerUrl}#page=13" target="_blank" rel="noopener noreferrer">Gabarito final ↗</a><a class="button secondary" href="${e.landingUrl}" target="_blank" rel="noopener noreferrer">Página da banca ↗</a></div><div class="notice warning-historical"><b>Acervo histórico de 2017.</b> As questões 16, 41 e 56 foram anuladas e não entram no treino nem nas estatísticas. Respostas jurídicas refletem o gabarito da época; não houve revisão de vigência legislativa. Este material não define o conteúdo de um próximo edital.</div><h3>Matérias do caderno</h3><div class="exam-reference-list">${e.sections.map(x=>`<div>${esc(x.subject)} · Q${x.from}–${x.to}</div>`).join('')}</div><details class="source-reader"><summary>Consultar o caderno completo nesta tela</summary><iframe class="pdf-view" src="${e.examUrl}#page=1" title="Caderno oficial S05 T completo" loading="lazy" referrerpolicy="no-referrer"></iframe></details><p class="source-note">Conferência documental: 07/10/2026 (UTC). Os PDFs são carregados diretamente da IBADE. Leitura integrada depende do navegador; os botões abrem o documento separadamente.</p></section>${importedArchiveHTML()}<section class="card spaced"><div class="row"><div><div class="eyebrow">EXPANSÃO NACIONAL</div><h2>Fila de importação</h2></div><span class="tag">${OFFICIAL_QUESTIONS.length} QUESTÕES DISPONÍVEIS</span></div><p class="muted">Já localizamos provas que somam ${SOURCE_TOTAL} questões. No treino ativo entram apenas questões de matérias compatíveis com o último edital de MT; conteúdos extras de outros estados ficam somente no acervo.</p><div class="exam-source-grid">${EXAM_SOURCES.filter(x=>x.id!==e.id&&x.status!=='imported').map(x=>`<a class="exam-source-card" href="${x.sourcePage}" target="_blank" rel="noopener noreferrer"><div><b>${esc(x.state)} • ${esc(x.year)} • ${esc(x.board)}</b><span>${esc(x.exam)}</span></div><strong>${x.questionCount}</strong><small>${x.verifiedOfficialSource?'FONTE OFICIAL VERIFICADA':'FONTE EM VERIFICAÇÃO'}</small></a>`).join('')}</div></section>`;bindImportedArchive();$('#trainOfficial').onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:MT_EXAM.id};location.hash='questoes'};$('#fullOfficial').onclick=()=>{const qs=MT_QUESTIONS.slice().sort((a,b)=>Number(a.source.number)-Number(b.source.number));examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+270*60000,originTab:'provas',label:'Prova completa'};showExamQuestion()}}

if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=20').catch(()=>{});
syncInstallUI();
bootstrap();

function examId(q){return q.source?.examId||(q.source?.examUrl===MT_EXAM.examUrl?MT_EXAM.id:'')}
function examChoices(selected=''){return [{id:MT_EXAM.id,exam:MT_EXAM.exam,year:MT_EXAM.year},...IMPORTED_EXAMS].map(e=>`<option value="${esc(e.id)}" ${selected===e.id?'selected':''}>${esc(e.exam)} · ${e.year}</option>`).join('')}
function localImage(path){return typeof path==='string'&&/^\.\/assets\/questions\/[a-z0-9-]+\.webp$/.test(path)}
function imagesHTML(paths,label){return (Array.isArray(paths)?paths:[]).filter(localImage).map((src,i)=>`<a href="${esc(src)}" target="_blank" rel="noopener noreferrer" class="exam-image-link" aria-label="Ampliar ${label} ${i+1}"><img class="exam-image" src="${esc(src)}" alt="${label} ${i+1}: reprodução da prova original" loading="lazy"></a>`).join('')}
function sharedSourceContext(q){
 const n=Number(q.source?.number);
 if(q.source?.code==='S05'&&q.source?.version==='T'&&q.source?.year==='2017'&&n>=1&&n<=10)return{title:'Texto-base: “TE” — Marilene Felinto',page:2};
 return null;
}
function supportHTML(q){
 if(q.context)return `<details class="question-context" open><summary>Texto de apoio · leia antes de responder</summary>${q.contextImages?.length?imagesHTML(q.contextImages,'Texto de apoio'):`<p class="statement">${esc(q.context)}</p>`}</details>`;
 const shared=sharedSourceContext(q);
 if(!shared)return '';
 const src=`${q.source.examUrl}#page=${shared.page}&view=FitH`;
 return `<details class="question-context source-text-context" open><summary>📄 ${esc(shared.title)} · leia antes de responder</summary><p class="source-note">As questões 1 a 10 usam este mesmo texto, que está na página ${shared.page} da prova original.</p><div class="source-text-frame-wrap"><iframe class="source-text-frame" src="${esc(src)}" title="${esc(shared.title)}"></iframe></div><div class="source-text-actions"><a class="button secondary" href="${esc(src)}" target="_blank" rel="noopener noreferrer">Abrir texto em tela cheia ↗</a></div></details>`;
}
function originalHTML(q){if(!q.facsimile?.length)return '';return `<details class="question-original" ${q.showOriginal?'open':''}><summary>Ver formatação original, figuras e destaques</summary>${imagesHTML(q.facsimile,'Questão '+q.source.number)}</details>`}
function importedArchiveHTML(){return `<section class="card spaced"><div class="eyebrow">QUESTÕES DISPONÍVEIS</div><h2>Outras provas para treinar</h2><div class="exam-source-grid">${IMPORTED_EXAMS.map(e=>`<article class="exam-source-card"><div><b>${esc(e.state)} · ${e.year} · ${esc(e.board)}</b><span>${esc(e.exam)}</span></div><strong>${e.importedQuestionCount}</strong><small>${e.annulled.length?e.annulled.length+' anuladas excluídas · ':''}Gabarito ${e.answerStatus==='definitivo'?'definitivo':'fornecido; situação final não confirmada'}</small><button data-train-exam="${e.id}" class="primary">Estudar questões</button><button data-full-exam="${e.id}">Responder prova</button><a href="${e.examUrl}" target="_blank" rel="noopener noreferrer">Prova original ↗</a><a href="${e.answerUrl}" target="_blank" rel="noopener noreferrer">Gabarito ↗</a></article>`).join('')}</div><p class="muted">Acervo histórico. Legislação estadual corresponde ao estado da prova; não substitui o edital de MT.</p></section>`}
function bindImportedArchive(){document.querySelectorAll('[data-train-exam]').forEach(b=>b.onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:b.dataset.trainExam};location.hash='questoes'});document.querySelectorAll('[data-full-exam]').forEach(b=>b.onclick=()=>{const qs=OFFICIAL_QUESTIONS.filter(q=>examId(q)===b.dataset.fullExam);examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+240*60000,originTab:'provas',label:'Prova completa'};showExamQuestion()})}

// Daily learning flow: stored inside the existing per-account program/backup.
function routineProfile(){return store.program.profile||{level:'zero',schedule:'weekly',days:[1,2,3,4,5],minutes:20,workMinutes:10,freeMinutes:30,anchor:localDay(),time:'19:00',examDate:''}}
function renderRoutine(){
 const p=routineProfile();
 $('#content').innerHTML=title('Uma rotina que cabe na sua vida.','Comece pequeno. Você pode ajustar sem perder seu histórico.')+`<form id="routineForm" class="card routine-form"><p><b>Objetivo: Polícia Penal de Mato Grosso</b><br>Plano de preparação com acervo histórico; não representa um edital futuro.</p><label>Seu ponto de partida<select id="level"><option value="zero">Estou começando do zero</option><option value="return">Estou voltando a estudar</option><option value="practice">Já tenho base e quero praticar</option></select></label><label>Minha rotina<select id="schedule"><option value="weekly">Dias da semana</option><option value="shift">Escala 12×36</option></select></label><fieldset><legend>Dias de estudo (rotina semanal)</legend>${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i)=>`<label class="day-check"><input type="checkbox" name="days" value="${i}" ${p.days.includes(i)?'checked':''}>${d}</label>`).join('')}</fieldset><div class="filters"><label>Minutos por dia<input id="minutes" type="number" min="5" max="240" value="${p.minutes}" required></label><label>Minutos no plantão<input id="workMinutes" type="number" min="0" max="240" value="${p.workMinutes}" required></label><label>Minutos na folga<input id="freeMinutes" type="number" min="5" max="240" value="${p.freeMinutes}" required></label><label>Data de um plantão<input id="anchor" type="date" value="${p.anchor}" required></label><label>Horário que pretendo começar<input id="routineTime" type="time" value="${p.time}" required></label><label>Data da prova, se conhecida<input id="examDate" type="date" value="${p.examDate||''}"></label></div><p class="muted">O horário é um compromisso no seu plano; o app ainda não envia notificações. Em dias difíceis, você pode usar a sessão de 10 minutos.</p><button class="primary">Salvar minha rotina</button></form>`;
 $('#level').value=p.level;$('#schedule').value=p.schedule;
 $('#routineForm').onsubmit=e=>{e.preventDefault();const days=[...document.querySelectorAll('[name=days]:checked')].map(x=>Number(x.value));if($('#schedule').value==='weekly'&&!days.length){toast('Escolha pelo menos um dia.');return}store.program.profile={level:$('#level').value,schedule:$('#schedule').value,days,minutes:Number($('#minutes').value),workMinutes:Number($('#workMinutes').value),freeMinutes:Number($('#freeMinutes').value),anchor:$('#anchor').value,time:$('#routineTime').value,examDate:$('#examDate').value,updatedAt:new Date().toISOString()};save();location.hash='inicio'};
}
function renderToday(){
 if(!store.program.profile){renderRoutine();return}
 const p=routineProfile(),goal=studyGoalSeconds()/60,done=goal>0&&todayStudySeconds()>=goal*60,due=pendingErrorIds().size,active=store.program.learning;
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return {date:localDay(d),name:d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit'}),minutes:minutesFor(p,d)}});
 const records=store.program.daily||{},completed=records[localDay()]?.blocks||0;
 const recent=Object.entries(records).filter(([d])=>d>=daysAgo(7));
 const adaptation=recent.length>=3&&recent.filter(([,v])=>v.blocks>0).length>=3?'Sua rotina está ganhando consistência. Se estiver confortável, ajuste alguns minutos na próxima semana.':'Se estiver difícil começar, reduza a duração na sua rotina. Retomar hoje já vale.';
 $('#content').innerHTML=`<section class="hero"><div class="eyebrow">SEU ESTUDO DE HOJE</div><h1>${done?'Meta de tempo cumprida.':goal?`Hoje, ${goal} minutos. Um passo de cada vez.`:'Hoje é dia de descanso.'}</h1><p>${done?'Você pode encerrar por hoje. Estudar mais é opcional.':goal?'Entenda um conceito, veja um exemplo e pratique. O plano recomeça a cada dia, sem acumular tarefas atrasadas.':'Se quiser, faça uma sessão curta. Descansar também faz parte da rotina.'}</p><div class="actions"><button id="beginLearning" class="primary">${active?'Retomar meu estudo':done?'Fazer mais um bloco (opcional)':'Começar meu estudo'}</button><button id="shortLearning">Hoje só tenho 10 minutos</button></div><p class="muted">Horário combinado: ${esc(p.time)} · ${completed} bloco(s) concluído(s) hoje</p></section>${studyClockCardHTML()}<section class="card spaced"><h2>Seu próximo passo</h2><ol class="daily-steps"><li>Revisar: ${due?due+' conceito(s) para retomar':'nenhuma revisão vencida'}</li><li>Aprender: explicação e exemplo com resposta comentada</li><li>Praticar: questões sem ajuda e correção</li></ol>${due?'<a class="button secondary" href="#erros">Começar pela revisão</a>':''}<p class="muted">As durações são metas de organização, não garantias de domínio. Se o bloco acabar antes, você decide se continua.</p></section><section class="card spaced"><div class="row"><h2>Próximos 7 dias</h2><a href="#rotina">Ajustar rotina</a></div><div class="week-plan">${days.map(d=>`<div><b>${d.name}</b><span>${d.minutes?d.minutes+' min':'Descanso'}</span></div>`).join('')}</div><p>${adaptation}</p>${p.examDate?`<p>Prova informada: ${esc(p.examDate.split('-').reverse().join('/'))}. ${Math.max(0,Math.ceil((new Date(p.examDate+'T12:00:00')-new Date())/86400000))} dias restantes. <a href="#simulados">Treinar com tempo de prova</a></p>`:''}</section><div class="actions spaced"><a href="#estudar">Estudar por assunto</a><a href="#conteudos">57 questões de MT comentadas</a><a href="#provas">Provas e fontes</a><a href="#mais">Configurações e backup</a></div>`;
 $('#beginLearning').onclick=()=>{if(active)location.hash='estudar';else if(due)location.hash='erros';else beginLearning()};
 $('#shortLearning').onclick=()=>{store.program.shortDay=localDay();save();if(!active)beginLearning(10);else location.hash='estudar'};syncStudyClockUI();
}
function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return localDay(d)}
function beginLearning(minutes=Math.min(25,Math.max(5,Math.ceil(studyRemaining()/60)||10)),subject=''){
 const candidates=bank().filter(q=>!q.historicalOnly&&q.displayMode!=='source-pdf'&&(!subject||q.subject===subject));
 const qs=selectLearningQuestions(candidates,store.attempts,Math.max(2,Math.min(8,Math.ceil(minutes/4)+1)));
 if(!qs.length){toast('Não há questões disponíveis para este assunto.');return}
 store.program.learning={ids:qs.map(q=>q.id),index:0,phase:routineProfile().level==='practice'?'practice':'learn',startedAt:new Date().toISOString(),answers:[],selected:null};save();noteStudyActivity();studyTracker.paused=false;location.hash='estudar';if(tab==='estudar')renderLearn();
}
function renderLearn(){
 const l=store.program.learning;
 if(!l){$('#content').innerHTML=title('Aprender e praticar.','Escolha uma matéria do último edital ou deixe o plano indicar o próximo assunto.')+`<div class="notice"><b>Foco SEJUDH/MT 2016/2017.</b> O treino ativo mostra apenas as 9 áreas cobradas no último edital. Matérias extras de outros concursos ficam fora do plano até sair um novo edital.</div><a class="button secondary" href="#conteudos">Ler explicações de Mato Grosso</a><button id="learnSuggested" class="primary">Começar bloco recomendado</button><div class="subject-grid spaced">${subjects().map(s=>`<section class="card"><h2>${esc(s)}</h2><p class="muted">Explicação disponível, exemplo e prática com correção.</p><button data-learn-subject="${esc(s)}">Estudar esta matéria</button></section>`).join('')}</div><p class="muted">Os comentários do acervo variam em profundidade. O app não substitui um curso completo; as fontes da prova ficam acessíveis em cada questão.</p>`;$('#learnSuggested').onclick=()=>beginLearning();document.querySelectorAll('[data-learn-subject]').forEach(b=>b.onclick=()=>beginLearning(20,b.dataset.learnSubject));return}
 const q=bank().find(q=>q.id===l.ids[l.index]);if(!q||q.historicalOnly){delete store.program.learning;save();renderLearn();return}
 const learner=l.phase==='learn',corrected=l.phase==='feedback',learningStrikeKey=`learning:${q.id}`,learningStrikes=manualStrikes(learningStrikeKey);
 $('#content').innerHTML=`<section class="learning-session"><div class="row"><h1>${learner?'Entenda antes de responder':corrected?'Entenda sua resposta':'Agora é com você'}</h1><span class="tag">${l.index+1}/${l.ids.length}</span></div><p class="muted">${esc(q.subject)} · ${esc(q.topic)}</p>${learner?`<article class="card"><h2>Orientação para este assunto</h2><p>${microLesson(q)}</p><p class="muted">Leia o conceito e examine o exemplo. Depois explique a regra com suas palavras.</p><details><summary>Ver exemplo resolvido</summary>${supportHTML(q)}<p>${esc(q.statement)}</p><p><b>Resposta: ${esc(q.options[q.answer])}</b></p>${explanationHTML(q)}</details><label class="spaced">Explique para você: o que diferencia a resposta correta?<textarea id="recall" rows="3" placeholder="Tente explicar com suas palavras. Este rascunho não é uma avaliação automática.">${esc(l.note||'')}</textarea></label><button id="learnNext" class="primary">Continuar para a prática</button></article>`:`<article class="card question">${supportHTML(q)}<p class="statement">${esc(q.statement)}</p>${originalHTML(q)}<div class="options">${q.options.map((o,i)=>{const struck=!corrected&&learningStrikes.includes(i);return `<div data-learning-answer="${i}" data-strike-index="${i}" data-strike-key="${esc(learningStrikeKey)}" role="button" tabindex="${corrected?'-1':'0'}" aria-disabled="${corrected}" class="option ${struck?'struck':''} ${corrected?(i===q.answer?'correct':l.selected===i?'wrong':''):l.selected===i?'selected':''}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!corrected?'<p class="strike-hint">Deslize a alternativa para o lado para riscar. Deslize novamente para desfazer.</p>':''}${corrected?`<div class="feedback ${l.selected===q.answer?'':'bad'}"><b>${l.selected===q.answer?'Resposta correta':'Vamos entender o erro'}</b>${explanationHTML(q)}<p><b>Alternativa correta:</b> ${esc(q.options[q.answer])}</p><p>Compare sua escolha com a regra e explique qual detalhe mudou a resposta.</p></div><label>Como foi responder?<select id="learningReason"><option value="">Selecione, se quiser</option><option value="chute">Chutei / fiquei em dúvida</option><option value="conteudo">Não sabia o conteúdo</option><option value="interpretacao">Passei batido no enunciado</option><option value="duvida">Confundi conceitos</option></select></label><button id="learnNext" class="primary">${l.index+1>=l.ids.length?'Concluir bloco':'Próxima questão'}</button>`:''}</article>`}<div class="actions spaced"><button id="leaveLearning">Pausar e voltar depois</button>${q.source?`<a href="${esc(q.source.examUrl)}" target="_blank" rel="noopener noreferrer">Consultar prova original</a>`:''}</div></section>`;
 $('#leaveLearning').onclick=()=>{studyTracker.paused=true;save();location.hash='inicio'};
 $('#recall')?.addEventListener('input',e=>{l.note=e.target.value;persistStudyLocal()});
 document.querySelectorAll('[data-learning-answer]').forEach(b=>{
  const activate=()=>{
   if(corrected||b.getAttribute('aria-disabled')==='true'||b.classList.contains('struck'))return;
   l.selected=Number(b.dataset.learningAnswer);
   const a={id:q.id,selected:l.selected,correct:l.selected===q.answer,at:new Date().toISOString(),mode:'learning',assists:l.exampleId===q.id?['worked-example']:[]};
   store.attempts.push(a);l.answers.push(a);l.phase='feedback';save();renderLearn();
  };
  b.onclick=e=>{e.preventDefault();activate()};
  b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
 $('#learningReason')?.addEventListener('change',e=>{const a=lastAttemptFor(q.id);if(a){a.reason=e.target.value;a.guessed=e.target.value==='chute';save()}});
 $('#learnNext')?.addEventListener('click',()=>{if(learner){l.exampleId=q.id;l.phase='practice';if(l.ids.length>1)l.index=1;else toast('Só há este exemplo no bloco. A repetição será registrada como prática assistida.')}else l.index++;l.selected=null;if(l.index>=l.ids.length){store.program.daily||={};const d=store.program.daily[localDay()]||{blocks:0};d.blocks++;store.program.daily[localDay()]=d;delete store.program.learning;save();location.hash='inicio';toast('Bloco concluído. Seu próximo passo está no plano de hoje.')}else{l.phase='practice';save();renderLearn()}});
}
function renderLearningProgress(){
 const activeIds=new Set(bank().filter(q=>!q.historicalOnly).map(q=>q.id)),m=learningMetrics(store.attempts.filter(a=>activeIds.has(a.id))),records=store.program.daily||{},days=Object.entries(records).filter(([d])=>d>=daysAgo(6)),blocks=days.reduce((n,[,v])=>n+v.blocks,0),reviews=Object.values(store.program.reviews||{});
 $('#content').innerHTML=title('Progresso que dá para conferir.','Tempo e quantidade mostram atividade. Aprendizado precisa aparecer em respostas novas e revisões posteriores.')+`<div class="stats">${[['Blocos nos últimos 7 dias',blocks],['Questões novas sem ajuda',m.newRate===null?'Sem dados':m.newRate+'%'],['Revisões posteriores',m.retentionRate===null?'Sem dados':m.retentionRate+'%'],['Questões diferentes vistas',m.seen]].map(([t,v])=>`<section class="stat"><small>${t}</small><strong>${v}</strong></section>`).join('')}</div><p class="muted">Itens sinalizados como históricos não entram nestes indicadores. Amostra: ${m.newCount} primeiras respostas sem ajuda ou chute; ${m.retentionCount} testes posteriores. Amostras pequenas não comprovam domínio.</p>${studyClockCardHTML()}<section class="card spaced"><h2>Cobertura do acervo</h2><p>${m.seen} de ${bank().length} questões vistas. Isso não representa percentual do edital nem chance de aprovação.</p>${progress()}</section><section class="card spaced"><h2>Revisões programadas</h2><p>${pendingErrorIds().size} pendentes hoje · ${reviews.filter(r=>Date.parse(r.dueAt)>Date.now()).length} para os próximos dias.</p><a href="#erros">Abrir revisão</a></section><section class="card spaced"><h2>Últimos simulados</h2>${store.sessions.length?store.sessions.slice(-8).reverse().map(s=>`<p>${new Date(s.at).toLocaleDateString('pt-BR')} · ${s.correct}/${s.total} acertos</p>`).join(''):'<p>Ainda não há simulados concluídos.</p>'}</section><div class="actions spaced"><a href="#rotina">Ajustar minha rotina</a><a href="#dados">Backup do progresso</a></div>`;syncStudyClockUI();
}
$('#studyClockMini').onclick=()=>{studyTracker.paused=studyEligible();if(!studyTracker.paused)noteStudyActivity();syncStudyClockUI();toast(studyTracker.paused?'Cronômetro pausado.':'Cronômetro pronto. Abra uma sessão de estudo para contar.');};

function historicalNotice(q){return q.historicalOnly?`<aside class="lesson-notice" role="note"><b>Questão histórica com ressalva</b><p>${esc(q.lesson?.note||'Consulte a explicação antes de aplicar o gabarito a uma prova atual.')}</p><small>O gabarito oficial foi preservado. Este item não entra no treino automático de MT.</small></aside>`:''}
function explanationHTML(q){
 const l=q.lesson;if(!l)return `<p>${esc(q.explanation)}</p>`;
 return `<section class="deep-explanation" aria-label="Explicação comentada">${historicalNotice(q)}<h3>Entenda o conceito</h3><p>${esc(l.concept)}</p><h3>Como chegar à resposta</h3><p>${esc(l.reasoning)}</p><details class="lesson-alternatives"><summary>Por que cada alternativa está certa ou errada?</summary><ol class="alternative-reasons">${l.alternatives.map((text,i)=>`<li><b>${String.fromCharCode(65+i)}${i===q.answer?' · gabarito oficial':''}</b><p>${esc(text)}</p></li>`).join('')}</ol></details><h3>Exemplo para entender</h3><p>${esc(l.example)}</p><div class="recall-card"><b>Antes de seguir, tente lembrar</b><p>${esc(l.recall.prompt)}</p><details><summary>Conferir a ideia principal</summary><p>${esc(l.recall.answer)}</p><small>Esta conferência não marca domínio nem gera acerto automaticamente.</small></details></div>${l.note&&!q.historicalOnly?`<p class="lesson-notice"><b>Ressalva:</b> ${esc(l.note)}</p>`:''}<details class="lesson-sources"><summary>Fontes e conferência · ${esc(l.checkedAt.split('-').reverse().join('/'))}</summary><ul>${l.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join('')}</ul><p class="muted">${esc(l.authorship)} A data registra esta conferência, não uma garantia de atualização permanente.</p></details></section>`;
}
function renderLessonLibrary(){
 const questions=MT_QUESTIONS,restricted=questions.filter(q=>q.historicalOnly).length;
 $('#content').innerHTML=title('Mato Grosso, questão por questão.','57 comentários com conceito, raciocínio, alternativas, exemplo e recuperação da memória.')+`<section class="card"><p>${questions.length-restricted} itens com explicação no treino · ${restricted} itens reservados ao acervo histórico com ressalvas.</p><label>Buscar assunto ou número da questão<input id="lessonSearch" type="search" placeholder="Ex.: tortura, crase, 51"></label><p class="muted">Comentários didáticos com assistência de IA e fontes indicadas. Não são justificativas oficiais da banca nem substituem revisão docente independente.</p></section><div id="lessonResults"></div>`;
 const update=()=>{const term=$('#lessonSearch').value.trim().toLocaleLowerCase('pt-BR'),qs=questions.filter(q=>!term||q.source.number===term||`${q.topic} ${q.subject} ${q.lesson.concept}`.toLocaleLowerCase('pt-BR').includes(term));$('#lessonResults').innerHTML=qs.length?qs.map(q=>`<details class="card spaced lesson-library-item"><summary><b>Questão ${q.source.number} · ${esc(q.topic)}</b><span>${esc(q.subject)}${q.historicalOnly?' · Com ressalva':''}</span></summary><p class="statement">${esc(q.statement)}</p><ol type="A">${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol><p><b>Gabarito oficial: ${String.fromCharCode(65+q.answer)}</b></p>${explanationHTML(q)}</details>`).join(''):'<p class="muted">Nenhum comentário encontrado.</p>'};$('#lessonSearch').oninput=update;update();
}
