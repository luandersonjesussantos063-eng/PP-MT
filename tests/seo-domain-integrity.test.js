import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const base='https://ppmt.novabytesolucoes.com.br/';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pages=[
 '','planos/','planos/instalar.html','planos/artigos/',
 'planos/artigos/como-estudar-policia-penal-mt.html',
 'planos/artigos/lei-execucao-penal-direitos-preso.html',
 'planos/artigos/principios-administracao-publica.html',
 'planos/artigos/questoes-policia-penal-mt-como-treinar.html',
 'planos/artigos/simulados-policia-penal-mt.html',
 'planos/artigos/o-que-estudar-policia-penal-mt.html',
 'planos/questoes-policia-penal-mt.html',
 'planos/simulados-policia-penal-mt.html',
 'planos/plano-de-estudos-policia-penal-mt.html'
];
const restricted=['planos/assinar.html','planos/premium.html','planos/diagnostico.html',
 'planos/piloto-centavo.html','planos/teste.html','planos/pix.html','planos/reteste-webhook.html'];

test('sitemap possui todas as páginas públicas de SEO no domínio certo',()=>{
 const sitemap=read('sitemap.xml');
 for(const path of pages){
  const file=path+(path===''||path.endsWith('/')?'index.html':'');
  assert.ok(existsSync(new URL('../'+file,import.meta.url)),file+' inexistente');
  const html=read(file);
  assert.ok(sitemap.includes('<loc>'+base+path+'</loc>'),path+' ausente no sitemap');
  assert.ok(html.includes('<link rel="canonical" href="'+base+path+'"'),file+' canonical incorreta');
  assert.ok(!html.includes('https://luandersonjesussantos063-eng.github.io/PP-MT/'),file+' URL antiga');
  assert.match(html,/<title>[^<]+<\/title>/);
  assert.match(html,/<meta name="description"/);
 }
 for(const path of restricted)assert.ok(!sitemap.includes('<loc>'+base+path+'</loc>'),path+' restrita não deveria estar no sitemap');
});
test('robots.txt aponta para o sitemap correto e páginas transacionais ficam noindex',()=>{
 assert.ok(read('robots.txt').includes('Sitemap: '+base+'sitemap.xml'));
 for(const file of restricted)assert.match(read(file),/name="robots" content="noindex/);
});
test('novos artigos oferecem conteúdo editorial, fontes e ação de estudo gratuita',()=>{
 for(const file of ['planos/artigos/simulados-policia-penal-mt.html','planos/artigos/o-que-estudar-policia-penal-mt.html']){
  const html=read(file);
  assert.match(html,/application\/ld\+json/);
  assert.match(html,/Questão autoral|questão autoral|exercício autoral|Essa é uma questão autoral/i);
  assert.ok(html.includes('href="../../?cadastro=1#inicio"'));
  assert.ok(html.length>5500);
 }
});
test('biblioteca conecta os guias ao público e a apresentação conserva aviso legal',()=>{
 const list=read('planos/artigos/index.html');
 assert.ok(list.includes('href="./simulados-policia-penal-mt.html"'));
 assert.ok(list.includes('href="./o-que-estudar-policia-penal-mt.html"'));
 assert.match(read('planos/index.html'),/sem vínculo com órgão público/i);
});
