'use server';

import { auth, db } from '@/firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';

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
      // Retorna o próprio código de erro se não for um dos erros conhecidos
      return `Erro não mapeado: ${errorCode}`;
  }
};

/**
 * Registra um novo usuário com e-mail e senha.
 */
export async function signUp(
  values: SignupValues
): Promise<{ error: string | null; data: { uid: string } | null }> {
  const validatedFields = signupSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: ptBr.validations.invalidFormData.replace('{{details}}', validatedFields.error.message), data: null };
  }

  const { email, password, name } = validatedFields.data;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // TODO: Usar o UserRepository para criar o usuário no Firestore
    // Por enquanto, vamos criar diretamente para validar o fluxo
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: 'user', // Por padrão, todo novo usuário é 'user'
      createdAt: new Date().toISOString(),
    });

    return { error: null, data: { uid: user.uid } };
  } catch (error: any) {
    console.error('Firebase SignUp Error:', error);
    // Alteração: Agora retornamos a mensagem de erro original para depuração.
    const errorMessage = getFirebaseAuthErrorMessage(error.code || 'UNKNOWN_ERROR');
    const finalErrorMessage = `${ptBr.validations.authFailed.replace('{{details}}', errorMessage)} (Detalhe: ${error.message || 'Sem detalhes'})`;
    return { error: finalErrorMessage, data: null };
  }
}

/**
 * Autentica um usuário com e-mail e senha.
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
    return { error: null, data: { uid: userCredential.user.uid } };
  } catch (error: any) {
    console.error('Firebase SignIn Error:', error);
    const errorMessage = getFirebaseAuthErrorMessage(error.code || 'UNKNOWN_ERROR');
     const finalErrorMessage = `${ptBr.validations.authFailed.replace('{{details}}', errorMessage)} (Detalhe: ${error.message || 'Sem detalhes'})`;
    return { error: finalErrorMessage, data: null };
  }
}
