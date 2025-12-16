'use server';

import { cookies } from 'next/headers';
import admin from 'firebase-admin';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';

/**
 * Cria um cookie de sessão a partir de um ID token do Firebase.
 * Esta função deve ser chamada APÓS o login bem-sucedido no cliente.
 */
export async function createSession(idToken: string): Promise<{ error: string | null }> {
  try {
    const adminAuth = admin.auth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    // Atualiza a data do último login no documento do usuário
    try {
      await UserRepository.update(uid, {
        lastSession: new Date().toISOString(),
      });
    } catch (firestoreError) {
      // Não bloqueia o login se o documento não for encontrado, apenas avisa.
      console.warn(`Could not update lastSession for user ${uid}. Document may not exist yet.`);
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
