# PPMT Premium — V 2.14.0

## Entregue
- Página pública de apresentação em `planos/`, com cadastro, entrada no app, exemplo interativo e plano mensal previsto de R$ 19,90.
- Rota `#plano`, acessível em Mais > Meu plano e no menu lateral.
- Cadastro direcionado por `?cadastro=1`, preservando o login e o progresso existentes.
- Tabela `memberships` no projeto PP-MT, RLS de leitura apenas da própria conta e RPC `my_membership`, com vencimento calculado no servidor. Cliente não pode criar ou alterar assinaturas. DDL aplicado está em `database/membership.sql`.
- 98 testes existentes aprovados. Teste transacional do banco validou assinatura ativa, vencida, isolamento entre contas e ausência de escrita pelo aluno; dados de teste revertidos.

## Antes de vender — bloqueios reais
A cobrança NÃO está ativa. A página declara pré-lançamento; não coleta cartões nem aceita pagamentos.

1. Definir/conectar a conta recebedora e provedor de assinatura. Guardar credenciais exclusivamente no servidor.
2. Implementar checkout autenticado (preço e usuário definidos no servidor), confirmação assinada por webhook, idempotência, reconciliação com o provedor, cancelamento, atraso e reembolso.
3. Implementar entrega de conteúdo premium por API autenticada e limite gratuito atômico no servidor. O app atual é estático e distribui todo o banco em JavaScript e cache offline: NÃO possui paywall seguro. Não basta ocultar botões ou ler `premium` no navegador.
4. Definir a política de acesso offline após vencimento, preservando progresso. O conteúdo já distribuído publicamente não se torna secreto por adicionar login.
5. Publicar as condições finais de contratação, renovação e cancelamento e identificar o responsável comercial antes do checkout.
6. Validar em sandbox e realizar fluxo ponta a ponta de pagamento, liberação, vencimento e cancelamento antes de abrir vendas. Só então aplicar a regra gratuita de 10 questões/dia e alterar o texto de pré-lançamento.

## Verificação e limites
- Sem QA visual em navegador nesta sessão (plugin de controle de navegador indisponível).
- Advisor do Supabase: sem alerta novo de RLS. Aviso preexistente de proteção contra senhas vazadas desativada: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Esta versão não modifica `user_state` nem bloqueia os alunos existentes.

## Integração de testes (V 2.13.2)

- Página técnica de homologação em `planos/teste.html`. Não é checkout comercial. Somente testadores com cadastro aprovado em `billing_sandbox_testers` podem acessar a função de teste.
- Função `ppmt-billing-test` com `verify_jwt = true` e confirmação de usuário no servidor; lógica versionada em `supabase/functions/ppmt-billing-test/`. A credencial de teste fica no banco/segredo do Supabase, nunca no GitHub.
- A assinatura de teste é conferida no Mercado Pago com vendedor/comprador de teste, valor de R$ 19,90, BRL, frequência mensal e `live_mode = false` para pagamentos aprovados.
- Criar uma assinatura de teste **não modifica** a tabela `memberships`. Teste aprovado não equivale a liberação Premium.
- Não aplicar ainda limite gratuito de 10 questões/dia. O acervo atual está estático e disponível em cache; o paywall real exige conteúdo entregue por backend após autorização.
- Para iniciar o teste, o administrador deverá incluir seu usuário de login PPMT na lista de testadores (mediante confirmação da conta) e possuir comprador de teste separado. Não usar cartão real.

## V 2.13.2 — Identificação do comprador de teste
- Adicionada consulta somente leitura do usuário de teste comprador pelo ID fixo previamente configurado, usando token de teste protegido no Supabase.
- Requer sessão autenticada e liberação como testador; só exibe e-mail `@testuser.com` se a API confirmar que pertence ao comprador esperado.
- Se a API não fornecer o e-mail, o sistema informa a limitação sem inventar endereço. Nenhuma assinatura é criada por essa consulta.
- Cobranças comerciais e acessos Premium permanecem desativados.

## Piloto Pix real R$ 0,01 (preparado — NÃO ativado)

