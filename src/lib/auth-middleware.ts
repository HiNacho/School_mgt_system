import { NextRequest } from 'next/server';
import { verifyJWT } from './auth-utils';
import prisma from './db';

export interface UserSession {
  userId: string;
  role: string;
  schoolId: string | null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'AuthError';
  }
}

/**
 * Extracts and verifies the session token from the authorization header or browser cookies.
 * Throws AuthError (401) on failure.
 */
export async function requireAuth(req: NextRequest): Promise<UserSession> {
  const authHeader = req.headers.get('Authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fallback to cookie check if headers are not set
    const cookieHeader = req.cookies.get('report_auth_token');
    if (cookieHeader) {
      token = cookieHeader.value;
    }
  }

  if (!token) {
    throw new AuthError('Session token is missing or empty. Please log in.', 401);
  }

  try {
    const session = await verifyJWT(token);
    
    // Optionally check if the user is active and session token version matches in the database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true, tokenVersion: true }
    });

    if (!user || !user.isActive) {
      throw new AuthError('Your account has been suspended or deactivated. Contact your administrator.', 403);
    }

    if (session.tokenVersion !== undefined && user.tokenVersion !== session.tokenVersion) {
      throw new AuthError('Session expired. You have logged out from other devices. Please log in again.', 401);
    }

    return session;
  } catch (error: any) {
    throw new AuthError(error.message || 'Session verification failed.', 401);
  }
}

/**
 * Verifies if the authenticated session meets the role requirement rules.
 * Throws AuthError (403) on failure.
 */
export function requireRole(session: UserSession, allowedRoles: string[]): void {
  if (!allowedRoles.includes(session.role)) {
    throw new AuthError(`Access Denied: Your role '${session.role}' is not authorized to access this resource.`, 403);
  }
}

/**
 * Enforces strict multi-tenant school isolation.
 * Throws AuthError (403) if the user belongs to another school context.
 * Note: Platform-wide SUPER_ADMIN is exempt and bypassed.
 */
export function requireSchoolScope(session: UserSession, requestedSchoolId: string | null): void {
  if (session.role === 'SUPER_ADMIN') {
    return; // Super Admin has platform-wide global override scope
  }

  if (!session.schoolId || !requestedSchoolId || session.schoolId !== requestedSchoolId) {
    console.warn(`🚨 Security Violation: User ${session.userId} attempted cross-tenant access from School ${session.schoolId} to School ${requestedSchoolId}`);
    throw new AuthError('Access Denied: Strict data isolation boundary violated. You are not authorized to view this school tenant data.', 403);
  }
}

/**
 * Database-backed rate limiter for brute-force protection.
 * Counts failed logins within the last 15 minutes.
 * Throws AuthError (429) if limit (5 failures) is exceeded.
 */
export async function verifyRateLimit(usernameOrEmail: string, ipAddress: string): Promise<void> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      isSuccess: false,
      attemptTime: { gte: fifteenMinutesAgo },
      OR: [
        { ipAddress },
        { usernameOrEmail: usernameOrEmail.toLowerCase().trim() }
      ]
    }
  });

  if (failedAttempts >= 5) {
    throw new AuthError('Too many failed login attempts. Your account/IP is throttled. Please try again in 15 minutes.', 429);
  }
}

/**
 * Logs a login attempt to the database for audit and rate-limiting tracking.
 */
export async function logLoginAttempt(
  ipAddress: string,
  usernameOrEmail: string,
  isSuccess: boolean
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        ipAddress: ipAddress || 'unknown',
        usernameOrEmail: usernameOrEmail.toLowerCase().trim() || 'anonymous',
        isSuccess
      }
    });
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
}
