const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env.local'), override: true });

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function setAdminRole(email, companyId) {
  if (!email || !companyId) {
    console.error('Uso: npm run set-admin -- "email.do.usuario@example.com" "ID_DA_EMPRESA"');
    process.exit(1);
  }

  const supabase = getSupabaseAdminClient();
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;

  const user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error(`Usuário não encontrado no Supabase Auth: ${email}`);
  }

  const { error } = await supabase
    .from('users')
    .upsert({
      uid: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email,
      role: 'admin',
      companyId,
      createdAt: new Date().toISOString(),
    }, { onConflict: 'uid' });

  if (error) throw error;
  console.log(`Usuário ${user.email} agora é admin da empresa ${companyId}.`);
}

setAdminRole(process.argv[2], process.argv[3]).catch((error) => {
  console.error('Falha ao definir admin:', error.message);
  process.exit(1);
});
