(function(){
 'use strict';
 const bridge=window.parent!==window&&window.parent.MFAccountBridge;
 if(!bridge){window.location.replace('../');return;}
 const id=bridge.id,base='missao-farda-pmmg-state-v3:'+id;
 let profiles={},activeProfile=null,pulling=false;
 const clone=value=>JSON.parse(JSON.stringify(value));
 window.MFAccount={id,
  initial:()=>({activeProfile}),
  seed(){
   const data=bridge.initial();profiles=clone(data.profiles||{});activeProfile=data.activeProfile||null;
   for(const [name,value] of Object.entries(profiles)){
    const key=base+'-'+name;let local=null;try{local=JSON.parse(localStorage.getItem(key))}catch{}
    profiles[name]=window.MFSync.merge(local,value);localStorage.setItem(key,JSON.stringify(profiles[name]));
   }
   if(!Object.keys(profiles).length&&data.legacy)localStorage.setItem(base,JSON.stringify(data.legacy));
  },
  saveProfile(name,state){
   if(!['luanderson','jackeline'].includes(name))return;
   profiles[name]=clone(state);activeProfile=name;bridge.save({profiles:clone(profiles),activeProfile});
   document.getElementById('sync-status').textContent=navigator.onLine?'Salvo no aparelho · sincronização automática':'Salvo neste aparelho · sem conexão';
  },
  async pull(){
   if(pulling||!navigator.onLine)return;pulling=true;
   try{const incoming=await bridge.pull();if(!incoming)return;
    for(const [name,value] of Object.entries(incoming.profiles||{}))profiles[name]=window.MFSync.merge(profiles[name],value);
    this.onIncoming?.(profiles);bridge.save({profiles:clone(profiles),activeProfile});
   }catch{}finally{pulling=false}
  },
  allow:(kind,count)=>bridge.allow(kind,count),openAccount:()=>bridge.openAccount(),logout:()=>bridge.logout()
 };
 window.addEventListener('mf-sync-status',event=>{const el=document.getElementById('sync-status');if(el)el.textContent=event.detail;});
 setInterval(()=>{if(!document.hidden)window.MFAccount.pull()},20000);
})();
