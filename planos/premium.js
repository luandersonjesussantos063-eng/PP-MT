import {signIn,verifiedUser,runPremiumPractice} from '../auth.js?v=2.15.0';
const el=id=>document.getElementById(id);
let busy=false,current=null,answered=false,total=0,answeredCount=0;
const notice=(message)=>{el('feedback').textContent=message;};
const busyState=value=>{
 busy=value;
 el('login-btn').disabled=value;
 el('next-btn').disabled=value;
 el('choices').querySelectorAll('button').forEach(b=>b.disabled=value||answered);
};
const show=(id,yes)=>{el(id).hidden=!yes;};
async function connect(){
 busyState(true);
 try{
  const user=await verifiedUser();
  show('login-panel',!user);show('locked-panel',false);show('training-panel',false);
  if(!user){notice('Entre na sua conta PP-MT.');return;}
  const response=await runPremiumPractice('status');
  if(!response.premium){show('locked-panel',true);notice('Acesso Premium indisponível nesta conta.');return;}
  total=Number(response.total_questions)||0;answeredCount=Number(response.answered)||0;
  notice('');
  await nextQuestion(true);
 }catch(error){notice(error?.message||'Não foi possível carregar o treino.');}
 finally{busyState(false);}
}
async function nextQuestion(nested=false){
 if(busy&&!nested)return;
 busyState(true);show('answer-feedback',false);answered=false;
 try{
  const data=await runPremiumPractice('next');
  if(!data.premium){show('training-panel',false);show('locked-panel',true);notice('Seu período Premium terminou.');return;}
  if(data.state==='empty'){show('training-panel',false);notice('Estamos preparando novas questões.');return;}
  const q=data.question;
  if(!q||!Array.isArray(q.options)||!q.id||q.options.length<3)throw new Error('Questão indisponível.');
  current=q;show('training-panel',true);show('locked-panel',false);
  el('subject').textContent=q.subject+' · '+q.topic;
  el('progress').textContent=answeredCount+' resposta(s)';
  el('question-title').textContent='Questão Premium';
  el('question-text').textContent=q.statement;
  const choices=el('choices');choices.replaceChildren();
  q.options.forEach((option,index)=>{
   const button=document.createElement('button');button.type='button';button.className='premium-choice';
   button.textContent=String.fromCharCode(65+index)+'. '+option;
   button.addEventListener('click',()=>answer(index));choices.appendChild(button);
  });
  el('next-btn').hidden=true;notice('');
 }catch(error){notice(error?.message||'Não foi possível carregar a questão.');}
 finally{busyState(false);}
}
async function answer(selected){
 if(busy||answered||!current)return;
 busyState(true);
 try{
  const data=await runPremiumPractice('answer',{id:current.id,selected_index:selected});
  if(!data.premium||data.state!=='answered')throw new Error('Não foi possível confirmar sua resposta.');
  answered=true;answeredCount++;
  el('choices').querySelectorAll('button').forEach((b,i)=>{
   b.disabled=true;
   b.classList.toggle('premium-correct',i===data.answer_index);
   b.classList.toggle('premium-wrong',i===selected&&!data.correct);
  });
  el('answer-title').textContent=data.correct?'Resposta correta!':'Resposta incorreta.';
  el('explanation').textContent=data.explanation||'';
  show('answer-feedback',true);el('next-btn').hidden=false;
  el('progress').textContent=answeredCount+' resposta(s)';
 }catch(error){notice(error?.message||'Não foi possível conferir sua resposta.');}
 finally{busyState(false);}
}
el('login-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busyState(true);
 try{
  await signIn(el('email').value.trim(),el('password').value);el('password').value='';
  busyState(false);await connect();
 }catch{notice('Confira e-mail, senha e confirmação da conta.');}
 finally{busyState(false);}
});
el('next-btn').addEventListener('click',()=>nextQuestion());
connect();