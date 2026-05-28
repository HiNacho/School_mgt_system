// Setup & Configurations API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // 1. Fetch Sessions
    const sessions = await prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { name: 'desc' },
    });

    // 2. Fetch Terms
    const terms = await prisma.term.findMany({
      where: { schoolId },
      include: { session: true },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch Classes
    const classes = await prisma.class.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // 4. Fetch Arms
    const arms = await prisma.arm.findMany({
      where: { schoolId },
      include: { class: true, classTeacher: true },
      orderBy: { name: 'asc' },
    });

    // 5. Fetch Subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // 6. Fetch Grading Rules
    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId },
      orderBy: { minScore: 'desc' },
    });

    // 7. Fetch all active teachers in school
    const teachers = await prisma.user.findMany({
      where: { 
        schoolId, 
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        terms,
        classes,
        arms,
        subjects,
        gradingRules,
        teachers
      },
    });
  } catch (error: any) {
    console.error('Setup GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch setup configurations' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
