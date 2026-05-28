import prisma from './db';

/**
 * Checks if a school's subscription is currently active or trial,
 * or blocked by hard expiry after grace period.
 * If expired/expired & grace ended, returns a restriction error message, or null if allowed.
 */
export async function verifySubscriptionAccess(schoolId: string, writeOperation = true): Promise<{ error: string } | null> {
  try {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        subscriptionStatus: true,
        subscriptionEnd: true,
        gracePeriodEnd: true
      }
    });

    if (!school) {
      return { error: 'School tenant context not found.' };
    }

    const { subscriptionStatus, subscriptionEnd, gracePeriodEnd } = school;

    // Active or trial are fully allowed
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trial') {
      return null;
    }

    // Suspended is completely locked out
    if (subscriptionStatus === 'suspended') {
      return { error: 'Your school subscription has been suspended by the platform administrator. Please contact support.' };
    }

    // Archived is completely locked out
    if (subscriptionStatus === 'archived') {
      return { error: 'This school tenant registry has been archived. Access is restricted.' };
    }

    // Expired status checks
    if (subscriptionStatus === 'expired') {
      const now = new Date();

      // Grace period check
      if (gracePeriodEnd && now > new Date(gracePeriodEnd)) {
        return { 
          error: 'Your subscription and 14-day grace period have expired. Access to data entry, scoring, and registration features is locked. Please contact the platform admin to activate.' 
        };
      }

      // If it is a write operation, we block write operations during expired status!
      if (writeOperation) {
        return {
          error: 'Your school subscription has expired. Data modification features (such as adding students, editing grades, or marking attendance) are restricted. Please contact support to activate.'
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Error verifying subscription access:', err);
    return null;
  }
}
