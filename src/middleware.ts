import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const FIREBASE_PROJECT_ID = 'studio-2124642360-17967';
const JWKS_URI = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;

const PUBLIC_ROUTES = ['/login'];
const ADMIN_ROUTES = ['/admin'];

interface VerifiedToken extends jose.JWTPayload {
  role?: string;
  companyId?: string;
}

async function verifyIdToken(token: string): Promise<VerifiedToken | null> {
  if (!FIREBASE_PROJECT_ID) {
    console.error('Firebase Project ID is not set.');
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
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAdminRoute = ADMIN_ROUTES.includes(pathname);

  const session = sessionCookie?.value ? await verifyIdToken(sessionCookie.value) : null;
  const userRole = session?.role;

  // 1. Se o usuário está logado e tenta acessar uma página pública (login),
  // redirecione-o para a página apropriada com base em seu papel.
  if (session && isPublicRoute) {
    const url = userRole === 'admin' ? '/admin' : '/';
    return NextResponse.redirect(new URL(url, request.url));
  }

  // 2. Se o usuário não está logado e tenta acessar uma página protegida,
  // redirecione-o para a página de login.
  if (!session && !isPublicRoute) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (sessionCookie) {
        response.cookies.delete('session');
    }
    return response;
  }

  // 3. Se um usuário que não é admin tenta acessar uma rota de admin,
  // redirecione-o para a página principal do usuário.
  if (session && isAdminRoute && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
  }

  // 4. Se um usuário admin tenta acessar a página principal de usuário,
  // redirecione-o para o painel de admin.
  if (session && pathname === '/' && userRole === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
  }

  // 5. Em todos os outros casos (usuário correto na rota correta), permitir o acesso.
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
