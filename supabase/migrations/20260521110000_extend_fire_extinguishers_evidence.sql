alter table public.extintores
  add column if not exists foto_principal_id text,
  add column if not exists qr_code_url text,
  add column if not exists data_proxima_inspecao text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists photo_policy text default 'obrigatoria_nc';

alter table public.extintor_inspecoes
  add column if not exists assinatura_url text,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists finalizada boolean default true;

alter table public.extintor_nao_conformidades
  add column if not exists evidencia_correcao_url text,
  add column if not exists validado_por text;

alter table public.extintor_recargas
  add column if not exists laudo_url text,
  add column if not exists foto_etiqueta_url text;

create table if not exists public.extintor_fotos (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  tipo_foto text not null,
  arquivo_url text not null,
  descricao text,
  origem text not null,
  origem_id text,
  usuario_id text,
  usuario_nome text,
  inspecao_id text,
  data_captura text,
  data_upload text,
  latitude numeric,
  longitude numeric,
  origem_captura text,
  bloqueada_para_edicao boolean default true,
  removida_em text,
  removida_por text,
  principal boolean default false,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_documentos (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  nome text not null,
  tipo text not null,
  data text not null,
  validade text,
  arquivo_url text not null,
  observacao text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create table if not exists public.extintor_inspecao_itens (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  inspecao_id text not null references public.extintor_inspecoes(id) on delete cascade,
  extintor_id text not null references public.extintores(id) on delete cascade,
  pergunta text not null,
  resposta text not null,
  gravidade text,
  observacao text,
  foto_url text,
  gera_nao_conformidade boolean default false,
  critical_key text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text
);

create index if not exists extintor_fotos_extintor_idx on public.extintor_fotos ("companyId", extintor_id, tipo_foto);
create index if not exists extintor_documentos_extintor_idx on public.extintor_documentos ("companyId", extintor_id, tipo);
create index if not exists extintor_inspecao_itens_inspecao_idx on public.extintor_inspecao_itens ("companyId", inspecao_id);
create index if not exists extintores_proxima_inspecao_idx on public.extintores ("companyId", data_proxima_inspecao);

alter table public.extintor_fotos enable row level security;
alter table public.extintor_documentos enable row level security;
alter table public.extintor_inspecao_itens enable row level security;
