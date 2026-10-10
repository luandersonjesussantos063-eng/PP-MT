// Teste ponta a ponta somente EM MEMÓRIA: nenhuma rede, credencial, cobrança ou escrita Supabase.
// Executa os manipuladores reais de webhook, status de mensalidade e exercícios Premium
// com provedor Mercado Pago e banco falsos. NÃO testa liquidação financeira verdadeira.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {webhookHandler,SELLER,AMOUNT} from '../supabase/functions/ppmt-monthly-webhook/logic.js';
import {makePracticeHandler} from '../supabase/functions/ppmt-premium-practice/logic.js';
import {makeHandler as makeBillingHandler} from '../supabase/functions/ppmt-monthly-billing/logic.js';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ACCOUNT='33333333-3333-4333-8333-333333333333';
const OTHER='44444444-4444-4444-8444-444444444444';
const ORDER='55555555-5555-4555-8555-555555555555';
const PAYMENT_ID='999876543210';
const SECRET='HMAC_LOCAL_FICTICIO_NUNCA_USAR_EM_PRODUCAO';
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const question={
 id:'mt-premium-simulacao-0001',subject:'Direito Penal',topic:'Simulação isolada',
 statement:'Esta questão existe somente no teste automatizado, fora do Supabase. Qual opção é correta?',
 options:['Opção simulada A','Opção simulada B','Opção simulada C','Opção simulada D'],
 answer_index:1, explanation:'Resposta simulada, jamais publicada como questão oficial.',active:true
};
function harness({status='approved',amount=AMOUNT,buyer=ACCOUNT}={}){
 const s={credits:0, attempts:[],paidIds:new Set(), membership:null,orderState:'pending',
         providerReads:[], providerWrites:0};
 const mpPayment={
  id:PAYMENT_ID,live_mode:true,collector_id:SELLER,
  transaction_amount:amount,currency_id:'BRL',external_reference:ORDER,
  status,transaction_amount_refunded:0,date_approved:new Date().toISOString()
 };
 const billingDb={
  async enabled(){return false;},async privatePilot(){return false;},
  async token(){return null;},async member(id){return id===buyer?s.membership:null;}
 };
 const webhookDb={
  async orderById(ref){return ref===ORDER?{id:ORDER,user_id:buyer,provider_preference_id:'pref_mock_only'}:null;},
  async credit(id,payment,source,ref){
   assert.equal(source,'manual');assert.equal(ref,ORDER);assert.equal(id,buyer);
   // Simula o UNIQUE por origem e pagamento do banco, sem alterá-lo.
   if(s.paidIds.has(payment.id))return;
   s.paidIds.add(payment.id);s.credits++;
   s.membership={status:'active',current_period_end:new Date(Date.now()+30*86400*1000).toISOString()};
  },
  async updateOrder(id,fields){assert.equal(id,ORDER);s.orderState=fields.state;},
  async void(){throw Error('Estorno não esperado neste ensaio');}
 };
 const webhook=webhookHandler({
  secret:async()=>SECRET, token:async()=>'FAKE_LOCAL_TOKEN',
  db:webhookDb,
  async mp(_token,path){
   s.providerReads.push(path);
   assert.equal(path,'/v1/payments/'+PAYMENT_ID);
   return mpPayment; // resposta local; NÃO chama a API do Mercado Pago.
  }
 });
 const practice=makePracticeHandler({
  authenticate:async jwt=>jwt==='DRY_RUN_USER'?{id:buyer,email_confirmed_at:new Date().toISOString(),is_anonymous:false}:
   jwt==='DRY_RUN_OTHER'?{id:OTHER,email_confirmed_at:new Date().toISOString(),is_anonymous:false}:null,
  db:{
   async member(id){return id===buyer?s.membership:null;},
   async summary(){return {total_questions:31,answered:s.attempts.length};},
   async next(){return question;},
   async get(id){return id===question.id?question:null;},
   async record(id,qid,selection,correct){s.attempts.push({id,qid,selection,correct});}
  }
 });
 const billing=makeBillingHandler({
  authenticate:async()=>({id:buyer,email:'teste@exemplo.org',email_confirmed_at:new Date().toISOString(),is_anonymous:false}),
  db:billingDb,
  async mp(){s.providerWrites++;throw Error('Chamadas reais de cobrança são proibidas no teste');}
 });
 function hookReq({validSignature=true}={}){
  const ts=String(Math.floor(Date.now()/1000)),requestId='teste-local-isolado';
  const manifest='id:'+PAYMENT_ID+';request-id:'+requestId+';ts:'+ts+';';
  const digest=createHmac('sha256',SECRET).update(manifest).digest('hex');
  const headers={'content-type':'application/json','x-request-id':requestId,
   'x-signature':'ts='+ts+',v1='+(validSignature?digest:'0'.repeat(64))};
  return new Request('https://supabase.invalid/functions/v1/ppmt-monthly-webhook?data.id='+PAYMENT_ID+'&type=payment',{
   method:'POST',headers,
   body:JSON.stringify({action:'payment.updated',type:'payment',data:{id:PAYMENT_ID},live_mode:true,user_id:SELLER})
  });
 }
 const exerciseReq=(action,details={},other=false)=>new Request('https://supabase.invalid/functions/v1/ppmt-premium-practice',{
  method:'POST',headers:{origin:ORIGIN,authorization:'Bearer '+(other?'DRY_RUN_OTHER':'DRY_RUN_USER'),'content-type':'application/json'},
  body:JSON.stringify({action,...details})
 });
 const billingReq=()=>new Request('https://supabase.invalid/functions/v1/ppmt-monthly-billing',{
  method:'POST',headers:{origin:ORIGIN,authorization:'Bearer TESTE_LOCAL','content-type':'application/json'},
  body:JSON.stringify({action:'status'})
 });
 return {s,webhook,practice,billing,hookReq,exerciseReq,billingReq};
}

