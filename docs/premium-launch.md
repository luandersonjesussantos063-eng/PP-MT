# PPMT Premium — V 2.13.1

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

## Integração de testes (V 2.13.1)

- Página técnica de homologação em `planos/teste.html`. Não é checkout comercial. Somente testadores com cadastro aprovado em `billing_sandbox_testers` podem acessar a função de teste.
- Função `ppmt-billing-test` com `verify_jwt = true` e confirmação de usuário no servidor; lógica versionada em `supabase/functions/ppmt-billing-test/`. A credencial de teste fica no banco/segredo do Supabase, nunca no GitHub.
- A assinatura de teste é conferida no Mercado Pago com vendedor/comprador de teste, valor de R$ 19,90, BRL, frequência mensal e `live_mode = false` para pagamentos aprovados.
- Criar uma assinatura de teste **não modifica** a tabela `memberships`. Teste aprovado não equivale a liberação Premium.
- Não aplicar ainda limite gratuito de 10 questões/dia. O acervo atual está estático e disponível em cache; o paywall real exige conteúdo entregue por backend após autorização.
- Para iniciar o teste, o administrador deverá incluir seu usuário de login PPMT na lista de testadores (mediante confirmação da conta) e possuir comprador de teste separado. Não usar cartão real.