- Página /planos/pix.html com pagamento PIX único de R$ 0,01, não recorrente, usada exclusivamente para homologação real da integração.
- Função ppmt-pix-pilot exige JWT e inscrição na tabela de testadores existente. O checkout usa somente o e-mail verificado do PPMT, sem contas TESTUSER.
- O valor (0.01 BRL), destinatário, meio Pix e referência são impostos no backend. A criação usa X-Idempotency-Key estável baseado na tentativa registrada no banco; não recria cobrança se já houver uma.
- O status sempre é consultado pelo backend na API oficial e confere live_mode=true, recebedor, valor, moeda, referência, Pix e ausência de estorno. O cliente não ativa acesso Premium.
- A variável MP_ACCESS_TOKEN_PROD deve ser cadastrada em Edge Function Secrets no Supabase. A variável PIX_PILOT_ENABLED precisa ser exatamente true para habilitar; padrão desligado. NÃO inserir credenciais no GitHub, frontend ou chats. Se uma credencial foi compartilhada indevidamente, revogá-la e criar outra.
- O token de TESTE já existente no banco NÃO serve para cobrança real. É necessária chave Pix ativa na conta Mercado Pago.
- Somente após ter uma credencial REAL privada, confirmar a conta recebedora e verificar aceite do valor mínimo do Mercado Pago, liberar a ação de pagar.
- Não anunciar o curso inteiro por R$ 0,01: a operação é prova de integração, não compra de assinatura ou direito a curso. O preço futuro do Premium continua previsto em R$ 19,90/mês.
- Sem webhooks, sem entrega de conteúdo premium protegido e sem verificação ponta a ponta real até configurar e executar o piloto com permissão do responsável. Não abrir vendas públicas.


## V 2.14.0 — Mensalidade R$ 19,99 (implantação sem vendas públicas)

- Preço definido: PPMT Premium, R$ 19,99/mês.
- Cartão de crédito: cliente autoriza uma assinatura mensal automática no Mercado Pago (API /preapproval, frequência 1 mês). O portal permite cancelar cobranças futuras.
- Pix, boleto e cartão de débito: pagamento mensal manual por Checkout Pro (/checkout/preferences). Ao vencer, o aluno volta ao site e gera outra mensalidade por R$ 19,99. Débito não é recorrente automaticamente.
- A disponibilidade dos métodos no checkout depende da conta recebedora, do cliente e do Mercado Pago.
- O preço e comprador são definidos no servidor com autenticação. Existe proteção de repetição por pedido, confirmação por API, ledger com ID de transação, RPC idempotente para estender o Premium por um mês e suspensão diante de estorno ou contestação.
- Webhook com HMAC SHA256 obrigatório. Publicar ppmt-monthly-webhook com verify_jwt=false pois autentica por assinatura HMAC; nunca aceitar status somente do redirect ou do JSON recebido.
- No Supabase Secrets cadastrar MP_WEBHOOK_SECRET da aplicação no Mercado Pago. No painel Mercado Pago > aplicação > Webhooks, configurar URL: https://fermfbmhwlafwopwndoj.supabase.co/functions/v1/ppmt-monthly-webhook ; habilitar eventos payment, subscription_preapproval, subscription_authorized_payment disponíveis.
- Token de produção MP_ACCESS_TOKEN_PROD deve ficar somente no servidor, nunca em GitHub, frontend ou conversa.
- Vendas reais DESATIVADAS por duas flags (ambas devem ser true): PPMT_MONTHLY_BILLING_ENABLED e PPMT_PREMIUM_DELIVERY_READY. Somente ativar após validação completa do webhook, primeira transação e política de entrega Premium.
- O banco atual de questões ainda está publicado em JS e no cache offline. É necessário migrar funcionalidades e questões Premium ao backend autenticado antes de cobrar pelo acesso exclusivo. Não bloquear alunos gratuitos antes de implementar isso.
- Lembretes por e-mail requerem serviço transacional, cronograma de envio e consentimento. Por enquanto a renovação fica no site; não afirmar que e-mails já são enviados.
- Piloto Pix único de R$ 0,01 permanece separado das mensalidades, sem liberar Premium.
