import {easySimilarLesson} from './easy-practice.js?v=2.20.2';
// Exercícios infantis / passo a passo, autorais, sem IA externa nem nova cota.
// Não alteram o gabarito ou a pontuação da questão original.
const easy=(topic,example,choices,answer,why,bridge)=>({
 topic,statement:example,options:choices,answer,explanation:why,bridge,source:'authorial'
});
const LESSONS=[
 {
  match:q=>q.options?.some(o=>/^\s*[VF](?:\s*[-–—,]\s*[VF]){1,}/i.test(String(o)))||
    /(?:proposiç|valor(?:es)? lógic|sequência de verdadeiro|verdadeiro e falso)/i.test(q.topic||''),
  items:[
   easy('Verdadeiro e falso','Leia duas frases: 1) Uma semana tem 7 dias. 2) Um triângulo tem 4 lados. Qual é a sequência?',
    ['V – V','V – F','F – V'],1,
    'Primeira frase: verdadeira, pois a semana tem 7 dias. Segunda frase: falsa, pois um triângulo tem 3 lados. Portanto, V – F.',
    'Na questão original, leia uma afirmação por vez. Só monte a sequência no final.'),
   easy('Verdadeiro e falso','Leia: 1) O número 3 é maior que 8. 2) O número 2 é menor que 5. Qual é a sequência?',
    ['F – V','V – F','V – V'],0,
    '3 não é maior que 8: F. Já 2 é menor que 5: V. A sequência correta é F – V.',
    'Não tente escolher a alternativa antes de julgar todas as frases.')
  ]
 },
 {
  match:q=>/crase/i.test([q.topic,q.syllabusTopic].join(' ')),
  items:[
   easy('Crase','Qual frase está escrita corretamente?',['Vou à escola.','Vou há escola.','Vou a à escola.'],0,
    'Quem vai, vai a algum lugar. “Escola” aceita o artigo a. As duas letras a se juntam: à.','Experimente trocar “escola” por “colégio”: vou ao colégio.'),
   easy('Crase','Qual frase NÃO usa crase?',['Comecei a estudar.','Cheguei à escola.','Voltei à cidade.'],0,
    'Antes de um verbo, como “estudar”, não existe o artigo feminino a. Por isso, não se escreve à estudar.','Pergunte se o a está antes de um verbo.')
  ]
 },
 {
  match:q=>/concess|embora|ainda que/i.test(q.topic||''),
  items:[easy('Concessão','Complete: “___ estivesse chovendo, fomos brincar”.',['Embora','Porque','Para'],0,
   '“Embora” indica algo que poderia atrapalhar, mas não impediu a ação. Choveu e, mesmo assim, fomos brincar.','Pense em “mesmo assim” ao ler uma oração concessiva.')]
 },
 {
  match:q=>/conota|denota|sentido figurado|figuras de linguagem/i.test(q.topic||''),
  items:[easy('Sentido literal ou figurado','A frase “Meu coração é de pedra” quer dizer que o coração é feito de pedra?',['Não, é uma figura de linguagem.','Sim, é uma descrição literal.'],0,
    'Uma pessoa não tem coração de pedra. A frase comunica que ela parece insensível.','Pergunte: isso pode acontecer literalmente? Se não, pode ser conotação.')]
 },
 {
  match:q=>/autarquia|administra.{0,8}indireta/i.test(q.topic||''),
  items:[easy('Administração indireta','Uma autarquia faz parte de qual grupo?',['Administração Indireta.','Administração Direta.'],0,
    'A autarquia é uma pessoa jurídica de direito público criada por lei, com estrutura própria. Por isso, integra a Administração Indireta.','Imagine um órgão como parte do mesmo corpo; a autarquia possui personalidade jurídica própria.')]
 },
 {
  match:q=>/poder de pol[ií]cia|pol[ií]cia administrativa/i.test(q.topic||''),
  items:[easy('Poder de polícia','A vigilância sanitária exige higiene de um restaurante. Isso é exemplo de quê?',
    ['Polícia administrativa.','Investigação de um crime pelo delegado.'],0,
    'O Estado pode limitar certas atividades para proteger a coletividade. Exigir higiene é um exemplo de polícia administrativa.','Nem todo poder de polícia envolve policial armado ou crime.')]
 },
 {
  match:q=>/habeas corpus|\bhc\b/i.test(q.topic||''),
  items:[easy('Habeas corpus','Uma pessoa tem sua liberdade de ir e vir ameaçada ilegalmente. Qual instrumento é relacionado a isso?',
    ['Habeas corpus.','Apenas reclamação na escola.'],0,
    'O habeas corpus protege a liberdade de locomoção diante de violência ou coação ilegal.','Lembre: habeas corpus = proteger o direito de ir e vir.')]
 },
 {
  match:q=>/voto|sufr[aá]gio|direitos pol[ií]ticos/i.test(q.topic||''),
  items:[easy('Direito de votar','Uma pessoa com 17 anos pode votar no Brasil?',
    ['Sim, mas o voto é facultativo.','Não, votar só é permitido a partir de 18 anos.'],0,
    'A partir dos 16 anos já se pode votar. Entre 16 e 17, o voto é facultativo.','Separe idade mínima para votar de idade do voto obrigatório.')]
 },
 {
  match:q=>/motivo e objeto|elementos do ato administrativo|ato administrativo/i.test(q.topic||''),
  items:[easy('Motivo e objeto','Um fiscal multa um motorista porque ele estacionou onde era proibido. O estacionamento irregular é o quê?',
    ['O motivo da multa.','O objeto da multa.'],0,
    'O motivo é o fato que explica por que o ato foi praticado. O objeto é o efeito produzido, como a multa.','Motivo = por quê? Objeto = o que o ato produz?')]
 },
 {
  match:q=>/planejamento|previs[aã]o|monitoramento|diagn[oó]stico estrat[eé]gico/i.test(q.topic||''),
  items:[easy('Planejamento','Uma equipe pensa: “Amanhã vamos organizar os turnos para atender mais pessoas”. Isso é:',
    ['Planejamento.','Apenas contar algo que já ocorreu.'],0,
    'Planejar é decidir antes o que será feito. O grupo está preparando uma ação futura.','Prever é imaginar o que pode ocorrer; planejar é escolher o que fazer.')]
 },
 {
  match:q=>/teoria de sistemas|feedback|retroalimenta|entrada e sa[ií]da/i.test(q.topic||''),
  items:[easy('Entrada, processamento e saída','Numa padaria, a farinha entra, o padeiro prepara e o pão fica pronto. O pão pronto é:',
    ['A saída do sistema.','A entrada do sistema.'],0,
    'Entrada: farinha. Processamento: preparo. Saída: pão pronto.','Pense numa máquina: o que entra, o que acontece e o que sai.')]
 },
 {
  match:q=>/porcentagem|percentual/i.test(q.topic||''),
  items:[easy('Porcentagem','Se você tem 10 balas e dá metade, quantas balas deu?',
    ['5 balas.','10 balas.','2 balas.'],0,
    'Metade é 50%. Cinquenta por cento de 10 corresponde a 5.','Comece encontrando 50% ou 10% de números pequenos.')]
 },
 {
  match:q=>/negaç[aã]o|tabela.?verdade|conectivo|l[oó]gica proposicional/i.test(q.topic||''),
  items:[easy('Negação','Se alguém afirma “Todos os alunos chegaram”, qual frase mostra que isso é falso?',
    ['Pelo menos um aluno não chegou.','Todos os alunos chegaram cedo.'],0,
    'Para a frase “todos chegaram” ser falsa, basta encontrar um aluno que não chegou.','A negação de “todos” não precisa ser “nenhum”.')]
 },
 {
  match:q=>/predicativo|sujeito|predicado/i.test(q.topic||''),
  items:[easy('Predicativo','Em “A criança ficou feliz”, a palavra “feliz” indica:',
    ['Um estado da criança.','O nome de um lugar.'],0,
    '“Feliz” diz como a criança ficou. É uma característica/estado atribuído ao sujeito.','Pergunte: essa palavra está falando de quem?')]
 }
];
const valid=q=>q&&Array.isArray(q.options)&&q.options.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length;
const simpleText=x=>String(x??'').replace(/\s+/g,' ').trim();
/**
 * Sempre devolve um exercício de duas ou três opções; se não existe um
 * exemplo editorial do mesmo tópico, adapta UMA questão com gabarito conhecido.
 * Nunca inventa regra jurídica a partir de palavras avulsas nem atribui
 * pontos/XP à prática guiada.
 */
