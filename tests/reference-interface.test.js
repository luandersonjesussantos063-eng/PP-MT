import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {toReferenceState,mountReferenceUI,leaveReferenceUI} from '../reference-ui.js';
const read=f=>fs.readFileSync(new URL('../missao/'+f,import.meta.url),'utf8');
const pause=()=>new Promise(r=>setTimeout(r,5));
function open({id='account-a',snapshot={profiles:{},activeProfile:null,legacy:toReferenceState({})},allowed=true}={}){
 const errors=[],saved=[],charges=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(read('index.html'),{url:'https://ppmt.novabytesolucoes.com.br/missao/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});
 const w=dom.window;w.scrollTo=()=>{};w.confirm=()=>true;
 const bridge={id,initial:()=>snapshot,save(data){const name=data.activeProfile;saved.push({name,state:JSON.parse(JSON.stringify(data.profiles[name]))})},pull:async()=>null,allow:async(kind,count)=>{charges.push({kind,count});return allowed},openAccount(){},logout(){}};
 Object.defineProperty(w,'parent',{value:{MFAccountBridge:bridge}});
 for(const file of ['banco-transcrito.js','core.js','sync.js','account-bridge.js','app.js'])w.eval(read(file));
 return {dom,w,saved,charges,errors};
}
test('interface do vídeo mantém exatamente as abas Hoje, Questões, Trilha e Evolução',()=>{
 const a=open();try{
  assert.deepEqual([...a.w.document.querySelectorAll('.tabs [data-tab]')].map(x=>x.textContent.trim().replace(/^[^\p{L}]+/u,'')),['Início','Estudar','Trilha','Evolução']);
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
  const written=[];const options={getState:()=>({attempts:[],program:{}}),saveSnapshot:s=>written.push(s),pull:async()=>null,allow:async()=>true,openAccount(){},logout(){}};
  mountReferenceUI({...options,user:{id:'account-a'}});const stale=window.MFAccountBridge;
  assert.ok(document.body.classList.contains('reference-mode'));
  assert.match(document.querySelector('iframe').src,/missao\/index.html/);
  mountReferenceUI({...options,user:{id:'account-b'}});
  stale.save({profiles:{luanderson:{events:[],sessions:[],progress:{}}},activeProfile:'luanderson'});assert.equal(written.length,0);
  window.MFAccountBridge.save({profiles:{jackeline:{events:[],sessions:[],progress:{}}},activeProfile:'jackeline'});assert.equal(written.length,1);
  leaveReferenceUI(true);assert.equal(document.querySelector('iframe'),null);assert.equal(window.MFAccountBridge,undefined);
 }finally{globalThis.window=oldWindow;globalThis.document=oldDocument;dom.window.close()}
});
