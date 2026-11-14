import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {build} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
import {PMMG_EXAMS,PMMG_QUESTIONS,PMMG_SUBJECTS} from '../pmmg-bank.js';
import {migratePMMGState} from '../pmmg-state.js';
import {validateBank} from '../core.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const legacy={attempts:[{id:'mt-old',correct:true}],favorites:['mt-old'],custom:[],sessions:[],program:{profile:{days:[1,3,5],minutes:35,schedule:'weekly'},xp:900,answerSound:false}};
test('migração arquiva integralmente o estado PP-MT, preserva rotina e não mistura estatísticas',()=>{
 const before=JSON.stringify(legacy),state=migratePMMGState(legacy);
 assert.equal(JSON.stringify(legacy),before);
 assert.deepEqual(state.legacyPPMT,legacy);
 assert.deepEqual(state.program.profile,legacy.program.profile);
 assert.equal(state.program.answerSound,false);
 assert.deepEqual(state.attempts,[]);assert.deepEqual(state.favorites,[]);
 assert.equal(state.program.xp,undefined);
 assert.equal(migratePMMGState(state),state);
});
test('banco PMMG preserva quatro provas, 171 válidas, quatro alternativas e todas as imagens locais',()=>{
 validateBank(PMMG_QUESTIONS);
 assert.equal(PMMG_QUESTIONS.length,171);assert.equal(PMMG_EXAMS.length,4);
 assert.equal(PMMG_SUBJECTS.length,11);
 assert.equal(PMMG_EXAMS.reduce((n,e)=>n+e.total,0),180);
 assert.equal(PMMG_EXAMS.reduce((n,e)=>n+e.annulled.length,0),9);
 assert.equal(new Set(PMMG_QUESTIONS.map(q=>q.id)).size,171);
 for(const q of PMMG_QUESTIONS){
  const exam=PMMG_EXAMS.find(e=>e.id===q.source.examId);
  assert.ok(exam&&!exam.annulled.includes(Number(q.source.number)));
  assert.equal(q.options.length,4);
  for(const image of [...q.facsimile,...q.contextImages])assert.ok(existsSync(new URL('../'+image,import.meta.url)),image);
 }
});
const names=[...read('auth.js').matchAll(/export (?:async )?function (\w+)/g)].map(m=>m[1]);
const auth=names.map(n=>`export async function ${n}(...args){${['getCurrentUser','verifiedUser','signIn'].includes(n)?"return {id:'test-account',email:'aluno@example.com'}":n==='loadUserState'?'return window.__seed':n==='saveUserState'?'window.__saved=args[1];return null':n==='loadMembership'?"return {active:true,premium:true}":'return null'}}`).join('\n');
const bundle=await build({stdin:{contents:read('app.js')+'\nwindow.__pmmgTest={bank,beginLearning,navigate,renderData};',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',define:{'import.meta.url':JSON.stringify('https://ppmt.novabytesolucoes.com.br/app.js')},plugins:[{name:'external-services-only',setup(b){
 b.onLoad({filter:/\/auth\.js$/},()=>({contents:auth,loader:'js'}));
 b.onLoad({filter:/\/account-services\.js$/},()=>({contents:`export const loginWithGoogle=async()=>{},takeGoogleReturn=()=>false,takeGoogleAuthError=()=>null,myPremiumOffers=async()=>[],studyQuota=async()=>({allowed:true,premium:true,daily_remaining:999});`,loader:'js'}));
 b.onLoad({filter:/\/notifications\.js$/},()=>({contents:`export function createNotificationCenter(){return {paintBell(){},start(){},stop(){},unregisterOnLogout:async()=>{},renderInbox:async()=>{}}}`,loader:'js'}));
}}]});
async function open(seed=legacy){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(read('index.html'),{url:'https://ppmt.novabytesolucoes.com.br/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.__seed=structuredClone(seed);w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.confirm=()=>true;
 w.fetch=async()=>({ok:true,json:async()=>({version:'3.1.0'})});w.eval(bundle.outputFiles[0].text);
 await new Promise(r=>setTimeout(r,35));return {dom,w,errors};
}
test('app real inicia com a conta existente, migra estado e abre banco, textos e todas as ferramentas',async()=>{
 const {dom,w,errors}=await open();
 try{
  assert.equal(w.__saved.contest,'PMMG');assert.equal(w.__saved.legacyPPMT.program.xp,900);
  assert.equal(w.__pmmgTest.bank().length,171);
  for(const hash of ['questoes','materias','provas','conteudos','edital','noticias','rotina','desempenho','simulados','dados','estudar']){
   w.location.hash=hash;w.__pmmgTest.navigate();
   assert.ok(w.document.querySelector('#content').textContent.length>30,hash);
  }
  w.location.hash='questoes';w.__pmmgTest.navigate();
  assert.equal(w.document.querySelectorAll('[data-option]').length,4);
  assert.ok(w.document.querySelector('.question-context img'),'Texto de apoio visível');
  w.__pmmgTest.beginLearning(20,'Língua Portuguesa');w.__pmmgTest.navigate();
  assert.ok(w.document.querySelector('#learnNext'));
  assert.deepEqual(errors.map(e=>e.message),[]);
 }finally{dom.window.close()}
});
test('nomes públicos e metadados apresentam somente a identidade PMMG',async()=>{
 const {readdirSync}=await import('node:fs');
 const files=['index.html',...readdirSync('planos',{recursive:true}).filter(f=>f.endsWith('.html')).map(f=>'planos/'+f)];
 for(const file of files){
  const dom=new JSDOM(read(file));
  try{
   dom.window.document.querySelectorAll('script,style').forEach(el=>el.remove());
   assert.doesNotMatch(dom.window.document.documentElement.textContent,/Polícia Penal|POLÍCIA PENAL|PPMT|PP-MT|SEJUDH/,file);
   for(const meta of dom.window.document.querySelectorAll('meta[name=description],meta[property="og:title"],meta[property="og:description"]'))assert.doesNotMatch(meta.content,/Polícia Penal|Mato Grosso|PPMT|PP-MT/,file);
  }finally{dom.window.close()}
 }
 const app=read('app.js'),notices=read('notifications.js');
 assert.doesNotMatch(app,/SEJUDH\/MT 2016\/2017|Ler comentários MT|Itens de MT com ressalvas/);
 assert.doesNotMatch(notices,/Polícia Penal de Mato Grosso|Libere a permissão do PP-MT/);
});
test('identidade visual herda os tons exatos do app PMMG anterior',()=>{
 const css=read('style.css');
 for(const token of ['--bg:#101337','--panel:#191d5e','--accent:#ffcb05','border-bottom:3px solid #bb2127'])assert.ok(css.includes(token),token);
 for(const file of ['style.css','planos/style.css','planos/premium.css','planos/assinar.css'])assert.doesNotMatch(read(file),/#d5b36a|#dcb975|#edc784/i,file);
});
test('tela inicial tem só um próximo passo, cinco destinos e detalhes recolhidos',async()=>{
 const {dom,w,errors}=await open();
 try{
  const doc=w.document;
  assert.equal(doc.querySelectorAll('#nav a').length,5);
  assert.deepEqual([...doc.querySelectorAll('#nav a')].map(x=>x.hash),['#inicio','#estudar','#erros','#desempenho','#mais']);
  assert.equal(doc.querySelectorAll('.focus-home .primary').length,1);
  assert.equal(doc.querySelectorAll('.command-v218,.command-metrics,.command-quick,.quick-actions').length,0);
  assert.equal(doc.querySelector('.focus-details').open,false);
  const before=JSON.parse(w.localStorage.getItem('ppmt-v2:test-account'));
  doc.querySelector('#beginLearning').click();await new Promise(r=>setTimeout(r,10));
  w.__pmmgTest.navigate();
  const state=JSON.parse(w.localStorage.getItem('ppmt-v2:test-account'));
  assert.ok(state.program.learning.ids.length<=5);
  assert.deepEqual(state.program.profile,before.program.profile);
  assert.equal(doc.querySelectorAll('#learnNext.primary').length,1);
  doc.querySelector('#learnNext').click();
  const option=doc.querySelector('[data-learning-answer]');assert.ok(option);option.click();
  await new Promise(r=>setTimeout(r,10));
  assert.ok(doc.querySelector('.feedback'));
  assert.equal(JSON.parse(w.localStorage.getItem('ppmt-v2:test-account')).attempts.length,1);
  assert.deepEqual(errors.map(e=>e.message),[]);
 }finally{dom.window.close()}
});
test('Mais mantém todas as ferramentas em grupos fechados, sem esconder a atualização',async()=>{
 const {dom,w}=await open();
 try{
  w.location.hash='mais';w.__pmmgTest.navigate();const doc=w.document;
  assert.equal(doc.querySelectorAll('.focus-menu>details').length,4);
  assert.ok([...doc.querySelectorAll('.focus-menu>details')].every(d=>!d.open));
  for(const target of ['#simulados','#provas','#dados','#rotina','#plano','#questoes','#videoaulas'])assert.ok(doc.querySelector(`.focus-menu a[href="${target}"]`),target);
  assert.ok(doc.querySelector('#checkAppUpdates'));
  const details=doc.querySelector('#answerSoundToggle').closest('details');details.open=true;
  doc.querySelector('#answerSoundToggle').click();assert.equal(details.open,true);
  w.location.hash='questoes';w.__pmmgTest.navigate();assert.equal(doc.querySelector('.question-filters').open,false);
  assert.equal(doc.querySelector('#nav [aria-current="page"]').hash,'#mais');
 }finally{dom.window.close()}
});
test('primeiro acesso começa sem formulário longo e bloco salvo pode ser retomado',async()=>{
 const {dom,w}=await open({contest:'PMMG',attempts:[],favorites:[],custom:[],sessions:[],program:{}});
 let snapshot;
 try{
  assert.ok(w.document.querySelector('#beginLearning'));
  assert.equal(w.document.querySelector('#routineForm'),null);
  w.document.querySelector('#beginLearning').click();await new Promise(r=>setTimeout(r,10));
  snapshot=JSON.parse(w.localStorage.getItem('ppmt-v2:test-account'));
  assert.ok(snapshot.program.profile);assert.ok(snapshot.program.learning.ids.length<=5);
 }finally{dom.window.close()}
 const resumed=await open(snapshot);
 try{
  assert.match(resumed.w.document.querySelector('#beginLearning').textContent,/Continuar estudo/);
  assert.deepEqual(JSON.parse(resumed.w.localStorage.getItem('ppmt-v2:test-account')).program.learning.ids,snapshot.program.learning.ids);
 }finally{resumed.dom.window.close()}
});
