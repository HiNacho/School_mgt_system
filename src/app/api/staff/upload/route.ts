import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, staff } = body;

    if (!schoolId || !staff || !Array.isArray(staff)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId and staff array)' }, { status: 400 });
    }

    const defaultPasswordHash = await bcrypt.hash('password', 10);

    const results = {
      successCount: 0,
      failCount: 0,
      failures: [] as { name: string; email: string; error: string }[],
      createdStaff: [] as any[]
    };

    // Cache school arms and subjects for fast lookups
    const schoolArms = await prisma.arm.findMany({ where: { schoolId } });
    const schoolSubjects = await prisma.subject.findMany({ where: { schoolId } });
    const currentTerm = await prisma.term.findFirst({ where: { schoolId, isCurrent: true } });

    // Process staff records one by one
    for (const member of staff) {
      const { firstName, lastName, email, role, phone, title, classTeacherFor, subjectAllocations } = member;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = phone ? String(phone).trim() : null;
      const cleanTitle = title ? String(title).trim() : null;
      let cleanRole = String(role || 'SUBJECT_TEACHER').trim().toUpperCase();

      // Normalize role parameter values
      if (!['SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(cleanRole)) {
        cleanRole = 'SUBJECT_TEACHER';
      }

      const displayName = cleanLastName ? `${cleanLastName}, ${cleanFirstName}` : cleanFirstName;

      if (!cleanFirstName || !cleanLastName || !cleanEmail) {
        results.failCount++;
        results.failures.push({
          name: displayName || 'Unknown Staff',
          email: cleanEmail || 'MISSING',
          error: 'First Name, Last Name, and Email are required fields.'
        });
        continue;
      }

      // Quick email regex validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        results.failCount++;
        results.failures.push({
          name: displayName,
          email: cleanEmail,
          error: 'Invalid email address format.'
        });
        continue;
      }

      try {
        // Execute writes in transaction to ensure safety
        const user = await prisma.$transaction(async (tx) => {
          // Check if email already registered globally on the platform
          const conflict = await tx.user.findUnique({
            where: { email: cleanEmail }
          });

          let u;
          if (conflict) {
            if (conflict.schoolId === schoolId) {
              // Upsert / update existing staff member in the same school
              u = await tx.user.update({
                where: { id: conflict.id },
                data: {
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  title: cleanTitle,
                  role: cleanRole,
                  phone: cleanPhone,
                  status: 'ACTIVE'
                }
              });
            } else {
              throw new Error(`Email "${cleanEmail}" is registered to another school tenant.`);
            }
          } else {
            // Create new staff user credentials
            u = await tx.user.create({
              data: {
                schoolId,
                email: cleanEmail,
                username: cleanEmail,
                firstName: cleanFirstName,
                lastName: cleanLastName,
                title: cleanTitle,
                role: cleanRole,
                phone: cleanPhone,
                status: 'ACTIVE',
                passwordHash: defaultPasswordHash // Default demo password
              }
            });
          }

          // 2. Class Teacher Relationship
          if (cleanRole === 'CLASS_TEACHER' && classTeacherFor) {
            const cleanArmName = String(classTeacherFor).trim();
            const arm = schoolArms.find(a => a.name.toLowerCase() === cleanArmName.toLowerCase());
            if (arm) {
              await tx.arm.update({
                where: { id: arm.id },
                data: { classTeacherId: u.id }
              });
            }
          }

          // 3. Subject Allocations
          if (subjectAllocations && currentTerm) {
            const allocations = String(subjectAllocations).split(',').map(s => s.trim());
            for (const alloc of allocations) {
              const parts = alloc.split(':');
              if (parts.length < 2) continue;
              const subjectNameOrCode = parts[0].trim().toLowerCase();
              const armName = parts[1].trim().toLowerCase();

              const subject = schoolSubjects.find(
                s => s.name.toLowerCase() === subjectNameOrCode || s.code.toLowerCase() === subjectNameOrCode
              );
              const arm = schoolArms.find(a => a.name.toLowerCase() === armName);

              if (subject && arm) {
                // Check if duplicate assignment exists
                const duplicate = await tx.subjectAssignment.findFirst({
                  where: {
                    schoolId,
                    subjectId: subject.id,
                    armId: arm.id,
                    teacherId: u.id,
                    termId: currentTerm.id
                  }
                });

                if (!duplicate) {
                  await tx.subjectAssignment.create({
                    data: {
                      schoolId,
                      subjectId: subject.id,
                      classId: arm.classId,
                      armId: arm.id,
                      teacherId: u.id,
                      termId: currentTerm.id
                    }
                  });
                }
              }
            }
          }

          return u;
        });

        results.successCount++;
        results.createdStaff.push(user);
      } catch (err: any) {
        console.error('Error inserting uploaded staff member:', err);
        results.failCount++;
        results.failures.push({
          name: displayName,
          email: cleanEmail,
          error: err.message || 'Database transaction error.'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        successCount: results.successCount,
        failCount: results.failCount,
        failures: results.failures
      }
    });

  } catch (error: any) {
    console.error('Excel Upload Staff API Error:', error);
    return NextResponse.json({ error: 'Failed to process staff roster Excel upload' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
