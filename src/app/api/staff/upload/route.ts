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

    // Process staff records one by one
    for (const member of staff) {
      const { firstName, lastName, email, role, phone } = member;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanEmail = String(email || '').trim().toLowerCase();
      const cleanPhone = phone ? String(phone).trim() : null;
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
        // Check if email already registered globally on the platform
        const conflict = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });

        let user;
        if (conflict) {
          if (conflict.schoolId === schoolId) {
            // Upsert / update existing staff member in the same school
            user = await prisma.user.update({
              where: { id: conflict.id },
              data: {
                firstName: cleanFirstName,
                lastName: cleanLastName,
                role: cleanRole,
                phone: cleanPhone,
                status: 'ACTIVE'
              }
            });
          } else {
            results.failCount++;
            results.failures.push({
              name: displayName,
              email: cleanEmail,
              error: `Email "${cleanEmail}" is registered to another school tenant.`
            });
            continue;
          }
        } else {
          // Create new staff user credentials
          user = await prisma.user.create({
            data: {
              schoolId,
              email: cleanEmail,
              username: cleanEmail,
              firstName: cleanFirstName,
              lastName: cleanLastName,
              role: cleanRole,
              phone: cleanPhone,
              status: 'ACTIVE',
              passwordHash: defaultPasswordHash // Default demo password
            }
          });
        }

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
