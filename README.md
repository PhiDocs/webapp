# Safety Docs AI

Projeto Next.js para gerar documentos de segurança do trabalho, como APR e PT, com IA, PDF e assinatura por e-mail.

## Stack

- Next.js
- React
- Supabase Auth
- Supabase Postgres
- Genkit/Gemini
- Assinafy

## Banco e Autenticação

O sistema usa Supabase:

- Supabase Auth para login por e-mail e senha.
- Tabela `users` para perfil, `role` e `companyId`.
- Tabela `companies` para empresas.
- Tabelas relacionais para obras, funcionários, cargos, terceirizadas, documentos e assinaturas.
- Dados complexos dos documentos ficam em colunas `jsonb`.

As server actions validam o cookie de sessão e conferem `role/companyId` antes de acessar dados.

## Variáveis de Ambiente

Para ambiente local sem Docker, preencha o arquivo `.env` na raiz do projeto.

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

## Schema Supabase

A migration inicial está em:

```bash
supabase/migrations/20260506100000_initial_schema.sql
```

No fluxo Docker local abaixo, essa migration é aplicada automaticamente no primeiro boot do banco.

## Docker Local (App + Supabase + Postgres)

1. Copie o arquivo de exemplo:

```bash
cp .env.docker.example .env.docker
```

2. Suba tudo:

```bash
docker compose --env-file .env.docker up -d --build
```

3. Acesse:

- App: `http://localhost:9002`
- Supabase Gateway: `http://localhost:8000`
- Supabase Studio: `http://localhost:8000` (basic auth configurado em `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD`)
- Postgres direto: `localhost:54322` (usuário `postgres`, senha `POSTGRES_PASSWORD`, db `postgres`)

### Bootstrap automático

O serviço `bootstrap` cria/reaproveita a empresa e o admin local via Supabase Auth Admin API com as variáveis:

- `LOCAL_COMPANY_NAME`
- `LOCAL_ADMIN_NAME`
- `LOCAL_ADMIN_EMAIL`
- `LOCAL_ADMIN_PASSWORD`

Ele é idempotente: pode rodar de novo sem duplicar empresa e usuário.

Para ver o resultado do bootstrap:

```bash
docker compose --env-file .env.docker logs bootstrap
```

## Scripts

Criar empresa e primeiro administrador:

```bash
npm run create-company -- "Nome da Empresa" "admin@empresa.com" "Nome do Admin" "senhaForte123"
```

Promover usuário existente:

```bash
npm run set-admin -- "usuario@empresa.com" "ID_DA_EMPRESA"
```

## Desenvolvimento

```bash
npm install
npm run dev
```

O app roda por padrão em `http://localhost:9002`.
