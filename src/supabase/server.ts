import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL precisa estar configurada.');
  }
  return supabaseUrl;
}

export function createSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY precisa estar configurada.');
  }

  return createClient(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createSupabaseAnonServerClient() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY precisa estar configurada.');
  }

  return createClient(getSupabaseUrl(), anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
