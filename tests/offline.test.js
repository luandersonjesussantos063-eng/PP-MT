import test from 'node:test';import assert from 'node:assert/strict';
import {rememberAccount,cachedAccount,forgetAccount,createProgressSync} from '../offline.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
test('acesso local exige conta previamente conectada e dados no mesmo aparelho',()=>{
 const storage=memory();assert.equal(cachedAccount(storage),null);rememberAccount(storage,{id:'a',email:'a@x'});assert.equal(cachedAccount(storage),null);
 storage.setItem('ppmt-v2:a','{}');assert.equal(cachedAccount(storage).id,'a');forgetAccount(storage);assert.equal(cachedAccount(storage),null);
});
test('offline guarda a versão mais recente e só escreve depois de verificar a conta online',async()=>{
 const storage=memory(),writes=[];let online=false,checks=0;
 const sync=createProgressSync({storage,online:()=>online,verify:async()=>{checks++;return {id:'a'}},write:async(id,s)=>writes.push(s)});
 await sync.queue('a',{attempts:[1]});await sync.queue('a',{attempts:[1,2]});assert.equal(writes.length,0);assert.equal(checks,0);assert.ok(sync.pending('a'));
 online=true;await sync.flush('a');assert.deepEqual(writes,[{attempts:[1,2]}]);assert.equal(checks,1);assert.equal(sync.pending('a'),false);
});
test('falha de rede preserva pendência inclusive ao reabrir o app',async()=>{
 const storage=memory(),settings={storage,online:()=>true,verify:async()=>({id:'a'}),write:async()=>{throw Error('network')}};
 const sync=createProgressSync(settings);await sync.queue('a',{attempts:[1]});assert.ok(sync.pending('a'));
 const next=createProgressSync({...settings,write:async()=>{}});await next.flush('a');assert.equal(next.pending('a'),false);
});
test('conta trocada ou sessão revogada não pode enviar os dados de outro usuário',async()=>{
 const storage=memory();let writes=0;const sync=createProgressSync({storage,online:()=>true,verify:async()=>({id:'b'}),write:async()=>writes++});
 await sync.queue('a',{attempts:[1]});assert.equal(writes,0);assert.ok(sync.pending('a'));assert.equal(sync.pending('b'),false);
});
test('uma resposta durante o envio não é apagada nem sobrescrita por resposta atrasada',async()=>{
 const storage=memory(),writes=[];let release;
 const barrier=new Promise(resolve=>release=resolve),sync=createProgressSync({storage,online:()=>true,verify:async()=>({id:'a'}),write:async(id,s)=>{writes.push(s);if(writes.length===1)await barrier}});
 const first=sync.queue('a',{n:1});await new Promise(resolve=>setImmediate(resolve));const second=sync.queue('a',{n:2});release();await Promise.all([first,second]);assert.deepEqual(writes,[{n:1},{n:2}]);assert.equal(sync.pending('a'),false);
});
test('autenticação offline abre dados locais sem SDK, refresh ou requisições externas',async()=>{
 const storage=memory();storage.setItem('ppmt-v2:a','{}');rememberAccount(storage,{id:'a'});
 globalThis.localStorage=storage;Object.defineProperty(globalThis,'navigator',{value:{onLine:false},configurable:true});
 const before=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network')};
 try{const auth=await import('../auth.js');assert.equal((await auth.getCurrentUser()).id,'a');assert.equal(await auth.loadUserState('a'),null);await auth.signOut();assert.equal(await auth.getCurrentUser(),null)}finally{globalThis.fetch=before}
});
