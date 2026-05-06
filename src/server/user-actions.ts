'use server';

import { cookies } from 'next/headers';
import { UserRepository } from '@/repositories/user.repository';
import type { UserProfile } from '@/components/auth/session-provider';
import { createSupabaseAdminClient } from '@/supabase/server';

/**
 * Fetch the full profile of the logged-in user from Supabase.
 * @returns The user profile or an error.
 */
export async function getUserProfile(): Promise<{ success: boolean; data?: UserProfile, error?: string }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return { success: false, error: 'Usuário não autenticado.' };
    }
    
    const { data, error } = await createSupabaseAdminClient().auth.getUser(sessionCookie);
    if (error || !data.user) {
      return { success: false, error: 'Sessão inválida.' };
    }

    const user = await UserRepository.get(data.user.id);

    if (!user) {
      return { success: false, error: 'Perfil do usuário não encontrado no Supabase.' };
    }
    
    // Ensure the return matches the UserProfile interface
    const userProfile: UserProfile = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId ?? undefined
    };

    return { success: true, data: userProfile };

  } catch (error: any) {
    console.error("Erro ao buscar perfil do usuário:", error);
    return { success: false, error: error.message || 'Falha ao buscar perfil do usuário.' };
  }
}
