-- Estados do documento e trilha de auditoria.
--
-- Antes desta migration, documents.status so aceitava 'draft' e 'sent'. O estado
-- assinado vivia apenas em signatureDocuments, e a lista precisava cruzar as duas
-- tabelas em memoria para inventar o status que mostrava.
--
-- 'sent' continua permitido de proposito: linhas ja gravadas usam esse valor e
-- ele e tratado como sinonimo de 'awaiting_signature' na aplicacao.
alter table public.documents drop constraint if exists documents_status_check;

alter table public.documents
  add constraint documents_status_check check (
    status in (
      'draft',               -- rascunho
      'in_review',           -- em revisao
      'awaiting_signature',  -- aguardando assinatura
      'sent',                -- legado, equivalente a awaiting_signature
      'signed',              -- assinado por todos
      'completed',           -- finalizado
      'declined',            -- recusado por algum signatario
      'cancelled'            -- cancelado
    )
  );

-- Integridade do documento assinado: a partir de lockedAt, o conteudo nao pode
-- mais ser alterado em silencio.
alter table public.documents add column if not exists "lockedAt" text;
alter table public.documents add column if not exists version integer not null default 1;
alter table public.documents add column if not exists "createdBy" text;

-- Trilha de auditoria. Usa timestamptz de proposito: e a unica tabela do modulo
-- onde a ordem cronologica precisa ser confiavel.
create table if not exists public.document_events (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  "documentId" text not null references public.documents(id) on delete cascade,
  action text not null,
  "userUid" text,
  "userEmail" text,
  "documentStatus" text,
  version integer,
  detail text,
  "createdAt" timestamptz not null default now()
);

alter table public.document_events enable row level security;

create index if not exists document_events_document_idx
  on public.document_events ("documentId", "createdAt" desc);

create index if not exists document_events_company_idx
  on public.document_events ("companyId", "createdAt" desc);
