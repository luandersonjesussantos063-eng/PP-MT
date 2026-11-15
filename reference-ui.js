const copy=x=>JSON.parse(JSON.stringify(x));
export function toReferenceState(store={}){
 const state={version:3,progress:{},events:[],sessions:[],topics:{},essay:'',essayWeek:'',settings:{goal:5,timer:'off',favorites:[...(store.favorites||[])]},session:null};
 for(const row of store.attempts||[]){
  if(!/^pmmg(2018|2021|2023|2024)-\d+$/.test(row.id)||!Number.isInteger(row.selected)||row.selected<0||row.selected>3)continue;
  const at=Date.parse(row.at);if(!Number.isFinite(at))continue;
  const answer='ABCD'[row.selected],day=new Date(at).toISOString().slice(0,10),exam=row.id.split('-')[0];
  state.events.push({id:row.id,day,at,answer,correct:row.correct===true,exam});
  const previous=state.progress[row.id],due=store.program?.reviews?.[row.id]?.dueAt;
  state.progress[row.id]={answer,correct:row.correct===true,day,at,attempts:(previous?.attempts||0)+1,successStreak:row.correct?(previous?.successStreak||0)+1:0,due:due?.slice(0,10)||day,reason:row.reason||''};
 }
 state.sessions=(store.sessions||[]).map(s=>({...s,at:Date.parse(s.at)||Date.now(),day:String(s.at||'').slice(0,10),exam:'all',kind:'exam'}));
 return state;
}
export function leaveReferenceUI(dispose=false){
 document.body.classList.remove('reference-mode');
 if(dispose){document.getElementById('reference-shell')?.remove();delete window.MFAccountBridge}
}
export function mountReferenceUI({user,getState,saveSnapshot,pull,allow,openAccount,logout,tools={}}){
 if(!user?.id)return;
 if(window.MFAccountBridge?.id!==user.id)leaveReferenceUI(true);
 const id=user.id;
 const guard=()=>window.MFAccountBridge?.id===id;
 window.MFAccountBridge={id,
  initial(){const s=getState(),saved=s.program?.missaoFarda;return copy(saved||{profiles:{},activeProfile:null,legacy:toReferenceState(s)})},
  save(snapshot){
   if(!guard()||!snapshot||!snapshot.profiles)return;
   const profiles={};for(const name of ['luanderson','jackeline']){
    const value=snapshot.profiles[name];if(!value)continue;
    if(!Array.isArray(value.events)||!Array.isArray(value.sessions)||typeof value.progress!=='object')return;
    profiles[name]=copy(value);
   }
   saveSnapshot({profiles,activeProfile:['luanderson','jackeline'].includes(snapshot.activeProfile)?snapshot.activeProfile:null});
  },
  pull:async()=>guard()?await pull():null,
  allow:async(kind,count)=>guard()&&['block','exam'].includes(kind)&&Number.isInteger(count)&&count>0?await allow(kind,count):false,
  openAccount:()=>{if(guard())openAccount()},logout:()=>{if(guard())logout()},
  installationState:()=>guard()?tools.installationState?.()||{installed:true}:{installed:true},
  install:()=>{if(guard())tools.install?.()},
  preferences:()=>guard()?{sound:getState().program?.answerSound!==false,xp:getState().program?.xp||0,profile:getState().program?.profile||null,seconds:Object.values(getState().program?.studySeconds||{}).reduce((a,b)=>a+(Number(b)||0),0)}:{},
  setSound:value=>{if(guard())tools.setSound?.(value===true)},
  openTool:route=>{if(guard()&&['rotina','simulados','desempenho','estudar','erros','questoes','provas','livre','videoaulas','edital','favoritos','dados','plano','ofertas','mais'].includes(route))tools.open?.(route)},
  help:(id,mode,answer)=>{if(guard())tools.help?.(id,mode,answer)},
  answerFeedback:correct=>{if(guard()&&typeof correct==='boolean')tools.sound?.(correct)},
  activity:()=>{if(guard())tools.activity?.()}

 };
 let shell=document.getElementById('reference-shell');
 if(!shell){shell=document.createElement('section');shell.id='reference-shell';const frame=document.createElement('iframe');frame.id='reference-app';frame.title='Missão Farda — Hoje, Questões, Trilha e Evolução';frame.src='./missao/index.html?v=3.2.3';shell.appendChild(frame);document.body.appendChild(shell)}
 document.body.classList.add('reference-mode');
}

export function referenceAttempts(snapshot,existing=[]){
 const exact=new Set(existing.map(a=>(a.referenceProfile||'')+'|'+a.id+'|'+Date.parse(a.at)+'|'+a.selected));
 const legacy=new Set(existing.filter(a=>!a.referenceProfile).map(a=>a.id+'|'+Date.parse(a.at)+'|'+a.selected));
 const rows=[];
 for(const profile of ['luanderson','jackeline'])for(const e of snapshot?.profiles?.[profile]?.events||[]){
  const selected='ABCD'.indexOf(e.answer),at=Number(e.at);if(selected<0||!Number.isFinite(at)||!/^pmmg/.test(e.id))continue;
  const key=profile+'|'+e.id+'|'+at+'|'+selected,base=e.id+'|'+at+'|'+selected;
  if(exact.has(key)||legacy.has(base))continue;exact.add(key);
  rows.push({id:e.id,selected,correct:e.correct===true,at:new Date(at).toISOString(),mode:'practice',referenceProfile:profile});
 }
 return rows;
}
