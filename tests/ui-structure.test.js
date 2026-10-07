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

test('versão runtime e arquivos publicados permanecem alinhados',()=>{
  const runtime=app.match(/const APP_VERSION='v(\d+)'/)?.[1];
  const js=html.match(/app\.js\?v=(\d+)/)?.[1];
  const style=html.match(/style\.css\?v=(\d+)/)?.[1];
  assert.ok(runtime&&js&&style);
  assert.equal(runtime,js);
  assert.equal(style,js);
});


test('fluxo Estudar criado no Work também recebe swipe',()=>{
  assert.match(app,/data-learning-answer="\$\{i\}" data-strike-index="\$\{i\}" data-strike-key="\$\{esc\(learningStrikeKey\)\}"/);
  assert.match(app,/learningStrikeKey=\`learning:\$\{q\.id\}\`/);
  assert.match(app,/btn\.dataset\.learningAnswer/);
});
