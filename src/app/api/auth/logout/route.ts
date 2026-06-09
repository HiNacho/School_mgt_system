import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Enforce authentication
    const session = await requireAuth(req);
    
    const body = await req.json();
    const { auditLogId } = body;

    if (auditLogId) {
      // Update the active audit log with the logout time
      await prisma.loginAuditLog.updateMany({
        where: {
          id: auditLogId,
          userId: session.userId,
          logoutTime: null // Only update if not already set
        },
        data: {
          logoutTime: new Date()
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    console.error('Logout API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
