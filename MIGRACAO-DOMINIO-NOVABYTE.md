# PP-MT — Migração segura para NovaByte Soluções

Status: **pré-configurado, aguardando DNS e autorizações de OAuth**.

## Endereço principal

- Atual (produzindo): `https://luandersonjesussantos063-eng.github.io/PP-MT/`
- Futuro: `https://ppmt.novabytesolucoes.com.br/`
- Site institucional NovaByte: `https://novabytesolucoes.com.br/` — **não alterar seu DNS raiz (@) nem CNAME principal**.

## 1. Apontamento DNS, no painel que administra novabytesolucoes.com.br

| Tipo | Nome / Host | Destino | TTL |
|---|---|---|---|
| CNAME | `ppmt` | `luandersonjesussantos063-eng.github.io` | Automático ou 3600 |

Não adicionar `https://`, `/PP-MT` ou barra final no destino. Se já existir algum registro com nome `ppmt`, verificar conflito antes de salvar.

## 2. Habilitar o domínio no GitHub Pages

Somente quando o DNS estiver configurado: acessar
`https://github.com/luandersonjesussantos063-eng/PP-MT/settings/pages`
em **Custom domain**, inserir **ppmt.novabytesolucoes.com.br** e salvar.

IMPORTANTE: **não criar CNAME no repositório antes do registro DNS e da autorização de OAuth estarem preparados**. GitHub Pages pode passar a redirecionar imediatamente o endereço antigo para o novo, interrompendo login e vendas. O GitHub gera um arquivo `CNAME` ao salvar se o Pages publicar a partir de uma branch.

Esperar a verificação DNS e a emissão do certificado para marcar **Enforce HTTPS**.

## 3. Autorizar login Google no novo endereço

- Google Cloud (cliente OAuth web) → Authorized JavaScript origins: acrescentar `https://ppmt.novabytesolucoes.com.br` e preservar a origem existente.
- No Google Cloud, **Authorized redirect URIs** continua `https://fermfbmhwlafwopwndoj.supabase.co/auth/v1/callback`.
- Supabase → Authentication → URL Configuration → Redirect URLs: acrescentar exatamente `https://ppmt.novabytesolucoes.com.br/`, sem remover o endereço anterior enquanto houver clientes instalados.
- Não publicar Client Secret em repositório, screenshots ou conversas.

O módulo `account-services.js` já deriva a URL de retorno de seu próprio endereço, preservando a tela de assinatura e o treino Premium após a autenticação.

## 4. Serviços preparados no Supabase

- `ppmt-monthly-billing` v23: CORS nas duas origens e retorno de Mercado Pago correspondente à origem que iniciou a compra.
- `ppmt-premium-practice` v10: autenticação Premium com JWT e CORS nas duas origens.
- `ppmt-pageview` v2: registra visualizações das duas origens.
- `ppmt-admin-dashboard` v2: aceita as origens confiáveis e mantém permissão administrativa.
- `ppmt-monthly-webhook`: HMAC de produção preservado; não precisa mudar callback de webhook.

**Não trocar automaticamente o endereço de produção antes de 1–3 estar verificado.**

## 5. Testes necessários após o DNS e GitHub Pages

1. Página nova abre em HTTPS, com CSS, imagens, JS e certificado válido.
2. Entrar pelo Google (cliente autorizado e URL de retorno no Supabase).
3. Entrar por e-mail/senha (mesma conta).
4. Progresso e Premium recuperados da conta Supabase.
5. Treino Grátis respeita 20 respostas no dia e um simulado na semana.
6. Treino Premium exclusivo abre, responde e retorna feedback.
7. Mensalidade abre checkout Mercado Pago e retorna ao **novo** domínio. Não pagar valor real apenas para depuração sem autorização.
8. Consultar status de assinatura e cancelamento pelo novo endereço.
9. Painel administrativo mostra status e métricas.
10. Atualizar canonical, `og:image`, sitemap, links e divulgação da página de planos para domínio novo.
11. Avisar alunos que poderão precisar entrar novamente com Google e reinstalar o atalho/PWA no novo endereço. Dados que não sincronizaram do navegador antigo não migram automaticamente para outro domínio.

## Recuperação

Se o domínio falhar, não apagar senhas nem tokens. Corrigir DNS/GitHub Pages e revalidar URLs no Supabase/Google. O endereço antigo só deve ser usado como rota segura quando o GitHub Pages efetivamente ainda o servir sem redirecionar para o domínio inválido.
