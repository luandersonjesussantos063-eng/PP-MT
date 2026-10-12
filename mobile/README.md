# PP-MT — preparação Android e iOS

O site continua no GitHub Pages. Os aplicativos nativos são gerados com **Capacitor 8** a partir dos módulos HTML/CSS/JS locais, mantendo estudo, dados locais e páginas públicas. A saída `mobile/www/` **não é hospedada no Pages**, e sim empacotada nos aplicativos.

## Pré-requisitos

- Node.js 22 ou posterior;
- Android: Android Studio, SDK, JDK 21 e Google Play Console para publicar;
- iOS: **Mac com Xcode**, assinatura e conta Apple Developer, App Store Connect;
- Nome e package ID propostos: **PP-MT Preparação Policial**, `br.com.novabytesolucoes.ppmt`; confirme disponibilidade antes do primeiro upload.

## Gerar os aplicativos

Na raiz do repositório:

```sh
cd mobile
npm install
npm run prepare:web
npx cap add android
npx cap sync android
npx cap open android
```

Para iOS, em **macOS**:

```sh
cd mobile
npm install
npm run prepare:web
npx cap add ios
npx cap sync ios
npx cap open ios
```

Após atualizar os módulos web: `cd mobile && npm run sync`. Não deixe dados secretos, chaves de loja ou certificados no repositório. Gerar `*.aab` assinado no Android Studio e arquivo iOS assinado pelo Xcode só após os testes.

## Decisão financeira e segurança

**Nunca publicar o checkout Mercado Pago no aplicativo distribuído pelas lojas para liberar conteúdo digital.** O pacote nativo troca `planos/assinar.html` por uma página informativa, troca a área `planos/account.js` por versão sem oferta de compra e filtra notificações comerciais e checkout externo. O site continuará utilizando Mercado Pago normalmente, com os mecanismos de proteção existentes.

O Google Play permite aplicativos de consumo de conteúdos já adquiridos, com restrições de links de pagamento. Na App Store, o conteúdo digital multiplataforma pode exigir oferecer também compras pelo StoreKit/IAP, inclusive para quem adquiriu assinatura fora da loja. **Até integrar Google Play Billing e Apple In-App Purchase, não afirmar que a versão iOS pode ser aprovada nem liberar vendas por links externos.** Conferir as regras vigentes e plano de assinatura antes da submissão.

## Bloqueios a resolver antes de enviar às lojas

1. **Origens/CORS:** Android usa `https://localhost`, iOS usa `capacitor://localhost`. As funções **Premium Practice** e **IA de explicações** já têm essas duas origens autorizadas com JWT/RLS obrigatório; revisar outras Edge Functions utilizadas no app (ofertas, notificações etc.) e testar o fluxo real antes da loja. Permitir a origem não equivale a autenticar usuário.
2. **Login Google:** o pacote nativo oculta o botão Google por enquanto. É necessário configurar OAuth nativo e deep links; login com e-mail e senha continua disponível. URLs de confirmação de e-mail e recuperação de senha também devem ser testadas no aparelho.
3. **Notificações push reais:** o Web Push do site não substitui FCM/APNs. Implementar e testar tokens nativos com permissão explícita, envio backend e política de privacidade.
4. **Pagamentos:** Google Play Billing / StoreKit 2, validação de recibo no servidor, reconciliação, cancelamentos e restauração de compras antes de habilitar Premium pago dentro do app.
5. **Conta e privacidade:** criar fluxo de solicitação/exclusão da conta diretamente no app, link de exclusão na ficha da Play Store, consentimentos necessários, declaração de coleta de dados, política atualizada.
6. **Qualidade:** ícones definitivos 512/1024, splash/ícone adaptativo, capturas de tela e screenshots reais, testes offline, login, recuperação de sessão, áudio, formulários, acessibilidade, tamanho do bundle, limites de questões, simulados e links; executar em telefone real Android e iPhone.
7. **App Store 4.2:** demonstrar funcionalidades duradouras e experiência adequada de aplicativo, não mero invólucro de site. A aprovação não pode ser garantida.
8. **Versões:** ajustar versãoCode/versionName Android, versão/Build iOS e política de dados antes de cada publicação.

## Testes já automatizados

`npm test` na raiz verifica que o pacote gerado não contém a página de checkout do site, mantém conteúdo educacional e páginas de privacidade, preserva o site público e não copia o painel administrativo. A geração para build nativa é `cd mobile && npm run prepare:web`.

## Links oficiais

- https://capacitorjs.com/docs
- https://support.google.com/googleplay/android-developer/answer/10281818
- https://developer.apple.com/app-store/review/guidelines/br/

**Situação:** código preparatório e pacote web prontos para testes; não há APK/AAB/IPA assinado nem cadastro de app nas lojas criado automaticamente.


## Android debug: experimentar pagamento no Mercado Pago (fora das lojas)

Somente no fluxo de APK de testes, o workflow usa `PPMT_ANDROID_DEBUG_PAYMENTS=true`, inclui uma página com botão em **Meu plano** e utiliza `@capacitor/browser` para abrir o checkout oficial do site em navegador externo. Isso permite testar pagamentos enquanto o APK ainda **não está na Play Store**.

Não é pagamento fictício: ao concluir o checkout, a cobrança real será do valor exibido no site. O teste requer usar a mesma conta PP-MT no navegador e no aplicativo, e consultar novamente a assinatura ao retornar. As compras não são liberadas na distribuição padrão/iOS: `node mobile/prepare.mjs` sem a variável mantém a tela informativa de compras bloqueadas.

Nunca gerar uma versão release com `PPMT_ANDROID_DEBUG_PAYMENTS=true` nem publicar o APK debug na loja.

## Por que o APK de testes não atualizava após mudar o site

O APK Capacitor contém uma cópia dos arquivos em `mobile/www`. Publicar
`app.js` no GitHub Pages não altera um APK já instalado.

O workflow de Android foi ampliado para acompanhar mudanças nos recursos web,
gerar outro APK de testes e atribuir o `versionName` de `version.json`,
com `versionCode` crescente.

Para atualizar, acesse **GitHub → Actions → Gerar APK de teste do PP-MT
(Android) → Artifacts → ppmt-android-debug-apk** na execução concluída.
Esse APK não é uma publicação na Play Store nem é instalado automaticamente.

**Preservação de dados:** executores diferentes do GitHub Actions podem gerar
APKs debug com assinaturas distintas. Nesse caso, o Android pode recusar a
instalação sobre o APK anterior. Salve e sincronize o progresso antes de
qualquer desinstalação. Configurar chave de assinatura estável é um requisito
para atualização por cima do APK anterior, e a loja exige lançamento de app
assinado próprio e adequação de pagamentos digitais ao Google Play Billing.

Para atualizações de interface sem novo APK, seria necessária outra arquitetura
(web/PWA ou atualização remota segura e compatível com as políticas da loja).
