import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validNewsFeed,loadNewsFeed,newsItemsHTML,officialNewsURL} from '../concurso-news.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const feed=JSON.parse(read('assets/news/concurso.json'));
const target='https://www.sejus.mt.gov.br/w/governador-otaviano-pivetta-convoca-mais-283-policiais-penais-e-anuncia-novo-concurso';
test('autorizacao oficial aparece na central de noticias com a data historica correta',()=>{
 assert.ok(validNewsFeed(feed));
 const item=feed.items.find(x=>x.url===target);
 assert.ok(item,'Documento oficial verificado deve estar cadastrado');
 assert.equal(item.kind,'novo-concurso');
 assert.equal(item.publishedAt,'2026-06-09');
 assert.ok(Date.parse(item.firstSeenAt)>Date.parse(item.publishedAt));
 assert.match(item.excerpt,/autorizou um novo concurso/);
 assert.match(item.excerpt,/Não se trata da publicação do edital/);
 assert.equal(officialNewsURL(item.url),target);
 const html=newsItemsHTML(feed);
 assert.match(html,/09\/06\/2026/);
 assert.match(html,/autorizou um novo concurso/);
});
test('feed recuperado chega a usuarios mesmo com noticia publicada ha meses',async()=>{
 const storage={getItem:()=>null,setItem:()=>{}};
 const result=await loadNewsFeed({fetcher:async()=>({ok:true,json:async()=>feed}),storage});
 assert.equal(result.offline,false);
 assert.ok(result.feed.items.some(x=>x.url===target));
 const file=read('notifications.js');
 assert.match(file,/n.firstSeenAt\|\|n.publishedAt/);
 assert.match(file,/Publicação oficial de /);
});
test('dispatch do push le tres origens e evita notificar noticia falsa',()=>{
 const source=read('supabase/functions/ppmt-push-dispatch/index.ts');
 assert.match(source,/ppmt\.novabytesolucoes\.com\.br\/assets\/news\/concurso\.json/);
 assert.match(source,/raw\.githubusercontent\.com\/luandersonjesussantos063-eng\/PP-MT\/main\/assets\/news\/concurso\.json/);
 assert.match(source,/Date\.parse\(newsItem\.firstSeenAt\)/);
 assert.match(source,/Date\.parse\(sub\.created_at\)/);
 assert.match(source,/ppmt_push_deliveries/);
 assert.doesNotMatch(source,/PPMT_WEBHOOK_SECRET|MP_ACCESS_TOKEN_PROD/);
});
