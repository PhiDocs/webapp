alter table public.epis
  add column if not exists valor_unitario numeric,
  add column if not exists fornecedor text,
  add column if not exists data_compra text;

create table if not exists public.custos_prevencao (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('prevencao', 'correcao', 'incidente', 'treinamento', 'EPI', 'exame_ocupacional', 'manutencao_preventiva', 'manutencao_corretiva', 'sinalizacao', 'adequacao_de_seguranca', 'afastamento', 'multa_autuacao', 'retrabalho', 'consultoria', 'auditoria', 'outros')),
  tipo_custo text not null check (tipo_custo in ('investimento_preventivo', 'custo_corretivo', 'custo_operacional', 'custo_emergencial', 'custo_recorrente', 'custo_pontual', 'custo_estimado', 'custo_real')),
  valor numeric not null default 0,
  data_custo text not null,
  fornecedor text,
  setor text,
  colaborador_id text,
  epi_id text,
  treinamento_id text,
  inspecao_id text,
  nao_conformidade_id text,
  incidente_id text,
  origem text not null check (origem in ('manual', 'entrega_de_epi', 'treinamento', 'inspecao', 'nao_conformidade', 'incidente', 'manutencao', 'exame', 'auditoria')),
  comprovante_url text,
  responsavel_registro text,
  observacoes text,
  created_at text not null default now()::text,
  updated_at text not null default now()::text,
  archived_at text
);

create index if not exists custos_prevencao_company_created_idx on public.custos_prevencao ("companyId", archived_at, data_custo desc);
create index if not exists custos_prevencao_categoria_idx on public.custos_prevencao ("companyId", categoria);
create index if not exists custos_prevencao_tipo_idx on public.custos_prevencao ("companyId", tipo_custo);
create index if not exists custos_prevencao_origem_idx on public.custos_prevencao ("companyId", origem);
create index if not exists custos_prevencao_setor_idx on public.custos_prevencao ("companyId", setor);
create index if not exists custos_prevencao_colaborador_idx on public.custos_prevencao ("companyId", colaborador_id);
create index if not exists custos_prevencao_incidente_idx on public.custos_prevencao ("companyId", incidente_id);
create index if not exists custos_prevencao_nc_idx on public.custos_prevencao ("companyId", nao_conformidade_id);
create index if not exists custos_prevencao_inspecao_idx on public.custos_prevencao ("companyId", inspecao_id);

alter table public.custos_prevencao enable row level security;
