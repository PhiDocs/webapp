'use server';

import { cookies } from 'next/headers';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { UserRepository } from '@/repositories/user.repository';
import { createSupabaseAdminClient } from '@/supabase/server';
import { SESSION_META_COOKIE_NAME, signSessionCookie } from '@/lib/auth/session-cookie';

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned;
}

async function ensureUserDocument(authUser: { id: string; email?: string; user_metadata?: Record<string, any> }) {
  const uid = authUser.id;
  const email = authUser.email;
  const existingUser = await UserRepository.get(uid);
  const metadataPhone = normalizePhone(authUser.user_metadata?.phone);

  if (!existingUser && email) {
    await UserRepository.create(uid, {
      uid,
      name: authUser.user_metadata?.name || email,
      email,
      phone: metadataPhone,
      role: 'user',
      companyId: null,
    });
    return;
  }

  if (!existingUser || !email) {
    return;
  }

  const nextName = authUser.user_metadata?.name || existingUser.name;
  const currentPhone = existingUser.phone ?? null;
  const nextPhone = existingUser.phone ?? metadataPhone ?? null;

  if (existingUser.name !== nextName || existingUser.email !== email || currentPhone !== nextPhone) {
    await UserRepository.update(uid, {
      name: nextName,
      email,
      phone: nextPhone ?? null,
    });
  }
}

export async function syncSignupProfile(data: {
  uid: string;
  name: string;
  phone?: string;
}): Promise<{ error: string | null }> {
  try {
    if (!data.uid) {
      throw new Error('UID inválido.');
    }

    const { data: authData, error: authError } = await createSupabaseAdminClient().auth.admin.getUserById(data.uid);
    if (authError || !authData.user) {
      throw authError ?? new Error('Usuário de autenticação não encontrado.');
    }

    const email = authData.user.email;
    if (!email) {
      throw new Error('E-mail do usuário não encontrado.');
    }

    const existingUser = await UserRepository.get(data.uid);
    const normalizedName = data.name?.trim() || authData.user.user_metadata?.name || email;
    const normalizedPhone = normalizePhone(data.phone) ?? normalizePhone(authData.user.user_metadata?.phone);

    if (existingUser) {
      await UserRepository.update(data.uid, {
        name: normalizedName,
        email,
        phone: normalizedPhone ?? null,
      });
    } else {
      await UserRepository.create(data.uid, {
        uid: data.uid,
        name: normalizedName,
        email,
        phone: normalizedPhone,
        role: 'user',
        companyId: null,
      });
    }

    return { error: null };
  } catch (error: any) {
    console.error('syncSignupProfile error:', error);
    await ErrorLogRepository.log(error, 'syncSignupProfile');
    return { error: error.message || 'Falha ao salvar perfil do usuário.' };
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
