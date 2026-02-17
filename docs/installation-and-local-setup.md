# Installation And Local Setup

## Pré-requisitos

- Node.js 20+
- npm
- Firebase CLI
- Google Cloud CLI (`gcloud`)

## Instalação

```bash
npm install
```

## Rodar localmente

```bash
npm run dev
```

## Configuração Firebase Admin

Para credenciais de servidor:

1. Abra o Firebase Console no projeto
2. Vá em Configurações do projeto > Contas de serviço
3. Gere uma nova chave privada
4. Preencha no `.env`:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (com `\n` literais)

## Configuração da IA (Gemini)

Opção recomendada:

```bash
gcloud auth application-default login
```

Ou por chave:

- Defina `GEMINI_API_KEY` no `.env`

## Variáveis de ambiente

Use `env.template` como base para montar o `.env`.

Principais grupos:

- Firebase Admin (`FIREBASE_*`)
- Firebase Client (`NEXT_PUBLIC_FIREBASE_*`)
- Gemini (`GEMINI_API_KEY`, `GENAI_MODEL`)
- Assinafy (`ASSINAFY_*`)
- PDF (`PDF_FUNCTION_*`)
- Deploy (`BACKEND_ID`, `PROJECT_ID`)
