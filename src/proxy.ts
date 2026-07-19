import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-saas-school-automation-result-engine'
);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect all dashboard pages at the server level
  if (pathname.startsWith('/dashboard')) {
    const tokenCookie = req.cookies.get('report_auth_token');
    const token = tokenCookie?.value;

    if (!token) {
      // If token is missing, redirect to login page immediately
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('expired', 'true');
      return NextResponse.redirect(url);
    }

    try {
      // Verify JWT signature and expiration on the server side
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (err) {
      // Clear the invalid session cookie and redirect to login
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

// Limit middleware to run only on dashboard path routes
export const config = {
  matcher: ['/dashboard/:path*'],
};
