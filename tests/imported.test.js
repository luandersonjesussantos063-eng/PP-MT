import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {OFFICIAL_QUESTIONS,MT_QUESTIONS} from '../official.js';
import {QUESTIONS} from '../data.js';
import {IMPORTED_EXAMS} from '../imported-exams.js';
import {IMPORTED_SOURCE_TOTAL,EXAM_SOURCES} from '../exam-sources.js';
import {validateBank} from '../core.js';
const root=new URL('../',import.meta.url);
test('banco completo é válido, sem IDs repetidos e preserva as 57 questões de MT',()=>{
 assert.equal(validateBank([...QUESTIONS,...OFFICIAL_QUESTIONS]).length,402);
 assert.equal(MT_QUESTIONS.length,57);
 assert.equal(OFFICIAL_QUESTIONS.length,384);
 assert.equal(IMPORTED_SOURCE_TOTAL,384);
 assert.equal(EXAM_SOURCES.filter(e=>e.state==='AL').length,1);
});
test('cadernos completos têm as quantidades e anulações dos gabaritos',()=>{
 for(const [id,total,annulled] of [['es-2013-sejus',50,[]],['ba-2024-seap',80,[]],['rs-2022-susepe',80,[24]],['al-2021-seris',120,[2,118]]]){
  const qs=OFFICIAL_QUESTIONS.filter(q=>q.source.examId===id);
  assert.deepEqual(qs.map(q=>Number(q.source.number)),Array.from({length:total},(_,i)=>i+1).filter(n=>!annulled.includes(n)));
  for(const q of qs){assert.equal(q.displayMode,'inline');assert.equal(q.options.length,id==='al-2021-seris'?2:5)}
 }
});
test('mudança no gabarito definitivo BA e itens conhecidos são preservados',()=>{
 const at=(id)=>OFFICIAL_QUESTIONS.find(q=>q.id===id);
 assert.equal(at('ba-2024-seap-003').answer,1); // Preliminar C; definitivo B.
 assert.equal(at('rs-2022-susepe-001').answer,2); // Cargo 2, não administrativo.
 assert.equal(at('es-2013-sejus-001').answer,1); // Agente, versão 1.
 assert.equal(at('al-2021-seris-001').answer,1); // E mantém ID e histórico.
 assert.equal(at('al-2021-seris-120').answer,1);
});
test('figuras, textos de apoio e PDFs estão presentes no pacote publicado',()=>{
 for(const q of OFFICIAL_QUESTIONS.filter(q=>q.source.examId)){
  assert.ok(q.statement.length>10);
  for(const asset of [...q.facsimile,...q.contextImages||[]])assert.ok(existsSync(new URL(asset,root)),asset);
  for(const key of ['examUrl','answerUrl'])assert.ok(existsSync(new URL('./'+q.source[key].split('/PP-MT/')[1],root)));
 }
 for(const id of ['es-2013-sejus-001','es-2013-sejus-045','rs-2022-susepe-001','al-2021-seris-033','al-2021-seris-089']){
  const q=OFFICIAL_QUESTIONS.find(q=>q.id===id);assert.ok(q.context.length>20);assert.ok(q.contextImages.length);
 }
 assert.match(OFFICIAL_QUESTIONS.find(q=>q.id==='es-2013-sejus-018').statement,/1\/3/);
});
test('corpus não contém cabeçalhos misturados às alternativas',()=>{
 for(const q of OFFICIAL_QUESTIONS.filter(q=>q.source.examId))for(const o of q.options)assert.doesNotMatch(o,/(?:Matemática|Atualidades|conhecimentos específicos|Lei de Execução Penal|Define os Crimes de Tortura)$/);
});
test('todos os módulos importados são incluídos no cache inicial',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 for(const name of ['official-al-2021.js','official-es-2013-sejus.js','official-ba-2024-seap.js','official-rs-2022-susepe.js','imported-exams.js'])assert.ok(sw.includes(name),name);
});
