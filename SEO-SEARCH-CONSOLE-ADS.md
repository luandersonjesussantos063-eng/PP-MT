# PP-MT — Publicação, indexação e preparo para anúncios

**Domínio oficial:** https://ppmt.novabytesolucoes.com.br/
**Apresentação para buscas e anúncios:** https://ppmt.novabytesolucoes.com.br/planos/
**Sitemap:** https://ppmt.novabytesolucoes.com.br/sitemap.xml
**Robots:** https://ppmt.novabytesolucoes.com.br/robots.txt

## Situação do SEO técnico

- Hospedagem: GitHub Pages, com domínio personalizado e HTTPS (verificar certificado no GitHub Pages).
- Todas as páginas públicas do sitemap devem indicar um canonical próprio no domínio `ppmt.novabytesolucoes.com.br`.
- As páginas de pagamento, diagnóstico, Premium interno e pilotos financeiros têm `noindex` e não entram no sitemap.
- Landing e artigos contêm título, descrição, H1, links internos e chamadas diretas para o app.
- Landing e guias contêm metadados sociais e marcação estruturada `WebSite`, `WebPage` ou `Article`, conforme o conteúdo.
- As promessas devem permanecer fiéis à oferta: Grátis até 20 questões/dia e 1 simulado/semana; Premium R$ 19,99/mês e conteúdo exclusivo. Treinos, disciplinas, provas e datas dependem do conteúdo e de documentos oficiais; não alegar ser site do governo.
- O projeto dispõe de testes automáticos de integridade de sitemap e canonicals.

## Envio ao Google Search Console

1. Entre em https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Anovabytesolucoes.com.br
2. Selecione a propriedade de domínio **novabytesolucoes.com.br** (abrange o subdomínio PP-MT).
3. Em **Adicionar novo sitemap**, informe `https://ppmt.novabytesolucoes.com.br/sitemap.xml` (ou `sitemap.xml` se a interface já mostrar `https://ppmt.novabytesolucoes.com.br/`).
4. Confira se o relatório indica sucesso, sem erros de download e com URLs descobertas. O envio **não garante indexação**.
5. Na **Inspeção de URL**, verifique e solicite indexação, uma vez, das páginas prioritárias:
   - https://ppmt.novabytesolucoes.com.br/planos/
   - https://ppmt.novabytesolucoes.com.br/planos/questoes-policia-penal-mt.html
   - https://ppmt.novabytesolucoes.com.br/planos/simulados-policia-penal-mt.html
   - https://ppmt.novabytesolucoes.com.br/planos/plano-de-estudos-policia-penal-mt.html
   - https://ppmt.novabytesolucoes.com.br/planos/artigos/
6. Volte em 7–14 dias para olhar **Indexação → Páginas**, **Desempenho → Resultados da pesquisa** e **Sitemaps**. O rastreamento pode demorar dias ou semanas.

O conector atualmente ligado à conversa fornece **consulta de dados**, não apresenta ação autorizada de submissão de sitemap ou solicitação de indexação. O passo no painel Google requer ação do proprietário.

## Atração orgânica legítima

- Compartilhar a página de questões em grupos de preparação onde a divulgação for permitida, com mensagem verdadeira e útil; evitar postagem repetitiva e spam.
- Escrever guias originais com fontes legais e exercícios comentados; melhorar páginas segundo buscas reais coletadas pelo Search Console.
- Solicitar links editoriais legítimos em páginas de parceiros que aceitem recursos úteis e relevantes. Não comprar esquemas de backlinks, não usar robôs simulando buscas ou cliques e não prometer aprovação.
- Revisar conteúdo quando houver novo edital oficial, indicando a origem e a data das informações; não automatizar rumores ou criar páginas com editais fictícios.

## Medição de interesse — implementado, agregado

Há rastreamento próprio do PPMT via Supabase, sem pixels de anúncios: visitas às páginas e eventos agregados `signup_click`, `premium_click`, `install_click`, `whatsapp_click` e `start_study_click`. Reconhece `utm_source`, `utm_medium`, `utm_campaign` sanitizados; não armazena dados de cartão ou senha nesses eventos e respeita DNT/GPC. As visitas e eventos estão em tabelas agregadas separadas (`ppmt_analytics_daily`, `ppmt_marketing_events_daily`), cujo acesso é restrito ao servidor/admin.

Exemplo de link de campanha de **teste sem anúncios**:
`https://ppmt.novabytesolucoes.com.br/planos/?utm_source=whatsapp&utm_medium=organic&utm_campaign=divulgacao_ppmt`

Não marcar `signup_click` como cadastro concluído nem `premium_click` como assinatura paga. São ações de intenção, não conversões financeiras. Pagamentos somente contam como vendas se aprovados e verificados por webhook.

## Pré-lançamento de tráfego pago (Google Ads / Meta Ads)

Antes de gastar dinheiro:

- [ ] HTTPS sem alertas no celular e desktop, sem páginas que redirecionem inesperadamente.
- [ ] Google OAuth e e-mail/senha funcionando **no domínio próprio**, progresso preservado.
- [ ] Checkout: Pix/manual, assinatura cartão e troca de forma de pagamento testados com segurança.
- [ ] Testar **uma compra real de R$ 19,99** com aprovação, webhook, liberação Premium e verificação do período. Exige autorização explícita para gastar, não realizar automaticamente.
- [ ] Criar um fluxo de medição/GA4 **específico do PP-MT** e configurar eventos e conversões reais, não usar indevidamente o fluxo GA4 da NovaByte empresarial. Configurar Consent Mode e política de privacidade quando forem instaladas tags publicitárias.
- [ ] Configurar evento `sign_up` na autenticação efetivamente concluída e `purchase` somente após o pagamento **verificado no backend**; não contabilizar retorno `?resultado=aprovado` como compra.
- [ ] Adicionar UTMs nos anúncios e conferir atribuição de cliques (a implementação agregada já suporta source/medium/campaign).
- [ ] Testar Google PageSpeed Insights / Core Web Vitals de mobile e estabilidade em rede 4G.
- [ ] Conferir preços, termos, política de privacidade, identidade do fornecedor e atendimento; anúncios nunca devem sugerir vínculo oficial com Polícia Penal MT.
- [ ] Conferir políticas vigentes de destino do Google Ads e Meta Ads; a plataforma pode reprovar anúncios mesmo com SEO correto.

### Sugestão inicial de campanhas — para aprovação futura

**Pesquisa orgânica/Ads:** separar intenção `questões polícia penal mt`, `simulado polícia penal mt` e `plano de estudos polícia penal mt`, cada uma direcionando para a página apropriada, não diretamente ao checkout.

**Página de conversão:** `/planos/` para conhecer o serviço; `/planos/questoes-policia-penal-mt.html` e `/planos/simulados-policia-penal-mt.html` para buscas específicas. O botão de assinatura tem preço e renovação transparentes.

**Sem orçamento ou campanha ativa:** só iniciar após validação de compra real, métricas e autorização do proprietário.

## Referências oficiais

- Google Search Central — sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central — solicitar rastreamento: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Google Ads — requisitos de destino: https://support.google.com/google-ads/answer/6008942?hl=pt-BR
- Google Tag — Consent Mode: https://developers.google.com/tag-platform/security/guides/consent
