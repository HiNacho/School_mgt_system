import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, parents } = body;

    if (!schoolId || !parents || !Array.isArray(parents)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId and parents array)' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }
    const schoolSlug = school.slug;

    const defaultPasswordHash = await bcrypt.hash('password', 10);

    const results = {
      successCount: 0,
      failCount: 0,
      failures: [] as { name: string; email: string; error: string }[],
      createdParents: [] as any[]
    };

    // Fetch all active students in the school once for fast in-memory matching
    const schoolStudents = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' }
    });

    // Process parent records one by one
    for (const member of parents) {
      const { firstName, lastName, email, phone, address, wards } = member;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = phone ? String(phone).trim() : null;
      const cleanAddress = address ? String(address).trim() : null;

      const displayName = cleanLastName ? `${cleanLastName}, ${cleanFirstName}` : cleanFirstName;

      if (!cleanFirstName || !cleanLastName || !cleanEmail) {
        results.failCount++;
        results.failures.push({
          name: displayName || 'Unknown Parent',
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
        // Verify unique email globally across User & Parent tables
        let finalEmail = cleanEmail;
        let conflictUser = await prisma.user.findUnique({
          where: { email: finalEmail }
        });
        let conflictParent = await prisma.parent.findUnique({
          where: { email: finalEmail }
        });

        if ((conflictParent && conflictParent.schoolId !== schoolId) || (conflictUser && conflictUser.schoolId !== schoolId)) {
          const [localPart, domain] = cleanEmail.split('@');
          const cleanSlug = schoolSlug.replace(/-live-.*/, '').replace(/[^a-zA-Z0-9]/g, '');
          finalEmail = `${localPart}.${cleanSlug}@${domain}`;

          conflictUser = await prisma.user.findUnique({
            where: { email: finalEmail }
          });
          conflictParent = await prisma.parent.findUnique({
            where: { email: finalEmail }
          });
        }

        let resultParent;
        if (conflictParent || conflictUser) {
          // Verify they belong to the same school context
          const existingSchoolId = conflictParent?.schoolId || conflictUser?.schoolId;
          if (existingSchoolId && existingSchoolId !== schoolId) {
            results.failCount++;
            results.failures.push({
              name: displayName,
              email: finalEmail,
              error: `Email "${finalEmail}" is already registered in another school tenant.`
            });
            continue;
          }

          resultParent = await prisma.$transaction(async (tx) => {
            // Find parent record id
            let parentId = conflictParent?.id;
            if (!parentId && conflictUser?.parentId) {
              parentId = conflictUser.parentId;
            }

            let parent;
            if (parentId) {
              // 1. Update existing parent profile
              parent = await tx.parent.update({
                where: { id: parentId },
                data: {
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  phone: cleanPhone,
                  address: cleanAddress
                }
              });
            } else {
              // Create parent profile if missing but user credentials exist
              parent = await tx.parent.create({
                data: {
                  schoolId,
                  email: finalEmail,
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  phone: cleanPhone,
                  address: cleanAddress,
                  passwordHash: defaultPasswordHash
                }
              });
            }

            // 2. Find and update matched User credentials
            const matchedUser = conflictUser || (parentId ? await tx.user.findFirst({ where: { parentId } }) : null);
            if (matchedUser) {
              await tx.user.update({
                where: { id: matchedUser.id },
                data: {
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  parentId: parent.id,
                  status: 'ACTIVE',
                  isActive: true
                }
              });
            } else {
              await tx.user.create({
                data: {
                  schoolId,
                  email: finalEmail,
                  username: finalEmail,
                  firstName: cleanFirstName,
                  lastName: cleanLastName,
                  role: 'PARENT',
                  passwordHash: defaultPasswordHash,
                  parentId: parent.id,
                  status: 'ACTIVE',
                  isActive: true
                }
              });
            }

            // 3. Link wards if specified
            if (wards) {
              const wardList = String(wards).split(',').map(w => w.trim()).filter(Boolean);
              for (const identifier of wardList) {
                const identifierLower = identifier.toLowerCase();

                let match = schoolStudents.find(
                  s => s.admissionNumber.toLowerCase() === identifierLower
                );

                if (!match) {
                  match = schoolStudents.find(s => {
                    const firstLast = `${s.firstName} ${s.lastName}`.toLowerCase();
                    const lastFirst = `${s.lastName} ${s.firstName}`.toLowerCase();
                    const full = `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`.toLowerCase();
                    return firstLast === identifierLower || lastFirst === identifierLower || full === identifierLower;
                  });
                }

                if (match) {
                  await tx.student.update({
                    where: { id: match.id },
                    data: { parentId: parent.id }
                  });
                }
              }
            }

            return parent;
          }, {
            timeout: 90000
          });
        } else {
          // Create the parent profile & matching user credentials transactionally
          resultParent = await prisma.$transaction(async (tx) => {
            const parent = await tx.parent.create({
              data: {
                schoolId,
                email: finalEmail,
                firstName: cleanFirstName,
                lastName: cleanLastName,
                phone: cleanPhone,
                address: cleanAddress,
                passwordHash: defaultPasswordHash // Default demo bypass
              }
            });

            await tx.user.create({
              data: {
                schoolId,
                email: finalEmail,
                username: finalEmail,
                firstName: cleanFirstName,
                lastName: cleanLastName,
                role: 'PARENT',
                passwordHash: defaultPasswordHash, // Default
                parentId: parent.id,
                status: 'ACTIVE'
              }
            });

            // Link wards if specified
            if (wards) {
              const wardList = String(wards).split(',').map(w => w.trim()).filter(Boolean);
              for (const identifier of wardList) {
                const identifierLower = identifier.toLowerCase();

                // Match by admission number (case-insensitive)
                let match = schoolStudents.find(
                  s => s.admissionNumber.toLowerCase() === identifierLower
                );

                // Or match by name (first name + last name, case-insensitive)
                if (!match) {
                  match = schoolStudents.find(s => {
                    const firstLast = `${s.firstName} ${s.lastName}`.toLowerCase();
                    const lastFirst = `${s.lastName} ${s.firstName}`.toLowerCase();
                    const full = `${s.firstName} ${s.middleName ? s.middleName + ' ' : ''}${s.lastName}`.toLowerCase();
                    return firstLast === identifierLower || lastFirst === identifierLower || full === identifierLower;
                  });
                }

                if (match) {
                  await tx.student.update({
                    where: { id: match.id },
                    data: { parentId: parent.id }
                  });
                }
              }
            }

            return parent;
          }, {
            timeout: 90000
          });
        }

        results.successCount++;
        results.createdParents.push(resultParent);
      } catch (err: any) {
        console.error('Error inserting uploaded parent member:', err);
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
    console.error('Excel Upload Parents API Error:', error);
    return NextResponse.json({ error: 'Failed to process parent roster Excel upload' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
