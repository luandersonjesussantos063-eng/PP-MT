import test from 'node:test';import assert from 'node:assert/strict';
import {AUTHORIAL_MT_QUESTIONS as all,AUTHORIAL_MT_CONCEPTS} from '../authorial-mt.js';
import {OFFICIAL_QUESTIONS} from '../official.js';import {QUESTIONS} from '../data.js';import {CONCEPT_PRACTICE} from '../practice.js';
import {validateBank} from '../core.js';import {findSimilar} from '../help.js';import {chooseConceptBlock,compatibleWithMT} from '../curriculum.js';import {questionTopicIds,EDITAL_TOPICS} from '../syllabus.js';
const batch=all.filter(q=>q.edition==='mt-edital-2016-lote-2026-10-02');
test('50 questões autorais novas, sem colisão, com alternativas comentadas e vínculo real com matéria do edital',()=>{
 validateBank([...OFFICIAL_QUESTIONS,...QUESTIONS,...CONCEPT_PRACTICE,...all]);assert.equal(batch.length,50);assert.equal(all.length,150);assert.equal(new Set(all.map(q=>q.statement)).size,150);
 for(const q of batch){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.equal(new Set(q.lesson.alternatives).size,4);assert.equal(q.explanation,q.lesson.alternatives[q.answer]);assert.ok(compatibleWithMT(q));assert.ok(q.lesson.sources.length>=2);assert.equal(q.lesson.checkedAt,'2026-10-08');const topics=questionTopicIds(q);assert.ok(topics.length);for(const id of topics)assert.equal(EDITAL_TOPICS.find(t=>t.id===id).subject,q.subject)}
 assert.deepEqual(batch.reduce((r,q)=>(r[q.answer]++,r),[0,0,0,0]),[13,12,12,13]);
});
test('dez conceitos oferecem exemplo guiado e questão diferente para revisão',()=>{
 const bases=AUTHORIAL_MT_CONCEPTS.filter(c=>batch.some(q=>q.id===c.id));assert.equal(bases.length,10);
 for(const base of bases){const group=batch.filter(q=>q.conceptId===base.id);assert.equal(group.length,5);const block=chooseConceptBlock(group,[],5);assert.equal(block[0].id,base.id);for(const q of group){const review=findSimilar(q,all);assert.ok(review);assert.notEqual(review.id,q.id);assert.equal(review.conceptId,q.conceptId)}}
});
test('gabaritos de referência: língua, cálculo e distinções jurídicas',()=>{
 const answer=(slug,n)=>{const q=batch.find(q=>q.id===`mt-autoral-202610-${slug}-${String(n).padStart(2,'0')}`);assert.ok(q);return q.options[q.answer]};
 assert.equal(answer('concordancia-servico',1),'Houve três ocorrências durante o plantão.');assert.equal(answer('concordancia-servico',5),'Seguem anexas as cópias solicitadas.');assert.equal(answer('indicadores-controle',3),'A primeira tem taxa de 10%, e a segunda, de 1%.');
 assert.equal(answer('excludentes-ilicitude',1),'Legítima defesa de terceiro.');assert.equal(answer('excludentes-ilicitude',3),'Estado de necessidade.');assert.match(answer('excludentes-ilicitude',4),/doloso ou culposo/);assert.equal(answer('flagrante-modalidades',5),'Enquanto não cessar a permanência.');assert.match(answer('competencia-delegacao-federal',1),/vedada/);
});
test('o segundo lote preserva a identificação editorial e o recorte federal do processo administrativo',()=>{for(const q of batch){assert.equal(q.origin,'autoral');assert.equal(q.source,undefined);assert.match(q.lesson.authorship,/Não é questão oficial/)}for(const q of batch.filter(q=>q.topic.includes('9.784'))){assert.match(q.lesson.concept,/lei federal, não/);assert.match(q.statement,/federal|Lei 9\.784/)} });
