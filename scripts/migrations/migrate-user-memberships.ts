// Migra usuários do modelo legado (companyId único) para memberships + activeCompanyId.
// Dry-run:
//   npx tsx scripts/migrations/migrate-user-memberships.ts
// Execução:
//   npx tsx scripts/migrations/migrate-user-memberships.ts --execute
import 'dotenv/config';
import admin from '../../src/firebase/admin-config';

type MembershipRole = 'admin' | 'user';

type Membership = {
  companyId: string;
  role: MembershipRole;
  status: 'active' | 'inactive';
  joinedAt: string;
  invitedBy?: string;
};

type UserDoc = {
  uid?: string;
  role?: MembershipRole;
  companyId?: string | null;
  activeCompanyId?: string | null;
  createdAt?: string;
  memberships?: Membership[];
};

const isExecute = process.argv.includes('--execute');
const db = admin.firestore();
const usersRef = db.collection('users');

function normalizeMemberships(data: UserDoc): Membership[] {
  const map = new Map<string, Membership>();
  const role = data.role ?? 'user';
  const joinedAt = data.createdAt ?? new Date().toISOString();

  for (const membership of data.memberships ?? []) {
    if (!membership?.companyId) continue;
    map.set(membership.companyId, membership);
  }

  if (data.companyId && !map.has(data.companyId)) {
    map.set(data.companyId, {
      companyId: data.companyId,
      role,
      status: 'active',
      joinedAt,
    });
  }

  return Array.from(map.values());
}

function resolveActiveCompanyId(data: UserDoc, memberships: Membership[]): string | null {
  const activeMemberships = memberships.filter((membership) => membership.status === 'active');
  if (activeMemberships.length === 0) return null;

  if (
    data.activeCompanyId &&
    activeMemberships.some((membership) => membership.companyId === data.activeCompanyId)
  ) {
    return data.activeCompanyId;
  }

  return activeMemberships[0].companyId;
}

async function main() {
  const snapshot = await usersRef.get();
  if (snapshot.empty) {
    console.log('Nenhum usuário encontrado para migrar.');
    return;
  }

  let scanned = 0;
  let changed = 0;
  let unchanged = 0;
  let batch = db.batch();
  let batchCount = 0;
  const batchLimit = 400;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() as UserDoc;
    const memberships = normalizeMemberships(data);
    const activeCompanyId = resolveActiveCompanyId(data, memberships);
    const legacyCompanyId = activeCompanyId;

    const next = {
      memberships,
      activeCompanyId,
      companyId: legacyCompanyId,
      updatedAt: new Date().toISOString(),
    };

    const sameMemberships = JSON.stringify(data.memberships ?? []) === JSON.stringify(memberships);
    const sameActive = (data.activeCompanyId ?? null) === activeCompanyId;
    const sameCompanyId = (data.companyId ?? null) === legacyCompanyId;

    if (sameMemberships && sameActive && sameCompanyId) {
      unchanged += 1;
      continue;
    }

    changed += 1;

    if (isExecute) {
      batch.update(doc.ref, next);
      batchCount += 1;

      if (batchCount >= batchLimit) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (isExecute && batchCount > 0) {
    await batch.commit();
  }

  console.log(JSON.stringify({
    mode: isExecute ? 'execute' : 'dry-run',
    scanned,
    changed,
    unchanged,
  }, null, 2));
}

main().catch((error) => {
  console.error('Falha na migração de memberships:', error);
  process.exit(1);
});
