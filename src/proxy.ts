import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_META_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session-cookie';

const PUBLIC_ROUTES = ['/login', '/signup'];
const NO_COMPANY_ALLOWED_ROUTE = '/awaiting-company';
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

  if (!sessionCookie?.value) {
    return NextResponse.next();
  }

  const sessionMeta = sessionMetaCookie ? await verifySessionCookie(sessionMetaCookie) : null;
  const hasCompany = Boolean(sessionMeta?.companyId);
  const isAwaitingCompanyRoute = pathname.startsWith(NO_COMPANY_ALLOWED_ROUTE);
  const redirectUrl =
    sessionMeta?.role === 'admin' && sessionMeta.companyId
      ? `${ADMIN_DASHBOARD_PREFIX}/${sessionMeta.companyId}`
      : hasCompany
        ? USER_DASHBOARD
        : NO_COMPANY_ALLOWED_ROUTE;

  if (isPublicRoute) {
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  if (sessionMeta && !hasCompany && !isAwaitingCompanyRoute) {
    return NextResponse.redirect(new URL(NO_COMPANY_ALLOWED_ROUTE, request.url));
  }

  if (hasCompany && isAwaitingCompanyRoute) {
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
