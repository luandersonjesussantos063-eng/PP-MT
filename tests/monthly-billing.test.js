import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {makeHandler,BillingError,isSeller,paidStatus,verifiedPayment,verifiedCardPayment,AMOUNT,SELLER} from '../supabase/functions/ppmt-monthly-billing/logic.js';
import {signatureParts,checkSignature,webhookHandler} from '../supabase/functions/ppmt-monthly-webhook/logic.js';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const request=(action,payload={})=>new Request('https://supabase.invalid/functions/v1/ppmt-monthly-billing',{
 method:'POST',headers:{origin:ORIGIN,authorization:'Bearer fakeJwt','content-type':'application/json'},body:JSON.stringify({action,...payload})
});
function harness({enabled=false,pilot=false,seller=SELLER,identityForbidden=false,preferencesEmpty=false,checkoutSeller=SELLER,initialCard=null,initialOrder=null,initialMember=null,providerOffline=false}={}){
 const calls=[];let card=initialCard,order=initialOrder,member=initialMember;
 const db={
  async enabled(){return enabled;},async privatePilot(){return pilot;},async token(){return 'FAKE_ONLY';},
  async isTester(){return true;},
  async diagnostics(){return {webhook_secret_present:false,delivery_flag:false,billing_flag:false};},
  async verifiedFlows(){return {webhook_real_verified:false,manual_monthly_verified:false,card_monthly_verified:false};},
  async member(){return member;},async card(){return card;},
  async claimCard(uid){card={user_id:uid,external_reference:'11111111-1111-4111-8111-111111111111'};return card;},
  async updateCard(uid,patch){card={...card,...patch};},
  async recycleCancelledCard(uid){
   if(card?.state!=='cancelled')return null;
   card={...card,provider_id:null,state:'creating',
    checkout_url:null,external_reference:'77777777-7777-4777-8777-777777777777'};
   return card;
  },
  async openOrder(){return order;},
  async claimOrder(uid){order={user_id:uid,id:'22222222-2222-4222-8222-222222222222',expires_at:new Date(Date.now()+600000).toISOString()};return order;},
  async updateOrder(id,patch){order={...order,...patch};},
  async credit(){throw Error('No mock payments approved');},async void(){throw Error('No refund mock');}
 };
 const mp=async(t,path,method,body,key)=>{
  calls.push({path,method,body,key});
  if(providerOffline)throw new BillingError(503,'Provedor temporariamente indisponível',503);
  if(path==='/users/me'){
    if(identityForbidden)throw new BillingError(422,'API de identidade proibida',403);
    return {id:seller,site_id:'MLB',tags:[]};
  }
  if(path==='/checkout/preferences/search?limit=1')
    return {elements:preferencesEmpty?[]:[{collector_id:checkoutSeller}]};
  if(path==='/preapproval'&&method==='POST')return {
   id:'subscriber123',collector_id:SELLER,external_reference:card.external_reference,
   auto_recurring:{transaction_amount:AMOUNT,frequency:1,frequency_type:'months',currency_id:'BRL'},
   init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=subscriber123'};
  if(path==='/checkout/preferences'&&method==='POST')return {
   id:'pref123',collector_id:checkoutSeller,external_reference:body.external_reference,
   init_point:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref123'};
  if(path.startsWith('/v1/payments/search'))return {results:[]};
  if(path==='/preapproval/subscriber123'&&method==='PUT')return {
   id:'subscriber123',status:'cancelled'};
  if(path==='/preapproval/subscriber123')return {
   id:'subscriber123',status:'pending',collector_id:SELLER,external_reference:card.external_reference,
   auto_recurring:{transaction_amount:AMOUNT,frequency:1,frequency_type:'months',currency_id:'BRL'},
   init_point:'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=subscriber123'};
  throw Error('Unexpected MP call '+path);
 };
 const fn=makeHandler({
  authenticate:async()=>({id:'33333333-3333-4333-8333-333333333333',email:'aluno@example.org',email_confirmed_at:'2026-10-09T00:00:00Z',is_anonymous:false}),
  db,mp
 });
 return {fn,calls};
}
test('preço oficial é R$ 19,99, não inclui centavo piloto',()=>{
 assert.equal(AMOUNT,19.99);
 const plan=readFileSync(new URL('../planos/plan.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../planos/assinar.html',import.meta.url),'utf8');
 assert.match(plan,/R\$ 19,99/);assert.match(html,/R\$ 19,99/);
 assert.match(html,/Assinar no cartão/);assert.match(html,/Pagar com Pix/);
 assert.match(html,/renovação automática/);assert.match(html,/cada mês/);
});
test('vendas desativadas nunca criam pagamento por acidente',async()=>{
 const h=harness();
 const status=await h.fn(request('status'));assert.equal(status.status,200);
 assert.equal((await status.json()).enabled,false);
 const pay=await h.fn(request('manual_checkout'));assert.equal(pay.status,503);
 const sub=await h.fn(request('card_start'));assert.equal(sub.status,503);
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});
test('vendedor incorreto não permite checkout',async()=>{
 const h=harness({enabled:true,seller:111111});
 assert.equal((await h.fn(request('manual_checkout'))).status,503);
 assert.equal(h.calls.length,1);
});
test('checkout manual cobra um único mês sem criar assinatura, bloqueia repetição',async()=>{
 const h=harness({enabled:true});
 const res=await h.fn(request('manual_checkout',{amount:9999,user_id:'somebody-else'}));
 assert.equal(res.status,200);
 const payload=await res.json();
 assert.equal(payload.price,19.99);assert.equal(payload.manual.state,'pending');
 const pref=h.calls.find(c=>c.path==='/checkout/preferences');
 assert.equal(pref.body.items[0].unit_price,19.99);
 assert.equal(pref.body.items[0].quantity,1);
 assert.equal(pref.body.external_reference,'22222222-2222-4222-8222-222222222222');
 assert.ok(!('preapproval_plan_id' in pref.body));
 const res2=await h.fn(request('manual_checkout'));
 assert.equal(res2.status,200);
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences').length,1);
});
test('cartão inicia assinatura automática mensal de 19,99, consentimento na interface',async()=>{
 const h=harness({enabled:true});
 const res=await h.fn(request('card_start'));
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.card.state,'pending');
 const sub=h.calls.find(c=>c.path==='/preapproval');
 assert.equal(sub.body.payer_email,'aluno@example.org');
 assert.equal(sub.body.auto_recurring.transaction_amount,19.99);
 assert.equal(sub.body.auto_recurring.frequency,1);
 assert.equal(sub.body.auto_recurring.frequency_type,'months');
 assert.equal(sub.body.status,'pending');
 assert.match(readFileSync(new URL('../planos/assinar.js',import.meta.url),'utf8'),/POR MÊS/);
 const again=await h.fn(request('card_start'));
 assert.equal(again.status,200);
 assert.equal(h.calls.filter(c=>c.path==='/preapproval'&&c.method==='POST').length,1);
});
test('validação recusa pagamento de outro recebedor, valor ou referência',()=>{
 const p={id:123,live_mode:true,collector_id:SELLER,transaction_amount:19.99,currency_id:'BRL',external_reference:'ord'};
 assert.equal(verifiedPayment(p,'ord'),true);
 assert.equal(verifiedPayment({...p,transaction_amount:0.01},'ord'),false);
 assert.equal(verifiedPayment({...p,collector_id:999},'ord'),false);
 assert.equal(verifiedPayment({...p,live_mode:false},'ord'),false);
 assert.equal(verifiedPayment(p,'different'),false);
 assert.equal(verifiedCardPayment(p),true);
 assert.equal(paidStatus({...p,status:'approved'}),true);
 assert.equal(paidStatus({...p,status:'approved',transaction_amount_refunded:19.99}),false);
});
test('webhook só aceita assinatura HMAC legítima',async()=>{
 const secret='FAKE_TEST_SECRET';
 const reqId='ab1234',id='1234567890',ts=String(Date.now());
 const manifest='id:'+id+';request-id:'+reqId+';ts:'+ts+';';
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update(manifest).digest('hex');
 assert.equal(signatureParts(signature).ts,ts);
 assert.equal(await checkSignature({secret,signature,requestId:reqId,id}),true);
 assert.equal(await checkSignature({secret,signature,requestId:reqId,id:'98765'}),false);
 assert.equal(await checkSignature({secret:'WRONG',signature,requestId:reqId,id}),false);
});
test('webhook sem assinatura não pode conceder Premium nem buscar recurso',async()=>{
 let calls=0;
 const hook=webhookHandler({
  secret:async()=>'FAKE_SECRET',token:async()=>'FAKE_TOKEN',
  db:{credit:async()=>{calls++;}},mp:async()=>{calls++;}
 });
 const req=new Request('https://test.invalid/functions/v1/ppmt-monthly-webhook?data.id=12345',{
  method:'POST',body:JSON.stringify({type:'payment',user_id:SELLER,data:{id:'12345'}})});
 const result=await hook(req);
 assert.equal(result.status,401);assert.equal(calls,0);
});
test('site não carrega chaves privadas e checkout padrão permanece fechado',()=>{
 const h=readFileSync(new URL('../planos/assinar.html',import.meta.url),'utf8');
 const j=readFileSync(new URL('../planos/assinar.js',import.meta.url),'utf8');
 const a=readFileSync(new URL('../auth.js',import.meta.url),'utf8');
 assert.doesNotMatch(h+j+a,/MP_ACCESS_TOKEN_PROD|SUPABASE_SERVICE_ROLE_KEY|APP_USR-/);
 const index=readFileSync(new URL('../supabase/functions/ppmt-monthly-billing/index.ts',import.meta.url),'utf8');
 assert.match(index,/PPMT_MONTHLY_BILLING_ENABLED/);
 assert.match(index,/ppmt_commercial_flags/);
});

test('checklist do administrador usa somente indicadores, não mostra segredos',async()=>{
 const h=harness();
 const res=await h.fn(request('readiness'));
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.checks.webhook_secret_present,false);
 assert.equal(data.checks.merchant_valid,true);
 assert.equal(data.enabled,false);
 assert.doesNotMatch(JSON.stringify(data),/FAKE_ONLY/);
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('piloto de mensalidade libera checkout somente para testador autorizado pelo servidor',async()=>{
 const privateAdmin=harness({pilot:true});
 const response=await privateAdmin.fn(request('manual_checkout'));
 assert.equal(response.status,200);
 assert.equal((await response.json()).enabled,true);
 assert.equal(privateAdmin.calls.some(x=>x.path==='/checkout/preferences'&&x.method==='POST'),true);
 const publicUser=harness({pilot:false});
 assert.equal((await publicUser.fn(request('manual_checkout'))).status,503);
 assert.equal(publicUser.calls.filter(x=>x.method==='POST').length,0);
});

test('simulação de assinatura com HMAC válido e ID fictício não gera pagamento nem erro',async()=>{
 const secret='FAKE_SIMULATOR_SECRET';
 const id='123456', reqId='test-request-id-123', ts=String(Date.now());
 const message='id:'+id+';request-id:'+reqId+';ts:'+ts+';';
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update(message).digest('hex');
 let providerCalls=0,credits=0;
 const handler=webhookHandler({
  secret:async()=>secret,token:async()=>'FAKE_TOKEN',
  db:{cardByProvider:async()=>null,credit:async()=>{credits++;}},
  mp:async()=>{providerCalls++;throw Error('Não consultar ID fictício de simulação');}
 });
 const response=await handler(new Request('https://example.supabase.co/functions/v1/ppmt-monthly-webhook?data.id=123456&type=subscription_preapproval',{
  method:'POST',headers:{'x-signature':signature,'x-request-id':reqId,'content-type':'application/json'},
  body:JSON.stringify({action:'updated',application_id:'example',data:{id},date:'2021-11-01T02:02:02Z',entity:'preapproval',id,type:'subscription_preapproval',version:8})
 }));
 assert.equal(response.status,200);
 assert.equal(providerCalls,0);
 assert.equal(credits,0);
});
test('requisição GET não simula evento; POST com assinatura inválida não credita',async()=>{
 let credited=false;
 const handler=webhookHandler({
  secret:async()=>'FAKE_SECRET',token:async()=>'FAKE_TOKEN',
  db:{credit:async()=>{credited=true;}},mp:async()=>{throw Error('Must not be called');}
 });
 assert.equal((await handler(new Request('https://example.supabase.co/functions/v1/ppmt-monthly-webhook'))).status,405);
 const originalWarn=console.warn;
 const warnings=[];
 try{
  console.warn=(...args)=>warnings.push(args);
  const invalid=await handler(new Request('https://example.supabase.co/functions/v1/ppmt-monthly-webhook?data.id=123456',{method:'POST',body:'{}'}));
  assert.equal(invalid.status,401);
 }finally{console.warn=originalWarn;}
 assert.equal(credited,false);
 assert.ok(warnings.length>0);
 assert.doesNotMatch(JSON.stringify(warnings),/FAKE_SECRET/);
});

test('webhook segue manifesto do SDK Mercado Pago inclusive ID com maiusculas',async()=>{
 const secret='SEGREDO_SOMENTE_TESTE',id='AbC123',requestId='pedido-assinado-08',ts=String(Math.floor(Date.now()/1000));
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update('id:'+id+';request-id:'+requestId+';ts:'+ts+';').digest('hex');
 assert.equal(await checkSignature({secret,signature,requestId,id}),true);
 assert.equal(await checkSignature({secret,signature,requestId,id:'abc123'}),false);
});
test('webhook tolera espacos externos do segredo mas rejeita assinatura falsa',async()=>{
 const secret='SEGREDO_SOMENTE_TESTE',id='123456',requestId='pedido-assinado-09',ts=String(Date.now());
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update('id:'+id+';request-id:'+requestId+';ts:'+ts+';').digest('hex');
 assert.equal(await checkSignature({secret:'  '+secret+String.fromCharCode(10),signature,requestId,id}),true);
 assert.equal(await checkSignature({secret,signature:signature.replace(/v1=[a-f0-9]+/, 'v1='+'0'.repeat(64)),requestId,id}),false);
});

test('webhook real reconhece simulacao assinada de pagamento sem consultar API ou liberar plano',async()=>{
 const secret='SIMULATOR_ONLY_SECRET',id='123456',requestId='mp-sim-2026',ts=String(Math.floor(Date.now()/1000));
 const manifest='id:'+id+';request-id:'+requestId+';ts:'+ts+';';
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update(manifest).digest('hex');
 let dbCalls=0,mpCalls=0,tokenCalls=0;
 const handler=webhookHandler({
  secret:async()=>secret,token:async()=>{tokenCalls++;return 'SECRET_TEST_ONLY';},
  db:{orderById:async()=>{dbCalls++;return null;},credit:async()=>{dbCalls++;}},
  mp:async()=>{mpCalls++;throw Error('Nunca consultar ID ficticio no provedor');}
 });
 const body={action:'payment.updated',api_version:'v1',data:{id},
   date_created:'2021-11-01T02:02:02Z',id,live_mode:false,type:'payment',user_id:SELLER};
 const url='https://example.supabase.co/functions/v1/ppmt-monthly-webhook?data.id=123456&type=payment';
 const headers={'x-signature':signature,'x-request-id':requestId,'content-type':'application/json'};
 const ok=await handler(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}));
 assert.equal(ok.status,200);
 assert.equal(dbCalls,0);
 assert.equal(mpCalls,0);
 assert.equal(tokenCalls,0);
 const previousWarn=console.warn;console.warn=()=>{};
 try{
  const bad=await handler(new Request(url,{method:'POST',headers:{...headers,'x-signature':'ts='+ts+',v1='+'0'.repeat(64)},body:JSON.stringify(body)}));
  assert.equal(bad.status,401);
 }finally{console.warn=previousWarn;}
 assert.equal(dbCalls,0);assert.equal(mpCalls,0);
});
test('webhook nao desativa assinatura e nao ignora evento real por ter ID de teste',async()=>{
 const secret='SIMULATOR_ONLY_SECRET',id='123456',requestId='mp-sim-live',ts=String(Math.floor(Date.now()/1000));
 const signature='ts='+ts+',v1='+createHmac('sha256',secret).update('id:'+id+';request-id:'+requestId+';ts:'+ts+';').digest('hex');
 let mpCalls=0;
 const handler=webhookHandler({secret:async()=>secret,token:async()=>'TEST_TOKEN',
  db:{},mp:async()=>{mpCalls++;throw Error('Provider unavailable');}});
 const result=await handler(new Request('https://example.supabase.co/functions/v1/ppmt-monthly-webhook?data.id=123456',{
  method:'POST',headers:{'x-signature':signature,'x-request-id':requestId,'content-type':'application/json'},
  body:JSON.stringify({action:'payment.updated',data:{id},id,type:'payment',live_mode:true,user_id:SELLER})
 }));
 assert.equal(result.status,503);
 assert.equal(mpCalls,1);
});

