import {signIn,verifiedUser,runPremiumPractice} from '../auth.js?v=2.15.0';
import {loginWithGoogle} from '../account-services.js?v=2.17.0';
import {createClient} from '../assets/vendor/supabase-2.117.2.js';

const $=id=>document.getElementById(id);
const filterClient=createClient(
 'https://fermfbmhwlafwopwndoj.supabase.co',
 'sb_publishable_Nz1NSEvEmmIHI7LUREPNyg_Wxsrn5ZN',
 {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
let busy=false,current=null,answered=false,mode='mixed',subject='',stats=null;
const modeText={
 mixed:'Treino misto: questões exclusivas variadas, priorizando as inéditas.',
 wrong:'Recuperação de erros: refaça questões cuja última resposta foi incorreta.',
 new:'Questões inéditas: avance pelo banco Premium sem repetir questões já respondidas.',
 weak:'Ponto fraco: foco na matéria com menor taxa de acerto após pelo menos duas respostas.',
 subject:'Por disciplina: escolha uma matéria para treinar de forma concentrada.'
};
function show(id,yes){$(id).hidden=!yes;}
function notice(message){$('feedback').textContent=message||'';}
function busyState(value){
 busy=value;
 $('login-btn').disabled=value;
 $('start-mode').disabled=value;
 $('next-btn').disabled=value;
 $('subject-filter').disabled=value;
 document.querySelectorAll('#mode-buttons button').forEach(x=>x.disabled=value);
 $('choices').querySelectorAll('button').forEach(b=>b.disabled=value||answered);
}
function renderSubjects(response){
 const subjects=Array.isArray(response.subjects)?response.subjects:[];
 const select=$('subject-filter'),old=select.value;
 select.replaceChildren();
 for(const s of subjects){
  if(typeof s.subject!=='string'||!s.subject)continue;
  const option=document.createElement('option');option.value=s.subject;option.textContent=s.subject;
  select.appendChild(option);
 }
 const names=subjects.map(s=>s.subject);
 if(names.includes(old))select.value=old;
 subject=select.value||'';
 const container=$('subject-stats');container.replaceChildren();
 if(!subjects.length){
  const p=document.createElement('p');p.className='premium-sub';p.textContent='Seu desempenho aparecerá aqui depois do primeiro treino.';
  container.appendChild(p);return;
 }
 for(const item of subjects){
  const row=document.createElement('div');row.className='elite-subject-row';
  const head=document.createElement('div');head.className='elite-subject-row-head';
  const name=document.createElement('strong');name.textContent=item.subject;
  const count=document.createElement('span');
  count.textContent=Number(item.answers)?Number(item.accuracy)+'% · '+item.answers+' resposta(s)':'Ainda não treinada';
  head.append(name,count);
  const rail=document.createElement('div');rail.className='elite-bar';
  const fill=document.createElement('div');fill.className='elite-bar-fill';
  fill.style.width=Math.min(100,Math.max(0,Number(item.accuracy)||0))+'%';
  rail.appendChild(fill);
  row.append(head,rail);
  container.appendChild(row);
 }
}
function renderStats(response){
 stats=response;
 $('stat-accuracy').textContent=response.accuracy==null?'—':Number(response.accuracy)+'%';
 $('stat-answered').textContent=String(Number(response.answered)||0);
 $('stat-remaining').textContent=String(Number(response.remaining_questions)||0);
 $('stat-errors').textContent=String(Number(response.unresolved_errors)||0);
 const until=Date.parse(response.current_period_end);
 $('elite-validity').textContent=Number.isFinite(until)?'Válido até '+new Date(until).toLocaleDateString('pt-BR'):'Premium ativo';
 renderSubjects(response);
}
function chooseMode(next){
 if(busy||!(next in modeText))return;
 mode=next;
 document.querySelectorAll('#mode-buttons button').forEach(x=>{
  const selected=x.dataset.mode===mode;
  x.classList.toggle('is-selected',selected);
  x.setAttribute('aria-pressed',String(selected));
 });
 show('subject-filter-wrap',mode==='subject');
 $('mode-note').textContent=modeText[mode];
 // Uma troca de modalidade precisa iniciar uma nova sessão; não modifica a resposta anterior.
 if(!answered)show('training-panel',false);
 notice('');
}
async function refreshStats(){
 const data=await runPremiumPractice('status');
 if(!data.premium)throw new Error('Seu acesso Premium expirou. Consulte Meu plano.');
 renderStats(data);
 return data;
}
async function filteredNext(){
 // Cliente Supabase com a mesma sessão, apenas para enviar filtros; gabaritos permanecem no servidor.
 const user=await verifiedUser();
 if(!user)throw new Error('Faça login na conta PP-MT.');
 const {data,error}=await filterClient.functions.invoke('ppmt-premium-practice',{
  body:{action:'next',mode,subject:mode==='subject'?subject:''}
 });
 if(error){
  let message='';
  if(typeof error.context?.json==='function'){
   try{message=String((await error.context.json())?.error||'');}catch{}
  }
  if(error.context?.status===402)return {premium:false,state:'locked'};
  throw new Error(message.slice(0,220)||'Não foi possível buscar uma questão Premium.');
 }
 return data;
}
async function connect(){
 busyState(true);notice('Verificando seu acesso Premium…');
 try{
  const user=await verifiedUser();
  show('login-panel',!user);
  show('locked-panel',false);show('insights-panel',false);show('modes-panel',false);show('training-panel',false);
  if(!user){notice('Entre na sua conta para continuar.');return;}
  const response=await runPremiumPractice('status');
  if(!response.premium){show('locked-panel',true);notice('O acesso avançado requer uma mensalidade ativa.');return;}
  renderStats(response);
  show('insights-panel',true);show('modes-panel',true);
  chooseMode('mixed');notice('Central tática pronta. Escolha uma missão e comece a treinar.');
 }catch(error){notice(error?.message||'Não foi possível entrar na central.');}
 finally{busyState(false);}
}
async function nextQuestion(){
 if(busy)return;
 busyState(true);show('answer-feedback',false);answered=false;
 try{
  subject=$('subject-filter').value||'';
  const data=await filteredNext();
  if(!data?.premium){show('training-panel',false);show('locked-panel',true);show('insights-panel',false);show('modes-panel',false);notice('Seu período Premium terminou.');return;}
  if(data.state==='empty'){show('training-panel',false);notice(data.message||'Sem questões disponíveis nesta modalidade.');return;}
  const q=data.question;
  if(!q||!Array.isArray(q.options)||!q.id||q.options.length<3)
   throw new Error('O servidor não retornou uma questão válida.');
  current=q;
  show('training-panel',true);show('locked-panel',false);
  $('subject').textContent=q.subject+' · '+q.topic;
  $('progress').textContent=(Number(stats?.answered)||0)+' respostas';
  $('question-title').textContent={
   mixed:'Treino tático',wrong:'Missão recuperação',new:'Questão inédita',weak:'Ponto fraco',subject:'Treino por matéria'
  }[mode]||'Questão Premium';
  $('question-text').textContent=q.statement;
  const choices=$('choices');choices.replaceChildren();
  q.options.forEach((option,index)=>{
   const btn=document.createElement('button');btn.type='button';btn.className='premium-choice';
   btn.textContent=String.fromCharCode(65+index)+'. '+String(option);
   btn.addEventListener('click',()=>answer(index));
   choices.appendChild(btn);
  });
  $('next-btn').hidden=true;
  notice('');
  $('training-panel').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(error){notice(error?.message||'Não foi possível abrir a missão.');}
 finally{busyState(false);}
}
async function answer(selection){
 if(busy||answered||!current)return;
 busyState(true);
 try{
  const data=await runPremiumPractice('answer',{id:current.id,selected_index:selection});
  if(!data.premium||data.state!=='answered')throw new Error('Não foi possível validar a resposta.');
  answered=true;
  $('choices').querySelectorAll('button').forEach((b,i)=>{
   b.disabled=true;
   b.classList.toggle('premium-correct',i===data.answer_index);
   b.classList.toggle('premium-wrong',i===selection&&!data.correct);
  });
  $('answer-title').textContent=data.correct?'✓ Resposta correta!':'✕ Resposta incorreta — veja como resolver.';
  $('explanation').textContent=data.explanation||'';
  show('answer-feedback',true);$('next-btn').hidden=false;
  try{await refreshStats();$('progress').textContent=stats.answered+' respostas';}
  catch{notice('Resposta salva. Os indicadores serão atualizados quando você abrir a central novamente.');}
 }catch(error){notice(error?.message||'Não foi possível corrigir a questão.');}
 finally{busyState(false);}
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy)return;busyState(true);
 try{
  await signIn($('email').value.trim(),$('password').value);
  $('password').value='';
  busyState(false);await connect();
 }catch{notice('Confira e-mail, senha e confirmação da conta.');}
 finally{busyState(false);}
});
document.querySelectorAll('#mode-buttons button').forEach(b=>b.addEventListener('click',()=>chooseMode(b.dataset.mode)));
$('subject-filter').addEventListener('change',e=>{subject=e.target.value;show('training-panel',false);});
$('start-mode').addEventListener('click',nextQuestion);
$('next-btn').addEventListener('click',nextQuestion);
connect();

// Login Google: retorno para a Central Tática após a autenticação.
$('google-login-btn').addEventListener('click',async()=>{
 const button=$('google-login-btn');button.disabled=true;notice('Abrindo login seguro do Google…');
 try{await loginWithGoogle('premium');}
 catch(e){button.disabled=false;notice(e?.message||'Não foi possível autenticar com Google. Tente com e-mail e senha.');}
});
