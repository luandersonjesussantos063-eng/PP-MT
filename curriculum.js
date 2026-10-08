import {AUTHORIAL_MT_CONCEPTS} from './authorial-mt.js?v=46';
import {MT_QUESTIONS} from './official.js?v=27';
export const CONCEPTS=[...MT_QUESTIONS.filter(q=>!q.historicalOnly).map(q=>({id:q.id,title:q.topic,subject:q.subject,lesson:q.lesson,baseId:q.id})),...AUTHORIAL_MT_CONCEPTS];
const known=new Set(CONCEPTS.map(c=>c.id));
export function enrichConcept(q){return known.has(q.id)?{...q,conceptId:q.id}:q}
export function sameConcept(a,b){return !!a?.conceptId&&a.conceptId===b?.conceptId}
export function compatibleWithMT(q){
 const text=[q.statement,...(q.options||[])].join(' ').toLocaleLowerCase('pt-BR');
 // Federal content from other contests is retained; explicit other-state rules stay in archive.
 return !/(constituição|lei|decreto|estatuto|servidores|polícia penal|agentes penitenciários|sistema penitenciário).{0,100}(estado (da|de|do) (bahia|alagoas|espírito santo|rio grande do sul)|ba\b|seap\/ba|sejus\/es)|constituição (baiana|alagoana|capixaba|gaúcha)/i.test(text);
}
export function conceptProgress(questions,attempts,generated=[],now=Date.now()){
 const groups=new Map();
 for(const q of questions)if(q.conceptId&&!q.historicalOnly&&!groups.has(q.conceptId))groups.set(q.conceptId,{id:q.conceptId,title:q.topic,subject:q.subject,questions:questions.filter(x=>sameConcept(x,q)).length});
 return [...groups.values()].map(c=>{
  const ids=new Set(questions.filter(q=>q.conceptId===c.id).map(q=>q.id));
  const rows=attempts.filter(a=>ids.has(a.id)||a.reviewOf===c.id);
  const applications=generated.filter(a=>(a.conceptId===c.id||a.originalId===c.id)&&a.kind==='application');
  const last=[...rows,...applications].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).at(-1);
  const scheduled=[...rows,...applications].filter(a=>a.mode==='retention');
  return {...c,attempts:rows.length+applications.length,retentionCount:scheduled.length,status:!last?'Precisa aprender':!last.correct||last.guessed?'Precisa revisar':'Em prática',lastAt:last?.at||null};
 });
}
export function chooseConceptBlock(questions,attempts,count=4,subject='',generated=[]){
 const eligible=questions.filter(q=>q.conceptId&&q.lesson&&!q.historicalOnly&&(!subject||q.subject===subject));
 const ids=[...new Set(eligible.map(q=>q.conceptId))];if(!ids.length)return [];
 const records=[...attempts,...(Array.isArray(generated)?generated:[])].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const conceptFor=a=>a.conceptId||eligible.find(q=>q.id===(a.reviewOf||a.id)||q.id===a.originalId)?.conceptId;
 const history=id=>records.filter(a=>conceptFor(a)===id);
 const subjects=[...new Set(eligible.map(q=>q.subject))];
 // Rotate subject by the least recently studied, then learn new concepts within it.
 const subjectLast=s=>Math.max(0,...attempts.filter(a=>eligible.some(q=>q.id===a.id&&q.subject===s)).map(a=>Date.parse(a.at)||0));
 const lastConcept=conceptFor(records.at(-1)||{});
 const priority=id=>{const h=history(id).slice(-6),last=h.at(-1);return !last?2:!last.correct||last.guessed?h.filter(a=>!a.correct||a.guessed).length>=2?0:1:3};
 const candidates=ids.slice();
 candidates.sort((a,b)=>Number(a===lastConcept)-Number(b===lastConcept)||priority(a)-priority(b)||subjectLast(eligible.find(q=>q.conceptId===a).subject)-subjectLast(eligible.find(q=>q.conceptId===b).subject)||(Date.parse(history(a).at(-1)?.at)||0)-(Date.parse(history(b).at(-1)?.at)||0));
 const id=candidates[0],group=eligible.filter(q=>q.conceptId===id),base=group.find(q=>q.id===id)||group[0];
 // Worked example belongs to the same concept, and is not the first test item.
 return [base,...group.filter(q=>q.id!==base.id).sort((a,b)=>Number(attempts.some(x=>x.id===a.id))-Number(attempts.some(x=>x.id===b.id)))].slice(0,Math.max(2,count));
}
export function dailyStudyPlan(questions,attempts,dueIds,minutes,subject='',generated=[]){
 const cap=Math.min(5,Math.max(0,Math.floor(minutes/6)));
 const reviewIds=[...dueIds].slice(0,cap);
 const reviewMinutes=Math.min(minutes,reviewIds.length*3),remaining=Math.max(0,minutes-reviewMinutes);
 const block=chooseConceptBlock(questions,attempts,4,subject,generated);
 const first=block[0];
 const ids=new Set(block.map(q=>q.id)),rows=[...attempts,...generated].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)).filter(a=>ids.has(a.reviewOf||a.id)||a.conceptId===first?.conceptId),last=rows.at(-1),errors=rows.slice(-6).filter(a=>!a.correct||a.guessed).length;
 const reason=last&&(!last.correct||last.guessed)?errors>=2?'Este conceito teve erros ou chutes repetidos. Vamos reforçar a base.':'Sua última resposta neste conceito teve erro ou chute. Vamos esclarecer esse ponto.':rows.length?'Retomar um conceito e alternar as matérias.':'Conceito ainda não praticado: ampliar sua base.';
 return {reviewIds,reviewMinutes,learnMinutes:remaining,blockIds:block.map(q=>q.id),topic:first?.topic||null,subject:first?.subject||null,practiceCount:Math.max(0,block.length-1),minutes,reason};
}
