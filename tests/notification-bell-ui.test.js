import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('app.js'),css=read('style.css'),notices=read('notifications.js');
const sw=read('sw.js'),html=read('index.html');

test('sino do cabeçalho permanece como ícone discreto, com destino às notificações',()=>{
 assert.match(app,/href="#ofertas" class="notification-trigger" id="notificationBell"/);
 assert.match(app,/id="notificationBell"[\s\S]*?<svg viewBox="0 0 24 24"[\s\S]*?<span class="notification-dot" hidden/);
 assert.doesNotMatch(app,/id="notificationBell"[^>]*>🔔/);
 assert.match(css,/#notificationBell svg\{[\s\S]*?width:19px/);
 assert.match(css,/#notificationBell\{[\s\S]*?width:38px/);
});
test('notificações alteram só o pontinho, sem substituir ou apagar o sino',()=>{
 assert.match(notices,/dot\.hidden=count===0/);
 assert.match(notices,/bell\.classList\.toggle\('has-unread',count>0\)/);
 assert.doesNotMatch(notices,/bell\.innerHTML\s*=/);
 assert.match(css,/#notificationBell \.notification-dot\[hidden\]\{display:none!important\}/);
 assert.match(notices,/if\(panel\?\.isConnected && location\.hash==='#ofertas'\)markRead\(\)/);
 assert.match(notices,/function markRead\(\)/);
});
test('versão e cache offline incluem o novo desenho e sua lógica',()=>{
 assert.match(app,/const APP_VERSION='2\.19\.5'/);
 assert.match(app,/notifications\.js\?v=2\.19\.5/);
 assert.match(html,/app\.js\?v=2\.19\.5/);
 assert.match(html,/style\.css\?v=2\.19\.5/);
 assert.match(sw,/ppmt-2\.19\.5-bell-icon/);
 assert.match(sw,/notifications\.js\?v=2\.19\.5/);
});
