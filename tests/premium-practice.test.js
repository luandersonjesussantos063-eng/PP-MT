import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makePracticeHandler,paidMembership} from '../supabase/functions/ppmt-premium-practice/logic.js';

const req=(action,body={})=>new Request('https://example.supabase.co/functions/v1/ppmt-premium-practice',{
 method:'POST',headers:{origin:'https://luandersonjesussantos063-eng.github.io',authorization:'Bearer example'},
 body:JSON.stringify({action,...body})
});
const question={
 id:'mt-premium-0001',subject:'Direito Constitucional',topic:'Liberdade',
 statement:'Enunciado exclusivo original em formato de questão?',
 options:['A','B','C','D'],answer_index:1,
 explanation:'O conteúdo é corrigido somente pelo servidor, depois que o aluno responde.',
 active:true
};
function setup({member=true,auth=true}={}){
 const calls=[];const records=[];
 const db={
  async member(userId){calls.push('membership');return member?{status:'active',current_period_end:new Date(Date.now()+86400000).toISOString()}:null;},
  async summary(){calls.push('summary');return {total_questions:31,answered:records.length};},
  async next(){calls.push('next');return question;},
  async get(id){calls.push('get');return id===question.id?question:null;},
  async record(id,qid,selection,correct){records.push({id,qid,selection,correct});}
 };
 return {handler:makePracticeHandler({authenticate:async()=>auth?{id:'u',email_confirmed_at:new Date().toISOString()}:null,db}),calls,records};
}
test('consulta de pessoa não pagante não acessa o acervo e não revela gabarito',async()=>{
 const h=setup({member:false});
 const res=await h.handler(req('next'));
 assert.equal(res.status,402);
 const data=await res.json();
 assert.equal(data.premium,false);
 assert.deepEqual(h.calls,['membership']);
 assert.equal(JSON.stringify(data).includes(question.statement),false);
});
test('usuário sem login nunca consulta banco de perguntas',async()=>{
 const h=setup({auth:false});
 assert.equal((await h.handler(req('next'))).status,401);
 assert.deepEqual(h.calls,[]);
});
test('estado válido inclui expiração, não autoriza vencidos',()=>{
 assert.equal(paidMembership({status:'active',current_period_end:new Date(Date.now()+86400000).toISOString()}),true);
 assert.equal(paidMembership({status:'active',current_period_end:new Date(Date.now()-86400000).toISOString()}),false);
 assert.equal(paidMembership({status:'past_due',current_period_end:new Date(Date.now()+86400000).toISOString()}),false);
});
test('resposta de próxima questão oculta gabarito e explicação',async()=>{
 const h=setup();
 const res=await h.handler(req('next'));
 const data=await res.json();
 assert.equal(res.status,200);
 assert.equal(data.question.statement,question.statement);
 assert.equal('answer_index' in data.question,false);
 assert.equal('explanation' in data.question,false);
 assert.equal(h.calls.includes('get'),false);
});
test('envio de resposta grava resultado no servidor antes de revelar gabarito',async()=>{
 const h=setup();
 const res=await h.handler(req('answer',{id:question.id,selected_index:1}));
 const data=await res.json();
 assert.equal(res.status,200);
 assert.equal(data.correct,true);
 assert.equal(data.answer_index,1);
 assert.match(data.explanation,/servidor/);
 assert.equal(h.records.length,1);
 assert.equal(h.records[0].correct,true);
});
test('página paga não inclui respostas, chaves privadas ou acervo protegido',()=>{
 const h=readFileSync(new URL('../planos/premium.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../planos/premium.js',import.meta.url),'utf8');
 const auth=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
 assert.match(h,/Central Tática|Questões comentadas|CENTRAL TÁTICA/i);
 assert.match(js,/runPremiumPractice/);
 assert.doesNotMatch(h+js+auth,/SUPABASE_SERVICE_ROLE_KEY|answer_index:1|MP_ACCESS_TOKEN_PROD/);
 assert.match(readFileSync(new URL('../database/premium-content.sql',import.meta.url),'utf8'),/revoke all.*authenticated/);
});
test('malformados e origens indevidas não dão acesso',async()=>{
 const h=setup();
 const r=await h.handler(req('answer',{id:'../../../config',selected_index:1}));
 assert.equal(r.status,400);
 const reqBad=new Request('https://ex.invalid',{method:'POST',headers:{origin:'https://malicious.example',authorization:'Bearer example'},body:'{"action":"next"}'});
 assert.equal((await h.handler(reqBad)).status,403);
});
