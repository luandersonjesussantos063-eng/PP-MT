import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildNativeBundle} from '../mobile/prepare.mjs';
import {makePracticeHandler} from '../supabase/functions/ppmt-premium-practice/logic.js';
import {makeExplainHandler} from '../supabase/functions/ppmt-ai-explain/logic.js';

const root=fileURLToPath(new URL('../',import.meta.url));
test('preparação Android/iOS gera aplicativo local e não altera os arquivos do site',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'ppmt-mobile-'));
 const original=readFileSync(join(root,'index.html'),'utf8');
 try{
  const result=buildNativeBundle({root,out:join(tmp,'www'),includeAssets:false});
  assert.equal(result.hasAssets,false);
  const index=readFileSync(join(tmp,'www','index.html'),'utf8');
  assert.match(index,/mobile-runtime\.js/);
  assert.match(index,/app\.js/);
  assert.doesNotMatch(index,/<script\s+defer\s+src="\.\/analytics\.js/);
  const account=readFileSync(join(tmp,'www','planos','account.js'),'utf8');
  assert.match(account,/renderMembership/);
  assert.doesNotMatch(account,/Mercado Pago|Assinar por|R\$ 19,99/);
  const nativePay=readFileSync(join(tmp,'www','planos','assinar.html'),'utf8');
  assert.doesNotMatch(nativePay,/mercadopago\.com\.br|checkout\/preferences|card_start|manual_checkout|R\$ 19,99/);
  assert.match(nativePay,/Novas compras digitais não estão disponíveis/);
  assert.ok(existsSync(join(tmp,'www','planos','privacidade.html')));
  assert.ok(existsSync(join(tmp,'www','planos','premium.js')));
  assert.ok(existsSync(join(tmp,'www','mobile-runtime.js')));
  assert.ok(!existsSync(join(tmp,'www','admin')),'Painéis administrativos não fazem parte do pacote');
  const app=readFileSync(join(tmp,'www','app.js'),'utf8');
  assert.match(app,/!window\.__PPMT_NATIVE__&&'serviceWorker'in navigator/);
  assert.equal(readFileSync(join(root,'index.html'),'utf8'),original);
 }finally{rmSync(tmp,{recursive:true,force:true});}
});
test('capacitador usa identidade permanente e sem URL remota',()=>{
 const settings=JSON.parse(readFileSync(join(root,'mobile','capacitor.config.json'),'utf8'));
 assert.equal(settings.appId,'br.com.novabytesolucoes.ppmt');
 assert.equal(settings.webDir,'www');
 assert.ok(!settings.server.url,'Um wrapper remoto não permite o teste offline de qualidade');
 assert.notEqual(settings.android.allowMixedContent,true);
});
test('script da loja bloqueia checkout externo e remove login Google até configurar OAuth nativo',()=>{
 const code=readFileSync(join(root,'mobile','native-runtime.js'),'utf8');
 assert.match(code,/mercadopago\.com\.br/);
 assert.match(code,/googleSignIn/);
 assert.match(code,/stopImmediatePropagation/);
});

test('APIs do Premium e da IA aceitam origens nativas, mas exigem conta autenticada',async()=>{
 const p=makePracticeHandler({authenticate:async()=>null,db:{member:async()=>null}});
 const ai=makeExplainHandler({authenticate:async()=>null,db:{},generate:async()=>null});
 for(const origin of ['capacitor://localhost','https://localhost']){
  const headers={Origin:origin,'Content-Type':'application/json'};
  const preflight=await p(new Request('https://supabase.invalid/functions/v1/ppmt-premium-practice',{method:'OPTIONS',headers}));
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await p(new Request('https://supabase.invalid/functions/v1/ppmt-premium-practice',{method:'POST',headers,body:'{"action":"status"}'}))).status,401);
  const aiPreflight=await ai(new Request('https://supabase.invalid/functions/v1/ppmt-ai-explain',{method:'OPTIONS',headers}));
  assert.equal(aiPreflight.status,204);
  assert.equal(aiPreflight.headers.get('Access-Control-Allow-Origin'),origin);
  assert.equal((await ai(new Request('https://supabase.invalid/functions/v1/ppmt-ai-explain',{method:'POST',headers,body:'{"action":"explain"}'}))).status,401);
 }
 assert.equal((await p(new Request('https://supabase.invalid/functions/v1/ppmt-premium-practice',{method:'OPTIONS',headers:{Origin:'https://site-invalido.example'}}))).status,403);
 assert.equal((await ai(new Request('https://supabase.invalid/functions/v1/ppmt-ai-explain',{method:'OPTIONS',headers:{Origin:'https://site-invalido.example'}}))).status,403);
});
