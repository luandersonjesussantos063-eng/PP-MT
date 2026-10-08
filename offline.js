// The cached identity unlocks this device's study data only. Cloud writes always
// require a fresh server-verified user and remain protected by database RLS.
export const OFFLINE_ACCOUNT_KEY='ppmt-offline-account';
export function rememberAccount(storage,user){
 if(user?.id)storage.setItem(OFFLINE_ACCOUNT_KEY,JSON.stringify({id:user.id,email:user.email||''}));
}
export function cachedAccount(storage){
 try{const user=JSON.parse(storage.getItem(OFFLINE_ACCOUNT_KEY));return typeof user?.id==='string'&&storage.getItem(`ppmt-v2:${user.id}`)?user:null}catch{return null}
}
export function forgetAccount(storage){storage.removeItem(OFFLINE_ACCOUNT_KEY)}
export function createProgressSync({storage,write,verify,online=()=>navigator.onLine!==false,onStatus=()=>{}}){
 const key=id=>`ppmt-sync:${id}`;let running=null;
 const pending=id=>!!storage.getItem(key(id));
 function queue(id,state){storage.setItem(key(id),JSON.stringify(state));onStatus(id,'pending');return flush(id)}
 async function flush(id){
  if(!id||!online()||!pending(id)){onStatus(id,!online()?'offline':pending(id)?'pending':'saved');return false}
  if(running){await running;return pending(id)&&online()?flush(id):true}
  running=(async()=>{
   try{
    const user=await verify();if(user?.id!==id){onStatus(id,'login');return false}
    while(online()&&pending(id)){
     const snapshot=storage.getItem(key(id));onStatus(id,'syncing');
     await write(id,JSON.parse(snapshot));
     if(storage.getItem(key(id))===snapshot)storage.removeItem(key(id));
    }
    onStatus(id,pending(id)?'pending':'saved');return !pending(id);
   }catch{onStatus(id,online()?'pending':'offline');return false}
  })();
  try{return await running}finally{running=null}
 }
 return {queue,flush,pending};
}
