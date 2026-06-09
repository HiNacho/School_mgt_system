import { SignJWT, jwtVerify } from 'jose';
import prisma from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-key-for-saas-school-automation-result-engine'
);

/**
 * Generate a JWT token containing userId, role, and schoolId.
 */
export async function generateJWT(
  payload: { userId: string; role: string; schoolId: string | null },
  rememberMe: boolean
): Promise<string> {
  const expiry = rememberMe ? '7d' : '60m';
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(JWT_SECRET);
}

/**
 * Verify a JWT token and extract the payload.
 */
export async function verifyJWT(token: string): Promise<{ userId: string; role: string; schoolId: string | null }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as any;
  } catch (error) {
    throw new Error('Invalid or expired session token');
  }
}

/**
 * Validate password strength against SaaS compliance rules.
 * Enforces: min 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character.
 */
export function validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string } {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('at least 8 characters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('one uppercase letter');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('one lowercase letter');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('one number');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('one special character');
  }

  return {
    isValid: score === 5,
    score, // 0 to 5
    feedback: score === 5 ? 'Strong password' : `Requires: ${feedback.join(', ')}`
  };
}

/**
 * Auto-generate a globally unique username based on the last name.
 * Uses a loop to check for database conflicts and increments counter suffix (e.g. apeh001, apeh002).
 */
export async function generateUniqueUsername(lastName: string): Promise<string> {
  const base = lastName.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10) || 'user';
  let counter = 1;
  while (true) {
    const username = `${base}${String(counter).padStart(3, '0')}`;
    const existing = await prisma.user.findUnique({
      where: { username }
    });
    if (!existing) return username;
    counter++;
  }
}

/**
 * Generate a temporary password for new accounts and admin resets.
 * Format: Temp@[4-digit-random-number] (e.g. Temp@1234)
 */
export function generateTempPassword(): string {
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `Temp@${digits}`;
}
