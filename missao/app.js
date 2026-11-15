/* Missão Farda 3 — progresso local, estudo gradual e somente provas PMMG. */
"use strict";
(function(){
const DB=window.EXAM_BANK,C=window.MFCore;
if(!DB||!C){document.body.textContent="Não foi possível carregar o banco de provas. Atualize a página com internet.";return;}
const $=id=>document.getElementById(id),DAY=C.dayDate(),IDS=new Set(DB.questions.map(q=>q.id)),QUESTION=new Map(DB.questions.map(q=>[q.id,q]));
const LEGACYKEY="missao-farda-pmmg-state-v3:"+window.MFAccount.id,PROFILEKEY="missao-farda-pmmg-legacy-owner:"+window.MFAccount.id;
const PROFILES={luanderson:"Luanderson",jackeline:"Jackeline Santana"};
let activeProfile=null,STATEKEY=null;
const TOPICS={"Português": ["Interpretação de textos", "Sentidos e figuras de linguagem", "Classes de palavras e formação de palavras", "Concordância, regência e crase", "Pontuação e colocação pronominal", "Ortografia e acentuação"], "Literatura": ["Obras literárias cobradas em cada edição", "Narrador, personagens e construção do espaço", "Contexto e linguagem literária"], "Inglês": ["Leitura e interpretação de textos", "Vocabulário em contexto", "Relações entre frases e ideias"], "Noções de Direito e Direitos Humanos": ["Constituição Federal e direitos fundamentais", "Segurança pública e organização do Estado", "Declaração Universal dos Direitos Humanos", "Convenção Americana sobre Direitos Humanos"], "Raciocínio Lógico-Matemático": ["Proporções, porcentagens e regra de três", "Lógica e proposições", "Conjuntos e análise combinatória", "Geometria", "Probabilidade e estatística"], "Direito Penal": ["Crime e ilicitude", "Crimes e aplicação da lei penal"], "Direito Constitucional": ["Direitos e garantias fundamentais", "Organização do Estado e segurança pública"], "Direito Penal Militar": ["Crimes militares", "Extinção da punibilidade"], "Direitos Humanos": ["Declarações e convenções de direitos humanos", "Direitos e garantias"], "Legislação Extravagante": ["Normas indicadas na edição de 2021", "Leitura da lei e aplicação em situações concretas"], "Estatística": ["Probabilidade", "Leitura de tabelas e gráficos", "Média, mediana e distribuições"]};
const LESSONS={"Português": {"title": "Comece pela base de Português", "intro": "Leia o comando antes das alternativas e identifique se ele pede a opção correta ou a incorreta. Volte ao texto para conferir sua interpretação.", "steps": ["Interpretação de textos", "Sentidos e figuras de linguagem", "Classes de palavras e formação de palavras", "Concordância, regência e crase", "Pontuação e colocação pronominal", "Ortografia e acentuação"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Direito Penal": {"title": "Comece pela base de Direito Penal", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Crime e ilicitude", "Crimes e aplicação da lei penal"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Direito Constitucional": {"title": "Comece pela base de Direito Constitucional", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Direitos e garantias fundamentais", "Organização do Estado e segurança pública"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Direito Penal Militar": {"title": "Comece pela base de Direito Penal Militar", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Crimes militares", "Extinção da punibilidade"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Direitos Humanos": {"title": "Comece pela base de Direitos Humanos", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Declarações e convenções de direitos humanos", "Direitos e garantias"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Legislação Extravagante": {"title": "Comece pela base de Legislação Extravagante", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Normas indicadas na edição de 2021", "Leitura da lei e aplicação em situações concretas"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Estatística": {"title": "Comece pela base de Estatística", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Probabilidade", "Leitura de tabelas e gráficos", "Média, mediana e distribuições"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Literatura": {"title": "Comece pela base de Literatura", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Obras literárias cobradas em cada edição", "Narrador, personagens e construção do espaço", "Contexto e linguagem literária"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Inglês": {"title": "Comece pela base de Inglês", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Leitura e interpretação de textos", "Vocabulário em contexto", "Relações entre frases e ideias"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Noções de Direito e Direitos Humanos": {"title": "Comece pela base de Noções de Direito e Direitos Humanos", "intro": "Use os assuntos desta disciplina para orientar sua revisão. Confira o programa do próximo edital e a edição de cada questão.", "steps": ["Constituição Federal e direitos fundamentais", "Segurança pública e organização do Estado", "Declaração Universal dos Direitos Humanos", "Convenção Americana sobre Direitos Humanos"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}, "Raciocínio Lógico-Matemático": {"title": "Comece pela base de Raciocínio Lógico-Matemático", "intro": "Escreva os dados, identifique o que a questão pede e faça as contas por etapas. Porcentagem é uma parte de 100; uma fração pode ser calculada dividindo pelo denominador e multiplicando pelo numerador.", "steps": ["Proporções, porcentagens e regra de três", "Lógica e proposições", "Conjuntos e análise combinatória", "Geometria", "Probabilidade e estatística"], "practice": "Escolha uma sessão curta de questões reais da PMMG e confira os textos e figuras originais antes de responder."}};

const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const defaultState=()=>({version:3,progress:{},events:[],sessions:[],topics:{},essay:"",essayWeek:"",settings:{goal:5,timer:"off",favorites:[]},session:null});
function loadProfile(id){
const canMigrate=!read(PROFILEKEY)&&!read(STATEKEY);
let state=read(STATEKEY)||(canMigrate?read(LEGACYKEY):null)||defaultState();
const old=read("missao-farda-pmmg-progress-v1");
if(canMigrate&&!read(LEGACYKEY)&&old&&typeof old==="object"){
 for(const [id,p] of Object.entries(old))if(IDS.has(id)&&p&&typeof p==="object"){
 state.progress[id]={...p,due:p.due||C.dayShift(p.day||DAY,p.correct===false?1:3),successStreak:p.correct?1:0};
 if(p.correct!==null&&"ABCD".includes(p.answer||"")){
 const q=QUESTION.get(id);state.events.push({id,day:p.day||DAY,at:Number(p.at)||Date.now(),answer:p.answer,correct:p.correct,exam:q.exam,subject:C.subjectGroup(q)});
 }
 }
 const oldSession=read("missao-farda-pmmg-session-v1");
 if(oldSession&&Array.isArray(oldSession.ids)&&oldSession.ids.length&&oldSession.ids.every(id=>IDS.has(id))&&oldSession.exam in DB.exams&&!oldSession.finished)
 state.session={...oldSession,grading:oldSession.grading||"practice",kind:"daily",started:oldSession.created||Date.now(),reviewing:false,finished:false};
}
state={...defaultState(),...state};
state.progress=C.cleanHistory(state.progress,IDS);
state.events=Array.isArray(state.events)?state.events.filter(e=>e&&typeof e==="object"&&IDS.has(e.id)).slice(-12000):[];
state.sessions=Array.isArray(state.sessions)?state.sessions.filter(s=>s&&typeof s==="object").slice(-500):[];
if(!state.topics||typeof state.topics!=="object")state.topics={};
if(!state.settings||typeof state.settings!=="object")state.settings={goal:5,timer:"off"};
if(state.session&&(!Array.isArray(state.session.ids)||state.session.ids.some(id=>!IDS.has(id))||!DB.exams[state.session.exam]&&state.session.exam!=="all"))state.session=null;
return state;
}
let state=defaultState();
let activeTab="home",countdown=null,remaining=0,timerPaused=false,toastTimeout=null,readerOpenKey=null;
let syncClient=null;
let performancePanel='general';
function save(){if(!activeProfile)return false;try{
 if(window.MFSync)window.MFSync.touch(state,read(STATEKEY)?._sync?read(STATEKEY):defaultState());
 localStorage.setItem(STATEKEY,JSON.stringify(state));syncClient?.schedule();return true;}catch{toast("Armazenamento do navegador indisponível: exporte um backup dos seus dados.");return false;}}
function chooseProfile(id){
 if(!Object.hasOwn(PROFILES,id))return;
 if(activeProfile&&!save())return;
 syncClient?.stop();timerStop();remaining=0;timerPaused=false;readerOpenKey=null;
 activeProfile=id;STATEKEY=LEGACYKEY+"-"+id;state=loadProfile(id);
 performancePanel='general';$('performance-filter-name').value='';
 if(save())try{if(!read(PROFILEKEY))localStorage.setItem(PROFILEKEY,JSON.stringify(id));}catch{}
 $("active-profile-name").textContent=PROFILES[id];
 $("active-profile-avatar").src="./avatares/"+id+".webp";$("active-profile-avatar").hidden=false;
 document.querySelectorAll("[data-profile]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.profile===id)));
 $("profile-picker").hidden=true;$("main").inert=false;
 $("timer-setting").value=state.settings.timer||"off";$("timer-setting").disabled=false;$("timer-box").hidden=true;$("timer-toggle").textContent="Pausar";
 $("exam").value="pmmg2024";$("mode").value="daily";$("subject").value="all";$("grading").value="practice";$("quantity").value=String(state.settings.goal||5);fillSubjects();renderSources();
 renderHome();renderTraining();renderPath();renderInsights();show("home");
 $("switch-profile").focus();
 syncClient?.start(id);updateSyncCode();if(state.session&&!state.session.finished)timerStart();
}
function updateSyncCode(){const code=syncClient?.getCode();$("sync-code").value=code||"";$("sync-connect-code").value="";}
function initSync(){
 syncClient={schedule(){window.MFAccount.saveProfile(activeProfile,state)},start(){window.MFAccount.saveProfile(activeProfile,state)},stop(){},pump(){window.MFAccount.pull()},getCode(){return ''}};
 window.MFAccount.onIncoming=profiles=>{
  for(const [id,incoming] of Object.entries(profiles||{})){
   const key=LEGACYKEY+'-'+id,previous=read(key)||defaultState();
   localStorage.setItem(key,JSON.stringify(window.MFSync.merge(previous,incoming)));
  }
  if(activeProfile){state=loadProfile(activeProfile);if(document.activeElement!==$('essay'))renderAll();}
 };
 const install=$('install-app'),installation=window.MFAccount.installationState();install.hidden=installation.installed!==false;install.setAttribute('aria-label',installation.label||'Instalar aplicativo');install.onclick=()=>window.MFAccount.install();
 window.addEventListener('appinstalled',()=>{install.hidden=true;});
 $('account-settings').onclick=()=>{const panel=$('legacy-settings');panel.hidden=!panel.hidden;$('account-settings').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){renderLegacySettings();panel.scrollIntoView?.({behavior:'smooth',block:'start'});$('close-legacy-settings').focus();}};
 $('close-legacy-settings').onclick=()=>{$('legacy-settings').hidden=true;$('account-settings').setAttribute('aria-expanded','false');$('account-settings').focus();};
 $('legacy-sound').onclick=()=>{window.MFAccount.setSound(window.MFAccount.preferences().sound===false);renderLegacySettings();};
 document.querySelectorAll('[data-legacy-tool]').forEach(button=>{button.onclick=()=>window.MFAccount.openTool(button.dataset.legacyTool);});
 $('account-signout').onclick=()=>window.MFAccount.logout();
 window.addEventListener('online',()=>syncClient.pump());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncClient.pump()});
}

function renderLegacySettings(){
 const prefs=window.MFAccount.preferences(),routine=prefs.profile;
 $('legacy-sound').textContent=prefs.sound===false?'Som desligado':'Som ligado';$('legacy-sound').setAttribute('aria-pressed',String(prefs.sound!==false));
 $('legacy-settings-summary').textContent=(routine?'Rotina salva: '+(routine.schedule==='shift'?'escala 12×36':routine.minutes+' minutos nos dias escolhidos')+(routine.time?' · '+routine.time:'')+'. ':'')+(Number(prefs.xp)||0)+' XP · '+Math.floor((Number(prefs.seconds)||0)/60)+' minutos de estudo registrados.';
}
function openProfiles(){
 $("profile-picker").hidden=false;$("main").inert=true;
 const legacy=read(LEGACYKEY)||read("missao-farda-pmmg-progress-v1");
 $("profile-migration-note").hidden=!!read(PROFILEKEY)||!legacy;
 $("profile-cancel").hidden=!activeProfile;
 $("profile-luanderson").focus();
}
function toast(message){const el=$("toast");el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{el.hidden=true;},3900);}
function el(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;}
function add(parent,tag,cls,txt){const x=el(tag,cls,txt);parent.appendChild(x);return x;}
function button(label,cls,callback){const b=el("button",cls,label);b.type="button";b.addEventListener("click",callback);return b;}
function link(label,href,cls=""){const a=el("a",cls,label);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a;}
function visible(view){document.querySelectorAll("[data-tab]").forEach(x=>{const on=x.dataset.tab===view;x.classList.toggle("active",on);if(on)x.setAttribute("aria-current","page");else x.removeAttribute("aria-current");});for(const id of ["home","train","path","insights"])$("view-"+id).hidden=id!==view;activeTab=view;window.scrollTo({top:0,behavior:"instant"});}
function show(view){visible(view);renderAll();}
function currentSession(){return state.session&&Array.isArray(state.session.ids)?state.session:null;}
function sessionItems(){return (currentSession()?.ids||[]).map(id=>QUESTION.get(id)).filter(Boolean);}
function reviewItems(){const s=currentSession();return s?.finished&&s.reviewing&&Array.isArray(s.reviewIds)?sessionItems().filter(q=>s.reviewIds.includes(q.id)):sessionItems();}
function sessionMistakes(){const s=currentSession();return sessionItems().filter(q=>C.isValid(q)&&s.picks[q.id]&&s.checked[q.id]&&s.picks[q.id]!==q.key);}
function outstandingMistakes(){return DB.questions.filter(q=>C.isValid(q)&&state.progress[q.id]?.correct===false);}
function openSessionReview(onlyErrors=false){
 const s=currentSession();if(!s)return;
 const wrong=sessionMistakes();if(onlyErrors&&!wrong.length){toast('Nenhum erro neste treino.');return;}
 if(s.finished){s.reviewing=true;s.reviewIds=onlyErrors?wrong.map(q=>q.id):null;s.index=0;}
 else if(onlyErrors)s.index=s.ids.indexOf(wrong[0].id);
 save();show('train');
}
function reviewNow(){
 if(sessionMistakes().length){openSessionReview(true);return;}
 sessionNew({kind:'mistakes',exam:'all',subject:'all',count:5,grading:'practice'});
}
function totalEvents(){return state.events.filter(e=>e&&"ABCD".includes(e.answer||"")&&!QUESTION.get(e.id)?.annulled);}
function getDue(){return C.progressCount(state.progress,DB.questions,DAY).due;}
function lastDate(){const d=state.events.map(x=>x.day).sort();return d.at(-1)||null;}
function percent(n,d){return d?Math.round(n/d*100):0;}
function meter(id,percentage){$(id).style.width=Math.max(0,Math.min(100,percentage))+"%";}
function weekGrid(target){const activity=C.weeklyActivity(state.events,DAY),names=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];target.replaceChildren();activity.forEach(d=>{const date=new Date(d.day+"T12:00:00Z"),box=el("div","week-day");const b=add(box,"b",d.count?"done":"",d.count?String(d.count):"·");b.title=d.count+" tentativa(s) em "+d.day;add(box,"small","",names[date.getUTCDay()]);target.appendChild(box);});}
function upcoming(){ $("days-left").textContent="Confira o próximo edital no CRS/PMMG";$("path-days").textContent="A confirmar";}
function getWeeklyCount(){return new Set(C.weeklyActivity(state.events,DAY).filter(x=>x.count).map(x=>x.day)).size;}
function renderHome(){
 const events=totalEvents(),score=C.score(events,DB.questions),seen=C.progressCount(state.progress,DB.questions,DAY),week=getWeeklyCount();
 $("home-answered").textContent=String(score.attempts);
 $("home-accuracy").textContent=score.percent===null?"—":score.percent+"%";
 $("unique-done").textContent=seen.seen+"/"+DB.questions.length;meter("seen-meter",percent(seen.seen,DB.questions.length));
 $("today-count").textContent=String(events.filter(e=>e.day===DAY).length);
 $("due-count").textContent=String(getDue());
 $("weeks-active").textContent=week+"/7";
 $("phase").textContent=C.phase(events.length,C.daysBetween(DAY,C.DEFAULT_EXAM_DATE));
 const mistakes=outstandingMistakes(),dates=mistakes.map(q=>state.progress[q.id].due).filter(Boolean).sort();
 $('home-review-text').textContent=mistakes.length?mistakes.length+' erro(s) para reforçar.':getDue()?getDue()+' revisão(ões) programada(s) para hoje.':'Nenhuma revisão pendente.';
 $('review-schedule').textContent=getDue()?getDue()+' revisão(ões) programada(s) para hoje.':dates[0]?'Próxima revisão programada: '+dates[0].split('-').reverse().join('/')+'.':'As próximas revisões aparecem após o treino.';
 $('review-shortcut').hidden=!mistakes.length&&!getDue();
 $('review-shortcut').textContent=mistakes.length?'Rever meu erro agora':'Fazer revisão de hoje';
 const last=lastDate(),gap=last?C.daysBetween(last,DAY):null;
 $("greeting").textContent=gap!==null&&gap>=2?"Um recomeço pequeno já vale.":events.length===0?"Começar é só resolver uma questão.":"Mais um passo na sua preparação.";
 const ongoing=currentSession()&&!currentSession().finished;
 $("daily-copy").textContent=ongoing?"Seu treino está salvo. Continue de onde parou.":"Escolha seu ritmo e resolva uma questão de cada vez.";
 $("daily-start").textContent=ongoing?"Continuar treino":"Começar treino";
 $("resume").hidden=true;
 document.querySelector('.micro-goal').hidden=!!ongoing;
 $("week-tip").textContent="Sugestão de hoje: "+C.nextSubject(DAY)+". Você pode mudar de matéria sempre que precisar.";
 weekGrid($("week-calendar"));upcoming();
 const chosen=Number(state.settings.goal)||5;
 document.querySelectorAll("[data-goal]").forEach(b=>{const active=+b.dataset.goal===chosen;b.classList.toggle("selected",active);b.setAttribute("aria-pressed",String(active));});
}
function renderSources(){
 const exam=DB.exams[$("exam").value]||DB.exams.pmmg2024;
 const full=$('mode').querySelector('[value="full"]');full.disabled=!!exam.complementary;full.hidden=!!exam.complementary;
 if(exam.complementary&&$('mode').value==='full')$('mode').value='daily';
 $('exam-selection-note').hidden=!exam.complementary;$('exam-selection-note').textContent=exam.complementary?exam.includedCount+' questões selecionadas de '+exam.originalTotal+'. Treino complementar; não é a prova completa. Gabarito publicado na época, sem confirmação da versão após recursos.':'';
 $("exam-note").textContent=exam.note;
 $("paper-link").href=exam.source;
 $("paper-link").textContent="PDF da prova original ↗";
 $("key-link").href=exam.keySource||exam.source;
}
function fillSubjects(){const exam=$("exam").value,old=$("subject").value;
 const subjects=Array.from(new Set(DB.questions.filter(q=>q.exam===exam).map(q=>C.subjectGroup(q))));
 $("subject").replaceChildren();const a=el("option","","Todas as disciplinas");a.value="all";$("subject").appendChild(a);
 C.GROUPS.filter(s=>subjects.includes(s)).forEach(s=>{const o=el("option","",s);o.value=s;$("subject").appendChild(o);});
 $("subject").value=subjects.includes(old)?old:"all";
}
function timerStop(){if(countdown){clearInterval(countdown);countdown=null;}}
function timerDraw(){if(remaining<=0){timerStop();$("timer-display").textContent="00:00";toast("Seu tempo de foco acabou. Pode continuar ou fazer uma pausa.");return;}
 $("timer-display").textContent=String(Math.floor(remaining/60)).padStart(2,"0")+":"+String(remaining%60).padStart(2,"0");}
function timerStart(reset=false){
 timerStop();$('timer-setting').disabled=false;$('timer-toggle').disabled=false;$('timer-reset').disabled=false;const option=$('timer-setting').value;state.settings.timer=option;
 const session=currentSession();$('timer-box').hidden=option==='off'||!session||session.finished;
 if(option==='off'||!session||session.finished)return;
 const exam=session.grading==='exam',now=Date.now();
 if(reset||!session.clock||session.clock.option!==option)session.clock={option,remaining:Number(option)*60,deadline:exam?now+Number(option)*60000:null,paused:false};
 const clock=session.clock;timerPaused=exam?false:!!clock.paused;
 remaining=exam?Math.max(0,Math.ceil((clock.deadline-now)/1000)):Math.max(0,Number(clock.remaining)||0);
 $('timer-toggle').disabled=exam;$('timer-reset').disabled=exam;$('timer-setting').disabled=exam;
 const expire=()=>{sessionItems().forEach(q=>{if(!session.checked[q.id]&&(session.picks[q.id]||q.annulled))gradeOne(q)});finish();toast('Tempo do simulado encerrado. Suas respostas foram salvas.');};
 if(exam&&remaining<=0){expire();return;}
 $('timer-toggle').textContent=exam?'Tempo da prova':timerPaused?'Continuar':'Pausar';timerDraw();save();let ticks=0;
 countdown=setInterval(()=>{
  if(!timerPaused){remaining=exam?Math.max(0,Math.ceil((clock.deadline-Date.now())/1000)):Math.max(0,remaining-1);clock.remaining=remaining;if(exam&&remaining<=0){expire();return;}timerDraw();if(++ticks%15===0)save();}
 },1000);
}

async function sessionNew(options={}){
 const requestedProfile=activeProfile;
 const old=currentSession();
 if(old&&!old.finished&&Object.keys(old.picks||{}).length&&!options.force){
  if(!window.confirm("Você tem um treino em andamento. Começar outro vai substituir a sessão aberta. As respostas já corrigidas continuarão no histórico. Continuar?"))return;
 }
 const kind=options.kind||$("mode").value;
 const grading=kind==="full"||kind==="diagnostic"?"exam":options.grading||$("grading").value;
 const exam=kind==="diagnostic"?"pmmg2024":options.exam||$("exam").value||"pmmg2024";
 if(kind==='full'&&DB.exams[exam]?.complementary){toast('Esta edição contém um recorte complementar. Escolha um treino de questões selecionadas.');return;}
 const subject=kind==="diagnostic"||kind==="full"?"all":options.subject||$("subject").value||"all";
 const count=kind==="diagnostic"?10:kind==="full"?DB.questions.filter(q=>q.exam===exam).length:Number(options.count||$("quantity").value||5);
 const candidates=kind==='favorites'?DB.questions.filter(q=>(state.settings.favorites||[]).includes(q.id)):kind==='mistakes'?outstandingMistakes():DB.questions;
 const list=C.choose(candidates,state.progress,{kind:['favorites','mistakes'].includes(kind)?'daily':kind,exam,subject,count,today:DAY,excludeAnnulled:kind!=='full'});
 if(!list.length){toast(kind==="review"?"Ainda não há revisões vencidas. Faça um treino de questões novas.":"Não há questões disponíveis neste filtro. Tente outra disciplina ou edição.");show("train");return;}
 if(!await window.MFAccount.allow(grading==='exam'?'exam':'block',list.filter(C.isValid).length)){return;}
 if(activeProfile!==requestedProfile)return;
 readerOpenKey=null;
 state.session={ids:list.map(q=>q.id),index:0,picks:{},checked:{},finished:false,reviewing:false,kind,exam,subject,grading,started:Date.now(),finishedAt:null};
 if(DB.exams[exam])$("exam").value=exam;
 fillSubjects();$("subject").value=subject;save();timerStart(true);show("train");
}
function sourceURL(q){return DB.exams[q.exam].source;}
function gradeOne(q){
 if(!q||!currentSession()||currentSession().checked[q.id])return;
 const s=state.session,choice=s.picks[q.id]||"";
 if(!choice&&!q.annulled)return;
 s.checked[q.id]=true;
 const previous=state.progress[q.id];
 const result=C.grade(q,choice,previous,DAY,previous?.reason||"");
 state.progress[q.id]=result;
 if(result.correct!==null)state.events.push({id:q.id,day:DAY,at:result.at,answer:choice,correct:result.correct,exam:q.exam,subject:C.subjectGroup(q)});
 save();
 if(s.grading==='practice'&&typeof result.correct==='boolean')window.MFAccount.answerFeedback(result.correct);
}
function gradeAll(){
 const s=currentSession();if(!s||s.finished)return;
 const blanks=sessionItems().filter(q=>!q.annulled&&!s.picks[q.id]).length;
 if(blanks&&!window.confirm("Há "+blanks+" questão(ões) em branco. Elas serão exibidas no resultado como não respondidas. Finalizar?"))return;
 sessionItems().forEach(q=>{if(!s.checked[q.id]&&(s.picks[q.id]||q.annulled))gradeOne(q);});
 finish();
}
function finish(){
 const s=currentSession();if(!s||s.finished)return;
 s.finished=true;s.reviewing=false;s.finishedAt=Date.now();
 const scored=sessionItems().filter(q=>!q.annulled&&q.key),correct=scored.filter(q=>s.picks[q.id]&&s.picks[q.id]===q.key).length;
 state.sessions.push({at:s.finishedAt,day:DAY,kind:s.kind,exam:s.exam,total:scored.length,correct,responded:scored.filter(q=>!!s.picks[q.id]).length});
 state.sessions=state.sessions.slice(-500);
 timerStop();$("timer-setting").disabled=false;$("timer-toggle").disabled=false;$("timer-reset").disabled=false;save();renderAll();
}
function outcome(){
 const s=currentSession();if(!s)return null;
 const items=sessionItems(),valid=items.filter(q=>!q.annulled&&q.key);
 return {total:items.length,valid:valid.length,correct:valid.filter(q=>s.picks[q.id]===q.key).length,responded:valid.filter(q=>!!s.picks[q.id]).length,annulled:items.filter(q=>q.annulled).length,graded:items.filter(q=>s.checked[q.id]).length};
}
function showSessionResult(area){
 const s=currentSession(),result=outcome();
 $("question-chip").textContent="TREINO CONCLUÍDO";$("question-counter").textContent=result.total+" questões";
 $("question-meta").textContent="Resultado desta sessão · prova(s) da PMMG";
 const title=add(area,"h2","question-title",result.correct+" acerto(s) em "+result.valid+" questão(ões) válidas");
 add(area,"p","dim","Você concluiu seu treino. O que importa agora é descobrir o que revisar, e não buscar uma nota perfeita no primeiro dia.");
 const cards=add(area,"div","metric-grid");cards.style.margin="18px 0";
 for(const [number,label] of [[result.correct,"Acertos"],[result.responded-result.correct,"Erros"],[result.valid-result.responded,"Em branco"],[result.annulled,"Anuladas"]]){
 const card=add(cards,"div","mini-card");add(card,"strong","",number);add(card,"span","",label);
 }
 const p=add(area,"p","support-note","Acerto nas questões corrigíveis: "+(result.valid?percent(result.correct,result.valid)+"%":"—")+". Questões sem gabarito confirmado não entram na nota. Esta taxa não prevê aprovação.");
 const actions=add(area,"div","source-links");
 if(sessionMistakes().length)actions.appendChild(button('Revisar só os erros','primary',()=>openSessionReview(true)));
 actions.appendChild(button("Revisar minhas respostas","outline",()=>openSessionReview(false)));
 actions.appendChild(button("Fazer outra sessão","outline light",()=>sessionNew({kind:"daily",exam:s.exam,subject:"all",count:5})));
 actions.appendChild(button("Ir para meu painel","ghost",()=>show("insights")));
 const last=add(area,"p","fine","Se já foi suficiente por hoje, pode encerrar aqui. Sua sessão foi salva.");
}
function renderQuestion(){
 const area=$("question-area");area.replaceChildren();
 $('feedback').hidden=true;
 const s=currentSession();
 if(!s){$("question-chip").textContent="PMMG · PROVAS REAIS";$("question-counter").textContent="";$("question-meta").textContent="Selecione uma edição e um treino.";
 const empty=add(area,"div","empty-state");add(empty,"div","empty-mark","▤");add(empty,"h2","","Seu treino começa aqui");add(empty,"p","","Escolha uma edição da PMMG. Você responderá às questões reais usando o caderno oficial como referência.");
 $("question-actions").hidden=true;$("question-numbers-wrap").hidden=true;meter("quiz-meter",0);return;}
 if(s.finished&&!s.reviewing){
 $("question-actions").hidden=true;$("question-numbers-wrap").hidden=true;meter("quiz-meter",100);
 showSessionResult(area);return;}
 const items=reviewItems();if(!items.length){if(s.finished){s.reviewing=false;save();renderQuestion();return;}state.session=null;save();renderQuestion();return;}
 s.index=Math.max(0,Math.min(items.length-1,Number(s.index)||0));
 const q=items[s.index],info=DB.exams[q.exam],chosen=s.picks[q.id]||"",graded=!!s.checked[q.id]&&s.grading==="practice"||!!s.finished;
 const moved=area.dataset.question!==q.id;area.dataset.question=q.id;
 $("question-chip").textContent="PMMG "+info.year+" · "+(info.complementary?'Treino complementar':info.board);
 $("question-counter").textContent=(s.reviewIds&&s.reviewing?'Erros · ':'')+(s.index+1)+" / "+items.length;
 $("question-meta").textContent=C.subjectGroup(q)+" · questão original nº "+q.number+" · "+(info.type||"caderno original");
 meter("quiz-meter",percent(items.filter(x=>s.checked[x.id]).length,items.length));
 const title=add(area,"h2","question-title","Questão "+q.number+" — "+C.subjectGroup(q));
 title.tabIndex=-1;
 add(area,"p","actual-question",q.text||"Enunciado em revisão.");
 function sourceImages(paths,label,opened){
  if(!paths?.length)return;
  const details=add(area,"details","source-passage");details.open=opened;
  add(details,"summary","",label);
  paths.forEach((src,i)=>{const figure=add(details,"figure","question-figure"),picture=add(figure,"img");picture.src=src;picture.loading="lazy";picture.alt=label+" · PMMG "+info.year+" · parte "+(i+1);});
 }
 sourceImages(q.supportImages,"Texto de apoio original",true);
 sourceImages(q.originalImages,"Questão original com destaques, tabelas e figuras",q.needsVisual);
 if(q.key===null&&!q.annulled){
  add(area,"p","question-note","Resposta salva sem nota: este caderno ainda não tem gabarito definitivo conferido nesta versão.");
 }
 if(q.annulled)add(area,"p","support-note","Questão oficialmente anulada. Ela não é contabilizada como acerto ou erro.");
 const tools=add(area,'div','legacy-question-tools');
 const favorites=state.settings.favorites||(state.settings.favorites=[]);
 tools.appendChild(button(favorites.includes(q.id)?'★ Favorita':'☆ Salvar', 'outline',()=>{const i=favorites.indexOf(q.id);if(i<0)favorites.push(q.id);else favorites.splice(i,1);save();renderQuestion()}));
 if(s.grading==='practice'||s.finished)tools.appendChild(button('💡 Entender o conteúdo','outline',()=>window.MFAccount.help(q.id,'base',chosen)));
 if(graded&&chosen&&chosen!==q.key&&!q.annulled)tools.appendChild(button('Explicar meu erro com IA','outline',()=>window.MFAccount.help(q.id,'ai',chosen)));
 add(area,"h3","subheading",graded?"Alternativas e correção":"Marque sua resposta (A a D)");
 add(area,"p","swipe-hint","Deslize uma alternativa para o lado para riscá-la. Repita para desfazer.");
 const opts=add(area,"div","answer-options");
 s.strikes=s.strikes||{};s.strikes[q.id]=s.strikes[q.id]||[];
 Object.keys(q.options).forEach(letter=>{
 const eliminated=(s.eliminated?.[q.id]||[]).includes(letter);
 const b=el("button","option");b.type="button";b.disabled=graded||eliminated;b.dataset.letter=letter;if(eliminated)b.classList.add("is-eliminated");
 const updateStrike=()=>{const struck=s.strikes[q.id].includes(letter)&&(!graded||q.key!==letter);b.classList.toggle("is-struck",struck);b.setAttribute("aria-label",letter+". "+q.options[letter]+(struck?". Alternativa riscada. Deslize novamente para desfazer.":""));};
 updateStrike();
 window.MFStrike?.bind(b,{blocked:()=>graded||eliminated,toggle:()=>{
  const list=s.strikes[q.id],i=list.indexOf(letter);if(i<0)list.push(letter);else list.splice(i,1);
  if(s.picks[q.id]===letter&&list.includes(letter)){delete s.picks[q.id];b.classList.remove("is-picked");b.setAttribute("aria-pressed","false");$("check").disabled=true;$("question-numbers")?.children[s.index]?.classList.remove("marked");}
  updateStrike();save();
 }});
 b.setAttribute("aria-pressed",String(chosen===letter));if(chosen===letter)b.classList.add("is-picked");
 if(graded&&!q.annulled&&q.key===letter)b.classList.add("correct");
 if(graded&&!q.annulled&&chosen===letter&&chosen!==q.key)b.classList.add("wrong");
 add(b,"span","letter",letter);add(b,"span","",q.options?.[letter]||"Alternativa "+letter+" — confira o caderno.");
 b.addEventListener("click",()=>{
 if(graded||eliminated||b.classList.contains("is-struck"))return;
 s.picks[q.id]=letter;save();
 opts.querySelectorAll(".option").forEach((option,i)=>{
  const picked="ABCD"[i]===letter;
  option.classList.toggle("is-picked",picked);
  option.setAttribute("aria-pressed",String(picked));
 });
 const action=$("check");
 if(action&&!s.finished)action.disabled=false;
 const navIndex=$("question-numbers")?.children[s.index];
 if(navIndex)navIndex.classList.add("marked");
});
 opts.appendChild(b);
 });
 $("feedback").hidden=true;
 if(graded){
 const f=$("feedback");f.replaceChildren();f.hidden=false;
 f.className="feedback "+(q.annulled?"":chosen===q.key?"good":"bad");
 if(q.annulled){add(f,"strong","","Anulada no gabarito definitivo");add(f,"p","","Não conta como acerto nem erro. Continue estudando as demais questões.");}
 else if(!q.key){add(f,"strong","","Resposta registrada");add(f,"p","","Ainda não há gabarito definitivo conferido nesta versão. Sua escolha não será contada como erro nem acerto.");}
 else {
 add(f,"strong","",chosen===q.key?"✓ Você acertou!":"Gabarito oficial: alternativa "+q.key);
 add(f,'p','correct-answer','Resposta do gabarito: '+q.key+'. '+q.options[q.key]);
 if(info.complementary)add(f,'p','fine','Gabarito publicado em '+info.answerPublishedAt.split('-').reverse().join('/')+'. Não foi confirmada versão posterior aos recursos.');
 if(chosen&&chosen!==q.key)add(f,'p','chosen-answer','Você marcou: '+chosen+'. '+q.options[chosen]);
 const explanation=add(f,'details','correction-guide');
 add(explanation,'summary','','Entender a correção passo a passo');
 const guide=window.MFAccount.correction?.(q.id)||{};
 add(explanation,'p','',guide.foundation||LESSONS[C.subjectGroup(q)]?.intro||'Confira o comando, os dados e o contexto antes de comparar as alternativas.');
 const steps=add(explanation,'ol','lesson-steps');
 add(steps,'li','',guide.tip||(/\bII\./.test(q.text)?'Julgue cada afirmativa separadamente antes de comparar as combinações.':/incorreta|exceto/i.test(q.text)?'O comando pede uma exceção ou uma afirmação incorreta. Confira a negação antes de escolher.':'Identifique exatamente o que o comando pede e localize a regra ou os dados necessários.'));
 add(steps,'li','','Compare a alternativa '+q.key+' com o enunciado: '+q.options[q.key]);
 if(chosen&&chosen!==q.key)add(steps,'li','','Volte à alternativa '+chosen+' e identifique qual trecho muda o sentido ou não atende ao comando.');
 if(guide.reasoning)add(explanation,'p','',guide.reasoning);
 else add(explanation,'p','fine','Este roteiro orienta a análise. O item ainda não tem comentário individual de resolução conferido.');
 explanation.appendChild(button('Abrir aula curta deste conteúdo','outline',()=>window.MFAccount.help(q.id,'lesson',chosen)));
 if(chosen&&chosen!==q.key){
 const help=button("Estudar a base de "+C.subjectGroup(q)+" →","small-button",()=>{
  show("path");$("lesson-subject").value=C.subjectGroup(q);renderLesson();$("lesson-hub").scrollIntoView({block:"start",behavior:"smooth"});
 });
 f.appendChild(help);
 add(f,"p","dim small","O que dificultou esta questão? (opcional)");
 const r=add(f,"div","error-reason");
 ["Não sabia o conteúdo","Interpretei errado","Desatenção","Faltou tempo"].forEach(reason=>{
 const b=button(reason,state.progress[q.id]?.reason===reason?"selected":"",()=>{
  if(state.progress[q.id]){state.progress[q.id].reason=reason;save();renderQuestion();}
 });
 r.appendChild(b);
 });
 }
 }
 }
 const actions=$("question-actions");actions.hidden=false;
 $("previous").disabled=s.index===0;
 $("previous").hidden=s.index===0;
 $("next").hidden=true;
 $("next").disabled=s.index===items.length-1;
 const c=$("check");
 if(s.finished){c.textContent=s.index===items.length-1?"Voltar ao resultado":"Próxima questão";c.disabled=false;}
 else if(s.grading==="exam" || s.kind==="diagnostic"||s.kind==="full"){
 c.textContent=s.index===items.length-1?"Finalizar e corrigir":"Salvar e avançar";c.disabled=false;
 }else if(s.checked[q.id]){c.textContent=s.index===items.length-1?"Concluir sessão":"Próxima questão";c.disabled=false;}
 else {c.textContent=q.annulled?"Continuar (anulada)":"Confirmar resposta";c.disabled=!chosen&&!q.annulled;}
 const nav=$("question-numbers");nav.replaceChildren();$("question-numbers-wrap").hidden=false;
 items.forEach((item,i)=>{
 const b=el("button",i===s.index?"current":"",String(i+1));b.type="button";b.title=C.subjectGroup(item)+" — Q"+item.number;
 if(s.picks[item.id])b.classList.add("marked");
 if(s.checked[item.id]&&s.picks[item.id]!==item.key&&!item.annulled)b.classList.add("incorrect");
 b.setAttribute("aria-current",String(i===s.index));
 b.addEventListener("click",()=>{s.index=i;save();renderAll();});
 nav.appendChild(b);
 });
 if(moved&&activeTab==='train'){title.focus({preventScroll:true});title.scrollIntoView?.({block:'start',behavior:'auto'});}
}
function checkClick(){
 const s=currentSession();if(!s)return;
 if(s.finished){if(s.index<reviewItems().length-1)s.index++;else{s.reviewing=false;s.reviewIds=null;}save();renderAll();return;}
 const items=sessionItems(),q=items[s.index];if(!q)return;
 if(s.grading==="exam"||s.kind==="diagnostic"||s.kind==="full"){
  if(s.index===items.length-1){gradeAll();return;}
  s.index++;save();renderAll();return;
 }
 if(s.checked[q.id]){if(s.index===items.length-1){finish();return;}s.index++;save();renderAll();return;}
 if(!s.picks[q.id]&&!q.annulled){toast("Marque uma alternativa antes de corrigir, ou pule para a próxima questão.");return;}
 gradeOne(q);renderAll();$('feedback').scrollIntoView?.({block:'nearest',behavior:'auto'});
}
function renderTraining(){
 renderSources();renderQuestion();
 const config=$('training-config'),session=currentSession();
 const key=session?String(session.started)+':'+String(session.finished):'empty';
 if(config.dataset.session!==key){config.open=!session;config.dataset.session=key;}
 config.querySelector('summary').textContent=session?'Escolher outro treino':'Escolher treino';
 document.querySelector('.training-layout').classList.toggle('has-session',!!session);
}

function renderLesson(){
 const key=$("lesson-subject").value,lesson=LESSONS[key]||LESSONS.Português;
 const target=$("lesson-content");target.replaceChildren();
 add(target,"h3","",lesson.title);
 add(target,"p","dim",lesson.intro);
 const list=add(target,"ol","lesson-steps");
 lesson.steps.forEach(step=>add(list,"li","",step));
 add(target,"p","support-note",lesson.practice);
}
function renderPath(){
 const mistake=outstandingMistakes().sort((a,b)=>(state.progress[b.id]?.at||0)-(state.progress[a.id]?.at||0))[0];
 const subject=mistake?C.subjectGroup(mistake):C.weakestSubject(C.statsBySubject(totalEvents(),DB.questions))||'Português';
 $('path-next-title').textContent='Seu próximo passo: '+subject;
 $('path-next-copy').textContent=mistake?'Reforce o conteúdo de uma questão que você errou e pratique com duas questões.':'Leia a base desta matéria e pratique com duas questões, no seu ritmo.';
 $('path-study').dataset.subject=subject;$('path-practice').dataset.subject=subject;
 renderLesson();upcoming();const total=Object.values(TOPICS).reduce((a,b)=>a+b.length,0);
 const done=Object.keys(state.topics).filter(k=>state.topics[k]===true).length;
 $("topics-complete").textContent=done+"/"+total;meter("topics-meter",percent(done,total));
 const target=$("weight-list");target.replaceChildren();
 C.GROUPS.forEach(s=>{const row=add(target,"div","weight-line");add(row,"span","",s);add(row,"strong","",C.TARGETS[s]?C.TARGETS[s]+"/50":"Prova 2021");const m=add(row,"div","meter");const fill=add(m,"span");fill.style.width=(C.TARGETS[s]/50*100)+"%";});
 const sy=$("syllabus");sy.replaceChildren();
 C.GROUPS.forEach(group=>{
 const details=add(sy,"details");const summary=add(details,"summary","",""+group+" · "+TOPICS[group].filter((_,i)=>state.topics[group+"|"+i]).length+"/"+TOPICS[group].length);
 const list=add(details,"div","topic-list");
 TOPICS[group].forEach((topic,index)=>{
 const id=group+"|"+index,line=add(list,"label","tick-line");
 const checkbox=el("input");checkbox.type="checkbox";checkbox.checked=!!state.topics[id];checkbox.addEventListener("change",()=>{state.topics[id]=checkbox.checked;save();summary.textContent=group+" · "+TOPICS[group].filter((_,i)=>state.topics[group+"|"+i]).length+"/"+TOPICS[group].length;const n=Object.keys(state.topics).filter(k=>state.topics[k]).length;$("topics-complete").textContent=n+"/"+total;meter("topics-meter",percent(n,total));});
 line.appendChild(checkbox);add(line,"span","",topic);
 });
 });
 $("essay").value=state.essay||"";$("essay-status").textContent=(state.essay||"").trim().split(/\s+/).filter(Boolean).length+" palavras · salvo no aparelho, com sincronização automática pela conta";
 const weekStart=C.dayShift(DAY,-((new Date(DAY+"T12:00:00Z").getUTCDay()+6)%7));
 $("essay-week").checked=state.essayWeek===weekStart;
}
function sanitizePerformance(value={}){
 return {period:['today','7','30','all'].includes(value?.period)?value.period:'today',subject:C.GROUPS.includes(value?.subject)?value.subject:'all',exam:Object.hasOwn(DB.exams,value?.exam)?value.exam:'all'};
}
function performanceFilter(){return sanitizePerformance(state.settings.performanceFilter);}
function savedPerformanceFilters(){return Array.isArray(state.settings.performanceSaved)?state.settings.performanceSaved.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.filter).slice(0,12):[];}
function performanceEvents(filter){
 const today=C.dayDate(),start=filter.period==='7'?C.dayShift(today,-6):filter.period==='30'?C.dayShift(today,-29):filter.period==='today'?today:null;
 return totalEvents().filter(e=>{const q=QUESTION.get(e.id),at=Date.parse(e.day+'T12:00:00Z');return C.isValid(q)&&/^[ABCD]$/.test(e.answer)&&typeof e.correct==='boolean'&&/^\d{4}-\d{2}-\d{2}$/.test(e.day||'')&&Number.isFinite(at)&&new Date(at).toISOString().slice(0,10)===e.day&&e.day<=today&&(!start||e.day>=start)&&(filter.subject==='all'||C.subjectGroup(q)===filter.subject)&&(filter.exam==='all'||q.exam===filter.exam);});
}
function performanceBuckets(events,period){
 const today=C.dayDate(),first=events.map(e=>e.day).sort()[0]||today;
 const start=period==='today'?today:period==='7'?C.dayShift(today,-6):period==='30'?C.dayShift(today,-29):first;
 const days=C.daysBetween(start,today)+1,span=period==='all'?Math.max(1,Math.ceil(days/12)):1;
 const buckets=period==='today'?Array.from({length:24},(_,i)=>({label:String(i).padStart(2,'0')+'h',full:String(i).padStart(2,'0')+'h',correct:0,wrong:0})):Array.from({length:Math.ceil(days/span)},(_,i)=>{const from=C.dayShift(start,i*span),to=C.dayShift(start,Math.min(days-1,(i+1)*span-1)),format=d=>d.split('-').reverse().join('/');return {label:from.slice(8)+'/'+from.slice(5,7),full:from===to?format(from):format(from)+' a '+format(to),correct:0,wrong:0};});
 for(const event of events){
  let index;
  if(period==='today'){
   const at=typeof event.at==='number'?event.at:Date.parse(event.at),date=new Date(at);
   if(Number.isFinite(date.getTime()))index=date.getHours();
   else{index=buckets.findIndex(b=>b.label==='Sem horário');if(index<0){index=buckets.length;buckets.push({label:'Sem horário',full:'Horário não informado',correct:0,wrong:0});}}
  }else index=Math.floor(C.daysBetween(start,event.day)/span);
  if(buckets[index])buckets[index][event.correct?'correct':'wrong']++;
 }
 return {buckets,start,end:today};
}
function renderPerformance(){
 const filter=performanceFilter(),events=performanceEvents(filter),correct=events.filter(e=>e.correct).length,wrong=events.length-correct,score=percent(correct,events.length);
 const labels={today:'hoje','7':'nos últimos 7 dias','30':'nos últimos 30 dias',all:'em todo o período'};
 $('performance-profile').textContent='Perfil: '+(PROFILES[activeProfile]||'Escolha um aluno');
 $('performance-subject').value=filter.subject;$('performance-exam').value=filter.exam;
 document.querySelectorAll('[data-performance-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.performancePeriod===filter.period)));
 $('performance-filter-label').textContent=(filter.subject==='all'?'Todas as matérias':filter.subject)+' · '+(filter.exam==='all'?'Todas as provas':DB.exams[filter.exam].short);
 $('performance-empty').hidden=events.length>0;
 $('performance-total').textContent=String(events.length);$('performance-correct').textContent=String(correct);$('performance-wrong').textContent=String(wrong);$('performance-percent').textContent=score+'%';
 $('performance-ring').classList.toggle('has-data',events.length>0);
 $('performance-ring').setAttribute('aria-label',events.length?score+'% de acertos: '+correct+' certas e '+wrong+' erradas em '+events.length+' respostas.':'Nenhuma resposta neste período.');
 $('performance-ring-correct').setAttribute('stroke-dasharray',(events.length?correct/events.length*276.46:0)+' 276.46');
 const data=performanceBuckets(events,filter.period),chart=$('performance-chart'),table=$('performance-chart-table');chart.replaceChildren();table.replaceChildren();
 $('performance-chart-title').textContent='Sua evolução '+labels[filter.period];
 $('performance-chart-range').textContent=data.start.split('-').reverse().join('/')+' a '+data.end.split('-').reverse().join('/')+(filter.period==='today'?' · por horário':'');
 chart.setAttribute('aria-label','Respostas corrigidas '+labels[filter.period]+': '+correct+' certas e '+wrong+' erradas. Os valores por intervalo estão na tabela abaixo.');
 const max=Math.max(1,...data.buckets.map(b=>b.correct+b.wrong)),tick=Math.max(1,Math.ceil(data.buckets.length/6));
 for(const [index,bucket] of data.buckets.entries()){
  const column=add(chart,'div','performance-column');column.title=bucket.full+': '+bucket.correct+' certas, '+bucket.wrong+' erradas';
  const bar=add(column,'div','performance-bar');bar.setAttribute('aria-hidden','true');
  const bad=add(bar,'span','performance-bar-wrong');bad.style.height=(bucket.wrong/max*100)+'%';
  const good=add(bar,'span','performance-bar-correct');good.style.height=(bucket.correct/max*100)+'%';
  const label=add(column,'small','',index%tick===0||index===data.buckets.length-1?bucket.label:'');label.setAttribute('aria-hidden','true');
  const row=add(table,'tr');const heading=add(row,'th','',bucket.full);heading.scope='row';for(const value of [bucket.correct,bucket.wrong,bucket.correct+bucket.wrong])add(row,'td','',value);
 }
 const groups=C.statsBySubject(events,DB.questions),subjects=$('performance-subjects');subjects.replaceChildren();
 for(const subject of C.GROUPS){const value=groups[subject];if(filter.subject!=='all'&&filter.subject!==subject)continue;if(!value.attempts)continue;const row=add(subjects,'div','subject-line');add(row,'span','',subject);add(row,'strong','',value.percent+'%');add(row,'small','',value.correct+' certas em '+value.attempts+' respostas');}
 if(!subjects.childNodes.length)add(subjects,'p','dim','Nenhuma resposta para comparar neste período.');
 const saved=savedPerformanceFilters();$('performance-saved-count').textContent=String(saved.length);
 const savedList=$('performance-saved-list');savedList.replaceChildren();
 if(!saved.length)add(savedList,'p','support-note','Nenhum filtro salvo. Em Geral, abra Filtrar e toque em Salvar filtro.');
 for(const item of saved){const entry=add(savedList,'article','panel performance-saved-item');add(entry,'h2','',item.name.slice(0,60));const selected=sanitizePerformance(item.filter);add(entry,'p','dim small',(selected.subject==='all'?'Todas as matérias':selected.subject)+' · '+labels[selected.period]);const actions=add(entry,'div','source-links');actions.append(button('Abrir filtro','outline',()=>{state.settings.performanceFilter=selected;performancePanel='general';save();renderInsights();}),button('Remover','ghost',()=>{state.settings.performanceSaved=savedPerformanceFilters().filter(f=>f.id!==item.id);save();renderPerformance();}));}
 $('performance-general').hidden=performancePanel!=='general';$('performance-saved').hidden=performancePanel!=='saved';
 $('performance-history').hidden=performancePanel!=='general';
 $('performance-general-tab').setAttribute('aria-selected',String(performancePanel==='general'));$('performance-saved-tab').setAttribute('aria-selected',String(performancePanel==='saved'));
}
function renderInsights(){
 renderHome();
 renderPerformance();
 const events=totalEvents(),total=C.score(events,DB.questions),groups=C.statsBySubject(events,DB.questions);
 $("insight-attempts").textContent=String(total.attempts);
 $("insight-accuracy").textContent=total.percent===null?"—":total.percent+"%";
 $("insight-due").textContent=String(getDue());
 $("insight-sessions").textContent=String(state.sessions.length);
 weekGrid($("insight-calendar"));
 const last=lastDate();$("last-activity").textContent=last?"Última atividade: "+last.split("-").reverse().join("/")+". Um intervalo não apaga seu progresso.":"Nenhum treino registrado ainda.";
 const list=$("subject-progress");list.replaceChildren();
 C.GROUPS.forEach(group=>{
 const t=groups[group],row=add(list,"div","subject-line");
 add(row,"span","",group);add(row,"strong","",t.percent===null?"—":t.percent+"%");
 const box=add(row,"div","meter");const bar=add(box,"span");bar.style.width=(t.percent||0)+"%";
 add(row,"small","",t.attempts+" tentativa(s) • "+t.unique+" questão(ões) diferentes");
 });
 const weak=C.weakestSubject(groups);
 $("next-recommendation").textContent=total.attempts<10?"Faça seu diagnóstico de 10 questões":"Prioridade sugerida: "+weak;
 $("next-recommendation-detail").textContent=total.attempts<10?"Use questões da PMMG para conhecer seu ponto de partida, sem pressão.":"O destaque considera seu aproveitamento por disciplina quando há pelo menos 3 tentativas. É uma sugestão, não um diagnóstico definitivo.";
}
function renderAll(){if(activeTab==="home")renderHome();if(activeTab==="train")renderTraining();if(activeTab==="path")renderPath();if(activeTab==="insights")renderInsights();}
function download(name,text,type){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function backupExport(){download("missao-farda-backup-"+activeProfile+"-"+DAY+".json",JSON.stringify({...JSON.parse(C.exportSafe(state)),profile:{id:activeProfile,name:PROFILES[activeProfile]}},null,2),"application/json;charset=utf-8");toast("Backup gerado. Guarde o arquivo em um lugar seguro.");}
function csvExport(){
 const lines=[["Data","Prova","Disciplina","Questão","Resposta","Acertou"]];
 for(const ev of state.events){const q=QUESTION.get(ev.id);if(!q)continue;lines.push([ev.day,DB.exams[q.exam].year,C.subjectGroup(q),q.number,ev.answer,ev.correct?"SIM":"NÃO"]);}
 const csv=lines.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");download("missao-farda-tentativas-"+activeProfile+"-"+DAY+".csv","\ufeff"+csv,"text/csv;charset=utf-8");
}
function restore(file){
 if(!file)return; if(file.size>6*1024*1024){toast("Arquivo maior que o limite permitido (6 MB).");return;}
 const targetProfile=activeProfile;const reader=new FileReader();
 reader.onload=()=>{try{
 if(targetProfile!==activeProfile){toast("Volte ao perfil escolhido para restaurar este backup.");return;}
 const parsed=JSON.parse(String(reader.result));if(parsed.app!=="missao-farda-pmmg"||parsed.version!==3||!parsed.state||typeof parsed.state!=="object")throw Error("Arquivo não é um backup do Missão Farda");
 if(parsed.profile&&parsed.profile.id!==activeProfile){toast("Este backup pertence a "+(PROFILES[parsed.profile.id]||"outro perfil")+". Troque de perfil para restaurar.");return;}
 if(!window.confirm("Restaurar este backup recuperará os dados de "+PROFILES[activeProfile]+". O histórico será unido ao que já estiver sincronizado. Continuar?"))return;
 const incoming=parsed.state;const safe=defaultState();safe.progress=C.cleanHistory(incoming.progress||{},IDS);
 safe.events=Array.isArray(incoming.events)?incoming.events.filter(e=>e&&IDS.has(e.id)&&"ABCD".includes(e.answer||"")).slice(-12000):[];
 safe.sessions=Array.isArray(incoming.sessions)?incoming.sessions.filter(x=>x&&typeof x==="object").slice(-500):[];
 safe.topics=incoming.topics&&typeof incoming.topics==="object"?Object.fromEntries(Object.entries(incoming.topics).filter(([k,v])=>Object.entries(TOPICS).some(([group,l])=>l.some((_,i)=>k===group+"|"+i))&&typeof v==="boolean")):{};
 safe.essay=typeof incoming.essay==="string"?incoming.essay.slice(0,20000):"";
 safe.essayWeek=typeof incoming.essayWeek==="string"?incoming.essayWeek.slice(0,10):"";
 safe.settings={favorites:Array.isArray(incoming.settings?.favorites)?incoming.settings.favorites.filter(id=>IDS.has(id)):[],goal:[2,5,10].includes(Number(incoming.settings?.goal))?Number(incoming.settings.goal):5,timer:"off"};
 if(incoming.settings?.performanceFilter)safe.settings.performanceFilter=sanitizePerformance(incoming.settings.performanceFilter);
 if(Array.isArray(incoming.settings?.performanceSaved))safe.settings.performanceSaved=incoming.settings.performanceSaved.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&x.filter).slice(0,12).map(x=>({id:x.id.slice(0,100),name:x.name.slice(0,60),filter:sanitizePerformance(x.filter)}));
 state=window.MFSync?window.MFSync.merge(state,window.MFSync.touch(safe,defaultState())):safe;save();toast("Backup restaurado com sucesso.");show("insights");
 }catch(e){toast("Não foi possível restaurar: formato do backup inválido.");}};
 reader.readAsText(file);
}
function shortcuts(e){if(!$("profile-picker").hidden||activeTab!=="train"||!currentSession()||currentSession().finished||["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)||e.altKey||e.ctrlKey||e.metaKey)return;
 const key=e.key.toUpperCase();if("ABCD".includes(key)&&key.length===1){const s=currentSession(),q=sessionItems()[s.index];if(!q.options[key]||(s.checked[q.id]&&s.grading==="practice"))return;s.picks[q.id]=key;save();renderQuestion();e.preventDefault();}
}
function initEvents(){
 for(const subject of C.GROUPS){const option=el('option','',subject);option.value=subject;$('performance-subject').append(option);}
 for(const [id,exam] of Object.entries(DB.exams)){const option=el('option','',exam.short);option.value=id;$('performance-exam').append(option);}
 function changePerformance(values){state.settings.performanceFilter={...performanceFilter(),...values};save();renderInsights();}
 document.querySelectorAll('[data-performance-period]').forEach(b=>b.onclick=()=>changePerformance({period:b.dataset.performancePeriod}));
 $('performance-subject').onchange=()=>changePerformance({subject:$('performance-subject').value});
 $('performance-exam').onchange=()=>changePerformance({exam:$('performance-exam').value});
 $('performance-clear-filter').onclick=()=>changePerformance({period:'today',subject:'all',exam:'all'});
 $('performance-general-tab').onclick=()=>{performancePanel='general';renderInsights();};
 $('performance-saved-tab').onclick=()=>{performancePanel='saved';renderInsights();};
 const performanceTabs=[$('performance-general-tab'),$('performance-saved-tab')];
 performanceTabs.forEach((button,index)=>button.onkeydown=event=>{const key=event.key;if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;event.preventDefault();const next=key==='Home'?0:key==='End'?1:1-index;performanceTabs[next].click();performanceTabs[next].focus();});
 $('performance-start').onclick=()=>show('train');
 $('performance-save-filter').onclick=()=>{
  const filter=performanceFilter(),saved=savedPerformanceFilters();if(saved.length>=12){toast('Você já tem 12 filtros salvos. Remova um para salvar outro.');return;}
  const periods={today:'Hoje','7':'7 dias','30':'30 dias',all:'Sempre'},name=$('performance-filter-name').value.trim().slice(0,60)||periods[filter.period]+' · '+(filter.subject==='all'?'Todas as matérias':filter.subject);
  if(saved.some(item=>item.name===name&&JSON.stringify(sanitizePerformance(item.filter))===JSON.stringify(filter))){toast('Este filtro já está salvo.');return;}
  state.settings.performanceSaved=[...saved,{id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),name,filter}];save();$('performance-filter-name').value='';toast('Filtro salvo neste perfil.');renderInsights();
 };
 window.MFQuestionInfo=id=>{const session=currentSession();if(!session||session.finished||session.grading!=='practice'||session.ids[session.index]!==id||session.checked[id])return null;return {answer:session.picks[id]||'',eliminated:session.eliminated?.[id]||[]}};
 window.MFEliminate=(id,letter)=>{const info=window.MFQuestionInfo(id),q=QUESTION.get(id);if(!info||!q||q.key===letter||!'ABCD'.includes(letter))return false;const session=currentSession();session.eliminated=session.eliminated||{};session.eliminated[id]=[...new Set([...(session.eliminated[id]||[]),letter])];if(session.picks[id]===letter)delete session.picks[id];save();renderQuestion();return true;};
 $('train-favorites').onclick=()=>sessionNew({kind:'favorites',exam:'all',subject:'all',count:10,grading:'practice'});

 document.querySelectorAll("[data-profile]").forEach(b=>b.addEventListener("click",()=>chooseProfile(b.dataset.profile)));
 $("switch-profile").addEventListener("click",openProfiles);
 $("profile-cancel").addEventListener("click",()=>{$("profile-picker").hidden=true;$("main").inert=false;$("switch-profile").focus();});
 $("profile-picker").addEventListener("keydown",e=>{if(e.key==="Escape"&&activeProfile){$("profile-cancel").click();}if(e.key==="Tab"){const buttons=[...$("profile-picker").querySelectorAll("button")].filter(b=>!b.hidden),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){last.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault();}}});
 document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.tab)));
 document.querySelectorAll("[data-goal]").forEach(b=>b.addEventListener("click",()=>{state.settings.goal=Number(b.dataset.goal);save();renderHome();}));
 $("daily-start").addEventListener("click",()=>currentSession()&&!currentSession().finished?show('train'):sessionNew({kind:"daily",exam:"all",subject:"all",count:state.settings.goal||5,grading:"practice"}));
 $("two-questions").addEventListener("click",()=>sessionNew({kind:"daily",exam:"all",subject:"all",count:2,grading:"practice"}));
 $("resume").addEventListener("click",()=>show("train"));
 $("diagnostic-home").addEventListener("click",()=>sessionNew({kind:"diagnostic",count:10}));
 $("review-shortcut").addEventListener("click",()=>outstandingMistakes().length?reviewNow():sessionNew({kind:"review",exam:"all",subject:"all",count:5,grading:"practice"}));
 $("exam").addEventListener("change",()=>{fillSubjects();renderSources();});
 $("create-session").addEventListener("click",()=>sessionNew());
 $("mode").addEventListener("change",()=>{const mode=$("mode").value;if(mode==="full"||mode==="diagnostic")$("grading").value="exam";});
 $("check").addEventListener("click",checkClick);
 $("previous").addEventListener("click",()=>{if(!currentSession()||currentSession().index<=0)return;state.session.index--;save();renderAll();});
 $("next").addEventListener("click",()=>{const s=currentSession();if(!s||s.index>=reviewItems().length-1)return;s.index++;save();renderAll();});
 $("timer-setting").value=state.settings.timer||"off";
 $("timer-setting").addEventListener("change",()=>{state.settings.timer=$("timer-setting").value;save();timerStart(true);});
 $("timer-toggle").addEventListener("click",()=>{timerPaused=!timerPaused;if(state.session?.clock){state.session.clock.paused=timerPaused;state.session.clock.remaining=remaining;save();}$("timer-toggle").textContent=timerPaused?"Continuar":"Pausar";});
 $("timer-reset").addEventListener("click",()=>timerStart(true));
 $("lesson-subject").addEventListener("change",renderLesson);
 function practiceTwo(subject){const q=DB.questions.find(q=>C.subjectGroup(q)===subject&&C.isValid(q));if(q)sessionNew({kind:'daily',exam:q.exam,subject,count:2,grading:'practice'});}
 $('path-study').onclick=()=>{$('lesson-subject').value=$('path-study').dataset.subject;renderLesson();$('lesson-hub').scrollIntoView?.({block:'start',behavior:'smooth'});};
 $('path-practice').onclick=()=>practiceTwo($('path-practice').dataset.subject);
 $("lesson-practice").addEventListener("click",()=>practiceTwo($("lesson-subject").value));
 $("essay").addEventListener("input",()=>{state.essay=$("essay").value;save();$("essay-status").textContent=state.essay.trim().split(/\s+/).filter(Boolean).length+" palavras · salvo no aparelho, com sincronização automática pela conta";});
 $("essay-week").addEventListener("change",()=>{
 const offset=(new Date(DAY+"T12:00:00Z").getUTCDay()+6)%7;
 state.essayWeek=$("essay-week").checked?C.dayShift(DAY,-offset):"";save();
 });
 $("next-step").addEventListener("click",()=>{
 const stats=C.statsBySubject(totalEvents(),DB.questions),weak=C.weakestSubject(stats);
 if(totalEvents().length<10){sessionNew({kind:"diagnostic"});return;}
 $("exam").value="pmmg2024";fillSubjects();$("subject").value=weak;
 sessionNew({kind:"daily",exam:"pmmg2024",subject:weak,count:5,grading:"practice"});
 });
 $("export-backup").addEventListener("click",backupExport);
 $("export-csv").addEventListener("click",csvExport);
 $("import-trigger").addEventListener("click",()=>$("import-file").click());
 $("import-file").addEventListener("change",()=>{restore($("import-file").files?.[0]);$("import-file").value="";});
 document.addEventListener("keydown",shortcuts);
 window.addEventListener("online",updateOnline);
 window.addEventListener("offline",updateOnline);
}
function updateOnline(){
 const label=$("connection-status");label.textContent=navigator.onLine?"Conectado":"Sem conexão";
 label.title=navigator.onLine?"Sincronização automática pela conta.":"Continue com os arquivos disponíveis no aparelho. A sincronização precisa de internet.";
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&activeProfile)save();});
function boot(){
 window.MFAccount.seed();
 initEvents();initSync();fillSubjects();renderSources();show("home");updateOnline();

 const initial=window.MFAccount.initial();
 if(initial.activeProfile)chooseProfile(initial.activeProfile);else openProfiles();
}
boot();
})();
