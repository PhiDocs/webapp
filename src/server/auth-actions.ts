'use server';

import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository, type CompanyMembership } from '@/repositories/user.repository';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Ensure a user document exists in Firestore and is synced
 * with the token custom claims.
 * If it doesn't exist, create it.
 * If it exists and role or companyId differ, update it.
 */
async function ensureAndSyncUserDocument(decodedToken: DecodedIdToken) {
  const { uid, email, name } = decodedToken;
  const existingUser = await UserRepository.get(uid);

  // Use a safe type for claims
  const customClaims = (decodedToken || {}) as { role?: 'admin' | 'user', companyId?: string };
  const roleFromClaims = customClaims.role || 'user';
  const companyIdFromClaims = customClaims.companyId;

  if (existingUser) {
    const updates: { [key: string]: any } = {};
    if (roleFromClaims !== existingUser.role) {
      updates.role = roleFromClaims;
    }

    let memberships = [...(existingUser.memberships ?? [])] as CompanyMembership[];

    // Compatibilidade: mantém o vínculo legado de companyId como membership.
    if (companyIdFromClaims && !memberships.some((membership) => membership.companyId === companyIdFromClaims)) {
      memberships.push({
        companyId: companyIdFromClaims,
        role: roleFromClaims,
        status: 'active',
        joinedAt: new Date().toISOString(),
      });
      updates.memberships = memberships;
    }

    const activeMembership = memberships.find((membership) => membership.status === 'active');
    const currentActiveExists = existingUser.activeCompanyId
      ? memberships.some((membership) => membership.status === 'active' && membership.companyId === existingUser.activeCompanyId)
      : false;

    if (!currentActiveExists) {
      updates.activeCompanyId = activeMembership?.companyId ?? null;
    }

    // Mantém companyId legado espelhado para não quebrar fluxos durante migração.
    const nextLegacyCompanyId = updates.activeCompanyId ?? existingUser.activeCompanyId ?? existingUser.companyId ?? companyIdFromClaims ?? null;
    if (nextLegacyCompanyId !== existingUser.companyId) {
      updates.companyId = nextLegacyCompanyId;
    }

    if (Object.keys(updates).length > 0) {
      await UserRepository.update(uid, updates);
    }
  } else {
    const memberships: CompanyMembership[] = companyIdFromClaims
      ? [{
          companyId: companyIdFromClaims,
          role: roleFromClaims,
          status: 'active',
          joinedAt: new Date().toISOString(),
        }]
      : [];
    const activeCompanyId = memberships[0]?.companyId ?? null;

    // If the user doesn't exist in Firestore, create the document with token data
    await UserRepository.create(uid, {
      uid,
      name: name || email!,
      email: email!,
      role: roleFromClaims,
      companyId: activeCompanyId,
      activeCompanyId,
      memberships,
    });
  }
}

/**
 * Create a session cookie from a Firebase ID token
 * and ensure the user has a Firestore record.
 */
export async function createSession(idToken: string): Promise<{ error: string | null }> {
  try {
    const adminAuth = admin.auth();
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // Ensure the Firestore document is synced with token claims.
    // This is the key step that updates Firestore.
    await ensureAndSyncUserDocument(decodedToken);

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    const cookieStore = await cookies();
    cookieStore.set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn,
      path: '/',
    });

    return { error: null };
  } catch (error: any) {
    console.error('Server-side session creation error:', error);
    await ErrorLogRepository.log(error, 'createSession');
    return { error: `Falha ao criar sessão: ${error.message}` };
  }
}

/**
 * Sign out the current user and remove the session cookie.
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return { error: null };
  } catch (error: any)
 {
    console.error('Firebase SignOut Error:', error);
    await ErrorLogRepository.log(error, 'signOut');
    return { error: 'Falha ao fazer logout.' };
  }
}
