import {renderMembership} from './planos/account.js?v=2.17.0';
import {loginWithGoogle,studyQuota,takeGoogleReturn} from './account-services.js?v=2.17.0';
import {performanceSummary} from './performance.js?v=2.15.0';
import {freeTrainingPool,createFreeTraining,nextFreeQuestion,freeTrainingSummary} from './free-training.js?v=2.15.0';
import {loadNewsFeed,newsPageHTML,newsItemsHTML} from './concurso-news.js?v=2.15.0';
import {createProgressSync} from './offline.js?v=47';
import {EDITAL_SOURCE,EDITAL_TOPICS,questionTopicIds,syllabusCoverage} from './syllabus.js?v=2.15.0';
import {AUTHORIAL_MT_QUESTIONS} from './authorial-mt.js?v=2.15.0';
import {createAnswerSounds} from './answer-sounds.js?v=45';
import {packExam,restoreExam} from './exam-session.js?v=2.17.0';
import {CONCEPT_PRACTICE} from './practice.js?v=44';
import {enrichConcept,compatibleWithMT,chooseConceptBlock,dailyStudyPlan,conceptProgress} from './curriculum.js?v=2.15.0';
import {createReviewExercise} from './review-generator.js?v=47';
import {minutesFor,dueReviews,nextReview,scheduleCorrectReviews,learningMetrics,selectLearningQuestions} from './learning.js?v=47';
import {IMPORTED_EXAMS} from './imported-exams.js?v=15';
import {QUESTIONS} from './data.js?v=15';
import {MT_EXAM,MT_QUESTIONS,OFFICIAL_QUESTIONS} from './official.js?v=27';
import {EXAM_SOURCES,SOURCE_TOTAL,IMPORTED_SOURCE_TOTAL} from './exam-sources.js?v=15';
const BUILTIN=[...OFFICIAL_QUESTIONS.filter(q=>q.displayMode!=='source-pdf'),...QUESTIONS,...CONCEPT_PRACTICE,...AUTHORIAL_MT_QUESTIONS];
const PENDING_OFFICIAL=OFFICIAL_QUESTIONS.filter(q=>q.displayMode==='source-pdf');
import {validateBank,shuffle,latestErrors,summary} from './core.js?v=15';
import {getCurrentUser,verifiedUser,signIn,signUp,signOut,loadUserState,saveUserState} from './auth.js?v=2.15.0';
import {questionCommand,trapWords,microLesson,findSimilar} from './help.js?v=2.15.0';
const $=s=>document.querySelector(s), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const APP_VERSION='2.17.0';
queueMicrotask(()=>{document.querySelectorAll('.app-version-badge').forEach(el=>{el.textContent='V '+APP_VERSION;el.title='JavaScript '+APP_VERSION+' carregado'})});
const KEY='ppmt-v2';
const emptyStore=()=>({attempts:[],favorites:[],custom:[],sessions:[],program:null});
let store=emptyStore(),currentUser=null,legacyStore=null;
const answerSounds=createAnswerSounds({enabled:()=>!!currentUser&&store.program?.answerSound!==false});
try{const raw=localStorage.getItem(KEY);if(raw){const s=JSON.parse(raw);if(validStore(s))legacyStore=s}}catch{}
function validStore(s){try{return !!(s&&Array.isArray(s.attempts)&&Array.isArray(s.favorites)&&Array.isArray(s.sessions)&&Array.isArray(s.custom)&&(validateBank(s.custom)||true))}catch{return false}}
function normalizeStore(s){return validStore(s)?{...emptyStore(),...s,program:s.program||null}:emptyStore()}
function userKey(id=currentUser?.id){return id?`${KEY}:${id}`:KEY}
function localDay(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function ensureProgram(){if(!store.program||typeof store.program!=='object')store.program={startDate:localDay(),completed:{},xp:0};if(!store.program.startDate)store.program.startDate=localDay();if(!store.program.completed)store.program.completed={};if(!Number.isFinite(store.program.xp))store.program.xp=0;if(!store.program.studySeconds||typeof store.program.studySeconds!=='object')store.program.studySeconds={};if(!Number.isFinite(store.program.dailyGoalMinutes)||store.program.dailyGoalMinutes<5)store.program.dailyGoalMinutes=20;if(!store.program.reviewMastered||typeof store.program.reviewMastered!=='object')store.program.reviewMastered={}}
let quotaSnapshot=null,quotaChecking=false;
function quotaBadge(){
 if(!quotaSnapshot)return '';
 const q=quotaSnapshot;
 return q.premium
  ? '<div class="study-quota-banner is-premium"><strong>✦ PREMIUM · SEM LIMITES</strong><span>Questões e simulados ilimitados</span><a href="#plano">Meu plano ↗</a></div>'
  : '<div class="study-quota-banner"><strong>GRÁTIS · COTA DE ESTUDOS</strong><span>'+
    Math.max(0,Number(q.daily_remaining)||0)+' de 20 questões hoje · '+
    Math.max(0,Number(q.weekly_exams_remaining)||0)+' de 1 simulado nesta semana</span><a href="#plano">Liberar Premium ↗</a></div>';
}
function showQuotaBadge(){
 const parent=document.querySelector('#content');
 if(!parent)return;
 parent.querySelector('.study-quota-banner')?.remove();
 if(quotaSnapshot)parent.insertAdjacentHTML('afterbegin',quotaBadge());
}
async function refreshStudyQuota(){
 if(!currentUser)return;
 try{quotaSnapshot=await studyQuota('status');if(tab!=='plano')showQuotaBadge();}
 catch{quotaSnapshot=null;}
}
async function allowStudy(kind='question',units=1){
 if(quotaChecking)return false;
 quotaChecking=true;
 try{
  const response=await studyQuota(kind,units);
  quotaSnapshot=response;
  if(tab!=='plano')showQuotaBadge();
  if(response.allowed)return true;
  const type=kind==='exam'&&Number(response.weekly_exams_remaining)===0
   ?'Você já utilizou seu simulado gratuito nesta semana.'
   :'Você atingiu o limite de 20 questões gratuitas neste dia, ou o bloco ultrapassa a cota restante.';
  if(confirm(type+'\\n\\nNo Premium, questões e simulados não têm esse limite. Ver os planos?'))location.hash='plano';
  else toast(type);
  return false;
 }catch{
  toast('Conecte-se à internet para registrar o treino. Nenhuma questão foi descontada.');
  return false;
 }finally{quotaChecking=false;}
}
let tab='inicio',filter={search:'',subject:'',kind:'prova',exam:''},index=0,selection=null,answered=false,queue=[],run=null,examResult=null,assistState=Object.create(null),strikeState=Object.create(null),deferredInstallPrompt=null,reviewState=null;const studyTracker={lastActivity:Date.now(),lastTick:Date.now(),localFlush:0,cloudFlush:0};
const pages=[['inicio','⌂','Hoje'],['estudar','▦','Estudar'],['erros','↺','Revisar'],['simulados','◷','Simulado'],['desempenho','▥','Progresso'],['edital','▤','Cobertura do edital'],['noticias','◉','Notícias do concurso'],['livre','▷','Treino livre'],['rotina','⚙','Minha rotina'],['conteudos','▤','Comentários MT'],['provas','▧','Provas'],['mais','☰','Mais'],['materias','▦','Matérias'],['questoes','▤','Banco'],['favoritos','☆','Favoritos'],['plano','◇','Meu plano'],['dados','⚙','Meus dados']];
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
const rawBank=()=>[...BUILTIN,...store.custom].map(normalizedSubject).map(enrichConcept);
const bank=()=>rawBank().filter(q=>isLastEditalQuestion(q)&&compatibleWithMT(q));
let syncStatus='saved';
const progressSync=createProgressSync({storage:localStorage,write:saveUserState,verify:verifiedUser,onStatus:(id,status)=>{if(id===currentUser?.id){syncStatus=status;syncConnectionUI()}}});
function syncConnectionUI(){const el=$('#connectionStatus');if(!el)return;el.hidden=!currentUser;const offline=navigator.onLine===false;el.textContent=offline?'Offline · salvo no aparelho':({saved:'Progresso sincronizado',pending:'Salvo no aparelho · sincronização pendente',syncing:'Sincronizando progresso…',login:'Salvo no aparelho · entre novamente para sincronizar',offline:'Offline · salvo no aparelho'})[syncStatus];el.dataset.status=offline?'offline':syncStatus;}
window.addEventListener('offline',syncConnectionUI);
window.addEventListener('online',()=>{if(currentUser)save();syncConnectionUI()});
function save(){if(!currentUser)return false;try{ensureProgram();store.program.reviews=scheduleCorrectReviews(store.attempts,store.program.reviews||{});store.updatedAt=new Date().toISOString();localStorage.setItem(userKey(),JSON.stringify(store));progressSync.queue(currentUser.id,store);syncConnectionUI();return true}catch{toast('Não foi possível salvar neste navegador. Exporte um backup.');return false}}
function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',4200)}
function accountUI(){syncConnectionUI();const el=$('#account');if(!el)return;if(!currentUser){el.innerHTML='';return}el.innerHTML=`<span class="account-email">${esc(currentUser.email||'Usuário')}</span><button id="logout" class="account-logout">Sair</button>`;$('#logout').onclick=async()=>{if(!confirm('Sair da sua conta?'))return;try{await signOut();currentUser=null;store=emptyStore();renderAuth()}catch(e){toast(e.message||'Não foi possível sair.')}}}
async function loadAccount(user){run=null;reviewState=null;assistState=Object.create(null);strikeState=Object.create(null);currentUser=user;let cloud=null;try{cloud=await loadUserState(user.id)}catch{toast('Não foi possível carregar seus dados da nuvem.')}
 let local=null;try{const raw=localStorage.getItem(userKey(user.id));if(raw){const parsed=JSON.parse(raw);if(validStore(parsed))local=parsed}}catch{}
 if(local&&(progressSync.pending(user.id)||!cloud||Date.parse(local.updatedAt||0)>Date.parse(cloud.updatedAt||0)))store=normalizeStore(local);
 else if(cloud&&validStore(cloud))store=normalizeStore(cloud);
 else if(local)store=normalizeStore(local);
 else if(legacyStore){store=normalizeStore(legacyStore);localStorage.removeItem(KEY);legacyStore=null}
 else store=emptyStore();
 ensureProgram();const restoredExam=restoreExam(store.program.activeExam,rawBank());run=location.hash.slice(1)===(restoredExam?.originTab||'simulados')?restoredExam:null;accountUI();save();navigate();void refreshStudyQuota()}
function renderAuth(){currentUser=null;syncConnectionUI();$('#nav').innerHTML='';accountUI();const c=$('#content');c.innerHTML=`<section class="auth-shell"><div class="auth-card"><img src="./icon.svg" alt="PP MT" class="auth-logo"><div class="eyebrow">PP MT • ACESSO DO CANDIDATO</div><h1>Seu progresso é só seu.</h1><p class="muted"><a href="./planos/">Conheça o PPMT e os planos →</a></p><p class="muted">Seu plano diário, revisões e progresso ficam vinculados à sua conta.</p><div class="auth-tabs"><button id="loginTab" class="active">Entrar</button><button id="signupTab">Criar conta</button></div><form id="authForm"><label>E-mail<input id="authEmail" type="email" autocomplete="email" required placeholder="seuemail@exemplo.com"></label><label>Senha<input id="authPassword" type="password" autocomplete="current-password" minlength="6" required placeholder="Mínimo 6 caracteres"></label><button class="primary auth-submit" type="submit">Entrar</button></form><div class="oauth-divider"><span>ou continue com</span></div><button type="button" class="google-login-btn" id="googleSignIn"><svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.5c0-1.6-.2-3.2-.4-4.7H24v9h12.7c-.6 2.9-2.2 5.4-4.7 7l7.4 5.8C43.7 37.5 46.9 31.7 46.9 24.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.3 0 11.6-2.1 15.4-5.7L32 36.5c-2.1 1.4-4.7 2.2-8 2.2-6.3 0-11.6-4.1-13.5-9.7l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>Entrar com Google</span></button><p id="authHint" class="muted auth-hint">${navigator.onLine===false?'Conecte-se à internet para entrar pela primeira vez neste aparelho.':'Use seu e-mail e senha para continuar.'}</p></div></section>`;
 let mode='login';const setMode=m=>{mode=m;$('#loginTab').classList.toggle('active',m==='login');$('#signupTab').classList.toggle('active',m==='signup');$('.auth-submit').textContent=m==='login'?'Entrar':'Criar conta';$('#authPassword').autocomplete=m==='login'?'current-password':'new-password';$('#authHint').textContent=m==='login'?'Use seu e-mail e senha para continuar.':'Crie uma conta. Se a confirmação de e-mail estiver ativa, você receberá uma mensagem para confirmar.'};$('#loginTab').onclick=()=>setMode('login');$('#signupTab').onclick=()=>setMode('signup');if(new URLSearchParams(location.search).get('cadastro')==='1')setMode('signup');
 $('#authForm').onsubmit=async e=>{e.preventDefault();const email=$('#authEmail').value.trim(),password=$('#authPassword').value,btn=$('.auth-submit');btn.disabled=true;btn.textContent='Aguarde...';try{if(mode==='login'){const user=await signIn(email,password);await loadAccount(user)}else{const data=await signUp(email,password);if(data.session&&data.user){await loadAccount(data.user)}else{setMode('login');$('#authHint').textContent='Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre.'}}}catch(err){$('#authHint').textContent=err.message||'Não foi possível autenticar.'}finally{btn.disabled=false;btn.textContent=mode==='login'?'Entrar':'Criar conta'}}
 const googleBtn=$('#googleSignIn');
 googleBtn.onclick=async()=>{googleBtn.disabled=true;$('#authHint').textContent='Abrindo login seguro do Google…';
  try{await loginWithGoogle();}
  catch(e){googleBtn.disabled=false;$('#authHint').textContent=e?.message||'Não foi possível acessar o Google. Tente entrar com e-mail e senha.';}
 };
}
async function bootstrap(){
 const user=await getCurrentUser();
 if(user){
  const destination=takeGoogleReturn();
  if(destination&&location.pathname!==destination){location.replace(location.origin+destination);return;}
  await loadAccount(user);
 }else renderAuth();
}
function title(t,d){return `<h1>${t}</h1><p class="muted">${d}</p>`}
function todayStudySeconds(){ensureProgram();return Math.max(0,Number(store.program.studySeconds[localDay()])||0)}
function studyGoalSeconds(){ensureProgram();return (store.program.shortDay===localDay()?10:minutesFor(store.program.profile))*60}
function formatStudyTime(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function formatStudyShort(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60);return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m} min`}
function studyRemaining(){return Math.max(0,studyGoalSeconds()-todayStudySeconds())}
function studyPct(){return Math.min(100,Math.round(todayStudySeconds()/Math.max(1,studyGoalSeconds())*100))}
function noteStudyActivity(){studyTracker.lastActivity=Date.now()}
function studyEligible(){return !!(currentUser&&document.visibilityState==='visible'&&document.querySelector('.question, .learning-session')&&!studyTracker.paused&&Date.now()-studyTracker.lastActivity<180000)}
function persistStudyLocal(){if(!currentUser)return;try{store.updatedAt=new Date().toISOString();localStorage.setItem(userKey(),JSON.stringify(store));localStorage.setItem(`ppmt-sync:${currentUser.id}`,JSON.stringify(store))}catch{}}
function syncStudyClockUI(){const sec=todayStudySeconds(),pct=studyPct(),rem=studyRemaining();document.querySelectorAll('[data-study-time]').forEach(x=>x.textContent=formatStudyTime(sec));document.querySelectorAll('[data-study-progress]').forEach(x=>x.style.width=pct+'%');document.querySelectorAll('[data-study-percent]').forEach(x=>x.textContent=pct+'%');document.querySelectorAll('[data-study-remaining]').forEach(x=>x.textContent=rem?formatStudyShort(rem)+' restantes':studyGoalSeconds()?'meta concluída':'estudo opcional');const mini=$('#studyClockMini');if(mini){mini.textContent='⏱ '+formatStudyTime(sec)+(studyEligible()?' · Pausar':' · Retomar');mini.classList.toggle('counting',studyEligible())}}
function studyTick(){const now=Date.now(),delta=Math.min(2,Math.max(0,(now-studyTracker.lastTick)/1000));studyTracker.lastTick=now;if(studyEligible()){ensureProgram();store.program.studySeconds[localDay()]=todayStudySeconds()+delta;studyTracker.localFlush+=delta;studyTracker.cloudFlush+=delta;if(studyTracker.localFlush>=15){persistStudyLocal();studyTracker.localFlush=0}if(studyTracker.cloudFlush>=120){save();studyTracker.cloudFlush=0}}syncStudyClockUI()}
['pointerdown','touchstart','keydown','scroll'].forEach(type=>document.addEventListener(type,noteStudyActivity,{passive:true,capture:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){persistStudyLocal();if(studyTracker.cloudFlush>5){save();studyTracker.cloudFlush=0}}else noteStudyActivity()});
setInterval(studyTick,1000);
function studyClockCardHTML(){const sec=todayStudySeconds(),pct=studyPct(),rem=studyRemaining();return `<section class="card study-clock-card"><div class="study-clock-top"><div><span class="eyebrow">TEMPO LÍQUIDO DE ESTUDO</span><h2 data-study-time>${formatStudyTime(sec)}</h2></div><div class="study-goal-badge"><b data-study-percent>${pct}%</b><span>meta de ${formatStudyShort(studyGoalSeconds())}</span></div></div><div class="track study-time-track"><i data-study-progress style="width:${pct}%"></i></div><div class="study-clock-foot"><details><summary>Entenda o cronômetro</summary><p>Conta em estudo ativo. Pausa ao sair do app ou após 3 minutos sem interação. Use o relógio no topo para pausar ou retomar.</p></details><b data-study-remaining>${rem?formatStudyShort(rem)+' restantes':studyGoalSeconds()?'meta concluída':'estudo opcional'}</b></div></section>`}
function postMissionStep(){const rem=Math.ceil(studyRemaining()/60),errors=pendingErrorIds(),weak=weakestSubject(),today=localDay(),extra=store.attempts.filter(a=>localDay(new Date(a.at))===today&&a.mode!=='mission').length,extraSessions=store.sessions.filter(s=>localDay(new Date(s.at))===today&&s.mode!=='missao'&&s.mode!=='mission').length;if(rem<=0)return{key:'done',title:'Estudo do dia concluído',desc:'Você bateu sua meta líquida. Agora encerre o estudo e volte amanhã.',minutes:0,count:0};if(errors.size)return{key:'errors',title:'Agora: revisar seus erros',desc:`Há ${errors.size} questões pendentes para revisar. Corrija isso antes de avançar.`,minutes:Math.min(25,rem),count:Math.min(15,errors.size)};if(extra<20)return{key:'weak',title:'Agora: atacar o ponto fraco',desc:`Faça um bloco em ${weak}, sua matéria com menor desempenho.`,minutes:Math.min(35,rem),count:20,subject:weak};if(!extraSessions)return{key:'mixed',title:'Agora: simulado curto',desc:'Misture matérias e treine em ritmo de prova.',minutes:Math.min(35,rem),count:25};return{key:'weak',title:'Continue no ponto fraco',desc:`Use o tempo restante para reforçar ${weak}.`,minutes:Math.min(35,rem),count:20,subject:weak}}
function postMissionCardHTML(){if(!todayDone())return '';const s=postMissionStep(),done=s.key==='done';return `<section class="card continuation-card ${done?'done':''}"><div class="row"><div><span class="eyebrow">${done?'CARGA DO DIA FECHADA':'SEU PRÓXIMO PASSO'}</span><h2>${esc(s.title)}</h2></div><span class="tag">${done?'✓ COMPLETO':s.minutes+' MIN'}</span></div><p class="muted">${esc(s.desc)}</p>${done?'':`<div class="continuation-facts"><span><b>${s.count}</b> questões</span><span><b>${formatStudyShort(studyRemaining())}</b> faltam na meta</span></div><button id="continueStudy" class="primary">COMEÇAR PRÓXIMO BLOCO →</button>`}</section>`}
async function startRecommendedBlock(){const s=postMissionStep();if(s.key==='done')return;if(s.key==='errors'){tab='erros';reviewState=null;history.replaceState(null,'','#erros');renderErrorReview();return}let qs=[],all=realBank();if(s.key==='weak')qs=all.filter(q=>q.subject===s.subject);else qs=all.slice();if(!qs.length)qs=all.slice();qs=shuffle(qs).slice(0,Math.min(s.count,qs.length));if(!qs.length){toast('Ainda não há questões suficientes para este bloco.');return}if(!await allowStudy('block',qs.length))return;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+Math.max(5,s.minutes)*60000,originTab:'simulados',label:s.title,guided:true,quotaGranted:true};tab='simulados';history.replaceState(null,'','#simulados');showExamQuestion()}
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
 $('#eliminateHelp').onclick=()=>{const candidates=q.options.map((_,i)=>i).filter(i=>i!==q.answer&&i!==selection&&!a.eliminated.includes(i));if(!candidates.length){$('#tacticalContent').innerHTML='<p class="muted">Não há outra alternativa errada disponível para eliminar.</p>';return}if(!spendAssistXP(q,'eliminacao',{repeatable:true}))return;const picked=candidates[0];a.eliminated.push(picked);closeTacticalHelp();if(run)showExamQuestion();else if(tab==='livre')renderFreeTraining();else showQuestion();toast(`Alternativa ${String.fromCharCode(65+picked)} eliminada. -${HELP_COSTS.eliminacao} XP`)};
 function openTacticalHelpRefresh(){const wallet=document.querySelector('.xp-wallet b');if(wallet)wallet.textContent=`${store.program.xp||0} XP`;document.querySelectorAll('.tactical-action').forEach(btn=>{const b=btn.querySelector('small');if(!b)return;const map={termsHelp:'armadilhas',simplifyHelp:'comando',similarHelp:'similar',lessonHelp:'aula60'};const type=map[btn.id];if(type&&assistFor(q.id).used.includes(type))b.textContent='COMPRADO'})}
}
function bindTacticalHelp(q){const b=$('#tacticalHelp');if(b)b.onclick=()=>{openTacticalHelp(q)};document.querySelectorAll('[data-error-reason]').forEach(btn=>btn.onclick=()=>{const last=[...store.attempts].reverse().find(a=>a.id===q.id);if(!last)return;last.reason=btn.dataset.errorReason;save();document.querySelectorAll('[data-error-reason]').forEach(x=>x.classList.toggle('selected-reason',x===btn));toast('Motivo do erro registrado. Isso vai ajudar o app a ajustar seus treinos.')})}
function lastAttemptFor(id){for(let i=store.attempts.length-1;i>=0;i--)if(store.attempts[i].id===id)return store.attempts[i];return null}
function pendingErrorIds(){ensureProgram();const active=new Set(bank().filter(q=>!q.historicalOnly).map(q=>q.id));return new Set(dueReviews(store.attempts,store.program.reviews||{}).filter(id=>active.has(id)))}
function markErrorMastered(id,correct=true){ensureProgram();store.program.reviews||={};store.program.reviews[id]=nextReview(store.program.reviews[id],correct);save()}
function errorReasonLabel(reason){return({conteudo:'Não sabia o conteúdo',interpretacao:'Interpretei errado',duvida:'Fiquei entre duas',chute:'Chutei'})[reason]||'Motivo não registrado'}
function reviewLearnHTML(q,pos,total){const last=lastAttemptFor(q.id);return `<section class="card question review-learning-card"><div class="meta">Revisão ${pos+1} de ${total} · ${esc(q.subject)}</div><h2>${esc(q.topic)}</h2><p>${microLesson(q)}</p><details class="spaced"><summary>Ver a questão e minha resposta anterior</summary>${supportHTML(q)}<p>${esc(q.statement)}</p><p><b>Você marcou:</b> ${esc(q.options[last?.selected]||'Não respondida')}</p><p><b>Resposta correta:</b> ${esc(q.options[q.answer])}</p></details><details class="spaced"><summary>Entender melhor: explicação, exemplo e fontes</summary>${explanationHTML(q)}</details><p id="reviewInstruction" class="muted spaced"></p><button id="reviewTransfer" class="primary">Continuar revisão</button></section>`}
function reviewTransferHTML(original,q,pos,total){const rs=reviewState,chosen=rs.selected,done=rs.answered,key=`review-transfer:${q.id}`,strikes=manualStrikes(key);return `<section class="card question review-transfer-card"><div class="review-stage"><span>REVISÃO ATIVA</span><b>2/2 · TRANSFERIR O CONCEITO</b></div><div class="meta">${esc(q.subject)} / ${esc(q.topic)} • erro ${pos+1} de ${total}</div><h1>Agora prove que aprendeu em uma questão diferente.</h1><p class="statement">${esc(q.statement)}</p>${supportHTML(q)}<div class="options review-options">${q.options.map((o,i)=>{const struck=!done&&strikes.includes(i),cls=done?(i===q.answer?'correct':i===chosen&&chosen!==q.answer?'wrong':''):(i===chosen?'selected':'');return `<div class="option ${struck?'struck':''} ${cls}" data-review-option="${i}" data-strike-index="${i}" data-strike-key="${esc(key)}" role="button" tabindex="${done?'-1':'0'}" aria-disabled="${done}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!done?'<p class="strike-hint">Deslize a alternativa para o lado para riscar. Deslize novamente para desfazer.</p>':''}${done?`<div class="review-transfer-result ${chosen===q.answer?'ok':'bad'}"><b>${chosen===q.answer?'Conceito confirmado.':'Ainda não consolidou.'}</b>${explanationHTML(q)}${chosen===q.answer?'<p>Revisão agendada para outro dia; um acerto não comprova retenção.</p>':'<p>O erro continua na sua fila. Volte ao conceito e tente novamente depois.</p>'}</div>`:''}<div class="actions spaced">${done&&chosen===q.answer?'<button id="nextReview" class="primary">PRÓXIMO ERRO →</button>':done?'<button id="backToLesson" class="primary">REVER O CONCEITO →</button>':'<span class="muted">Marque uma alternativa para conferir na hora.</span>'}</div></section>`}
function todayReviewIds(){const done=store.program.reviewedToday?.day===localDay()?new Set(store.program.reviewedToday.ids):new Set();return [...pendingErrorIds()].filter(id=>!done.has(id))}
function initReviewState(){const plan=dailyStudyPlan(bank(),store.attempts,todayReviewIds(),Math.max(10,Math.ceil(studyRemaining()/60)));reviewState={ids:plan.reviewIds,index:0,originalId:null}}
function advanceReview(){if(store.program.reviewedToday?.day!==localDay())store.program.reviewedToday={day:localDay(),ids:[]};store.program.reviewedToday.ids.push(reviewState.originalId);save();reviewState.index++;reviewState.originalId=null;renderErrorReview();window.scrollTo({top:0,behavior:'auto'})}
function renderErrorReview(){
 const all=bank().filter(q=>!q.historicalOnly);
 if(!reviewState?.ids)initReviewState();
 const r=reviewState;
 while(r.index<r.ids.length&&!all.some(q=>q.id===r.ids[r.index]))r.index++;
 if(r.index>=r.ids.length){$('#content').innerHTML=title('Revisão concluída.',`${r.ids.length} itens percorridos. Erros, chutes e acertos voltam em outros dias para testar a retenção.`)+'<a class="button primary" href="#inicio">Voltar ao plano</a>';return}
 if(!r.originalId){r.originalId=r.ids[r.index];const prior=lastAttemptFor(r.originalId);r.retention=!!store.program.reviews?.[r.originalId]||!!(prior?.correct&&!prior.guessed);r.phase=r.retention?'test':'learn';r.selected=null;r.answered=false;r.exercise=null}
 const q=all.find(q=>q.id===r.originalId),similar=findSimilar(q,all,[...store.attempts,...(store.program.generatedReviews||[])]);
 if(!r.exercise)r.exercise=similar||createReviewExercise(q,Math.random,store.program.generatedReviews||[]);
 const test=r.exercise;
 const nextLabel=r.index+1<r.ids.length?'Próxima revisão':'Concluir revisão';
 if(r.phase==='learn'){
  $('#content').innerHTML=title('Revisar um ponto por vez.','Leia a ideia principal. Abra os detalhes se precisar.')+reviewLearnHTML(q,r.index,r.ids.length);
  $('#reviewInstruction').textContent=similar?'Depois da leitura, tente uma questão relacionada.':'Depois da leitura, responda uma variação criada pelo app a partir desta questão. Você vai avaliar a escolha de outro estudante.';
  $('#reviewTransfer').textContent='Responder questão de revisão';
  $('#reviewTransfer').onclick=()=>{r.phase='test';renderErrorReview();window.scrollTo({top:0,behavior:'auto'})};return;
 }
 const reviewStrikeKey=`review:${test.id}`,reviewStrikes=manualStrikes(reviewStrikeKey);
 $('#content').innerHTML=title(`Revisão ${r.index+1} de ${r.ids.length}`,similar?'Questão relacionada por matéria e assunto; a correspondência é aproximada.':'Treino criado pelo app · variação da questão-base, com o mesmo contexto e gabarito. Não é uma questão oficial nova.')+`<section class="card question">${supportHTML(test.generated?q:test)}<p class="statement">${esc(test.statement)}</p>${originalHTML(test.generated?q:test)}<div class="options">${test.options.map((o,i)=>{const struck=!r.answered&&reviewStrikes.includes(i);return `<div class="option ${struck?'struck':''} ${r.answered?(i===test.answer?'correct':i===r.selected?'wrong':''):''}" data-review-answer="${i}" data-strike-key="${esc(reviewStrikeKey)}" role="button" tabindex="${r.answered?'-1':'0'}" aria-label="Alternativa ${String.fromCharCode(65+i)}${struck?', riscada':''}" aria-disabled="${r.answered}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!r.answered?'<p class="strike-hint">Deslize a alternativa para o lado. Ao soltar, ela será riscada; deslize novamente para desfazer.</p>':''}${r.answered?`<div class="feedback"><b>${r.selected===test.answer?'Acertou.':'Vamos reforçar este ponto.'}</b><p>Próxima revisão: ${new Date(store.program.reviews[q.id].dueAt).toLocaleDateString('pt-BR')}.</p><button id="reviewNext" class="primary">${nextLabel}</button><details class="spaced"><summary>Entender a resposta</summary>${explanationHTML(test)}</details></div>`:'<p class="muted">Responda antes de consultar a explicação.</p>'}</section>`;
 document.querySelectorAll('[data-review-answer]').forEach(btn=>{
  const idx=()=>Number(btn.dataset.reviewAnswer);
  const activate=async()=>{
   if(r.answered||btn.getAttribute('aria-disabled')==='true'||btn.classList.contains('struck'))return;
   if(!await allowStudy('question',1))return;
   r.selected=idx();r.answered=true;
   const correct=r.selected===test.answer;answerSounds.play(correct);
   if(test.generated||test.practiceKind==='application'){store.program.generatedReviews||=[];store.program.generatedReviews.push({originalId:q.id,selected:r.selected,correct,at:new Date().toISOString(),generation:test.generation,kind:test.practiceKind||'adaptation',exerciseId:test.id,conceptId:q.conceptId,mode:r.retention?'retention':'review-transfer'})}else{store.attempts.push({id:test.id,selected:r.selected,correct,at:new Date().toISOString(),mode:r.retention?'retention':'review-transfer',reviewOf:q.id})}
   markErrorMastered(q.id,correct);renderErrorReview();
  };
  btn.onclick=e=>{e.preventDefault();activate()};
  btn.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
 $('#reviewNext')?.addEventListener('click',advanceReview);
}

function stats(){const active=new Set(bank().map(q=>q.id)),s=summary(store.attempts.filter(a=>active.has(a.id)));return `<div class="stats">${[['Questões respondidas',s.total,'tentativas do foco atual'],['Aproveitamento',s.rate+'%','nas matérias do último edital'],['Para revisar',pendingErrorIds().size,'erros, chutes e acertos agendados'],['Simulados feitos',store.sessions.length,'finalizados']].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('')}</div>`}
function subjects(){const present=new Set(bank().map(q=>q.subject));return LAST_EDITAL_SUBJECTS.filter(s=>present.has(s))}
function progress(){return subjects().map(subject=>{const ids=new Set(bank().filter(q=>q.subject===subject&&!q.historicalOnly).map(q=>q.id)),result=summary(store.attempts.filter(a=>ids.has(a.id)));return `<div class="subject"><div class="row"><b>${esc(subject)}</b><span class="muted">${result.total?'Taxa de acerto: '+result.rate+'%':'Sem respostas'}</span></div>${result.total?`<p class="muted accuracy-sample">${result.correct} acertos em ${result.total} tentativa(s)</p>`:''}<div class="track" role="progressbar" aria-label="Taxa de acerto em ${esc(subject)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${result.rate}"><i style="width:${result.rate}%"></i></div></div>`}).join('')}

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
function renderMore(){const items=[['plano','◇','Meu plano','Conheça o Premium e consulte sua assinatura.'],['livre','▷','Treino livre','Misture matérias e responda no seu ritmo.'],['noticias','◉','Notícias do concurso','Acompanhe publicações oficiais e a última checagem.'],['rotina','⚙','Minha rotina','Ajuste horários, dias de estudo e escala.'],['provas','▧','Acervo de provas','Consulte e refaça provas completas.'],['materias','▦','Matérias','Escolha uma disciplina para praticar.'],['questoes','▤','Banco de questões','Pesquise e filtre o banco completo.'],['simulados','◷','Simulados','Treine o tempo e a resolução de prova.'],['erros','↺','Revisar','Confira a retenção de erros, chutes e acertos.'],['edital','▤','Cobertura do edital','Veja os tópicos, o treino disponível e as lacunas.'],['favoritos','☆','Favoritos','Acesse suas questões salvas.'],['dados','⚙','Meus dados','Backup e configurações locais.']];$('#content').innerHTML=title('Mais','Ferramentas extras do preparatório.')+installCardHTML()+`<section class="card spaced"><h2>Estudar sem internet</h2><p>Abra o app com internet e entre na sua conta neste aparelho. Materiais já carregados podem ser consultados offline; para registrar novas respostas e iniciar simulados, é preciso conexão, pois as cotas são verificadas no servidor. O progresso é salvo e sincronizado com sua conta.</p><p class="muted">Links externos de fontes e provas precisam de internet. Se o navegador apagar os dados do site, será necessário preparar o acesso novamente.</p><p id="offlineReady" class="muted">Conferindo preparo offline…</p></section><section class="card sound-settings"><div><h2>Som das respostas</h2><p class="muted">Efeitos de acerto e erro. Você pode estudar em silêncio.</p></div><button id="answerSoundToggle" type="button" aria-pressed="${store.program.answerSound!==false}">${store.program.answerSound===false?'🔇 Som desligado':'🔊 Som ligado'}</button></section>`+`<div class="more-grid">${items.map(([id,icon,name,desc])=>{const locked=lockStudy(id);return `<a class="card more-item ${locked?'locked-card':''}" href="#${locked?'missao':id}"><span class="more-icon">${locked?'🔒':icon}</span><div><h2>${name}</h2><p class="muted">${locked?'Conclua a missão de hoje para liberar.':desc}</p></div></a>`}).join('')}</div>`;$('#answerSoundToggle').onclick=()=>{store.program.answerSound=store.program.answerSound===false;answerSounds.stop();save();renderMore()};syncInstallUI();offlineReadyUI()}
function missionQuestions(spec){const all=realBank();let qs=[];if(spec.type==='subject'||spec.type==='weak')qs=all.filter(q=>q.subject===spec.subject);else if(spec.type==='dual')qs=all.filter(q=>spec.subjects.includes(q.subject));else if(spec.type==='errors'){const ids=latestErrors(store.attempts);qs=all.filter(q=>ids.has(q.id));if(qs.length<spec.count){const fill=all.filter(q=>q.subject===spec.subject&&!qs.includes(q));qs=[...qs,...fill]}}else qs=all.slice();if(spec.type==='full')return MT_QUESTIONS.slice().sort((a,b)=>Number(a.source?.number||0)-Number(b.source?.number||0));return shuffle(qs).slice(0,Math.min(spec.count,qs.length))}
function missionHeader(){const d=programDay(),pct=Math.max(1,Math.round(d/90*100)),p=phaseInfo(d);return `<section class="mission-status"><div><span class="eyebrow">PROJETO APROVAÇÃO • ${p.name}</span><div class="mission-progress-row"><h2>Dia ${d} de 90</h2><b>${pct}% concluído</b></div><div class="track"><i style="width:${pct}%"></i></div></div><div class="mission-kpis"><span><b>${streak()}</b>dias seguidos</span><span><b>${store.program.xp}</b>XP</span><span><b>${rankName()}</b>patente</span></div></section>`}
function renderMission(){
 if(run&&run.originTab==='missao'){showExamQuestion();return}
 const spec=missionSpec(),done=todayDone(),last=store.program.completed[localDay()];
 $('#content').innerHTML=missionHeader()+`<section class="card daily-mission ${done?'done':''}"><div class="mission-badge">${done?'✓':'◆'}</div><div class="eyebrow">${done?'MISSÃO CONCLUÍDA':'MISSÃO DO DIA'}</div><h1>${esc(missionDisplayTitle(spec))}</h1><p>${esc(spec.desc)}</p><div class="mission-facts"><span><b>${spec.count}</b> questões</span><span><b>${spec.minutes}</b> min</span><span><b>${spec.target}%</b> meta</span><span><b>+${100}</b> XP base</span></div>${done?`<div class="mission-result"><b>${last.correct}/${last.total} acertos</b><span>${last.rate}% de aproveitamento</span></div><p class="muted">A missão obrigatória acabou. Continue no próximo bloco até fechar sua meta líquida de estudo.</p>`:`<button id="startMission" class="primary mission-cta">INICIAR MISSÃO →</button><p class="muted">As áreas de treino ficam bloqueadas até você concluir a missão de hoje.</p>`}</section>${done?studyClockCardHTML()+postMissionCardHTML():''}<section class="card spaced"><div class="row"><h2>Como funciona</h2><span class="tag">AUTOMÁTICO</span></div><p class="muted">Primeiro você cumpre a missão obrigatória. Depois o app direciona revisão, ponto fraco e simulados até completar a meta líquida do dia.</p></section>`;
 if(!done)$('#startMission').onclick=()=>startMission(spec);else $('#continueStudy')?.addEventListener('click',startRecommendedBlock);
 syncStudyClockUI();
}
async function startMission(spec=missionSpec()){const qs=missionQuestions(spec);if(!qs.length){toast('Ainda não há questões suficientes para esta missão.');return}if(!await allowStudy('block',qs.length))return;examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+spec.minutes*60000,originTab:'missao',label:missionDisplayTitle(spec),missionDay:spec.day,quotaGranted:true};if(tab!=='missao'){tab='missao';history.replaceState(null,'','#missao');render();return}showExamQuestion()}
function lockStudy(){return false}
function renderSubjects(){
 const real=bank().filter(q=>q.origin==='prova');
 const groups=[...new Set(real.map(q=>q.subject))].map(name=>({name,count:real.filter(q=>q.subject===name).length}));
 $('#content').innerHTML=title('Estudar por matéria','Foco enxuto com base no último edital do Agente Penitenciário de Mato Grosso (SEJUDH/MT 2016/2017).')+`<div class="notice"><b>Foco do último edital:</b> Português, História/Geografia de MT, Ética e Filosofia, Constitucional, Administração, Administrativo, Penal e Processo Penal, Direitos Humanos e Legislação Básica. Informática, Raciocínio Lógico, Atualidades e matérias específicas de outros estados ficam fora do treino ativo.</div><div class="subject-grid spaced">${groups.map(g=>`<section class="card subject-card"><div class="subject-check">✓</div><div><h2>${esc(g.name)}</h2><p class="muted">${g.count} questão${g.count===1?'':'ões'} disponível${g.count===1?'':'is'}</p><button class="primary subject-start" data-subject="${esc(g.name)}">Responder →</button></div></section>`).join('')}</div>`;
 document.querySelectorAll('.subject-start').forEach(b=>b.onclick=()=>{filter={search:'',subject:b.dataset.subject,kind:'prova',exam:''};location.hash='questoes'});
}
function navigate(){if(!currentUser){renderAuth();return}let dest=location.hash.slice(1)||'inicio';if(lockStudy(dest)){toast('Conclua a missão do dia para liberar o treino livre.');dest='missao';if(location.hash!=='#missao'){location.hash='missao';return}}if(run&&dest!==(run.originTab||'simulados')){if(!confirm('Voltar ao plano? O simulado será salvo; o tempo de prova continuará correndo.')){location.hash=run.originTab||'missao';return}persistExam();run=null}tab=pages.some(p=>p[0]===dest)?dest:'inicio';if(tab==='livre'&&store.program.freeTraining){studyTracker.paused=false;noteStudyActivity()}index=0;selection=null;answered=false;render()}
window.addEventListener('hashchange',navigate);
function render(){
 $('#nav').innerHTML=pages.map(([id,icon,name])=>{const locked=lockStudy(id),mobilePrimary=['inicio','estudar','erros','simulados','desempenho'].includes(id);return `<a href="#${locked?'missao':id}" class="${tab===id?'active':''} ${locked?'locked':''} ${mobilePrimary?'mobile-primary':'mobile-extra'}" ${tab===id?'aria-current="page"':''}><span class="navicon">${locked?'🔒':icon}</span>${name}</a>`}).join('');
 const c=$('#content');
 if(tab==='inicio'||tab==='missao')renderToday();
 if(tab==='estudar')renderLearn();
 if(tab==='livre')renderFreeTraining();
 if(tab==='rotina')renderRoutine();
 if(tab==='conteudos')renderLessonLibrary();
 if(tab==='edital')renderSyllabus();
 if(tab==='noticias')renderConcursoNews();
 if(tab==='mais')renderMore();
 if(tab==='materias')renderSubjects();
 if(['questoes','erros','favoritos'].includes(tab)){if(tab==='erros')reviewState=null;renderPractice();}
 if(tab==='simulados')renderExam();
 if(tab==='provas'){if(run)showExamQuestion();else renderArchive()}
 if(tab==='desempenho')renderLearningProgress();
 if(tab==='plano')renderMembership(c);
 if(tab==='dados')renderData();
 if(tab!=='plano'&&quotaSnapshot)showQuotaBadge();
}
function pool(){const errors=pendingErrorIds();return bank().filter(q=>(!filter.topicId||questionTopicIds(q).includes(filter.topicId))&&(!q.historicalOnly||!!filter.exam)&&(tab!=='erros'||errors.has(q.id))&&(tab!=='favoritos'||store.favorites.includes(q.id))&&(!filter.exam||examId(q)===filter.exam)&&(!filter.subject||q.subject===filter.subject)&&(!filter.kind||q.origin===filter.kind)&&(!filter.search||(q.statement+' '+q.topic+' '+(q.context||'')+' '+(q.source?.exam||'')).toLocaleLowerCase('pt-BR').includes(filter.search.toLocaleLowerCase('pt-BR'))));}
function renderPractice(){
 if(tab==='erros'){renderErrorReview();return}
 const heading=tab==='favoritos'?['Seu caderno de favoritos.','Guarde questões para retomar depois.']:['Banco de questões','Questões completas para responder dentro do aplicativo, com enunciado, alternativas, gabarito e fonte oficial para conferência.'];
 $('#content').innerHTML=title(...heading)+`<div class="filters"><label>Buscar número, enunciado ou assunto<input id="search" placeholder="Ex.: questão 21 ou constitucional" value="${esc(filter.search)}"></label><label>Matéria<select id="subject"><option value="">Todas as matérias</option>${subjects().map(s=>`<option ${s===filter.subject?'selected':''}>${esc(s)}</option>`).join('')}</select></label><label>Prova<select id="exam"><option value="">Todas as provas</option>${examChoices(filter.exam)}</select></label><label>Origem<select id="kind"><option value="">Todas</option><option value="autoral" ${filter.kind==='autoral'?'selected':''}>Autorais</option><option value="prova" ${filter.kind==='prova'?'selected':''}>Provas reais</option></select></label></div><p class="muted filter-note">Enunciados e alternativas no aplicativo. Textos de apoio e imagens preservam os detalhes da prova. A correção segue o gabarito histórico identificado na fonte.</p><div id="questionArea"></div>`;
 if(filter.topicId){const note=document.createElement('p');note.className='notice';note.textContent='Tópico: '+(EDITAL_TOPICS.find(t=>t.id===filter.topicId)?.title||'');document.querySelector('.filters').before(note)}
 for(const key of ['search','subject','kind','exam'])$('#'+key).addEventListener(key==='search'?'input':'change',e=>{delete filter.topicId;filter[key]=e.target.value;index=0;answered=false;selection=null;queue=pool();showQuestion()});
 queue=pool();showQuestion();
}
function showQuestion(){
 const area=$('#questionArea');if(!queue.length){area.innerHTML='<div class="card empty"><h2>Nenhuma questão por aqui.</h2><p>Altere os filtros ou comece uma nova sessão de estudo.</p><button id="clearFilters">Limpar filtros</button></div>';$('#clearFilters').onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:''};renderPractice()};return}
 index=Math.min(index,queue.length-1);const q=queue[index];area.innerHTML=questionHTML(q,false)+`<div class="actions spaced"><button id="prev" ${index===0?'disabled':''}>← Anterior</button><button id="respond" class="primary" ${selection===null||answered?'disabled':''}>Conferir resposta</button><button id="next" ${index===queue.length-1?'disabled':''}>Próxima →</button><span class="muted">${index+1} de ${queue.length}</span></div>`;
 bindOptions(q,()=>showQuestion());bindTacticalHelp(q);$('#guessed')?.addEventListener('click',()=>{const a=lastAttemptFor(q.id);if(a){a.guessed=true;save();toast('Registrado. Esta questão entra na revisão.')}});$('#favorite').onclick=()=>{toggleFavorite(q.id);showQuestion()};
 $('#respond').onclick=async()=>{if(selection===null||answered)return;if(!await allowStudy('question',1))return;answered=true;const correct=selection===q.answer;answerSounds.play(correct);const gain=applyQuestionXP(q,correct);store.attempts.push({id:q.id,selected:selection,correct,at:new Date().toISOString(),mode:'practice',assists:[...assistFor(q.id).used],assistXp:assistFor(q.id).spent||0,xpAwarded:gain,difficulty:questionDifficulty(q).key,weight:questionWeight(q)});save();showQuestion();if(gain)toast(`+${gain} XP ${correct?'pelo acerto':'pela tentativa'}.`)};
 for(const [id,delta] of [['prev',-1],['next',1]])$('#'+id).onclick=()=>{index+=delta;selection=null;answered=false;showQuestion()};
}
function questionHTML(q,exam){const inline=q.displayMode!=='source-pdf',assist=assistFor(q.id),strikes=manualStrikes(q.id),examAnswered=exam&&run?.originTab==='missao'&&runAnswered(q.id),diff=questionDifficulty(q),reward=questionXP(q),weight=questionWeight(q),xp=store.program.xp||0;return `<article class="card question">${historicalNotice(q)}<div class="row"><div class="meta">${esc(q.subject)} / ${esc(q.topic)}<br>${q.origin==='autoral'?'AUTORAL • TREINO':esc(q.source.board)+' • '+esc(q.source.year)+' • '+esc(q.source.exam)+' • Q'+esc(q.source.number)+(q.source.version?' • Caderno '+esc(q.source.version):'')}<div class="question-xp-meta"><span>${diff.label}</span><span>Peso ${weight}</span><span>+${reward} XP se acertar</span></div></div>${!exam?`<button id="favorite" class="secondary" aria-label="${store.favorites.includes(q.id)?'Remover dos':'Adicionar aos'} favoritos">${store.favorites.includes(q.id)?'★ Salva':'☆ Salvar'}</button>`:''}</div>${supportHTML(q)}<p class="statement">${esc(q.statement)}</p>${originalHTML(q)}${inline?'':referenceReader(q)}<div class="options" role="group" aria-label="Alternativas">${q.options.map((o,i)=>{const eliminated=assist.eliminated.includes(i),struck=strikes.includes(i),instant=examAnswered?(i===q.answer?'correct':i===selection&&selection!==q.answer?'wrong':''):'';return `<div class="option ${selection===i?'selected':''} ${eliminated?'eliminated':''} ${struck?'struck':''} ${examAnswered?'locked-answer':''} ${instant||answered&&!exam?(instant||(i===q.answer?'correct':i===selection?'wrong':'')):''}" data-option="${i}" data-strike-key="${esc(q.id)}" role="button" tabindex="${eliminated||answered&&!exam||examAnswered?'-1':'0'}" aria-label="Alternativa ${String.fromCharCode(65+i)}${struck?', riscada':''}" aria-pressed="${selection===i}" aria-disabled="${eliminated||answered&&!exam||examAnswered}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${inline?esc(o):'Alternativa '+String.fromCharCode(65+i)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}${eliminated?'<small class="elim-label">ELIMINADA</small>':''}</div>`}).join('')}</div>${!examAnswered?'<p class="strike-hint">Deslize a alternativa para o lado. Ao soltar, ela será riscada; deslize novamente para desfazer.</p>':''}<div class="question-tools"><button id="tacticalHelp" class="tactical-help ${xp<=0?'xp-locked':''}" ${exam?'disabled':''}>💡 Entender o conteúdo · grátis</button>${assist.spent?`<span class="assist-used">-${assist.spent} XP em ajuda nesta questão</span>`:''}</div>${q.origin==='prova'&&inline?`<div class="question-source"><a href="${esc(q.source.examUrl)}#page=${Number(q.source.page)||1}" target="_blank" rel="noopener noreferrer">Ver questão na prova original ↗</a></div>`:''}${answered&&!exam?feedback(q,selection):''}${answered&&!exam?'<button id=guessed class=secondary>Acertei, mas chutei / fiquei em dúvida</button>':''}</article>`}
function feedback(q,selected){const last=[...store.attempts].reverse().find(a=>a.id===q.id),gain=last?.xpAwarded||0,xpNote=last?`<div class="xp-earned">${gain>0?`+${gain} XP nesta questão`:'XP desta questão já coletado hoje'}</div>`:'';const diagnosis=selected!==undefined&&selected!==q.answer?`<div class="error-diagnosis"><b>Onde você caiu?</b><p class="muted">Marque o motivo. O app pode usar isso para ajustar missões futuras.</p><div class="reason-buttons"><button data-error-reason="conteudo">Não sabia o conteúdo</button><button data-error-reason="interpretacao">Interpretei errado</button><button data-error-reason="duvida">Fiquei entre duas</button><button data-error-reason="chute">Chutei</button></div></div>`:'';return `<div class="feedback ${selected!==q.answer?'bad':''}" role="status"><b>${selected===q.answer?'Resposta correta!':selected===undefined?'Não respondida.':'Ainda não foi dessa vez.'} Gabarito: ${q.options.length===2?esc(q.options[q.answer]):String.fromCharCode(65+q.answer)}.</b>${xpNote}${explanationHTML(q)}${diagnosis}${q.origin==='prova'?`<a href="${esc(q.source.examUrl)}" target="_blank" rel="noopener noreferrer">Consultar prova</a> · <a href="${esc(q.source.answerUrl)}${q.source.answerPage?'#page='+Number(q.source.answerPage):''}" target="_blank" rel="noopener noreferrer">Consultar gabarito</a><p>${q.displayMode==='source-pdf'?'Conferência documental do gabarito histórico':'Revisão declarada na importação'}: ${esc(q.source.reviewedAt)}.</p>`:`<small>${q.practiceKind==='application'?'Exercício autoral de aplicação, com assistência de IA e fontes no comentário.':'Questão autoral para demonstração da plataforma.'}</small>`}</div>`}
function bindOptions(q,fn){
 const buttons=[...document.querySelectorAll('[data-option]')];
 buttons.forEach(b=>{
  const index=()=>Number(b.dataset.option);
  const blocked=()=>b.getAttribute('aria-disabled')==='true'||(run?.originTab==='missao'&&runAnswered(q.id));
  const activate=()=>{
   if(blocked()||b.classList.contains('struck')||answered&&!run)return;
   selection=index();
   if(run){run.answers[q.id]=selection;persistExam()}
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
   if(run?.originTab==='missao')answerSounds.play(selection===q.answer);
   if($('#respond'))$('#respond').disabled=false;
   if($('#answeredCount')&&run)$('#answeredCount').textContent=Object.keys(run.answers).length;
  };
  b.onclick=e=>{e.preventDefault();activate()};
  b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
}
function toggleFavorite(id){store.favorites=store.favorites.includes(id)?store.favorites.filter(x=>x!==id):[...store.favorites,id];save()}
function persistExam(){ensureProgram();store.program.activeExam=packExam(run);save()}
function renderExam(){
 if(!run&&store.program.activeExam){const saved=restoreExam(store.program.activeExam,rawBank());if(saved){$('#content').innerHTML=title('Seu simulado está salvo.', 'O relógio de prova continua correndo, mesmo com o aplicativo fechado.')+`<section class="card"><h2>${esc(saved.label)}</h2><p>${Object.keys(saved.answers).length} de ${saved.questions.length} respostas salvas.</p><button id="resumeExam" class="primary">${saved.deadline<=Date.now()?'Conferir simulado encerrado pelo tempo':'Retomar simulado'}</button><button id="discardExam" class="secondary spaced">Descartar sessão</button></section>`;$('#resumeExam').onclick=async()=>{if(!saved.quotaGranted&&!(await allowStudy(saved.originTab==='missao'||saved.guided?'block':'exam',saved.questions.length)))return;run={...saved,originTab:saved.originTab||'simulados',quotaGranted:true};showExamQuestion()};$('#discardExam').onclick=()=>{if(confirm('Descartar as respostas desta sessão?')){delete store.program.activeExam;save();renderExam()}};return}else{delete store.program.activeExam;save()}}
 if(run){showExamQuestion();return}
 if(examResult){const r=examResult;$('#content').innerHTML=title('Treino concluído.','Confira o resultado e revise cada resposta.')+`<div class="card"><span class="result-score">${Math.round(r.correct/r.questions.length*100)}%</span><p>${r.correct} de ${r.questions.length} acertos • ${r.unanswered} sem resposta</p><button id="newExam" class="primary">Novo simulado</button></div>`+r.questions.map((q,i)=>`<section class="card spaced"><h3>${i+1}. ${esc(q.statement)}</h3><p class="muted">Sua resposta: ${r.answers[q.id]===undefined?'Não respondida':esc(q.options[r.answers[q.id]])}</p>${feedback(q,r.answers[q.id])}</section>`).join('');$('#newExam').onclick=()=>{examResult=null;renderExam()};return}
 $('#content').innerHTML=title('Simule o dia da prova.','No Grátis: um simulado por semana e até 20 questões no dia. As questões do simulado são contabilizadas ao iniciar. No Premium: acesso sem essas cotas.')+`<section class="card"><h2>Monte seu treino</h2><div class="filters exam-filters"><label>Origem<select id="examOrigin"><option value="prova">Provas reais</option><option value="autoral">Treino autoral</option><option value="">Todas</option></select></label><label>Prova<select id="examSource"><option value="">Todas as provas</option>${examChoices()}</select></label><label>Matéria<select id="examSubject"><option value="">Todas as matérias</option>${subjects().map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label>Quantidade<input id="examCount" type="number" min="1" max="${bank().length}" value="10"></label><label>Tempo em minutos<input id="examTime" type="number" min="1" max="180" value="20"></label></div><p class="muted" id="available"></p><button id="startExam" class="primary">Iniciar simulado →</button><div class="notice">Treino livre: todas as questões valem um acerto, sem os pesos da prova original. Anuladas excluídas. A fonte oficial pode exigir internet; o gabarito jurídico é histórico, sem revisão de vigência. Sua sessão é salva por conta. Ao fechar o app, o tempo de prova continua correndo.</div></section>`;
 const examPool=()=>bank().filter(q=>(!q.historicalOnly||!!$('#examSource').value)&&(!$('#examSource').value||examId(q)===$('#examSource').value)&&(!$('#examSubject').value||q.subject===$('#examSubject').value)&&(!$('#examOrigin').value||q.origin===$('#examOrigin').value));const update=()=>{const n=examPool().length;$('#examCount').max=n;if(Number($('#examCount').value)>n)$('#examCount').value=n;$('#available').textContent=`${n} questões disponíveis neste recorte. ${$('#examSource').value?'Prova histórica: pode conter itens com ressalva, identificados durante a correção.':'Itens de MT com ressalvas críticas foram excluídos do sorteio.'}`};$('#examSubject').onchange=update;$('#examOrigin').onchange=update;$('#examSource').onchange=update;update();
 $('#startExam').onclick=async()=>{const count=Number($('#examCount').value),minutes=Number($('#examTime').value),qs=examPool();if(!Number.isInteger(count)||count<1||count>qs.length||!Number.isInteger(minutes)||minutes<1||minutes>180){toast('Confira a quantidade e o tempo do simulado.');return}if(!await allowStudy('exam',count))return;run={questions:shuffle(qs).slice(0,count),answers:Object.create(null),index:0,deadline:Date.now()+minutes*60000,originTab:'simulados',label:'Simulado',quotaGranted:true};showExamQuestion()};
}
function showExamQuestion(){persistExam();const q=run.questions[run.index];selection=run.answers[q.id]??null;answered=false;$('#content').innerHTML=`<div class="row"><h1>${esc(run.label||'Simulado')} em andamento</h1><span class="timer" id="timer"></span></div><p class="muted">Questão ${run.index+1} de ${run.questions.length} • <span id="answeredCount">${Object.keys(run.answers).length}</span> respondidas</p>`+questionHTML(q,true)+`<div class="actions spaced"><button id="examPrev" ${run.index===0?'disabled':''}>← Anterior</button><button id="examNext" ${run.index===run.questions.length-1?'disabled':''}>Próxima →</button><button id="finish" class="primary">Finalizar simulado</button></div>`;bindOptions(q,showExamQuestion);bindTacticalHelp(q);$('#examPrev').onclick=()=>{run.index--;showExamQuestion()};$('#examNext').onclick=()=>{run.index++;showExamQuestion()};$('#finish').onclick=()=>{const missing=run.questions.length-Object.keys(run.answers).length;if(confirm(missing?`Faltam ${missing} respostas. Finalizar mesmo assim?`:'Finalizar e conferir o gabarito?'))finishExam()};tick()}
function tick(){if(!run)return;const secs=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));if($('#timer'))$('#timer').textContent=`${Math.floor(secs/60).toString().padStart(2,'0')}:${(secs%60).toString().padStart(2,'0')}`;if(!secs)finishExam()}
setInterval(tick,1000);
function finishExam(){if(!run)return;const r=run;run=null;delete store.program.activeExam;const at=new Date().toISOString();let correct=0,unanswered=0;for(const q of r.questions){const selected=r.answers[q.id];if(selected===q.answer)correct++;if(selected===undefined)unanswered++;const isCorrect=selected===q.answer,gain=applyQuestionXP(q,isCorrect);store.attempts.push({id:q.id,selected:selected??null,correct:isCorrect,at,mode:r.originTab==='missao'?'mission':'exam',assists:r.assists?.[q.id]||[],assistXp:assistFor(q.id).spent||0,xpAwarded:gain,difficulty:questionDifficulty(q).key,weight:questionWeight(q)})}store.sessions.push({at,total:r.questions.length,correct,mode:r.originTab||'simulados'});if(r.originTab==='missao'){const rate=Math.round(correct/r.questions.length*100),xp=100;store.program.completed[localDay()]={at,total:r.questions.length,correct,rate,day:r.missionDay,xp,target:phaseInfo(r.missionDay||programDay()).target};store.program.xp+=xp}save();examResult={...r,correct,unanswered};if(r.originTab==='missao')renderMission();else if(r.guided){tab='inicio';history.replaceState(null,'','#inicio');render();toast('Bloco concluído. Próximo passo recalculado.')}else if(r.originTab==='provas'){tab='simulados';renderExam();}else renderExam()}
window.addEventListener('beforeunload',()=>{if(run){store.program.activeExam=packExam(run);persistStudyLocal()}});
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
 const e=MT_EXAM;$('#content').innerHTML=title('Acervo de provas','Provas reais localizadas para ampliar o banco nacional de Polícia Penal.')+`<section class="card archive-card"><div class="archive-head"><img class="archive-seal" src="./icon.svg" alt="Escudo do preparatório PP MT"><div><div class="eyebrow">ACERVO DE PROVAS / MATO GROSSO</div><h2>Agente Penitenciário · SEJUDH/MT</h2><span class="muted">IBADE · Edital 001/2016 · Prova aplicada em ${e.date}</span></div></div><div class="exam-facts"><div><b>S05 T</b><small>Caderno cadastrado</small></div><div><b>60</b><small>Questões na prova</small></div><div><b>57</b><small>Válidas para treinar</small></div><div><b>3</b><small>Anuladas, fora do treino</small></div></div><p class="muted">O objetivo do banco é resolver tudo dentro do aplicativo: enunciado e alternativas completos. O PDF original fica apenas como fonte de conferência. As questões ainda pendentes de transcrição não entram no treino.</p><div class="source-links"><button class="primary" id="fullOfficial">Responder prova completa →</button><button class="secondary" id="trainOfficial">Estudar questões desta prova →</button><a class="button secondary" href="${e.examUrl}" target="_blank" rel="noopener noreferrer">Prova original ↗</a><a class="button secondary" href="${e.answerUrl}#page=13" target="_blank" rel="noopener noreferrer">Gabarito final ↗</a><a class="button secondary" href="${e.landingUrl}" target="_blank" rel="noopener noreferrer">Página da banca ↗</a></div><div class="notice warning-historical"><b>Acervo histórico de 2017.</b> As questões 16, 41 e 56 foram anuladas e não entram no treino nem nas estatísticas. Respostas jurídicas refletem o gabarito da época; não houve revisão de vigência legislativa. Este material não define o conteúdo de um próximo edital.</div><h3>Matérias do caderno</h3><div class="exam-reference-list">${e.sections.map(x=>`<div>${esc(x.subject)} · Q${x.from}–${x.to}</div>`).join('')}</div><details class="source-reader"><summary>Consultar o caderno completo nesta tela</summary><iframe class="pdf-view" src="${e.examUrl}#page=1" title="Caderno oficial S05 T completo" loading="lazy" referrerpolicy="no-referrer"></iframe></details><p class="source-note">Conferência documental: 07/10/2026 (UTC). Os PDFs são carregados diretamente da IBADE. Leitura integrada depende do navegador; os botões abrem o documento separadamente.</p></section>${importedArchiveHTML()}<section class="card spaced"><div class="row"><div><div class="eyebrow">EXPANSÃO NACIONAL</div><h2>Fila de importação</h2></div><span class="tag">${OFFICIAL_QUESTIONS.length} QUESTÕES DISPONÍVEIS</span></div><p class="muted">Já localizamos provas que somam ${SOURCE_TOTAL} questões. No treino ativo entram apenas questões de matérias compatíveis com o último edital de MT; conteúdos extras de outros estados ficam somente no acervo.</p><div class="exam-source-grid">${EXAM_SOURCES.filter(x=>x.id!==e.id&&x.status!=='imported').map(x=>`<a class="exam-source-card" href="${x.sourcePage}" target="_blank" rel="noopener noreferrer"><div><b>${esc(x.state)} • ${esc(x.year)} • ${esc(x.board)}</b><span>${esc(x.exam)}</span></div><strong>${x.questionCount}</strong><small>${x.verifiedOfficialSource?'FONTE OFICIAL VERIFICADA':'FONTE EM VERIFICAÇÃO'}</small></a>`).join('')}</div></section>`;bindImportedArchive();$('#trainOfficial').onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:MT_EXAM.id};location.hash='questoes'};$('#fullOfficial').onclick=async()=>{const qs=MT_QUESTIONS.slice().sort((a,b)=>Number(a.source.number)-Number(b.source.number));if(!await allowStudy('exam',qs.length))return;examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+270*60000,originTab:'provas',label:'Prova completa',quotaGranted:true};showExamQuestion()}}

