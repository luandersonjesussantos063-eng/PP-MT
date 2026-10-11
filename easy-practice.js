// Exercícios autorais muito simples. Não são questões oficiais e não alteram XP/gabarito.
// Usar somente explicações de fatos consolidados; não inferir legislação a partir do gabarito.
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const item=(statement,options,answer,explanation)=>({statement,options,answer,explanation});
const TOPICS=[
 {id:'autarquia',when:/\bautarqui/,title:'Autarquias',intro:'Imagine que o Estado criou uma instituição com tarefas próprias, como cuidar de uma atividade pública específica.',
  questions:[
   item('Uma autarquia faz parte de qual grupo da Administração Pública?',['Administração direta','Administração indireta','Uma empresa privada qualquer'],1,'Uma autarquia é uma entidade da Administração indireta. Pense nela como uma instituição pública separada da estrutura central do governo.'),
   item('Como uma autarquia é criada no Brasil?',['Por lei específica','Por postagem nas redes sociais','Por contrato entre vizinhos'],0,'A criação de uma autarquia depende de lei específica. Ela é pessoa jurídica de direito público.')]},
 {id:'concessao',when:/\bembora\b|concessiv|ainda que|mesmo que/,title:'Concessão: o “mesmo assim”',intro:'“Embora estivesse chovendo, fui à escola.” Choveu, mas a ida à escola aconteceu.',
  questions:[
   item('“Embora esteja frio, vou brincar.” A pessoa vai brincar?',['Sim, apesar do frio','Não, porque está frio','A frase não fala de brincar'],0,'“Embora” mostra um obstáculo que NÃO impede a ação. É como dizer: “Está frio, mas vou brincar mesmo assim”.'),
   item('Qual palavra pode ter o mesmo sentido de “embora” em uma concessão?',['Porque','Mesmo que','Portanto'],1,'“Mesmo que” também introduz concessão. Algo pode dificultar, mas não impede o outro fato.')]},
 {id:'conotacao',when:/conotac|denotac|sentido figurado|sentido literal/,title:'Sentido literal e figurado',intro:'Literal é o que as palavras dizem de verdade; figurado é uma imagem para transmitir uma ideia.',
  questions:[
   item('“Pedro está com o coração de pedra.” O coração dele é uma pedra de verdade?',['Sim','Não, é modo de dizer que ele é insensível','Ele não tem coração'],1,'Não existe um coração feito de pedra nessa frase. A expressão tem sentido figurado.'),
   item('“O cachorro está dormindo no tapete.” A frase está em qual sentido?',['Literal','Figurado','É uma metáfora'],0,'A frase descreve uma situação possível e direta: o cachorro pode mesmo dormir no tapete.')]},
 {id:'motivo-objeto',when:/motivo e objeto|objeto e motivo|elementos do ato administrativo|atos administrativos|ato administrativo/,title:'Motivo e objeto do ato',intro:'Imagine que a escola suspendeu uma aula porque faltou energia. Motivo é “por quê”; objeto é “o que foi decidido”.',
  questions:[
   item('A escola suspendeu a aula porque acabou a luz. Qual foi o motivo?',['A falta de energia','A suspensão da aula','O nome da escola'],0,'Motivo é a situação de fato e de direito que justifica a decisão. Aqui foi a falta de energia.'),
   item('No mesmo exemplo, qual foi o efeito imediato da decisão (objeto)?',['Choveu ontem','A aula foi suspensa','A luz acabou'],1,'O objeto é o efeito jurídico imediato do ato, isto é, o que ele produziu.')]},
 {id:'poder-policia',when:/poder de policia|policia administrativa/,title:'Poder de polícia administrativa',intro:'Pense em uma fiscalização que impede alguém de vender alimento estragado. A regra protege a saúde de todos.',
  questions:[
   item('Por que a fiscalização pode limitar uma atividade privada?',['Para proteger o interesse público, conforme a lei','Porque qualquer fiscal pode fazer o que quiser','Para evitar qualquer comércio'],0,'O poder de polícia permite limitar ou condicionar atividades e direitos dentro da lei para proteger a coletividade.'),
   item('Fiscalizar as condições sanitárias de um restaurante é exemplo típico de:',['Polícia administrativa','Investigação de homicídio','Decisão judicial penal'],0,'A fiscalização sanitária é uma atividade de polícia administrativa; não é investigação criminal.')]},
 {id:'trafico',when:/\btrafico\b|hediond|inafiancavel|imprescritivel/,title:'Três palavras diferentes na lei',intro:'Não confunda três palavras: inafiançável (não cabe fiança), imprescritível (o tempo não elimina a punição) e insuscetível de anistia (não cabe esse perdão).',
  questions:[
   item('Quando a lei diz que um crime é “inafiançável”, o que significa?',['Não cabe fiança','Nunca será julgado','Não pode ter investigação'],0,'Inafiançável significa que não se pode obter liberdade por meio de fiança. Isso não é o mesmo que ser imprescritível.'),
   item('“Imprescritível” está relacionado principalmente a quê?',['Ao prazo e à passagem do tempo','Ao uniforme do agente','À cor do fórum'],0,'Imprescritibilidade diz respeito à ausência de prescrição pelo tempo. Não transforme inafiançável em imprescritível: são conceitos diferentes.')]},
 {id:'extradicao',when:/extradic/,title:'Extraditar é entregar a outro país',intro:'Extradição é quando um país entrega uma pessoa a outro para responder a processo ou cumprir pena, observadas regras legais.',
  questions:[
   item('Extradição envolve, em geral:',['Dois países e a entrega de uma pessoa','Duas escolas e uma prova','Uma multa de trânsito municipal'],0,'É uma cooperação entre Estados. Antes de responder uma questão jurídica, verifique nacionalidade, crime e limitações legais.'),
   item('Em um problema de extradição, o que você deve identificar primeiro?',['A nacionalidade e a situação da pessoa','A cor do passaporte','O horário da notícia'],0,'A nacionalidade e a natureza do caso ajudam a identificar quais regras constitucionais e legais se aplicam.')]},
 {id:'logica',when:/proposic|tabela verdade|raciocinio logico|equivalencia logica|conectivo logico|negacao logica/,title:'Verdadeiro ou falso',intro:'Pense em V como uma frase verdadeira e F como uma frase falsa. Vamos praticar com exemplos conhecidos.',
  questions:[
   item('A frase “2 + 2 = 4” é:',['Verdadeira (V)','Falsa (F)','Impossível de avaliar'],0,'Some dois mais dois: dá quatro. Portanto a frase é verdadeira e recebe V.'),
   item('A frase “Todo cachorro é um peixe” é:',['Verdadeira (V)','Falsa (F)','Verdadeira só à noite'],1,'Cachorros não são peixes. Logo a afirmação é falsa: F. Uma sequência V/F exige avaliar cada frase separadamente.')]},
 {id:'negacao',when:/negacao|negar uma afirmac|nega-se a proposic/,title:'Negar uma frase',intro:'Negar é dizer que uma afirmação não aconteceu ou não é verdadeira.',
  questions:[
   item('Qual é a negação de “Está chovendo”?',['Não está chovendo','Está chovendo muito','Talvez chova amanhã'],0,'A negação direta muda o valor de verdade: se chove, a frase “não chove” é falsa.'),
   item('Qual é a negação de “Todos os livros são azuis”?',['Pelo menos um livro não é azul','Nenhum livro existe','Todos os livros são vermelhos'],0,'Para negar “todos”, basta existir pelo menos uma exceção. Não é necessário que nenhum seja azul.')]},
 {id:'roubo-furto',when:/\broubo\b|\bfurto\b|latrocin/,title:'Furto, roubo e violência',intro:'A diferença básica entre furto e roubo é o emprego de violência ou grave ameaça à pessoa.',
  questions:[
   item('Alguém pega escondido um objeto alheio, sem violência ou ameaça. O caso lembra mais:',['Furto','Roubo','Um empréstimo autorizado'],0,'Em termos simples, no furto não se usa violência ou grave ameaça à pessoa. Os detalhes legais do caso devem ser avaliados.'),
   item('Alguém ameaça uma pessoa para retirar seu celular. O caso lembra mais:',['Roubo','Furto sem ameaça','Achado de objeto perdido'],0,'A grave ameaça contra a pessoa é um elemento que distingue o roubo do furto.')]},
 {id:'dolo-culpa',when:/\bdolo\b|culpa consciente|culpa inconsciente|crime culposo|crime doloso/,title:'Dolo e culpa',intro:'De forma simplificada, dolo envolve vontade de realizar o crime ou assumir o risco; culpa envolve imprudência, negligência ou imperícia, quando prevista.',
  questions:[
   item('Uma pessoa quer deliberadamente realizar um fato proibido. Isso se aproxima de:',['Dolo','Sorteio','Acaso sem ação humana'],0,'Dolo envolve vontade ou, conforme o caso, assumir conscientemente o risco do resultado.'),
   item('Dirigir de modo imprudente, sem querer causar uma lesão, pode envolver:',['Culpa, conforme o tipo penal e as circunstâncias','Sempre dolo direto','Um contrato de compra'],0,'A imprudência pode caracterizar culpa. Em direito penal, é necessário avaliar o tipo legal e os fatos.')]},
 {id:'administracao-direta',when:/administracao direta|administracao indireta|orgao publico/,title:'Quem faz parte da Administração?',intro:'Pense no governo com seus órgãos e também em entidades criadas para tarefas específicas.',
  questions:[
   item('Uma secretaria estadual faz parte, em regra, de qual administração?',['Direta','Indireta, como uma autarquia','Empresa particular'],0,'Secretarias são órgãos integrados à estrutura do ente político e fazem parte da Administração direta.'),
   item('Uma autarquia é exemplo de:',['Administração indireta','Administração direta','Grupo informal de amigos'],0,'Autarquias têm personalidade jurídica própria e pertencem à Administração indireta.')]},
 {id:'lep',when:/lei de execucao penal|regime semiaberto|regime fechado|regime aberto|colonia agricola|estabelecimento penal/,title:'Regimes de cumprimento da pena',intro:'Os regimes fechado, semiaberto e aberto têm características diferentes previstas em lei.',
  questions:[
   item('Na Lei de Execução Penal, a colônia agrícola ou industrial é destinada, em regra, a qual regime?',['Semiaberto','Aberto exclusivamente','Sempre prisão provisória'],0,'A LEP relaciona a colônia agrícola, industrial ou similar ao cumprimento da pena em regime semiaberto.'),
   item('O regime fechado é, em regra, cumprido em:',['Penitenciária','Residência particular sem condições','Biblioteca pública'],0,'A LEP prevê penitenciária para o condenado em regime fechado.')]},
 {id:'direitos-humanos',when:/direitos humanos|dignidade humana|dignidade da pessoa|direitos fundamentais/,title:'Direitos e dignidade',intro:'Direitos humanos partem da ideia de que todas as pessoas têm dignidade e merecem respeito.',
  questions:[
   item('Os direitos humanos pertencem somente a pessoas ricas?',['Não, são universais','Sim, somente a pessoas ricas','Somente a quem faz concurso'],0,'Universalidade significa que os direitos humanos são reconhecidos a todas as pessoas.'),
   item('Respeitar a dignidade humana significa:',['Tratar pessoas como merecedoras de respeito','Humilhar quem é diferente','Ignorar completamente as garantias legais'],0,'A dignidade humana protege o valor de cada pessoa.')]},
 {id:'porcentagem',when:/porcentagem|percentual|\b\d+\s*%/,title:'Porcentagem é uma parte de 100',intro:'10% quer dizer 10 a cada 100. É como separar 10 balas de um pote com 100 balas.',
  questions:[
   item('Quanto é 10% de 100?',['10','50','90'],0,'10% significa 10 de cada 100. Portanto 10% de 100 é 10.'),
   item('Metade de 100 equivale a:',['50%','5%','100%'],0,'Metade é uma de duas partes iguais: 50 em 100, isto é, 50%.')]},
 {id:'phishing',when:/phishing|golpe digital|seguranca da informacao|engenharia social/,title:'Golpes digitais',intro:'Um golpe digital pode tentar enganar você para entregar senhas ou dados.',
  questions:[
   item('Você recebeu uma mensagem pedindo sua senha por um link estranho. Qual atitude é mais segura?',['Não informar a senha e verificar a origem','Digitar a senha imediatamente','Encaminhar sua senha aos amigos'],0,'Nunca informe a senha em links suspeitos. Confirme a autenticidade pelos canais oficiais.'),
   item('Uma mensagem falsa que imita o banco para roubar dados é chamada frequentemente de:',['Phishing','Backup','Atualização do teclado'],0,'Phishing é uma fraude que tenta capturar dados por meio de mensagens e páginas enganosas.')]},
 {id:'backup',when:/\bbackup\b|copia de seguranca|armazenamento na nuvem/,title:'Backup é uma cópia de segurança',intro:'Imagine ter uma cópia do dever de casa em outro caderno. Se perder o primeiro, ainda tem a cópia.',
  questions:[
   item('Qual é o objetivo principal de um backup?',['Recuperar dados se os originais forem perdidos','Deixar a tela maior','Aumentar o volume'],0,'Um backup serve para restaurar dados em caso de perda, falha ou dano.'),
   item('Guardar uma cópia importante em outro local é:',['Uma prática de segurança','Uma forma de apagar todos os arquivos','Uma atualização de som'],0,'Uma cópia independente ajuda quando o aparelho original falha.')]},
 {id:'interpretacao',when:/interpretacao de texto|compreensao textual|inferencia textual/,title:'Ler somente o que o texto permite',intro:'Para responder, procure pistas no próprio texto, sem inventar informações.',
  questions:[
   item('O texto diz: “Ana levou um guarda-chuva.” Podemos afirmar com certeza que choveu?',['Não, o texto não disse isso','Sim, obrigatoriamente','Sim, durante a noite'],0,'Levar guarda-chuva não prova que choveu. O texto não contou isso.'),
   item('O texto diz: “Carlos chegou antes de Rita.” Quem chegou primeiro?',['Carlos','Rita','Não há como saber'],0,'A expressão “antes de” mostra a ordem. Carlos chegou primeiro.')]},
 {id:'portugues-pronomes',when:/pronome obliquo|colocacao pronominal|pronomes pessoais/,title:'Pronomes substituem nomes',intro:'Em vez de repetir “Ana” muitas vezes, podemos usar palavras que fazem referência a ela.',
  questions:[
   item('Na frase “Ana chegou. Ela sorriu.”, “ela” substitui:',['Ana','A palavra chegou','Uma cidade'],0,'O pronome “ela” retoma “Ana”, evitando a repetição do nome.'),
   item('Qual palavra é um pronome pessoal?',['Nós','Mesa','Caderno'],0,'“Nós” é pronome pessoal e indica o grupo que inclui quem fala.')]},
 {id:'principios',when:/principios da administracao|moralidade administrativa|impessoalidade|publicidade administrativa|legalidade/,title:'Princípios da Administração',intro:'O servidor não decide tudo só porque quer: a atuação pública deve respeitar regras e princípios.',
  questions:[
   item('Se um agente público age porque a lei autoriza, qual princípio está em destaque?',['Legalidade','Sorte','Preferência pessoal'],0,'A legalidade exige que a Administração atue conforme o ordenamento jurídico.'),
   item('Escolher alguém apenas por amizade, sem observar os critérios legais, contraria especialmente:',['Impessoalidade','Pontualidade','Ortografia'],0,'A impessoalidade impede o favorecimento pessoal indevido na atuação administrativa.')]},
 {id:'teoria-sistemas',when:/retroaliment|feedback|teoria de sistemas|entrada.*saida/,title:'Entrada, processo e resultado',intro:'Pense numa máquina de suco: entra fruta, ela é processada e sai suco.',
  questions:[
   item('Na máquina de suco, a fruta colocada primeiro é:',['Entrada','Saída','Feedback'],0,'Entrada é aquilo que colocamos primeiro no sistema. Na máquina de suco, as frutas são a entrada.'),
   item('Verificar se o suco saiu bom e ajustar a máquina é um exemplo de:',['Retroalimentação (feedback)','Entrada apenas','Fingir que nada aconteceu'],0,'Feedback mostra como ficou o resultado e ajuda a corrigir o processo, como provar o suco e ajustar a receita.')]},
];
const FALLBACK={
 id:'leitura-guiada',title:'Treino de leitura da questão',
 intro:'Ainda não há uma questão infantil revisada para este assunto específico. Vamos treinar a forma de pensar, sem inventar uma regra.',
 questions:[
  item('Antes de responder uma questão difícil, o que você deve procurar?',['O que o comando realmente pede','A alternativa mais longa','A letra que saiu na questão anterior'],0,'Primeiro descubra se a questão quer a opção correta, a incorreta ou uma exceção. Isso evita erros de distração.'),
  item('Uma alternativa diz “sempre” e outra diz “às vezes”. O que é importante fazer?',['Verificar se a regra admite exceções','Marcar “sempre” sem ler','Escolher a alternativa maior'],0,'Palavras absolutas mudam a regra. Sempre confirme o conteúdo estudado antes de decidir.')
 ]
};

