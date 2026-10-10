import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createHandler,isSandboxBuyerEmail,checkoutUrl,assertSeller,
  assertSubscription,approvedTestPayment,SELLER,BUYER,PRICE
} from '../supabase/functions/ppmt-billing-test/logic.js';

const origin='https://luandersonjesussantos063-eng.github.io';
const req=(action,options={})=>new Request(
  'https://example.supabase.co/functions/v1/ppmt-billing-test',{
    method:'POST',
    headers:{Origin:options.origin??origin,Authorization:options.authorization??'Bearer user-jwt','Content-Type':'application/json'},
    body:JSON.stringify({...options.body,action})
  });
function testHandler(overrides={}){
  let calls=[];
  let row=null;
  const reference='00000000-0000-4000-8000-000000000123';
  const subscription=()=>({
    id:'test-sub-123',external_reference:reference,
    collector_id:SELLER, status:'pending',
    auto_recurring:{transaction_amount:PRICE,currency_id:'BRL',frequency:1,frequency_type:'months'},
    init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=test-sub-123'
  });
  const db={
    async isTester(){return true;},
    async get(){return row;},
    async token(){return 'FAKE_FOR_UNIT_TEST_ONLY';},
    async claim(id){row={user_id:id,external_reference:reference,provider_id:null,state:'creating'};return row;},
    async update(id,patch){row={...row,...patch};}
  };
  const deps={
    db:{...db,...overrides.db},
    async authenticate(){return {id:'11111111-1111-4111-8111-111111111111',is_anonymous:false};},
    async mercado(token,path,method,body){
      calls.push({token,path,method,body});
      if(path==='/users/me')return {id:SELLER,site_id:'MLB',tags:['test_user']};
      if(path==='/preapproval'&&method==='POST')return subscription();
      if(path==='/preapproval/test-sub-123')return subscription();
      throw Error('unexpected mock request: '+path);
    }
  };
  return {handler:createHandler({...deps,...overrides}),calls};
}

test('somente e-mail de comprador de teste é aceito',()=>{
  assert.equal(isSandboxBuyerEmail('buyer@testuser.com'),true);
  for(const email of ['buyer@gmail.com','buyer@testuserXcom','buyer@testuser.com.br','buyer@testuser.com.evil','','buyer@testuser.com\\n']){
    assert.equal(isSandboxBuyerEmail(email),false,email);
  }
});

test('somente checkout oficial esperado pode ser mostrado',()=>{
  assert.ok(checkoutUrl('https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=abc'));
  for(const url of ['http://www.mercadopago.com.br/subscriptions/checkout','https://mercadopago.com.br/subscriptions/checkout','https://www.mercadopago.com.br.attacker.test/subscriptions/checkout','https://www.mercadopago.com.br/evil','javascript:alert(1)']){
    assert.equal(checkoutUrl(url),null,url);
  }
});

test('credencial Mercado Pago precisa ser vendedor de teste configurado',()=>{
  assert.doesNotThrow(()=>assertSeller({id:SELLER,site_id:'MLB',tags:['test_user']}));
  assert.throws(()=>assertSeller({id:SELLER,site_id:'MLB',tags:[]}));
  assert.throws(()=>assertSeller({id:SELLER+1,site_id:'MLB',tags:['test_user']}));
});

test('retornos da assinatura devem coincidir com preço e referência controlados pelo servidor',()=>{
 const row={external_reference:'ref123',provider_id:null};
 const subscription={id:'test',external_reference:'ref123',collector_id:SELLER,
 auto_recurring:{transaction_amount:PRICE,currency_id:'BRL',frequency:1,frequency_type:'months'},status:'pending'};
 assert.doesNotThrow(()=>assertSubscription(subscription,row));
 assert.throws(()=>assertSubscription({...subscription,auto_recurring:{...subscription.auto_recurring,transaction_amount:9.90}},row));
 assert.throws(()=>assertSubscription({...subscription,collector_id:0},row));
 assert.throws(()=>assertSubscription({...subscription,external_reference:'outra'},row));
 assert.throws(()=>assertSubscription({...subscription,status:'authorized',payer_id:99999},row));
});
test('aprovação de teste exige confirmação do pagador, vendedor, valor e live_mode falso',()=>{
 const good={live_mode:false,status:'approved',collector_id:SELLER,payer:{id:BUYER},transaction_amount:PRICE,currency_id:'BRL',transaction_amount_refunded:0};
 assert.equal(approvedTestPayment(good),true);
 assert.equal(approvedTestPayment({...good,live_mode:true}),false);
 assert.equal(approvedTestPayment({...good,payer:{id:0}}),false);
 assert.equal(approvedTestPayment({...good,status:'rejected'}),false);
});

test('sem login não executa operações no provedor',async()=>{
 const s=testHandler({authenticate:async()=>null});
 const result=await s.handler(req('create',{body:{payer_email:'buyer@testuser.com'}}));
 assert.equal(result.status,401);
 assert.equal(s.calls.length,0);
});

test('usuário não autorizado não executa operações no provedor',async()=>{
 const s=testHandler({db:{isTester:async()=>false}});
 const result=await s.handler(req('create',{body:{payer_email:'buyer@testuser.com'}}));
 assert.equal(result.status,403);
 assert.equal(s.calls.length,0);
});

test('bloqueia origens externas e pagamento com valor introduzido pelo visitante',async()=>{
 const s=testHandler();
 assert.equal((await s.handler(req('create',{origin:'https://evil.example',body:{payer_email:'buyer@testuser.com'}}))).status,403);
 const result=await s.handler(req('create',{body:{payer_email:'buyer@testuser.com',amount:1,user_id:'another-user'}}));
 assert.equal(result.status,200);
 assert.equal(s.calls.find(x=>x.path==='/preapproval'&&x.method==='POST').body.auto_recurring.transaction_amount,PRICE);
 assert.equal(s.calls.find(x=>x.path==='/preapproval'&&x.method==='POST').body.payer_email,'buyer@testuser.com');
 const data=await result.json();
 assert.equal(data.sandbox,true);
 assert.equal(data.payment_confirmed,false);
 assert.ok(data.checkout_url?.includes('mercadopago.com.br'));
 assert.equal(JSON.stringify(data).includes('FAKE_FOR_UNIT_TEST_ONLY'),false);
});

test('ação status sem assinatura não acessa o Mercado Pago',async()=>{
 const s=testHandler();
 const res=await s.handler(req('status'));
 assert.equal(res.status,200);
 assert.equal((await res.json()).state,'none');
 assert.equal(s.calls.length,0);
});

test('sem credencial de teste recusa checkout e não marca Premium',async()=>{
 const s=testHandler({db:{token:async()=>null}});
 const res=await s.handler(req('create',{body:{payer_email:'buyer@testuser.com'}}));
 assert.equal(res.status,503);
 assert.equal(s.calls.length,0);
});

test('versão pública não exibe token e não habilita cobrança comercial',()=>{
 const html=readFileSync(new URL('../planos/teste.html',import.meta.url),'utf8');
 const page=readFileSync(new URL('../planos/teste.js',import.meta.url),'utf8');
 const plan=readFileSync(new URL('../planos/plan.js',import.meta.url),'utf8');
 assert.match(html,/TESTE — não é uma venda ao público/);
 assert.match(page,/runBillingSandbox/);
 assert.match(plan,/billingEnabled: false/);
 assert.doesNotMatch(html+page,/APP_USR-/);
 const logic=readFileSync(new URL('../supabase/functions/ppmt-billing-test/logic.js',import.meta.url),'utf8');
 assert.doesNotMatch(logic,/\.from\(['"]memberships['"]\)/);
});
