import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {toReferenceState,mountReferenceUI,leaveReferenceUI} from '../reference-ui.js';
const read=f=>fs.readFileSync(new URL('../missao/'+f,import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,5));
function open({installation={installed:true},id='account-a',snapshot={profiles:{},activeProfile:null,legacy:toReferenceState({})},allowed=true,preferences={sound:true,xp:60,profile:{schedule:'shift',time:'19:00'},seconds:3600}}={}){
 const errors=[],saved=[],charges=[],actions={tools:[],help:[],sounds:[],installs:0};const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(read('index.html'),{url:'https://ppmt.novabytesolucoes.com.br/missao/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.scrollTo=()=>{};w.confirm=()=>true;
 const bridge={id,installationState:()=>installation,install:()=>{actions.installs++},initial:()=>snapshot,save(data){const name=data.activeProfile;saved.push({name,state:JSON.parse(JSON.stringify(data.profiles[name]))})},pull:async()=>null,allow:async(kind,count)=>{charges.push({kind,count});return allowed},preferences:()=>preferences,setSound:value=>{preferences.sound=value},openTool:route=>actions.tools.push(route),help:(...args)=>actions.help.push(args),answerFeedback:correct=>actions.sounds.push(correct),openAccount(){},logout(){}};
 Object.defineProperty(w,'parent',{value:{MFAccountBridge:bridge}});
 for(const file of ['banco-transcrito.js','core.js','sync.js','account-bridge.js','strike.js','app.js'])w.eval(read(file));
 return {dom,w,saved,charges,errors,actions};
}
test('navegação mantém quatro abas: Início, Estudar, Trilha e Desempenho',()=>{
 const a=open();try{
  assert.deepEqual([...a.w.document.querySelectorAll('.tabs [data-tab]')].map(x=>x.textContent.trim().replace(/^[^\p{L}]+/u,'')),['Início','Estudar','Trilha','Desempenho']);
  a.w.document.querySelector('[data-profile=luanderson]').click();
  for(const tab of ['train','path','insights','home']){a.w.document.querySelector(`[data-tab=${tab}]`).click();assert.equal(a.w.document.querySelector('#view-'+tab).hidden,false)}
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});
test('treino usa gabarito original, verifica o acesso e salva a resposta no perfil da conta',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  assert.equal(d.querySelectorAll('.option').length,4);assert.equal(a.charges.length,1);assert.equal(a.charges[0].kind,'block');
  d.querySelector('.option').click();d.querySelector('#check').click();
  const saved=a.saved.at(-1);assert.equal(saved.name,'luanderson');assert.equal(saved.state.events.length,1);assert.ok(saved.state.events[0].id.startsWith('pmmg'));
  assert.equal(a.w.localStorage.getItem('missao-farda-pmmg-state-v3-luanderson'),null);
  assert.ok(a.w.localStorage.getItem('missao-farda-pmmg-state-v3:account-a-luanderson'));
  d.querySelector('#switch-profile').click();d.querySelector('[data-profile=jackeline]').click();assert.equal(a.saved.at(-1).state.events.length,0);
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});
test('acesso negado não começa treino nem consome histórico',async()=>{
 const a=open({allowed:false});try{
  a.w.document.querySelector('[data-profile=luanderson]').click();a.w.document.querySelector('#daily-start').click();await pause();
  assert.equal(a.saved.at(-1).state.session,null);assert.equal(a.saved.at(-1).state.events.length,0);
 }finally{a.dom.window.close()}
});
test('tentativas anteriores são convertidas sem alterar o registro original',()=>{
 const old={attempts:[{id:'pmmg2021-1',selected:3,correct:true,at:'2026-11-14T10:00:00Z'}],sessions:[],program:{reviews:{}}},before=JSON.stringify(old);
 const state=toReferenceState(old);assert.equal(state.events[0].answer,'D');assert.equal(state.events[0].correct,true);assert.equal(JSON.stringify(old),before);
 const a=open({snapshot:{profiles:{},activeProfile:null,legacy:state}});try{a.w.document.querySelector('[data-profile=luanderson]').click();assert.equal(a.saved.at(-1).state.events.length,1)}finally{a.dom.window.close()}
});
test('todas as imagens e dependências da interface estão no pacote local',()=>{
 const dom=new JSDOM(read('index.html'));try{
  for(const tag of dom.window.document.querySelectorAll('script[src],link[href]')){const path=tag.getAttribute('src')||tag.getAttribute('href');if(!path.startsWith('./'))continue;assert.ok(fs.existsSync(new URL('../missao/'+path.split('?')[0],import.meta.url)),path)}
  const parsed={};new Function('window',read('banco-transcrito.js'))(parsed);
  for(const q of parsed.EXAM_BANK.questions)for(const path of [...q.supportImages,...q.originalImages])assert.ok(fs.existsSync(new URL('../missao/'+path,import.meta.url)),path);
 }finally{dom.window.close()}
});
test('menu inferior reserva espaço, respeita safe area e mantém quatro opções',()=>{
 const css=read('ui.css');assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);assert.match(css,/inset:auto 0 0 0/);assert.match(css,/padding-bottom:calc\(var\(--mf-bottom-nav\)/);assert.match(css,/env\(safe-area-inset-bottom/);
});
test('ponte da conta descarta gravações de uma conta anterior após trocar o login',()=>{
 const dom=new JSDOM('<body></body>',{url:'https://ppmt.novabytesolucoes.com.br/'});const oldWindow=globalThis.window,oldDocument=globalThis.document;globalThis.window=dom.window;globalThis.document=dom.window.document;
 try{
  const written=[];const options={getState:()=>({attempts:[],program:{}}),saveSnapshot:s=>written.push(s),pull:async()=>null,allow:async()=>true,preferences:()=>preferences,setSound:value=>{preferences.sound=value},openTool:route=>actions.tools.push(route),help:(...args)=>actions.help.push(args),answerFeedback:correct=>actions.sounds.push(correct),openAccount(){},logout(){}};
  mountReferenceUI({...options,user:{id:'account-a'}});const stale=window.MFAccountBridge;
  assert.ok(document.body.classList.contains('reference-mode'));
  assert.match(document.querySelector('iframe').src,/missao\/index.html/);
  mountReferenceUI({...options,user:{id:'account-b'}});
  stale.save({profiles:{luanderson:{events:[],sessions:[],progress:{}}},activeProfile:'luanderson'});assert.equal(written.length,0);
  window.MFAccountBridge.save({profiles:{jackeline:{events:[],sessions:[],progress:{}}},activeProfile:'jackeline'});assert.equal(written.length,1);
  leaveReferenceUI(true);assert.equal(document.querySelector('iframe'),null);assert.equal(window.MFAccountBridge,undefined);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;dom.window.close()}
});
function pointer(w,target,type,x,y){
 const event=new w.MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0});
 Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:'touch'},isPrimary:{value:true}});target.dispatchEvent(event);return event;
}
function swipe(w,target,dx,dy=0){pointer(w,target,'pointerdown',120,120);pointer(w,target,'pointermove',120+dx,120+dy);pointer(w,target,'pointerup',120+dx,120+dy)}
test('deslizar elimina e desfaz sem marcar resposta; rolagem vertical e cancelamento não riscam',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  const options=[...d.querySelectorAll('.option')];
  swipe(a.w,options[0],-65);assert.ok(options[0].classList.contains('is-struck'));
  options[0].click();assert.deepEqual(a.saved.at(-1).state.session.picks,{});assert.equal(a.saved.at(-1).state.events.length,0);
  assert.match(options[0].getAttribute('aria-label'),/Alternativa riscada/);
  swipe(a.w,options[0],65);assert.equal(options[0].classList.contains('is-struck'),false);
  const move=pointer(a.w,options[1],'pointerdown',120,120);const vertical=pointer(a.w,options[1],'pointermove',125,200);pointer(a.w,options[1],'pointerup',125,200);
  assert.equal(vertical.defaultPrevented,false);assert.equal(options[1].classList.contains('is-struck'),false);
  pointer(a.w,options[2],'pointerdown',120,120);pointer(a.w,options[2],'pointermove',150,120);pointer(a.w,options[2],'pointercancel',150,120);
  assert.equal(options[2].classList.contains('is-struck'),false);assert.equal(options[2].style.transform,'');
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});
test('riscos persistem ao trocar de aba, limpam a resposta eliminada e ficam bloqueados após corrigir',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  let options=[...d.querySelectorAll('.option')];options[0].click();assert.equal(Object.values(a.saved.at(-1).state.session.picks)[0],'A');
  swipe(a.w,options[0],65);assert.equal(Object.keys(a.saved.at(-1).state.session.picks).length,0);assert.equal(d.querySelector('#check').disabled,true);
  d.querySelector('[data-tab=path]').click();d.querySelector('[data-tab=train]').click();options=[...d.querySelectorAll('.option')];assert.ok(options[0].classList.contains('is-struck'));
  options[1].click();d.querySelector('#check').click();options=[...d.querySelectorAll('.option')];assert.ok(options.every(o=>o.disabled));
  const before=JSON.stringify(a.saved.at(-1).state.session.strikes);swipe(a.w,options[2],65);assert.equal(JSON.stringify(a.saved.at(-1).state.session.strikes),before);
  assert.equal(a.saved.at(-1).state.events.length,1);
 }finally{a.dom.window.close()}
});
test('a correção revela a alternativa certa mesmo quando ela havia sido riscada',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  const id=a.saved.at(-1).state.session.ids[0],key=a.w.EXAM_BANK.questions.find(q=>q.id===id).key;
  const right=d.querySelector(`.option[data-letter="${key}"]`);swipe(a.w,right,65);
  d.querySelector(`.option:not([data-letter="${key}"])`).click();d.querySelector('#check').click();
  const revealed=d.querySelector(`.option[data-letter="${key}"]`);assert.ok(revealed.classList.contains('correct'));assert.equal(revealed.classList.contains('is-struck'),false);
 }finally{a.dom.window.close()}
});
test('engrenagem conserva ferramentas anteriores e a preferência de som',async()=>{
 const a=open({preferences:{sound:false,xp:60,profile:{schedule:'shift',time:'19:00'},seconds:3600}});try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#account-settings').click();
  assert.equal(d.querySelector('#legacy-settings').hidden,false);assert.match(d.querySelector('#legacy-settings-summary').textContent,/12×36/);
  assert.equal(d.querySelector('#legacy-sound').textContent,'Som desligado');d.querySelector('#legacy-sound').click();assert.equal(d.querySelector('#legacy-sound').textContent,'Som ligado');
  for(const route of ['rotina','simulados','desempenho','estudar','erros','dados','mais','plano','ofertas']){const b=d.querySelector(`[data-legacy-tool="${route}"]`);assert.ok(b,route);b.click()}
  assert.ok(a.actions.tools.includes('rotina'));
  d.querySelector('#daily-start').click();await pause();d.querySelector('.legacy-question-tools button').click();assert.equal(a.saved.at(-1).state.settings.favorites.length,1);
  d.querySelector('.legacy-question-tools button:nth-child(2)').click();assert.equal(a.actions.help[0][1],'base');
  d.querySelector('.option').click();d.querySelector('#check').click();assert.equal(a.actions.sounds.length,1);
 }finally{a.dom.window.close()}
});
test('prazo de simulado é preservado ao retomar a sessão',async()=>{
 const a=open();let snapshot,deadline;try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#timer-setting').value='10';d.querySelector('#timer-setting').dispatchEvent(new a.w.Event('change'));d.querySelector('#grading').value='exam';d.querySelector('#create-session').click();await pause();
  snapshot=a.saved.at(-1).state;deadline=snapshot.session.clock.deadline;assert.ok(deadline>Date.now());assert.equal(d.querySelector('#timer-reset').disabled,true);
 }finally{a.dom.window.close()}
 const b=open({snapshot:{profiles:{luanderson:snapshot},activeProfile:'luanderson'}});try{b.w.document.querySelector('[data-profile=luanderson]').click();assert.equal(b.saved.at(-1).state.session.clock.deadline,deadline)}finally{b.dom.window.close()}
});

