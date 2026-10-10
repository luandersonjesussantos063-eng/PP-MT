import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(name)=>readFileSync(new URL('../planos/'+name,import.meta.url),'utf8');

test('checkout mostra somente preço, planos e mensagens essenciais',()=>{
 const html=read('assinar.html');
 assert.match(html,/R\$ 19,99/);
 assert.match(html,/Assinar no cartão/);
 assert.match(html,/Pagar com Pix/);
 assert.match(html,/Boleto ou débito/);
 assert.match(html,/renovação automática/i);
 assert.match(html,/sem renovação automática/);
 assert.match(html,/id="card-btn"/);
 assert.match(html,/id="manual-btn"/);
 assert.match(html,/id="refresh-btn"/);
 assert.doesNotMatch(html,/pay-faq|Como funcionam as mensalidades\?/);
 assert.match(html,/id="offer-panel"/);
 assert.match(html,/id="error-panel"/);
 assert.match(html,/id="pending-panel"/);
 assert.match(html,/id="switch-to-pix-btn"/);
 assert.match(html,/Trocar para Pix/);
 assert.match(html,/id="manage-panel"/);
 assert.doesNotMatch(html,/name="pay-method"/);
 assert.match(html,/id="paid-panel"/);
 assert.ok(html.length<8000,'página mantém estrutura compacta e estados separados');
});
test('termos preservam informações de cobrança mensal e cancelamento',()=>{
 const html=read('assinar.html'),terms=read('termos.html');
 assert.match(html,/href="\.\/termos\.html"/);
 assert.match(terms,/R\$ 19,99 por mês/);
 assert.match(terms,/cobrança automática/);
 assert.match(terms,/Pix, boleto e cartão de débito/);
 assert.match(terms,/cancelamento/i);
 assert.match(terms,/pagamento mensal manual/);
 assert.match(terms,/pagamento pelo provedor/);
 assert.match(terms,/NovaByte Soluções/);
});
test('interface compacta mantém integração, confirmação e cancelamento',()=>{
 const js=read('assinar.js');
 for(const action of ["'status'","'manual_checkout'","'card_start'","'card_cancel'"]){
  assert.ok(js.includes(action),action);
 }
 assert.match(js,/POR MÊS/);
 assert.match(js,/confirm\(/);
 assert.match(js,/runMonthlyBilling/);
 assert.match(js,/enabled=data\.enabled===true/);
 assert.match(js,/cs==='pending'/);
 assert.match(js,/action\('card_cancel',\{switchToPix:true\}\)/);
 assert.match(js,/updated\?\.card\?\.state==='cancelled'/);
});