if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=2.17.0').catch(()=>{});
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
function bindImportedArchive(){document.querySelectorAll('[data-train-exam]').forEach(b=>b.onclick=()=>{filter={search:'',subject:'',kind:'prova',exam:b.dataset.trainExam};location.hash='questoes'});document.querySelectorAll('[data-full-exam]').forEach(b=>b.onclick=async()=>{const qs=OFFICIAL_QUESTIONS.filter(q=>examId(q)===b.dataset.fullExam);if(!qs.length||!await allowStudy('exam',qs.length))return;examResult=null;run={questions:qs,answers:Object.create(null),index:0,deadline:Date.now()+240*60000,originTab:'provas',label:'Prova completa',quotaGranted:true};showExamQuestion()})}

// Daily learning flow: stored inside the existing per-account program/backup.
function routineProfile(){return store.program.profile||{level:'zero',schedule:'weekly',days:[1,2,3,4,5],minutes:20,workMinutes:10,freeMinutes:30,anchor:localDay(),time:'19:00',examDate:''}}
function renderRoutine(){
 const p=routineProfile();
 $('#content').innerHTML=title('Uma rotina que cabe na sua vida.','Comece pequeno. Você pode ajustar sem perder seu histórico.')+`<form id="routineForm" class="card routine-form"><p><b>Objetivo: Polícia Penal de Mato Grosso</b><br>Plano de preparação com acervo histórico; não representa um edital futuro.</p><label>Seu ponto de partida<select id="level"><option value="zero">Estou começando do zero</option><option value="return">Estou voltando a estudar</option><option value="practice">Já tenho base e quero praticar</option></select></label><label>Minha rotina<select id="schedule"><option value="weekly">Dias da semana</option><option value="shift">Escala 12×36</option></select></label><fieldset><legend>Dias de estudo (rotina semanal)</legend>${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d,i)=>`<label class="day-check"><input type="checkbox" name="days" value="${i}" ${p.days.includes(i)?'checked':''}>${d}</label>`).join('')}</fieldset><div class="filters"><label>Minutos por dia<input id="minutes" type="number" min="5" max="240" value="${p.minutes}" required></label><label>Minutos no plantão<input id="workMinutes" type="number" min="0" max="240" value="${p.workMinutes}" required></label><label>Minutos na folga<input id="freeMinutes" type="number" min="5" max="240" value="${p.freeMinutes}" required></label><label>Data de um plantão<input id="anchor" type="date" value="${p.anchor}" required></label><label>Horário que pretendo começar<input id="routineTime" type="time" value="${p.time}" required></label><label>Data da prova, se conhecida<input id="examDate" type="date" value="${p.examDate||''}"></label></div><p class="muted">O horário é um compromisso no seu plano; o app ainda não envia notificações. Em dias difíceis, você pode usar a sessão de 10 minutos.</p><button class="primary">Salvar minha rotina</button></form>`;
 $('#level').value=p.level;$('#schedule').value=p.schedule;
 $('#routineForm').onsubmit=e=>{e.preventDefault();const days=[...document.querySelectorAll('[name=days]:checked')].map(x=>Number(x.value));if($('#schedule').value==='weekly'&&!days.length){toast('Escolha pelo menos um dia.');return}store.program.profile={level:$('#level').value,schedule:$('#schedule').value,days,minutes:Number($('#minutes').value),workMinutes:Number($('#workMinutes').value),freeMinutes:Number($('#freeMinutes').value),anchor:$('#anchor').value,time:$('#routineTime').value,examDate:$('#examDate').value,updatedAt:new Date().toISOString()};save();location.hash='inicio';if(tab==='inicio')renderToday()};
}
function renderToday(){
 if(!store.program.profile){renderRoutine();return}
 const p=routineProfile(),goal=studyGoalSeconds()/60,done=goal>0&&todayStudySeconds()>=goal*60,due=pendingErrorIds().size,active=store.program.learning;
 const plan=dailyStudyPlan(bank(),store.attempts,todayReviewIds(),goal||10,'',store.program.generatedReviews||[]);
 const current=active?bank().find(q=>q.id===active.ids[active.index]):null;
 const task=active?'Retomar: '+(current?.topic||'seu bloco'):plan.reviewIds.length?'Revisar '+plan.reviewIds.length+' conceito(s)':plan.topic||'Começar um conceito';
 const primary=active?'Retomar estudo':plan.reviewIds.length?'Revisar agora':done?'Estudar mais (opcional)':'Começar estudo';
 const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()+i);return {name:d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit'}),minutes:minutesFor(p,d)}});
 const completed=store.program.daily?.[localDay()]?.blocks||0;
 $('#content').innerHTML=`<div class="concurso-strip"><img class="concurso-shield" src="./icon.svg" alt=""><div><strong>POLÍCIA PENAL · MATO GROSSO</strong><span>Disciplina. Constância. Preparo.</span></div><img class="concurso-map" src="./assets/identity/mato-grosso.svg" alt="" aria-hidden="true"></div><section class="hero today-focus"><div class="eyebrow">SEU ESTUDO DE HOJE</div><h1>${done?'Meta de tempo cumprida':goal?'Um passo de cada vez':'Hoje é dia de descanso'}</h1><div class="today-time"><div><strong data-study-remaining>${studyRemaining()?formatStudyShort(studyRemaining())+' restantes':goal?'meta concluída':'estudo opcional'}</strong><span class="muted">${goal?'Meta de '+formatStudyShort(studyGoalSeconds()):'Sem meta de tempo hoje'} · <span data-study-time>${formatStudyTime(todayStudySeconds())}</span> estudados</span></div><b data-study-percent>${studyPct()}%</b></div><div class="track study-time-track"><i data-study-progress style="width:${studyPct()}%"></i></div><div class="today-task"><span class="eyebrow">PRÓXIMA TAREFA</span><h2>${esc(task)}</h2>${!active&&!plan.reviewIds.length?`<p class="muted">${esc(plan.subject||'')}</p>`:''}</div><button id="beginLearning" class="primary today-primary">${primary}</button><button id="shortLearning" class="today-short">Hoje só tenho 10 minutos</button><p class="muted today-meta">${esc(p.time)} · ${completed} bloco(s) concluído(s) hoje${done?' · continuar é opcional':''}</p></section>${store.program.activeExam?'<a class="button secondary spaced" href="#simulados">Retomar simulado salvo</a>':''}<details class="card spaced compact-details"><summary>Ver detalhes do plano</summary><p>${esc(plan.reason)}</p><ol class="daily-steps"><li>Revisar: ${plan.reviewIds.length} conceito(s) · cerca de ${plan.reviewMinutes} min</li><li>Aprender: ${esc(plan.topic||'conceito do acervo')} · ${esc(plan.subject||'')}</li><li>Praticar: ${plan.practiceCount} exercício(s) do mesmo conceito</li></ol><p class="muted">${due>plan.reviewIds.length?`${due-plan.reviewIds.length} revisão(ões) ficam para outros blocos. `:''}${plan.learnMinutes} min para aprender e praticar. O tempo organiza a rotina; não comprova domínio.</p><details><summary>Entenda o cronômetro</summary><p class="muted">Conta nas sessões de estudo. Pausa ao sair do app ou após 3 minutos sem interação. Use o relógio no topo para pausar ou retomar.</p></details></details><details class="card spaced compact-details" id="weekPlan"><summary>Próximos 7 dias</summary><div class="week-plan">${days.map(d=>`<div><b>${d.name}</b><span>${d.minutes?d.minutes+' min':'Descanso'}</span></div>`).join('')}</div><a class="button secondary" href="#rotina">Ajustar rotina</a>${p.examDate?`<p>Prova informada: ${esc(p.examDate.split('-').reverse().join('/'))} · ${Math.max(0,Math.ceil((new Date(p.examDate+'T12:00:00')-new Date())/86400000))} dias restantes.</p>`:''}</details><div class="quick-actions spaced"><a class="button secondary" href="#estudar">Estudar por matéria</a><a class="button secondary" href="#conteudos">Comentários MT</a><a class="button secondary" href="#edital">Cobertura do edital</a><a class="button secondary" href="#provas">Provas e fontes</a><a class="button secondary" href="#noticias">Notícias do concurso</a><a class="button secondary" href="#mais">Configurações e backup</a></div>`;
 $('#beginLearning').onclick=()=>{if(active)location.hash='estudar';else if(plan.reviewIds.length)location.hash='erros';else beginLearning()};
 $('#shortLearning').onclick=()=>{store.program.shortDay=localDay();save();if(!active)beginLearning(10);else location.hash='estudar'};syncStudyClockUI();
}

function daysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return localDay(d)}
function beginLearning(minutes=Math.min(25,Math.max(5,Math.ceil(studyRemaining()/60)||10)),subject='',conceptId=''){
 const candidates=bank().filter(q=>!q.historicalOnly&&q.displayMode!=='source-pdf'&&(!subject||q.subject===subject)&&(!conceptId||q.conceptId===conceptId));
 const qs=chooseConceptBlock(candidates,store.attempts,Math.max(2,Math.min(8,Math.ceil(minutes/4)+1)),subject,store.program.generatedReviews||[]);
 if(!qs.length){toast('Não há questões disponíveis para este assunto.');return}
 store.program.learning={ids:qs.map(q=>q.id),index:0,phase:routineProfile().level==='practice'?'practice':'learn',startedAt:new Date().toISOString(),answers:[],selected:null};save();noteStudyActivity();studyTracker.paused=false;location.hash='estudar';if(tab==='estudar')renderLearn();
}
function renderLearn(){
 const l=store.program.learning;
 const freeLink=`<a class="button free-entry" href="#livre"><span><b>${store.program.freeTraining?'Retomar treino livre':'Treino livre'}</b><small>Questões misturadas · no seu ritmo</small></span><span aria-hidden="true">→</span></a>`;
 if(!l){
  $('#content').innerHTML=title('O que vamos estudar?','Escolha uma matéria ou siga o próximo bloco do plano.')+freeLink+`<button id="learnSuggested" class="primary study-suggested">Começar bloco recomendado</button><section class="card compact-subjects spaced" aria-label="Matérias para estudo">${subjects().map(subject=>{const count=bank().filter(q=>q.subject===subject&&q.lesson&&q.conceptId&&q.id===q.conceptId).length;return `<button class="study-subject-row" data-learn-subject="${esc(subject)}" aria-label="Estudar ${esc(subject)}"><span><b>${esc(subject)}</b><small>${count} conceito(s) com explicação e prática</small></span><span class="subject-arrow" aria-hidden="true">→</span></button>`}).join('')}</section><div class="quick-actions"><a class="button secondary" href="#conteudos">Ler comentários MT</a><a class="button secondary" href="#edital">Ver cobertura do edital</a></div><details class="card spaced compact-details"><summary>Como funciona o estudo guiado</summary><p>Foco nas nove matérias do edital histórico SEJUDH/MT 2016/2017. Cada bloco combina explicação, exemplo e exercícios do mesmo conceito.</p><p class="muted">Questões sem classificação por conceito ficam no banco livre. O material preparado não cobre todo o edital nem substitui um curso completo.</p></details>`;
  $('#learnSuggested').onclick=()=>beginLearning();document.querySelectorAll('[data-learn-subject]').forEach(b=>b.onclick=()=>beginLearning(20,b.dataset.learnSubject));return;
 }

 const q=bank().find(q=>q.id===l.ids[l.index]);if(!q||q.historicalOnly){delete store.program.learning;save();renderLearn();return}
 const learner=l.phase==='learn',corrected=l.phase==='feedback',learningStrikeKey=`learning:${q.id}`,learningStrikes=manualStrikes(learningStrikeKey);
 $('#content').innerHTML=`<section class="learning-session"><div class="row"><h1>${learner?'Entenda antes de responder':corrected?'Entenda sua resposta':'Agora é com você'}</h1><span class="tag">${l.index+1}/${l.ids.length}</span></div><p class="muted">${esc(q.subject)} · ${esc(q.topic)}</p>${learner?`<article class="card"><h2>Orientação para este assunto</h2><p>${microLesson(q)}</p><p class="muted">Leia o conceito e examine o exemplo. Depois explique a regra com suas palavras.</p><details><summary>Ver exemplo resolvido</summary>${supportHTML(q)}<p>${esc(q.statement)}</p><p><b>Resposta: ${esc(q.options[q.answer])}</b></p>${explanationHTML(q)}</details><label class="spaced">Explique para você: o que diferencia a resposta correta?<textarea id="recall" rows="3" placeholder="Tente explicar com suas palavras. Este rascunho não é uma avaliação automática.">${esc(l.note||'')}</textarea></label><button id="learnNext" class="primary">Continuar para a prática</button></article>`:`<article class="card question">${supportHTML(q)}<p class="statement">${esc(q.statement)}</p>${originalHTML(q)}<div class="options">${q.options.map((o,i)=>{const struck=!corrected&&learningStrikes.includes(i);return `<div data-learning-answer="${i}" data-strike-index="${i}" data-strike-key="${esc(learningStrikeKey)}" role="button" tabindex="${corrected?'-1':'0'}" aria-disabled="${corrected}" class="option ${struck?'struck':''} ${corrected?(i===q.answer?'correct':l.selected===i?'wrong':''):l.selected===i?'selected':''}"><span class="letter">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>${struck?'<small class="strike-label">RISCADA</small>':''}</div>`}).join('')}</div>${!corrected?'<p class="strike-hint">Deslize a alternativa para o lado para riscar. Deslize novamente para desfazer.</p>':''}${corrected?`<div class="feedback ${l.selected===q.answer?'':'bad'}"><b>${l.selected===q.answer?'Resposta correta':'Vamos entender o erro'}</b><details class="spaced"><summary>Entender a resposta e ver as fontes</summary>${explanationHTML(q)}</details><p><b>Alternativa correta:</b> ${esc(q.options[q.answer])}</p><p>Compare sua escolha com a regra e explique qual detalhe mudou a resposta.</p></div><label>Como foi responder?<select id="learningReason"><option value="">Selecione, se quiser</option><option value="chute">Chutei / fiquei em dúvida</option><option value="conteudo">Não sabia o conteúdo</option><option value="interpretacao">Passei batido no enunciado</option><option value="duvida">Confundi conceitos</option></select></label><button id="learnNext" class="primary">${l.index+1>=l.ids.length?'Concluir bloco':'Próxima questão'}</button>`:''}</article>`}<div class="actions spaced"><button id="leaveLearning">Pausar e voltar depois</button><a class="button secondary" href="#livre">Treino livre</a>${q.source?`<a href="${esc(q.source.examUrl)}" target="_blank" rel="noopener noreferrer">Consultar prova original</a>`:''}</div></section>`;
 $('#leaveLearning').onclick=()=>{studyTracker.paused=true;save();location.hash='inicio'};
 $('#recall')?.addEventListener('input',e=>{l.note=e.target.value;persistStudyLocal()});
 document.querySelectorAll('[data-learning-answer]').forEach(b=>{
  const activate=async()=>{
   if(corrected||b.getAttribute('aria-disabled')==='true'||b.classList.contains('struck'))return;
   if(!await allowStudy('question',1))return;
   l.selected=Number(b.dataset.learningAnswer);
   const a={id:q.id,selected:l.selected,correct:l.selected===q.answer,at:new Date().toISOString(),mode:'learning',assists:store.program.workedExamples?.includes(q.id)?['worked-example']:[]};
   answerSounds.play(a.correct);store.attempts.push(a);l.answers.push(a);l.phase='feedback';save();renderLearn();
  };
  b.onclick=e=>{e.preventDefault();activate()};
  b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
 $('#learningReason')?.addEventListener('change',e=>{const a=lastAttemptFor(q.id);if(a){a.reason=e.target.value;a.guessed=e.target.value==='chute';save()}});
 $('#learnNext')?.addEventListener('click',()=>{if(learner){store.program.workedExamples||=[];if(!store.program.workedExamples.includes(q.id))store.program.workedExamples.push(q.id);l.exampleId=q.id;l.phase='practice';if(l.ids.length>1)l.index=1;else toast('Só há este exemplo no bloco. A repetição será registrada como prática assistida.')}else l.index++;l.selected=null;if(l.index>=l.ids.length){store.program.daily||={};const d=store.program.daily[localDay()]||{blocks:0};d.blocks++;store.program.daily[localDay()]=d;delete store.program.learning;save();location.hash='inicio';toast('Bloco concluído. Seu próximo passo está no plano de hoje.')}else{l.phase='practice';save();renderLearn()}});
}
function renderLearningProgress(){
 const all=bank(),concepts=conceptProgress(all,store.attempts,store.program.generatedReviews||[]),practice=[...(store.program.generatedReviews||[]).filter(a=>a.kind==='application'),...store.attempts.filter(a=>all.some(q=>q.id===a.id&&q.practiceKind==='application'))],adapted=(store.program.generatedReviews||[]).filter(a=>a.kind!=='application');
 const official=all.filter(q=>!q.historicalOnly&&q.origin==='prova'),activeIds=new Set(official.map(q=>q.id)),m=learningMetrics(store.attempts.filter(a=>activeIds.has(a.id))),records=store.program.daily||{},days=Object.entries(records).filter(([d])=>d>=daysAgo(6)),blocks=days.reduce((n,[,v])=>n+v.blocks,0),reviews=Object.values(store.program.reviews||{});
 $('#content').innerHTML=title('Seu desempenho','Polícia Penal · Mato Grosso')+`<div class="performance-period" role="group" aria-label="Período do desempenho">${[['today','Hoje'],['week','7 dias'],['month','30 dias'],['total','Total']].map(([value,label])=>`<button data-performance-period="${value}" aria-pressed="${value==='total'}">${label}</button>`).join('')}</div><div id="performanceDashboard" aria-live="polite"></div><details class="card spaced compact-details"><summary>Constância e retenção · histórico completo</summary><div class="stats progress-stats">${[['Blocos em 7 dias',blocks],['Acerto em oficiais novas',m.newRate===null?'Sem dados':m.newRate+'%'],['Retenção em oficiais',m.retentionRate===null?'Sem dados':m.retentionRate+'%'],['Questões oficiais vistas',m.seen]].map(([t,v])=>`<section class="stat"><small>${t}</small><strong>${v}</strong></section>`).join('')}</div><details class="card spaced compact-details"><summary>Entenda estes indicadores</summary><p>${m.newCount} primeiras respostas em questões oficiais sem ajuda ou chute · ${m.retentionCount} testes posteriores em oficiais.</p><p class="muted">Itens históricos com ressalvas ficam fora destes indicadores. Repetições não aumentam o acerto em questões novas. Amostras pequenas não comprovam domínio.</p><p>${practice.length} respostas em aplicação autoral · ${adapted.length} em adaptações automáticas. Estas aparecem no mapa de conceitos, separadas do indicador de questões oficiais.</p></details></details><details class="card spaced compact-details"><summary>Aprendizado por conceitos · histórico completo</summary><div class="filters concept-filters"><label>Buscar conceito<input id="conceptSearch" type="search" placeholder="Ex.: crase, prisão, planejamento"></label><label>Mostrar<select id="conceptStatus"><option value="all">Todos os conceitos</option><option value="review">Precisa revisar</option><option value="new">Precisa aprender</option><option value="practice">Em prática</option></select></label></div><div id="conceptResults"></div><details class="spaced"><summary>Sobre este mapa</summary><p class="muted">${concepts.length} conceitos com explicação e exercício. O mapa mostra o material preparado; confira as lacunas na cobertura do edital.</p></details></details><section class="card spaced"><h2>Questões vistas no acervo</h2><p>${m.seen} de ${official.length} questões oficiais vistas.</p><a class="button secondary" href="#edital">Ver cobertura do edital</a></section><section class="card spaced"><h2>Revisões programadas</h2><p>${pendingErrorIds().size} pendentes hoje · ${reviews.filter(r=>Date.parse(r.dueAt)>Date.now()).length} para os próximos dias.</p><a class="button primary" href="#erros">Abrir revisão</a></section><details class="card spaced compact-details"><summary>Últimos simulados</summary>${store.sessions.length?store.sessions.slice(-8).reverse().map(s=>`<p>${new Date(s.at).toLocaleDateString('pt-BR')} · ${s.correct}/${s.total} acertos</p>`).join(''):'<p>Ainda não há simulados concluídos.</p>'}<a class="button secondary" href="#simulados">Fazer simulado</a></details><div class="quick-actions spaced"><a class="button secondary" href="#rotina">Ajustar rotina</a><a class="button secondary" href="#dados">Backup do progresso</a></div>`;
 const drawPerformance=period=>{
  const stats=performanceSummary(all,store.attempts,store.program.generatedReviews||[],period),rate=stats.rate===null?'—':stats.rate.toLocaleString('pt-BR')+'%',label=({today:'Hoje',week:'Últimos 7 dias',month:'Últimos 30 dias',total:'Histórico completo'})[period];
  document.querySelectorAll('[data-performance-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.performancePeriod===period)));
  $('#performanceDashboard').innerHTML=`<section class="card spaced performance-general"><h2>Desempenho geral</h2><p class="muted">${label}</p><div class="performance-total"><span>Questões respondidas</span><strong>${stats.total}</strong></div><div class="performance-chart"><div class="performance-count performance-correct"><span>Acertos</span><strong>${stats.correct}</strong></div><div class="performance-ring" style="--accuracy:${stats.total?stats.correct/stats.total*100:0}%;--ring-rest:${stats.total?'#df7e88':'var(--line)'}" role="img" aria-label="${stats.total?rate+' de acertos; '+stats.correct+' acertos e '+stats.wrong+' erros':'Ainda sem respostas neste período'}"><div><strong>${rate}</strong><small>de acertos</small></div></div><div class="performance-count performance-wrong"><span>Erros</span><strong>${stats.wrong}</strong></div></div>${!stats.total?'<p class="muted">Comece uma sessão para acompanhar seus resultados.</p><a class="button primary" href="#livre">Abrir Treino livre</a>':''}<details class="performance-note"><summary>O que entra neste resultado?</summary><p>Respostas do estudo, revisão, simulados e Treino livre. Cada tentativa conta, inclusive repetições. Questões sem resposta e itens históricos com ressalvas ficam fora.</p><p>${stats.generated} respostas em exercícios de revisão autorais ou adaptados · ${stats.guessed} respostas marcadas como chute ou dúvida. O percentual mostra acertos, não domínio da matéria.</p></details></section><section class="card spaced"><h2>Desempenho por matéria</h2><div class="performance-table-wrap" tabindex="0" role="region" aria-label="Resultados por matéria; deslize para ver todas as colunas"><table class="performance-table"><caption class="muted">${label}</caption><thead><tr><th scope="col">Matéria</th><th scope="col">Respondidas</th><th scope="col">Acertos</th><th scope="col">Erros</th><th scope="col">Acerto</th></tr></thead><tbody>${stats.subjects.map(row=>`<tr><th scope="row">${esc(row.subject)}</th><td>${row.total}</td><td class="performance-correct">${row.correct}</td><td class="performance-wrong">${row.wrong}</td><td>${row.rate===null?'—':row.rate.toLocaleString('pt-BR')+'%'}</td></tr>`).join('')}</tbody></table></div></section>`;
 };
 document.querySelectorAll('[data-performance-period]').forEach(b=>b.onclick=()=>drawPerformance(b.dataset.performancePeriod));drawPerformance('total');
 const update=()=>{
  const term=$('#conceptSearch').value.trim().toLocaleLowerCase('pt-BR'),status=$('#conceptStatus').value;
  const filtered=concepts.filter(c=>(!term||(c.title+' '+c.subject).toLocaleLowerCase('pt-BR').includes(term))&&(status==='all'||c.status===({review:'Precisa revisar',new:'Precisa aprender',practice:'Em prática'})[status]));
  $('#conceptResults').innerHTML=subjects().map(subject=>{const items=filtered.filter(c=>c.subject===subject);if(!items.length)return '';const weak=items.filter(c=>c.status==='Precisa revisar').length;return `<details class="concept-subject" ${term||status!=='all'?'open':''}><summary><span><b>${esc(subject)}</b><small>${items.length} conceito(s)${weak?' · '+weak+' para revisar':''}</small></span></summary><div class="concept-progress">${items.map(c=>`<details class="concept-item"><summary><span>${esc(c.title)}</span><span class="tag ${c.status==='Precisa revisar'?'tag-review':''}">${esc(c.status)}</span></summary><p>${c.attempts} resposta(s) · ${c.retentionCount} teste(s) posteriores · ${c.questions} questões vinculadas</p><button data-study-concept="${esc(c.id)}" class="primary">Estudar este conceito</button></details>`).join('')}</div></details>`}).join('')||'<p class="muted">Nenhum conceito neste filtro.</p>';
  document.querySelectorAll('[data-study-concept]').forEach(b=>b.onclick=()=>beginLearning(20,'',b.dataset.studyConcept));
 };
 $('#conceptSearch').oninput=update;$('#conceptStatus').onchange=update;update();syncStudyClockUI();
}

$('#studyClockMini').onclick=()=>{studyTracker.paused=studyEligible();if(!studyTracker.paused)noteStudyActivity();syncStudyClockUI();toast(studyTracker.paused?'Cronômetro pausado.':'Cronômetro pronto. Abra uma sessão de estudo para contar.');};

function historicalNotice(q){return q.historicalOnly?`<aside class="lesson-notice" role="note"><b>Questão histórica com ressalva</b><p>${esc(q.lesson?.note||'Consulte a explicação antes de aplicar o gabarito a uma prova atual.')}</p><small>O gabarito oficial foi preservado. Este item não entra no treino automático de MT.</small></aside>`:''}
function explanationHTML(q){
 const l=q.lesson;if(!l)return `<p>${esc(q.explanation)}</p>`;
 return `<section class="deep-explanation" aria-label="Explicação comentada">${historicalNotice(q)}<h3>Entenda o conceito</h3><p>${esc(l.concept)}</p><h3>Como chegar à resposta</h3><p>${esc(l.reasoning)}</p><details class="lesson-alternatives"><summary>Por que cada alternativa está certa ou errada?</summary><ol class="alternative-reasons">${l.alternatives.map((text,i)=>`<li><b>${String.fromCharCode(65+i)}${i===q.answer?(q.origin==='prova'?' · gabarito oficial':' · resposta correta'):''}</b><p>${esc(text)}</p></li>`).join('')}</ol></details><h3>Exemplo para entender</h3><p>${esc(l.example)}</p><div class="recall-card"><b>Antes de seguir, tente lembrar</b><p>${esc(l.recall.prompt)}</p><details><summary>Conferir a ideia principal</summary><p>${esc(l.recall.answer)}</p><small>Esta conferência não marca domínio nem gera acerto automaticamente.</small></details></div>${l.note&&!q.historicalOnly?`<p class="lesson-notice"><b>Ressalva:</b> ${esc(l.note)}</p>`:''}<details class="lesson-sources"><summary>Fontes e conferência · ${esc(l.checkedAt.split('-').reverse().join('/'))}</summary><ul>${l.sources.map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)} ↗</a></li>`).join('')}</ul><p class="muted">${esc(l.authorship)} A data registra esta conferência, não uma garantia de atualização permanente.</p></details></section>`;
}
function renderLessonLibrary(){
 const questions=[...MT_QUESTIONS,...AUTHORIAL_MT_QUESTIONS],restricted=questions.filter(q=>q.historicalOnly).length;
 $('#content').innerHTML=title('Mato Grosso, questão por questão.','Comentários e exercícios autorais com conceito, alternativas explicadas e fontes.')+`<section class="card"><p>${questions.length-restricted} itens com explicação no treino · ${restricted} itens reservados ao acervo histórico com ressalvas.</p><label>Buscar assunto ou número da questão<input id="lessonSearch" type="search" placeholder="Ex.: tortura, crase, 51"></label><p class="muted">Comentários didáticos com assistência de IA e fontes indicadas. Não são justificativas oficiais da banca nem substituem revisão docente independente.</p></section><div id="lessonResults"></div>`;
 const update=()=>{const term=$('#lessonSearch').value.trim().toLocaleLowerCase('pt-BR'),qs=questions.filter(q=>!term||q.source?.number===term||`${q.topic} ${q.subject} ${q.lesson.concept}`.toLocaleLowerCase('pt-BR').includes(term));$('#lessonResults').innerHTML=qs.length?qs.map(q=>`<details class="card spaced lesson-library-item"><summary><b>${q.origin==='prova'?'Questão '+esc(q.source.number):'Treino autoral'} · ${esc(q.topic)}</b><span>${esc(q.subject)}${q.historicalOnly?' · Com ressalva':''}</span></summary><p class="statement">${esc(q.statement)}</p><ol type="A">${q.options.map(o=>`<li>${esc(o)}</li>`).join('')}</ol><p><b>${q.origin==='prova'?'Gabarito oficial':'Resposta correta'}: ${String.fromCharCode(65+q.answer)}</b></p>${explanationHTML(q)}</details>`).join(''):'<p class="muted">Nenhum comentário encontrado.</p>'};$('#lessonSearch').oninput=update;update();
}

function renderSyllabus(){
 const qs=bank().filter(q=>!q.historicalOnly),rows=syllabusCoverage(qs,store.attempts,store.program.generatedReviews||[]),available=rows.filter(t=>t.count).length,guided=rows.filter(t=>t.guided).length,seen=rows.filter(t=>t.attempts).length,unmapped=qs.filter(q=>!questionTopicIds(q).length).length;
 $('#content').innerHTML=title('Cobertura do edital','Saiba o que já praticou e onde o material ainda precisa crescer.')+`<section class="card"><h2>Referência: Agente Penitenciário MT · 2016/2017</h2><p>${rows.length} tópicos agrupados do Anexo II · ${available} com questões classificadas · ${guided} com explicação e aplicação guiada · ${seen} praticados por você.</p><p class="muted">Ter questões em um tópico não significa cobrir todo o seu conteúdo nem dominar o assunto. ${unmapped} questões do acervo ainda estão sem vínculo com estes tópicos, incluindo material complementar. Elas continuam disponíveis no banco.</p><details><summary>Fonte e critérios do mapa</summary><p>${esc(EDITAL_SOURCE.note)}</p><a href="${esc(EDITAL_SOURCE.url)}#page=23" target="_blank" rel="noopener noreferrer">Consultar Anexo II · páginas 106–107 do Diário Oficial ↗</a><p>O vínculo considera o conceito central da questão. Itens históricos com ressalvas ficam fora da cobertura do treino.</p></details></section><div class="filters spaced"><label>Buscar tópico<input id="topicSearch" type="search" placeholder="Ex.: inquérito, crase, Mato Grosso"></label><label>Mostrar<select id="topicStatus"><option value="all">Todos os tópicos</option><option value="gap">Sem treino guiado</option><option value="new">Ainda não pratiquei</option><option value="weak">Precisa reforçar</option></select></label></div><div id="topicResults"></div>`;
 const update=()=>{
  const term=$('#topicSearch').value.trim().toLocaleLowerCase('pt-BR'),status=$('#topicStatus').value,filtered=rows.filter(t=>(!term||(t.title+' '+t.subject).toLocaleLowerCase('pt-BR').includes(term))&&(status==='all'||status==='gap'&&!t.guided||status==='new'&&!t.attempts||status==='weak'&&t.status==='Precisa reforçar'));
  $('#topicResults').innerHTML=LAST_EDITAL_SUBJECTS.map(subject=>{const items=filtered.filter(t=>t.subject===subject);return items.length?`<details class="card spaced syllabus-subject" ${term||status!=='all'?'open':''}><summary><b>${esc(subject)}</b><span>${items.length} tópico(s)</span></summary>${items.map(t=>`<article class="syllabus-topic"><h3>${esc(t.title)}</h3><p><span class="tag">${esc(t.status)}</span> · ${t.attempts} resposta(s) · ${t.retentionCount} teste(s) posteriores</p><p class="muted">${t.count?t.count+' questões classificadas':'Sem questões classificadas neste tópico'} · ${t.guided?'Explicação e aplicação guiada disponíveis':'Treino guiado ainda não preparado'}</p>${t.conceptId?`<button data-topic-concept="${esc(t.conceptId)}" class="primary">Estudar este conceito</button>`:''}${t.count?`<button data-topic-bank="${esc(t.id)}">Praticar questões deste tópico</button>`:''}</article>`).join('')}</details>`:''}).join('')||'<p class="muted">Nenhum tópico neste filtro.</p>';
  document.querySelectorAll('[data-topic-concept]').forEach(b=>b.onclick=()=>beginLearning(20,'',b.dataset.topicConcept));
  document.querySelectorAll('[data-topic-bank]').forEach(b=>b.onclick=()=>{filter={search:'',subject:'',kind:'',exam:'',topicId:b.dataset.topicBank};location.hash='questoes'});
 };
 $('#topicSearch').oninput=update;$('#topicStatus').onchange=update;update();
}

async function offlineReadyUI(){const el=$('#offlineReady');if(!el)return;if(!('serviceWorker' in navigator)){el.textContent='Este navegador não oferece preparo offline.';return}try{const registration=await navigator.serviceWorker.ready;const cache=await caches.open('ppmt-2.15.0');const prepared=registration.active?.scriptURL.includes('sw.js?v=2.15.0')&&await cache.match('./app.js?v=2.15.0')&&await cache.match('./assets/vendor/supabase-2.117.2.js');if(el.isConnected)el.textContent=prepared?'Arquivos preparados para estudar offline neste aparelho.':'Preparando arquivos. Mantenha o app aberto com internet.'}catch{if(el.isConnected)el.textContent='Não foi possível confirmar o preparo offline. Tente novamente com internet.'}}

if('serviceWorker' in navigator)navigator.serviceWorker.addEventListener('controllerchange',offlineReadyUI);

let newsRequestId=0;
async function renderConcursoNews(){
 const requestId=++newsRequestId;
 $('#content').innerHTML=title('Notícias do concurso','Consultando a última atualização…')+'<p class="muted" role="status">Carregando publicações oficiais.</p>';
 const result=await loadNewsFeed();
 if(tab!=='noticias'||requestId!==newsRequestId)return;
 $('#content').innerHTML=newsPageHTML(result);
 $('#refreshNews').onclick=()=>renderConcursoNews();
 const filter=$('#newsKind');if(filter)filter.onchange=()=>{$('#newsItems').innerHTML=newsItemsHTML(result.feed,filter.value)};
}

function renderFreeTraining(){
 ensureProgram();const f=store.program.freeTraining;
 if(!f){
  const summary=store.program.freeSummary;
  if(summary){
   $('#content').innerHTML=title('Treino encerrado','Seu esforço ficou registrado.')+`<section class="card"><div class="stats free-stats"><div><small>Respondidas</small><strong>${summary.total}</strong></div><div><small>Acertos</small><strong>${summary.correct}</strong></div><div><small>Erros</small><strong>${summary.wrong}</strong></div></div><p>${summary.rate===null?'Você encerrou sem responder.':`Taxa de acerto: ${summary.rate}% · ${summary.guessed} resposta(s) com chute ou dúvida.`}</p>${summary.subjects.some(s=>s.reinforce)?`<h2>Onde reforçar</h2><ul class="free-summary-subjects">${summary.subjects.filter(s=>s.reinforce).slice(0,4).map(s=>`<li><b>${esc(s.name)}</b><span>${s.reinforce} erro(s) ou dúvida(s) em ${s.total} resposta(s)</span></li>`).join('')}</ul>`:'<p class="muted">Os acertos entram como prática. A retenção será conferida em outro dia.</p>'}<p class="muted">Erros e dúvidas ficam registrados para revisão. ${summary.xp} XP obtidos nesta sessão.</p><div class="actions"><button id="freeNew" class="primary">Novo treino</button><a class="button secondary" href="#erros">Revisar</a><a class="button secondary" href="#estudar">Voltar ao estudo</a></div></section>`;
   $('#freeNew').onclick=()=>{delete store.program.freeSummary;save();renderFreeTraining()};return;
  }
  const prefs=store.program.freePrefs||{subjects:[],errorsOnly:false};
  $('#content').innerHTML=title('Treino livre','Questões das matérias da PP-MT, misturadas para você praticar no seu ritmo.')+`<section class="card"><h2>Comece e vá até onde quiser</h2><p class="muted">Correção na hora, explicação e próxima questão. Primeiro vêm as questões que você ainda não respondeu.</p><button id="freeStart" class="primary today-primary">Começar treino livre</button><details class="compact-details spaced"><summary>Escolher matérias e filtros</summary><fieldset class="free-subjects"><legend>Matérias · sem marcar, mistura todas</legend>${subjects().map(subject=>`<label><input type="checkbox" name="freeSubject" value="${esc(subject)}" ${prefs.subjects.includes(subject)?'checked':''}><span>${esc(subject)}</span></label>`).join('')}</fieldset><label class="free-checkbox"><input type="checkbox" id="freeErrorsOnly" ${prefs.errorsOnly?'checked':''}><span>Somente questões com erro ou dúvida na última resposta</span></label></details><p class="muted">Ao percorrer o acervo selecionado, começa uma nova rodada. Os erros vão para a revisão; o bloco do seu plano continua disponível.</p></section><a class="button secondary spaced" href="#estudar">Voltar ao estudo guiado</a>`;
  $('#freeStart').onclick=()=>{
   const prefs={subjects:[...document.querySelectorAll('[name=freeSubject]:checked')].map(e=>e.value),errorsOnly:$('#freeErrorsOnly').checked};
   if(!freeTrainingPool(bank(),store.attempts,prefs).length){toast(prefs.errorsOnly?'Não há erros ou dúvidas nessas matérias. Desmarque o filtro para treinar outras questões.':'Não há questões disponíveis para esse filtro.');return}
   store.program.freePrefs=prefs;store.program.freeTraining=nextFreeQuestion(createFreeTraining(prefs),bank(),store.attempts);delete strikeState[store.program.freeTraining.currentId];delete assistState[store.program.freeTraining.currentId];studyTracker.paused=false;noteStudyActivity();save();renderFreeTraining();
  };return;
 }
 const stats=freeTrainingSummary(store.attempts,f),q=bank().find(q=>q.id===f.currentId&&!q.historicalOnly);
 if(!q){
  const next=nextFreeQuestion(f,bank(),store.attempts);
  if(next.currentId){store.program.freeTraining=next;save();renderFreeTraining();return}
  $('#content').innerHTML=title('Você percorreu o filtro','Não há mais questões com erro ou dúvida dentro desta seleção.')+`<section class="card"><p>${stats.total} questão(ões) respondida(s) nesta sessão.</p><button id="freeFinish" class="primary">Ver resumo e encerrar</button><button id="freeAll" class="secondary spaced">Continuar com todas as questões</button></section>`;
  $('#freeFinish').onclick=finishFreeTraining;$('#freeAll').onclick=()=>{f.prefs.errorsOnly=false;store.program.freeTraining=nextFreeQuestion(f,bank(),store.attempts);save();renderFreeTraining()};return;
 }
 selection=f.selected;answered=f.answered;
 $('#content').innerHTML=title('Treino livre','Pratique no seu ritmo. Seu estudo guiado continua salvo.')+`<div class="free-session-bar"><span>Questão ${stats.total+(f.answered?0:1)} · rodada ${f.cycle}</span><span>${stats.correct} acerto(s) / ${stats.total} respondida(s)</span></div>${f.cycle>1?'<p class="muted">O acervo selecionado já foi percorrido. Esta rodada inclui repetições.</p>':''}<div id="freeQuestion">${questionHTML(q,false)}</div><div class="free-controls spaced">${f.answered?'<button id="freeNext" class="primary">Próxima questão →</button>':'<p class="muted">Toque na alternativa para conferir a resposta.</p>'}<div class="actions"><button id="freePause" class="secondary">Pausar e voltar depois</button><button id="freeFinish" class="secondary">Encerrar e ver resumo</button></div></div>`;
 document.querySelectorAll('[data-option]').forEach(b=>{
  const activate=async()=>{
   if(f.answered||b.getAttribute('aria-disabled')==='true'||b.classList.contains('struck'))return;
   if(!await allowStudy('question',1))return;
   const selected=Number(b.dataset.option),correct=selected===q.answer;f.selected=selected;f.answered=true;
   const assist=assistFor(q.id),gain=applyQuestionXP(q,correct);
   store.attempts.push({id:q.id,subject:q.subject,selected,correct,at:new Date().toISOString(),mode:'free-training',freeSession:f.id,assists:[...assist.used],assistXp:assist.spent||0,xpAwarded:gain,difficulty:questionDifficulty(q).key,weight:questionWeight(q)});
   answerSounds.play(correct);save();renderFreeTraining();
  };
  b.onclick=e=>{e.preventDefault();activate()};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate()}};
 });
 $('#favorite').onclick=()=>{toggleFavorite(q.id);renderFreeTraining()};bindTacticalHelp(q);
 $('#guessed')?.addEventListener('click',()=>{const a=[...store.attempts].reverse().find(a=>a.id===q.id&&a.freeSession===f.id);if(a){a.guessed=true;save();toast('Dúvida registrada para revisão.')}});
 $('#freeNext')?.addEventListener('click',()=>{store.program.freeTraining=nextFreeQuestion(f,bank(),store.attempts);const id=store.program.freeTraining.currentId;if(id){delete strikeState[id];delete assistState[id]}save();renderFreeTraining();window.scrollTo({top:0,behavior:'smooth'})});
 $('#freePause').onclick=()=>{studyTracker.paused=true;save();location.hash='estudar'};
 $('#freeFinish').onclick=finishFreeTraining;
}
function finishFreeTraining(){
 const f=store.program.freeTraining;if(!f)return;
 store.program.freeSummary={...freeTrainingSummary(store.attempts,f),endedAt:new Date().toISOString()};delete store.program.freeTraining;studyTracker.paused=true;selection=null;answered=false;save();renderFreeTraining();window.scrollTo({top:0,behavior:'smooth'});
}
