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
    status:'queued', verifiedOfficialSource:true,
    sourcePage:'https://conhecimento.fgv.br/concursos/seapba24'
  },
  {
    id:'deppen-pr-2024', state:'PR', year:2024, board:'Instituto AOCP',
    exam:'Polícia Penal do Paraná — Policial Penal', questionCount:75,
    status:'queued', verifiedOfficialSource:true,
    sourcePage:'https://www.institutoaocp.org.br/concursos/604'
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
