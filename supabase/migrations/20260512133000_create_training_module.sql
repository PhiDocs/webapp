create table if not exists public.treinamentos (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  nome text not null,
  norma text,
  descricao text,
  carga_horaria numeric,
  validade_meses integer,
  obrigatorio boolean not null default true,
  ativo boolean not null default true,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.treinamentos_por_funcao (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  funcao text not null,
  treinamento_id text not null references public.treinamentos(id) on delete cascade,
  obrigatorio boolean not null default true,
  observacao text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.treinamentos_colaboradores (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  colaborador_id text not null,
  treinamento_id text not null references public.treinamentos(id) on delete cascade,
  data_realizacao text not null,
  data_vencimento text,
  instrutor text,
  empresa_treinamento text,
  carga_horaria_realizada numeric,
  certificado_url text,
  lista_presenca_url text,
  status text not null check (status in ('valido', 'pendente', 'vencido', 'proximo_vencimento', 'dispensado', 'cancelado')),
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text,
  archived_at text
);

create index if not exists treinamentos_company_active_idx on public.treinamentos ("companyId", ativo, created_at desc);
create index if not exists treinamentos_por_funcao_company_funcao_idx on public.treinamentos_por_funcao ("companyId", funcao);
create index if not exists treinamentos_colaboradores_company_created_idx on public.treinamentos_colaboradores ("companyId", archived_at, created_at desc);
create index if not exists treinamentos_colaboradores_colaborador_idx on public.treinamentos_colaboradores ("companyId", colaborador_id);

alter table public.treinamentos enable row level security;
alter table public.treinamentos_por_funcao enable row level security;
alter table public.treinamentos_colaboradores enable row level security;
