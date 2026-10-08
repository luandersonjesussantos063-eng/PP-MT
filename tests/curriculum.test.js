import test from 'node:test';import assert from 'node:assert/strict';
import {MT_QUESTIONS} from '../official.js';import {CONCEPT_PRACTICE} from '../practice.js';import {validateBank} from '../core.js';
import {enrichConcept,chooseConceptBlock,dailyStudyPlan,compatibleWithMT,conceptProgress} from '../curriculum.js';import {findSimilar} from '../help.js';
const bank=[...MT_QUESTIONS,...CONCEPT_PRACTICE].map(enrichConcept);
test('cada um dos 48 conceitos regulares tem exercício distinto, fonte e bloco coerente',()=>{
 validateBank(CONCEPT_PRACTICE);assert.equal(CONCEPT_PRACTICE.length,48);
 for(const base of bank.filter(q=>q.id===q.conceptId)){
  const block=chooseConceptBlock(bank,[],8,base.subject).filter(q=>q.conceptId===base.conceptId);
  const exercise=findSimilar(base,bank);assert.ok(exercise);assert.equal(exercise.conceptId,base.conceptId);assert.equal(exercise.practiceKind,'application');assert.notEqual(exercise.statement,base.statement);assert.ok(exercise.lesson.sources.length>=2);
  assert.equal(exercise.lesson.alternatives.length,exercise.options.length);
 }
 const first=chooseConceptBlock(bank,[],8);assert.equal(new Set(first.map(q=>q.conceptId)).size,1);assert.ok(first.length>=2);
});
test('uma matéria estudada cede espaço a outra e conceitos nunca vistos vêm primeiro',()=>{
 const first=chooseConceptBlock(bank,[],5),a={id:first[1].id,correct:true,at:'2026-10-08T10:00:00Z'};
 const second=chooseConceptBlock(bank,[a],5);assert.notEqual(first[0].subject,second[0].subject);
 const nextSame=chooseConceptBlock(bank,[a],5,first[0].subject);assert.notEqual(nextSame[0].conceptId,first[0].conceptId);
});
test('revisões cabem no orçamento e preservam espaço para aprender',()=>{
 const plan=dailyStudyPlan(bank,[],Array.from({length:30},(_,i)=>String(i)),20);assert.equal(plan.reviewIds.length,3);assert.equal(plan.reviewMinutes,9);assert.equal(plan.learnMinutes,11);assert.equal(new Set(plan.blockIds.map(id=>bank.find(q=>q.id===id).conceptId)).size,1);
});
test('regra específica de outro estado fica fora do recorte MT, legislação federal permanece',()=>{
 assert.equal(compatibleWithMT({statement:'Conforme a Constituição do Estado da Bahia',options:['a','b']}),false);
 assert.equal(compatibleWithMT({statement:'Conforme a Constituição Federal',options:['a','b']}),true);
});
test('indicador de conceito não considera leitura como domínio e inclui erros em exercícios',()=>{
 const q=bank.find(q=>q.conceptId),fresh=conceptProgress(bank,[]).find(c=>c.id===q.conceptId);assert.equal(fresh.status,'Precisa aprender');
 const wrong=conceptProgress(bank,[],[{originalId:q.id,conceptId:q.conceptId,correct:false,kind:'application',at:'2026-10-08T10:00:00Z'}]).find(c=>c.id===q.conceptId);assert.equal(wrong.status,'Precisa revisar');
});
