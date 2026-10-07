// Pure learning and schedule rules. Calendar dates use local noon (DST safe).
export const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayNumber=s=>Math.floor(Date.UTC(...s.split('-').map((n,i)=>Number(n)-(i===1?1:0)))/86400000);
export function minutesFor(profile,date=new Date()){
 if(!profile)return 20;
 if(profile.schedule==='shift')return Math.abs(dayNumber(dayKey(date))-dayNumber(profile.anchor))%2===0?profile.workMinutes:profile.freeMinutes;
 return profile.days.includes(date.getDay())?profile.minutes:0;
}
export function dueReviews(attempts,reviews={},now=Date.now()){
 const latest=new Map();for(const a of attempts)latest.set(a.id,a);
 return [...latest].filter(([id,a])=>{const r=reviews[id];if(r&&Date.parse(r.checkedAt)>=Date.parse(a.at))return Date.parse(r.dueAt)<=now;return !a.correct||a.guessed;}).map(([id])=>id);
}
export function nextReview(previous,correct,now=Date.now()){
 const stage=correct?Math.min(4,(previous?.stage||0)+1):0;
 return {stage,checkedAt:new Date(now).toISOString(),dueAt:new Date(now+[1,1,3,7,14][stage]*86400000).toISOString(),correct};
}
export function learningMetrics(attempts){
 const first=new Map();for(const a of attempts)if(!first.has(a.id)&&a.mode!=='review-transfer')first.set(a.id,a);
 const fresh=[...first.values()],independent=fresh.filter(a=>!a.guessed&&!a.assists?.length),retention=attempts.filter(a=>a.mode==='retention');
 const rate=a=>a.length?Math.round(a.filter(x=>x.correct&&!x.guessed).length/a.length*100):null;
 return {seen:first.size,newCount:independent.length,newRate:rate(independent),retentionCount:retention.length,retentionRate:rate(retention)};
}
export function selectLearningQuestions(bank,attempts,count){
 const seen=new Set(attempts.map(a=>a.id));
 const subjects=[...new Set(bank.map(q=>q.subject))];
 const ranked=subjects.map(subject=>{const qs=bank.filter(q=>q.subject===subject),ids=new Set(qs.map(q=>q.id));const recent=attempts.filter(a=>ids.has(a.id)).slice(-20);return {subject,score:recent.length?recent.filter(a=>a.correct&&!a.guessed).length/recent.length:-1};}).sort((a,b)=>a.score-b.score);
 const available=ranked.find(s=>bank.some(q=>q.subject===s.subject&&!seen.has(q.id)))||ranked[0];
 return bank.filter(q=>q.subject===available?.subject).sort((a,b)=>Number(seen.has(a.id))-Number(seen.has(b.id))).slice(0,count);
}
