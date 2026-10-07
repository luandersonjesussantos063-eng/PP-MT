export function validateBank(items){
 if(!Array.isArray(items)||items.length>5000)throw Error('O arquivo deve conter uma lista de até 5.000 questões.');
 const ids=new Set();
 for(const q of items){
  if(!q||typeof q.id!=='string'||!q.id.trim()||['__proto__','constructor','prototype'].includes(q.id)||ids.has(q.id))throw Error('Cada questão precisa de um ID único.');
  ids.add(q.id);
  for(const key of ['subject','topic','statement','explanation'])if(typeof q[key]!=='string'||!q[key].trim()||q[key].length>20000)throw Error(`Campo inválido: ${key}.`);
  if(!Array.isArray(q.options)||q.options.length<2||q.options.length>5||q.options.some(x=>typeof x!=='string'||!x.trim()||x.length>10000))throw Error('Use de 2 a 5 alternativas de texto.');
  if(!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error('Gabarito inválido.');
  if(!['autoral','prova'].includes(q.origin))throw Error('Origem deve ser autoral ou prova.');
  if(q.origin==='prova'){
   const s=q.source;if(!s||!['board','exam','year','number','examUrl','answerUrl','reviewedAt'].every(k=>typeof s[k]==='string'&&s[k].trim()))throw Error('Questão de prova exige banca, concurso, ano, número, URLs da prova e gabarito e data de revisão.');
   for(const key of ['examUrl','answerUrl']){let u;try{u=new URL(s[key])}catch{throw Error('URL da fonte inválida.')}if(u.protocol!=='https:')throw Error('As fontes devem usar HTTPS.');}
  }
 }
 return items;
}
export function shuffle(list){const result=[...list];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result;}
export function latestErrors(attempts){const last=new Map();for(const a of attempts)last.set(a.id,a);return new Set([...last.values()].filter(a=>!a.correct).map(a=>a.id));}
export function summary(attempts){const correct=attempts.filter(a=>a.correct).length;return {total:attempts.length,correct,rate:attempts.length?Math.round(correct/attempts.length*100):0};}
