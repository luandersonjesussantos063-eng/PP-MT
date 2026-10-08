import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {dailyStudyPlan} from '../curriculum.js';
import {createReviewExercise} from '../review-generator.js';
import {nextReview} from '../learning.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
function setup({scheduled=false,similar=false}={}){
 const elements=new Map(),$=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',addEventListener(t,fn){this[t]=fn}});return elements.get(id)};
 const questions=['a','b'].map(id=>({id,subject:'Português',topic:id,statement:id,options:['Certa','Errada'],answer:0}));
 const buttons=[0,1].map(i=>({dataset:{reviewAnswer:String(i)},getAttribute:()=>null,classList:{contains:()=>false}}));
 const store={attempts:[],program:{reviews:scheduled?{a:nextReview(null,false)}:{}}};
 const context=vm.createContext({reviewState:null,store,answerSounds:{play(){}},dailyStudyPlan,studyRemaining:()=>1800,localDay:()=> '2026-10-08',save:()=>true,createReviewExercise:q=>createReviewExercise(q,()=>0),bank:()=>questions,pendingErrorIds:()=>new Set(['a','b']),findSimilar:q=>similar?questions.find(x=>x.id!==q.id):null,$,document:{querySelectorAll:()=>buttons},window:{scrollTo(){}},title:(a,b)=>a+b,reviewLearnHTML:(q,i,n)=>`${q.id} ${i+1}/${n}`,manualStrikes:()=>[],supportHTML:()=>'',originalHTML:()=>'',explanationHTML:()=>'<p>Explicação</p>',esc:s=>s,markErrorMastered:(id,correct)=>{store.program.reviews[id]=nextReview(store.program.reviews[id],correct)}});
 vm.runInContext(app.slice(app.indexOf('function todayReviewIds('),app.indexOf('\nfunction stats()',app.indexOf('function todayReviewIds('))),context);
 context.renderErrorReview();return {context,$,store,buttons};
}
test('sem equivalente: exige resposta ao exercício gerado antes de avançar',()=>{
 const {context,$,store,buttons}=setup();
 $('#reviewTransfer').onclick();assert.equal(context.reviewState.originalId,'a');assert.equal(store.program.reviews.a,undefined);
 assert.match($('#content').innerHTML,/Treino criado pelo app/);
 buttons[0].onclick({preventDefault(){}});assert.equal(store.program.generatedReviews.length,1);assert.equal(store.attempts.length,0);
 $('#reviewNext').click();assert.equal(context.reviewState.originalId,'b');
 $('#reviewTransfer').onclick();buttons[1].onclick({preventDefault(){}});$('#reviewNext').click();assert.match($('#content').innerHTML,/Revisão concluída/);
});
test('revisão posterior: erro mostra correção e permite concluir sem repetir o primeiro item',()=>{
 const {context,$,store,buttons}=setup({scheduled:true,similar:true});
 buttons[1].onclick({preventDefault(){}});assert.equal(store.attempts.length,1);assert.equal(store.attempts[0].correct,false);assert.match($('#content').innerHTML,/Entender a resposta/);
 $('#reviewNext').click();assert.equal(context.reviewState.originalId,'b');
});
test('questão relacionada: acerto é registrado uma vez e próxima avança a fila',()=>{
 const {context,$,store,buttons}=setup({similar:true});
 $('#reviewTransfer').onclick();buttons[0].onclick({preventDefault(){}});buttons[0].onclick({preventDefault(){}});
 assert.equal(store.attempts.length,1);assert.equal(store.program.reviews.a.correct,true);$('#reviewNext').click();assert.equal(context.reviewState.originalId,'b');
});
