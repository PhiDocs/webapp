create table if not exists public.checklists_modelos (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  nome text not null,
  tipo_inspecao text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_itens_modelo (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  checklist_modelo_id uuid not null references public.checklists_modelos(id) on delete cascade,
  pergunta text not null,
  categoria text,
  ordem integer not null default 0,
  obrigatorio boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspecoes (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  titulo text not null,
  tipo text not null,
  descricao text,
  data_inspecao date not null,
  hora_inspecao time,
  local text not null,
  setor text not null,
  responsavel_inspecao text not null,
  status text not null default 'aberta' check (status in ('aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  grau_risco text not null default 'baixo' check (grau_risco in ('baixo', 'medio', 'alto', 'critico')),
  observacoes_gerais text,
  plano_acao_geral text,
  prazo_correcao date,
  responsavel_correcao text,
  checklist_modelo_id uuid references public.checklists_modelos(id) on delete set null,
  colaboradores_vinculados text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.itens_inspecao (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  inspecao_id uuid not null references public.inspecoes(id) on delete cascade,
  pergunta text not null,
  categoria text,
  resposta text not null default 'nao_verificado' check (resposta in ('conforme', 'nao_conforme', 'nao_se_aplica', 'nao_verificado')),
  status text not null default 'pendente' check (status in ('conforme', 'nao_conforme', 'pendente', 'corrigido', 'nao_se_aplica')),
  observacao text,
  grau_risco text not null default 'baixo' check (grau_risco in ('baixo', 'medio', 'alto', 'critico')),
  acao_recomendada text,
  responsavel_correcao text,
  prazo_correcao date,
  foto_url text,
  anexo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planos_acao_inspecao (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  inspecao_id uuid not null references public.inspecoes(id) on delete cascade,
  item_id uuid references public.itens_inspecao(id) on delete cascade,
  descricao text not null,
  responsavel text,
  prazo date,
  status text not null default 'aberta' check (status in ('aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  data_conclusao date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checklists_modelos_company_idx on public.checklists_modelos("companyId");
create index if not exists checklist_itens_modelo_company_idx on public.checklist_itens_modelo("companyId");
create index if not exists checklist_itens_modelo_template_idx on public.checklist_itens_modelo(checklist_modelo_id);
create index if not exists inspecoes_company_idx on public.inspecoes("companyId");
create index if not exists inspecoes_status_idx on public.inspecoes(status);
create index if not exists inspecoes_risco_idx on public.inspecoes(grau_risco);
create index if not exists itens_inspecao_company_idx on public.itens_inspecao("companyId");
create index if not exists itens_inspecao_inspecao_idx on public.itens_inspecao(inspecao_id);
create index if not exists planos_acao_inspecao_company_idx on public.planos_acao_inspecao("companyId");
create index if not exists planos_acao_inspecao_inspecao_idx on public.planos_acao_inspecao(inspecao_id);

alter table public.checklists_modelos enable row level security;
alter table public.checklist_itens_modelo enable row level security;
alter table public.inspecoes enable row level security;
alter table public.itens_inspecao enable row level security;
alter table public.planos_acao_inspecao enable row level security;
