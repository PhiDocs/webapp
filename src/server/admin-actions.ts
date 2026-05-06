'use server';

import { z } from 'zod';
import { CompanyRepository } from '@/repositories/company.repository';
import { UserRepository } from '@/repositories/user.repository';
import { requireAuth } from '@/server/auth-guard';
import { createSupabaseAdminClient } from '@/supabase/server';


const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  adminEmail: z.string().email('O e-mail do administrador é inválido.'),
  adminName: z.string().min(1, 'O nome do administrador é obrigatório.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

/**
 * Create a new company, an admin user with the correct permissions,
 * and save the related records in Supabase.
 * 
 * @param data - Company and admin data.
 * @returns An object indicating success or error.
 */
export async function registerCompany(data: unknown) {
  const allowScriptBypass = process.env.ALLOW_REGISTER_COMPANY_SCRIPT === 'true';
  if (!allowScriptBypass) {
    try {
      await requireAuth({ role: 'admin' });
    } catch (error: any) {
      return { success: false, error: error.message || 'Acesso negado.' };
    }
  }

  const validation = registerCompanySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { companyName, adminEmail, adminName, adminPassword } = validation.data;
  const supabase = createSupabaseAdminClient();

  try {
    const companyId = await CompanyRepository.create({ name: companyName });

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: adminName,
      },
    });

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error('Falha ao criar usuário no Supabase Auth.');
    }

    const userId = createdUser.user.id;

    await UserRepository.create(userId, {
      uid: userId,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      companyId: companyId,
    });

    await CompanyRepository.update(companyId, { ownerUid: userId });


    return { success: true, data: { userId, companyId } };
  } catch (error: any) {
    console.error('Erro ao registrar nova empresa:', error);
    
    // In a real scenario, a transaction or rollback logic would be ideal
    // to delete the user or company if any step fails.
    
    return { success: false, error: error.message || 'Ocorreu um erro desconhecido.' };
  }
}
