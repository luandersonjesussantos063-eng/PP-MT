import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac,webcrypto} from 'node:crypto';
import {webhookHandler} from '../supabase/functions/ppmt-monthly-webhook/logic.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
import {makeHandler,CENT,SELLER,exactPayment} from '../supabase/functions/ppmt-centavo-premium/logic.js';
import {makePracticeHandler} from '../supabase/functions/ppmt-premium-practice/logic.js';
const USER={id:'33333333-3333-4333-8333-333333333333',email:'tester@example.org',
 email_confirmed_at:'2026-10-10T00:00:00Z',is_anonymous:false};
const ORDER='11111111-1111-4111-8111-111111111111';
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const mkRequest=action=>new Request('https://example.invalid/functions/v1/ppmt-centavo-premium',{
 method:'POST',headers:{Origin:ORIGIN,Authorization:'Bearer local-test-only', 'Content-Type':'application/json'},
 body:JSON.stringify({action})
});
function mock({allowed=true,enabled=true}={}){
 let row=null,mpCalls=[],created=0,approved=0,revoked=0;
 let providerStatus='pending',amount=0.01;
 const payment=()=>({id:'123456789',live_mode:true,collector_id:SELLER,
  transaction_amount:amount,currency_id:'BRL',payment_method_id:'pix',
  external_reference:ORDER,status:providerStatus,date_approved:new Date().toISOString(),
  transaction_amount_refunded:providerStatus==='refunded'?0.01:0,
  point_of_interaction:{transaction_data:{qr_code:'0002012658mock-qr-code-123456789',ticket_url:'https://www.mercadopago.com.br/pix/mock'}}
 });
 const db={
  isTester:async()=>allowed,enabled:async()=>enabled,token:async()=>'NOT_A_REAL_TOKEN',
  get:async()=>row&&({...row}),
  claim:async()=>{
   if(row)return null;
   row={id:ORDER,user_id:USER.id,state:'creating',provider_payment_id:null,premium_until:null};
   return {...row};
  },
  update:async(id,fields)=>{assert.equal(id,ORDER);Object.assign(row,fields);},
  approve:async(id,paymentId)=>{
   assert.equal(id,ORDER);assert.equal(paymentId,'123456789');
   if(['creating','pending','needs_review'].includes(row.state)){
    approved++;row.state='approved';row.premium_until=new Date(Date.now()+24*3600000).toISOString();
   }
  },
  revoke:async()=>{revoked++;row.state='refunded';row.premium_until=null;}
 };
 const mp=async(token,path,method,body,key)=>{
  assert.equal(token,'NOT_A_REAL_TOKEN');
  mpCalls.push({path,method,body,key});
  if(path==='/users/me')return{id:SELLER,site_id:'MLB',tags:[]};
  if(path==='/v1/payments'&&method==='POST'){
   assert.equal(body.transaction_amount,0.01);
   assert.equal(body.payment_method_id,'pix');
   assert.equal(body.external_reference,ORDER);
   assert.equal(body.payer.email,USER.email);
   assert.equal(key,ORDER);
   created++;return payment();
  }
  if(path==='/v1/payments/123456789'&&method==='GET')return payment();
  throw Error('Unexpected provider request '+path);
 };
 const handler=makeHandler({authenticate:async()=>USER,db,mp});
 return {
  handler,db,
  setProviderStatus:state=>{providerStatus=state;},
  setAmount:value=>{amount=value;},
  get state(){return{row,created,approved,revoked,mpCalls}},
  practice:makePracticeHandler({authenticate:async()=>USER,db:{
   member:async()=>row?.state==='approved'?{status:'active',current_period_end:row.premium_until}:null,
   summary:async()=>({total_questions:31,answered:0}),
   next:async()=>({id:'mt-premium-test-001',subject:'Direito Penal',topic:'Estudo',
    statement:'Questao ilustrativa: selecione a alternativa B.',options:['A','B','C']}),
   get:async()=>({id:'mt-premium-test-001',active:true,options:['A','B','C'],
    answer_index:1,explanation:'A opção correta é B.'}),
   record:async()=>{}
  }})
 };
}
const practiceRequest=action=>new Request('https://example.invalid/functions/v1/ppmt-premium-practice',{
 method:'POST',headers:{Origin:ORIGIN,Authorization:'Bearer local-test-only','Content-Type':'application/json'},
 body:JSON.stringify({action})
});
test('um centavo libera Premium de teste somente após pagamento verificado e expira',async()=>{
 const m=mock();
 assert.equal((await m.practice(practiceRequest('next'))).status,402);
 let r=await m.handler(mkRequest('check'));
 assert.equal((await r.json()).enabled,true);
 r=await m.handler(mkRequest('create'));
 assert.equal(r.status,200);
 let result=await r.json();
 assert.equal(result.amount,CENT);assert.equal(result.state,'pending');
 assert.equal(result.premium_test_active,false);
 assert.equal(m.state.created,1);
 assert.equal((await m.practice(practiceRequest('next'))).status,402);
 m.setProviderStatus('approved');
 r=await m.handler(mkRequest('status'));result=await r.json();
 assert.equal(r.status,200);assert.equal(result.premium_test_active,true);
 assert.equal(m.state.approved,1);
 const expires=Date.parse(result.premium_until);
 assert.ok(expires>Date.now()+23*3600000&&expires<Date.now()+25*3600000);
 const question=await m.practice(practiceRequest('next'));
 assert.equal(question.status,200);
 assert.equal((await question.json()).question.answer_index,undefined);
 await m.handler(mkRequest('status'));
 assert.equal(m.state.approved,1,'repetir consulta não gera horas extras');
 assert.equal(m.state.created,1,'nova consulta não gera outro Pix');
 await m.handler(mkRequest('create'));
 assert.equal(m.state.created,1,'não é permitido cobrar duas vezes');
 m.state.row.premium_until=new Date(Date.now()-1000).toISOString();
 assert.equal((await m.practice(practiceRequest('next'))).status,402);
});
test('estorno Pix de 1 centavo cancela a liberação Premium de teste',async()=>{
 const m=mock();await m.handler(mkRequest('create'));
 m.setProviderStatus('approved');await m.handler(mkRequest('status'));
 assert.equal((await m.practice(practiceRequest('next'))).status,200);
 m.setProviderStatus('refunded');const r=await m.handler(mkRequest('status'));
 assert.equal(r.status,200);
 assert.equal((await r.json()).premium_test_active,false);
 assert.equal(m.state.revoked,1);
 assert.equal((await m.practice(practiceRequest('next'))).status,402);
});
test('contas não autorizadas nunca conseguem criar Pix',async()=>{
 const m=mock({allowed:false});
 const r=await m.handler(mkRequest('create'));
 assert.equal(r.status,403);assert.equal(m.state.mpCalls.length,0);
});
test('Pix adulterado não libera Premium',async()=>{
 const m=mock();await m.handler(mkRequest('create'));
 m.setProviderStatus('approved');m.setAmount(0.02);
 const r=await m.handler(mkRequest('status'));
 assert.equal(r.status,502);assert.equal(m.state.approved,0);
 assert.equal((await m.practice(practiceRequest('next'))).status,402);
});
test('página de teste e servidor não alteram preço mensal de R$19,99',()=>{
 assert.equal(CENT,0.01);
 const official=readFileSync(new URL('../supabase/functions/ppmt-monthly-billing/logic.js',import.meta.url),'utf8');
 const billingHtml=readFileSync(new URL('../planos/assinar.html',import.meta.url),'utf8');
 const pilotHtml=readFileSync(new URL('../planos/piloto-centavo.html',import.meta.url),'utf8');
 const premiumBackend=readFileSync(new URL('../supabase/functions/ppmt-premium-practice/index.ts',import.meta.url),'utf8');
 assert.match(official,/AMOUNT=19\.99/);
 assert.match(billingHtml,/R\$ 19,99/);
 assert.match(pilotHtml,/R\$ 0,01/);
 assert.match(premiumBackend,/billing_sandbox_testers/);
 assert.match(premiumBackend,/ppmt_centavo_premium_orders/);
});
test('chaves de produção permanecem somente no Supabase, acesso público não existe',()=>{
 const page=readFileSync(new URL('../planos/piloto-centavo.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../planos/piloto-centavo.html',import.meta.url),'utf8');
 const sql=readFileSync(new URL('../database/premium-centavo-pilot.sql',import.meta.url),'utf8');
 assert.doesNotMatch(page+html,/MP_ACCESS_TOKEN_PROD|SUPABASE_SERVICE_ROLE_KEY|APP_USR-/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.ppmt_centavo_premium_orders from public,anon,authenticated/);
 assert.match(sql,/premium_until=now\(\)\+interval '24 hours'/);
 assert.ok(exactPayment({id:'123456',live_mode:true,collector_id:SELLER,
  transaction_amount:0.01,currency_id:'BRL',payment_method_id:'pix',
  external_reference:ORDER},{provider_payment_id:'123456',id:ORDER}));
});

