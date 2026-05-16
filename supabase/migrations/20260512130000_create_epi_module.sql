create table if not exists public.epis (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  nome text not null,
  descricao text,
  categoria text,
  ca text,
  validade_ca text,
  prazo_troca_dias integer,
  ativo boolean not null default true,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.epis_por_funcao (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  funcao text not null,
  epi_id text not null references public.epis(id) on delete cascade,
  obrigatorio boolean not null default true,
  observacao text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.entregas_epi (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  colaborador_id text not null,
  epi_id text not null references public.epis(id) on delete cascade,
  data_entrega text not null,
  data_validade text,
  data_proxima_troca text,
  quantidade integer not null default 1,
  responsavel_entrega text,
  status text not null check (status in ('entregue', 'pendente', 'vencido', 'proximo_troca', 'substituido', 'devolvido', 'cancelado')),
  assinatura_url text,
  comprovante_url text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text,
  archived_at text
);

create index if not exists epis_company_active_idx on public.epis ("companyId", ativo, created_at desc);
create index if not exists epis_por_funcao_company_funcao_idx on public.epis_por_funcao ("companyId", funcao);
create index if not exists entregas_epi_company_created_idx on public.entregas_epi ("companyId", archived_at, created_at desc);
create index if not exists entregas_epi_colaborador_idx on public.entregas_epi ("companyId", colaborador_id);

alter table public.epis enable row level security;
alter table public.epis_por_funcao enable row level security;
alter table public.entregas_epi enable row level security;
