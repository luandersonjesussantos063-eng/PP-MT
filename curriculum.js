import {MT_QUESTIONS} from './official.js?v=27';
export const CONCEPTS=MT_QUESTIONS.filter(q=>!q.historicalOnly).map(q=>({id:q.id,title:q.topic,subject:q.subject,lesson:q.lesson,baseId:q.id}));
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
export function chooseConceptBlock(questions,attempts,count=4,subject='',day=''){
 const eligible=questions.filter(q=>q.conceptId&&q.lesson&&!q.historicalOnly&&(!subject||q.subject===subject));
 const ids=[...new Set(eligible.map(q=>q.conceptId))];if(!ids.length)return [];
 const history=id=>attempts.filter(a=>eligible.some(q=>q.id===a.id&&q.conceptId===id));
 const subjects=[...new Set(eligible.map(q=>q.subject))];
 // Rotate subject by the least recently studied, then learn new concepts within it.
 const subjectLast=s=>Math.max(0,...attempts.filter(a=>eligible.some(q=>q.id===a.id&&q.subject===s)).map(a=>Date.parse(a.at)||0));
 const selectedSubject=subject||subjects.sort((a,b)=>subjectLast(a)-subjectLast(b))[0];
 const candidates=ids.filter(id=>eligible.find(q=>q.conceptId===id).subject===selectedSubject);
 candidates.sort((a,b)=>{const aa=history(a),bb=history(b);return Number(!!aa.length)-Number(!!bb.length)||(Date.parse(aa.at(-1)?.at)||0)-(Date.parse(bb.at(-1)?.at)||0)});
 const id=candidates[0],group=eligible.filter(q=>q.conceptId===id),base=group.find(q=>q.id===id)||group[0];
 // Worked example belongs to the same concept, and is not the first test item.
 return [base,...group.filter(q=>q.id!==base.id).sort((a,b)=>Number(attempts.some(x=>x.id===a.id))-Number(attempts.some(x=>x.id===b.id)))].slice(0,Math.max(2,count));
}
export function dailyStudyPlan(questions,attempts,dueIds,minutes,subject=''){
 const cap=Math.min(5,Math.max(0,Math.floor(minutes/6)));
 const reviewIds=[...dueIds].slice(0,cap);
 const reviewMinutes=Math.min(minutes,reviewIds.length*3),remaining=Math.max(0,minutes-reviewMinutes);
 const block=chooseConceptBlock(questions,attempts,4,subject);
 const first=block[0];
 return {reviewIds,reviewMinutes,learnMinutes:remaining,blockIds:block.map(q=>q.id),topic:first?.topic||null,subject:first?.subject||null,practiceCount:Math.max(0,block.length-1),minutes};
}
