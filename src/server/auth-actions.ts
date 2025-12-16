'use server';

import { cookies } from 'next/headers';
import admin from '@/firebase/admin-config';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Garante que um documento de usuário exista no Firestore e esteja sincronizado
 * com as custom claims do token.
 * Se não existir, cria um.
 * Se existir e a role ou companyId for diferente, atualiza.
 */
async function ensureAndSyncUserDocument(decodedToken: DecodedIdToken) {
  const { uid, email, name } = decodedToken;
  const existingUser = await UserRepository.get(uid);

  // Define um tipo seguro para as claims
  const customClaims = (decodedToken || {}) as { role?: 'admin' | 'user', companyId?: string };
  const roleFromClaims = customClaims.role || 'user';
  const companyIdFromClaims = customClaims.companyId;

  if (existingUser) {
    const updates: { [key: string]: any } = {};
    if (roleFromClaims !== existingUser.role) {
      updates.role = roleFromClaims;
    }
    // Garante que a comparação funcione mesmo se existingUser.companyId for undefined
    if (companyIdFromClaims !== existingUser.companyId) {
      // Usa null para remover o campo se ele não existir mais nas claims
      updates.companyId = companyIdFromClaims || null; 
    }

    if (Object.keys(updates).length > 0) {
      await UserRepository.update(uid, updates);
    }
  } else {
    // Se o usuário não existe no Firestore, cria o documento com todos os dados do token
    await UserRepository.create(uid, {
      uid,
      name: name || email!,
      email: email!,
      role: roleFromClaims,
      companyId: companyIdFromClaims,
    });
  }
}

/**
 * Cria um cookie de sessão a partir de um ID token do Firebase
 * e garante que o usuário correspondente tenha um registro no Firestore.
 */
export async function createSession(idToken: string): Promise<{ error: string | null }> {
  try {
    const adminAuth = admin.auth();
    const decodedToken = await adminAuth.verifyIdToken(idToken, true);

    // Garante que o documento do Firestore está sincronizado com os claims do token.
    // Esta é a etapa crucial que atualiza o Firestore.
    await ensureAndSyncUserDocument(decodedToken);

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
  } catch (error: any)
 {
    console.error('Firebase SignOut Error:', error);
    await ErrorLogRepository.log(error, 'signOut');
    return { error: 'Falha ao fazer logout.' };
  }
}
