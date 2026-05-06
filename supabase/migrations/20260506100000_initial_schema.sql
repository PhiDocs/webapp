create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  logo text,
  "n8nProductionUrl" text default '',
  "n8nTestUrl" text default '',
  "ownerUid" text,
  "createdAt" text not null default now()::text
);

create table if not exists public.users (
  uid text primary key,
  name text not null,
  email text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  "companyId" text references public.companies(id) on delete set null,
  "createdAt" text not null default now()::text
);

create table if not exists public.works (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  address text not null,
  "workLocationDetails" text not null,
  "startDate" text not null,
  "endDate" text not null,
  "companyId" text not null references public.companies(id) on delete cascade,
  "createdAt" text not null default now()::text,
  "deletedAt" text
);

create table if not exists public.employees (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  "firstName" text not null,
  "lastName" text not null,
  email text not null,
  cpf text not null,
  phone text,
  "roleId" text not null,
  "roleName" text,
  "subcontractorId" text,
  "subcontractorName" text,
  "createdAt" text not null default now()::text,
  "deletedAt" text
);

create table if not exists public."jobRoles" (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  name text not null,
  responsibilities text not null default '',
  "requiredCertificates" text[] not null default '{}',
  "createdAt" text not null default now()::text,
  "deletedAt" text
);

create table if not exists public.subcontractors (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  name text not null,
  cnpj text not null,
  "contractNumber" text,
  "createdAt" text not null default now()::text,
  "deletedAt" text
);

create table if not exists public.documents (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  "documentType" text not null,
  "documentName" text not null,
  status text not null check (status in ('draft', 'sent')),
  "formData" jsonb not null,
  "analysisData" jsonb,
  "equipmentData" jsonb,
  "signatureDocumentId" text,
  "createdAt" text not null,
  "updatedAt" text not null
);

create table if not exists public."signatureDocuments" (
  id text primary key default gen_random_uuid()::text,
  "companyId" text not null references public.companies(id) on delete cascade,
  "documentType" text not null,
  "documentName" text not null,
  "assinafyDocumentId" text not null,
  "assinafyAssignmentId" text not null,
  status text not null,
  signers jsonb not null default '[]'::jsonb,
  "signerEmails" text[] not null default '{}',
  "createdAt" text not null,
  "updatedAt" text,
  "lastSyncedAt" text
);

create table if not exists public."errorLogs" (
  id text primary key default gen_random_uuid()::text,
  timestamp text not null,
  "functionName" text not null,
  "userEmail" text not null,
  "errorCode" text not null,
  "errorMessage" text not null,
  "stackTrace" text not null
);

create index if not exists works_company_active_created_idx on public.works ("companyId", "deletedAt", "createdAt" desc);
create index if not exists employees_company_active_created_idx on public.employees ("companyId", "deletedAt", "createdAt" desc);
create index if not exists job_roles_company_active_created_idx on public."jobRoles" ("companyId", "deletedAt", "createdAt" desc);
create index if not exists subcontractors_company_active_created_idx on public.subcontractors ("companyId", "deletedAt", "createdAt" desc);
create index if not exists documents_company_updated_idx on public.documents ("companyId", "updatedAt" desc);
create index if not exists signature_documents_company_created_idx on public."signatureDocuments" ("companyId", "createdAt" desc);
create index if not exists signature_documents_signer_emails_idx on public."signatureDocuments" using gin ("signerEmails");

alter table public.companies enable row level security;
alter table public.users enable row level security;
alter table public.works enable row level security;
alter table public.employees enable row level security;
alter table public."jobRoles" enable row level security;
alter table public.subcontractors enable row level security;
alter table public.documents enable row level security;
alter table public."signatureDocuments" enable row level security;
alter table public."errorLogs" enable row level security;
