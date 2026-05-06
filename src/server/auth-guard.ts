import { cookies } from 'next/headers';
import { UserRepository } from '@/repositories/user.repository';
import { createSupabaseAdminClient } from '@/supabase/server';

type UserRole = 'admin' | 'user';

export type AuthContext = {
  uid: string;
  email?: string;
  role: UserRole;
  companyId?: string;
};

async function decodeSessionToken(token: string): Promise<AuthContext | null> {
  try {
    const { data, error } = await createSupabaseAdminClient().auth.getUser(token);
    if (error || !data.user) return null;

    const profile = await UserRepository.get(data.user.id);
    const role = profile?.role ?? 'user';

    return {
      uid: data.user.id,
      email: data.user.email ?? undefined,
      role,
      companyId: profile?.companyId ?? undefined,
    };
  } catch (error) {
    console.warn('[auth-guard] Token inválido ou expirado:', error);
    return null;
  }
}

export async function getSession(): Promise<AuthContext | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  if (!sessionCookie) return null;
  return decodeSessionToken(sessionCookie);
}

type RequireAuthOptions = {
  role?: UserRole;
  requireCompany?: boolean;
  matchCompanyId?: string;
};

/**
 * Valida o cookie de sessão e retorna o contexto do usuário.
 * Lança erro se não houver sessão ou se os requisitos não forem atendidos.
 */
export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthContext> {
  const session = await getSession();
  if (!session) {
    throw new Error('Usuário não autenticado.');
  }

  if (options.role && session.role !== options.role) {
    throw new Error('Acesso restrito a administradores.');
  }

  if (options.requireCompany && !session.companyId) {
    throw new Error('Empresa não identificada.');
  }

  if (options.matchCompanyId) {
    if (!session.companyId) {
      throw new Error('Empresa não identificada.');
    }
    if (session.companyId !== options.matchCompanyId) {
      throw new Error('Acesso negado para esta empresa.');
    }
  }

  return session;
}
