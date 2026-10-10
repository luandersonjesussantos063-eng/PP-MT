import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Retorno do checkout reconcilia com servidor sem confiar no redirect',()=>{
 const code=read('planos/assinar.js');
 assert.match(code,/reconcileAfterCheckout/);
 assert.match(code,/await action\('status'\)/);
 assert.match(code,/data\?\.premium===true/);
 assert.match(code,/não pague de novo/i);
 assert.doesNotMatch(code,/resultado==='aprovado'\)\s*.*premium\s*=\s*true/i);
});
test('Marketing descreve exatamente o acervo e as condições atuais',()=>{
 const page=read('planos/index.html');
 assert.match(page,/ACESSO EXCLUSIVO/);
 assert.match(page,/sem limite diário de 10 questões/);
 assert.doesNotMatch(page,/PREMIUM · EM BREVE/);
 const legal=read('planos/termos.html');
 assert.match(legal,/31 questões exclusivas/);
 assert.match(legal,/7 dias/);
 assert.match(legal,/wa\.me\/5531983771576/);
 const privacy=read('planos/privacidade.html');
 assert.match(privacy,/não captura os dados do cartão/);
});

test('Identificação pessoa física, endereço e contatos constam na apresentação e políticas',()=>{
 const landing=read('planos/index.html');
 const terms=read('planos/termos.html');
 const privacy=read('planos/privacidade.html');
 for (const page of [landing,terms,privacy]){
  assert.match(page,/Luanderson Jesus dos Santos/);
  assert.match(page,/NovaByte Soluções/);
  assert.match(page,/Avenida das Emas/);
  assert.match(page,/2958/);
  assert.match(page,/Lucas do Rio Verde/);
  assert.match(page,/luandersonjesussantos063@gmail\.com/);
 }
 assert.match(terms,/pessoa física/);
 assert.match(landing,/Identificação do fornecedor/);
});
