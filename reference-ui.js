const copy=x=>JSON.parse(JSON.stringify(x));
export function toReferenceState(store={}){
 const state={version:3,progress:{},events:[],sessions:[],topics:{},essay:'',essayWeek:'',settings:{goal:5,timer:'off'},session:null};
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
export function mountReferenceUI({user,getState,saveSnapshot,pull,allow,openAccount,logout}){
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
  openAccount:()=>{if(guard())openAccount()},logout:()=>{if(guard())logout()}
 };
 let shell=document.getElementById('reference-shell');
 if(!shell){shell=document.createElement('section');shell.id='reference-shell';const frame=document.createElement('iframe');frame.id='reference-app';frame.title='Missão Farda — Hoje, Questões, Trilha e Evolução';frame.src='./missao/index.html?v=3.2.0';shell.appendChild(frame);document.body.appendChild(shell)}
 document.body.classList.add('reference-mode');
}
