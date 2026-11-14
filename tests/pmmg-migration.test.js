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
async function open(){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e));
 const dom=new JSDOM(read('index.html'),{url:'https://ppmt.novabytesolucoes.com.br/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.__seed=structuredClone(legacy);w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.confirm=()=>true;
 w.fetch=async()=>({ok:true,json:async()=>({version:'3.0.0'})});w.eval(bundle.outputFiles[0].text);
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
