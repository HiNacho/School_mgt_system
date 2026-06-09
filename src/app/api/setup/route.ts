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

    // Auto-initialize AcademicSession and Terms if they don't exist (Self-healing step)
    const sessionCount = await prisma.academicSession.count({ where: { schoolId } });
    if (sessionCount === 0) {
      await prisma.$transaction(async (tx) => {
        const session = await tx.academicSession.create({
          data: {
            schoolId,
            name: '2025/2026',
            isCurrent: true,
          }
        });

        const termsList = ['First Term', 'Second Term', 'Third Term'];
        for (let i = 0; i < termsList.length; i++) {
          await tx.term.create({
            data: {
              schoolId,
              sessionId: session.id,
              name: termsList[i],
              isCurrent: i === 0, // First Term is current
            }
          });
        }
      });
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

    const classIds = classes.map(c => c.id);

    // 4. Fetch Arms (only for existing classes to prevent Prisma crashes on orphaned arms)
    const arms = await prisma.arm.findMany({
      where: { 
        schoolId,
        classId: { in: classIds }
      },
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
