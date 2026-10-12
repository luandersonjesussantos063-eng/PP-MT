// A pesquisa é construída a partir dos metadados da questão.
// Nenhum vídeo é recomendado como verificado e nenhuma API/chave é necessária.
function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').replace(/[<>"']/g, '').trim().slice(0, 130);
}
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
export function videoLessonSearch(question) {
  const subject = clean(question?.subject) || 'Concurso público';
  const topic = clean(question?.topic) || clean(question?.syllabusTopic) || subject;
  const detail = topic.toLocaleLowerCase('pt-BR') === subject.toLocaleLowerCase('pt-BR')
    ? clean(question?.syllabusTopic)
    : '';
  const query = [topic, detail, subject, 'videoaula para concurso'].filter(Boolean).join(' ').slice(0, 240);
  return {
    subject, topic,
    query,
    url: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query)
  };
}
export function videoLessonForErrorHTML(question, selected) {
  if (!Number.isInteger(selected) || !question || selected === question.answer) return '';
  const lesson = videoLessonSearch(question);
  return '<aside class="video-lesson-card" aria-label="Videoaula para revisar este erro">' +
    '<span class="video-lesson-label">▶ REFORÇO GRATUITO</span>' +
    '<b>Errou? Estude este assunto agora.</b>' +
    '<p>Videoaulas sobre <strong>' + escapeHTML(lesson.topic) + '</strong> · ' +
    escapeHTML(lesson.subject) + '</p>' +
    '<a class="button video-lesson-action" href="' + escapeHTML(lesson.url) +
    '" target="_blank" rel="noopener noreferrer">▶ Encontrar aula no YouTube ↗</a>' +
    '<small>Abre uma busca sobre o assunto, não um vídeo verificado pelo PP-MT. Confira o professor, o edital e a atualização do conteúdo.</small>' +
    '</aside>';
}
