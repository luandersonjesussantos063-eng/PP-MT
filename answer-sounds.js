export function createAnswerSounds({enabled=()=>true,makeAudio=url=>new Audio(url)}={}){
 const clips={correct:makeAudio(new URL('./assets/audio/correct.wav?v=45',import.meta.url).href),wrong:makeAudio(new URL('./assets/audio/wrong.wav?v=45',import.meta.url).href)};
 for(const clip of Object.values(clips))clip.preload='auto';
 function stop(){for(const clip of Object.values(clips)){try{clip.pause();clip.currentTime=0}catch{}}}
 function play(correct){
  stop();if(!enabled())return;
  // Called directly by the answer click/key handler so mobile playback has user activation.
  try{const pending=clips[correct?'correct':'wrong'].play();pending?.catch?.(()=>{})}catch{}
 }
 return {play,stop};
}
