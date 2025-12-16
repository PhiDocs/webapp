'use server';

import { auth, db } from '@/firebase/config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { loginSchema, signupSchema, type LoginValues, type SignupValues } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';
import { cookies } from 'next/headers';

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

// Função auxiliar para logar erros no Firestore
const logErrorToFirestore = async (error: any, functionName: string, email?: string) => {
    try {
        await addDoc(collection(db, 'errorLogs'), {
            timestamp: new Date().toISOString(),
            functionName,
            userEmail: email || 'N/A',
            errorCode: error.code || 'UNKNOWN_CODE',
            errorMessage: error.message || 'No error message available.',
            stackTrace: error.stack || 'No stack trace available.',
        });
    } catch (logError) {
        console.error('CRITICAL: Failed to log error to Firestore.', logError);
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

    // Atualiza o perfil de autenticação do Firebase com o nome
    await updateProfile(user, { displayName: name });

    // Salva os dados do usuário no Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: 'user', 
      createdAt: new Date().toISOString(),
    });

    return { error: null, data: { uid: user.uid } };
  } catch (error: any) {
    console.error('Firebase SignUp Error:', error);
    await logErrorToFirestore(error, 'signUp', email);
    const friendlyMessage = getFirebaseAuthErrorMessage(error.code);
    return { error: `Falha no cadastro: ${friendlyMessage}`, data: null };
  }
}

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
    
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, {
      lastSession: new Date().toISOString(),
    });

    // Create session cookie
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
    await logErrorToFirestore(error, 'signIn', email);
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
        await logErrorToFirestore(error, 'signOut');
        return { error: 'Falha ao fazer logout.' };
    }
}
