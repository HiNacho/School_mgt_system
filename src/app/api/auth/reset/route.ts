import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope, AuthError } from '@/lib/auth-middleware';
import { generateTempPassword } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication and role limits
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required.' }, { status: 400 });
    }

    // 2. Fetch the target user details
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 });
    }

    // 3. Enforce data isolation bounds
    // School admins can only reset passwords for users in their own school tenant
    requireSchoolScope(session, targetUser.schoolId);

    // 4. Generate and hash temporary password
    const tempPassword = generateTempPassword(); // e.g. Temp@1234
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);

    // 5. Save updates, forcing change on next login
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        passwordHash: hashedTempPassword,
        isFirstLogin: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Password reset successful.',
      temporaryPassword: tempPassword
    });

  } catch (error: any) {
    console.error('Password Reset API Error:', error);
    if (error instanceof AuthError || error.name === 'AuthError' || (error.status && typeof error.status === 'number')) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
