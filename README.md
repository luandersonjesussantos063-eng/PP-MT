# PP MT — Central de estudos

Preparatório independente para a Polícia Penal de Mato Grosso, com questões históricas, missões, XP, ajuda tática, filtros, simulados, favoritos e revisão de erros. Interface responsiva em HTML, CSS e módulos JavaScript, publicada no GitHub Pages.

## Acervo em 07/10/2026

| Prova | Questões para treino | Gabarito e exclusões |
|---|---:|---|
| SEJUDH/MT 2017 · IBADE · S05 T | 57 | Definitivo; excluídas 16, 41 e 56 |
| SEJUS/ES 2013 · VUNESP · Agente · versão 1 | 50 | Documento fornecido; não identificado como definitivo no próprio PDF |
| SEAP/BA 2024 · FGV · Tipo 1 | 80 | Definitivo de 17/10/2024; questão 3 = B, substituindo C do preliminar |
| SUSEPE/RS 2022 · FUNDATEC · cargo 2 | 79 | Definitivo; excluída 24 |
| SERIS/AL 2021 · CEBRASPE | 118 | Definitivo; excluídas 2 e 118 |
| **Total real** | **384** | Mais 18 questões autorais identificadas |

Esta atualização acrescentou 318 questões: nove itens de AL já existiam e mantiveram seus IDs e respostas para preservar o histórico. Não altera os IDs das questões de MT nem o formato de backup versão 2.

O gabarito preliminar de Inspetor Penitenciário/ES 2023 veio sem o caderno correspondente neste lote. Não foi associado à prova de Agente/ES 2013. Outras provas localizadas continuam na fila, sem contarem como questões disponíveis.

## Leitura e correção

Enunciados e alternativas ficam no aplicativo. Textos compartilhados são associados aos itens que dependem deles. Recortes do original preservam gráficos, fórmulas, tirinhas, linhas numeradas e destaques; imagens podem ser ampliadas. PDFs e recortes deste lote são publicados com o site. Apenas cabeçalhos de rastreamento de download foram removidos dos PDFs, preservando identificação e créditos. Os hashes em `imported-exams.js` referem-se aos arquivos recebidos, antes dessa remoção.

A correção segue os gabaritos históricos. Não foi feita revisão da vigência jurídica atual. Legislação estadual de BA, ES, AL e RS corresponde ao respectivo concurso; não equivale à legislação de MT. Questões com gabarito definitivo anulado não entram em treino, simulados ou pontuação. O ES/2013 indica explicitamente a situação não confirmada do gabarito.

## Melhorias desta versão

- Filtros por prova no banco e nos simulados; pesquisa também por concurso e texto de apoio.
- Ações para estudar ou responder cada prova importada.
- Prova completa de MT e missão integral de MT limitadas às 57 questões de MT.
- Resultado exibido ao terminar uma prova do acervo; correção de itens C/E com o nome da resposta.
- Fontes completas no lote de AL; testes de MT separados dos testes do acervo nacional.
- Cache inclui todos os módulos de questões; versão atualizada para distribuir a mudança.
- Mensagem de confirmação de cadastro não é mais apagada ao alternar para login.

## Executar e testar

```sh
npm start
npm test
```

Python 3 para o servidor local, Node.js para os testes. Abra `http://localhost:8080`. Não é necessário instalar dependências de produção.

O workflow `.github/workflows/deploy.yml` testa e publica a branch `main` no Pages. Os arquivos de `assets/` são necessários para as fontes e imagens. A automação do repositório é de testes/publicação a cada push: **não há importador horário implementado neste código**.

## Reproduzir a importação

`tools/import_supplied_exams.py` usa Python, PyMuPDF, Pillow e `pdftotext`:

```sh
python tools/import_supplied_exams.py /caminho/dos/anexos /caminho/gabarito-definitivo-ba.pdf
```

A rotina confere quantidades, identifica o cargo correto dos gabaritos, exclui anuladas, preserva textos de apoio e gera módulos e recortes. Contém correções de transcrição verificadas nas páginas originais para frações, expoentes e texto em imagens. É específica para os quatro cadernos deste lote; não deve ser usada como extrator genérico sem revisão.

Fonte complementar da BA: https://conhecimento.fgv.br/concursos/seapba24 e https://conhecimento.fgv.br/sites/default/files/concursos/gabarito_definitivo_seapba.pdf.

## Progresso e limitações

Conta, sincronização e cache local são mantidos pela implementação existente de `auth.js`. Faça backups em **Meus dados**. A importação JSON pela interface é local ao usuário, não publica para todos. A versão 44 salva a sessão de simulado em andamento por conta, mantendo o prazo original. Estatísticas são de acertos simples, sem os pesos originais das bancas.

Os módulos básicos são armazenados para acesso offline; imagens e PDFs ficam disponíveis offline depois de abertos e armazenados pelo navegador. A autenticação inicial pode exigir internet. O cache não baixa todo o acervo de imagens e PDFs antecipadamente.

Projeto independente, sem vínculo com órgãos públicos. Provas históricas não representam o conteúdo de um edital futuro.

## Atualização 26 — rotina e aprendizagem

