import {OFFICIAL_QUESTIONS_ES_2013_SEJUS} from './official-es-2013-sejus.js';
import {OFFICIAL_QUESTIONS_BA_2024_SEAP} from './official-ba-2024-seap.js';
import {OFFICIAL_QUESTIONS_RS_2022_SUSEPE} from './official-rs-2022-susepe.js';
import {OFFICIAL_QUESTIONS_1} from './official-1.js';
import {OFFICIAL_QUESTIONS_2} from './official-2.js';
import {OFFICIAL_QUESTIONS_3} from './official-3.js';
import {OFFICIAL_QUESTIONS_4} from './official-4.js';
import {OFFICIAL_QUESTIONS_AL_2021} from './official-al-2021.js';

export const MT_EXAM={
  id:'sejudh-mt-2017-s05-t',
  title:'SEJUDH/MT • Agente Penitenciário',
  board:'IBADE',
  year:'2017',
  date:'12/02/2017',
  code:'S05',
  version:'T',
  exam:'SEJUDH/MT — Agente Penitenciário Masculino',
  examUrl:'https://ibade.org.br/wp-content/uploads/2026/05/S05-T.pdf',
  answerUrl:'https://ibade.org.br/wp-content/uploads/2026/05/Gabarito-Final-da-Prova-Objetiva-IBADE-1.pdf',
  landingUrl:'https://ibade.org.br/concursos-anteriores/secretaria-de-estado-de-justica-e-direitos-humanos-sejudh-mt/provas-e-gabaritos/',
  answerPage:13,
  reviewedAt:'2026-10-07',
  total:60,
  annulled:[16,41,56],
  sections:[
    {from:1,to:10,subject:'Língua Portuguesa'},
    {from:11,to:15,subject:'História e Geografia de Mato Grosso'},
    {from:16,to:20,subject:'Ética e Filosofia'},
    {from:21,to:28,subject:'Direito Constitucional'},
    {from:29,to:34,subject:'Administração'},
    {from:35,to:40,subject:'Direito Administrativo'},
    {from:41,to:48,subject:'Direito Penal e Processual Penal'},
    {from:49,to:54,subject:'Direitos Humanos'},
    {from:55,to:60,subject:'Legislação Básica'}
  ],
  examSha256:'73724b131a1a24fb11f7534dea274ef08ec7b118b93734c1487272cab90dbe09',
  answerSha256:'383f89b51efc4b43be217dfdaa6deabf7dbf8c33f4657a8238a331a517b35577'
};

export const OFFICIAL_QUESTIONS=[
  ...OFFICIAL_QUESTIONS_1,
  ...OFFICIAL_QUESTIONS_2,
  ...OFFICIAL_QUESTIONS_3,
  ...OFFICIAL_QUESTIONS_4,
  ...OFFICIAL_QUESTIONS_ES_2013_SEJUS,
  ...OFFICIAL_QUESTIONS_BA_2024_SEAP,
  ...OFFICIAL_QUESTIONS_RS_2022_SUSEPE,
  ...OFFICIAL_QUESTIONS_AL_2021
];

export const MT_QUESTIONS = OFFICIAL_QUESTIONS.filter(q => q.source.examUrl === MT_EXAM.examUrl);
