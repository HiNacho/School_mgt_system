import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, parents } = body;

    if (!schoolId || !parents || !Array.isArray(parents)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId and parents array)' }, { status: 400 });
    }

    const results = {
      successCount: 0,
      failCount: 0,
      failures: [] as { name: string; email: string; error: string }[],
      createdParents: [] as any[]
    };

    // Process parent records one by one
    for (const member of parents) {
      const { firstName, lastName, email, phone, address } = member;

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
        const conflictUser = await prisma.user.findUnique({
          where: { email: cleanEmail }
        });
        const conflictParent = await prisma.parent.findUnique({
          where: { email: cleanEmail }
        });

        if (conflictUser || conflictParent) {
          results.failCount++;
          results.failures.push({
            name: displayName,
            email: cleanEmail,
            error: `Email "${cleanEmail}" is already registered on the platform.`
          });
          continue;
        }

        // Create the parent profile & matching user credentials transactionally
        const newParent = await prisma.$transaction(async (tx) => {
          const parent = await tx.parent.create({
            data: {
              schoolId,
              email: cleanEmail,
              firstName: cleanFirstName,
              lastName: cleanLastName,
              phone: cleanPhone,
              address: cleanAddress,
              passwordHash: 'password' // Default demo bypass
            }
          });

          await tx.user.create({
            data: {
              schoolId,
              email: cleanEmail,
              firstName: cleanFirstName,
              lastName: cleanLastName,
              role: 'PARENT',
              passwordHash: 'password', // Default
              parentId: parent.id,
              status: 'ACTIVE'
            }
          });

          return parent;
        });

        results.successCount++;
        results.createdParents.push(newParent);
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
