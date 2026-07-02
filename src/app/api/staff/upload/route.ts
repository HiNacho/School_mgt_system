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
      const { firstName, lastName, email, role, phone, title, classTeacherClass, subject, classAllocation } = member;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = phone ? String(phone).trim() : null;
      const cleanTitle = title ? String(title).trim() : null;
      
      // Parse flexible roles
      const roleStr = String(role || '').toLowerCase();
      let cleanRole = 'SUBJECT_TEACHER';
      if (roleStr.includes('class teacher')) {
        cleanRole = 'CLASS_TEACHER';
      } else if (roleStr.includes('head teacher') || roleStr.includes('principal') || roleStr.includes('headmaster')) {
        cleanRole = 'HEAD_TEACHER';
      } else if (roleStr.includes('admin') || roleStr.includes('administrator')) {
        cleanRole = 'SCHOOL_ADMIN';
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
          if (cleanRole === 'CLASS_TEACHER' && classTeacherClass) {
            const cleanArmName = String(classTeacherClass).trim().toLowerCase().replace(/\s+/g, '');
            const arm = schoolArms.find(a => a.name.toLowerCase().replace(/\s+/g, '') === cleanArmName);
            if (arm) {
              await tx.arm.update({
                where: { id: arm.id },
                data: { classTeacherId: u.id }
              });
            }
          }

          // 3. Subject & Class Allocations
          if (subject && classAllocation && currentTerm) {
            const subjectsList = String(subject).split(',').map(s => s.trim()).filter(Boolean);
            const armsList = String(classAllocation).split(',').map(a => a.trim()).filter(Boolean);

            for (const origSub of subjectsList) {
              const subQuery = origSub.toLowerCase().replace(/\s+/g, '');
              let matchedSubject = schoolSubjects.find(
                s => s.name.toLowerCase().replace(/\s+/g, '') === subQuery || s.code.toLowerCase().replace(/\s+/g, '') === subQuery
              );

              // Auto-create subject if not found in database cache
              if (!matchedSubject) {
                const words = origSub.split(' ');
                let code = '';
                if (words.length >= 3) {
                  code = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
                } else if (words.length === 2) {
                  code = (words[0][0] + words[1][0] + (words[1][1] || 'X')).toUpperCase();
                } else {
                  code = origSub.slice(0, 3).toUpperCase();
                }

                // Verify code uniqueness in cache
                const codeCollision = schoolSubjects.some(s => s.code.toUpperCase() === code);
                if (codeCollision) {
                  code = (code + Math.floor(Math.random() * 10)).slice(0, 4);
                }

                matchedSubject = await tx.subject.create({
                  data: {
                    schoolId,
                    name: origSub,
                    code,
                    category: 'COMPULSORY'
                  }
                });
                schoolSubjects.push(matchedSubject);
              }

              for (const origArm of armsList) {
                const armQuery = origArm.toLowerCase().replace(/\s+/g, '');
                const matchedArm = schoolArms.find(a => a.name.toLowerCase().replace(/\s+/g, '') === armQuery);

                if (matchedArm) {
                  // Check if duplicate assignment exists
                  const duplicate = await tx.subjectAssignment.findFirst({
                    where: {
                      schoolId,
                      subjectId: matchedSubject.id,
                      armId: matchedArm.id,
                      teacherId: u.id,
                      termId: currentTerm.id
                    }
                  });

                  if (!duplicate) {
                    await tx.subjectAssignment.create({
                      data: {
                        schoolId,
                        subjectId: matchedSubject.id,
                        classId: matchedArm.classId,
                        armId: matchedArm.id,
                        teacherId: u.id,
                        termId: currentTerm.id
                      }
                    });
                  }
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
