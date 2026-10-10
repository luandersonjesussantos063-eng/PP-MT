import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('ativação do piloto fica restrita a flags privadas e segredo de produção',()=>{
 const index=read('supabase/functions/ppmt-monthly-billing/index.ts');
 assert.match(index,/\.from\('ppmt_commercial_flags'\)/);
 assert.match(index,/flags\.private_pilot_enabled===true/);
 assert.match(index,/flags\.delivery_ready===true/);
 assert.match(index,/MP_WEBHOOK_SECRET/);
 assert.match(index,/this\.isTester\(id\)/);
});
test('vendas públicas permanecem duplamente bloqueadas',()=>{
 const index=read('supabase/functions/ppmt-monthly-billing/index.ts');
 assert.match(index,/flags\.public_sales_enabled===true/);
 assert.match(index,/PPMT_MONTHLY_BILLING_ENABLED/);
});
test('tabela de configuração não pode ser consultada por alunos',()=>{
 const sql=read('database/commercial-flags.sql');
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.ppmt_commercial_flags from public,anon,authenticated/);
 assert.match(sql,/grant select on public\.ppmt_commercial_flags to service_role/);
 assert.match(sql,/private_pilot_enabled=true/);
 assert.match(sql,/public_sales_enabled=false/);
});
