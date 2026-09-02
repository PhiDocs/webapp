-- Cadastro reutilizavel de responsaveis da APR/PT.
--
-- Nao existe uma entidade "equipe responsavel": sao pessoas individuais
-- (SST, responsavel tecnico, gestor da area, representante do cliente) que
-- podem ser vinculadas a varios documentos sem precisar recadastrar.
--
-- O documento emitido guarda uma copia dos dados da pessoa, entao alterar um
-- contato aqui nao altera nenhuma APR ja emitida.
create table if not exists public.responsible_contacts (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  name text not null,
  role text not null,
  organization text,
  email text,
  phone text,
  "signsByDefault" boolean not null default true,
  "isActive" boolean not null default true,
  "createdAt" text not null default now()::text,
  "updatedAt" text not null default now()::text,
  "deletedAt" text
);

alter table public.responsible_contacts enable row level security;

create index if not exists responsible_contacts_company_active_idx
  on public.responsible_contacts ("companyId", "deletedAt", "isActive", name);

-- A mesma pessoa na mesma funcao nao deve ser cadastrada duas vezes na empresa.
create unique index if not exists responsible_contacts_company_person_uidx
  on public.responsible_contacts ("companyId", lower(name), lower(role))
  where "deletedAt" is null;
