// Uso:
// npx tsx scripts/admin/manage-memberships.ts list "email@dominio.com"
// npx tsx scripts/admin/manage-memberships.ts add "email@dominio.com" "companyId" "admin|user"
// npx tsx scripts/admin/manage-memberships.ts remove "email@dominio.com" "companyId"
// npx tsx scripts/admin/manage-memberships.ts set-active "email@dominio.com" "companyId"
import 'dotenv/config';
import admin from '../../src/firebase/admin-config';
import { UserRepository, type CompanyMembership } from '../../src/repositories/user.repository';

type Command = 'list' | 'add' | 'remove' | 'set-active';
type Role = 'admin' | 'user';

const command = process.argv[2] as Command | undefined;
const emailArg = process.argv[3]?.trim().toLowerCase();
const companyIdArg = process.argv[4]?.trim();
const roleArg = process.argv[5] as Role | undefined;

function usage(): never {
  console.log(`
Uso:
  npx tsx scripts/admin/manage-memberships.ts list "email@dominio.com"
  npx tsx scripts/admin/manage-memberships.ts add "email@dominio.com" "companyId" "admin|user"
  npx tsx scripts/admin/manage-memberships.ts remove "email@dominio.com" "companyId"
  npx tsx scripts/admin/manage-memberships.ts set-active "email@dominio.com" "companyId"
`);
  process.exit(1);
}

function validateRole(role?: string): role is Role {
  return role === 'admin' || role === 'user';
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

async function ensureMembershipFromLegacyIfNeeded(uid: string): Promise<CompanyMembership[]> {
  const user = await UserRepository.get(uid);
  if (!user) return [];
  return user.memberships ?? [];
}

async function main() {
  if (!command || !emailArg) usage();

  const auth = admin.auth();
  const userRecord = await auth.getUserByEmail(emailArg);
  const uid = userRecord.uid;

  const userDoc = await UserRepository.get(uid);
  if (!userDoc) {
    await UserRepository.create(uid, {
      uid,
      email: emailArg,
      name: userRecord.displayName || emailArg,
      role: 'user',
      companyId: userRecord.customClaims?.companyId as string | undefined,
      activeCompanyId: (userRecord.customClaims?.companyId as string | undefined) ?? null,
      memberships: [],
    });
  }

  if (command === 'list') {
    const user = await UserRepository.get(uid);
    console.log(JSON.stringify({
      uid,
      email: user?.email ?? emailArg,
      activeCompanyId: user?.activeCompanyId ?? null,
      memberships: await ensureMembershipFromLegacyIfNeeded(uid),
    }, null, 2));
    return;
  }

  if (!companyIdArg) usage();

  if (command === 'add') {
    if (!validateRole(roleArg)) usage();
    await UserRepository.upsertMembership(uid, { companyId: companyIdArg, role: roleArg, status: 'active' });
  } else if (command === 'remove') {
    await UserRepository.removeMembership(uid, companyIdArg);
  } else if (command === 'set-active') {
    await UserRepository.setActiveCompany(uid, companyIdArg);
  } else {
    usage();
  }

  const updatedUser = await UserRepository.get(uid);
  await syncLegacyClaimCompanyId(uid, updatedUser?.activeCompanyId ?? null);

  console.log(JSON.stringify({
    success: true,
    command,
    uid,
    email: emailArg,
    activeCompanyId: updatedUser?.activeCompanyId ?? null,
    memberships: updatedUser?.memberships ?? [],
  }, null, 2));
}

main().catch((error) => {
  console.error('Falha ao gerenciar memberships:', error);
  process.exit(1);
});
