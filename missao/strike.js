/* Horizontal elimination gesture; vertical swipes remain normal page scrolling. */
(function(root){
 'use strict';
 function bind(button,{blocked=()=>false,toggle}){
  let drag=null,suppressUntil=0;
  const reset=()=>{button.style.removeProperty('transform');button.classList.remove('is-dragging');drag=null};
  button.addEventListener('pointerdown',event=>{
   if(blocked()||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
   drag={id:event.pointerId,x:event.clientX,y:event.clientY,horizontal:false,vertical:false};
   try{button.setPointerCapture(event.pointerId)}catch{}
  });
  button.addEventListener('pointermove',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y,ax=Math.abs(dx),ay=Math.abs(dy);
   if(!drag.horizontal&&ay>12&&ay>ax){drag.vertical=true;return}
   if(drag.vertical)return;
   if(ax>12&&ax>ay*1.4)drag.horizontal=true;
   if(drag.horizontal){
    if(event.cancelable)event.preventDefault();
    button.classList.add('is-dragging');button.style.transform='translateX('+Math.max(-58,Math.min(58,dx))+'px)';
   }
  },{passive:false});
  button.addEventListener('pointerup',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   const horizontal=drag.horizontal||Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.4;
   const strike=!drag.vertical&&Math.abs(dx)>=44&&Math.abs(dx)>Math.abs(dy)*1.4;
   if(horizontal||drag.vertical){suppressUntil=Date.now()+400;if(event.cancelable)event.preventDefault()}
   const pointer=drag.id;reset();try{button.releasePointerCapture(pointer)}catch{}
   if(strike&&!blocked())toggle();
  });
  button.addEventListener('pointercancel',reset);
  button.addEventListener('lostpointercapture',reset);
  button.addEventListener('click',event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation()}},true);
  button.addEventListener('keydown',event=>{if(event.key==='Delete'&&!blocked()){event.preventDefault();toggle()}});
 }
 root.MFStrike={bind};
})(typeof globalThis!=='undefined'?globalThis:this);
