import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { UserRepository, type CompanyMembership } from '@/repositories/user.repository';
import type { AclPermission, ScopedPermission } from '@/lib/acl';

type UserRole = 'super-admin' | 'admin' | 'user';

export type AuthContext = {
  uid: string;
  email?: string;
  role?: UserRole; // legado/global
  isSuperAdmin: boolean;
  permissions: AclPermission[];
  scopedPermissions: ScopedPermission[];
  companyId?: string; // legado
  activeCompanyId?: string | null;
  memberships: CompanyMembership[];
};

async function decodeSessionToken(token: string): Promise<AuthContext | null> {
  try {
    const decoded = await admin.auth().verifyIdToken(token, true);
    const role = (decoded.role as UserRole | undefined) ?? 'user';
    const membershipRole: 'admin' | 'user' = role === 'admin' ? 'admin' : 'user';
    const isSuperAdminFromClaims = role === 'super-admin';
    const legacyCompanyId = decoded.companyId as string | undefined;
    const user = await UserRepository.get(decoded.uid);

    const memberships = user?.memberships ?? (legacyCompanyId
      ? [{
          companyId: legacyCompanyId,
          role: membershipRole,
          status: 'active' as const,
          joinedAt: new Date().toISOString(),
        }]
      : []);

    const activeCompanyId = user?.activeCompanyId ?? legacyCompanyId ?? null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      role: user?.role ?? role,
      isSuperAdmin: user?.isSuperAdmin ?? isSuperAdminFromClaims,
      permissions: user?.permissions ?? [],
      scopedPermissions: user?.scopedPermissions ?? [],
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
  requireSuperAdmin?: boolean;
  allowSuperAdminBypass?: boolean;
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

  const allowSuperAdminBypass = options.allowSuperAdminBypass ?? true;
  const isSuperAdmin = session.isSuperAdmin || session.role === 'super-admin';
  if (options.requireSuperAdmin && !isSuperAdmin) {
    throw new Error('Acesso restrito a super administradores.');
  }

  const activeMemberships = session.memberships.filter((membership) => membership.status === 'active');
  const activeCompanyId = session.activeCompanyId ?? null;
  const targetCompanyId = options.matchCompanyId ?? activeCompanyId ?? undefined;
  const targetMembership = targetCompanyId
    ? activeMemberships.find((membership) => membership.companyId === targetCompanyId)
    : undefined;

  if (options.requireCompany && activeMemberships.length === 0 && !(allowSuperAdminBypass && isSuperAdmin)) {
    throw new Error('Empresa não identificada.');
  }

  if (options.matchCompanyId) {
    if (!targetMembership && !(allowSuperAdminBypass && isSuperAdmin)) {
      throw new Error('Acesso negado para esta empresa.');
    }
  }

  if (options.role) {
    const hasRequiredRoleInContext = targetMembership?.role === options.role;
    const hasRequiredRoleGlobally = session.role === options.role;
    const hasRequiredRoleInAnyMembership = activeMemberships.some((membership) => membership.role === options.role);
    const hasRoleBySuperAdminBypass =
      allowSuperAdminBypass
      && isSuperAdmin
      && (options.role === 'admin' || options.role === 'user');

    if (!hasRequiredRoleInContext && !hasRequiredRoleGlobally && !hasRequiredRoleInAnyMembership && !hasRoleBySuperAdminBypass) {
      throw new Error('Acesso restrito a administradores.');
    }
  }

  return session;
}

export async function requireSuperAdmin(): Promise<AuthContext> {
  return requireAuth({ requireSuperAdmin: true, allowSuperAdminBypass: true });
}

export function hasPermission(session: AuthContext, permission: AclPermission, companyId?: string): boolean {
  const globalPermissions = new Set(session.permissions ?? []);
  if (globalPermissions.has(permission)) {
    return true;
  }

  if (!companyId) {
    return false;
  }

  const scopedPermissions = session.scopedPermissions ?? [];
  const targetScope = scopedPermissions.find((scope) => scope.companyId === companyId);
  return Boolean(targetScope?.permissions?.includes(permission));
}

export async function requirePermission(
  permission: AclPermission,
  options: { companyId?: string; errorMessage?: string } = {}
): Promise<AuthContext> {
  const session = await requireAuth();
  if (!hasPermission(session, permission, options.companyId)) {
    throw new Error(options.errorMessage ?? `Acesso restrito: permissão '${permission}' é obrigatória.`);
  }

  return session;
}
