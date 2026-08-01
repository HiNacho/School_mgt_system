import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, email, phone, admissionNumber } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : null;
    const cleanAdmNo = admissionNumber ? admissionNumber.trim() : null;

    let isEmailDuplicate = false;
    let isPhoneDuplicate = false;
    let isAdmNoDuplicate = false;

    if (cleanEmail) {
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      const existingParent = await prisma.parent.findUnique({ where: { email: cleanEmail } });
      const existingPending = await prisma.pendingApplication.findFirst({
        where: { schoolId, applicantEmail: cleanEmail, status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] } }
      });

      if (existingUser || existingParent || existingPending) {
        isEmailDuplicate = true;
      }
    }

    if (cleanPhone) {
      const existingUser = await prisma.user.findFirst({ where: { schoolId, phone: cleanPhone } });
      const existingParent = await prisma.parent.findFirst({ where: { schoolId, phone: cleanPhone } });
      if (existingUser || existingParent) {
        isPhoneDuplicate = true;
      }
    }

    if (cleanAdmNo) {
      const existingStudent = await prisma.student.findUnique({
        where: { schoolId_admissionNumber: { schoolId, admissionNumber: cleanAdmNo } }
      });
      if (existingStudent) {
        isAdmNoDuplicate = true;
      }
    }

    return NextResponse.json({
      success: true,
      isEmailDuplicate,
      isPhoneDuplicate,
      isAdmNoDuplicate
    });

  } catch (error: any) {
    console.error('Check Duplicate API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to check duplicates' }, { status: 500 });
  }
}
