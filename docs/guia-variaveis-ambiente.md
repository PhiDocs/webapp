# Guia de variáveis de ambiente

Levantamento de todo `process.env` lido pela aplicação, em `src/`, `scripts/` e
`next.config.mjs` (ignorando `node_modules`), incluindo acesso indireto via
`process.env[nome]` (usado em `scripts/bootstrap-local.js`). Nenhum valor real
de `.env` ou `.env.local` está registrado aqui — só nomes, uso e se há
fallback no código.

| | |
|---|---|
| Variáveis lidas pelo código | 29 |
| Variáveis `NEXT_PUBLIC_*` (expostas ao client) | 3 |
| Somente servidor/script | 26 |
| Arquivos `.env` conferidos | `.env`, `.env.local` |

---

## 1. Supabase (banco + auth)

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC` | `src/supabase/browser.ts:4`, `src/supabase/server.ts:4`, `scripts/set-admin.js:9`, `scripts/create-company.ts:16`, `scripts/bootstrap-local.js:18,154` | Sim no browser; no servidor só se faltar `SUPABASE_URL_INTERNAL` | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `NEXT_PUBLIC` | `src/supabase/browser.ts:5`, `src/supabase/server.ts:26` | Sim | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor/script | `src/supabase/server.ts:12`, `src/lib/auth/session-cookie.ts:16`, `scripts/set-admin.js:10`, `scripts/create-company.ts:17`, `scripts/bootstrap-local.js:129` | Sim, para operações admin server-side e scripts | — |
| `SUPABASE_URL_INTERNAL` | Servidor/script | `src/supabase/server.ts:4`, `scripts/set-admin.js:9`, `scripts/create-company.ts:16`, `scripts/bootstrap-local.js:18` | Não | `NEXT_PUBLIC_SUPABASE_URL` |

## 2. Sessão / cookies

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `SESSION_COOKIE_SECRET` | Servidor | `src/lib/auth/session-cookie.ts:15` | Recomendada | `SUPABASE_SERVICE_ROLE_KEY`; se também faltar, segredo fixo de desenvolvimento (não usar assim em produção) |

## 3. App / build

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `NEXT_PUBLIC_APP_VERSION` | `NEXT_PUBLIC` | `src/app/layout.tsx:58`, `src/app/company/[companyId]/page.tsx:519`, `next.config.mjs:44` | Não | `dev`; `next.config.mjs` tenta gerar via git tag/hash no build |
| `NODE_ENV` | Servidor/build | `next.config.mjs:4`, `src/server/auth-actions.ts:114,121,137` | Não (fornecida pelo runtime) | Qualquer valor diferente de `production` é tratado como dev; controla `secure` do cookie |
| `ANALYZE` | Build | `next.config.mjs:6` | Não | Desligado; `'true'` liga o bundle analyzer |

## 4. IA / Genkit (Google GenAI)

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `GOOGLE_GENAI_API_KEY` | Servidor | `src/server/ai-actions.ts:13-14` | Sim para fluxos de IA (direto ou via alias) | Copiada de `GEMINI_API_KEY` se ausente |
| `GEMINI_API_KEY` | Servidor | `src/server/ai-actions.ts:13-14` | Alias de `GOOGLE_GENAI_API_KEY` | — |
| `GENAI_MODEL` | Servidor | `src/server/ai-actions.ts:139,239,303,379` | Não | `googleai/gemini-pro` |
| `GENAI_THINKING_SELECAO` | Servidor | `src/server/ai-actions.ts:46` | Não | `0` |
| `GENAI_THINKING_REDACAO` | Servidor | `src/server/ai-actions.ts:48` | Não | `0` |

## 5. Assinafy (assinatura digital)

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `ASSINAFY_API_URL` | Servidor | `src/server/assinafy-actions.ts:3` | Sim para fluxos Assinafy | `''`, mas `assertAssinafyConfig()` bloqueia o uso se faltar |
| `ASSINAFY_API_KEY` | Servidor | `src/server/assinafy-actions.ts:4` | Sim para fluxos Assinafy | idem |
| `ASSINAFY_WORKSPACE_ACCOUNT_ID` | Servidor | `src/server/assinafy-actions.ts:5` | Sim para fluxos Assinafy | idem |

## 6. Geração de PDF (serverless)

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `PDF_FUNCTION_URL` | Servidor | `src/server/pdf-generator.ts:6,314` | Não | `''` — sem ela, gera PDF localmente com Puppeteer |
| `PDF_FUNCTION_SECRET` | Servidor | `src/server/pdf-generator.ts:7` | Só se `PDF_FUNCTION_URL` estiver definida | `''` |
| `VERCEL` | Servidor | `src/server/pdf-generator.ts:213` | Não (injetada pela Vercel) | `false` |
| `AWS_LAMBDA_FUNCTION_NAME` | Servidor | `src/server/pdf-generator.ts:213` | Não (injetada pela AWS) | `false` |

## 7. Admin

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `ALLOW_REGISTER_COMPANY_SCRIPT` | Servidor | `src/server/admin-actions.ts:25` | Não | `false`; só libera cadastro de empresa sem sessão admin quando o valor é exatamente `'true'` |

## 8. Scripts de bootstrap local / migração (não usados em runtime da app)

| Variável | Tipo | Onde é lida | Obrigatória? | Fallback / default |
|---|---|---|---|---|
| `LOCAL_COMPANY_NAME` | Script | `scripts/bootstrap-local.js:130` | Sim para o script | Sem fallback |
| `LOCAL_ADMIN_NAME` | Script | `scripts/bootstrap-local.js:131` | Sim para o script | Sem fallback |
| `LOCAL_ADMIN_EMAIL` | Script | `scripts/bootstrap-local.js:132` | Sim para o script | Sem fallback |
| `LOCAL_ADMIN_PASSWORD` | Script | `scripts/bootstrap-local.js:133` | Sim para o script | Sem fallback |
| `DB_CONTAINER_NAME` | Script | `scripts/run-migrations.js:13` | Não | `supabase-db` |
| `POSTGRES_DB` | Script | `scripts/run-migrations.js:14` | Não | `postgres` |
| `POSTGRES_MIGRATION_USER` | Script | `scripts/run-migrations.js:15` | Não | `supabase_admin` |
| `POSTGRES_PASSWORD` | Script | `scripts/run-migrations.js:16` | Sim para o script | Sem fallback |

---

## Declarada em `.env` mas não lida no código

| Variável | Observação |
|---|---|
| `N8N_PRODUCTION_URL` | Existe em `.env`, mas nenhum `process.env` em `src/server/n8n-actions.ts` ou `src/services/n8n.service.ts` a lê. A URL do N8N parece vir de configuração por empresa (`src/components/admin/company-settings.tsx` / `n8n-settings.tsx`, salva no banco), não de variável de ambiente. Provavelmente pode ser removida do `.env` — confirmar antes de apagar. |

---

## Checklist mínimo para rodar em produção

| Variável | Necessária? |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim |
| `SESSION_COOKIE_SECRET` | Sim (gerar segredo próprio, não reaproveitar a service role key) |
| `GOOGLE_GENAI_API_KEY` ou `GEMINI_API_KEY` | Sim, se os fluxos de IA estiverem habilitados |
| `ASSINAFY_API_URL`, `ASSINAFY_API_KEY`, `ASSINAFY_WORKSPACE_ACCOUNT_ID` | Sim, se a assinatura digital estiver habilitada |
| `PDF_FUNCTION_URL`, `PDF_FUNCTION_SECRET` | Só se a geração de PDF rodar fora do processo (Cloud Function) |

## Notas

- Só as 3 variáveis `NEXT_PUBLIC_*` chegam ao bundle do client; todo o resto fica só no servidor.
- `assinafy-actions.ts` e `pdf-generator.ts` usam fallback `''` em vez de lançar erro — a ausência da variável falha silenciosamente na chamada à API, não no boot da aplicação.
- `GENAI_THINKING_*` são numéricas (`Number(valor ?? 0)`); um valor inválido vira `0` silenciosamente.
- Não defina `NEXT_PUBLIC_APP_VERSION` manualmente — o `next.config.mjs` sobrescreve no build com a tag/hash do git.
