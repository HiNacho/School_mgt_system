import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const leads = await prisma.lead.findMany({
      include: {
        feedback: true,
        testerActivity: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: leads });
  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Superadmin Leads GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch registered leads' }, { status: 500 });
  }
}
