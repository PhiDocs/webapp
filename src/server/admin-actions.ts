'use server';

import { z } from 'zod';
import admin from '@/firebase/admin-config';
import { CompanyRepository } from '@/repositories/company.repository';
import { UserRepository } from '@/repositories/user.repository';
import { requireAuth } from '@/server/auth-guard';


const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  adminEmail: z.string().email('O e-mail do administrador é inválido.'),
  adminName: z.string().min(1, 'O nome do administrador é obrigatório.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

/**
 * Create a new company, an admin user with the correct permissions (custom claims),
 * and save the related records in Firestore.
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
  const adminAuth = admin.auth();

  try {
    // Step 1: Create the company document first to get the ID
    const companyId = await CompanyRepository.create({ name: companyName });

    // Step 2: Create the user in Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      emailVerified: true, // Opcional: considerar como verificado
      password: adminPassword,
      displayName: adminName,
    });
    const userId = userRecord.uid;

    // Step 3: Set custom claims for the new user
    await adminAuth.setCustomUserClaims(userId, { 
      role: 'admin', 
      companyId: companyId 
    });

    // Step 4: Create the Firestore user document, linked to the company
    const joinedAt = new Date().toISOString();
    await UserRepository.create(userId, {
      uid: userId,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      companyId: companyId,
      activeCompanyId: companyId,
      memberships: [{
        companyId,
        role: 'admin',
        status: 'active',
        joinedAt,
      }],
    });

    // Step 5: Update the company document with the owner ID
    await CompanyRepository.update(companyId, { ownerUid: userId });


    return { success: true, data: { userId, companyId } };
  } catch (error: any) {
    console.error('Erro ao registrar nova empresa:', error);
    
    // In a real scenario, a transaction or rollback logic would be ideal
    // to delete the user or company if any step fails.
    
    return { success: false, error: error.message || 'Ocorreu um erro desconhecido.' };
  }
}
