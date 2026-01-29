import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const PUBLIC_ROUTES = ['/login'];
const ADMIN_DASHBOARD_PREFIX = '/company';
const USER_DASHBOARD = '/reports';

// Firebase/Google's public JWKS endpoint for verifying ID tokens
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

interface VerifiedToken {
  uid: string;
  email?: string;
  role?: string;
  companyId?: string;
}

async function verifyIdToken(token: string): Promise<VerifiedToken | null> {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.error('FIREBASE_PROJECT_ID is not defined');
      return null;
    }

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    return {
      uid: payload.sub as string,
      email: payload.email as string | undefined,
      role: payload.role as string | undefined,
      companyId: payload.companyId as string | undefined,
    };
  } catch (error) {
    console.warn('Token verification failed in middleware:', error);
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
        const url = userRole === 'admin' && userCompanyId 
            ? `${ADMIN_DASHBOARD_PREFIX}/${userCompanyId}` 
            : USER_DASHBOARD;
        return NextResponse.redirect(new URL(url, request.url));
    }
    
    // 2b. If an admin tries to access a company page that isn't theirs, correct it
    if (userRole === 'admin' && userCompanyId && pathname.startsWith(ADMIN_DASHBOARD_PREFIX)) {
        const companyIdFromUrl = pathname.split('/')[2];
        if (companyIdFromUrl !== userCompanyId) {
            return NextResponse.redirect(new URL(`${ADMIN_DASHBOARD_PREFIX}/${userCompanyId}`, request.url));
        }
    }

    // 2c. If a non-admin tries to access an admin page, redirect them to their dashboard
    if (userRole !== 'admin' && pathname.startsWith(ADMIN_DASHBOARD_PREFIX)) {
        return NextResponse.redirect(new URL(USER_DASHBOARD, request.url));
    }
  }

  // 3. Allow access by default
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
