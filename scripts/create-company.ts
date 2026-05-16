import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });

const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  adminEmail: z.string().email('O e-mail do administrador é inválido.'),
  adminName: z.string().min(1, 'O nome do administrador é obrigatório.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL_INTERNAL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Configure SUPABASE_URL_INTERNAL (ou NEXT_PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY no .env.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function main() {
  if (process.argv.length < 6) {
    console.error('Uso: npm run create-company -- "Nome da Empresa" "email@admin.com" "Nome do Admin" "senhaForte"');
    process.exit(1);
  }

  const [, , companyName, adminEmail, adminName, adminPassword] = process.argv;

  const validation = registerCompanySchema.safeParse({ companyName, adminEmail, adminName, adminPassword });
  if (!validation.success) {
    console.error('Dados inválidos:', validation.error.flatten().fieldErrors);
    process.exit(1);
  }

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({
      name: companyName,
      n8nProductionUrl: '',
      n8nTestUrl: '',
      createdAt: now,
    })
    .select('id')
    .single();

  if (companyError) throw companyError;

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: adminName,
    },
  });

  if (authError || !authUser.user) {
    throw authError ?? new Error('Falha ao criar usuário no Supabase Auth.');
  }

  const { error: userError } = await supabase.from('users').insert({
    uid: authUser.user.id,
    name: adminName,
    email: adminEmail,
    role: 'admin',
    companyId: company.id,
    createdAt: now,
  });

  if (userError) throw userError;

  const { error: updateCompanyError } = await supabase
    .from('companies')
    .update({ ownerUid: authUser.user.id })
    .eq('id', company.id);

  if (updateCompanyError) throw updateCompanyError;

  console.log('Empresa e administrador criados com sucesso.');
  console.log(`Empresa: ${companyName} (${company.id})`);
  console.log(`Admin: ${adminName} (${adminEmail})`);
  console.log(`UID: ${authUser.user.id}`);
}

main().catch((error) => {
  console.error('Erro ao criar empresa:', error);
  process.exit(1);
});
