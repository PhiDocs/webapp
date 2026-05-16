create table if not exists public.incidentes (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  titulo text not null,
  tipo_ocorrencia text not null check (tipo_ocorrencia in ('incidente_sem_lesao', 'quase_acidente', 'acidente_com_lesao', 'acidente_com_afastamento', 'dano_material', 'condicao_insegura', 'comportamento_inseguro', 'ocorrencia_ambiental', 'emergencia')),
  data_ocorrencia date not null,
  hora_ocorrencia time,
  local text not null,
  setor text not null,
  colaborador_id text references public.colaboradores(id) on delete set null,
  descricao text not null,
  atividade_realizada text,
  houve_lesao boolean not null default false,
  tipo_lesao text,
  parte_corpo_atingida text,
  houve_afastamento boolean not null default false,
  dias_afastamento integer default 0,
  houve_dano_material boolean not null default false,
  descricao_dano_material text,
  gravidade text not null default 'baixa' check (gravidade in ('baixa', 'media', 'alta', 'critica')),
  probabilidade text not null default 'baixa' check (probabilidade in ('baixa', 'media', 'alta')),
  nivel_risco text not null default 'baixo' check (nivel_risco in ('baixo', 'medio', 'alto', 'critico')),
  causa_imediata text,
  causa_raiz text,
  medidas_imediatas text,
  acao_corretiva text,
  acao_preventiva text,
  responsavel_investigacao text,
  prazo_investigacao date,
  status text not null default 'aberto' check (status in ('aberto', 'em_investigacao', 'aguardando_acao', 'concluido', 'cancelado')),
  data_conclusao date,
  evidencia_url text,
  foto_url text,
  observacoes text,
  resumo_investigacao text,
  causa_raiz_confirmada text,
  correcao_realizada text,
  prevencao_recomendada text,
  responsavel_conclusao text,
  evidencia_final_url text,
  epi_obrigatorio boolean not null default false,
  epi_entregue boolean not null default false,
  epi_utilizado boolean not null default false,
  epi_adequado boolean not null default false,
  observacao_epi text,
  treinamento_obrigatorio boolean not null default false,
  treinamento_realizado boolean not null default false,
  treinamento_valido boolean not null default false,
  treinamento_relacionado_id text references public.treinamentos(id) on delete set null,
  observacao_treinamento text,
  historico jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.incidente_testemunhas (
  id text primary key default gen_random_uuid()::text,
  incidente_id text not null references public.incidentes(id) on delete cascade,
  nome text,
  contato text,
  funcao text,
  relato text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidente_acoes (
  id text primary key default gen_random_uuid()::text,
  incidente_id text not null references public.incidentes(id) on delete cascade,
  tipo_acao text not null check (tipo_acao in ('medida_imediata', 'acao_corretiva', 'acao_preventiva', 'orientacao', 'treinamento', 'substituicao_de_epi', 'manutencao', 'sinalizacao', 'bloqueio_de_area', 'revisao_de_procedimento')),
  descricao text,
  responsavel text,
  prazo date,
  status text not null default 'aberta' check (status in ('aberta', 'em_andamento', 'concluida', 'atrasada', 'cancelada')),
  data_conclusao date,
  evidencia_url text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidentes_company_idx on public.incidentes("companyId");
create index if not exists incidentes_status_idx on public.incidentes(status);
create index if not exists incidentes_tipo_idx on public.incidentes(tipo_ocorrencia);
create index if not exists incidentes_gravidade_idx on public.incidentes(gravidade);
create index if not exists incidentes_risco_idx on public.incidentes(nivel_risco);
create index if not exists incidentes_colaborador_idx on public.incidentes(colaborador_id);
create index if not exists incidentes_prazo_idx on public.incidentes(prazo_investigacao);
create index if not exists incidente_testemunhas_incidente_idx on public.incidente_testemunhas(incidente_id);
create index if not exists incidente_acoes_incidente_idx on public.incidente_acoes(incidente_id);
create index if not exists incidente_acoes_status_idx on public.incidente_acoes(status);
create index if not exists incidente_acoes_prazo_idx on public.incidente_acoes(prazo);

alter table public.incidentes enable row level security;
alter table public.incidente_testemunhas enable row level security;
alter table public.incidente_acoes enable row level security;
