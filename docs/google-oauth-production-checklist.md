# Verificação do login Google — PP-MT v2.20.4

## O que foi corrigido no código
- Um só cliente Supabase (mesmo módulo `auth.js?v=2.20.4`) para login comum, login Google, checkout e treino Premium.
- Retorno OAuth e erros do provedor exibidos na tela de login em vez de falhar silenciosamente.
- Versões do JavaScript e cache do PWA renovados no GitHub Pages.

## Configuração obrigatória no painel Supabase (não disponível por este conector)
Em **Authentication → URL Configuration** do projeto `fermfbmhwlafwopwndoj`:
- **Site URL**: `https://ppmt.novabytesolucoes.com.br/`
- **Redirect URLs** (adicionar entradas exatas):
  - `https://ppmt.novabytesolucoes.com.br/`
  - `https://luandersonjesussantos063-eng.github.io/PP-MT/`
- Não usar `http://localhost:3000` como Site URL de produção.
- Salvar e testar em navegador normal. Redirect URL deve coincidir exatamente com a URL pedida em `signInWithOAuth`.

Em **Authentication → Providers → Google**, conferir se o provedor segue ligado.
No painel **Google Cloud → Credentials**, quando for necessário ajustar o client OAuth, o Authorized redirect URI do Google deve ser **Supabase**:
`https://fermfbmhwlafwopwndoj.supabase.co/auth/v1/callback`, e não o domínio do PP-MT.

## Diagnóstico
No histórico de `auth_logs`, foi observado `/authorize` com referer `https://ppmt.novabytesolucoes.com.br/` sem `/callback` correspondente em sequência, e houve login de desenvolvimento com referer `http://localhost:3000`. Isso sugere verificar o allowlist e o fluxo de retorno; não comprova, isoladamente, que o Site URL do projeto ainda está definido como localhost.

## Critério de aceitação
1. Abrir `https://ppmt.novabytesolucoes.com.br/` em janela anônima, clicar Google, selecionar a conta, voltar ao mesmo domínio e ver o painel autenticado.
2. Repetir na página Premium; verificar que o usuário termina em `/planos/premium.html`.
3. Repetir na página de pagamento; confirmar retorno a `/planos/assinar.html` **sem iniciar nenhuma cobrança**.
4. Verificar login por senha ainda funcional e PWA atualizado.
