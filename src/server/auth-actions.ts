'use server';

import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { UserRecord } from 'firebase-admin/auth';
import type { UserProfile } from '@/components/auth/session-provider';

/**
 * Garante que um documento de usuário exista no Firestore.
 * Se não existir, cria um a partir dos dados do token de autenticação.
 */
async function ensureUserDocument(decodedToken: UserRecord) {
  const { uid, email, displayName } = decodedToken;
  const existingUser = await UserRepository.get(uid);

  if (existingUser) {
    // Se o usuário já existe, podemos verificar se a role no token é diferente da do Firestore
    const customClaims = (decodedToken.customClaims || {}) as { role?: 'admin' | 'user' };
    if (customClaims.role && customClaims.role !== existingUser.role) {
      await UserRepository.update(uid, { role: customClaims.role });
    }
    return;
  }

  const customClaims = (decodedToken.customClaims || {}) as { role?: 'admin' | 'user', companyId?: string };
  
  await UserRepository.create(uid, {
    uid,
    name: displayName || email!,
    email: email!,
    role: customClaims.role || 'user',
    companyId: customClaims.companyId || '',
  });
}


/**
 * Cria um cookie de sessão a partir de um ID token do Firebase
 * e garante que o usuário correspondente tenha um registro no Firestore.
 */
export async function createSession(idToken: string): Promise<{ error: string | null }> {
  try {
    const adminAuth = admin.auth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    await ensureUserDocument(decodedToken);
    
    try {
      await UserRepository.update(decodedToken.uid, {
        lastSession: new Date().toISOString(),
      });
    } catch (firestoreError) {
      console.warn(`Could not update lastSession for user ${decodedToken.uid}. Document may not exist yet.`);
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 dias
    cookies().set('session', idToken, {
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
 * Desloga o usuário atual e remove o cookie de sessão.
 */
export async function signOut(): Promise<{ error: string | null }> {
  try {
    cookies().delete('session');
    return { error: null };
  } catch (error: any) {
    console.error('Firebase SignOut Error:', error);
    await ErrorLogRepository.log(error, 'signOut');
    return { error: 'Falha ao fazer logout.' };
  }
}
