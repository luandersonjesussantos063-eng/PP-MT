import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const CURRENT_VERSION=JSON.parse(readFileSync(new URL('../version.json',import.meta.url),'utf8')).version;

test('V 2.20.4 não mostra cronômetro no cabeçalho mobile e preserva opções de conta',()=>{
 const page=read('index.html'),app=read('app.js'),css=read('style.css');
 assert.doesNotMatch(page,/id="studyClockMini"/);
 assert.doesNotMatch(app,/studyClockMini/);
 assert.match(app,/notificationBell/);
 assert.match(app,/Administração/);
 assert.match(app,/id="logout"/);
 assert.match(app,/studyClockToggle/);
 assert.match(app,/data-study-time/);
 assert.match(css,/\.main>header\{display:flex;flex-wrap:nowrap/);
 assert.match(css,/\.main>header \.header-right\{display:flex;align-items:center/);
 assert.match(css,/\.main>header \.admin-label\{display:none\}/);
 assert.ok(page.includes('app.js?v='+CURRENT_VERSION));
 assert.ok(page.includes('style.css?v='+CURRENT_VERSION));
 assert.ok(app.includes("APP_VERSION='"+CURRENT_VERSION+"'"));
 assert.ok(read('sw.js').includes("const CACHE='ppmt-"+CURRENT_VERSION+'-'));
});
