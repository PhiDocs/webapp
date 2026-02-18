'use server';

import admin from '@/firebase/admin-config';
import { CompanyRepository } from '@/repositories/company.repository';
import { UserRepository } from '@/repositories/user.repository';
import { requireAuth } from '@/server/auth-guard';

type MembershipRole = 'admin' | 'user';

type CompanyMembershipUser = {
  uid: string;
  name: string;
  email: string;
  role: MembershipRole;
  status: 'active' | 'inactive';
  joinedAt: string;
  isActiveCompany: boolean;
};

async function ensureAdminForCompany(companyId: string) {
  await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
}

async function syncLegacyClaimCompanyId(uid: string, companyId: string | null) {
  const auth = admin.auth();
  const user = await auth.getUser(uid);
  const claims = { ...(user.customClaims ?? {}) };

  if (companyId) {
    claims.companyId = companyId;
  } else {
    delete claims.companyId;
  }

  await auth.setCustomUserClaims(uid, claims);
}

export async function getCompanyMembershipUsers(companyId: string): Promise<{ success: boolean; data?: CompanyMembershipUser[]; error?: string }> {
  try {
    if (!companyId) {
      return { success: false, error: 'ID da empresa é obrigatório.' };
    }

    await ensureAdminForCompany(companyId);
    const users = await UserRepository.list();

    const data = users
      .map((user) => {
        const membership = user.memberships?.find((item) => item.companyId === companyId);
        if (!membership) return null;
        return {
          uid: user.uid,
          name: user.name,
          email: user.email,
          role: membership.role,
          status: membership.status,
          joinedAt: membership.joinedAt,
          isActiveCompany: user.activeCompanyId === companyId,
        } satisfies CompanyMembershipUser;
      })
      .filter((item): item is CompanyMembershipUser => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao buscar acessos da empresa.' };
  }
}

export async function addCompanyMembershipByEmail(params: {
  companyId: string;
  email: string;
  role: MembershipRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const companyId = params.companyId?.trim();
    const email = params.email?.trim().toLowerCase();
    const role = params.role;

    if (!companyId || !email || !role) {
      return { success: false, error: 'companyId, email e role são obrigatórios.' };
    }

    await ensureAdminForCompany(companyId);

    const company = await CompanyRepository.getById(companyId);
    if (!company) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    const auth = admin.auth();
    const userRecord = await auth.getUserByEmail(email);
    const firestoreUser = await UserRepository.get(userRecord.uid);

    if (!firestoreUser) {
      await UserRepository.create(userRecord.uid, {
        uid: userRecord.uid,
        name: userRecord.displayName || email,
        email,
        role: 'user',
        memberships: [],
        activeCompanyId: null,
        companyId: null,
      });
    }

    await UserRepository.upsertMembership(userRecord.uid, {
      companyId,
      role,
      status: 'active',
    });

    const updatedUser = await UserRepository.get(userRecord.uid);
    await syncLegacyClaimCompanyId(userRecord.uid, updatedUser?.activeCompanyId ?? null);

    return { success: true };
  } catch (error: any) {
    if (error?.code === 'auth/user-not-found') {
      return { success: false, error: 'Usuário não encontrado no Firebase Auth para este e-mail.' };
    }
    return { success: false, error: error.message || 'Falha ao adicionar acesso do usuário.' };
  }
}

export async function updateCompanyMembershipRole(params: {
  userId: string;
  companyId: string;
  role: MembershipRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = params.userId?.trim();
    const companyId = params.companyId?.trim();
    const role = params.role;

    if (!userId || !companyId || !role) {
      return { success: false, error: 'userId, companyId e role são obrigatórios.' };
    }

    await ensureAdminForCompany(companyId);
    await UserRepository.upsertMembership(userId, { companyId, role, status: 'active' });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao atualizar role do acesso.' };
  }
}

export async function removeCompanyMembership(params: {
  userId: string;
  companyId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = params.userId?.trim();
    const companyId = params.companyId?.trim();

    if (!userId || !companyId) {
      return { success: false, error: 'userId e companyId são obrigatórios.' };
    }

    await ensureAdminForCompany(companyId);
    await UserRepository.removeMembership(userId, companyId);

    const updatedUser = await UserRepository.get(userId);
    await syncLegacyClaimCompanyId(userId, updatedUser?.activeCompanyId ?? null);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Falha ao remover acesso do usuário.' };
  }
}
