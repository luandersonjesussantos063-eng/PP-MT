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

Conta, sincronização e cache local são mantidos pela implementação existente de `auth.js`. Faça backups em **Meus dados**. A importação JSON pela interface é local ao usuário, não publica para todos. A sessão de simulado em andamento não é recuperada ao fechar a página. Estatísticas são de acertos simples, sem os pesos originais das bancas.

Os módulos básicos são armazenados para acesso offline; imagens e PDFs ficam disponíveis offline depois de abertos e armazenados pelo navegador. A autenticação inicial pode exigir internet. O cache não baixa todo o acervo de imagens e PDFs antecipadamente.

Projeto independente, sem vínculo com órgãos públicos. Provas históricas não representam o conteúdo de um edital futuro.
