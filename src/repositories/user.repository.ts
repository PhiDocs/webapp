import admin from '@/firebase/admin-config';
import type { AclPermission, ScopedPermission } from '@/lib/acl';

export type CompanyMembership = {
    companyId: string;
    role: 'admin' | 'user';
    status: 'active' | 'inactive';
    joinedAt: string;
    invitedBy?: string;
}

export type UserData = {
    uid: string;
    name: string;
    email: string;
    role?: 'super-admin' | 'admin' | 'user'; // legado/global
    isSuperAdmin?: boolean;
    permissions?: AclPermission[];
    scopedPermissions?: ScopedPermission[];
    companyId?: string | null; // legado 1:1
    activeCompanyId?: string | null;
    memberships?: CompanyMembership[];
}

const userCollection = admin.firestore().collection('users');

function toActiveMemberships(memberships?: CompanyMembership[]): CompanyMembership[] {
    return (memberships ?? []).filter((membership) => membership.status === 'active');
}

function normalizeMemberships(user: Pick<UserData, 'companyId' | 'role' | 'memberships'>): CompanyMembership[] {
    const membershipMap = new Map<string, CompanyMembership>();

    for (const membership of user.memberships ?? []) {
        if (!membership?.companyId) continue;
        membershipMap.set(membership.companyId, membership);
    }

    // Compatibilidade com o modelo legado (companyId único).
    if (user.companyId && !membershipMap.has(user.companyId)) {
        const legacyRole: 'admin' | 'user' = user.role === 'admin' ? 'admin' : 'user';
        membershipMap.set(user.companyId, {
            companyId: user.companyId,
            role: legacyRole,
            status: 'active',
            joinedAt: new Date().toISOString(),
        });
    }

    return Array.from(membershipMap.values());
}

function resolveActiveCompanyId(user: Pick<UserData, 'activeCompanyId'>, memberships: CompanyMembership[]): string | null {
    const activeMemberships = toActiveMemberships(memberships);
    if (activeMemberships.length === 0) return null;

    if (user.activeCompanyId && activeMemberships.some((membership) => membership.companyId === user.activeCompanyId)) {
        return user.activeCompanyId;
    }

    return activeMemberships[0].companyId;
}

function normalizePermissions(user: Pick<UserData, 'permissions' | 'scopedPermissions'>): Pick<UserData, 'permissions' | 'scopedPermissions'> {
    const permissions = Array.isArray(user.permissions)
        ? Array.from(new Set(user.permissions))
        : [];

    const scopedPermissions = Array.isArray(user.scopedPermissions)
        ? user.scopedPermissions
            .filter((item): item is ScopedPermission => Boolean(item?.companyId))
            .map((item) => ({
                companyId: item.companyId,
                permissions: Array.from(new Set(item.permissions ?? [])),
            }))
        : [];

    return { permissions, scopedPermissions };
}

export const UserRepository = {
    /**
     * Create a new user document in Firestore.
     * @param userId - The Firebase Auth user UID.
     * @param data - The user data.
     */
    async create(userId: string, data: UserData): Promise<void> {
        await userCollection.doc(userId).set({
            ...data,
            createdAt: new Date().toISOString(),
        });
    },

    /**
     * Update a user document in Firestore.
     * @param userId - The user UID.
     * @param data - Fields to update.
     */
    async update(userId: string, data: { [key: string]: any }): Promise<void> {
        await userCollection.doc(userId).update(data);
    },

    /**
     * Fetch a user by UID.
     * @param userId - The user UID.
     * @returns The user data or null if not found.
     */
    async get(userId: string): Promise<UserData | null> {
        const doc = await userCollection.doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        const user = doc.data() as UserData;
        const memberships = normalizeMemberships(user);
        const activeCompanyId = resolveActiveCompanyId(user, memberships);
        const { permissions, scopedPermissions } = normalizePermissions(user);

        return {
            ...user,
            memberships,
            activeCompanyId,
            permissions,
            scopedPermissions,
        };
    },

    async list(): Promise<UserData[]> {
        const snapshot = await userCollection.orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map((doc) => {
            const user = doc.data() as UserData;
            const memberships = normalizeMemberships(user);
            const activeCompanyId = resolveActiveCompanyId(user, memberships);
            const { permissions, scopedPermissions } = normalizePermissions(user);

            return {
                ...user,
                memberships,
                activeCompanyId,
                permissions,
                scopedPermissions,
            };
        });
    },

    async setActiveCompany(userId: string, companyId: string): Promise<void> {
        const user = await this.get(userId);
        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const hasMembership = toActiveMemberships(user.memberships).some((membership) => membership.companyId === companyId);
        if (!hasMembership) {
            throw new Error('Usuário não tem acesso à empresa selecionada.');
        }

        await userCollection.doc(userId).update({ activeCompanyId: companyId });
    },

    async upsertMembership(
        userId: string,
        membership: Omit<CompanyMembership, 'joinedAt' | 'status'> & { status?: CompanyMembership['status'] }
    ): Promise<void> {
        const user = await this.get(userId);
        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const memberships = [...(user.memberships ?? [])];
        const existingIndex = memberships.findIndex((item) => item.companyId === membership.companyId);
        const now = new Date().toISOString();

        if (existingIndex >= 0) {
            memberships[existingIndex] = {
                ...memberships[existingIndex],
                role: membership.role,
                status: membership.status ?? memberships[existingIndex].status ?? 'active',
            };
        } else {
            const newMembership: CompanyMembership = {
                companyId: membership.companyId,
                role: membership.role,
                status: membership.status ?? 'active',
                joinedAt: now,
            };
            if (membership.invitedBy) {
                newMembership.invitedBy = membership.invitedBy;
            }
            memberships.push(newMembership);
        }

        const activeCompanyId = resolveActiveCompanyId(user, memberships);
        await userCollection.doc(userId).update({
            memberships,
            activeCompanyId,
        });
    },

    async removeMembership(userId: string, companyId: string): Promise<void> {
        const user = await this.get(userId);
        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        const memberships = (user.memberships ?? []).filter((membership) => membership.companyId !== companyId);
        const activeCompanyId = resolveActiveCompanyId(user, memberships);

        await userCollection.doc(userId).update({
            memberships,
            activeCompanyId,
            companyId: activeCompanyId,
        });
    }
};
