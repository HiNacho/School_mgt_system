import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * High-performance fast bulk sync of student guardian records into Parent accounts and User logins.
 * Automatically links multiple children/wards under the same Parent account.
 */
export async function syncGuardiansToParents(schoolId: string) {
  try {
    // 1. Fetch unlinked students for this school
    const unlinkedStudents = await prisma.student.findMany({
      where: { schoolId, parentId: null },
      include: { guardians: true }
    });

    if (unlinkedStudents.length === 0) return;

    // 2. Fetch existing parents and parent users for duplicate checking
    const [existingParents, existingUsers] = await Promise.all([
      prisma.parent.findMany({ where: { schoolId }, select: { id: true, email: true, phone: true } }),
      prisma.user.findMany({ where: { schoolId, role: 'PARENT' }, select: { id: true, username: true, email: true, parentId: true } })
    ]);

    const parentByEmail = new Map<string, string>();
    const parentByPhone = new Map<string, string>();
    const existingEmails = new Set<string>();
    const existingUsernames = new Set<string>();

    for (const p of existingParents) {
      if (p.email) {
        parentByEmail.set(p.email.toLowerCase(), p.id);
        existingEmails.add(p.email.toLowerCase());
      }
      if (p.phone) {
        parentByPhone.set(p.phone, p.id);
      }
    }

    for (const u of existingUsers) {
      if (u.username) existingUsernames.add(u.username.toLowerCase());
      if (u.email) existingEmails.add(u.email.toLowerCase());
    }

    const newParentsToCreate: any[] = [];
    const newUsersToCreate: any[] = [];
    const studentParentUpdates: { studentId: string; parentId: string }[] = [];

    const tempPassword = 'password';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    let seq = 1;

    for (const student of unlinkedStudents) {
      if (!student.guardians || student.guardians.length === 0) continue;

      const primaryGuardian = student.guardians.find(g => g.isPrimary) || student.guardians[0];
      const gFirstName = (primaryGuardian?.firstName || 'Guardian').trim();
      const gLastName = (primaryGuardian?.lastName || student.lastName || 'Parent').trim();
      const rawEmail = (primaryGuardian?.email || '').trim().toLowerCase();
      const gPhone = (primaryGuardian?.phone || '').trim();
      const gAddress = (primaryGuardian?.address || '').trim();
      const gDob = (primaryGuardian?.dateOfBirth || '').trim();

      if (!gFirstName && !gLastName) continue;

      // Find existing parent ID if any
      let parentId: string | null = null;
      if (rawEmail && rawEmail.includes('@')) {
        parentId = parentByEmail.get(rawEmail) || null;
      }
      if (!parentId && gPhone) {
        parentId = parentByPhone.get(gPhone) || null;
      }

      if (!parentId) {
        // Generate unique email
        let finalEmail = rawEmail && rawEmail.includes('@') ? rawEmail : '';
        if (!finalEmail || existingEmails.has(finalEmail)) {
          const cleanFirst = gFirstName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'parent';
          const cleanLast = gLastName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'guardian';
          finalEmail = `${cleanFirst}.${cleanLast}.${seq}@guardian.local`;
          while (existingEmails.has(finalEmail)) {
            seq++;
            finalEmail = `${cleanFirst}.${cleanLast}.${seq}@guardian.local`;
          }
        }
        existingEmails.add(finalEmail);

        // Generate unique username
        let baseUsername = finalEmail.includes('@') ? finalEmail.split('@')[0] : finalEmail;
        let username = baseUsername;
        let uCount = 1;
        while (existingUsernames.has(username.toLowerCase())) {
          username = `${baseUsername}${uCount}`;
          uCount++;
        }
        existingUsernames.add(username.toLowerCase());

        const newParentId = crypto.randomUUID();
        parentId = newParentId;

        if (rawEmail) parentByEmail.set(rawEmail, newParentId);
        if (gPhone) parentByPhone.set(gPhone, newParentId);

        newParentsToCreate.push({
          id: newParentId,
          schoolId,
          email: finalEmail,
          firstName: gFirstName,
          lastName: gLastName,
          phone: gPhone || null,
          address: gAddress || null,
          dateOfBirth: gDob || null,
          passwordHash,
          status: 'ACTIVE'
        });

        newUsersToCreate.push({
          id: crypto.randomUUID(),
          schoolId,
          username,
          email: finalEmail,
          passwordHash,
          firstName: gFirstName,
          lastName: gLastName,
          role: 'PARENT',
          parentId: newParentId,
          isFirstLogin: true,
          status: 'ACTIVE',
          isActive: true
        });
      }

      if (parentId) {
        studentParentUpdates.push({ studentId: student.id, parentId });
      }
    }

    // Bulk create new Parents and Users
    if (newParentsToCreate.length > 0) {
      await prisma.parent.createMany({ data: newParentsToCreate, skipDuplicates: true });
      await prisma.user.createMany({ data: newUsersToCreate, skipDuplicates: true });
    }

    // Chunked update of student.parentId
    const chunkSize = 100;
    for (let i = 0; i < studentParentUpdates.length; i += chunkSize) {
      const chunk = studentParentUpdates.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map(item =>
          prisma.student.update({
            where: { id: item.studentId },
            data: { parentId: item.parentId }
          })
        )
      );
    }
  } catch (error) {
    console.error('Error auto-syncing guardians to parents:', error);
  }
}
