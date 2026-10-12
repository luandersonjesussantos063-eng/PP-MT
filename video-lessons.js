import {CURATED_VIDEO_LESSONS} from './video-catalog.js?v=2.20.6';

// Combinação determinística por disciplina e assunto da questão; sem IA nem custo por acesso.
// Quando o tópico não corresponde a nenhuma aula, mantém-se a pesquisa no YouTube.
function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').replace(/[<>"']/g, '').trim().slice(0, 130);
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function normalize(value) {
  return clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
function includesKeyword(text, keyword) {
  // Evita ativação por fragmentos curtos ou substrings involuntárias.
  const term=normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp('(?:^|[^a-z0-9])'+term+'(?=$|[^a-z0-9])','i').test(text);
}
export function findCuratedVideoLesson(question) {
  if (!question) return null;
  const subject=normalize(question.subject);
  // Enunciados/alternativas não participam do match: podem mencionar conceitos distratores.
  const topic=normalize([question.topic,question.syllabusTopic].filter(Boolean).join(' | '));
  if (!subject || !topic) return null;
  const video=CURATED_VIDEO_LESSONS.find(item=>
    normalize(item.subject)===subject &&
    Array.isArray(item.keywords) &&
    item.keywords.some(keyword=>includesKeyword(topic,keyword)) &&
    /^[\w-]{11}$/.test(item.videoId)
  );
  return video ? {...video,url:'https://www.youtube.com/watch?v='+video.videoId} : null;
}
export function videoLessonSearch(question) {
  const subject=clean(question?.subject) || 'Concurso público';
  const topic=clean(question?.topic) || clean(question?.syllabusTopic) || subject;
  const detail=topic.toLocaleLowerCase('pt-BR')===subject.toLocaleLowerCase('pt-BR')
    ? clean(question?.syllabusTopic) : '';
  const query=[topic,detail,subject,'videoaula para concurso'].filter(Boolean).join(' ').slice(0,240);
  return {subject,topic,query,url:'https://www.youtube.com/results?search_query='+encodeURIComponent(query)};
}
export function videoLessonForErrorHTML(question,selected) {
  if(!Number.isInteger(selected) || !question || selected===question.answer)return '';
  const search=videoLessonSearch(question);
  const match=findCuratedVideoLesson(question);
  const heading='<span class="video-lesson-label">▶ REFORÇO GRATUITO</span><b>Errou? Estude este assunto agora.</b>'+
    '<p>Assunto: <strong>'+escapeHTML(search.topic)+'</strong> · '+escapeHTML(search.subject)+'</p>';
  if(!match) {
    return '<aside class="video-lesson-card" aria-label="Buscar videoaula deste assunto">'+heading+
      '<p>Não há aula selecionada para este tema no catálogo ainda.</p>'+
      '<a class="button video-lesson-action" href="'+escapeHTML(search.url)+'" target="_blank" rel="noopener noreferrer">▶ Buscar aulas sobre este assunto ↗</a>'+
      '<small>Resultados do YouTube não verificados. Confira o professor e a atualização do conteúdo.</small></aside>';
  }
  return '<aside class="video-lesson-card" aria-label="Videoaula selecionada para este assunto">'+heading+
    '<span class="video-lesson-curated">AULA SELECIONADA PELO ASSUNTO</span>'+
    '<strong class="video-lesson-title">'+escapeHTML(match.title)+'</strong>'+
    '<p>Canal: '+escapeHTML(match.channel)+'</p>'+
    '<div class="video-lesson-actions"><a class="button video-lesson-action" href="'+escapeHTML(match.url)+'" target="_blank" rel="noopener noreferrer">▶ Assistir videoaula ↗</a>'+
    '<a class="button secondary video-lesson-other" href="'+escapeHTML(search.url)+'" target="_blank" rel="noopener noreferrer">Outras aulas ↗</a></div>'+
    '<small>Link e tema conferidos em '+match.checkedAt.split('-').reverse().join('/')+' pelo título/descrição; a aula não foi integralmente auditada. Em legislação, confira a norma vigente e o edital.</small></aside>';
}
