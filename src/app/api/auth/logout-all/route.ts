import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the user session
    const session = await requireAuth(req);

    // Increment tokenVersion in the database
    // This instantly invalidates all active JWT tokens issued on other devices
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        tokenVersion: { increment: 1 }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Logged out of all devices successfully. Existing sessions have been invalidated.' 
    });
  } catch (error: any) {
    console.error('Logout All API Error:', error);
    if (error instanceof AuthError || error.name === 'AuthError' || (error.status && typeof error.status === 'number')) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
