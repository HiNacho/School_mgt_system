import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { requireAuth, AuthError } from '@/lib/auth-middleware';
import { validatePasswordStrength } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce authentication
    const session = await requireAuth(req);

    const body = await req.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation do not match.' }, { status: 400 });
    }

    // 2. Fetch active user from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
    }

    // 3. Verify current password
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordCorrect) {
      return NextResponse.json({ error: 'Incorrect current password.' }, { status: 400 });
    }

    // 4. Validate new password complexity strength
    const strength = validatePasswordStrength(newPassword);
    if (!strength.isValid) {
      return NextResponse.json({ error: `Password is too weak. ${strength.feedback}` }, { status: 400 });
    }

    // 5. Hash new password and clear first-time login flag
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        isFirstLogin: false
      }
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully!' });

  } catch (error: any) {
    console.error('Change Password API Error:', error);
    if (error instanceof AuthError || error.name === 'AuthError' || (error.status && typeof error.status === 'number')) {
      return NextResponse.json({ error: error.message }, { status: error.status || 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
