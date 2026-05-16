# Next steps: security & performance hardening

## Plano de ação
1) Reativar a proteção de rotas: criar `middleware.ts` que reexporta o `proxy` de `src/proxy.ts` e validar o fluxo de redirecionamento (login -> dashboards).
2) Centralizar autenticação/autorização server-side: manter o helper `src/server/auth-guard.ts` lendo cookie `session`, validando via Supabase Auth e carregando `uid/role/companyId` do perfil em `users`; aplicar em todas as server actions antes de tocar no Postgres ou integrações.
3) Garantir isolamento por empresa: nas server actions, validar que o `companyId` do payload bate com o contexto autenticado e negar acesso cruzado; restringir ações administrativas (criar empresa, registrar admin, gestão de usuários/obras/documentos) apenas para `role=admin`.
4) Trancar integrações externas: proteger Assinafy e n8n com o guard, validar emails/telefones permitidos, registrar erros; opcionalmente considerar fila/retry em background para não travar a requisição principal.
5) Proteger e otimizar geração de PDF: exigir auth no endpoint `api/generate-pdf`, limitar tamanho do payload, e manter o fallback entre Cloud Function em produção e Puppeteer local no desenvolvimento.
6) Documentar: atualizar README/env.template com o middleware, helper de auth e variáveis usadas; registrar passos de teste básicos (login, redirecionamentos, chamadas bloqueadas).

## Arquivos a tocar
- `middleware.ts` para conectar o `proxy` às rotas.
- `src/proxy.ts` (ajustes se necessário para uso no middleware).
- `src/server/auth-guard.ts` (helper de auth/claims).
- Server actions: `src/server/company-actions.ts`, `work-actions.ts`, `employee-actions.ts`, `admin-actions.ts`, `document-actions.ts`, `signature-actions.ts`, `assinafy-actions.ts`, `n8n-actions.ts`, `ai-actions.ts` (adicionar guard/validações).
- API de PDF: `src/app/api/generate-pdf/route.tsx` (auth, limites).
- PDF engine: `src/server/pdf-generator.ts` (reuso de browser local e integração de produção).
- Docs/config: `README.md`, `env.template` (instruções e variáveis).
