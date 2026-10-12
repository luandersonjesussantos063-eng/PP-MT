// Catálogo inicial curado manualmente em 2026-10-12.
// Foi conferida a correspondência entre assunto e título/descrição publicados;
// não é auditoria integral das aulas ou garantia de disponibilidade permanente.
// Para cadastrar mais aulas, forneça ID, disciplina, palavras-chave e fonte.
export const CURATED_VIDEO_LESSONS = [
  {id:'pt-crase', subject:'Língua Portuguesa', keywords:['crase'],
    videoId:'yUpRa62vcSI', title:'Crase - Aula 01 | Professor Noslen', channel:'Professor Noslen'},
  {id:'pt-concordancia', subject:'Língua Portuguesa', keywords:['concordancia verbal','concordancia em'],
    videoId:'jdqhnVUvqOc', title:'Como dominar a concordância verbal para concursos', channel:'Prof. Álvaro Ferreira'},
  {id:'mt-biomas', subject:'História e Geografia de Mato Grosso', keywords:['biomas','bioma','cerrado','pantanal','amazonia'],
    videoId:'uHYgh89B67w', title:'O que é Bioma e quais são os 6 Biomas brasileiros?', channel:'IBGE Explica'},
  {id:'etica-moral', subject:'Ética e Filosofia', keywords:['etica, moral','etica e moral','etica, valores','etica moral','consciencia critica'],
    videoId:'dcg0o-jB2MA', title:'Ética e moral: diferença, conceito e exemplos', channel:'Saber em Foco'},
  {id:'adm-funcoes', subject:'Administração Geral', keywords:['planejar, organizar, dirigir e controlar','funcoes administrativas','processo administrativo: planejamento','planejamento, organizacao','planejamento e controle'],
    videoId:'KbH16qemQNs', title:'Funções administrativas: planejamento, organização, direção e controle', channel:'Prof. Marcelo Soares'},
  {id:'const-remedios', subject:'Direito Constitucional', keywords:['remedios constitucionais','habeas corpus','habeas data','mandado de seguranca','mandado de injuncao','acao popular'],
    videoId:'sWny-GrwamU', title:'Remédios constitucionais: teoria — parte 1', channel:'Lac Concursos'},
  {id:'const-direitos', subject:'Direito Constitucional', keywords:['direitos fundamentais','garantias fundamentais','direitos e garantias','artigo 5','art. 5'],
    videoId:'7CAnfYpu81k', title:'Direitos e garantias fundamentais | Artigo 5º para concursos', channel:'DR. DIREITO'},
  {id:'d-adm-delegacao', subject:'Direito Administrativo', keywords:['delegacao e avocacao','competencia, delegacao','delegacao, autoridade','avocacao'],
    videoId:'ZCfBI-SkK4A', title:'Processo administrativo: delegação e avocação (Lei 9.784)', channel:'zero duvidis'},
  {id:'d-adm-principios', subject:'Direito Administrativo', keywords:['principios da administracao','principios expressos','limpe','legalidade, impessoalidade'],
    videoId:'FIghHQZw9MQ', title:'Como aplicar os princípios da Administração Pública?', channel:'Focus Concursos'},
  {id:'penal-flagrante', subject:'Direito Penal e Processual Penal', keywords:['prisao em flagrante','hipoteses legais do flagrante','especies de flagrante'],
    videoId:'dnFWpSW1ryU', title:'Prisão em flagrante: espécies (CPP)', channel:'Simplificando Direito Penal — Prof. Rafael'},
  {id:'penal-crime', subject:'Direito Penal e Processual Penal', keywords:['teoria do crime','fato tipico','ilicitude e culpabilidade','exclusao da ilicitude','excludentes de ilicitude'],
    videoId:'VgvFkFK1XOk', title:'Direito Penal do ZERO para concursos (teoria do crime)', channel:'Estratégia Concursos'},
  {id:'dh-dudh', subject:'Direitos Humanos', keywords:['declaracao universal','direitos humanos universais','dudh'],
    videoId:'ZKMcthDdSh0', title:'Declaração Universal dos Direitos Humanos de 1948', channel:'Tribo Concursos'},
  {id:'leg-lai', subject:'Legislação Básica', keywords:['lei de acesso a informacao','lei 12.527','lei 12527','lai'],
    videoId:'1brRNNT-eSo', title:'Direito Administrativo: Lei de Acesso à Informação', channel:'Carranza Cursos'}
].map(video => Object.freeze({...video, checkedAt:'2026-10-12'}));