test('diagnóstico privado separa token de produção ausente, HTTP rejeitado e vendedor incorreto',async()=>{
 const h=harness();
 const data=await (await h.fn(request('readiness'))).json();
 assert.equal(data.checks.merchant_valid,true);
 assert.equal(data.checks.merchant_http_status,200);
 assert.equal(data.checks.production_token_present,true);
 assert.equal(data.checks.checkout_api_authorized,true);
 assert.equal(data.checks.checkout_api_http_status,200);
 assert.equal(data.checks.checkout_seller_matches,true);
 const merchantUi=readFileSync(new URL('../planos/diagnostico.js',import.meta.url),'utf8');
 assert.match(merchantUi,/merchant_http_status/);
 assert.match(merchantUi,/production_token_present/);
 assert.doesNotMatch(merchantUi,/MP_ACCESS_TOKEN_PROD|APP_USR-/);
});

test('validação da conta usa endpoint de identidade documentado pelo Mercado Pago, pagamentos usam API de cobranças',()=>{
 const src=readFileSync(new URL('../supabase/functions/ppmt-monthly-billing/index.ts',import.meta.url),'utf8');
 assert.match(src,/path==='\/users\/me'\?'https:\/\/api\.mercadolibre\.com':'https:\/\/api\.mercadopago\.com'/);
 assert.match(src,/await fetch\(host\+path,/);
 assert.match(src,/redirect:'error'/);
});

test('preflight usa pesquisa read-only da API de Checkout Pro sem criar cobranca',async()=>{
 const h=harness();
 const res=await h.fn(request('readiness'));
 assert.equal(res.status,200);
 const checks=(await res.json()).checks;
 assert.equal(checks.checkout_api_authorized,true);
 assert.equal(checks.checkout_seller_matches,true);
 assert.ok(h.calls.some(c=>c.path==='/checkout/preferences/search?limit=1'&&(c.method===undefined||c.method==='GET')));
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('checkout mantém autorização quando identidade do Mercado Livre dá 403 e API nativa aceita',async()=>{
 const h=harness({enabled:true,identityForbidden:true,preferencesEmpty:true});
 const resp=await h.fn(request('manual_checkout'));
 assert.equal(resp.status,200,'Consulta nativa read-only e collector correto permitem checkout');
 const data=await resp.json();
 assert.equal(data.manual.state,'pending');
 const paths=h.calls.map(c=>c.path);
 assert.ok(paths.includes('/users/me'));
 assert.ok(paths.includes('/checkout/preferences/search?limit=1'));
 assert.ok(paths.includes('/checkout/preferences'));
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences'&&c.method==='POST').length,1);
});
test('checkout nao mostra link de pagamento de vendedor diferente',async()=>{
 const h=harness({enabled:true,identityForbidden:true,preferencesEmpty:true,checkoutSeller:9999999});
 const resp=await h.fn(request('manual_checkout'));
 assert.equal(resp.status,502);
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences'&&c.method==='POST').length,1);
 assert.equal((await resp.json()).manual,undefined);
});
test('conta divergente ja descoberta no read-only impede criar pagamento',async()=>{
 const h=harness({enabled:true,identityForbidden:true,checkoutSeller:9999999});
 const resp=await h.fn(request('manual_checkout'));
 assert.equal(resp.status,503);
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('erro oficial do Mercado Pago permanece código seguro sem detalhes de credenciais',async()=>{
 const e=new BillingError(422,'Operação indisponível',400,'ds_search_query');
 assert.equal(e.providerStatus,400);
 assert.equal(e.providerCode,'ds_search_query');
 const server=readFileSync(new URL('../supabase/functions/ppmt-monthly-billing/index.ts',import.meta.url),'utf8');
 const parser=readFileSync(new URL('../supabase/functions/ppmt-monthly-billing/provider-error.js',import.meta.url),'utf8');
 assert.match(parser,/\^\[A-Za-z0-9_-\]\{1,80\}\$/);
 assert.match(server,/code=providerErrorCode\(payload\)/);
 assert.match(server,/code\}\);/);
 assert.doesNotMatch(server,/console\.warn\([^\n]*headers|console\.warn\([^\n]*token/);
});

test('consulta plano gratuito sem depender de API externa ou criar cobrança',async()=>{
 const h=harness({enabled:true,providerOffline:true});
 const response=await h.fn(request('status'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.premium,false);
 assert.equal(data.price,19.99);
 assert.equal(data.provider_sync_available,true);
 assert.equal(data.manual,null);
 assert.equal(h.calls.length,0,'status sem pagamento não deve consultar Mercado Pago');
});
test('se o provedor falha, mensalidade já iniciada permanece visível sem criar nova cobrança',async()=>{
 const h=harness({enabled:true,providerOffline:true,initialOrder:{
  id:'22222222-2222-4222-8222-222222222222',user_id:'u',
  state:'pending',provider_preference_id:'pref123',
  checkout_url:'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref123',
  expires_at:new Date(Date.now()+86400000).toISOString()
 }});
 const response=await h.fn(request('status'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.provider_sync_available,false);
 assert.equal(data.manual.state,'pending');
 assert.match(data.manual.checkout_url,/mercadopago.com.br/);
 assert.equal(data.premium,false);
 assert.equal(h.calls.filter(x=>x.method==='POST').length,0);
});
test('Premium confirmado no banco continua ativo mesmo que provedor de cobrança esteja fora do ar',async()=>{
 const h=harness({enabled:true,providerOffline:true,
  initialMember:{status:'active',current_period_end:new Date(Date.now()+7*86400000).toISOString()},
  initialCard:{
   state:'authorized',provider_id:'subscriber123',
   external_reference:'11111111-1111-4111-8111-111111111111',checkout_url:null
  }
 });
 const response=await h.fn(request('status'));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.premium,true);
 assert.equal(data.provider_sync_available,false);
 assert.equal(data.card.state,'authorized');
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('cartão já cancelado permite abrir opções sem consultar o Mercado Pago',async()=>{
 const h=harness({enabled:true,providerOffline:true,initialCard:{
  state:'cancelled',provider_id:'subscriber123',
  external_reference:'11111111-1111-4111-8111-111111111111',
  checkout_url:null
 }});
 const response=await h.fn(request('status'));
 assert.equal(response.status,200,'O status gratuito deve abrir mesmo se o Mercado Pago está indisponível');
 const data=await response.json();
 assert.equal(data.premium,false);
 assert.equal(data.enabled,true);
 assert.equal(data.card?.state,'cancelled');
 assert.equal(data.provider_sync_available,true);
 assert.equal(h.calls.length,0,'Consultar assinatura cancelada não deve depender do Mercado Pago');
 assert.equal(h.calls.filter(c=>c.method==='POST').length,0);
});

test('Pix pode iniciar após cancelamento de cartão já confirmado, sem consultar ID antigo',async()=>{
 const h=harness({enabled:true,initialCard:{
  state:'cancelled',provider_id:'oldCancelledSub',
  external_reference:'11111111-1111-4111-8111-111111111111',
  checkout_url:null
 }});
 const res=await h.fn(request('manual_checkout'));
 assert.equal(res.status,200,'a antiga assinatura cancelada não deve bloquear o checkout manual');
 const data=await res.json();
 assert.equal(data.manual.state,'pending');
 assert.equal(data.price,19.99);
 assert.equal(h.calls.filter(x=>x.path==='/checkout/preferences'&&x.method==='POST').length,1);
 assert.equal(h.calls.some(x=>x.path==='/preapproval/oldCancelledSub'),false);
});
test('Cartão permite nova autorização depois de cancelamento confirmado, sem consultar ID antigo',async()=>{
 const h=harness({enabled:true,initialCard:{
  state:'cancelled',provider_id:'oldCancelledSub',
  external_reference:'11111111-1111-4111-8111-111111111111',
  checkout_url:null
 }});
 const res=await h.fn(request('card_start'));
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.card.state,'pending');
 assert.equal(data.price,19.99);
 assert.equal(h.calls.filter(x=>x.path==='/preapproval'&&x.method==='POST').length,1);
 assert.equal(h.calls.some(x=>x.path==='/preapproval/oldCancelledSub'),false);
});

test('aluno troca cartão pendente por Pix: servidor cancela antes de liberar pagamento manual',async()=>{
 const h=harness({enabled:true});
 const start=await h.fn(request('card_start'));
 assert.equal(start.status,200);
 assert.equal((await start.json()).card.state,'pending');
 const cancel=await h.fn(request('card_cancel'));
 assert.equal(cancel.status,200);
 const cancelled=await cancel.json();
 assert.equal(cancelled.card.state,'cancelled');
 assert.ok(h.calls.some(c=>c.path==='/preapproval/subscriber123'&&c.method==='PUT'&&c.body.status==='cancelled'));
 const now=await h.fn(request('status'));
 assert.equal(now.status,200);
 assert.equal((await now.json()).card.state,'cancelled');
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences').length,0,'não gera Pix só por cancelar');
 const switchPay=await h.fn(request('manual_checkout'));
 assert.equal(switchPay.status,200);
 const manual=await switchPay.json();
 assert.equal(manual.manual.state,'pending');
 assert.equal(manual.price,19.99);
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences'&&c.method==='POST').length,1);
});
test('sem confirmação de cancelamento do cartão, não oferece novo pagamento por Pix',async()=>{
 const h=harness({enabled:true,providerOffline:true,initialCard:{
  provider_id:'subscriber123',state:'pending',
  external_reference:'11111111-1111-4111-8111-111111111111',checkout_url:null
 }});
 const cancelled=await h.fn(request('card_cancel'));
 assert.notEqual(cancelled.status,200);
 assert.equal((await h.fn(request('status'))).status,200);
 assert.equal((await h.fn(request('manual_checkout'))).status!==200,true);
 assert.equal(h.calls.filter(c=>c.path==='/checkout/preferences'&&c.method==='POST').length,0);
});
