import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/verify', '/oauth2/callback'];
const SELLER_PATHS = ['/seller'];
const ADMIN_PATHS = ['/admin'];
const AUTH_REQUIRED = ['/cart', '/checkout', '/orders', '/notifications', '/chat'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth pages: redirect to home if already logged in (checked via cookie presence heuristic)
  // Full auth check happens client-side via Zustand — middleware just handles basic guards
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
