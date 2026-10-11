import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,existsSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildNativeBundle} from '../mobile/prepare.mjs';

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
