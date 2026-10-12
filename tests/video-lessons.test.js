import test from 'node:test';
import assert from 'node:assert/strict';
import {videoLessonForErrorHTML, videoLessonSearch} from '../video-lessons.js';

test('direciona a busca para o tema e a disciplina', () => {
 const q={subject:'Língua Portuguesa',topic:'Crase: regência e artigo',answer:0};
 const item=videoLessonSearch(q);
 assert.equal(new URL(item.url).hostname,'www.youtube.com');
 assert.match(decodeURIComponent(item.url),/Crase: regência e artigo/);
 assert.match(decodeURIComponent(item.url),/Língua Portuguesa/);
 assert.match(videoLessonForErrorHTML(q,1),/REFORÇO GRATUITO/);
});
test('não oferece videoaula automática para acertos, não respondidas ou ausência de questão', () => {
 const q={subject:'Direito Administrativo',topic:'Delegação e avocação',answer:2};
 assert.equal(videoLessonForErrorHTML(q,2),'');
 assert.equal(videoLessonForErrorHTML(q,undefined),'');
 assert.equal(videoLessonForErrorHTML(q,null),'');
 assert.equal(videoLessonForErrorHTML(null,1),'');
});
test('suporta temas incompletos e escapa conteúdos não confiáveis', () => {
 const html=videoLessonForErrorHTML({subject:'Informática',topic:'<img src=x onerror=alert(1)>',answer:1},0);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
 const url=videoLessonSearch({subject:'Informática'}).url;
 assert.match(decodeURIComponent(url),/Informática/);
 assert.doesNotMatch(html,/onclick=/);
});
