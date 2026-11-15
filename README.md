# PMMG — Missão Farda

Migração do PP-MT em 14/11/2026. Mantidos domínio `ppmt.novabytesolucoes.com.br`, GitHub Pages, projeto Supabase, login, RLS, sincronização, administração e identificador Android `br.com.novabytesolucoes.ppmt`. Não foram alterados segredos, funções de pagamento ou permissões.

205 questões válidas em 214 itens disponíveis: 180 do acervo principal (2018, 2021, 2023 e 2024) e 34 questões complementares selecionadas de 2015 e 2017. Nove anuladas do acervo principal excluídas. As duas edições complementares são recortes, não provas completas; usam os gabaritos publicados da época, sem confirmação de versão posterior aos recursos. IDs, alternativas, gabaritos e reproduções preservados a partir do app PMMG no repositório nova-byte, commit cc96f5ed867e1ce2ba377552c4acb06079cb772b. Comentários individuais de resolução ainda não disponíveis.

As contas existentes continuam funcionando. Na primeira abertura, o estado PP-MT é arquivado integralmente em `legacyPPMT`, na mesma linha de user_state e nos backups, antes de iniciar o histórico PMMG. A rotina e preferências são preservadas. Nenhum dado de conta é excluído. Não se tenta importar automaticamente históricos do app `/questoes/`, pois têm outro formato e outra origem.

Os módulos de conteúdo PP-MT permanecem no git para recuperação, mas não entram no banco ativo. O monitor de notícias MT foi retirado do fluxo PMMG. O mapa de cobertura mostra disciplinas históricas; não afirma cobertura de edital futuro.

`npm test` valida a migração, banco, fontes e rotinas reutilizadas. Testes de conteúdo exclusivo MT ficam disponíveis com `npm run test:legacy`, para consulta histórica; suas expectativas não se aplicam ao produto PMMG.

`npm start` abre servidor local. A publicação usa `.github/workflows/deploy.yml`. O fluxo Android reutiliza Capacitor e gera um APK de teste PMMG. Um APK antigo empacotado exige reinstalação da nova versão. Os mecanismos existentes de assinatura/cotas permanecem no backend.

O banco exclusivo pago do PP-MT não foi convertido em PMMG. A página Premium identifica essa limitação e encaminha ao banco PMMG. Os serviços de cobrança e as assinaturas existentes foram preservados. Duas alternativas incompletas na transcrição de origem (2018/23 e 2024/46) foram conferidas e corrigidas pela reprodução original; gabaritos preservados.

## Identidade PMMG 3.0.1
Revisados nomes visíveis, metadados, notificações, ajuda e artigos. Paleta igual ao app PMMG anterior: azul #191d5e, vermelho #bb2127 e amarelo #ffcb05; fundos #101337 e painéis azuis. Preservados domínio, chaves de armazenamento, APIs e endereço real do fornecedor em MT.

## Interface simplificada 3.1.0
Tela inicial com um próximo passo, bloco recomendado de até 5 questões e plano recolhido. Navegação com Hoje, Estudar, Revisar, Progresso e Mais; extras em grupos recolhidos, busca opcional e menos saídas durante o estudo. Rotina pode ser ajustada depois do primeiro bloco. Sons novos ficam desligados por padrão; preferências explicitamente salvas continuam respeitadas. Contas, histórico, gabaritos, cotas e pagamentos preservados.

## Inicialização 3.1.1
O painel abre por `app-loader.js` e um pacote único `app.bundle.js`, gerado com `npm run build:app`. A tela inicial mostra carregamento e recuperação de erro, em vez de deixar a apresentação estática parecer o app. Login e painel disparam confirmação de inicialização. Teste de abertura usa os módulos reais, inclusive autenticação, sem simular seu módulo. Sem apagar armazenamento ou progresso.

## Interface do vídeo 3.2.0
Reutiliza a interface original Missão Farda em `missao/`, com abas Hoje, Questões, Trilha e Evolução. É exibida após o login existente, com armazenamento separado por conta e perfil, e sincronização em user_state.program.missaoFarda. Tentativas anteriores são convertidas em eventos na primeira escolha de perfil; originais preservados. Quotas continuam verificadas pelo serviço existente ao iniciar treinos. Controles Minha conta e Sair mantêm acesso à configuração anterior.

## Alternativas riscadas 3.2.1
Deslizar horizontalmente em qualquer direção elimina uma alternativa; repetir desfaz. Movimento vertical mantém a rolagem. Não marca respostas nem corrige questões. Riscos persistem na sessão por perfil/conta. Após correção, o gesto fica bloqueado. Teclado: Delete na alternativa focada.

## Recursos do PP-MT reconectados
Configurações agrupadas acessíveis pela engrenagem; rotina e escala 12×36, desempenho/horas, estudo guiado, revisões, simulados, videoaulas, backup, notificações e plano continuam no motor original. A nova tela usa os mesmos sons/preferências, ajuda tática (comando, armadilhas, aula curta, exemplo fácil e eliminação por XP), IA Premium acionada pelo aluno, favoritos por perfil e cronômetro persistente com prazo do simulado. Respostas novas são espelhadas de forma idempotente no histórico do motor anterior para manter XP e desempenho; históricos originais não são excluídos. Comentários e exercícios específicos de MT não são reclassificados como PMMG.

### Instalação no iPhone e iPad — 3.2.2
O botão Instalar fica disponível antes e depois do login. No iOS abre o guia Safari → Compartilhar → Adicionar à Tela de Início (ativar Abrir como App da Web quando disponível). Inclui cópia do endereço para sair de navegadores internos, detecção de iPad com agente de desktop e áreas seguras de tela. A distribuição atual é PWA, sem publicação na App Store.
