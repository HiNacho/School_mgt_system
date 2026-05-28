import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required for database clear operation' }, { status: 400 });
    }

    // 1. Delete scoring submissions & notifications
    await prisma.score.deleteMany({ where: { schoolId } });
    await prisma.scoreSubmission.deleteMany({ where: { schoolId } });
    await prisma.notification.deleteMany({ where: { schoolId } });
    await prisma.attendance.deleteMany({ where: { schoolId } });
    await prisma.reportCardComment.deleteMany({ where: { schoolId } });
    
    // 2. Delete students
    await prisma.student.deleteMany({ where: { schoolId } });
    
    // 3. Delete academic configurations
    await prisma.subjectAssignment.deleteMany({ where: { schoolId } });
    await prisma.subject.deleteMany({ where: { schoolId } });
    await prisma.arm.deleteMany({ where: { schoolId } });
    await prisma.class.deleteMany({ where: { schoolId } });

    // 4. Delete staff accounts (keeping only SCHOOL_ADMIN, SUPER_ADMIN, and HEAD_TEACHER to prevent lockout)
    await prisma.user.deleteMany({
      where: {
        schoolId,
        role: {
          notIn: ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'HEAD_TEACHER']
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Database cleared successfully. All classes, class arms, subjects, assignments, student registries, and teacher staff accounts have been wiped clean. School administrator login credentials remain fully functional.' 
    });
  } catch (error: any) {
    console.error('Clear DB API Error:', error);
    return NextResponse.json({ error: 'Failed to complete database clear operation' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