test('botão de instalar da nova interface usa o instalador da conta e some no modo aplicativo',()=>{
 const a=open({installation:{installed:false,label:'Instalar no iPhone/iPad'}});try{a.w.document.querySelector('[data-profile=luanderson]').click();const button=a.w.document.querySelector('#install-app');assert.equal(button.hidden,false);assert.match(button.getAttribute('aria-label'),/iPhone/);button.click();assert.equal(a.actions.installs,1);assert.deepEqual(a.errors,[])}finally{a.dom.window.close()}
 const b=open();try{assert.equal(b.w.document.querySelector('#install-app').hidden,true)}finally{b.dom.window.close()}
});

test('início oferece uma ação e continuar preserva a sessão e o consumo de acesso',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();
  assert.equal(d.querySelector('#daily-start').textContent,'Começar treino');
  assert.equal(d.querySelector('#view-home .metric-grid'),null);
  assert.equal(d.querySelector('#study-guide').open,false);
  assert.equal(d.querySelector('#training-options').open,false);
  d.querySelector('#daily-start').click();await pause();
  const session=JSON.stringify(a.saved.at(-1).state.session),charged=a.charges.length;
  assert.equal(d.querySelector('#training-config').open,false);
  d.querySelector('[data-tab=home]').click();
  assert.equal(d.querySelector('#daily-start').textContent,'Continuar treino');
  assert.equal(d.querySelector('.micro-goal').hidden,true);
  d.querySelector('#daily-start').click();await pause();
  assert.equal(d.querySelector('#view-train').hidden,false);
  assert.equal(JSON.stringify(a.saved.at(-1).state.session),session);
  assert.equal(a.charges.length,charged);
  // Opening settings during a session remains possible and is not undone by grading.
  d.querySelector('#training-config').open=true;
  d.querySelector('.option').click();d.querySelector('#check').click();
  assert.equal(d.querySelector('#training-config').open,true);
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('menu agrupa preferências, ferramentas e conta e explica sincronização das anotações',()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();
  assert.deepEqual([...d.querySelectorAll('#legacy-settings > details > summary')].map(n=>n.textContent),['Preferências','Ferramentas','Conta e backup']);
  assert.ok(d.querySelector('#legacy-settings #account-signout'));
  assert.ok(d.querySelector('#legacy-settings .sync-settings'));
  d.querySelector('#account-settings').click();assert.equal(d.querySelector('#account-settings').getAttribute('aria-expanded'),'true');
  d.querySelector('#close-legacy-settings').click();assert.equal(d.querySelector('#account-settings').getAttribute('aria-expanded'),'false');
  d.querySelector('#essay').value='Minha dúvida';d.querySelector('#essay').dispatchEvent(new a.w.Event('input'));
  assert.match(d.querySelector('#essay-status').textContent,/sincronização automática pela conta/);
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('erro pode ser revisto hoje sem alterar agenda, respostas ou consumo de acesso',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-goal="2"]').click();d.querySelector('#daily-start').click();await pause();
  const q=a.w.EXAM_BANK.questions.find(q=>q.id===a.saved.at(-1).state.session.ids[0]);
  d.querySelector(`.option[data-letter="${'ABCD'.split('').find(k=>k!==q.key)}"]`).click();d.querySelector('#check').click();
  const due=a.saved.at(-1).state.progress[q.id].due,events=a.saved.at(-1).state.events.length,charged=a.charges.length;
  d.querySelector('[data-tab=home]').click();
  assert.match(d.querySelector('#home-review-text').textContent,/1 erro/);
  assert.equal(d.querySelector('#review-shortcut').hidden,false);
  assert.match(d.querySelector('#review-schedule').textContent,/Próxima revisão programada/);
  d.querySelector('#review-shortcut').click();await pause();
  assert.equal(d.querySelector('#view-train').hidden,false);assert.equal(d.querySelectorAll('.option.correct').length,1);
  assert.equal(a.saved.at(-1).state.progress[q.id].due,due);assert.equal(a.saved.at(-1).state.events.length,events);assert.equal(a.charges.length,charged);
  assert.equal(d.querySelector('#next').hidden,true);assert.equal(d.querySelector('#check').textContent,'Próxima questão');assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('evolução atualiza todos os indicadores e revisão só de erros preserva resultado completo',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-goal="2"]').click();d.querySelector('#daily-start').click();await pause();
  const ids=a.saved.at(-1).state.session.ids;
  const first=a.w.EXAM_BANK.questions.find(q=>q.id===ids[0]),second=a.w.EXAM_BANK.questions.find(q=>q.id===ids[1]);
  d.querySelector(`.option[data-letter="${'ABCD'.split('').find(k=>k!==first.key)}"]`).click();d.querySelector('#check').click();
  d.querySelector('[data-tab=home]').click();d.querySelector('#daily-start').click();d.querySelector('#check').click();
  d.querySelector(`.option[data-letter="${second.key}"]`).click();d.querySelector('#check').click();d.querySelector('#check').click();
  assert.equal(d.querySelector('#feedback').hidden,true);
  const result=d.querySelector('#question-area').textContent,charged=a.charges.length;
  [...d.querySelectorAll('#question-area button')].find(b=>b.textContent==='Revisar só os erros').click();
  assert.equal(d.querySelector('#question-counter').textContent,'Erros · 1 / 1');assert.match(d.querySelector('.question-title').textContent,new RegExp('Questão '+first.number));
  assert.equal(d.querySelectorAll('#question-numbers button').length,1);d.querySelector('#check').click();
  assert.equal(d.querySelector('#question-area').textContent,result);assert.equal(a.charges.length,charged);assert.equal(a.saved.at(-1).state.events.length,2);
  [...d.querySelectorAll('#question-area button')].find(b=>b.textContent==='Revisar minhas respostas').click();
  assert.equal(d.querySelectorAll('#question-numbers button').length,2);d.querySelector('#check').click();assert.match(d.querySelector('.question-title').textContent,new RegExp('Questão '+second.number));
  d.querySelector('[data-tab=insights]').click();
  for(const id of ['home-answered','insight-attempts'])assert.equal(d.querySelector('#'+id).textContent,'2');
  for(const id of ['home-accuracy','insight-accuracy'])assert.equal(d.querySelector('#'+id).textContent,'50%');
  d.querySelector('#switch-profile').click();d.querySelector('[data-profile=jackeline]').click();d.querySelector('[data-tab=insights]').click();
  assert.equal(d.querySelector('#home-answered').textContent,'0');assert.equal(d.querySelector('#insight-attempts').textContent,'0');assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('correção mostra alternativas por extenso, roteiro e aula curta sem mudar gabarito',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  const q=a.w.EXAM_BANK.questions.find(q=>q.id===a.saved.at(-1).state.session.ids[0]),wrong='ABCD'.split('').find(k=>k!==q.key);
  assert.equal(d.querySelector('.correction-guide'),null);
  d.querySelector(`.option[data-letter="${wrong}"]`).click();d.querySelector('#check').click();
  assert.ok(d.querySelector('.correct-answer').textContent.includes(q.options[q.key]));assert.ok(d.querySelector('.chosen-answer').textContent.includes(q.options[wrong]));
  assert.equal(d.querySelectorAll('.correction-guide li').length,3);assert.match(d.querySelector('.correction-guide').textContent,/ainda não tem comentário individual/);
  d.querySelector('.correction-guide button').click();assert.deepEqual(a.actions.help.at(-1),[q.id,'lesson',wrong]);assert.equal(a.saved.at(-1).state.events.length,1);assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('trilha orienta uma matéria e inicia duas questões inclusive em disciplina de 2021',async()=>{
 const a=open();try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=path]').click();
  assert.match(d.querySelector('#path-next-title').textContent,/Seu próximo passo/);assert.equal(d.querySelector('#path-full-plan').open,false);
  d.querySelector('#lesson-subject').value='Direito Penal';d.querySelector('#lesson-practice').click();await pause();
  const session=a.saved.at(-1).state.session;assert.equal(session.ids.length,2);assert.equal(session.subject,'Direito Penal');assert.equal(session.exam,'pmmg2021');
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('erros de treinos anteriores podem ser praticados antes da data programada',async()=>{
 const a=open();let saved;try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#daily-start').click();await pause();
  const q=a.w.EXAM_BANK.questions.find(q=>q.id===a.saved.at(-1).state.session.ids[0]);
  d.querySelector(`.option[data-letter="${'ABCD'.split('').find(k=>k!==q.key)}"]`).click();d.querySelector('#check').click();
  saved=JSON.parse(JSON.stringify(a.saved.at(-1).state));saved.session=null;
 }finally{a.dom.window.close()}
 const b=open({snapshot:{profiles:{luanderson:saved},activeProfile:'luanderson'}});try{
  const d=b.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('#review-shortcut').click();await pause();
  const session=b.saved.at(-1).state.session;
  assert.equal(session.kind,'mistakes');assert.deepEqual(session.ids,Object.keys(saved.progress));assert.equal(b.charges.length,1);
  assert.equal(b.saved.at(-1).state.events.length,saved.events.length);
  assert.equal(b.saved.at(-1).state.progress[session.ids[0]].due,saved.progress[session.ids[0]].due);assert.deepEqual(b.errors,[]);
 }finally{b.dom.window.close()}
});

function performanceFixture(){
 const at=(offset,hour=12)=>{const d=new Date();d.setDate(d.getDate()+offset);d.setHours(hour,0,0,0);return d.toISOString();};
 const attempts=[
  {id:'pmmg2024-1',selected:0,correct:false,at:at(0,9)},
  {id:'pmmg2024-31',selected:2,correct:true,at:at(0,10)},
  {id:'pmmg2021-1',selected:3,correct:true,at:at(0,11)},
  {id:'pmmg2021-2',selected:1,correct:false,at:at(-2)},
  {id:'pmmg2024-3',selected:1,correct:true,at:at(-15)},
  {id:'pmmg2021-3',selected:1,correct:false,at:at(-45)},
  {id:'pmmg2023-2',selected:0,correct:true,at:at(0)}, // anulada: não entra
  {id:'pmmg2024-4',selected:0,correct:true,at:at(2)}, // data futura: não entra
 ];
 return toReferenceState({attempts,sessions:[],program:{}});
}
test('desempenho filtra períodos e gráfico soma exatamente as respostas válidas',()=>{
 const data=performanceFixture(),a=open({snapshot:{profiles:{luanderson:data},activeProfile:'luanderson'}});try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=insights]').click();
  const expected={today:[3,2,1,'67%'],'7':[4,2,2,'50%'],'30':[5,3,2,'60%'],all:[6,3,3,'50%']};
  for(const [period,values] of Object.entries(expected)){
   d.querySelector(`[data-performance-period="${period}"]`).click();
   assert.deepEqual(['total','correct','wrong','percent'].map(id=>d.querySelector('#performance-'+id).textContent),values.map(String));
   const rows=[...d.querySelectorAll('#performance-chart-table tr')];
   assert.equal(rows.reduce((n,row)=>n+Number(row.lastElementChild.textContent),0),values[0]);
   assert.equal(d.querySelector(`[data-performance-period="${period}"]`).getAttribute('aria-pressed'),'true');
  }
  assert.deepEqual(a.saved.at(-1).state.events,data.events);assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('desempenho combina matéria e prova e mostra estado vazio sem barras fictícias',()=>{
 const a=open({snapshot:{profiles:{luanderson:performanceFixture()},activeProfile:'luanderson'}});try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=insights]').click();d.querySelector('[data-performance-period="7"]').click();
  const select=(id,value)=>{d.querySelector('#'+id).value=value;d.querySelector('#'+id).dispatchEvent(new a.w.Event('change'));};
  select('performance-subject','Português');select('performance-exam','pmmg2021');
  assert.equal(d.querySelector('#performance-total').textContent,'2');assert.equal(d.querySelector('#performance-percent').textContent,'50%');
  select('performance-subject','Literatura');assert.equal(d.querySelector('#performance-empty').hidden,false);assert.equal(d.querySelector('#performance-percent').textContent,'0%');
  assert.equal(d.querySelector('#performance-ring').classList.contains('has-data'),false);
  assert.ok([...d.querySelectorAll('.performance-bar span')].every(n=>n.style.height==='0%'));
  d.querySelector('#performance-clear-filter').click();assert.equal(d.querySelector('#performance-total').textContent,'3');assert.equal(d.querySelector('#performance-empty').hidden,true);assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});

test('filtros salvos persistem no perfil, reabrem valores atuais e não vazam para outro aluno',()=>{
 const a=open({snapshot:{profiles:{luanderson:performanceFixture()},activeProfile:'luanderson'}});let snapshot;try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=insights]').click();d.querySelector('[data-performance-period="7"]').click();
  d.querySelector('#performance-filter-name').value='Meu filtro <img src=x onerror=alert(1)>';
  d.querySelector('#performance-save-filter').click();assert.equal(d.querySelector('#performance-saved-count').textContent,'1');
  snapshot=JSON.parse(JSON.stringify(a.saved.at(-1).state));
  d.querySelector('#performance-saved-tab').click();assert.equal(d.querySelector('#performance-saved').hidden,false);assert.equal(d.querySelector('#performance-saved-list img'),null);
  d.querySelector('#switch-profile').click();d.querySelector('[data-profile=jackeline]').click();d.querySelector('[data-tab=insights]').click();
  assert.equal(d.querySelector('#performance-total').textContent,'0');assert.equal(d.querySelector('#performance-saved-count').textContent,'0');
  assert.equal(d.querySelector('#performance-general').hidden,false);assert.equal(d.querySelector('[data-performance-period=today]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
 const b=open({snapshot:{profiles:{luanderson:snapshot},activeProfile:'luanderson'}});try{
  const d=b.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=insights]').click();d.querySelector('[data-performance-period=today]').click();
  d.querySelector('#performance-saved-tab').click();[...d.querySelectorAll('#performance-saved-list button')].find(b=>b.textContent==='Abrir filtro').click();
  assert.equal(d.querySelector('#performance-total').textContent,'4');assert.equal(d.querySelector('[data-performance-period="7"]').getAttribute('aria-pressed'),'true');
  d.querySelector('#performance-saved-tab').click();[...d.querySelectorAll('#performance-saved-list button')].find(b=>b.textContent==='Remover').click();assert.equal(d.querySelector('#performance-saved-count').textContent,'0');assert.equal(b.saved.at(-1).state.events.length,snapshot.events.length);assert.deepEqual(b.errors,[]);
 }finally{b.dom.window.close()}
});

test('gráfico mantém tentativas sem horário em intervalo identificado',()=>{
 const data=performanceFixture();data.events[0].at=null;
 const a=open({snapshot:{profiles:{luanderson:data},activeProfile:'luanderson'}});try{
  const d=a.w.document;d.querySelector('[data-profile=luanderson]').click();d.querySelector('[data-tab=insights]').click();
  const rows=[...d.querySelectorAll('#performance-chart-table tr')];assert.ok(rows.some(row=>row.textContent.includes('Horário não informado')));
  assert.equal(rows.reduce((n,row)=>n+Number(row.lastElementChild.textContent),0),Number(d.querySelector('#performance-total').textContent));assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close()}
});
