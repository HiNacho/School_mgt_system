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
        const gDob = (primaryGuardian?.dateOfBirth || '').trim();

        if (!gFirstName && !gLastName) continue;

        // Fallback clean email if missing
        const cleanEmail = rawEmail || `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@guardian.local`;

        // 1. Try finding existing parent strictly by email first (if email provided)
        let parent = null;
        if (rawEmail && rawEmail.includes('@')) {
          parent = await prisma.parent.findUnique({
            where: { email: rawEmail }
          });
        }

        // 2. If not found by email, try finding by school & phone
        if (!parent && gPhone) {
          parent = await prisma.parent.findFirst({
            where: { schoolId: student.schoolId, phone: gPhone }
          });
        }

        // 3. If parent exists, ensure their email is updated to their actual registered email (if previously placeholder)
        if (parent && rawEmail && rawEmail.includes('@') && !rawEmail.endsWith('@guardian.local') && parent.email !== rawEmail) {
          const emailConflict = await prisma.parent.findUnique({ where: { email: rawEmail } });
          if (!emailConflict) {
            await prisma.parent.update({
              where: { id: parent.id },
              data: { email: rawEmail }
            });
            await prisma.user.updateMany({
              where: { parentId: parent.id },
              data: { email: rawEmail }
            });
            parent.email = rawEmail;
          }
        }

        // 4. If still not found, create new Parent account with their exact registered email
        if (!parent) {
          const tempPassword = 'password';
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash(tempPassword, salt);

          const finalEmail = rawEmail && rawEmail.includes('@')
            ? rawEmail
            : `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@guardian.local`;

          try {
            parent = await prisma.parent.create({
              data: {
                schoolId: student.schoolId,
                email: finalEmail,
                firstName: gFirstName,
                lastName: gLastName,
                phone: gPhone || null,
                address: gAddress || null,
                dateOfBirth: gDob || null,
                passwordHash,
                status: 'ACTIVE'
              }
            });

            // Create User account for parent login using their exact registered email
            const baseUsername = rawEmail && rawEmail.includes('@')
              ? rawEmail
              : `${gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${gLastName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
            
            let username = baseUsername;
            let count = 1;
            while (await prisma.user.findUnique({ where: { username } })) {
              username = `${baseUsername}${count}`;
              count++;
            }

            const existingUser = await prisma.user.findUnique({ where: { email: finalEmail } });
            if (!existingUser) {
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
          } catch (createErr) {
            parent = await prisma.parent.findUnique({ where: { email: finalEmail } });
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
        console.error(`Error syncing guardian for student ${student.id}:`, singleErr);
      }
    }
  } catch (error) {
    console.error('Error auto-syncing guardians to parents:', error);
  }
}
