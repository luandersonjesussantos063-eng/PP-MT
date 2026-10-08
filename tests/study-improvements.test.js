import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dueReviews,nextReview} from '../learning.js';
import {findSimilar} from '../help.js';
import {createReviewExercise} from '../review-generator.js';
import {chooseConceptBlock,dailyStudyPlan,enrichConcept} from '../curriculum.js';
import {AUTHORIAL_MT_QUESTIONS as batch} from '../authorial-mt.js';
import {MT_QUESTIONS} from '../official.js';
import {EDITAL_TOPICS,questionTopicIds,syllabusCoverage} from '../syllabus.js';
const at='2026-10-08T10:00:00Z',now=Date.parse(at);
test('acerto retorna no dia seguinte e tentativa de transferência não cria revisão duplicada',()=>{
 const a={id:'a',correct:true,at};assert.deepEqual(dueReviews([a],{},now),[]);assert.deepEqual(dueReviews([a],{},now+86400000),['a']);
 assert.deepEqual(dueReviews([{id:'b',correct:false,at,reviewOf:'a',mode:'review-transfer'}],{},now),[]);
});
test('repetição correta não adia o vencimento; erro posterior retorna imediatamente',()=>{
 const r={a:nextReview(null,true,now)};
 assert.deepEqual(dueReviews([{id:'a',correct:true,at:new Date(now+90000000).toISOString()}],r,now+90000000),['a']);
 assert.deepEqual(dueReviews([{id:'a',correct:false,at:new Date(now+1000).toISOString()}],r,now+1000),['a']);
});
test('revisão alterna todos os exercícios do conceito antes de repetir o mais antigo',()=>{
 const group=batch.filter(q=>q.conceptId===batch[0].conceptId),base=group[0],history=[];
 for(let i=1;i<group.length;i++){const q=findSimilar(base,group,history);assert.ok(!history.some(a=>a.exerciseId===q.id));history.push({exerciseId:q.id,at:new Date(now+i).toISOString()})}
 assert.equal(findSimilar(base,group,history).id,history[0].exerciseId);
 // Ordinary practice attempts also prevent premature repetition.
 assert.notEqual(findSimilar(base,group,[{id:group[1].id,at}]).id,group[1].id);
});
test('adaptação automática varia a resposta julgada sem alterar o gabarito original',()=>{
 const base=batch[0],first=createReviewExercise(base,()=>0),history=[{originalId:base.id,generation:first.generation,at}];
 const next=createReviewExercise(base,()=>0,history);assert.notEqual(first.generation.candidate,next.generation.candidate);assert.equal(next.generation.originalAnswer,base.answer);
});
test('plano prioriza erros recorrentes, usa autorais e alterna o último conceito',()=>{
 const bases=[batch[0],batch[5],batch[10]],qs=bases.flatMap(b=>batch.filter(q=>q.conceptId===b.conceptId));
 const attempts=[{id:bases[1].id,correct:false,at},{id:bases[1].id,correct:false,at},{id:bases[2].id,correct:true,at}];
 assert.equal(chooseConceptBlock(qs,attempts)[0].conceptId,bases[1].conceptId);
 const plan=dailyStudyPlan(qs,attempts,[],20);assert.match(plan.reason,/repetidos/);
 const generated=[{conceptId:bases[0].conceptId,kind:'application',correct:false,at:new Date(now+1).toISOString()}];
 assert.notEqual(chooseConceptBlock(qs,attempts,4,'',generated)[0].conceptId,bases[0].conceptId);
 const previous=[{conceptId:bases[1].conceptId,kind:'application',correct:false,at}];
 const result=dailyStudyPlan(qs,[{id:bases[2].id,correct:true,at:new Date(now+1).toISOString()}],[],20,'',previous);
 assert.equal(result.blockIds[0],bases[1].id);assert.match(result.reason,/erro ou chute/);
});
test('mapa cobre nove disciplinas e preserva lacunas explícitas sem contar palavras incidentais',()=>{
 assert.equal(new Set(EDITAL_TOPICS.map(t=>t.subject)).size,9);assert.equal(new Set(EDITAL_TOPICS.map(t=>t.id)).size,EDITAL_TOPICS.length);
 const bank=[...MT_QUESTIONS.map(enrichConcept),...batch],map=syllabusCoverage(bank);
 for(const q of batch)assert.ok(questionTopicIds(q).length);
 const lacuna=map.find(t=>t.id==='lb-lc389');assert.equal(lacuna.count,0);assert.equal(lacuna.guided,false);
 const crase=map.find(t=>t.id==='pt-crase');assert.ok(crase.guided);assert.equal(crase.status,'Ainda não praticado');
 assert.deepEqual(questionTopicIds({id:'unknown',statement:'crase acesso informações peculato'}),[]);
 assert.deepEqual(questionTopicIds({...batch[0],historicalOnly:true}),[]);
});
test('cobertura distingue atividade de retenção e registra os erros de exercícios autorais',()=>{
 const q=batch[0],get=rows=>syllabusCoverage(batch,[],rows).find(t=>t.id==='pt-crase');
 assert.equal(get([{conceptId:q.conceptId,correct:false,kind:'application',at}]).status,'Precisa reforçar');
 assert.equal(get([{conceptId:q.conceptId,correct:true,kind:'application',at}]).status,'Em prática');
 assert.equal(get([{conceptId:q.conceptId,correct:true,kind:'application',mode:'retention',at}]).status,'Retenção testada');
});
test('bundle offline não importa CDN e arquivos essenciais entram no pacote e cache',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'),auth=read('auth.js'),sw=read('sw.js'),workflow=read('.github/workflows/deploy.yml');
 assert.doesNotMatch(auth,/cdn\.jsdelivr/);
 for(const name of ['offline.js','syllabus.js','syllabus-data.js']){assert.ok(sw.includes(name));assert.ok(workflow.includes(name))}
 assert.ok(sw.includes('assets/vendor/supabase-2.117.2.js'));
 assert.ok(fs.statSync(new URL('../assets/vendor/supabase-2.117.2.js',import.meta.url)).size>10000);
});

test('agendamento inicial persiste o primeiro acerto e chute posterior continua pendente',async()=>{
 const {scheduleCorrectReviews}=await import('../learning.js');const first={id:'a',correct:true,at};
 const reviews=scheduleCorrectReviews([first]);assert.equal(reviews.a.dueAt,new Date(now+86400000).toISOString());
 assert.deepEqual(scheduleCorrectReviews([first,{...first,at:new Date(now+5000).toISOString()}],reviews),reviews);
 assert.deepEqual(dueReviews([{...first,guessed:true}],reviews,now),['a']);
 assert.equal(nextReview(reviews.a,true,now+86400000).dueAt,new Date(now+86400000*4).toISOString());
});
