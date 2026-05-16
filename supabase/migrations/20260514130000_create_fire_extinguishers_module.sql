create table if not exists public.extintores (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  codigo text not null,
  numero_patrimonial text,
  unidade text,
  area text not null,
  localizacao_descritiva text,
  tipo_agente text not null,
  capacidade text,
  classe_fogo text,
  fabricante text,
  modelo text,
  numero_serie text,
  data_fabricacao text,
  data_ultima_recarga text,
  data_proxima_recarga text,
  data_validade text,
  data_ultima_inspecao text,
  frequencia_inspecao_dias integer default 30,
  status text,
  status_manual text,
  justificativa_status_manual text,
  responsavel_inspecao text,
  empresa_manutencao text,
  fornecedor text,
  certificado_url text,
  nota_fiscal_url text,
  laudo_url text,
  foto_url text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text,
  archived_at text
);

create table if not exists public.extintor_plantas (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  nome text not null,
  unidade text,
  area text,
  imagem_url text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_mapa_pontos (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  planta_id text not null references public.extintor_plantas(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  x_percent numeric not null default 50,
  y_percent numeric not null default 50,
  status_visual text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_inspecoes (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  data_inspecao text not null,
  responsavel text,
  status_geral text not null,
  pressao_ok boolean default true,
  lacre_ok boolean default true,
  manometro_ok boolean default true,
  sinalizacao_ok boolean default true,
  acesso_livre boolean default true,
  suporte_ok boolean default true,
  mangueira_ok boolean default true,
  corrosao boolean default false,
  etiqueta_inspecao_ok boolean default true,
  local_correto boolean default true,
  validade_recarga_ok boolean default true,
  observacoes text,
  foto_url text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_nao_conformidades (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  data_identificacao text not null,
  tipo text not null,
  descricao text,
  area text,
  status text not null,
  gravidade text not null,
  responsavel_correcao text,
  prazo_correcao text,
  acao_corretiva text,
  evidencia_url text,
  data_conclusao text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_recargas (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  data_recarga text not null,
  data_proxima_recarga text not null,
  empresa_responsavel text,
  valor numeric,
  certificado_url text,
  nota_fiscal_url text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_historico (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  tipo_evento text not null,
  descricao text not null,
  usuario text,
  data_evento text not null,
  created_at text not null default now()::text
);

create index if not exists extintores_company_idx on public.extintores ("companyId", archived_at, area);
create index if not exists extintores_status_idx on public.extintores ("companyId", status);
create index if not exists extintores_recarga_idx on public.extintores ("companyId", data_proxima_recarga);
create index if not exists extintor_plantas_company_idx on public.extintor_plantas ("companyId", area);
create index if not exists extintor_pontos_planta_idx on public.extintor_mapa_pontos ("companyId", planta_id);
create index if not exists extintor_inspecoes_extintor_idx on public.extintor_inspecoes ("companyId", extintor_id, data_inspecao desc);
create index if not exists extintor_ncs_extintor_idx on public.extintor_nao_conformidades ("companyId", extintor_id, status);
create index if not exists extintor_recargas_extintor_idx on public.extintor_recargas ("companyId", extintor_id, data_recarga desc);
create index if not exists extintor_historico_extintor_idx on public.extintor_historico ("companyId", extintor_id, data_evento desc);

alter table public.extintores enable row level security;
alter table public.extintor_plantas enable row level security;
alter table public.extintor_mapa_pontos enable row level security;
alter table public.extintor_inspecoes enable row level security;
alter table public.extintor_nao_conformidades enable row level security;
alter table public.extintor_recargas enable row level security;
alter table public.extintor_historico enable row level security;
