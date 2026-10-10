# Equipe operacional virtual — PP-MT

Data de início: 10/10/2026. Prazo de referência: 11/10/2026 às 08:00, horário de Mato Grosso.

Esta é uma **estrutura de responsabilidades e verificações automatizáveis**, não uma contratação de funcionários humanos nem promessa de execução contínua de agentes sem agendamento ou ferramentas de execução conectadas. Nunca declarar conclusão sem evidências.

## Funcionário 1 — Comercial e pagamentos
- Auditar diagnósticos de produção Mercado Pago e Supabase.
- Identificar HTTP de consultas, vendedor esperado, webhook HMAC, teste e produção.
- Manter preço R$ 19,99/mês, validação do recebedor, conteúdo Premium protegido e concessão somente após confirmação.
- Não habilitar vendas públicas sem comprovação de funcionamento e segurança.
- Evidências: logs sem segredos, funções ativas, testes e estado de `ppmt_commercial_flags`.

## Funcionário 2 — Conteúdo, aquisição e conversão
- Publicar conteúdo autoral útil sobre edital, matérias e questões comentadas, distinguindo conteúdo histórico do edital vigente.
- Melhorar chamadas para instalar/abrir PWA logo no início da landing page.
- Providenciar sitemap, robots e SEO técnico; solicitar indexação via Google Search Console apenas quando houver acesso autorizado e ferramenta compatível.
- Mapear parcerias éticas e oportunidades de backlinks; não afirmar parceria/backlink sem publicação por terceiros.
- Evidências: URLs publicadas, status HTTP, metadados, sitemap e confirmações de indexação quando disponíveis.

## Supervisor — Qualidade e execução
- Conferir tarefas de ambos funcionários contra critérios observáveis, código, logs, testes e páginas publicadas.
- Reabrir pendências; evitar marcar como pronto um teste isolado ou endpoint de simulação.
- Enviar ao gerente resumo de bloqueios e riscos. Exigir demonstração real para pagamentos, autenticação e acesso Premium.

## Gerente — Resolução e prestação de contas
- Priorizar bloqueios críticos, acionar correções e não permitir que pagamentos inseguros sejam abertos.
- Consolidar as verificações, registrar o que foi resolvido e o que exige acesso de terceiros.
- Entregar relatório em 11/10/2026 às 08:00 por tarefa agendada, indicando evidências, links e pendências; nunca prometer 100% sem provas.

## Vigia — Fiscalização periódica

- Papel definido: inspecionar status de GitHub Actions, páginas de apresentação, checkout, sitemap, Supabase e novos incidentes em logs.
- Registrar para o supervisor e o gerente: horário, sistema, status, evidência/URL, severidade e providência recomendada.
- Criticidade alta: HTTP 401/403/422 nos pagamentos; erro de publicação; serviço indisponível; Premium concedido sem pagamento confirmado; pagamento confirmado sem liberação.
- **Cadência solicitada: a cada 30 minutos.** A agenda nativa de tarefas neste ambiente suporta no máximo **uma execução por hora**. Não há monitoramento a cada 30 minutos; a automação opera de hora em hora e o gerente recebe relatório agendado.
- **Vigia horário ativado** por solicitação e autorização do proprietário em 10/10/2026. Tarefa programada verifica mudanças e notifica apenas novidades ou bloqueios materiais. O horário de execução efetivo e notificações pertencem à plataforma de tarefas. Não equivale a cinco agentes contínuos independentes.

## Regra de aceite

`100% funcionando` é uma conclusão baseada em testes verificados, nunca um rótulo antecipado. Sem verificação real de credenciais de produção e pagamentos, vender ao público permanece bloqueado.

Observação: o site GitHub Pages contém informações de identificação do responsável pela oferta conforme solicitação; não repetir CPF ou credenciais em relatórios internos.
