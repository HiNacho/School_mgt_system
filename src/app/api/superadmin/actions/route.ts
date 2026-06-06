import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, schoolId, userId, newPassword } = body;

    if (!action || !schoolId) {
      return NextResponse.json({ error: 'Missing required parameters (action and schoolId)' }, { status: 400 });
    }

    // 1. Password Reset Action
    if (action === 'reset_admin_password') {
      // Find the first SCHOOL_ADMIN of the school
      const admin = await prisma.user.findFirst({
        where: { schoolId, role: 'SCHOOL_ADMIN' }
      });

      if (!admin) {
        return NextResponse.json({ error: 'No administrator account found for this school tenant.' }, { status: 404 });
      }

      const pass = newPassword || 'password';
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash: pass }
      });

      return NextResponse.json({ 
        success: true, 
        message: `Admin password successfully reset to default: "${pass}" for ${admin.email}` 
      });
    }

    // 2. Fetch Impersonation Session Action
    if (action === 'get_impersonation_session') {
      // Find the first SCHOOL_ADMIN of the school
      const admin = await prisma.user.findFirst({
        where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE' },
        include: {
          school: true
        }
      });

      if (!admin) {
        return NextResponse.json({ error: 'No active administrator account found for this school tenant.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
            studentId: admin.studentId,
            parentId: admin.parentId,
          },
          school: {
            id: admin.school.id,
            name: admin.school.name,
            slug: admin.school.slug,
            gradingType: admin.school.gradingType,
            address: admin.school.address,
            logoUrl: admin.school.logoUrl,
          },
          token: `mock-impersonate-token-for-${admin.id}`
        }
      });
    }

    return NextResponse.json({ error: `Unsupported super admin action: ${action}` }, { status: 400 });

  } catch (error: any) {
    console.error('Superadmin Action API Error:', error);
    return NextResponse.json({ error: error.message || 'Action execution failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
