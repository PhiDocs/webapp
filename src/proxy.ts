import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const PUBLIC_ROUTES = ['/login'];

// Firebase/Google's public JWKS endpoint for verifying ID tokens
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

interface VerifiedToken {
  uid: string;
  email?: string;
}

function isExpectedTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : '';
  const name = 'name' in error ? String((error as { name?: unknown }).name ?? '') : '';

  return (
    code === 'ERR_JWKS_NO_MATCHING_KEY' ||
    code === 'ERR_JWT_EXPIRED' ||
    code === 'ERR_JWS_INVALID' ||
    name === 'JWTExpired' ||
    name === 'JWKSNoMatchingKey'
  );
}

async function verifyIdToken(token: string): Promise<VerifiedToken | null> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');
      return null;
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    return {
      uid: payload.sub as string,
      email: payload.email as string | undefined,
    };
  } catch (error) {
    // Sessões antigas/inválidas são esperadas e serão limpas no proxy.
    if (!isExpectedTokenError(error)) {
      console.warn('Token verification failed in proxy:', error);
    }
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  const session = sessionCookie?.value ? await verifyIdToken(sessionCookie.value) : null;
  const hasInvalidSessionCookie = Boolean(sessionCookie?.value && !session);

  // Sessão inválida: remove cookie para evitar erro recorrente em novas navegações.
  if (hasInvalidSessionCookie) {
    if (isPublicRoute) {
      const response = NextResponse.next();
      response.cookies.delete('session');
      return response;
    }

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }

  // 1. If not authenticated and trying to access a protected route, redirect to login
  if (!session && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (sessionCookie) {
        response.cookies.delete('session');
    }
    return response;
  }

  // 2. If authenticated
  if (session) {
    // 2a. If trying to access a public route (like /login), redirect to the appropriate dashboard
    if (isPublicRoute) {
        return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 3. Allow access by default
  return NextResponse.next();
}

// Configuration to define which routes the proxy should observe.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - anything with a file extension (e.g., .png, .jpg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
