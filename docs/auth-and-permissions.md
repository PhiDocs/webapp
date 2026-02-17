# Auth And Permissions

## Papéis de usuário

- `admin`: claims `{ role: 'admin', companyId: '...' }`; acesso à rota `/company/[companyId]`
- `user`: usuário padrão; redirecionado para a área de geração de documentos

## Fluxo de proteção

- Middleware: `middleware.ts` reexporta `proxy` (`src/proxy.ts`) para controlar acesso e redirecionamentos
- Server-side guard: `src/server/auth-guard.ts` valida sessão e `role/companyId` em server actions

Exemplo:

```ts
import { requireAuth } from '@/server/auth-guard';

await requireAuth({ role: 'admin' });
await requireAuth({ matchCompanyId: companyId, requireCompany: true });
```

## Integrações protegidas

- Assinafy e n8n exigem autenticação server-side
- Assinafy suporta allowlist opcional:
- `ASSINAFY_ALLOWED_EMAILS`
- `ASSINAFY_ALLOWED_EMAIL_DOMAINS`
- `ASSINAFY_ALLOWED_PHONE_PREFIXES`

## API de PDF

- Endpoint: `src/app/api/generate-pdf/route.tsx`
- Requer sessão válida
- Limite de payload: 1 MB
- Produção usa `PDF_FUNCTION_URL` + `PDF_FUNCTION_SECRET`

## Testes rápidos

- Usuário comum deve ir para `/reports`
- Admin com `companyId` deve ir para `/company/[companyId]`
- Acessar `/login` autenticado deve redirecionar ao dashboard correto
- PDF acima de 1 MB deve retornar `413`
- Assinafy deve bloquear e-mail/telefone fora da allowlist
- Teste n8n deve exigir sessão e `companyId` válido

## Criar/promover admin

Criar empresa + admin:

```bash
node scripts/create-company.js "Nome Empresa" "admin@email.com" "Nome Admin" "senhaForte123"
```

Promover usuário existente:

```bash
node scripts/set-admin.js "usuario@email.com" "ID_DA_EMPRESA"
```

Após alterar claims, o usuário precisa sair e entrar novamente.