test('webhook REAL valida assinatura HMAC e pagamento de 1 centavo via API antes de ativar teste',async()=>{
 const secret='LOCAL_TEST_ONLY_SECRET',id='123456789',reqId='cent-2026';
 const ts=String(Math.floor(Date.now()/1000));
 const sign=(key)=>'ts='+ts+',v1='+createHmac('sha256',key)
  .update('id:'+id+';request-id:'+reqId+';ts:'+ts+';').digest('hex');
 let grants=0,revokes=0,providerQueries=0;
 let state='approved';
 const mp=async(_token,path)=>{
  providerQueries++;
  assert.equal(path,'/v1/payments/'+id);
  return {id,live_mode:true,collector_id:SELLER,transaction_amount:0.01,
   currency_id:'BRL',payment_method_id:'pix',external_reference:ORDER,
   date_approved:new Date().toISOString(),status:state,
   transaction_amount_refunded:state==='refunded'?0.01:0};
 };
 const db={
  centavoByPayment:async providerId=>{
   assert.equal(providerId,id);return{id:ORDER,provider_payment_id:id};
  },
  approveCentavo:async()=>{grants++;},
  revokeCentavo:async()=>{revokes++;}
 };
 const handler=webhookHandler({secret:async()=>secret,token:async()=>'LOCAL_FAKE_MP',
  db,mp});
 const url='https://example.invalid/functions/v1/ppmt-monthly-webhook?data.id='+id+'&type=payment';
 const req=(key)=>new Request(url,{method:'POST',headers:{
  'content-type':'application/json','x-request-id':reqId,'x-signature':sign(key)},
  body:JSON.stringify({type:'payment',action:'payment.updated',data:{id},
   id,user_id:SELLER,live_mode:true})
 });
 const originalWarn=console.warn;console.warn=()=>{};
 try{assert.equal((await handler(req('WRONG_SECRET'))).status,401);}
 finally{console.warn=originalWarn;}
 assert.equal(providerQueries,0);assert.equal(grants,0);
 assert.equal((await handler(req(secret))).status,200);
 assert.equal(grants,1);
 state='refunded';
 assert.equal((await handler(req(secret))).status,200);
 assert.equal(revokes,1);
});
