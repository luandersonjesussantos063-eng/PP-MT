export const EXAM_SOURCES = [
  {
    id:'sejudh-mt-2017-s05-t', state:'MT', year:2017, board:'IBADE',
    exam:'SEJUDH/MT — Agente Penitenciário Masculino', questionCount:57,
    status:'imported', verifiedOfficialSource:true,
    sourcePage:'https://ibade.org.br/concursos-anteriores/secretaria-de-estado-de-justica-e-direitos-humanos-sejudh-mt/provas-e-gabaritos/'
  },
  {
    id:'seap-ba-2024-t1', state:'BA', year:2024, board:'FGV',
    exam:'SEAP/BA — Agente Penitenciário — Tipo 1', questionCount:80,
    status:'verified-source', verifiedOfficialSource:true,
    sourcePage:'https://conhecimento.fgv.br/concursos/seapba24',
    examUrl:'https://conhecimento.fgv.br/sites/default/files/concursos/agente-penitenciariocnm-tipo-1.pdf',
    answerUrl:'https://conhecimento.fgv.br/sites/default/files/concursos/gabarito_definitivo_seapba.pdf',
    examDate:'2024-09-15', definitiveAnswerPublished:'2024-10-17',
    verification:'FGV oficial: caderno Tipo 1 com 80 questões e gabarito oficial definitivo publicados na página do concurso.',
    importNote:'Fonte e gabarito validados. Texto integral não importado automaticamente; aguarda base clara de reutilização ou material fornecido ao projeto.'
  },
  {
    id:'deppen-pr-2024', state:'PR', year:2024, board:'Instituto AOCP',
    exam:'Polícia Penal do Paraná — Policial Penal', questionCount:75,
    status:'verified-source', verifiedOfficialSource:true,
    sourcePage:'https://www.institutoaocp.org.br/concursos/604',
    verification:'Instituto AOCP oficial: página do Concurso Público nº 04/2024 da Polícia Penal do Paraná oferece cadernos de questões e gabarito definitivo.',
    importNote:'Fonte oficial validada. Questões não transcritas automaticamente sem base clara de reutilização.'
  },
  {
    id:'agepen-ms-2016-seguranca-custodia', state:'MS', year:2016, board:'FAPEMS',
    exam:'AGEPEN/MS — Agente Penitenciário Estadual — Segurança e Custódia', questionCount:80,
    usableQuestionCount:75, annulled:[19,21,23,52,53],
    status:'verified-source', verifiedOfficialSource:true,
    sourcePage:'https://www.agepen.ms.gov.br/governo-de-ms-divulga-gabarito-final-com-questoes-anuladas-de-concurso-publico-para-agente-penitenciario/',
    preliminaryAnswerUrl:'https://assets.imprensaoficial.ms.gov.br/public/prd/Diario%20Oficial/2016/04/11/DO9142_11_04_2016.pdf',
    examDate:'2016-04-03', definitiveAnswerPublished:'2016-05-04',
    verification:'AGEPEN/MS oficial: concurso organizado pela FAPEMS; gabarito preliminar oficial registra 80 questões para Segurança e Custódia. A AGEPEN publicou o gabarito final em 04/05/2016 e confirmou anulação das questões 19, 21, 23, 52 e 53 nessa área, restando 75 válidas.',
    importNote:'Fonte e anulações validadas em fontes oficiais. Texto integral da prova não importado automaticamente sem base clara de reutilização.'
  },
  {
    id:'pp-rs-2026', state:'RS', year:2026, board:'FUNDATEC',
    exam:'Polícia Penal do Rio Grande do Sul — Policial Penal', questionCount:80,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.pciconcursos.com.br/provas/download/policial-penal-policia-penal-rs-fundatec-2026'
  },
  {
    id:'seap-mg-2018', state:'MG', year:2018, board:'IBFC',
    exam:'SEAP/MG — Agente de Segurança Penitenciário', questionCount:50,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/ibfc-2018-seap-mg-agente-de-seguranca-penitenciario'
  },
  {
    id:'sjc-sc-2019', state:'SC', year:2019, board:'FEPESE',
    exam:'SJC/SC — Agente Penitenciário', questionCount:100,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/fepese-2019-sjc-sc-agente-penitenciario'
  },
  {
    id:'sejus-ce-2017', state:'CE', year:2017, board:'Instituto AOCP',
    exam:'SEJUS/CE — Agente Penitenciário', questionCount:60,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/instituto-aocp-2017-sejus-ce-agente-penitenciario'
  },
  {
    id:'sejuc-rn-2017', state:'RN', year:2017, board:'IDECAN',
    exam:'SEJUC/RN — Agente Penitenciário', questionCount:100,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/idecan-2017-sejuc-rn-agente-penitenciario'
  },
  {
    id:'segep-ma-2016', state:'MA', year:2016, board:'FUNCAB',
    exam:'SEGEP/MA — Agente Penitenciário', questionCount:80,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/funcab-2016-segep-ma-agente-penitenciario'
  },
  {
    id:'seplag-al-2021', state:'AL', year:2021, board:'CEBRASPE',
    exam:'Governo de Alagoas — Agente Penitenciário — SEPLAG', questionCount:120,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2021-governo-de-alagoas-al-agente-penitenciario-seplag'
  },
  {
    id:'seris-al-2021', state:'AL', year:2021, board:'CEBRASPE',
    exam:'SERIS/AL — Agente Penitenciário', questionCount:120,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/cespe-cebraspe-2021-seris-al-agente-penitenciario'
  },
  {
    id:'seap-pa-2021-m', state:'PA', year:2021, board:'CETAP',
    exam:'SEAP/PA — Policial Penal — Agente Penitenciário Masculino', questionCount:50,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/cetap-2021-seap-pa-policial-penal-agente-penitenciario-masculino'
  },
  {
    id:'seap-pa-2021-f', state:'PA', year:2021, board:'CETAP',
    exam:'SEAP/PA — Policial Penal — Agente Penitenciário Feminino', questionCount:50,
    status:'queued', verifiedOfficialSource:false,
    sourcePage:'https://www.qconcursos.com/questoes-de-concursos/provas/cetap-2021-seap-pa-policial-penal-agente-penitenciario-feminino'
  }
];

export const SOURCE_TOTAL = EXAM_SOURCES.reduce((sum, exam) => sum + exam.questionCount, 0);
export const IMPORTED_SOURCE_TOTAL = EXAM_SOURCES.filter(exam => exam.status === 'imported').reduce((sum, exam) => sum + exam.questionCount, 0);
