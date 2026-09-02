create table if not exists public.projetos_apr_pt (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  nome_projeto text not null,
  descricao text,
  responsavel_interno text,
  data_inicio text,
  data_termino_prevista text,
  cliente_principal text,
  nome_empresa text,
  razao_social text,
  nome_fantasia text,
  cnpj_empresa text,
  logo_empresa_url text,
  situacao_cadastral text,
  cep text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  responsavel text,
  telefone text,
  email text,
  cnae_principal text,
  observacoes text,
  status text not null default 'ativo' check (status in ('ativo', 'em_andamento', 'arquivado', 'concluido')),
  "createdAt" text not null default now()::text,
  "updatedAt" text not null default now()::text,
  "deletedAt" text
);

alter table public.projetos_apr_pt enable row level security;

create index if not exists projetos_apr_pt_company_active_created_idx
  on public.projetos_apr_pt ("companyId", "deletedAt", "createdAt" desc);

alter table public.works add column if not exists projeto_id text references public.projetos_apr_pt(id) on delete set null;
alter table public.works add column if not exists tipo_servico text;
alter table public.works add column if not exists status text default 'ativo';
alter table public.works add column if not exists cnpj text;
alter table public.works add column if not exists razao_social text;
alter table public.works add column if not exists nome_fantasia text;
alter table public.works add column if not exists situacao_cadastral text;
alter table public.works add column if not exists cnae_principal text;
alter table public.works add column if not exists logo_empresa_url text;
alter table public.works add column if not exists cep text;
alter table public.works add column if not exists logradouro text;
alter table public.works add column if not exists numero text;
alter table public.works add column if not exists complemento text;
alter table public.works add column if not exists bairro text;
alter table public.works add column if not exists cidade text;
alter table public.works add column if not exists estado text;
alter table public.works add column if not exists responsavel_obra text;
alter table public.works add column if not exists telefone text;
alter table public.works add column if not exists email text;
alter table public.works add column if not exists descricao_atividade text;
alter table public.works add column if not exists observacoes text;
alter table public.employees add column if not exists projeto_id text references public.projetos_apr_pt(id) on delete set null;
alter table public."jobRoles" add column if not exists projeto_id text references public.projetos_apr_pt(id) on delete set null;
alter table public.subcontractors add column if not exists projeto_id text references public.projetos_apr_pt(id) on delete set null;
alter table public.documents add column if not exists projeto_id text references public.projetos_apr_pt(id) on delete set null;

create index if not exists works_projeto_id_idx on public.works (projeto_id);
create index if not exists employees_projeto_id_idx on public.employees (projeto_id);
create index if not exists job_roles_projeto_id_idx on public."jobRoles" (projeto_id);
create index if not exists subcontractors_projeto_id_idx on public.subcontractors (projeto_id);
create index if not exists documents_projeto_id_idx on public.documents (projeto_id);