export function createEasySimilar(q,related=null,attempt=0){
 const topic=[q?.topic,q?.syllabusTopic].filter(Boolean).join(' ');
 const target={...q,topic};
 const lesson=LESSONS.find(item=>item.match(target));
 // Antes de reduzir a questão original a duas alternativas, apresentar
 // exercícios concretos do mesmo conceito, com linguagem acessível e feedback.
 const easyLesson=easySimilarLesson(q);
 if(easyLesson.id!=='leitura-guiada'){
  const index=Math.abs(Math.trunc(Number(attempt)||0))%easyLesson.questions.length;
  const example=easyLesson.questions[index];
  return {...example,id:'easy:'+String(q?.id||'unknown')+':concept:'+easyLesson.id+':'+index,
   topic:easyLesson.title,bridge:easyLesson.intro,kind:'easy',mode:'curated',source:'authorial'};
 }
 if(lesson){
  const index=Math.abs(Number(attempt)||0)%lesson.items.length;
  return {...lesson.items[index],id:'easy:'+String(q?.id||'unknown')+':'+index,kind:'easy',mode:'curated'};
 }
 const base=valid(related)?related:valid(q)?q:null;
 if(base){
  const wrong=base.options.map((_,i)=>i).filter(i=>i!==base.answer);
  const alternative=wrong[Math.abs(Number(attempt)||0)%wrong.length];
  const swap=(Number(attempt)||0)%2===1;
  const options=swap?[simpleText(base.options[alternative]),simpleText(base.options[base.answer])]:
                     [simpleText(base.options[base.answer]),simpleText(base.options[alternative])];
  return {
   id:'easy:'+String(base.id||'unknown')+':'+attempt,kind:'easy',mode:'two-choice',
   topic:simpleText(base.topic||q?.topic||q?.subject||'Treino guiado'),
   statement:'Nesta versão mais fácil, você só precisa comparar duas alternativas. Qual delas responde corretamente à pergunta original?',
   originalStatement:simpleText(base.statement),
   options,answer:swap?1:0,
   explanation:simpleText(base.lesson?.reasoning||base.explanation||
     'Compare a alternativa escolhida com o enunciado e o gabarito comentado da questão original.'),
   bridge:'Faça em 3 passos: 1) leia o comando; 2) compare as duas respostas; 3) escolha a que atende exatamente ao pedido.',
   source:'adapted'
  };
 }
 return {
  id:'easy:reading:'+attempt,kind:'easy',mode:'strategy',
  topic:'Entendendo uma questão',
  statement:'Quando uma questão parece difícil, qual é o primeiro passo para começar?',
  options:['Ler o comando e descobrir o que ele pede.','Marcar uma letra sem ler.'],
  answer:0,source:'strategy',
  explanation:'Você começa entendendo o pedido. Depois procura a regra ou informação que resolve a pergunta.',
  bridge:'Esta questão não tem informações suficientes para gerar um exemplo do mesmo tema com segurança. Vamos praticar o primeiro passo da leitura.'
 };
}
