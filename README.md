# PP MT — Central de estudos

Versão 0.2.0. Aplicativo web responsivo focado na preparação para a Polícia Penal de Mato Grosso, preparado para hospedagem no GitHub Pages. Sem instalação de dependências, chaves de API ou cobrança de backend.

## O que funciona

- 18 questões **autorais de demonstração**, em Português, Raciocínio Lógico e Informática.
- Busca e filtros por matéria e origem.
- Correção comentada, favoritos e revisão das questões cuja última resposta foi errada.
- Simulados aleatórios com quantidade e duração configuráveis, navegação entre respostas e correção ao finalizar. Ao esgotar o tempo, finaliza automaticamente; não respondidas contam como erro.
- Indicadores e histórico local de simulados.
- Exportação e restauração de backup JSON e importação local de questões.
- Layout para celular, manifesto web e funcionamento offline depois do primeiro carregamento completo.
- GitHub Actions com testes e publicação.

Não é um banco de questões reais ainda. Não há associação das questões de exemplo a bancas ou provas. O conteúdo não representa edital oficial. Não inclui conta, assinatura, servidor, sincronização ou aplicativo nativo/APK. Uma sessão de simulado em andamento não sobrevive ao fechamento da página; o histórico de sessões concluídas sobrevive.

## Publicar no GitHub pelo navegador

1. Crie um repositório chamado `PP-MT` na sua conta. Para o caminho mais simples com GitHub Pages gratuito, use um repositório público e não coloque dados pessoais nele.
2. Extraia o ZIP. Envie **o conteúdo da pasta `pp-mt`** para a raiz do repositório. `index.html` deve ficar na raiz, não dentro de outra pasta `pp-mt`.
3. Certifique-se de enviar também a pasta oculta `.github`. Se ela não aparecer no gerenciador, crie no GitHub o arquivo `.github/workflows/deploy.yml` e copie o conteúdo do arquivo de mesmo nome do projeto.
4. No repositório, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
5. Em **Actions**, escolha **Publicar PP MT no GitHub Pages** e execute **Run workflow** na branch `main`. Novos commits na `main` também publicam automaticamente.
6. Quando concluir, o endereço aparece em **Settings → Pages** e no resultado do deploy. Em geral: `https://SEU-USUARIO.github.io/PP-MT/`.

O workflow espera a branch `main`. Se utilizar outro nome, ajuste `branches` em `.github/workflows/deploy.yml`. Não envie o ZIP sozinho: o GitHub precisa dos arquivos extraídos. Repositório principal: https://github.com/luandersonjesussantos063-eng/PP-MT. O código enviado ao GitHub não significa que o GitHub Pages já esteja ativo; confira Settings → Pages.

## Executar localmente

Requisitos: Python 3; Node.js 22 para os testes.

```bash
cd pp-mt
python3 -m http.server 8080
```

Abra `http://localhost:8080`. Não abra `index.html` diretamente como arquivo: módulos JavaScript e service worker precisam de servidor HTTP/HTTPS.

```bash
npm test
```

Não é necessário `npm install`. A aplicação usa HTML, CSS e módulos JavaScript sem bibliotecas de produção. Os caminhos relativos permitem publicação em uma subpasta do GitHub Pages.

## Adicionar questões

Para experimentar, vá a **Meus dados → Baixar modelo JSON** e importe o arquivo editado com IDs novos. A importação afeta apenas aquele navegador. Para distribuir conteúdo a todos os usuários, adicione registros ao banco exportado em `data.js`, faça commit e publique uma nova versão.

Campos obrigatórios: `id`, `subject`, `topic`, `statement`, `options` (2 a 5 textos), `answer` (índice começando em 0), `explanation` e `origin` (`autoral` ou `prova`). Evite alterar o gabarito de um ID existente: use um novo ID quando houver mudança material, para não distorcer o histórico salvo.

Questão com `origin: "prova"` exige `source`:

```json
{
  "board": "Nome verificado da banca",
  "exam": "Identificação exata do concurso/cargo",
  "year": "Ano da prova",
  "number": "Número no caderno",
  "examUrl": "https://dominio-oficial.example/prova.pdf",
  "answerUrl": "https://dominio-oficial.example/gabarito-definitivo.pdf",
  "reviewedAt": "AAAA-MM-DD"
}
```

Os endereços acima ilustram o formato, não são fontes reais. O validador confere estrutura e protocolo HTTPS; ele não comprova autenticidade, direitos de reprodução, correção ou atualização do conteúdo. Antes de publicar, confira a questão no caderno, o gabarito definitivo, anulações, autorização de reprodução e legislação aplicável. Conteúdo jurídico deve ter revisão especializada e controle de vigência.

## Dados e arquitetura

- `index.html` e `style.css`: interface responsiva.
- `app.js`: telas, simulados, dados locais, backup e importação.
- `core.js`: validação, sorteio, indicadores e revisão de erros.
- `data.js`: banco de demonstração, separado da interface.
- `sw.js` e `manifest.webmanifest`: base web instalável/offline. Instalação depende do navegador; para distribuição nativa serão necessários ícones PNG, empacotamento e testes específicos.
- `tests/core.test.js`: testes de integridade e regras.
- `.github/workflows/deploy.yml`: entrega no GitHub Pages.

Progresso usa `localStorage` com chave `ppmt-v2`. Limpar o navegador, usar outro domínio/aparelho ou navegar no modo privado pode perder/separar dados. Exporte backups regularmente. Questões de simulados não respondidas são guardadas como erros. Indicadores contam tentativas, não questões únicas. Filtros de revisão são atualizados ao abrir novamente a tela; a fila atual é mantida para permitir concluir a revisão.

O cache usa rede primeiro e arquivos locais como alternativa offline. Atualize a constante `CACHE` em `sw.js` a cada versão que altere arquivos; a atualização do service worker pode exigir fechar as abas antigas. Não há analytics ou envio de respostas a terceiros.

## Próximas etapas

1. Conferir edital/estrutura do concurso-alvo e cadastrar provas e gabaritos oficiais, com origem verificável.
2. Acrescentar disciplinas jurídicas e revisar todo conteúdo antes de vendê-lo ou apresentá-lo como preparação completa.
3. Implementar banco de dados, autenticação e sincronização; separar administração com acesso protegido e revisão editorial.
4. Só então adicionar pagamentos, novas polícias/estados e empacotar para Android/iOS, com testes de aparelhos e exigências das lojas.

Nome e identidade visual são provisórios. Projeto independente, sem vínculo com a Polícia Penal de Mato Grosso.

## Verificação desta entrega

Sete testes automatizados das regras passaram, e a sintaxe JavaScript foi validada. A verificação visual e dos fluxos completos em navegador ficou pendente porque o Chromium não estava disponível no ambiente e seu download falhou. A publicação no GitHub Pages depende da configuração do repositório.

Referência da configuração: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
