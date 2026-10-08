import test from 'node:test';import assert from 'node:assert/strict';import {performanceSummary} from '../performance.js';
const qs=[{id:'a',subject:'Português'},{id:'b',subject:'Direito'},{id:'old',subject:'Direito',historicalOnly:true}],now=new Date('2026-10-08T15:00:00Z');
const attempt=(id,at,correct=true,selected=0)=>({id,at,correct,selected});
test('counts answers from all modes and repeated answers, excluding unanswered and retired items',()=>{
 const result=performanceSummary(qs,[attempt('a','2026-10-08',true),{...attempt('a','2026-10-08',false),mode:'free-training'},attempt('b','2026-10-08',false,null),attempt('old','2026-10-08'),attempt('gone','2026-10-08')],[], 'total',now);
 assert.equal(result.total,2);assert.equal(result.rate,50);assert.equal(result.subjects[1].rate,null);
});
test('MT local midnight and inclusive seven-calendar-day boundary',()=>{
 const rows=[attempt('a','2026-10-08T03:59:00Z'),attempt('a','2026-10-08T04:00:00Z'),attempt('b','2026-10-02T04:00:00Z'),attempt('b','2026-10-02T03:59:00Z')];
 assert.equal(performanceSummary(qs,rows,[],'today',now).total,1);assert.equal(performanceSummary(qs,rows,[],'week',now).total,3);
});
test('30 days, invalid dates and future records',()=>{
 const rows=['2026-09-09T04:00Z','2026-09-09T03:59Z','bad','2026-10-09T04:00Z'].map(at=>attempt('a',at));assert.equal(performanceSummary(qs,rows,[],'month',now).total,1);assert.equal(performanceSummary(qs,rows,[],'total',now).total,2);
});
test('generated reviews use the original subject and coexist with bank review attempts',()=>{
 const result=performanceSummary(qs,[{...attempt('b','2026-10-08',false),mode:'retention',reviewOf:'a'}],[{originalId:'a',at:'2026-10-08',selected:1,correct:true,kind:'adaptation'}],'total',now);
 assert.equal(result.total,2);assert.equal(result.generated,1);assert.equal(result.subjects[0].correct,1);assert.equal(result.subjects[1].wrong,1);
});
test('empty results have no claimed accuracy and legacy answers remain readable',()=>{assert.equal(performanceSummary(qs,[],[],'today',now).rate,null);assert.equal(performanceSummary(qs,[{id:'a',at:'2026-10-08',correct:true}],[],'total',now).total,1)});
