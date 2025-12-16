'use server';

import { cookies } from 'next/headers';
import admin from 'firebase-admin';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';
import type { UserRecord } from 'firebase-admin/auth';

/**
 * Garante que um documento de usuário exista no Firestore.
 * Se não existir, cria um a partir dos dados do token de autenticação.
 */
async function ensureUserDocument(decodedToken: UserRecord) {
  const { uid, email, displayName } = decodedToken;
  const existingUser = await UserRepository.get(uid);

  // Se o usuário já existe, não faz nada.
  // A atualização de roles existentes pode ser uma funcionalidade futura.
  if (existingUser) {
    return;
  }

  // Se não existe, cria o documento no Firestore.
  // O custom claim 'role' define o papel inicial.
  const customClaims = (decodedToken.customClaims || {}) as { role?: 'admin' | 'user', companyId?: string };
  
  await UserRepository.create(uid, {
    uid,
    name: displayName || email!, // Usa o nome de exibição ou o e-mail como fallback
    email: email!,
    role: customClaims.role || 'user', // Padrão para 'user' se não houver claim
    companyId: customClaims.companyId || '',
  });
}


/**
 * Cria um cookie de sessão a partir de um ID token do Firebase
 * e garante que o usuário correspondente tenha um registro no Firestore.
 * Esta função deve ser chamada APÓS o login bem-sucedido no cliente.
 */
export async function createSession(idToken: string): Promise<{ error: string | null }> {
  try {
    const adminAuth = admin.auth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Garante que o documento do usuário existe no Firestore
    await ensureUserDocument(decodedToken);
    
    // Atualiza a data do último login no documento do usuário
    try {
      await UserRepository.update(decodedToken.uid, {
        lastSession: new Date().toISOString(),
      });
    } catch (firestoreError) {
      // Não bloqueia o login se o documento não for encontrado, apenas avisa.
      console.warn(`Could not update lastSession for user ${decodedToken.uid}. Document may not exist yet.`);
    }

    // Cria o cookie de sessão
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
