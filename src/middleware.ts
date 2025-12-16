
import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

// Este é o seu Project ID do Firebase.
// É seguro mantê-lo aqui, pois não é uma informação secreta.
const FIREBASE_PROJECT_ID = 'studio-2124642360-17967';
const JWKS_URI = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;

// Rotas que são acessíveis publicamente
const PUBLIC_ROUTES = ['/login', '/signup'];

async function verifyIdToken(token: string) {
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

    return payload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const session = sessionCookie?.value ? await verifyIdToken(sessionCookie.value) : null;

  // 1. Se o usuário está logado e tenta acessar uma página pública (login/signup),
  // redirecione-o para a página principal.
  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. Se o usuário não está logado e tenta acessar uma página protegida,
  // redirecione-o para a página de login.
  if (!session && !isPublicRoute) {
    // Se a verificação do token falhar, removemos o cookie inválido.
    const response = NextResponse.redirect(new URL('/login', request.url));
    if (sessionCookie) {
        response.cookies.delete('session');
    }
    return response;
  }

  // 3. Em todos os outros casos (usuário logado em página protegida, ou
  // usuário não logado em página pública), permitir o acesso.
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
