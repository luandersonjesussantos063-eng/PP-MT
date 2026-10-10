export function packExam(run){
 if(!run)return null;
 return {version:1,ids:run.questions.map(q=>q.id),answers:{...run.answers},index:run.index,deadline:run.deadline,originTab:run.originTab||'simulados',label:run.label||'Simulado',strikes:run.strikes||{},assists:run.assists||{},guided:!!run.guided,missionDay:run.missionDay,quotaGranted:run.quotaGranted===true};
}
export function restoreExam(saved,bank){
 if(!saved||saved.version!==1||!Array.isArray(saved.ids)||!saved.ids.length||saved.ids.length>5000||new Set(saved.ids).size!==saved.ids.length||!Number.isInteger(saved.index)||saved.index<0||saved.index>=saved.ids.length||!Number.isFinite(saved.deadline))return null;
 const byId=new Map(bank.map(q=>[q.id,q])),questions=saved.ids.map(id=>byId.get(id));if(questions.some(q=>!q))return null;
 const answers={};for(const q of questions){const selected=saved.answers?.[q.id];if(selected!==undefined){if(!Number.isInteger(selected)||selected<0||selected>=q.options.length)return null;answers[q.id]=selected}}
 return {...saved,questions,answers,originTab:['simulados','provas','missao'].includes(saved.originTab)?saved.originTab:'simulados',strikes:saved.strikes||{},assists:saved.assists||{}};
}
