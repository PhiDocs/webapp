# Setup de Deploy com Infisical + Firebase App Hosting

Este guia prepara o ambiente do zero e permite publicar com um único comando.

## 1) Pré-requisitos

- Node.js 20+
- `npm`
- `infisical` CLI
- `firebase` CLI
- `gcloud` CLI
- `jq`

## 2) Login nas ferramentas (uma vez por máquina)

```bash
infisical login
firebase login
gcloud auth login
gcloud auth application-default login
```

## 3) Inicializar vínculo local com o projeto Infisical

Na raiz do repositório:

```bash
infisical init
```

Durante o `init`, selecione:
- Organização correta
- Projeto correto
- Ambiente padrão (`prod`, `staging` ou `dev`)
- Path padrão (normalmente `/`)

## 4) Segredos obrigatórios no Infisical

Garanta que estes valores existem no ambiente usado no deploy:

- `PROJECT_ID` (ou `FIREBASE_PROJECT_ID`)
- `BACKEND_ID`
- `FIREBASE_PRIVATE_KEY`
- `ASSINAFY_API_KEY`
- `GEMINI_API_KEY`
- `PDF_FUNCTION_SECRET`

Opcional:
- `INFISICAL_PROJECT_ID`
- `INFISICAL_SECRET_PATH` (default: `/`)

## 5) Deploy em um comando

### npm

- Patch:
  ```bash
  npm run release:full:patch
  ```
- Minor:
  ```bash
  npm run release:full:minor
  ```
- Major:
  ```bash
  npm run release:full:major
  ```

### Makefile

- Patch:
  ```bash
  make release-prod-patch
  ```
- Minor:
  ```bash
  make release-prod-minor
  ```
- Major:
  ```bash
  make release-prod-major
  ```

## 6) O que o comando `release:full` faz

1. Gera `.env` via Infisical (`npm run env:pull`).
2. Sincroniza secrets Infisical -> Google Secret Manager (`npm run secrets:sync`).
3. Executa `grantaccess` para todos os secrets de `apphosting.yaml` no backend do App Hosting.
4. Faz release no App Hosting com bump (`patch|minor|major`) ou com `TAG` manual.

## 7) Opções úteis

- Definir ambiente Infisical:
  ```bash
  INFISICAL_ENV=prod npm run release:full:patch
  ```
- Definir path:
  ```bash
  INFISICAL_SECRET_PATH=/ npm run release:full:patch
  ```
- Forçar tag específica:
  ```bash
  TAG=v1.2.3 npm run release:full
  ```

## 8) Troubleshooting

- `PROJECT_ID/FIREBASE_PROJECT_ID ausente`:
  - faltando no Infisical para o ambiente selecionado.
- `BACKEND_ID ausente`:
  - faltando no Infisical.
- erro de `secretmanager.googleapis.com`:
  - conta sem permissão para criar/atualizar/access secrets no projeto GCP.
- erro no `grantaccess`:
  - `BACKEND_ID` incorreto ou backend inexistente.
