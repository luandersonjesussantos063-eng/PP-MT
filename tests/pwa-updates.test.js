import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('app.js');
const html=read('index.html');
const sw=read('sw.js');
const workflow=read('.github/workflows/deploy.yml');
const version=app.match(/const APP_VERSION='([^']+)'/)?.[1];

test('versão, scripts, estilos e service worker usam a mesma versão',()=>{
 assert.equal(version,'2.20.9');
 assert.ok(html.includes('./app.js?v='+version));
 assert.ok(html.includes('./style.css?v='+version));
 assert.ok(html.includes('V '+version));
 assert.ok(app.includes("register('./sw.js?v="+version+"'"));
 assert.ok(sw.includes("const CACHE='ppmt-"+version+"-"));
});
test('instalação não depende de centenas de PDFs ou imagens',()=>{
 assert.match(sw,/Promise\.allSettled\(\[\.\.\.new Set\(FILES\)\]/);
 assert.doesNotMatch(sw,/addAll\(\[\.\.\.new Set\(\[\.\.\.FILES,\.\.\.OFFLINE_ASSETS\]\)\]\)/);
 assert.match(sw,/self\.skipWaiting\(\)/);
 assert.match(sw,/self\.clients\.claim\(\)/);
});
test('scripts e HTML usam rede antes do cache offline',()=>{
 assert.match(sw,/const fresh=navigation/);
 assert.match(sw,/cache:fresh\?'no-store':'default'/);
 assert.match(app,/updateViaCache:'none'/);
 assert.match(app,/controllerchange/);
 assert.match(app,/visibilitychange/);
 assert.match(app,/checkAppUpdates/);
});
test('pacote publica videoaulas e valida dependências antes do deploy',()=>{
 assert.match(workflow,/video-lessons\.js video-catalog\.js sw\.js/);
 assert.match(workflow,/node tools\/check_dist\.mjs/);
 assert.match(workflow,/node --check video-lessons\.js/);
 assert.ok(fs.existsSync(new URL('../tools/check_dist.mjs',import.meta.url)));
});
