import test from 'node:test';import assert from 'node:assert/strict';import {packExam,restoreExam} from '../exam-session.js';
const bank=[{id:'a',options:['a','b']},{id:'b',options:['a','b','c']}];
test('retoma respostas, posição e prazo original após serialização sem copiar questões',()=>{
 const run={questions:bank,answers:{a:1},index:1,deadline:12345,label:'Meu simulado',originTab:'simulados'};
 const saved=JSON.parse(JSON.stringify(packExam(run))),restored=restoreExam(saved,bank);assert.deepEqual(restored.questions,bank);assert.equal(restored.answers.a,1);assert.equal(restored.index,1);assert.equal(restored.deadline,12345);assert.equal(saved.questions,undefined);
});
test('sessão incompleta ou resposta impossível não é retomada',()=>{
 const valid=packExam({questions:bank,answers:{},index:0,deadline:999});assert.equal(restoreExam({...valid,ids:['missing']},bank),null);assert.equal(restoreExam({...valid,index:3},bank),null);assert.equal(restoreExam({...valid,answers:{a:8}},bank),null);assert.equal(restoreExam({...valid,ids:['a','a']},bank),null);
});
