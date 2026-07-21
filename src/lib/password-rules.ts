import { createHash } from 'crypto';
import prisma from '@/lib/db';

/**
 * Generates a deterministic SHA-256 hash of a password string.
 * This is used as a unique index to enforce password uniqueness at the database level.
 */
export function getPasswordUniqueHash(password: string): string {
  return createHash('sha256').update(password.trim()).digest('hex');
}

/**
 * Checks if a password string is already in use by any other user in the database.
 */
export async function isPasswordUnique(password: string, userIdToExclude?: string): Promise<boolean> {
  const hash = getPasswordUniqueHash(password);
  const exists = await prisma.user.findFirst({
    where: {
      passwordUniqueHash: hash,
      ...(userIdToExclude ? { id: { not: userIdToExclude } } : {})
    }
  });
  return !exists;
}
