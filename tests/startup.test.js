import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,transform} from 'esbuild';
import {JSDOM,VirtualConsole} from 'jsdom';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const bundle=(await transform(read('app.bundle.js'),{format:'iife',define:{'import.meta.url':JSON.stringify('https://ppmt.novabytesolucoes.com.br/app.bundle.js')}})).code;
function browser({offline=false}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(read('index.html'),{url:'https://ppmt.novabytesolucoes.com.br/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.HTMLMediaElement.prototype.pause=()=>{};w.HTMLMediaElement.prototype.play=()=>Promise.resolve();
 w.WebSocket=globalThis.WebSocket;w.AbortController=globalThis.AbortController;w.TextEncoder=globalThis.TextEncoder;w.TextDecoder=globalThis.TextDecoder;w.BroadcastChannel=undefined;
 w.fetch=async()=>{throw new TypeError('Network unavailable')};
 if(offline)Object.defineProperty(w.navigator,'onLine',{value:false});
 return {dom,w,errors};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,35));
test('entrada HTML mostra carregamento, nunca apresenta o texto estático como se fosse o app',()=>{
 const {dom,w}=browser();try{
  assert.ok(w.document.querySelector('#app-startup'));
  assert.equal(w.document.querySelector('#startup-recovery').hidden,true);
  assert.match(w.document.querySelector('script[src*="app-loader.js"]').src,/app-loader\.js\?v=3\.1\.1/);
  assert.doesNotMatch(w.document.querySelector('#content').textContent,/Plataforma independente|Conheça o aplicativo/);
 }finally{dom.window.close()}
});
test('pacote completo real abre login mesmo sem rede, sem substituir os módulos de autenticação',async()=>{
 const {dom,w,errors}=browser({offline:true});try{
  w.eval(bundle);await tick();
  assert.ok(w.document.querySelector('#authForm'),'O formulário de login deve aparecer');
  assert.equal(w.document.querySelector('#app-startup'),null);
  assert.equal(w.__PMMG_READY__,true);assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('pacote real retoma conta e painel offline e mantém o histórico existente',async()=>{
 const {dom,w,errors}=browser({offline:true});const state={contest:'PMMG',attempts:[{id:'pmmg2021-1',correct:true,selected:3,at:'2026-11-14T10:00:00Z'}],favorites:[],custom:[],sessions:[],program:{}};
 try{
  w.localStorage.setItem('ppmt-offline-account',JSON.stringify({id:'startup-account',email:'aluno@example.com'}));
  w.localStorage.setItem('ppmt-v2:startup-account',JSON.stringify(state));
  w.eval(bundle);await tick();
  assert.ok(w.document.querySelector('.focus-home #beginLearning'));
  assert.equal(w.__PMMG_READY__,true);
  assert.equal(JSON.parse(w.localStorage.getItem('ppmt-v2:startup-account')).attempts.length,1);
  assert.deepEqual(errors,[]);
 }finally{dom.window.close()}
});
test('falha de download exibe recuperação e não apaga a conta ou o progresso',async()=>{
 const failed=(await build({stdin:{contents:read('app-loader.js'),resolveDir:process.cwd()},write:false,bundle:true,format:'iife',plugins:[{name:'download-failure',setup(b){b.onResolve({filter:/app\.bundle\.js/},()=>({path:'failed-download',namespace:'failure'}));b.onLoad({filter:/.*/,namespace:'failure'},()=>({contents:"throw new Error('Download failed');",loader:'js'}))}}]})).outputFiles[0].text;
 const {dom,w}=browser();try{
  w.localStorage.setItem('ppmt-v2:my-account','preserved');w.eval(failed);await tick();
  assert.equal(w.document.querySelector('#startup-recovery').hidden,false);
  assert.match(w.document.querySelector('#startup-status').textContent,/Não foi possível carregar/);
  assert.ok(w.document.querySelector('#startup-retry'));
  assert.equal(w.localStorage.getItem('ppmt-v2:my-account'),'preserved');
 }finally{dom.window.close()}
});
