import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEasySimilar} from '../easy-similar.js';

test('sequência verdadeiro-falso recebe miniquestões com gabarito consistente',()=>{
 const q={id:'prova-vf-01',topic:'Sequências lógicas',
  statement:'Determine V ou F para cada afirmativa',
  options:['F – V – F','V – V – F','V – F – V','F – F – V'],answer:0};
 const a=createEasySimilar(q,null,0),b=createEasySimilar(q,null,1);
 assert.equal(a.mode,'curated');
 assert.equal(b.mode,'curated');
 assert.notEqual(a.statement,b.statement);
 assert.equal(a.options[a.answer],'V – F');
 assert.equal(b.options[b.answer],'F – V');
 assert.match(a.explanation,/triângulo tem 3 lados/);
 assert.equal(a.kind,'easy');
});

test('exemplos de português, constitucional e administrativo ensinam sem alterar a origem',()=>{
 const cases=[
  [{topic:'Crase: regência e artigo'},'Vou à escola.'],
  [{topic:'Autarquia e Administração Indireta'},'Administração Indireta.'],
  [{topic:'Direitos políticos e voto'},'Sim, mas o voto é facultativo.'],
  [{topic:'Poder de Polícia'},'Polícia administrativa.']
 ];
 for(const [q,expected] of cases){
  const x=createEasySimilar(q);
  assert.equal(x.mode,'curated',q.topic);
  assert.ok(x.options.includes(expected),q.topic);
  assert.equal(x.options[x.answer],expected);
  assert.ok(x.bridge.length>25&&x.explanation.length>30);
 }
});

test('questão importada sem par usa duas alternativas, não revela gabarito antes',()=>{
 const base={id:'historica-47',subject:'Assunto específico',topic:'Tema sem exemplo próprio',
  statement:'Qual alternativa é verdadeira na situação descrita?',
  options:['Escolha errada A','A alternativa comprovadamente correta','Escolha errada C','Escolha errada D'],
  answer:1,lesson:{reasoning:'Conforme o fundamento registrado no gabarito da prova.'}};
 const a=createEasySimilar(base,null,0),b=createEasySimilar(base,null,1);
 assert.equal(a.mode,'two-choice');
 assert.equal(a.options.length,2);
 assert.equal(a.options[a.answer],base.options[1]);
 assert.equal(b.options[b.answer],base.options[1]);
 assert.notDeepEqual(a.options,b.options);
 assert.match(a.explanation,/fundamento registrado/);
 assert.notEqual(a.id,b.id);
});

test('quando não há gabarito, usa orientação sem inventar resposta jurídica',()=>{
 const ex=createEasySimilar({id:'source-unchecked',topic:'Lei estadual com revisão pendente'});
 assert.equal(ex.mode,'strategy');
 assert.ok(ex.options[ex.answer].includes('Ler o comando'));
 assert.match(ex.bridge,/não tem informações suficientes/);
});

test('interface não desabilita ajuda sem similar, não cobra XP e preserva questao original',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/function showEasySimilar\(/);
 assert.match(app,/createEasySimilar\(q,related,attempt\)/);
 assert.match(app,/id="similarHelp"/);
 assert.doesNotMatch(app,/'similar',!similar/);
 assert.match(app,/data-easy-choice/);
 assert.match(app,/mini\.answer/);
 assert.match(app,/Treino autoral simplificado, sem XP/);
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const action=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
 for(const code of [sw,action])assert.match(code,/easy-similar\.js/);
 assert.match(page,/app\.js\?v=2\.20\.1/);
});
