'use server';

import { z } from 'zod';
import admin from '@/firebase/admin-config';
import { CompanyRepository } from '@/repositories/company.repository';
import { UserRepository } from '@/repositories/user.repository';


const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  adminEmail: z.string().email('O e-mail do administrador é inválido.'),
  adminName: z.string().min(1, 'O nome do administrador é obrigatório.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

/**
 * Cria uma nova empresa, um usuário administrador para ela com as permissões corretas (custom claims),
 * e salva os registros correspondentes no Firestore.
 * 
 * @param data - Dados da empresa e do administrador.
 * @returns Um objeto indicando sucesso ou erro.
 */
export async function registerCompany(data: unknown) {
  const validation = registerCompanySchema.safeParse(data);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { companyName, adminEmail, adminName, adminPassword } = validation.data;
  const adminAuth = admin.auth();

  try {
    // Passo 1: Criar a coleção da empresa primeiro para obter o ID
    const companyId = await CompanyRepository.create({ name: companyName });

    // Passo 2: Criar o usuário no Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      emailVerified: true, // Opcional: considerar como verificado
      password: adminPassword,
      displayName: adminName,
    });
    const userId = userRecord.uid;

    // Passo 3: Definir os Custom Claims para o novo usuário
    await adminAuth.setCustomUserClaims(userId, { 
      role: 'admin', 
      companyId: companyId 
    });

    // Passo 4: Criar o documento do usuário no Firestore, associando à empresa
    await UserRepository.create(userId, {
      uid: userId,
      name: adminName,
      email: adminEmail,
      role: 'admin',
      companyId: companyId,
    });

    // Passo 5: Atualizar o documento da empresa com o ID do proprietário
    await CompanyRepository.update(companyId, { ownerUid: userId });


    return { success: true, data: { userId, companyId } };
  } catch (error: any) {
    console.error('Erro ao registrar nova empresa:', error);
    
    // Em um cenário real, uma transação ou lógica de rollback seria ideal
    // para deletar o usuário ou a empresa se um dos passos falhar.
    
    return { success: false, error: error.message || 'Ocorreu um erro desconhecido.' };
  }
}
