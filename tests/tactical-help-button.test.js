import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canOpenTacticalHelp} from '../help.js';

test('ajuda tática grátis é utilizável no estudo e treino livre mesmo com 0 XP',()=>{
 assert.equal(canOpenTacticalHelp({exam:false}),true);
 assert.equal(canOpenTacticalHelp({exam:false,missionAnswered:false}),true);
});
test('missão libera Entender conteúdo após resposta e mantém bloqueado antes',()=>{
 assert.equal(canOpenTacticalHelp({exam:true,missionAnswered:false}),false);
 assert.equal(canOpenTacticalHelp({exam:true,missionAnswered:true}),true);
});
test('simulado tradicional não mostra ajuda durante prova, mas permite após finalizar',()=>{
 assert.equal(canOpenTacticalHelp({exam:true,missionAnswered:false,finished:false}),false);
 assert.equal(canOpenTacticalHelp({exam:true,finished:true}),true);
});
test('interface liga ajuda na resposta da missão, registra eventos e mostra na revisão',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/helpEnabled=canOpenTacticalHelp\(\{exam,missionAnswered:examAnswered\}\)/);
 assert.match(app,/helpBtn\.disabled=false/);
 assert.match(app,/helpBtn\.removeAttribute\('title'\)/);
 assert.match(app,/\$\('#tacticalHelp'\)/);
 assert.match(app,/data-exam-review-help/);
 assert.match(app,/openTacticalHelp\(r\.questions\[Number\(btn\.dataset\.examReviewHelp\)\]\)/);
 assert.doesNotMatch(app,/<button id="tacticalHelp"[^>]*\$\{exam\?'disabled':' '\}/);
});
test('cache do app inclui versão nova do código de ajuda',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(html,/app\\.js\\?v=2\\.20\\.1/);
 assert.match(sw,/app\\.js\\?v=2\\.20\\.1/);
 assert.match(sw,/help\\.js\\?v=2\\.19\\.8/);
 assert.match(sw,/easy-similar\\.js\\?v=2\\.20\\.1/);
});
