import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, AuthError } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce authentication and administrative roles
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const { searchParams } = new URL(req.url);
    const filterSchoolId = searchParams.get('schoolId');

    const whereClause: any = {};

    // 2. Enforce strict school tenant bounds
    if (session.role === 'SCHOOL_ADMIN') {
      // School Admin can ONLY see logs for users in their own school context
      whereClause.user = {
        schoolId: session.schoolId
      };
    } else if (session.role === 'SUPER_ADMIN') {
      // Super Admin can filter by schoolId if provided, or see everything
      if (filterSchoolId) {
        whereClause.user = {
          schoolId: filterSchoolId
        };
      }
    }

    // 3. Fetch audit logs from database
    const logs = await prisma.loginAuditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
            role: true,
            school: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        loginTime: 'desc'
      },
      take: 200 // Limit to latest 200 logs for performance
    });

    return NextResponse.json({ success: true, data: logs });

  } catch (error: any) {
    console.error('Fetch Audit Logs Error:', error);
    if (error instanceof AuthError || error.name === 'AuthError' || (error.status && typeof error.status === 'number')) {
      return NextResponse.json({ error: error.message }, { status: error.status || 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
