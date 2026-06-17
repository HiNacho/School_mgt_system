import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    // Extract ID from URL path segment (e.g. /api/superadmin/leads/[id])
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        feedback: true,
        testerActivity: true,
        emailLogs: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Find related schools and their admin users (for sandbox or pilot/customer activations)
    const schoolQueries = [];
    if (lead.demoSchoolId) {
      schoolQueries.push({ id: lead.demoSchoolId });
    }
    if (lead.email) {
      schoolQueries.push({ email: lead.email });
    }

    let relatedSchools: any[] = [];
    if (schoolQueries.length > 0) {
      relatedSchools = await prisma.school.findMany({
        where: {
          OR: schoolQueries,
        },
        include: {
          users: {
            where: {
              role: 'SCHOOL_ADMIN',
            },
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              isActive: true,
              isFirstLogin: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...lead,
        relatedSchools
      } 
    });
  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Superadmin Single Lead GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch lead details' }, { status: 500 });
  }
}
