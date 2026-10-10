# PPMT Premium — V 2.13.0

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
