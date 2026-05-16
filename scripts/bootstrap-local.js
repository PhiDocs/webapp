const { createClient } = require('@supabase/supabase-js');
const WsPackage = require('ws');
const WebSocketTransport = WsPackage.WebSocket || WsPackage;

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocketTransport;
}

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function resolveSupabaseUrl() {
  return process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL;
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureCompany(supabase, companyName, nowIso) {
  const { data: existing, error: fetchError } = await supabase
    .from('companies')
    .select('id,name,ownerUid')
    .eq('name', companyName)
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing?.id) {
    return { id: existing.id, reused: true };
  }

  const { data: created, error: createError } = await supabase
    .from('companies')
    .insert({
      name: companyName,
      n8nProductionUrl: '',
      n8nTestUrl: '',
      createdAt: nowIso,
    })
    .select('id')
    .single();

  if (createError) throw createError;
  return { id: created.id, reused: false };
}

async function ensureAdminAuthUser(supabase, email, password, adminName) {
  const existingUser = await findAuthUserByEmail(supabase, email);
  if (existingUser) {
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata || {}),
        name: adminName,
      },
    });

    if (updateError) throw updateError;
    return { user: updated.user || existingUser, reused: true };
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: adminName,
    },
  });

  if (createError || !created.user) {
    throw createError || new Error('Failed to create admin user.');
  }

  return { user: created.user, reused: false };
}

async function upsertAppUser(supabase, user, adminName, companyId, nowIso) {
  const { error } = await supabase.from('users').upsert(
    {
      uid: user.id,
      email: user.email,
      name: adminName,
      role: 'admin',
      companyId,
      createdAt: nowIso,
    },
    { onConflict: 'uid' }
  );

  if (error) throw error;
}

async function linkCompanyOwner(supabase, companyId, ownerUid) {
  const { error } = await supabase
    .from('companies')
    .update({ ownerUid })
    .eq('id', companyId);

  if (error) throw error;
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL_INTERNAL and NEXT_PUBLIC_SUPABASE_URL.');
  }

  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  const companyName = required('LOCAL_COMPANY_NAME');
  const adminName = required('LOCAL_ADMIN_NAME');
  const adminEmail = required('LOCAL_ADMIN_EMAIL');
  const adminPassword = required('LOCAL_ADMIN_PASSWORD');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      transport: WebSocketTransport,
    },
  });

  const nowIso = new Date().toISOString();

  const company = await ensureCompany(supabase, companyName, nowIso);
  const authUser = await ensureAdminAuthUser(supabase, adminEmail, adminPassword, adminName);

  await upsertAppUser(supabase, authUser.user, adminName, company.id, nowIso);
  await linkCompanyOwner(supabase, company.id, authUser.user.id);

  console.log('[bootstrap] Done.');
  console.log(`[bootstrap] Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`[bootstrap] Company: ${companyName} (${company.id}) ${company.reused ? '[reused]' : '[created]'}`);
  console.log(`[bootstrap] Admin: ${adminEmail} / ${adminPassword} ${authUser.reused ? '[reused]' : '[created]'}`);
}

main().catch((error) => {
  console.error('[bootstrap] Failed:', error.message);
  process.exit(1);
});
