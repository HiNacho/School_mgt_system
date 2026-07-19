import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-saas-school-automation-result-engine'
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public API endpoints that must bypass authentication redirect rules
  const isPublicApi = pathname.startsWith('/api/auth') || 
                      pathname.startsWith('/api/register') || 
                      pathname.startsWith('/api/setup') || 
                      pathname.startsWith('/api/tester');

  // Comprehensive list of protected path prefixes
  const protectedPrefixes = [
    '/dashboard', '/admin', '/superadmin', '/teacher', '/class-teacher',
    '/student', '/parent', '/results', '/attendance', '/messages',
    '/analytics', '/settings', '/profile', '/billing', '/timetable',
    '/reports', '/api'
  ];

  const isProtected = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  if (isProtected) {
    // If it's a public API endpoint, let it pass through
    if (pathname.startsWith('/api') && isPublicApi) {
      return NextResponse.next();
    }

    const tokenCookie = req.cookies.get('report_auth_token');
    const token = tokenCookie?.value;

    if (!token) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized. Session token is missing.' }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('expired', 'true');
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT signature and expiration on the server side
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Validation Check: Non-Superadmin users must belong to a school context
      const role = payload.role as string;
      const schoolId = payload.schoolId as string | null;
      if (role !== 'SUPER_ADMIN' && !schoolId) {
        throw new Error('User registry does not belong to an active school context');
      }

      return NextResponse.next();
    } catch (err) {
      if (pathname.startsWith('/api')) {
        const response = NextResponse.json({ error: 'Unauthorized. Session token is invalid or expired.' }, { status: 401 });
        response.cookies.set('report_auth_token', '', { path: '/', expires: new Date(0) });
        return response;
      }
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('expired', 'true');
      const response = NextResponse.redirect(url);
      response.cookies.set('report_auth_token', '', { path: '/', expires: new Date(0) });
      return response;
    }
  }

  return NextResponse.next();
}

// Config to target all private route patterns on the server
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/superadmin/:path*',
    '/teacher/:path*',
    '/class-teacher/:path*',
    '/student/:path*',
    '/parent/:path*',
    '/results/:path*',
    '/attendance/:path*',
    '/messages/:path*',
    '/analytics/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/billing/:path*',
    '/timetable/:path*',
    '/reports/:path*',
    '/api/:path*'
  ],
};
