import {SYLLABUS} from './syllabus-data.js?v=2.12.1';
export const EDITAL_SOURCE=SYLLABUS.source;
export const EDITAL_TOPICS=SYLLABUS.topics;
export function questionTopicIds(q){return q.historicalOnly?[]:SYLLABUS.conceptTopics[q.conceptId||q.id]||[]}
export function syllabusCoverage(questions,attempts=[],generated=[]){
 const rows=[...attempts,...generated].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 return EDITAL_TOPICS.map(topic=>{
  const qs=questions.filter(q=>questionTopicIds(q).includes(topic.id)),ids=new Set(qs.map(q=>q.id)),concepts=new Set(qs.map(q=>q.conceptId).filter(Boolean));
  const records=rows.filter(a=>ids.has(a.reviewOf||a.originalId||a.id)||concepts.has(a.conceptId));
  const latest=records.at(-1),retention=records.filter(a=>a.mode==='retention');
  const guided=qs.some(q=>q.lesson&&q.conceptId&&qs.some(other=>other.id!==q.id&&other.conceptId===q.conceptId&&other.practiceKind==='application'));
  return {...topic,ids:[...ids],conceptId:guided?qs.find(q=>q.conceptId)?.conceptId:null,count:qs.length,guided,attempts:records.length,retentionCount:retention.length,status:!latest?'Ainda não praticado':!latest.correct||latest.guessed?'Precisa reforçar':latest.mode==='retention'?'Retenção testada':'Em prática'};
 });
}
