import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {easySimilarLesson,validateEasyLesson} from '../easy-practice.js';
import {createEasySimilar} from '../easy-similar.js';
const q=(subject,topic,statement,options=[])=>({subject,topic,statement,options,id:'exemplo-original'});

const subjects=[
 ['Direito Administrativo','Autarquia municipal','Uma autarquia é integrante de qual administração?','autarquia'],
 ['Língua Portuguesa','Orações concessivas','Embora tenha estudado, errou.','concessao'],
 ['Língua Portuguesa','Conotação e denotação','O que é sentido figurado?','conotacao'],
 ['Direito Administrativo','Elementos do ato administrativo','Analise o motivo de um ato administrativo.','motivo-objeto'],
 ['Direito Administrativo','Poder de polícia','A fiscalização exerce poder de polícia.','poder-policia'],
 ['Direito Constitucional','Crimes hediondos','O crime de tráfico é inafiançável?','trafico'],
 ['Direito Constitucional','Extradição','O Brasil pode extraditar?','extradicao'],
 ['Raciocínio Lógico','Sequências','Determine a sequência correta de V ou F.','logica'],
 ['Direito Penal','Dolo e culpa','Dolo direto ou culpa?','dolo-culpa'],
 ['Direito Penal','Furto ou roubo','Houve grave ameaça no roubo.','roubo-furto'],
 ['Execução Penal','Regime semiaberto','Estabelecimento colônia agrícola.','lep'],
 ['Direitos Humanos','Dignidade humana','Proteção dos direitos humanos.','direitos-humanos'],
 ['Matemática','Porcentagem','Qual o valor de 10% de 100?','porcentagem'],
 ['Informática','Phishing','O que fazer com uma mensagem phishing?','phishing'],
 ['Informática','Backup','Para que serve backup?','backup'],
 ['Português','Interpretação de texto','Que conclusão é permitida pelo texto?','interpretacao'],
 ['Português','Pronomes oblíquos','Como identificar os pronomes pessoais?','portugues-pronomes'],
 ['Administração Pública','Legalidade','Quais os princípios da administração?','principios'],
 ['Administração','Teoria de sistemas','O que é retroalimentação?','teoria-sistemas']
];
for(const [subject,topic,statement,expected] of subjects){
 test('microtreino pertinente e completo: '+expected,()=>{
  const lesson=easySimilarLesson(q(subject,topic,statement));
  assert.equal(lesson.id,expected);
  assert.equal(validateEasyLesson(lesson),true);
  for(const item of lesson.questions){
   assert.ok(item.statement.length>=15);
   assert.ok(item.explanation.length>=45);
   assert.ok(new Set(item.options).size===item.options.length);
  }
 });
}
test('não confundir questões V/F de Direito com raciocínio lógico',()=>{
 const lesson=easySimilarLesson(q('Direito Constitucional','Controle de constitucionalidade',
  'Analise as afirmações. Assinale a sequência correta.', ['F – V – F','V – F – F']));
 assert.notEqual(lesson.id,'logica');
 assert.equal(validateEasyLesson(lesson),true);
});
test('lógica proposicional aceita sequências F – V – F sem revelar a alternativa original',()=>{
 const original=q('Raciocínio Lógico','Proposições','Analise e assinale a sequência correta.',['F – V – F','V – F – F']);
 const lesson=easySimilarLesson(original);
 assert.equal(lesson.id,'logica');
 assert.ok(lesson.questions.every(x=>!x.statement.includes('F – V – F')));
});
test('assuntos ainda não curados oferecem orientação honesta em vez de inventar uma lei',()=>{
 const lesson=easySimilarLesson(q('Conhecimentos Específicos','Tratado desconhecido de outro planeta',
   'Qual é a regra exata do planeta Zed?'));
 assert.equal(lesson.id,'leitura-guiada');
 assert.match(lesson.intro,/não há uma questão infantil revisada/);
 assert.equal(validateEasyLesson(lesson),true);
});
test('sem gabarito original conhecido, microtreino continua funcionando',()=>{
 const lesson=easySimilarLesson(q('Português','Conotação','Identifique linguagem figurada.'));
 assert.equal(lesson.id,'conotacao');
 assert.ok(lesson.questions.every(x=>Number.isInteger(x.answer)));
});

test('Questão parecida oferece duas versões infantis no mesmo tópico',()=>{
 const q={id:'questao-autarquia-001',subject:'Direito Administrativo',topic:'Autarquia',
  statement:'Qual é a natureza jurídica de uma autarquia?',options:['Privada','Pessoa jurídica pública','Órgão municipal'],answer:1};
 const first=createEasySimilar(q,null,0),second=createEasySimilar(q,null,1);
 assert.equal(first.mode,'curated');assert.equal(second.mode,'curated');
 assert.notEqual(first.statement,second.statement);
 assert.match(first.bridge,/instituição|Estado/);
 assert.ok(first.options[first.answer]);
 assert.equal(first.source,'authorial');
 assert.ok(!first.statement.includes(q.statement));
});
test('UI segue funcional e a versão publica ambos arquivos',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const easy=readFileSync(new URL('../easy-similar.js',import.meta.url),'utf8');
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 const deploy=readFileSync(new URL('../.github/workflows/deploy.yml',import.meta.url),'utf8');
 assert.match(easy,/easySimilarLesson\(q\)/);
 assert.match(app,/showEasySimilar\(q,similar\)/);
 assert.match(app,/similar:0/);
 assert.match(sw,/easy-practice\.js\?v=2\.20\.2/);
 assert.match(deploy,/easy-similar\.js easy-practice\.js/);
});
