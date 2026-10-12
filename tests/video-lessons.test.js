import test from 'node:test';
import assert from 'node:assert/strict';
import {findCuratedVideoLesson,videoLessonForErrorHTML,videoLessonSearch} from '../video-lessons.js';
import {CURATED_VIDEO_LESSONS} from '../video-catalog.js';

const wrong=q=>videoLessonForErrorHTML({...q,answer:0},1);
test('catálogo tem links do YouTube bem formados e metadados não vazios',()=>{
 assert.ok(CURATED_VIDEO_LESSONS.length>=12);
 const ids=new Set();
 for(const v of CURATED_VIDEO_LESSONS){
  assert.match(v.videoId,/^[\w-]{11}$/);
  assert.ok(v.id && v.subject && v.title && v.channel && v.keywords.length);
  assert.ok(!ids.has(v.id)); ids.add(v.id);
 }
});
test('prioriza videoaula selecionada no assunto exato e não só a busca',()=>{
 const html=wrong({subject:'Língua Portuguesa',topic:'Crase: regência e artigo'});
 assert.match(html,/Crase - Aula 01/);
 assert.match(html,/watch\?v=yUpRa62vcSI/);
 assert.match(html,/Outras aulas/);
 assert.doesNotMatch(html,/não há aula selecionada/i);
});
test('aulas separadas por disciplina evitam associação errada',()=>{
 const q={subject:'Direito Administrativo',topic:'Competência, delegação e avocação na Lei 9.784'};
 assert.equal(findCuratedVideoLesson(q)?.videoId,'ZCfBI-SkK4A');
 assert.equal(findCuratedVideoLesson({subject:'Direito Constitucional',topic:q.topic}),null);
 assert.equal(findCuratedVideoLesson({subject:'Língua Portuguesa',topic:'Capitania e Vila Bela'}),null);
 assert.equal(findCuratedVideoLesson({subject:'Direitos Humanos',topic:'Convenção Americana: integridade e custódia'}),null);
});
test('cobre casos de matérias distintas incluindo acentos',()=>{
 const cases=[
  ['Direito Constitucional','Garantias e remédios constitucionais','sWny-GrwamU'],
  ['História e Geografia de Mato Grosso','Biomas de Mato Grosso','uHYgh89B67w'],
  ['Ética e Filosofia','Ética, moral e consciência crítica','dcg0o-jB2MA'],
  ['Administração Geral','Planejar, organizar, dirigir e controlar','KbH16qemQNs'],
  ['Direito Penal e Processual Penal','Prisão em flagrante: hipóteses legais','dnFWpSW1ryU'],
  ['Direitos Humanos','Declaração Universal dos Direitos Humanos','ZKMcthDdSh0'],
  ['Legislação Básica','Lei de Acesso à Informação','1brRNNT-eSo']
 ];
 for(const [subject,topic,videoId] of cases){
  assert.equal(findCuratedVideoLesson({subject,topic})?.videoId,videoId,topic);
 }
});
test('mantém busca genérica para tópico sem vídeo selecionado',()=>{
 const q={subject:'História e Geografia de Mato Grosso',topic:'Capitania e Vila Bela',answer:0};
 const html=videoLessonForErrorHTML(q,2);
 assert.equal(findCuratedVideoLesson(q),null);
 assert.match(html,/results\?search_query=/);
 assert.match(html,/Não há aula selecionada/);
});
test('não mostra recomendação antes de responder, nem para acertos',()=>{
 const q={subject:'Língua Portuguesa',topic:'Crase',answer:0};
 assert.equal(videoLessonForErrorHTML(q,0),'');
 assert.equal(videoLessonForErrorHTML(q,undefined),'');
 assert.equal(videoLessonForErrorHTML(q,null),'');
 assert.equal(videoLessonForErrorHTML(null,2),'');
});
test('sanitiza conteúdos exibidos e não permite XSS',()=>{
 const html=wrong({subject:'Língua Portuguesa',topic:'<img src=x onerror=alert(1)> Crase'});
 assert.doesNotMatch(html,/<img/);
 assert.doesNotMatch(html,/onclick=/);
 assert.match(html,/img src=x onerror=alert\(1\)/);
});
test('busca alternativa contém assunto e disciplina codificados',()=>{
 const search=videoLessonSearch({subject:'Direito Constitucional',topic:'Direitos fundamentais'});
 assert.equal(new URL(search.url).hostname,'www.youtube.com');
 assert.match(decodeURIComponent(search.url),/Direitos fundamentais/);
});
