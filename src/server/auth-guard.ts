import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { UserRepository, type CompanyMembership } from '@/repositories/user.repository';

type UserRole = 'admin' | 'user';

export type AuthContext = {
  uid: string;
  email?: string;
  role?: UserRole; // legado/global
  companyId?: string; // legado
  activeCompanyId?: string | null;
  memberships: CompanyMembership[];
};

async function decodeSessionToken(token: string): Promise<AuthContext | null> {
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const role = (decoded.role as UserRole | undefined) ?? 'user';
    const legacyCompanyId = decoded.companyId as string | undefined;
    const user = await UserRepository.get(decoded.uid);

    const memberships = user?.memberships ?? (legacyCompanyId
      ? [{
          companyId: legacyCompanyId,
          role,
          status: 'active' as const,
          joinedAt: new Date().toISOString(),
        }]
      : []);

    const activeCompanyId = user?.activeCompanyId ?? legacyCompanyId ?? null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      role: user?.role ?? role,
      companyId: user?.companyId ?? legacyCompanyId,
      activeCompanyId,
      memberships,
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

  const activeMemberships = session.memberships.filter((membership) => membership.status === 'active');
  const activeCompanyId = session.activeCompanyId ?? null;
  const targetCompanyId = options.matchCompanyId ?? activeCompanyId ?? undefined;
  const targetMembership = targetCompanyId
    ? activeMemberships.find((membership) => membership.companyId === targetCompanyId)
    : undefined;

  if (options.requireCompany && activeMemberships.length === 0) {
    throw new Error('Empresa não identificada.');
  }

  if (options.matchCompanyId) {
    if (!targetMembership) {
      throw new Error('Acesso negado para esta empresa.');
    }
  }

  if (options.role) {
    const hasRequiredRoleInContext = targetMembership?.role === options.role;
    const hasRequiredRoleGlobally = session.role === options.role;
    const hasRequiredRoleInAnyMembership = activeMemberships.some((membership) => membership.role === options.role);

    if (!hasRequiredRoleInContext && !hasRequiredRoleGlobally && !hasRequiredRoleInAnyMembership) {
      throw new Error('Acesso restrito a administradores.');
    }
  }

  return session;
}
