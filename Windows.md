# Running on Windows

This guide explains how to run the project on a Windows machine.

## 1) Prerequisites

- **Git**: https://git-scm.com/download/win
- **Node.js (LTS)**: https://nodejs.org/
- **Google Cloud CLI** (optional, for Genkit/Gemini auth):
  https://cloud.google.com/sdk/docs/install
- **Docker Desktop** (optional, for local full stack with Supabase):
  https://www.docker.com/products/docker-desktop/

## 2) Clone and install dependencies

```bash
git clone <your-repo-url>
cd webapp
npm install
```

## 3) Environment variables

Create a `.env` file in the project root:

```bash
copy env.template .env
```

Fill in at least:

```env
NEXT_PUBLIC_SUPABASE_URL=""
SUPABASE_URL_INTERNAL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

GEMINI_API_KEY=""
GENAI_MODEL="googleai/gemini-2.5-flash"

ASSINAFY_API_URL="https://api.assinafy.com.br/v1"
ASSINAFY_API_KEY=""
ASSINAFY_WORKSPACE_ACCOUNT_ID=""

PDF_FUNCTION_URL=""
PDF_FUNCTION_SECRET=""
N8N_PRODUCTION_URL="https://seu.n8n.url/webhook/production"
```

## 4) Run the app

```bash
npm run dev
```

The dev server starts on:

```text
http://localhost:9002
```

## 5) Docker local (optional)

```bash
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

## 6) Troubleshooting

- **Node version mismatch**: install Node LTS and re-run `npm install`.
- **Supabase auth/data errors**: confirm `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL_INTERNAL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Genkit/Gemini errors**: configure `GEMINI_API_KEY` or login with `gcloud auth application-default login`.
