import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AUTHORIAL_MT_QUESTIONS as allBatch,AUTHORIAL_MT_CONCEPTS as allConcepts} from '../authorial-mt.js';
import {MT_QUESTIONS,OFFICIAL_QUESTIONS} from '../official.js';
import {CONCEPT_PRACTICE} from '../practice.js';
import {QUESTIONS} from '../data.js';
import {validateBank} from '../core.js';
import {chooseConceptBlock,compatibleWithMT,conceptProgress,CONCEPTS} from '../curriculum.js';
import {findSimilar} from '../help.js';
import {packExam,restoreExam} from '../exam-session.js';
const batch=allBatch.filter(q=>q.edition==='mt-edital-2016-lote-2026-10'),concepts=allConcepts.filter(c=>batch.some(q=>q.id===c.id));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('lote acrescenta exatamente 100 IDs distintos sem colisão com o acervo',()=>{
 validateBank([...OFFICIAL_QUESTIONS,...QUESTIONS,...CONCEPT_PRACTICE,...batch]);
 assert.equal(batch.length,100);assert.equal(new Set(batch.map(q=>q.statement)).size,100);
 assert.deepEqual(Object.fromEntries([...new Set(batch.map(q=>q.subject))].map(s=>[s,batch.filter(q=>q.subject===s).length])),{
  'Língua Portuguesa':10,'História e Geografia de Mato Grosso':20,'Ética e Filosofia':20,'Administração Geral':20,'Direito Constitucional':10,'Direito Administrativo':5,'Direito Penal e Processual Penal':5,'Direitos Humanos':5,'Legislação Básica':5
 });
 for(const q of batch){assert.equal(q.origin,'autoral');assert.equal(q.source,undefined);assert.ok(compatibleWithMT(q));assert.ok(q.syllabusTopic);assert.equal(new Set(q.options).size,q.options.length);assert.equal(q.lesson.alternatives.length,q.options.length);assert.equal(q.lesson.alternatives[q.answer],q.explanation);assert.equal(new Set(q.lesson.alternatives).size,q.options.length);assert.ok(q.lesson.sources.length>=2);assert.match(q.lesson.authorship,/Não é questão oficial/);}
});
test('respostas conceituais e jurídicas de referência sobrevivem à ordenação editorial',()=>{
 const answer=(slug,n)=>{const q=batch.find(q=>q.id===`mt-autoral-202610-${slug}-${String(n).padStart(2,'0')}`);assert.ok(q);return q.options[q.answer]};
 assert.equal(answer('crase',1),'à');assert.equal(answer('crase',3),'às');
 assert.equal(answer('divisao-mt',4),'Campo Grande.');
 assert.equal(answer('hidrografia-mt',1),'Paraguai.');
 assert.equal(answer('capitania-mt',2),'Vila Bela da Santíssima Trindade.');
 assert.equal(answer('remedios',1),'Habeas corpus.');assert.equal(answer('remedios',2),'Habeas data.');
 assert.equal(answer('crimes-funcionais',1),'Concussão.');assert.equal(answer('crimes-funcionais',2),'Corrupção passiva.');
 assert.match(answer('lai',4),/20 dias.*10/);
 assert.deepEqual(batch.reduce((a,q)=>(a[q.answer]++,a),[0,0,0]),[34,33,33]);
});
test('20 grupos novos oferecem lição e exercícios distintos de transferência em todas as matérias',()=>{
 assert.equal(concepts.length,20);assert.equal(CONCEPTS.length,78);
 for(const c of concepts){const group=batch.filter(q=>q.conceptId===c.id);assert.equal(group.length,5);assert.ok(group.some(q=>q.id===c.id));
  const block=chooseConceptBlock(group,[],5,c.subject);assert.equal(block.length,5);assert.equal(block[0].id,c.id);assert.equal(new Set(block.map(q=>q.conceptId)).size,1);
  for(const q of group){const similar=findSimilar(q,batch);assert.ok(similar);assert.notEqual(similar.id,q.id);assert.notEqual(similar.statement,q.statement);assert.equal(similar.conceptId,q.conceptId);}
  const [base,exercise]=block;const next=chooseConceptBlock(group,[{id:exercise.id,correct:false,at:'2026-10-08T12:00:00Z'}],5);assert.equal(next[0].id,base.id);assert.notEqual(next[1].id,exercise.id);
 }
 const q=batch[1],p=conceptProgress(batch,[{id:q.id,correct:false,at:'2026-10-08T12:00:00Z'}]).find(c=>c.id===q.conceptId);assert.equal(p.status,'Precisa revisar');
});
test('sessão com questões novas retoma os IDs e as respostas sem alterar o prazo',()=>{
 const now=Date.now(),qs=[batch[0],batch[99]];
 const session={questions:qs,answers:{[qs[0].id]:qs[0].answer},index:1,deadline:now+60000,originTab:'simulados',label:'Treino'};
 const restored=restoreExam(packExam(session),batch,now);assert.ok(restored);assert.deepEqual(restored.questions.map(q=>q.id),qs.map(q=>q.id));assert.equal(restored.answers[qs[0].id],qs[0].answer);assert.equal(restored.deadline,session.deadline);
});
test('publicação e cache incluem o lote e mantêm separados gabarito oficial e resposta autoral',()=>{
 const app=read('app.js');assert.match(app,/\.\.\.CONCEPT_PRACTICE,\.\.\.AUTHORIAL_MT_QUESTIONS/);assert.match(read('sw.js'),/authorial-mt\.js\?v=2\.15\.0/);assert.match(read('.github/workflows/deploy.yml'),/cp authorial-mt\.js/);assert.match(app,/const questions=\[\.\.\.MT_QUESTIONS,\.\.\.AUTHORIAL_MT_QUESTIONS\]/);assert.doesNotMatch(app,/AUTORAL • DEMONSTRAÇÃO/);assert.match(app,/q\.origin==='prova'\?' · gabarito oficial':' · resposta correta'/);
 assert.equal(MT_QUESTIONS.length,57);
});
