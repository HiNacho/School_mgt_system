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

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    const schoolSlug = school.slug;

    // Cache school arms and subjects for fast lookups
    const schoolArms = await prisma.arm.findMany({
      where: { schoolId },
      include: { class: true }
    });
    const schoolSubjects = await prisma.subject.findMany({ where: { schoolId } });
    const currentTerm = await prisma.term.findFirst({ where: { schoolId, isCurrent: true } });

    const matchArm = (csvArmStr: string) => {
      if (!csvArmStr) return undefined;
      const cleanCsv = csvArmStr.trim().toLowerCase().replace(/\s+/g, '');
      return schoolArms.find(a => {
        const dbShort = a.name.toLowerCase().replace(/\s+/g, '');
        const dbFull = `${a.class?.name || ''}${a.name}`.toLowerCase().replace(/\s+/g, '');
        return dbShort === cleanCsv || dbFull === cleanCsv;
      });
    };

    // Process staff records one by one
    for (const member of staff) {
      const { firstName, lastName, email, role, phone, title, classTeacherClass, subject, classAllocation } = member;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = phone ? String(phone).trim() : null;
      
      let cleanTitle = title ? String(title).trim() : null;
      if (cleanTitle) {
        const baseTitle = cleanTitle.replace(/\./g, '').toLowerCase();
        if (baseTitle === 'mr') cleanTitle = 'Mr.';
        else if (baseTitle === 'mrs') cleanTitle = 'Mrs.';
        else if (baseTitle === 'ms') cleanTitle = 'Ms.';
        else if (baseTitle === 'dr') cleanTitle = 'Dr.';
        else if (baseTitle === 'prof') cleanTitle = 'Prof.';
        else if (baseTitle === 'rev') cleanTitle = 'Rev.';
      }
      
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
          let finalEmail = cleanEmail;
          let conflict = await tx.user.findUnique({
            where: { email: finalEmail }
          });

          if (conflict && conflict.schoolId !== schoolId) {
            const [localPart, domain] = cleanEmail.split('@');
            const cleanSlug = schoolSlug.replace(/-live-.*/, '').replace(/[^a-zA-Z0-9]/g, '');
            finalEmail = `${localPart}.${cleanSlug}@${domain}`;
            
            conflict = await tx.user.findUnique({
              where: { email: finalEmail }
            });
          }

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
              throw new Error(`Email "${finalEmail}" is registered to another school tenant.`);
            }
          } else {
            // Create new staff user credentials
            u = await tx.user.create({
              data: {
                schoolId,
                email: finalEmail,
                username: finalEmail,
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
            const arm = matchArm(classTeacherClass);
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
                const matchedArm = matchArm(origArm);

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
        }, {
          timeout: 90000
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
