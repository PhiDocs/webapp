# APR.ai

Sistema web para geração e gestão de documentos de segurança do trabalho —
**APR** (Análise Preliminar de Risco) e **PT** (Permissão de Trabalho) — com
apoio de IA, assinatura digital e controle do ciclo de vida do documento.
Multi-empresa: cada empresa só acessa seus próprios dados.

## O que o sistema faz

- **Wizard por etapas** para criar APR ou PT: empresa, atividade, análise/
  condições, checklist, participantes, revisão e emissão.
- **Análise assistida por IA** (Google Gemini via Genkit): sugestão de riscos,
  medidas preventivas e EPI/EPC a partir da descrição da atividade. A pessoa
  sempre revisa e decide o que entra no documento final.
- **Autosave** do rascunho a cada mudança, sem travar quem está digitando.
- **Ciclo de vida do documento** com estados (rascunho → em revisão →
  aguardando assinatura → assinado → finalizado) reforçados no servidor, não
  só escondidos na tela.
- **Assinatura digital** via Assinafy, com acompanhamento de status.
- **Geração de PDF** formatado, localmente com Puppeteer ou via Cloud
  Function na Vercel.
- **Gestão de extintores** como segundo módulo ativo, independente de
  APR/PT.

Outros módulos existem no código mas estão fora do menu principal enquanto
o foco é APR/PT e extintores — ver [`docs/modulos-em-pausa.md`](docs/modulos-em-pausa.md).

## Stack

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Supabase](https://supabase.com/) (Postgres + Auth) como banco e autenticação
- [Genkit](https://genkit.dev/) + Google Gemini para os fluxos de IA
- [Assinafy](https://assinafy.com.br/) para assinatura digital
- Puppeteer / `@sparticuz/chromium` para geração de PDF
- Tailwind CSS + Radix UI

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:9002
```

Antes de rodar, configure as variáveis de ambiente em `.env.local` — a lista
completa de todas as variáveis que o código realmente lê, o que cada uma faz
e o que é obrigatório está em
[`docs/guia-variaveis-ambiente.md`](docs/guia-variaveis-ambiente.md).

### Scripts úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 9002) |
| `npm run build` / `npm start` | Build e execução em produção |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Aplica as migrations do Supabase |
| `npm run create-company` | Cria uma empresa e o primeiro admin |
| `npm run set-admin` | Promove um usuário existente a admin |
| `npm run docker:up` / `docker:down` | Sobe/derruba a stack local em container |

```bash
npm run create-company -- "Nome da Empresa" "admin@empresa.com" "Nome do Admin" "senhaForte123"
npm run set-admin -- "usuario@empresa.com" "ID_DA_EMPRESA"
```

O schema inicial do banco está em
`supabase/migrations/20260506100000_initial_schema.sql`; as migrations
seguintes ficam na mesma pasta.

### Docker local (app + Supabase + Postgres)

Alternativa ao rodar contra um projeto Supabase remoto: sobe tudo local.

```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

- App: `http://localhost:9002`
- Supabase Gateway / Studio: `http://localhost:8000` (basic auth em `DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD`)
- Postgres direto: `localhost:54322` (usuário `postgres`, senha `POSTGRES_PASSWORD`, db `postgres`)

O serviço `bootstrap` cria (ou reaproveita, é idempotente) a empresa e o
admin locais a partir de `LOCAL_COMPANY_NAME`, `LOCAL_ADMIN_NAME`,
`LOCAL_ADMIN_EMAIL` e `LOCAL_ADMIN_PASSWORD`. Para ver o resultado:

```bash
docker compose --env-file .env.docker logs bootstrap
```

## Documentação

A pasta [`docs/`](docs) reúne os levantamentos feitos sobre o projeto:

- [`guia-variaveis-ambiente.md`](docs/guia-variaveis-ambiente.md) — toda variável de ambiente que o código lê, para que serve e se é obrigatória.
- [`diagnostico-apr-pt.md`](docs/diagnostico-apr-pt.md) e [`auditoria-apr-pt.md`](docs/auditoria-apr-pt.md) — diagnóstico e auditoria do módulo APR/PT.
- [`mapeamento-factual-apr-pt.md`](docs/mapeamento-factual-apr-pt.md) — mapeamento de autosave, persistência, máquina de estados e fluxo de assinatura, com evidência arquivo:linha.
- [`modulos-em-pausa.md`](docs/modulos-em-pausa.md) — o que está no código mas fora do menu principal, e por quê.
