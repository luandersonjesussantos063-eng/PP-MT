import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewExercise} from '../review-generator.js';
import {MT_QUESTIONS} from '../official.js';
test('adapta cada questão sem perder contexto, comando negativo ou gabarito',()=>{
 for(const q of MT_QUESTIONS.filter(q=>!q.historicalOnly))for(const n of [0,0.6,0.99]){
  const x=createReviewExercise(q,()=>n);
  assert.ok(x.statement.includes(q.statement));assert.ok(x.statement.includes(q.options[x.generation.candidate]));
  assert.equal(x.answer,x.generation.candidate===q.answer?0:1);assert.equal(x.options.length,2);
  assert.equal(x.source,undefined);assert.equal(x.lesson,undefined);assert.ok(x.generated);assert.notEqual(x.id,q.id);
  assert.ok(x.explanation.includes(q.options[q.answer]));
 }
});
test('enunciados EXCETO permanecem qualificados pelo comando original',()=>{
 const q={id:'negative',statement:'Todas estão corretas, EXCETO:',options:['Uma afirmação falsa.','Uma afirmação verdadeira.'],answer:0};
 const x=createReviewExercise(q,()=>0);assert.equal(x.answer,0);assert.match(x.statement,/EXCETO/);assert.match(x.explanation,/atende ao comando/);
});
