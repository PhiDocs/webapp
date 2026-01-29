'use server';

import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { UserRepository } from '@/repositories/user.repository';
import type { UserProfile } from '@/components/auth/session-provider';

/**
 * ESTA FUNÇÃO FOI MANTIDA PARA POSSÍVEIS USOS FUTUROS NO SERVIDOR,
 * MAS NÃO É MAIS USADA PELO SESSIONPROVIDER NO CLIENTE.
 * 
 * Busca o perfil completo do usuário logado no Firestore.
 * @returns O perfil do usuário ou um erro.
 */
export async function getUserProfile(): Promise<{ success: boolean; data?: UserProfile, error?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return { success: false, error: 'Usuário não autenticado.' };
    }
    
    const decodedToken = await admin.auth().verifyIdToken(sessionCookie);
    const user = await UserRepository.get(decodedToken.uid);

    if (!user) {
      return { success: false, error: 'Perfil do usuário não encontrado no Firestore.' };
    }
    
    // Assegura que o retorno corresponde à interface UserProfile
    const userProfile: UserProfile = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId
    };

    return { success: true, data: userProfile };

  } catch (error: any) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return { success: false, error: error.message || 'Falha ao buscar perfil do usuário.' };
  }
}
