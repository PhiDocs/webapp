create table if not exists public.colaboradores (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  nome_completo text not null,
  cpf text not null,
  rg text,
  data_nascimento text,
  telefone text,
  email text,
  endereco text,
  foto_url text,
  matricula text,
  empresa text,
  setor text not null,
  funcao text not null,
  data_admissao text,
  tipo_contrato text,
  status text not null check (status in ('ativo', 'afastado', 'desligado')),
  gestor_responsavel text,
  local_trabalho text,
  turno_trabalho text,
  atividades_realizadas text,
  riscos_associados text,
  aso_validade text,
  observacoes_seguranca text,
  observacoes_gerais text,
  ai_recommendations jsonb,
  created_at text not null default now()::text,
  updated_at text not null default now()::text,
  archived_at text
);

create unique index if not exists colaboradores_company_cpf_active_unique
  on public.colaboradores ("companyId", cpf)
  where archived_at is null;

create unique index if not exists colaboradores_company_matricula_active_unique
  on public.colaboradores ("companyId", matricula)
  where archived_at is null and matricula is not null and matricula <> '';

create index if not exists colaboradores_company_active_created_idx
  on public.colaboradores ("companyId", archived_at, created_at desc);

alter table public.colaboradores enable row level security;
