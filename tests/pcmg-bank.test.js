import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PCMG_EXAMS,PCMG_QUESTIONS} from '../pcmg-bank.js';
import {toReferenceState,referenceAttempts} from '../reference-ui.js';
const w={};new Function('window',fs.readFileSync(new URL('../missao/pcmg-bank.js',import.meta.url),'utf8'))(w);
const root={};new Function('globalThis',fs.readFileSync(new URL('../missao/core.js',import.meta.url),'utf8'))(root);
const C=root.MFCore;
test('PCMG tem duas provas completas com todas as opções, originais e gabaritos definitivos correspondentes',()=>{
 const sources=JSON.parse(fs.readFileSync(new URL('../docs/pcmg-sources.json',import.meta.url)));
 assert.equal(w.PCMG_BANK.questions.length,130);assert.equal(PCMG_QUESTIONS.length,125);
 assert.equal(new Set(w.PCMG_BANK.questions.map(q=>q.id)).size,130);
 for(const exam of PCMG_EXAMS){
  const qs=w.PCMG_BANK.questions.filter(q=>q.exam===exam.id),source=sources.find(x=>x.id===exam.id);
  assert.equal(qs.length,exam.total);assert.deepEqual(qs.filter(q=>q.annulled).map(q=>q.number),exam.annulled);
  for(const q of qs){
   assert.equal(q.key,source.answers[q.number]);assert.equal(C.isValid(q),!q.annulled);
   assert.deepEqual(Object.keys(q.options),exam.id==='pcmg2025'?['A','B','C','D','E']:['A','B','C','D']);
   assert.ok(Object.values(q.options).every(x=>x.trim().length));assert.ok(q.text.length>12);
   for(const image of [...q.originalImages,...q.supportImages])assert.ok(fs.existsSync(new URL('../missao/'+image,import.meta.url)));
   const row=PCMG_QUESTIONS.find(x=>x.id===q.id);
   if(!q.annulled){assert.equal(row.answer,'ABCDE'.indexOf(q.key));assert.equal(row.source.answerStatus,'definitivo');assert.deepEqual(row.options,Object.values(q.options));}
  }
 }
 for(let n=1;n<=10;n++)assert.ok(w.PCMG_BANK.questions.find(q=>q.id==='pcmg2021-'+n).supportImages.length);
});
test('correção valida alternativas da questão e não inclui anuladas na estatística',()=>{
 const q=w.PCMG_BANK.questions.find(q=>q.id==='pcmg2025-1');
 const result=C.grade(q,'E',{},'2026-11-15');assert.equal(result.correct,true);
 assert.throws(()=>C.grade(q,'EE',{},'2026-11-15'),/Alternativa/);
 const four=w.PCMG_BANK.questions.find(q=>q.id==='pcmg2021-1');assert.throws(()=>C.grade(four,'E',{},'2026-11-15'),/Alternativa/);
 const nulled=w.PCMG_BANK.questions.find(q=>q.id==='pcmg2025-59');assert.equal(C.grade(nulled,'E',{},'2026-11-15').correct,null);
 assert.equal(C.score([{id:q.id,answer:'E',correct:true},{id:nulled.id,answer:'E',correct:false}],[q,nulled]).attempts,1);
});
test('ponte mantém E e a identidade de Jackeline e rejeita PCMG em outro perfil',()=>{
 const event={id:'pcmg2025-1',answer:'E',correct:true,at:Date.now()};
 const rows=referenceAttempts({profiles:{jackeline:{events:[event]},luanderson:{events:[event]}}});assert.equal(rows.length,1);assert.equal(rows[0].selected,4);assert.equal(rows[0].referenceProfile,'jackeline');
 const state=toReferenceState({attempts:rows});assert.equal(state.events[0].answer,'E');
});
