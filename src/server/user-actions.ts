'use server';

import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { UserRepository } from '@/repositories/user.repository';
import type { UserProfile } from '@/components/auth/session-provider';
import { requireAuth } from '@/server/auth-guard';

/**
 * THIS FUNCTION IS KEPT FOR POSSIBLE FUTURE SERVER USE,
 * BUT IT IS NO LONGER USED BY THE CLIENT SESSION PROVIDER.
 * 
 * Fetch the full profile of the logged-in user from Firestore.
 * @returns The user profile or an error.
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
    
    // Ensure the return matches the UserProfile interface
    const userProfile: UserProfile = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role ?? 'user',
        permissions: user.permissions ?? [],
        scopedPermissions: user.scopedPermissions ?? [],
        companyId: user.companyId ?? undefined,
        activeCompanyId: user.activeCompanyId ?? undefined,
        memberships: user.memberships ?? [],
    };

    return { success: true, data: userProfile };

  } catch (error: any) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return { success: false, error: error.message || 'Falha ao buscar perfil do usuário.' };
  }
}

/**
 * Update active company context for the logged-in user.
 */
export async function setActiveCompany(companyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!companyId) {
      return { success: false, error: 'ID da empresa é obrigatório.' };
    }

    const session = await requireAuth({ requireCompany: true });
    await UserRepository.setActiveCompany(session.uid, companyId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao trocar empresa ativa.' };
  }
}
