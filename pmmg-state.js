export function migratePMMGState(state){
 if(!state||typeof state!=='object')return state;
 if(state.contest==='PMMG')return state;
 const program=state.program||{};
 const keep=['profile','routine','dailyGoalMinutes','answerSound'];
 const preferences=Object.fromEntries(keep.filter(k=>Object.hasOwn(program,k)).map(k=>[k,program[k]]));
 return {contest:'PMMG',attempts:[],favorites:[],custom:[],sessions:[],program:preferences,legacyPPMT:state,updatedAt:new Date().toISOString()};
}
