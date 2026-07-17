// Parents Registry API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { generateUniqueUsername, generateTempPassword } from '@/lib/auth-utils';

// 1. GET: Fetch list of parents in current school context
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'PARENT']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    let query: any = { schoolId };
    const email = searchParams.get('email');

    if (session.role === 'PARENT') {
      query.user = { id: session.userId };
    } else if (email) {
      query.user = { email };
    }

    const parents = await prisma.parent.findMany({
      where: query,
      include: {
        students: {
          include: {
            class: true,
            arm: true
          }
        },
        user: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return NextResponse.json(
      { success: true, data: parents },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error('Parents GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch parent registry' }, { status: error.status || 500 });
  }
}

// 2. POST: Register a parent and automatically provision login credentials
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { schoolId, firstName, lastName, email, phone, address, dateOfBirth, studentIds } = body;

    if (!schoolId || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required parent fields' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Verify unique email globally across User & Parent tables
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    const existingParent = await prisma.parent.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser || existingParent) {
      return NextResponse.json({
        error: `Email address '${email}' is already registered on the platform`
      }, { status: 409 });
    }

    // Auto-generate credentials
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    const username = await generateUniqueUsername(lastName);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create parent profile
      const parent = await tx.parent.create({
        data: {
          schoolId,
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          passwordHash
        }
      });

      // 2. Link student children if array provided
      if (Array.isArray(studentIds) && studentIds.length > 0) {
        for (const studentId of studentIds) {
          await tx.student.update({
            where: { id: studentId },
            data: { parentId: parent.id }
          });
        }
      }

      // 3. Create linked User credentials
      await tx.user.create({
        data: {
          schoolId,
          username,
          email: email.toLowerCase().trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'PARENT',
          passwordHash,
          parentId: parent.id,
          status: 'ACTIVE',
          isActive: true,
          isFirstLogin: true
        }
      });

      // Reload parent with linked students
      return tx.parent.findUnique({
        where: { id: parent.id },
        include: { students: true }
      });
    });

    return NextResponse.json({ 
      success: true, 
      data: result,
      username,
      temporaryPassword: tempPassword
    });
  } catch (error: any) {
    console.error('Parent POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create parent profile' }, { status: error.status || 500 });
  }
}

// 3. PUT: Update parent profile
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { id, firstName, lastName, email, phone, address, dateOfBirth, studentIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Parent ID is required for updates' }, { status: 400 });
    }

    const existing = await prisma.parent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
    }

    requireSchoolScope(session, existing.schoolId);

    // Verify email collision if changed
    if (email && email.toLowerCase().trim() !== existing.email) {
      const trimmedEmail = email.toLowerCase().trim();
      const conflictUser = await prisma.user.findFirst({
        where: { email: trimmedEmail, NOT: { parentId: id } }
      });
      const conflictParent = await prisma.parent.findFirst({
        where: { email: trimmedEmail, NOT: { id } }
      });

      if (conflictUser || conflictParent) {
        return NextResponse.json({
          error: `Email address '${email}' is already assigned to another profile`
        }, { status: 409 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Parent
      const updatedParent = await tx.parent.update({
        where: { id },
        data: {
          firstName: firstName ? firstName.trim() : undefined,
          lastName: lastName ? lastName.trim() : undefined,
          email: email ? email.toLowerCase().trim() : undefined,
          phone: phone !== undefined ? phone : undefined,
          address: address !== undefined ? address : undefined,
          dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined
        }
      });

      // 2. Update linked User credentials
      await tx.user.updateMany({
        where: { parentId: id },
        data: {
          firstName: firstName ? firstName.trim() : undefined,
          lastName: lastName ? lastName.trim() : undefined,
          email: email ? email.toLowerCase().trim() : undefined,
          phone: phone !== undefined ? phone : undefined
        }
      });

      // 3. Sync children relations (Remove all previous and assign new)
      if (Array.isArray(studentIds)) {
        // Disconnect all previous children
        await tx.student.updateMany({
          where: { parentId: id },
          data: { parentId: null }
        });

        // Link new children list
        if (studentIds.length > 0) {
          await tx.student.updateMany({
            where: { id: { in: studentIds } },
            data: { parentId: id }
          });
        }
      }

      return tx.parent.findUnique({
        where: { id },
        include: { students: true }
      });
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Parent PUT Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update parent profile' }, { status: error.status || 500 });
  }
}

// 4. DELETE: Remove parent profile and cascade credentials safely
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');
    const schoolId = searchParams.get('schoolId');

    if (!id && !idsParam) {
      return NextResponse.json({ error: 'Parent ID or IDs are required for deletion' }, { status: 400 });
    }

    if (id) {
      const parent = await prisma.parent.findUnique({ where: { id } });
      if (!parent) {
        return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 });
      }

      requireSchoolScope(session, parent.schoolId);

      await prisma.$transaction(async (tx) => {
        // 1. Set parentId to null for all connected students
        await tx.student.updateMany({
          where: { parentId: id },
          data: { parentId: null }
        });

        // 2. Delete linked User credential
        await tx.user.deleteMany({
          where: { parentId: id }
        });

        // 3. Delete Parent profile
        await tx.parent.delete({
          where: { id }
        });
      });

      return NextResponse.json({ success: true, message: 'Parent profile and login credentials successfully deleted' });
    } else if (idsParam) {
      const ids = idsParam.split(',').map(i => i.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No parent IDs provided' }, { status: 400 });
      }
      if (!schoolId) {
        return NextResponse.json({ error: 'School ID is required for batch deletion' }, { status: 400 });
      }

      requireSchoolScope(session, schoolId);

      await prisma.$transaction(async (tx) => {
        // 1. Set parentId to null for all connected students
        await tx.student.updateMany({
          where: { parentId: { in: ids }, schoolId },
          data: { parentId: null }
        });

        // 2. Delete linked User credential
        await tx.user.deleteMany({
          where: { parentId: { in: ids }, schoolId }
        });

        // 3. Delete Parent profile
        await tx.parent.deleteMany({
          where: { id: { in: ids }, schoolId }
        });
      });

      return NextResponse.json({ success: true, message: `Successfully deleted ${ids.length} parent accounts` });
    }
  } catch (error: any) {
    console.error('Parent DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete parent account' }, { status: error.status || 500 });
  }
}

export const dynamic = 'force-dynamic';
