import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commandDashboard} from '../dashboard-v218.js';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('dashboard compacto mostra missão e indicadores sem segunda barra de progresso',()=>{
 const view=commandDashboard({seconds:240,goalSeconds:3600,streak:0,xp:152,rank:'Recruta',pending:12,quota:{premium:true}});
 assert.match(view,/Operação <em>Aprovação/);
 assert.match(view,/INICIAR MISSÃO/);
 assert.match(view,/SEQUÊNCIA ATUAL/);
 assert.match(view,/REVISÕES PENDENTES/);
 assert.match(view,/ACESSO PREMIUM ATIVO/);
 assert.doesNotMatch(view,/command-overview|SEU DESEMPENHO DIÁRIO|Conhecer Premium/);
});
test('interface evita mostrar anúncio grande a aluno Premium em todas as abas',()=>{
 assert.match(app,/if\(quotaSnapshot&&!quotaSnapshot\.premium\)parent\.insertAdjacentHTML/);
 assert.match(app,/membershipMarker\.textContent=quotaSnapshot\.premium/);
});
test('plano diário aparece antes dos atalhos e sincronização bem-sucedida não ocupa altura fixa',()=>{
 assert.match(app,/today\.after\(quick\)/);
 assert.match(app,/el\.hidden=!currentUser\|\|\(!offline&&syncStatus==='saved'\)/);
 const currentVersion=app.match(/const APP_VERSION='([^']+)'/)?.[1];
 assert.ok(currentVersion,'A versão do aplicativo deve existir');
 assert.ok(html.includes('V '+currentVersion),'O HTML deve exibir a versão vigente');
});
test('revisão e tabela de desempenho usam explicação humana e pista para deslizar',()=>{
 assert.match(app,/Questão selecionada para revisar o mesmo assunto/);
 assert.match(app,/Deslize para o lado para ver todas as colunas/);
 assert.match(css,/\.performance-swipe-hint/);
 assert.match(css,/\.command-metric small\{font-size:10px/);
});
