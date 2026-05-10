'use server';

import { cookies } from 'next/headers';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';
import { createSupabaseAdminClient } from '@/supabase/server';
import { SESSION_META_COOKIE_NAME, signSessionCookie } from '@/lib/auth/session-cookie';

async function ensureUserDocument(authUser: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  const uid = authUser.id;
  const email = authUser.email;
  const existingUser = await UserRepository.get(uid);

  if (!existingUser && email) {
    await UserRepository.create(uid, {
      uid,
      name: authUser.user_metadata?.name || email,
      email,
      role: 'user',
      companyId: null,
    });
  }
}

export async function createSession(session: { accessToken: string; refreshToken: string; expiresIn?: number }): Promise<{ error: string | null }> {
  try {
    const { data, error } = await createSupabaseAdminClient().auth.getUser(session.accessToken);
    if (error || !data.user) {
      throw error ?? new Error('Sessão inválida.');
    }

    await ensureUserDocument(data.user);
    const profile = await UserRepository.get(data.user.id);

    const maxAge = session.expiresIn ?? 60 * 60;
    const cookieStore = await cookies();
    cookieStore.set('session', session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    cookieStore.set('refreshToken', session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    cookieStore.set(
      SESSION_META_COOKIE_NAME,
      await signSessionCookie({
        uid: data.user.id,
        email: data.user.email ?? undefined,
        name: profile?.name ?? data.user.user_metadata?.name ?? data.user.email ?? 'Usuario',
        role: profile?.role ?? 'user',
        companyId: profile?.companyId ?? undefined,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      }
    );

    return { error: null };
  } catch (error: any) {
    console.error('Server-side session creation error:', error);
    await ErrorLogRepository.log(error, 'createSession');
    return { error: `Falha ao criar sessão: ${error.message}` };
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    cookieStore.delete('refreshToken');
    cookieStore.delete(SESSION_META_COOKIE_NAME);
    return { error: null };
  } catch (error: any)
 {
    console.error('Supabase SignOut Error:', error);
    await ErrorLogRepository.log(error, 'signOut');
    return { error: 'Falha ao fazer logout.' };
  }
}
