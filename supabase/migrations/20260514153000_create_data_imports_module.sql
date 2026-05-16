create table if not exists public.importacoes (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  tipo_importacao text not null,
  nome_arquivo text not null,
  formato_arquivo text not null,
  status text not null default 'pendente',
  total_linhas integer not null default 0,
  linhas_validas integer not null default 0,
  linhas_com_erro integer not null default 0,
  linhas_importadas integer not null default 0,
  linhas_ignoradas integer not null default 0,
  usuario_id uuid references auth.users(id) on delete set null,
  data_importacao timestamptz default now(),
  resultado_url text,
  relatorio_erros_url text,
  arquivo_original_url text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.importacao_erros (
  id text primary key default gen_random_uuid()::text,
  importacao_id text not null references public.importacoes(id) on delete cascade,
  linha integer not null,
  campo text,
  valor text,
  tipo_erro text not null,
  mensagem text not null,
  status text not null default 'pendente',
  created_at timestamptz default now()
);

create index if not exists importacoes_company_id_idx on public.importacoes(company_id);
create index if not exists importacoes_tipo_status_idx on public.importacoes(tipo_importacao, status);
create index if not exists importacao_erros_importacao_id_idx on public.importacao_erros(importacao_id);

alter table public.importacoes enable row level security;
alter table public.importacao_erros enable row level security;

