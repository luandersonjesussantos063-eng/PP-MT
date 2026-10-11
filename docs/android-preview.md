# Android PP-MT — projeto de teste, sem Play Store

**Situação:** preparação de um APK **debug** para instalação local em celulares Android.
**Nenhum processo publica na Play Store, gera cobrança ou altera pagamento.**
A versão web do PP-MT continua independente e disponível normalmente.

## Arquitetura escolhida

O repositório já tem **Capacitor 8** em `mobile/`, incluindo uma versão
nativa do conteúdo web. Em vez de um segundo wrapper TWA, reutilizamos essa base
para que futuras integrações de notificações nativas (FCM) e Play Billing
possam ser incorporadas ao mesmo app.

- Identidade proposta: `PP-MT Preparação Policial`, `br.com.novabytesolucoes.ppmt`.
- A versão Android empacota os arquivos de `mobile/www/`; não abre diretamente
  um site remoto. Depois de mudanças no código web, **é necessário gerar novo APK**.
- O pacote móvel mantém acesso gratuito e leitura do Premium já adquirido,
  mas **não oferece o checkout Mercado Pago para conteúdo digital**.
- O projeto Android fica em `mobile/android/` e é gerado no CI; não versionamos
  as pastas nativas geradas ou chaves de assinatura.

## Como obter APK de teste

No GitHub do PP-MT, abrir **Actions → Gerar APK de teste do PP-MT (Android)** e selecionar **Run workflow** (ramo `main`).
O workflow também roda ao alterar arquivos Android na branch principal.
Quando a execução estiver concluída com sucesso:

1. Abra a execução.
2. Em **Artifacts**, baixe `ppmt-android-debug-apk`.
3. Extraia o ZIP para encontrar `app-debug.apk`.
4. Instale o APK no celular Android de testes (exige autorização temporária
   para instalar de fontes externas).
5. Teste login por e-mail/senha, questões, aulas, revisões, offline, Premium
   apenas com conta já autorizada, navegação e sessões.

Alternativa para desenvolvimento local:

```sh
cd mobile
npm install
npm run prepare:web
npx cap add android
npx cap sync android
python create_android_icons.py
cd android
./gradlew assembleDebug
```

Para instalar, use Android Studio ou `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
A compilação remota GitHub Actions não precisa de Android Studio no computador do usuário.

## Importante antes de publicar

- O APK **debug** não é release e sua assinatura de testes não deve ser usada
  como assinatura definitiva. Não compartilhe chaves de produção.
- Compatibilidade com Google Play Billing para assinatura digital, se optarmos
  por venda dentro do app, exige implementação e validação própria.
- FCM push nativo, Google OAuth/deep links, exclusão de conta, informações de
  privacidade/Data Safety, marca, imagens e testes reais ainda precisam de revisão.
- A primeira versão de teste pode apresentar diferenças do navegador, especialmente
  no login externo e URLs de recuperação de senha.
- **Não abriremos uma ficha na Play Store nem enviaremos AAB até autorização explícita.**

Veja também `mobile/README.md`.
