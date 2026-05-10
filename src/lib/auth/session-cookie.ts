import { SignJWT, jwtVerify } from 'jose';

export type SessionCookiePayload = {
  uid: string;
  email?: string;
  name?: string;
  role: 'admin' | 'user';
  companyId?: string;
};

const SESSION_META_COOKIE_NAME = 'session_meta';

function getSessionSecret() {
  const secret =
    process.env.SESSION_COOKIE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'dev-session-secret-change-me';

  return new TextEncoder().encode(secret);
}

export async function signSessionCookie(payload: SessionCookiePayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSessionSecret());
}

export async function verifySessionCookie(token: string): Promise<SessionCookiePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());

    if (
      typeof payload.uid !== 'string' ||
      typeof payload.role !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'user')
    ) {
      return null;
    }

    return {
      uid: payload.uid,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      role: payload.role,
      companyId: typeof payload.companyId === 'string' ? payload.companyId : undefined,
    };
  } catch {
    return null;
  }
}

export { SESSION_META_COOKIE_NAME };
