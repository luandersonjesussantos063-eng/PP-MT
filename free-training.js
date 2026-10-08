const latestAttempts=attempts=>{const latest=new Map();for(const a of attempts)if(!a.reviewOf&&a.mode!=='review-transfer')latest.set(a.id,a);return latest};
export function freeTrainingPool(bank,attempts,prefs={}){
 const latest=latestAttempts(attempts),subjects=prefs.subjects||[];
 return bank.filter(q=>!q.historicalOnly&&q.displayMode!=='source-pdf'&&(!subjects.length||subjects.includes(q.subject))&&(!prefs.errorsOnly||latest.has(q.id)&&(!latest.get(q.id).correct||latest.get(q.id).guessed)));
}
export function createFreeTraining(prefs={},now=Date.now()){
 return {id:'free-'+now+'-'+Math.random().toString(36).slice(2,9),prefs:{subjects:[...(prefs.subjects||[])],errorsOnly:!!prefs.errorsOnly},startedAt:new Date(now).toISOString(),cycle:1,cycleSeen:[],currentId:null,selected:null,answered:false};
}
export function nextFreeQuestion(session,bank,attempts,random=Math.random){
 const pool=freeTrainingPool(bank,attempts,session.prefs),latest=latestAttempts(attempts);let seen=session.cycleSeen||[],cycle=session.cycle||1;
 let candidates=pool.filter(q=>!seen.includes(q.id));
 if(!candidates.length&&pool.length){seen=[];cycle++;candidates=pool.filter(q=>pool.length===1||q.id!==session.currentId)}
 const fresh=candidates.filter(q=>!latest.has(q.id));if(fresh.length)candidates=fresh;
 const otherSubject=candidates.filter(q=>q.subject!==session.lastSubject);if(otherSubject.length)candidates=otherSubject;
 const groups=[...new Set(candidates.map(q=>q.subject))];
 const subject=groups[Math.min(groups.length-1,Math.floor(random()*groups.length))];
 const group=candidates.filter(q=>q.subject===subject);
 const q=group[Math.min(group.length-1,Math.floor(random()*group.length))];
 return {...session,cycle,cycleSeen:q?[...seen,q.id]:seen,currentId:q?.id||null,lastSubject:q?.subject||session.lastSubject,selected:null,answered:false};
}
export function freeTrainingSummary(attempts,session){
 const answers=attempts.filter(a=>a.mode==='free-training'&&a.freeSession===session.id),correct=answers.filter(a=>a.correct).length,subjects=new Map();
 for(const a of answers){const name=a.subject||'Matéria não identificada',s=subjects.get(name)||{name,total:0,correct:0,reinforce:0};s.total++;if(a.correct)s.correct++;if(!a.correct||a.guessed)s.reinforce++;subjects.set(name,s)}
 return {total:answers.length,correct,wrong:answers.length-correct,guessed:answers.filter(a=>a.guessed).length,rate:answers.length?Math.round(correct/answers.length*100):null,xp:answers.reduce((n,a)=>n+(a.xpAwarded||0),0),subjects:[...subjects.values()].sort((a,b)=>b.reinforce-a.reinforce||b.total-a.total)};
}
