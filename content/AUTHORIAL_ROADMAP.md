# Banco autoral PP-MT

Meta editorial: alcançar pelo menos 1.000 questões ativas para treino no aplicativo.

Em 08/10/2026, após o lote 2: 467 questões ativas, incluindo 150 questões autorais destes lotes. Nove questões históricas com ressalvas permanecem separadas do treino. Faltam 533 questões ativas para a meta. A contagem exclui provas disponíveis somente em PDF e perguntas geradas temporariamente durante a revisão.

## Lotes publicados

| Arquivo editável | Questões | Conceitos |
| --- | ---: | ---: |
| `authorial-mt-100.json` | 100 | 20 |
| `authorial-mt-050-lote2.json` | 50 | 10 |

## Critérios para os próximos lotes

- Usar o Anexo II do edital-base 01/2016/SEJUDH para classificar cada questão. Isso não prevê a composição do próximo edital.
- Priorizar os tópicos ainda sem treino guiado na cobertura do edital. História e Geografia de MT, Ética e Filosofia e normas estaduais precisam de novos grupos com fontes próprias.
- Escrever casos e alternativas distintos; trocar nomes ou números não basta para acrescentar uma nova questão editorial.
- Registrar fonte, data de conferência, resposta e comentário individual de cada alternativa.
- Nas normas históricas, conferir vigência; não atribuir automaticamente uma lei federal ao processo estadual.
- Separar autoria didática de questões oficiais; identificar a assistência de IA sem alegar revisão docente independente.
- Criar grupos com exemplo guiado e exercícios diferentes para revisão; manter IDs, alternativas e gabaritos já publicados.

Para compilar: `python3 tools/build_authorial.py`, `npm run build:syllabus` e `npm test`.
Novos lotes usam arquivos `authorial-mt-*-lote*.json` com `expectedCount`, identificadores de grupo inéditos e vínculos em `edital-mt-topics.json`. A ordenação das alternativas é independente por lote. Não há geração nem publicação automática de questões sem revisão editorial.
