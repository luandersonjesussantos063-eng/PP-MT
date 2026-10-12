import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = name => readFileSync(new URL('../'+name,import.meta.url),'utf8');

const CURRENT_VERSION=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

test('dock móvel do iOS sai de dentro do aside que possui altura zero',()=>{
 const app=read('app.js');
 assert.match(app,/const mobileDock=document\.getElementById\('nav'\)/);
 assert.match(app,/document\.body\.appendChild\(mobileDock\)/);
 assert.match(app,/sidebarDockHome\.appendChild\(mobileDock\)/);
 assert.match(app,/mobileDockQuery\.addEventListener\('change',placeMobileDock\)/);
 assert.match(app,/mobileDock\.classList\.add\('ppmt-mobile-dock'\)/);
});
test('dock iOS é fixado no fundo respeitando a safe area e não esconde conteúdo',()=>{
 const css=read('style.css');
 assert.match(css,/body > #nav\.ppmt-mobile-dock\s*\{/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/inset:auto 0 0 0!important/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/padding-bottom:var\(--ppmt-mobile-dock-height\)!important/);
 assert.match(css,/body > #nav\.ppmt-mobile-dock a\.mobile-extra\{display:none!important\}/);
 assert.match(css,/#content \.concurso-strip\{display:none\}/);
});
test('iOS mantém PWA instalável, versão e cache sincronizados',()=>{
 const html=read('index.html'),sw=read('sw.js'),app=read('app.js');
 assert.match(html,/apple-mobile-web-app-capable" content="yes"/);
 assert.match(html,/viewport-fit=cover/);
 assert.ok(html.includes('style.css?v='+CURRENT_VERSION));
 assert.ok(html.includes('app.js?v='+CURRENT_VERSION));
 assert.ok(app.includes("APP_VERSION='"+CURRENT_VERSION+"'"));
 assert.ok(sw.includes('ppmt-'+CURRENT_VERSION+'-'));
 assert.ok(sw.includes('style.css?v='+CURRENT_VERSION));
 assert.ok(sw.includes('app.js?v='+CURRENT_VERSION));
});
