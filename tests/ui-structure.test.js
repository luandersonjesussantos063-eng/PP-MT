import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('alternativas principais usam cards neutros com swipe',()=>{
  assert.match(app,/data-option="\$\{i\}" data-strike-key="\$\{esc\(q\.id\)\}" role="button"/);
  assert.doesNotMatch(app,/<button class="option[^"]*" data-option=/);
  assert.match(app,/document\.addEventListener\('pointermove'/);
  assert.match(app,/document\.addEventListener\('pointercancel'/);
});

test('camada de interação não deixa filhos roubarem o gesto',()=>{
  assert.match(css,/\.question \.option \*\{[\s\S]*pointer-events:none/);
  assert.match(css,/touch-action:pan-y/);
  assert.match(css,/-webkit-user-select:none!important/);
});

test('versão exibida e revisão dos arquivos publicados permanecem alinhadas',()=>{
  const runtime=app.match(/const APP_VERSION='([^']+)'/)?.[1];
  const js=html.match(/app\.js\?v=([^"&]+)/)?.[1];
  const style=html.match(/style\.css\?v=([^"&]+)/)?.[1];
  assert.match(runtime,/^\d+\.\d+\.\d+$/,'Versão semanticamente válida');
  assert.ok(js.startsWith(runtime), 'JS deve usar a mesma versão, podendo incluir sufixo de cache');
  assert.equal(style,runtime);
  assert.ok(html.includes('V '+runtime));
});

test('fluxo Estudar criado no Work também recebe swipe',()=>{
  assert.match(app,/data-learning-answer="\$\{i\}" data-strike-index="\$\{i\}" data-strike-key="\$\{esc\(learningStrikeKey\)\}"/);
  assert.match(app,/learningStrikeKey=\`learning:\$\{q\.id\}\`/);
  assert.match(app,/btn\.dataset\.learningAnswer/);
});


test('fluxo Estudar corrige imediatamente ao tocar',()=>{
  assert.doesNotMatch(app,/learningCheck/);
  assert.match(app,/l\.selected=Number\(b\.dataset\.learningAnswer\);[\s\S]*l\.phase='feedback';save\(\);renderLearn\(\)/);
  assert.match(app,/i===q\.answer\?'correct':l\.selected===i\?'wrong'/);
  assert.match(app,/Próxima questão/);
});


test('estados corrigidos permanecem visíveis após a camada canônica',()=>{
  const canonical=css.indexOf('/* v37: camada canônica de interação das alternativas */');
  const correct=css.lastIndexOf('.question .option.correct{');
  const wrong=css.lastIndexOf('.question .option.wrong{');
  assert.ok(canonical>=0&&correct>canonical&&wrong>canonical);
  assert.match(css.slice(correct),/background:#243c2c/);
  assert.match(css.slice(wrong),/background:#442b37/);
});


test('treino ativo usa disciplinas e questões PMMG',()=>{
 assert.match(app,/const LAST_EDITAL_SUBJECTS=PMMG_SUBJECTS/);
 assert.match(app,/const OFFICIAL_QUESTIONS=PMMG_QUESTIONS/);
 assert.doesNotMatch(app,/import.*from '\.\/official\.js/);
});

test('erros e métricas ignoram matérias fora do foco atual',()=>{
  assert.match(app,/function pendingErrorIds\(\)\{[\s\S]*active\.has\(id\)/);
  assert.match(app,/activeIds=new Set\(official\.map/);
});
