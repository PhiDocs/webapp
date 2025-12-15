import { NextResponse, type NextRequest } from 'next/server';
import * as jose from 'jose';

const FIREBASE_PROJECT_ID = 'safety-docs-ai-app'; // Hardcoded Project ID
const JWKS_URI = `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`;

// Routes that do not require authentication
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
  
  // 1. If trying to access a public route
  if (isPublicRoute) {
    // If user has a valid session, redirect them to the home page
    if (sessionCookie?.value) {
        const session = await verifyIdToken(sessionCookie.value);
        if (session) {
             return NextResponse.redirect(new URL('/', request.url));
        }
    }
    // Otherwise, allow access to the public route
    return NextResponse.next();
  }

  // 2. If trying to access a protected route
  // If user does not have a session cookie, redirect to login
  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user has a session cookie, verify it
  const session = await verifyIdToken(sessionCookie.value);
  if (!session) {
      // If verification fails, redirect to login and clear the invalid cookie
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
  }

  // 3. If session is valid and user is on a protected route, allow access
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
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
