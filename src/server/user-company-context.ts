import { CompanyRepository } from '@/repositories/company.repository';
import type { CompanyMembership, UserData } from '@/repositories/user.repository';
import { UserRepository } from '@/repositories/user.repository';

function uniqueCompanyIds(user: UserData): string[] {
  const ids = new Set<string>();

  for (const membership of user.memberships ?? []) {
    if (membership?.companyId) ids.add(membership.companyId);
  }
  if (user.companyId) ids.add(user.companyId);
  if (user.activeCompanyId) ids.add(user.activeCompanyId);

  return Array.from(ids);
}

export async function sanitizeAndRepairUserCompanyContext(
  uid: string,
  user: UserData | null
): Promise<UserData | null> {
  if (!user) return null;

  const companyIds = uniqueCompanyIds(user);
  if (companyIds.length === 0) return user;

  const existingEntries = await Promise.all(
    companyIds.map(async (companyId) => {
      const company = await CompanyRepository.getById(companyId);
      return [companyId, Boolean(company)] as const;
    })
  );
  const existingCompanyIds = new Set(
    existingEntries.filter(([, exists]) => exists).map(([companyId]) => companyId)
  );

  const memberships: CompanyMembership[] = (user.memberships ?? []).filter(
    (membership) => membership?.companyId && existingCompanyIds.has(membership.companyId)
  );
  const activeMemberships = memberships.filter((membership) => membership.status === 'active');

  const nextActiveCompanyId =
    user.activeCompanyId && existingCompanyIds.has(user.activeCompanyId)
      ? user.activeCompanyId
      : activeMemberships[0]?.companyId ?? null;

  const nextCompanyId = nextActiveCompanyId ?? null;

  const membershipsChanged = JSON.stringify(user.memberships ?? []) !== JSON.stringify(memberships);
  const activeChanged = (user.activeCompanyId ?? null) !== nextActiveCompanyId;
  const legacyChanged = (user.companyId ?? null) !== nextCompanyId;

  if (!membershipsChanged && !activeChanged && !legacyChanged) {
    return user;
  }

  await UserRepository.update(uid, {
    memberships,
    activeCompanyId: nextActiveCompanyId,
    companyId: nextCompanyId,
  });

  return {
    ...user,
    memberships,
    activeCompanyId: nextActiveCompanyId,
    companyId: nextCompanyId,
  };
}
