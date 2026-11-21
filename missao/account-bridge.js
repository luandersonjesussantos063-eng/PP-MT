(function(){
 'use strict';
 const bridge=window.parent!==window&&window.parent.MFAccountBridge;
 if(!bridge){window.location.replace('../');return;}
 document.documentElement.style.setProperty('--mf-safe-bottom','0px');
 const id=bridge.id,base='missao-farda-pmmg-state-v3:'+id;
 let profiles={},activeProfile=null,pulling=false;
 const clone=value=>JSON.parse(JSON.stringify(value));
 window.MFAccount={id,localGuest:!!bridge.localGuest,
  initial:()=>({activeProfile}),
  seed(){
   const data=bridge.initial();profiles=clone(data.profiles||{});activeProfile=localStorage.getItem('mf-active-profile:'+id)||null;
   for(const [name,value] of Object.entries(profiles)){
    const key=base+'-'+name;let local=null;try{local=JSON.parse(localStorage.getItem(key))}catch{}
    profiles[name]=window.MFSync.merge(local,value);localStorage.setItem(key,JSON.stringify(profiles[name]));
   }
   if(!Object.keys(profiles).length&&data.legacy)localStorage.setItem(base,JSON.stringify(data.legacy));
  },
  saveProfile(name,state){
   if(!['luanderson','jackeline'].includes(name))return;
   profiles[name]=clone(state);activeProfile=name;localStorage.setItem('mf-active-profile:'+id,name);bridge.save({profiles:clone(profiles),activeProfile});
   document.getElementById('sync-status').textContent=bridge.localGuest?'Salvo neste aparelho':navigator.onLine?'Salvo no aparelho · sincronização automática':'Salvo neste aparelho · sem conexão';
  },
  async pull(){
   if(bridge.localGuest||pulling||!navigator.onLine)return;pulling=true;
   try{const incoming=await bridge.pull();if(!incoming)return;
    for(const [name,value] of Object.entries(incoming.profiles||{}))profiles[name]=window.MFSync.merge(profiles[name],value);
    this.onIncoming?.(profiles);bridge.save({profiles:clone(profiles),activeProfile});
   }catch{}finally{pulling=false}
  },
  installationState:()=>bridge.installationState?.()||{installed:true},install:()=>bridge.install?.(),
  preferences:()=>bridge.preferences?.()||{},setSound:value=>bridge.setSound?.(value),openTool:route=>bridge.openTool?.(route),help:(id,mode,answer)=>bridge.help?.(id,mode,answer),answerFeedback:correct=>bridge.answerFeedback?.(correct),
  questionInfo:id=>window.MFQuestionInfo?.(id),eliminate:(id,letter)=>window.MFEliminate?.(id,letter),
  correction:questionId=>bridge.correction?.(questionId)||{},
  allow:(kind,count)=>bridge.allow(kind,count),openAccount:()=>bridge.openAccount(),logout:()=>bridge.logout()
 };
 window.addEventListener('mf-sync-status',event=>{const el=document.getElementById('sync-status');if(el)el.textContent=event.detail;});
 ['pointerdown','keydown','scroll'].forEach(type=>document.addEventListener(type,()=>bridge.activity?.(),{capture:true,passive:true}));
 setInterval(()=>{if(!document.hidden)window.MFAccount.pull()},20000);
})();