- Navegação principal: Hoje, Estudar, Revisar, Simulado e Progresso.
- Configuração por dias da semana ou escala 12×36, duração de plantão/folga, horário e data de prova opcional. Sessão curta de 10 minutos; faltas não geram dívida acumulada.
- Blocos com orientação, exemplo e prática. O bloco e as respostas ficam no estado da conta, permitindo retomada. Chutes entram na revisão.
- Revisões espaçadas em 1, 3, 7 e 14 dias, com tentativa antes da explicação nas revisões posteriores. Sem equivalente, leitura apenas agenda recuperação da questão original; não marca domínio.
- Simulados não revelam respostas durante a sessão e permitem trocar alternativas. Explicações básicas são gratuitas no treino; ajuda fica indisponível no simulado.
- Relatório distingue primeiras respostas sem ajuda, revisões posteriores e cobertura do acervo. Não estima chance de aprovação ou cobertura de edital futuro.
- Publicação inclui os ícones PNG necessários ao manifesto e ao iPhone.

### Auditoria e limites

Mantidos: fontes, questões históricas, textos de apoio, favoritos, backup e armazenamento por conta. Retirados do fluxo principal: missão obrigatória, bloqueios de treino e progresso fictício calculado por dias corridos.

O acervo ainda não é um curso completo: parte dos comentários é apenas orientação de resolução ou indicação do gabarito histórico. Não há revisão jurídica atualizada de todas as questões, explicação individual de todos os distratores, notificações de horário ou mapa validado de edital futuro. A seleção de questões relacionadas é aproximada e exige matéria, assunto e termos em comum. O cronômetro não mede atenção: conta apenas em estudo visível com interação recente e pausa manual. Sessões de estudo guiado e simulados são retomáveis; o relógio de prova continua correndo enquanto o app está fechado.

## Atualização 27 — comentários aprofundados de MT

As 57 questões válidas da prova MT/2017 têm conceito, raciocínio, análise individual das cinco alternativas, exemplo e pergunta de recuperação com resposta, além de fontes e ressalvas. Disponíveis no estudo guiado, na correção, na revisão e em **Mais → Comentários MT**, com pesquisa por assunto ou número. Os gabaritos oficiais foram preservados.

48 itens participam do treino regular. Os itens 11, 19, 22, 24, 25, 30, 34, 51 e 59 ficam apenas no acervo e na prova histórica explicitamente selecionada, por dados antigos, ambiguidades, insuficiência do gabarito ou verificação normativa pendente. Não entram na seleção automática, revisões, XP ou cobertura de aprendizagem. O histórico de respostas não é apagado. As ressalvas constam de cada comentário.

Comentários produzidos com assistência de IA; não são justificativas oficiais da banca nem revisão docente independente. A conferência das fontes não equivale a uma auditoria jurídica completa do acervo. Os demais estados ainda usam os comentários anteriores.

Para editar, altere `content/mt-2017-lessons.json` e `content/lesson-sources.json`, execute `python3 tools/build_lessons.py` e `npm test`. O módulo gerado `lessons.js` é publicado e armazenado no cache offline. Os testes verificam cobertura, integração, gabaritos e exclusão dos itens com ressalvas; não certificam a correção pedagógica do texto.

## Atualização 44 — conceitos, aplicação e continuidade

- 48 conceitos regulares de MT ligados explicitamente a 48 exercícios autorais de aplicação (`practice.js`), com situações diferentes, três alternativas, comentário e fontes herdadas da lição-base. Conteúdo com assistência de IA; exige revisão docente independente. As nove questões históricas com ressalvas não geram esses exercícios.
- O estudo guiado (`curriculum.js`) escolhe uma matéria pouco estudada e um conceito ainda não praticado ou menos recente. Explicação e prática ficam no mesmo conceito. Questões importadas sem classificação permanecem no banco livre, sem entrar nesses blocos. Não é um mapa completo do edital.
- Equivalências por conceito têm precedência sobre a busca textual aproximada. Sem equivalência, continua disponível a adaptação automática da versão 43, claramente identificada.
- Plano do dia mostra conceito, matéria, número de exercícios e orçamento de revisão: até cinco itens, reservando minutos para estudo. Uma revisão já percorrida no dia não prende o aluno no botão principal; o restante pode ser feito em outra rodada.
- Progresso por conceito apresenta estados de aprendizagem com contagem de respostas e tentativas posteriores. Leitura não marca domínio. Os exercícios autorais e adaptações são separados dos indicadores de respostas oficiais.
- Simulados são salvos por IDs, respostas, posição e prazo (`exam-session.js`). Ao sair ou recarregar, o tempo de prova continua correndo. Sessão com dados inválidos não é retomada. O descarte exige confirmação.
- Filtro adicional de referências explícitas a regras de outros estados no treino MT. É uma proteção parcial: o banco ainda exige classificação temática e revisão legislativa completa. Fontes históricas continuam disponíveis no acervo.

Verificação: testes de coerência dos blocos, equivalências, orçamento de revisão, estados de aprendizagem, serialização/restauração de simulados e fluxo de revisão. Verificação DOM com cadastro da rotina, plano, lição/exercício correspondente, progresso, recarga do simulado e conclusão da revisão. Não substitui avaliação docente ou teste visual em aparelhos reais.
