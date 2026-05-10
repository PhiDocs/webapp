import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_META_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session-cookie';

const PUBLIC_ROUTES = ['/login'];
const ADMIN_DASHBOARD_PREFIX = '/company';
const USER_DASHBOARD = '/reports';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');
  const sessionMetaCookie = request.cookies.get(SESSION_META_COOKIE_NAME)?.value;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!sessionCookie?.value && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionCookie?.value && isPublicRoute) {
    const sessionMeta = sessionMetaCookie ? await verifySessionCookie(sessionMetaCookie) : null;
    const redirectUrl =
      sessionMeta?.role === 'admin' && sessionMeta.companyId
        ? `${ADMIN_DASHBOARD_PREFIX}/${sessionMeta.companyId}`
        : USER_DASHBOARD;

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
