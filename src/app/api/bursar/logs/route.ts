import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const logs = await prisma.financialAuditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
