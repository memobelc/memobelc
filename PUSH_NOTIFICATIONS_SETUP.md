# Configuração de Push Notifications (Android)

O erro "Default firebaseApp is not initialized" ocorre porque o Firebase precisa ser inicializado no Android.

> **Importante:** Ignore as instruções do Firebase Console sobre "Adicione o plug-in Gradle" e "Adicione o SDK do Firebase" - elas são para projetos Android nativos. Com Expo, isso é configurado automaticamente pelo `googleServicesFile` no app.json.

## 1. Baixar google-services.json

1. Acesse o [Firebase Console](https://console.firebase.google.com) e selecione o projeto **memobelc**
2. Clique em **Project settings** (ícone de engrenagem)
3. Na aba **General**, em "Your apps", verifique se existe um app Android
4. **Se NÃO existir**: clique em "Add app" → escolha **Android**
   - **Package name**: `com.anonymous.memobelc`
   - Clique em "Register app"
5. **Baixe** o arquivo `google-services.json` e coloque na **raiz** do projeto memobelc (mesma pasta do app.json)

## 2. Rebuild do app

Depois de adicionar o arquivo, é necessário gerar um novo build:

```bash
eas build --platform android
```

Ou, se estiver usando desenvolvimento local:

```bash
npx expo prebuild --clean
npx expo run:android
```

## 3. Credenciais FCM (para enviar notificações)

Para que o servidor consiga enviar notificações via Expo Push, configure as credenciais FCM v1 no EAS:

1. No Firebase Console → Project settings → Service accounts
2. Clique em "Generate New Private Key"
3. Execute: `eas credentials`
4. Selecione Android → production → Google Service Account
5. Envie o arquivo JSON da chave privada

Mais detalhes: https://docs.expo.dev/push-notifications/fcm-credentials/
