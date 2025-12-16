'use server';

import { auth } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { loginSchema, type LoginValues } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';
import { cookies } from 'next/headers';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';

// Mapeamento de erros do Firebase para mensagens amigáveis
const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Tente uma mais forte.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciais inválidas. Verifique seu e-mail e senha.';
    default:
      return ptBr.errors.unexpectedError;
  }
};

/**
 * Autentica um usuário com e-mail e senha, atualiza seu último login e cria um cookie de sessão.
 */
export async function signIn(
  values: LoginValues
): Promise<{ error: string | null; data: { uid: string } | null }> {
  const validatedFields = loginSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: ptBr.validations.invalidFormData.replace('{{details}}', validatedFields.error.message), data: null };
  }

  const { email, password } = validatedFields.data;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Atualiza a data do último login no documento do usuário
    try {
        await UserRepository.update(user.uid, {
            lastSession: new Date().toISOString(),
        });
    } catch (firestoreError) {
        console.warn(`Could not update lastSession for user ${user.uid}. Document may not exist yet.`);
    }

    // Cria o cookie de sessão
    const idToken = await user.getIdToken();
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    
    cookies().set('session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn,
      path: '/',
    });


    return { error: null, data: { uid: user.uid } };
  } catch (error: any) {
    console.error('Firebase SignIn Error:', error);
    await ErrorLogRepository.log(error, 'signIn', email);
    const friendlyMessage = getFirebaseAuthErrorMessage(error.code);
    return { error: `Falha na autenticação: ${friendlyMessage}`, data: null };
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
