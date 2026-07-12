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

    // Suspended is completely locked out
    if (subscriptionStatus === 'suspended') {
      return { error: 'Your school subscription has been suspended by the platform administrator. Please contact support.' };
    }

    // Archived is completely locked out
    if (subscriptionStatus === 'archived') {
      return { error: 'This school tenant registry has been archived. Access is restricted.' };
    }

    // Active or trial checks (with grace period & auto-suspension details)
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trial') {
      const now = new Date();
      if (subscriptionEnd && now > new Date(subscriptionEnd)) {
        // If grace period ended, auto-suspend tenant in DB and lock out completely
        if (gracePeriodEnd && now > new Date(gracePeriodEnd)) {
          try {
            await prisma.school.update({
              where: { id: schoolId },
              data: { subscriptionStatus: 'suspended' }
            });
          } catch (e) {
            console.error('Failed to auto-update school status to suspended:', e);
          }
          return { 
            error: 'Your subscription and 14-day grace period have expired, and your school account has been suspended. Please contact the platform administrator to activate.' 
          };
        }

        // If inside grace period, block data entry write operations
        if (writeOperation) {
          return {
            error: 'Your school subscription has expired. Data modification features (such as adding students, editing grades, or marking attendance) are restricted. Please contact support to activate.'
          };
        }
      }
      return null;
    }

    return null;
  } catch (err) {
    console.error('Error verifying subscription access:', err);
    return null;
  }
}
