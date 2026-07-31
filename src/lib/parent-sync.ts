import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * Automatically syncs student guardian records into Parent accounts and User logins,
 * and links multiple children/wards under the same Parent account.
 */
export async function syncGuardiansToParents(schoolId: string) {
  try {
    const students = await prisma.student.findMany({
      where: { schoolId },
      include: {
        guardians: true,
        parent: true
      }
    });

    for (const student of students) {
      try {
        // Primary guardian or first guardian
        const primaryGuardian = student.guardians.find(g => g.isPrimary) || student.guardians[0];
        
        const gFirstName = (primaryGuardian?.firstName || 'Guardian').trim();
        const gLastName = (primaryGuardian?.lastName || student.lastName || 'Parent').trim();
        const rawEmail = (primaryGuardian?.email || '').trim().toLowerCase();
        const gPhone = (primaryGuardian?.phone || '').trim();
        const gAddress = (primaryGuardian?.address || '').trim();

        if (!gFirstName && !gLastName) continue;

        // Fallback clean email if missing
        const cleanEmail = rawEmail || `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@guardian.local`;

        // Search for existing parent by email or phone
        let parent = await prisma.parent.findFirst({
          where: {
            OR: [
              { email: cleanEmail },
              ...(gPhone ? [{ schoolId: student.schoolId, phone: gPhone }] : [])
            ]
          }
        });

        if (!parent) {
          // Verify email is free in User table
          let finalEmail = cleanEmail;
          const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });
          if (existingUser && existingUser.role === 'PARENT' && existingUser.parentId) {
            parent = await prisma.parent.findUnique({ where: { id: existingUser.parentId } });
          } else if (existingUser) {
            finalEmail = `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Math.floor(100 + Math.random() * 900)}@guardian.local`;
          }

          if (!parent) {
            const tempPassword = 'Parent' + Math.floor(100000 + Math.random() * 900000);
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(tempPassword, salt);

            parent = await prisma.parent.create({
              data: {
                schoolId: student.schoolId,
                email: finalEmail,
                firstName: gFirstName,
                lastName: gLastName,
                phone: gPhone || null,
                address: gAddress || null,
                passwordHash,
                status: 'ACTIVE'
              }
            });

            // Create User account for parent login
            const baseUsername = `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            let username = baseUsername;
            let count = 1;
            while (await prisma.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${count}`;
              count++;
            }

            await prisma.user.create({
              data: {
                schoolId: student.schoolId,
                username,
                email: finalEmail,
                passwordHash,
                firstName: gFirstName,
                lastName: gLastName,
                role: 'PARENT',
                parentId: parent.id,
                isFirstLogin: true,
                status: 'ACTIVE',
                isActive: true
              }
            });
          }
        } else {
          if (!parent.phone && gPhone) {
            await prisma.parent.update({
              where: { id: parent.id },
              data: { phone: gPhone }
            });
          }
        }

        // Link student ward to Parent
        if (parent && student.parentId !== parent.id) {
          await prisma.student.update({
            where: { id: student.id },
            data: { parentId: parent.id }
          });
        }
      } catch (singleErr) {
        console.error(`Skipped single guardian sync for student ${student.id}:`, singleErr);
      }
    }
  } catch (error) {
    console.error('Error auto-syncing guardians to parents:', error);
  }
}
