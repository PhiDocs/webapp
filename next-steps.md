# Next steps: security & performance hardening

## Plano de ação
1) Reativar a proteção de rotas: criar `middleware.ts` que reexporta o `proxy` de `src/proxy.ts` e validar o fluxo de redirecionamento (login → dashboards).  
2) Centralizar autenticação/autorização server-side: adicionar um helper (ex.: `src/server/auth-guard.ts`) que lê o cookie `session`, valida via Firebase/JWKS e retorna `uid/role/companyId`; aplicar em todas as server actions antes de tocar no Firestore ou integrações.  
3) Garantir isolamento por empresa: nas server actions, validar que o `companyId` do payload bate com o claim do usuário e negar acesso cruzado; restringir ações administrativas (criar empresa, registrar admin, gestão de usuários/obras/documentos) apenas para `role=admin`.  
4) Trancar integrações externas: proteger Assinafy e n8n com o guard, validar emails/telefones permitidos, registrar erros; opcionalmente considerar fila/retry em background para não travar a requisição principal.  
5) Proteger e otimizar geração de PDF: exigir auth no endpoint `api/generate-pdf`, limitar tamanho do payload, e usar apenas a Cloud Function em produção; para uso local, manter uma instância Puppeteer reutilizável para evitar spawn de browser por requisição.  
6) Documentar: atualizar README/env.template com o middleware, novo helper de auth e variáveis usadas; registrar passos de teste básicos (login, redirecionamentos, chamadas bloqueadas).

## Arquivos a tocar
- `middleware.ts` (novo) para conectar o `proxy` às rotas.  
- `src/proxy.ts` (ajustes se necessário para uso no middleware).  
- `src/server/auth-guard.ts` (novo helper de auth/claims).  
- Server actions: `src/server/company-actions.ts`, `work-actions.ts`, `employee-actions.ts`, `admin-actions.ts`, `document-actions.ts`, `signature-actions.ts`, `assinafy-actions.ts`, `n8n-actions.ts`, `ai-actions.ts` (adicionar guard/validações).  
- API de PDF: `src/app/api/generate-pdf/route.tsx` (auth, limites).  
- PDF engine: `src/server/pdf-generator.ts` (reutilizar browser/forçar cloud function).  
- Docs/config: `README.md`, `env.template` (instruções e variáveis novas).
