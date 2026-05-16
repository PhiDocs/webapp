create table if not exists public.nao_conformidades (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies(id) on delete cascade,
  titulo text not null,
  descricao text not null,
  data_identificacao date not null,
  hora_identificacao time,
  local text not null,
  setor text not null,
  colaborador_id uuid references public.colaboradores(id) on delete set null,
  origem text not null default 'observacao_manual' check (origem in ('inspecao', 'auditoria', 'incidente', 'observacao_manual', 'denuncia_interna', 'analise_de_risco', 'treinamento', 'entrega_de_epi')),
  origem_id text,
  inspecao_id uuid references public.inspecoes(id) on delete set null,
  item_inspecao_id uuid references public.itens_inspecao(id) on delete set null,
  gravidade text not null default 'baixa' check (gravidade in ('baixa', 'media', 'alta', 'critica')),
  probabilidade text not null default 'baixa' check (probabilidade in ('baixa', 'media', 'alta')),
  nivel_risco text not null default 'baixo' check (nivel_risco in ('baixo', 'medio', 'alto', 'critico')),
  risco_associado text,
  evidencia_url text,
  foto_url text,
  responsavel_correcao text,
  prazo_correcao date,
  acao_corretiva text,
  acao_preventiva text,
  causa_provavel text,
  causa_raiz text,
  status text not null default 'aberta' check (status in ('aberta', 'em_analise', 'em_correcao', 'resolvida', 'atrasada', 'cancelada')),
  data_conclusao date,
  validado_por text,
  observacoes text,
  correcao_realizada text,
  evidencia_correcao_url text,
  data_validacao date,
  validacao_status text default 'pendente' check (validacao_status in ('pendente', 'validada', 'reprovada')),
  motivo_reabertura text,
  historico jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists nao_conformidades_company_idx on public.nao_conformidades("companyId");
create index if not exists nao_conformidades_status_idx on public.nao_conformidades(status);
create index if not exists nao_conformidades_gravidade_idx on public.nao_conformidades(gravidade);
create index if not exists nao_conformidades_risco_idx on public.nao_conformidades(nivel_risco);
create index if not exists nao_conformidades_origem_idx on public.nao_conformidades(origem);
create index if not exists nao_conformidades_colaborador_idx on public.nao_conformidades(colaborador_id);
create index if not exists nao_conformidades_inspecao_idx on public.nao_conformidades(inspecao_id);
create index if not exists nao_conformidades_prazo_idx on public.nao_conformidades(prazo_correcao);

alter table public.nao_conformidades enable row level security;
