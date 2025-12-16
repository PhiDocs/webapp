'use server';

import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const JWKS_URI = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;

const PUBLIC_ROUTES = ['/login'];
const ADMIN_ROUTE_PREFIX = '/company';

interface VerifiedToken extends jose.JWTPayload {
  role?: string;
  companyId?: string;
}

async function verifyIdToken(token: string): Promise<VerifiedToken | null> {
  if (!FIREBASE_PROJECT_ID) {
    console.error('Firebase Project ID is not set in environment variables.');
    return null;
  }
  try {
    const JWKS = jose.createRemoteJWKSet(new URL(JWKS_URI));
    
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });

    return payload as VerifiedToken;
  } catch (error) {
    console.warn('Token verification failed, possibly expired or invalid:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  const session = sessionCookie?.value ? await verifyIdToken(sessionCookie.value) : null;
  const userRole = session?.role;
  const userCompanyId = session?.companyId;

  // Se não há sessão e a rota não é pública, redireciona para login.
  if (!session && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (sessionCookie) {
        response.cookies.delete('session');
    }
    return response;
  }

  // Se há sessão...
  if (session) {
    // Se o usuário logado tenta acessar uma rota pública (login), redireciona para a home.
    if (isPublicRoute) {
        const url = userRole === 'admin' && userCompanyId 
            ? `${ADMIN_ROUTE_PREFIX}/${userCompanyId}` 
            : '/';
        return NextResponse.redirect(new URL(url, request.url));
    }
    
    // Se um admin acessa a raiz, redireciona para a página da sua empresa.
    if (userRole === 'admin' && userCompanyId && pathname === '/') {
        return NextResponse.redirect(new URL(`${ADMIN_ROUTE_PREFIX}/${userCompanyId}`, request.url));
    }

    // Se um admin tenta acessar uma página de empresa que não é a sua, corrige a rota.
    if (userRole === 'admin' && userCompanyId && pathname.startsWith(ADMIN_ROUTE_PREFIX)) {
        const companyIdFromUrl = pathname.split('/')[2];
        if (companyIdFromUrl !== userCompanyId) {
            return NextResponse.redirect(new URL(`${ADMIN_ROUTE_PREFIX}/${userCompanyId}`, request.url));
        }
    }
  }

  // Em todos os outros casos, permite o acesso.
  return NextResponse.next();
}

// Configuração para definir quais rotas o middleware deve observar.
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
