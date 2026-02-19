'use server';

import { revalidatePath } from 'next/cache';
import { companySettingsFormSchema } from '@/lib/types';
import { CompanyRepository } from '@/repositories/company.repository';
import { UserRepository } from '@/repositories/user.repository';
import { requirePermission, requireSuperAdmin } from '@/server/auth-guard';
import { ACL_PERMISSIONS, type AclPermission } from '@/lib/acl';

type GlobalUserView = {
  uid: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'user';
  isSuperAdmin: boolean;
  activeCompanyId: string | null;
  membershipsCount: number;
  activeMembershipsCount: number;
  createdAt?: string;
  permissions: AclPermission[];
};

const ALLOWED_PERMISSIONS = new Set<AclPermission>(ACL_PERMISSIONS);

export async function getSuperAdminOverview() {
  try {
    await requireSuperAdmin();
    const [companies, users] = await Promise.all([
      CompanyRepository.getAll(),
      UserRepository.list(),
    ]);

    const superAdminsCount = users.filter((user) => user.isSuperAdmin || user.role === 'super-admin').length;
    const adminsCount = users.filter((user) => (user.memberships ?? []).some((membership) => membership.role === 'admin' && membership.status === 'active')).length;

    return {
      success: true,
      data: {
        companiesCount: companies.length,
        usersCount: users.length,
        superAdminsCount,
        companyAdminsCount: adminsCount,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao carregar visão geral.' };
  }
}

export async function getGlobalCompanies() {
  try {
    await requireSuperAdmin();
    const companies = await CompanyRepository.getAll();
    return { success: true, data: companies };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao buscar empresas.' };
  }
}

export async function getGlobalUsers(): Promise<{ success: boolean; data?: GlobalUserView[]; error?: string }> {
  try {
    await requireSuperAdmin();
    const users = await UserRepository.list();

    const data = users
      .map((user) => {
        const memberships = user.memberships ?? [];
        const activeMemberships = memberships.filter((membership) => membership.status === 'active');
        const hasAdminMembership = activeMemberships.some((membership) => membership.role === 'admin');
        const isSuperAdmin = Boolean(user.isSuperAdmin || user.role === 'super-admin');
        const role: GlobalUserView['role'] = isSuperAdmin
          ? 'super-admin'
          : hasAdminMembership
            ? 'admin'
            : 'user';

        return {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role,
          isSuperAdmin,
          activeCompanyId: user.activeCompanyId ?? null,
          membershipsCount: memberships.length,
          activeMembershipsCount: activeMemberships.length,
          createdAt: (user as any).createdAt,
          permissions: user.permissions ?? [],
        } satisfies GlobalUserView;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao buscar usuários globais.' };
  }
}

export async function createCompanyAsSuperAdmin(data: unknown): Promise<{ success: boolean; error?: string; companyId?: string }> {
  try {
    await requireSuperAdmin();
    await requirePermission('company.create');
  } catch (error: any) {
    return { success: false, error: error.message || 'Acesso negado.' };
  }

  const validation = companySettingsFormSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return { success: false, error: Object.values(errors).flat().join(', ') };
  }

  try {
    const companyId = await CompanyRepository.create(validation.data);
    revalidatePath('/admin');
    return { success: true, companyId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao criar empresa.' };
  }
}

export async function getUserPermissions(userId: string): Promise<{ success: boolean; data?: AclPermission[]; error?: string }> {
  try {
    await requireSuperAdmin();
    const user = await UserRepository.get(userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado.' };
    }

    return { success: true, data: user.permissions ?? [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao carregar permissões do usuário.' };
  }
}

export async function setUserPermissions(params: {
  userId: string;
  permissions: AclPermission[];
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireSuperAdmin();

    const userId = params.userId?.trim();
    if (!userId) {
      return { success: false, error: 'userId é obrigatório.' };
    }

    const sanitizedPermissions = Array.from(new Set(params.permissions ?? []))
      .filter((permission): permission is AclPermission => ALLOWED_PERMISSIONS.has(permission as AclPermission));

    await UserRepository.update(userId, { permissions: sanitizedPermissions });
    revalidatePath('/admin');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao salvar permissões do usuário.' };
  }
}
