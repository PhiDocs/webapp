# Deploy And Secrets

## Deploy App Hosting

Pré-requisitos no `.env`:

- `PROJECT_ID` (ou `FIREBASE_PROJECT_ID`)
- `BACKEND_ID`

Comandos:

```bash
npm run deploy:apphosting
npm run release:apphosting
npm run release:apphosting:minor
npm run release:apphosting:major
```

Para forçar uma tag:

```bash
TAG=v1.2.3 npm run release:apphosting
```

## Infisical (time)

### Instalar CLI

macOS:

```bash
brew install infisical/get-cli/infisical
```

Windows (Winget):

```powershell
winget install Infisical.Infisical
```

Windows (Chocolatey):

```powershell
choco install infisical
```

WSL (Ubuntu/Debian):

```bash
curl -1sLf 'https://artifacts-cli.infisical.com/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical
```

### Login e pull de env

```bash
infisical login
npm run env:pull
npm run env:pull:staging
npm run env:pull:prod
```

Comando genérico:

```bash
INFISICAL_ENV=prod INFISICAL_SECRET_PATH=/ INFISICAL_PROJECT_ID=<projectId> npm run env:pull
```

## Sync Infisical -> Google Secret Manager

Pré-requisitos:

- `infisical login`
- `gcloud auth login`
- `gcloud auth application-default login`

Comandos:

```bash
npm run secrets:sync:dev
npm run secrets:sync:staging
INFISICAL_ENV=prod npm run secrets:sync
```

Com filtros:

```bash
SYNC_KEYS=FIREBASE_PRIVATE_KEY,ASSINAFY_API_KEY INFISICAL_ENV=prod npm run secrets:sync
```

## Export de env resolvido para JSON

```bash
npm run export:env:json
```
