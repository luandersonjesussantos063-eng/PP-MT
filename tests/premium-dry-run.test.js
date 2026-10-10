// Teste integral em memória: NÃO acessa Mercado Pago, Supabase nem produz cobranças.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {makeHandler as makeBilling,AMOUNT,SELLER,ORIGIN} from '../supabase/functions/ppmt-monthly-billing/logic.js';
import {webhookHandler as makeWebhook} from '../supabase/functions/ppmt-monthly-webhook/logic.js';
import {makePracticeHandler} from '../supabase/functions/ppmt-premium-practice/logic.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;

const USER={id:'33333333-3333-4333-8333-333333333333',email:'aluno@example.org',
 email_confirmed_at:'2026-10-10T00:00:00Z',is_anonymous:false};
const ORDER='22222222-2222-4222-8222-222222222222';
const PAYMENT='9876543219876';
const SECRET='LOCAL_ONLY_MOCK_WEBHOOK_SECRET';
const QUESTION='mt-premium-dry-run-0001';
const month=30*86400000;
const apiUrl='https://example.invalid/functions/v1/ppmt-monthly-webhook?data.id='+PAYMENT+'&type=payment';

function fixtures(){
 let member=null,order=null,payment={
  id:PAYMENT,live_mode:true,collector_id:SELLER,transaction_amount:AMOUNT,
  currency_id:'BRL',external_reference:ORDER,date_approved:new Date().toISOString(),
  status:'approved',transaction_amount_refunded:0
 };
 let credited=0,voided=0,externalCalls=0;
 const recorded=new Set(),attempts=[];
 const db={
  enabled:async()=>true, privatePilot:async()=>false,token:async()=>'LOCAL_FAKE_TOKEN',
  member:async()=>member,card:async()=>null,openOrder:async()=>order,
  claimOrder:async()=>{
   if(order)return null;
   order={id:ORDER,user_id:USER.id,state:'creating',
    expires_at:new Date(Date.now()+600000).toISOString()};
   return {...order};
  },
  updateOrder:async(id,fields)=>{assert.equal(id,ORDER);Object.assign(order,fields);},
  orderById:async(id)=>id===ORDER?order:null,
  credit:async(userId,p,source,reference)=>{
   assert.equal(userId,USER.id);assert.equal(source,'manual');assert.equal(reference,ORDER);
   if(recorded.has(String(p.id)))return;
   recorded.add(String(p.id));credited++;
   member={status:'active',current_period_end:new Date(Date.now()+month).toISOString()};
  },
  void:async(id)=>{
   if(recorded.delete(String(id))) {voided++;member=null;}
  }
 };
 const mp=async(_token,path,method,body)=>{
  externalCalls++;
  if(path==='/users/me')return {id:SELLER,site_id:'MLB',tags:[]};
  if(path==='/checkout/preferences'&&method==='POST'){
   assert.equal(body.items[0].unit_price,19.99);
   assert.equal(body.external_reference,ORDER);
   return {id:'pref-mock-only',init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=simulado'};
  }
  if(path.startsWith('/v1/payments/search'))return {results:order?.state==='paid'?[{id:PAYMENT}]:[]};
  if(path==='/v1/payments/'+PAYMENT)return {...payment};
  throw Error('Rota Mercado Pago nao simulada: '+path);
 };
 const bill=makeBilling({authenticate:async()=>USER,db,mp});
 const hook=makeWebhook({
  secret:async()=>SECRET,token:async()=>'LOCAL_FAKE_TOKEN',db,mp
 });
 const practice=makePracticeHandler({
  authenticate:async()=>USER,
  db:{
   member:async()=>member,
   summary:async()=>({total_questions:31,answered:attempts.length}),
   next:async()=>({id:QUESTION,subject:'Direito Penal',topic:'Questão simulada',
    statement:'Qual opção está correta no teste?',options:['Opção A','Opção B','Opção C']}),
   get:async(id)=>id===QUESTION?{id,active:true,options:['Opção A','Opção B','Opção C'],
    answer_index:1,explanation:'Explicação de teste, sem conteúdo real.'}:null,
   record:async(userId,id,selection,correct)=>{
    assert.equal(userId,USER.id);attempts.push({id,selection,correct});
   }
  }
 });
 const billingRequest=action=>new Request('https://example.invalid/functions/v1/ppmt-monthly-billing',{
  method:'POST',headers:{Origin:ORIGIN,Authorization:'Bearer LOCAL_FAKE_JWT','Content-Type':'application/json'},
  body:JSON.stringify({action})
 });
 const practiceRequest=(action,rest={})=>new Request('https://example.invalid/functions/v1/ppmt-premium-practice',{
  method:'POST',headers:{Origin:ORIGIN,Authorization:'Bearer LOCAL_FAKE_JWT','Content-Type':'application/json'},
  body:JSON.stringify({action,...rest})
 });
 const signedWebhook=(overrides={},goodSignature=true)=>{
  const id=PAYMENT,reqId='test-local-'+Math.floor(Date.now()/1000);
  const ts=String(Math.floor(Date.now()/1000));
  const manifest='id:'+id+';request-id:'+reqId+';ts:'+ts+';';
  const hmac=createHmac('sha256',goodSignature?SECRET:'WRONG_FAKE_SECRET').update(manifest).digest('hex');
  return new Request(apiUrl,{
   method:'POST',headers:{'Content-Type':'application/json','x-request-id':reqId,'x-signature':'ts='+ts+',v1='+hmac},
   body:JSON.stringify({type:'payment',action:'payment.updated',data:{id},id,
    user_id:SELLER,live_mode:true,...overrides})
  });
 };
 return {
  bill,hook,practice,billingRequest,practiceRequest,signedWebhook,
  setExpiry:d=>{member={status:'active',current_period_end:d};},
  setPayment:p=>{payment={...payment,...p};},
  get state(){return {member,order,credited,voided,externalCalls,attempts:[...attempts]};}
 };
}

test('ciclo sem cobrança: bloqueado, checkout fictício, webhook HMAC, Premium, gabarito e vencimento',async()=>{
 const f=fixtures();
 let response=await f.practice(f.practiceRequest('next'));
 assert.equal(response.status,402,'Acesso livre não revela conteúdo Premium');
 response=await f.bill(f.billingRequest('manual_checkout'));
 assert.equal(response.status,200);
 const checkout=await response.json();
 assert.equal(checkout.price,19.99);
 assert.equal(checkout.manual.state,'pending');
 assert.equal(f.state.member,null,'checkout ainda não libera plano');
 response=await f.practice(f.practiceRequest('status'));
 assert.equal((await response.json()).premium,false);
 response=await f.hook(f.signedWebhook());
 assert.equal(response.status,200,'Webhook de pagamento simulado e assinado processado');
 assert.equal(f.state.credited,1);
 assert.equal(f.state.member.status,'active');
 response=await f.practice(f.practiceRequest('status'));
 assert.equal(response.status,200);
 const status=await response.json();
 assert.equal(status.premium,true);
 assert.equal(status.total_questions,31);
 response=await f.practice(f.practiceRequest('next'));
 assert.equal(response.status,200);
 const question=await response.json();
 assert.equal(question.question.id,QUESTION);
 assert.equal(question.question.answer_index,undefined,'gabarito não vaza antes de responder');
 assert.equal(question.question.explanation,undefined);
 response=await f.practice(f.practiceRequest('answer',{id:QUESTION,selected_index:1}));
 assert.equal(response.status,200);
 const answer=await response.json();
 assert.equal(answer.correct,true);
 assert.equal(answer.answer_index,1);
 assert.equal(f.state.attempts.length,1);
 response=await f.bill(f.billingRequest('status'));
 assert.equal(response.status,200);
 assert.equal((await response.json()).premium,true);
 f.setExpiry(new Date(Date.now()-60000).toISOString());
 response=await f.practice(f.practiceRequest('next'));
 assert.equal(response.status,402,'vencimento bloqueia treino Premium');
 assert.equal((await response.json()).premium,false);
 assert.ok(f.state.externalCalls>0,'consultas MP são somente chamadas mocks em memória');
});

test('webhook simulado duplicado não duplica crédito, assinado incorretamente retorna 401',async()=>{
 const f=fixtures();
 await f.bill(f.billingRequest('manual_checkout'));
 const warn=console.warn;console.warn=()=>{};
 try{
  assert.equal((await f.hook(f.signedWebhook({},false))).status,401);
 }finally{console.warn=warn;}
 assert.equal(f.state.credited,0);
 assert.equal((await f.hook(f.signedWebhook())).status,200);
 assert.equal((await f.hook(f.signedWebhook())).status,200);
 assert.equal(f.state.credited,1,'notificação duplicada não concede dois meses');
 const invalid=await f.hook(f.signedWebhook({user_id:11111}));
 assert.equal(invalid.status,400);
 assert.equal(f.state.credited,1);
});

test('estorno simulado revoga o acesso e nenhuma credencial real é utilizada',async()=>{
 const f=fixtures();
 await f.bill(f.billingRequest('manual_checkout'));
 assert.equal((await f.hook(f.signedWebhook())).status,200);
 assert.equal(f.state.credited,1);
 f.setPayment({status:'refunded',transaction_amount_refunded:19.99});
 assert.equal((await f.hook(f.signedWebhook())).status,200);
 assert.equal(f.state.voided,1);
 assert.equal((await f.practice(f.practiceRequest('next'))).status,402);
});