test('ensaio completo sem cobrança: pagamento mock aprovado, Premium liberado só no mock, questão corrigida',async()=>{
 const h=harness();
 const before=await h.practice(h.exerciseReq('next'));
 assert.equal(before.status,402,'aluno sem mensalidade não acessa questões');
 const statusBefore=await h.billing(h.billingReq());
 assert.equal((await statusBefore.json()).premium,false);
 const paid=await h.webhook(h.hookReq());
 assert.equal(paid.status,200,'webhook de pagamento mock retorna 200');
 assert.equal(h.s.credits,1);
 assert.equal(h.s.orderState,'paid');
 assert.deepEqual(h.s.providerReads,['/v1/payments/'+PAYMENT_ID]);
 assert.equal(h.s.providerWrites,0,'nenhuma criação de cobrança foi realizada');
 const statusAfter=await h.billing(h.billingReq());
 assert.equal((await statusAfter.json()).premium,true);
 const premiumStatus=await h.practice(h.exerciseReq('status'));
 const statusData=await premiumStatus.json();
 assert.equal(statusData.state,'active');assert.equal(statusData.total_questions,31);
 const next=await h.practice(h.exerciseReq('next'));
 const item=await next.json();
 assert.equal(item.state,'question');
 assert.equal(item.question.id,question.id);
 assert.equal(item.question.answer_index,undefined,'gabarito fica oculto');
 assert.equal(item.question.explanation,undefined,'explicação fica oculta');
 const answer=await h.practice(h.exerciseReq('answer',{id:question.id,selected_index:1}));
 const corrected=await answer.json();
 assert.equal(corrected.correct,true);
 assert.equal(corrected.answer_index,1);
 assert.equal(h.s.attempts.length,1);
 const another=await h.practice(h.exerciseReq('next',{},true));
 assert.equal(another.status,402,'outros usuários não ganham Premium');
});
test('ensaio sem cobrança: webhook duplicado não libera mais de um mês',async()=>{
 const h=harness();
 assert.equal((await h.webhook(h.hookReq())).status,200);
 const expiry=h.s.membership.current_period_end;
 assert.equal((await h.webhook(h.hookReq())).status,200);
 assert.equal(h.s.credits,1);
 assert.equal(h.s.membership.current_period_end,expiry);
});
test('ensaio sem cobrança: pagamento pendente ou valor errado não libera Premium',async()=>{
 for(const opts of [{status:'pending'},{amount:18.99}]){
  const h=harness(opts);
  assert.equal((await h.webhook(h.hookReq())).status,200);
  assert.equal(h.s.credits,0);
  assert.equal(h.s.membership,null);
  assert.equal((await h.practice(h.exerciseReq('next'))).status,402);
 }
});
test('ensaio sem cobrança: HMAC inválido é rejeitado antes de consultar MP',async()=>{
 const h=harness();
 const oldWarn=console.warn;console.warn=()=>{};
 try{assert.equal((await h.webhook(h.hookReq({validSignature:false}))).status,401);}
 finally{console.warn=oldWarn;}
 assert.deepEqual(h.s.providerReads,[]);
 assert.equal(h.s.credits,0);
 assert.equal(h.s.membership,null);
});
