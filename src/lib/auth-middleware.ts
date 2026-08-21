import { NextRequest } from 'next/server';
import { verifyJWT } from './auth-utils';
import prisma from './db';

export interface UserSession {
  userId: string;
  role: string;
  schoolId: string | null;
  managedSectionIds?: string[] | null; // null = full access, array = section-scoped
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
    
    // Fetch user to check active status AND load managedSectionIds
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true, managedSectionIds: true }
    });

    if (!user || !user.isActive) {
      throw new AuthError('Your account has been suspended or deactivated. Contact your administrator.', 403);
    }

    // Attach section scope to the session
    (session as UserSession).managedSectionIds = user.managedSectionIds
      ? JSON.parse(user.managedSectionIds)
      : null;

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
 * Returns the section IDs this user is scoped to, or null if they have full school access.
 * null  → no restriction (full school admin / super admin)
 * [...] → section-scoped admin, can only see data for these sections
 */
export function getSectionScope(session: UserSession): string[] | null {
  if (session.role === 'SUPER_ADMIN') return null;
  return session.managedSectionIds || null;
}

/**
 * Builds a Prisma `where` clause fragment that restricts class queries to the
 * user's managed sections. Returns {} if the user has full access.
 *
 * Usage in a student query:
 *   const sectionFilter = buildSectionFilter(session);
 *   prisma.student.findMany({ where: { schoolId, ...sectionFilter } })
 *
 * @param session     - The authenticated user session
 * @param classPath   - Dot-path to the class relation from the model being queried.
 *                      Defaults to 'class' (for Student, Score, Attendance etc.)
 *                      Pass null to filter Class records directly.
 */
export function buildSectionFilter(
  session: UserSession,
  classPath: 'class' | 'arm.class' | null = 'class'
): Record<string, any> {
  const scope = getSectionScope(session);
  if (!scope || scope.length === 0) return {}; // full access

  const sectionCondition = { sectionId: { in: scope } };

  if (classPath === null) {
    // Filtering Class records directly
    return sectionCondition;
  }

  if (classPath === 'class') {
    return { class: sectionCondition };
  }

  if (classPath === 'arm.class') {
    return { arm: { class: sectionCondition } };
  }

  return {};
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
