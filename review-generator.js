// Offline adaptation: preserve the full source command and its answer key.
// Never turn an EXCETO/INCORRETA option into an unqualified legal assertion.
export function createReviewExercise(original, random=Math.random){
 if(!original?.options?.length||!Number.isInteger(original.answer))throw new Error('Questão sem gabarito para gerar revisão.');
 const incorrect=original.options.map((_,i)=>i).filter(i=>i!==original.answer);
 const candidate=random()<0.5||!incorrect.length?original.answer:incorrect[Math.min(incorrect.length-1,Math.floor(random()*incorrect.length))];
 const matches=candidate===original.answer;
 return {...original,id:`generated-review:${original.id}:${candidate}`,generated:true,originalId:original.id,source:undefined,lesson:undefined,
 statement:`Analise a situação: um estudante leu o enunciado abaixo e escolheu a resposta indicada. Essa escolha atende ao que o enunciado pede?\n\n${original.statement}\n\nResposta escolhida pelo estudante:\n${original.options[candidate]}`,
 options:['Sim, a escolha atende ao comando.','Não, a escolha não atende ao comando.'],answer:matches?0:1,
 explanation:`${matches?'A escolha atende':'A escolha não atende'} ao comando da questão-base. A resposta indicada pelo gabarito é: ${original.options[original.answer]}. ${original.lesson?.reasoning||original.explanation||''}`,
 generation:{type:'answer-judgment',candidate,originalAnswer:original.answer},origin:'autoral'};
}