export function easySimilarLesson(question){
 const subject=normalize(question?.subject);
 const topic=normalize(question?.topic);
 const statement=normalize(question?.statement);
 const options=normalize((question?.options||[]).join(' '));
 const full=topic+' '+statement+' '+options;
 // Questões de V/F podem tratar de Direito, Português etc. Só usar lógica se a
 // disciplina ou o enunciado realmente pedir raciocínio lógico.
 for(const lesson of TOPICS){
  if(lesson.id==='logica'){
   if((/raciocinio logico|logica proposicional|logica matematica/.test(subject+' '+topic) ||
      /proposic|tabela verdade|equivalencia logica|conectivo logico/.test(topic+' '+statement)) &&
      lesson.when.test(subject+' '+full))return lesson;
   continue;
  }
  if(lesson.id==='interpretacao'&&/direito|administrac|informatica|raciocinio/.test(subject))continue;
  if(lesson.when.test(full))return lesson;
 }
 return FALLBACK;
}
export function validateEasyLesson(lesson){
 return !!lesson&&Array.isArray(lesson.questions)&&lesson.questions.length>=2&&
 lesson.questions.every(x=>x.statement&&x.options?.length>=2&&
 Number.isInteger(x.answer)&&x.answer>=0&&x.answer<x.options.length&&x.explanation);
}
