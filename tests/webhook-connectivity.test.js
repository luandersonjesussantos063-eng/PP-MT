import test from 'node:test';
import assert from 'node:assert/strict';
import {makeConnectivityTestHandler} from '../supabase/functions/ppmt-webhook-connectivity-test/logic.js';
const h=makeConnectivityTestHandler();
const endpoint='https://example.invalid/functions/v1/ppmt-webhook-connectivity-test';
const payload={action:'updated',application_id:'1333210057145046',data:{id:'123456'},date:'2021-11-01T02:02:02Z',entity:'preapproval',id:'123456',type:'subscription_preapproval',version:8};
const post=body=>new Request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('simulacao do Mercado Pago retorna 200 sem assinatura nem credenciais',async()=>{
 const response=await h(post(payload));
 assert.equal(response.status,200);
 assert.match(await response.text(),/TESTE RECEBIDO/);
});
test('simulacao real do Mercado Pago payment.updated em modo teste responde 200',async()=>{
 const event={action:'payment.updated',api_version:'v1',data:{id:'123456'},
 date_created:'2021-11-01T02:02:02Z',id:'123456',live_mode:false,type:'payment',user_id:740298583};
 const response=await h(post(event));
 assert.equal(response.status,200);
 assert.match(await response.text(),/nenhuma cobranca ou assinatura alterada/i);
});
test('a URL de simulacao nao reconhece eventos marcados como producao',async()=>{
 const response=await h(post({action:'payment.updated',data:{id:'123456'},type:'payment',live_mode:true}));
 assert.equal(response.status,422);
});
test('endpoint nao aceita metodo GET ou POST fora do padrao de simulacao',async()=>{
 assert.equal((await h(new Request(endpoint))).status,405);
 assert.equal((await h(post({...payload,data:{id:'9087665'}}))).status,422);
 assert.equal((await h(post({...payload,type:'unknown'}))).status,422);
 assert.equal((await h(post({...payload,action:'paid'}))).status,422);
});
test('endpoint de diagnostico nao inclui banco nem Mercado Pago e nao altera o webhook real',async()=>{
 const {readFileSync}=await import('node:fs');
 const index=readFileSync(new URL('../supabase/functions/ppmt-webhook-connectivity-test/index.ts',import.meta.url),'utf8');
 const body=readFileSync(new URL('../supabase/functions/ppmt-webhook-connectivity-test/logic.js',import.meta.url),'utf8');
 const prod=readFileSync(new URL('../supabase/functions/ppmt-monthly-webhook/logic.js',import.meta.url),'utf8');
 assert.doesNotMatch(index+body,/SUPABASE_SERVICE_ROLE_KEY|MP_ACCESS_TOKEN_PROD|MP_WEBHOOK_SECRET|createClient|fetch\(/);
 assert.match(prod,/checkSignature/);
});
