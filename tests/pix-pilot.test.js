import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHandler,CENTAVO,SELLER_REAL,isRealPixPayment} from '../supabase/functions/ppmt-pix-pilot/logic.js';
const ORIGIN='https://luandersonjesussantos063-eng.github.io';
const req=(action,options={})=>new Request('https://ppmt.example/functions/v1/ppmt-pix-pilot',{
 method:'POST',headers:{Origin:options.origin||ORIGIN,Authorization:options.authorization||'Bearer JWT', 'Content-Type':'application/json'},
 body:JSON.stringify({action,...options.payload})
});
function setup(overrides={}){
 let row=null;const events=[];
 const db={
  async isTester(){return true;},async isEnabled(){return true;},
  async token(){return 'FAKE_UNIT_TEST_SECRET';},async get(){return row;},
  async claim(userId){row={id:'10000000-0000-4000-8000-000000000001',user_id:userId,provider_id:null,state:'creating'};return row;},
  async update(id,patch){row={...row,...patch};}
 };
 const pay=()=>({
  id:987654,status:'pending',live_mode:true,collector_id:SELLER_REAL,
  transaction_amount:CENTAVO,currency_id:'BRL',payment_method_id:'pix',
  external_reference:row.id,transaction_amount_refunded:0,
  point_of_interaction:{transaction_data:{qr_code:'000201PIXEXAMPLE',ticket_url:'https://www.mercadopago.com.br/payments/987654/ticket'}}
 });
 const handler=createHandler({
  db:{...db,...overrides.db},
  authenticate:overrides.authenticate|| (async()=>({id:'10000000-0000-4000-8000-000000000004',email:'buyer@example.com',email_confirmed_at:'2026-10-09T00:00:00Z',is_anonymous:false})),
  mercado:overrides.mercado|| (async(token,path,method,body,idempotency)=>{
   events.push({token,path,method,body,idempotency});
   if(path==='/users/me')return {id:SELLER_REAL,tags:[]};
   if(path==='/v1/payments'&&method==='POST')return pay();
   if(path==='/v1/payments/987654')return pay();
   throw Error('Unexpected Mercado Pago mock path');
  })
 });
 return {handler,events};
}
test('valor é fixo em R$ 0,01, não há assinatura',()=>{
 assert.equal(CENTAVO,0.01);
 const js=readFileSync(new URL('../planos/pix.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../planos/pix.html',import.meta.url),'utf8');
 assert.match(html,/R\$ 0,01/);
 assert.match(html,/não renova/);
 assert.doesNotMatch(js,/APP_USR-|MP_ACCESS_TOKEN_PROD|service_role/);
});
test('piloto bloqueado não pode criar pagamento',async()=>{
 const a=setup({db:{isEnabled:async()=>false}});
 assert.equal((await a.handler(req('create'))).status,503);
 assert.equal(a.events.length,0);
});
test('apenas usuário PPMT confirmado e autorizado consegue acessar',async()=>{
 const a=setup({authenticate:async()=>null});
 assert.equal((await a.handler(req('create'))).status,401);
 const b=setup({db:{isTester:async()=>false}});
 assert.equal((await b.handler(req('create'))).status,403);
 const c=setup();
 assert.equal((await c.handler(req('create',{origin:'https://evil.example'}))).status,403);
});
test('check informa R$ 0,01 e configuração sem criar cobrança',async()=>{
 const a=setup();
 const res=await a.handler(req('check'));
 assert.equal(res.status,200);
 const body=await res.json();
 assert.deepEqual(body,{amount:0.01,enabled:true,recurring:false});
 assert.deepEqual(a.events.map(e=>({path:e.path,method:e.method})),[{path:'/users/me',method:undefined}]);
});
test('cria pagamento via Pix com valor imposto no backend, sem vincular Premium',async()=>{
 const a=setup();
 const res=await a.handler(req('create',{payload:{transaction_amount:999,payment_method_id:'card',user_id:'other',email:'evil@ex.com'}}));
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.amount,0.01);assert.equal(data.recurring,false);assert.equal(data.premium_granted,false);
 assert.equal(data.payment_confirmed,false);assert.equal(data.state,'pending');
 const created=a.events.find(x=>x.method==='POST');
 assert.equal(created.path,'/v1/payments');
 assert.equal(created.body.transaction_amount,0.01);
 assert.equal(created.body.payment_method_id,'pix');
 assert.equal(created.body.payer.email,'buyer@example.com');
 assert.equal(created.idempotency,'10000000-0000-4000-8000-000000000001');
 const res2=await a.handler(req('create'));
 assert.equal(res2.status,200);
 assert.equal(a.events.filter(x=>x.method==='POST').length,1);
});
test('aprovação só aceita conta real e moeda correta',()=>{
 const row={id:'id123',provider_id:'123'};
 const payment={id:'123',live_mode:true,collector_id:SELLER_REAL,transaction_amount:0.01,currency_id:'BRL',payment_method_id:'pix',external_reference:'id123'};
 assert.equal(isRealPixPayment(payment,row),true);
 assert.equal(isRealPixPayment({...payment,live_mode:false},row),false);
 assert.equal(isRealPixPayment({...payment,transaction_amount:0.10},row),false);
 assert.equal(isRealPixPayment({...payment,collector_id:1},row),false);
 assert.equal(isRealPixPayment({...payment,external_reference:'wrong'},row),false);
 assert.equal(isRealPixPayment({...payment,payment_method_id:'credit_card'},row),false);
});
test('valida vendedor real antes de realizar cobrança',async()=>{
 const a=setup({mercado:async()=>({id:123456789,tags:[]})});
 assert.equal((await a.handler(req('create'))).status,503);
});
test('não há qualquer atualização na tabela de membros',()=>{
 const src=readFileSync(new URL('../supabase/functions/ppmt-pix-pilot/index.ts',import.meta.url),'utf8');
 assert.doesNotMatch(src,/\.from\(['"]memberships['"]\)/);
 assert.match(src,/MP_ACCESS_TOKEN_PROD/);
 assert.match(src,/PIX_PILOT_ENABLED/);
 assert.match(src,/X-Idempotency-Key/);
});

test('não habilita Pix com credencial de vendedor diferente',async()=>{
 const a=setup({mercado:async()=>({id:99999999,tags:[]})});
 const res=await a.handler(req('check'));
 const data=await res.json();
 assert.equal(res.status,200);
 assert.equal(data.enabled,false);
 assert.match(data.reason,/conta real de recebimento/);
});
test('não habilita Pix quando a consulta ao Mercado Pago falha',async()=>{
 const a=setup({mercado:async()=>{throw Error('upstream unavailable')}});
 const res=await a.handler(req('check'));
 const data=await res.json();
 assert.equal(data.enabled,false);
 assert.match(data.reason,/Não foi possível validar/);
});
