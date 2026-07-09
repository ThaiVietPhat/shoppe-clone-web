import { NextResponse } from 'next/server';

// Route protection (/seller/* role guard, /cart /checkout /orders /notifications
// /chat /reviews login guard, /login /register redirect-if-logged-in) is enforced
// client-side (useRequireAuth hook, (seller)/layout.tsx) instead of here.
// Reason: the refresh-token cookie backend sets has Path=/api/auth
// (see AuthSecurityProperties.AuthCookieProperties), so it is never sent on
// page-navigation requests to this Next.js server — middleware has no reliable
// signal to check. The access token itself never touches the server; it only
// ever lives in memory on the client (Zustand), by design.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
