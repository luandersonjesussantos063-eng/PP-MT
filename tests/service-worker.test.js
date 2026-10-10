import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function worker(){
 const handlers={},objects=new Map();let requested=[];
 const store={addAll:async paths=>{requested=paths;for(const p of paths){assert.ok(fs.existsSync(new URL('../'+(p==='./'?'index.html':p.split('?')[0]),import.meta.url)),p);objects.set(new URL(p,'https://app.test/PP-MT/').href,new Response('cached '+p))}},put:async(req,r)=>objects.set(req.url,r)};
 const caches={open:async()=>store,keys:async()=>['old','ppmt-v46'],delete:async()=>true,match:async req=>objects.get(typeof req==='string'?new URL(req,'https://app.test/PP-MT/').href:req.url)?.clone()};
 const context=vm.createContext({URL,Response,AbortController,caches,setTimeout:(fn)=>setTimeout(fn,2),clearTimeout,fetch:async()=>{throw Error('offline')},self:{location:{origin:'https://app.test'},skipWaiting(){},clients:{claim(){}},addEventListener:(type,fn)=>handlers[type]=fn}});
 vm.runInContext(source,context);
 return {handlers,context,requested:()=>requested,install:async()=>{let promise;handlers.install({waitUntil:p=>promise=p});await promise},request:async(url,mode='cors')=>{let result;handlers.fetch({request:{url,method:'GET',mode},respondWith:r=>result=r});return result?await result:null}};
}
test('preparo offline inclui todos os módulos locais, áudio, imagens e biblioteca de autenticação',async()=>{
 const w=worker();await w.install();const files=w.requested();assert.ok(files.length>380);assert.ok(files.some(p=>p.includes('assets/questions/')));assert.ok(files.some(p=>p.includes('assets/vendor/supabase')));
 const modules=fs.readdirSync(new URL('../',import.meta.url)).filter(p=>p.endsWith('.js')&&!p.startsWith('sw'));
 for(const file of modules)assert.ok(files.some(p=>p.startsWith('./'+file+'?')||p==='./'+file),file);
});
test('reabertura e arquivos do estudo continuam acessíveis sem nenhuma resposta de rede',async()=>{
 const w=worker();await w.install();
 for(const path of ['index.html','app.js?v=2.18.0-domain2','auth.js?v=2.15.0','assets/vendor/supabase-2.117.2.js','syllabus-data.js?v=2.15.0']){const r=await w.request('https://app.test/PP-MT/'+path,path==='index.html'?'navigate':'cors');assert.equal(r.status,200,path)}
 const nav=await w.request('https://app.test/PP-MT/?reopen=1','navigate');assert.match(await nav.text(),/index.html/);
 assert.equal(await w.request('https://fermfbmhwlafwopwndoj.supabase.co/auth/v1/user'),null);
});
test('queda de conexão que não responde tem limite de espera e usa cópia local',async()=>{
 const w=worker();await w.install();w.context.fetch=async(req,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))));
 const result=await w.request('https://app.test/PP-MT/index.html','navigate');assert.equal(result.status,200);
});
test('notícias buscam a publicação atual e mantêm última cópia ao perder conexão',async()=>{
 const w=worker();await w.install();let calls=0;
 w.context.fetch=async()=>new Response('new feed '+(++calls));
 const url='https://app.test/PP-MT/assets/news/concurso.json';
 assert.equal(await (await w.request(url)).text(),'new feed 1');
 assert.equal(await (await w.request(url)).text(),'new feed 2');
 w.context.fetch=async()=>{throw Error('offline')};
 assert.equal(await (await w.request(url)).text(),'new feed 2');
});
