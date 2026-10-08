// Calendar periods follow Mato Grosso, including answers near UTC midnight.
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Cuiaba',year:'numeric',month:'2-digit',day:'2-digit'});
function dayOf(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))return null;const parts=Object.fromEntries(dayFormat.formatToParts(date).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`}
export function performanceSummary(questions,attempts=[],generated=[],period='total',now=new Date()){
 const today=dayOf(now),span=({today:1,week:7,month:30})[period];
 const start=span?new Date(Date.parse(today+'T12:00:00Z')-(span-1)*86400000).toISOString().slice(0,10):null;
 const active=new Map(questions.filter(q=>!q.historicalOnly).map(q=>[q.id,q]));
 const rows=[...attempts.map(a=>({a,q:active.get(a.id)})),...generated.map(a=>({a,q:active.get(a.originalId)}))].filter(({a,q})=>{const day=dayOf(a.at);return q&&typeof a.correct==='boolean'&&a.selected!==null&&day&&day<=today&&(!start||day>=start)});
 const summarize=items=>{const total=items.length,correct=items.filter(({a})=>a.correct).length;return {total,correct,wrong:total-correct,rate:total?Math.round(correct/total*1000)/10:null,guessed:items.filter(({a})=>a.guessed).length}};
 return {...summarize(rows),subjects:[...new Set(questions.filter(q=>!q.historicalOnly).map(q=>q.subject))].map(subject=>({subject,...summarize(rows.filter(({q})=>q.subject===subject))})),generated:rows.filter(({a})=>a.originalId).length};
}
