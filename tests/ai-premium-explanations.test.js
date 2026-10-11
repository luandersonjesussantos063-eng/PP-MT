import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {makeExplainHandler,validateQuestion,cacheKey} from '../supabase/functions/ppmt-ai-explain/logic.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const question={id:'mt-1234',subject:'Direito Constitucional',topic:'Direitos e garantias fundamentais',
 statement:'Qual é a alternativa CORRETA a respeito dos direitos fundamentais assegurados pela Constituição Federal de 1988?',
 options:['Direitos fundamentais são ilimitados.','O direito à vida é protegido constitucionalmente.','O habeas corpus depende sempre de advogado.'],
 answer_index:1,selected_index:0,existing_explanation:'Constituição de 1988, art. 5º'};
const user={id:'33333333-3333-4333-8333-333333333333',email:'aluno@example.org',email_confirmed_at:'2026-10-10T00:00:00Z',is_anonymous:false};
const request=(input={action:'explain',question},jwt='FAKE_TOKEN')=>new Request('https://example.invalid/functions/v1/ppmt-ai-explain',{
 method:'POST',headers:{Origin:ORIGIN,authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify(input)
});
const mock=({premium=false,cached=null,ready=true,reserve=true}={})=>{
 const calls={ai:0,cache:0,tier:0,reserved:0,saved:0};
 const db={
  tier:async()=>{calls.tier++;return premium?'premium':'free';},
  cached:async()=>{calls.cache++;return cached;},
  ready:async()=>ready,
  reserve:async()=>{calls.reserved++;return reserve;},
  save:async(key,explanation,sources)=>{calls.saved++;assert.equal(key.length,64);assert.ok(explanation);assert.ok(Array.isArray(sources));}
 };
 const h=makeExplainHandler({
  authenticate:async()=>user,db,
  generate:async()=>{calls.ai++;return {explanation:'Você errou porque considerou absolutos os direitos fundamentais. A resposta correta protege o direito à vida. Lembre que direitos podem coexistir e devem ser interpretados conforme a Constituição.',sources:[{title:'Planalto',url:'https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm'},{title:'Inseguro',url:'javascript:alert(1)'}]};}
 });
 return {h,calls};
};
test('aluno gratuito não acessa IA nem cache, mesmo com resposta existente',async()=>{
 const {h,calls}=mock({premium:false,cached:{explanation:'INFORMACAO_PRIVADA_DE_CACHE',sources:[]}});
 const resp=await h(request());
 assert.equal(resp.status,402);
 const payload=await resp.json();
 assert.equal(payload.upgrade_url,'./planos/assinar.html');
 assert.doesNotMatch(JSON.stringify(payload),/INFORMACAO_PRIVADA/);
 assert.equal(calls.cache,0);assert.equal(calls.ai,0);assert.equal(calls.reserved,0);
});
test('assinante Premium consulta IA e retorna explicação + fontes https sem revelar segredo',async()=>{
 const {h,calls}=mock({premium:true});
 const resp=await h(request());
 assert.equal(resp.status,200);
 const data=await resp.json();
 assert.match(data.explanation,/resposta correta/);
 assert.equal(data.sources.length,1);
 assert.equal(data.sources[0].url.startsWith('https:'),true);
 assert.equal(calls.ai,1);assert.equal(calls.reserved,1);assert.equal(calls.saved,1);
 assert.doesNotMatch(JSON.stringify(data),/OPENAI_API_KEY|FAKE_TOKEN/);
});
test('cache só é consultado depois do Premium e não gasta chamada',async()=>{
 const {h,calls}=mock({premium:true,cached:{explanation:'Comentário estudado; regra e entendimento consolidados para estudantes assinantes Premium.',sources:[]}});
 const resp=await h(request());
 assert.equal(resp.status,200);
 assert.equal((await resp.json()).cached,true);
 assert.equal(calls.ai,0);assert.equal(calls.reserved,0);assert.equal(calls.cache,1);
});
test('limite diário e ausência de provedor não produzem requisições de IA',async()=>{
 for(const options of [{ready:false},{reserve:false}]){
  const {h,calls}=mock({premium:true,...options});
  const resp=await h(request());
  assert.equal(resp.status,options.ready===false?503:429);
  assert.equal(calls.ai,0);
 }
});
test('somente erro respondido é aceito, e assinatura autenticada é obrigatória',async()=>{
 const {h,calls}=mock({premium:true});
 const correct=await h(request({action:'explain',question:{...question,selected_index:1}}));
 assert.equal(correct.status,422);
 const unauth=await h(request(undefined,''));
 assert.equal(unauth.status,401);
 const badOrigin=await h(new Request('https://example.invalid/functions/v1/ppmt-ai-explain',{method:'POST',headers:{Origin:'https://site-desconhecido.com',Authorization:'Bearer TOKEN'},body:'{}'}));
 assert.equal(badOrigin.status,403);
 assert.equal(calls.ai,0);
});
test('chave do provedor não aparece no aplicativo e autenticação é no servidor',()=>{
 const client=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
 const backend=readFileSync(new URL('../supabase/functions/ppmt-ai-explain/index.ts',import.meta.url),'utf8');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../database/ppmt-ai-explanations.sql',import.meta.url),'utf8');
 assert.match(app,/Explicar meu erro com IA/);
 assert.match(app,/explainQuestionWithAI/);
 assert.match(client,/functions\.invoke\('ppmt-ai-explain'/);
 assert.doesNotMatch(client+app,/OPENAI_API_KEY|api\.openai\.com/);
 assert.match(backend,/OPENAI_API_KEY/);
 assert.match(backend,/auth\.getUser\(jwt\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/p_user_limit/);
 assert.match(sql,/service_role/);
});
test('hash do cache é estável e sensível à questão',async()=>{
 const k=await cacheKey(validateQuestion({question}));
 const k2=await cacheKey(validateQuestion({question:{...question,selected_index:2}}));
 assert.match(k,/^[a-f0-9]{64}$/);
 assert.notEqual(k,k2);
});
