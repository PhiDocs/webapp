alter table if exists public.colaboradores
  add column if not exists ai_recommendations jsonb;
