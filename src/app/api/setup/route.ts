// Setup & Configurations API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Section scope — null = full access, array = restricted to these section IDs
    const sectionScope = session.managedSectionIds || null;

    // Auto-initialize AcademicSession and Terms if they don't exist (Self-healing step)
    const sessionCount = await prisma.academicSession.count({ where: { schoolId } });
    if (sessionCount === 0) {
      await prisma.$transaction(async (tx) => {
        const acSession = await tx.academicSession.create({
          data: { schoolId, name: '2025/2026', isCurrent: true }
        });
        const termsList = ['First Term', 'Second Term', 'Third Term'];
        for (let i = 0; i < termsList.length; i++) {
          await tx.term.create({
            data: { schoolId, sessionId: acSession.id, name: termsList[i], isCurrent: i === 0 }
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

    // 3. Fetch Classes — scoped to managed sections if applicable
    const classWhere: any = { schoolId };
    if (sectionScope) classWhere.sectionId = { in: sectionScope };

    const classes = await prisma.class.findMany({
      where: classWhere,
      orderBy: [{ section: { displayOrder: 'asc' } }, { levelOrder: 'asc' }, { name: 'asc' }],
      include: { section: { select: { id: true, name: true, type: true } } },
    });

    const classIds = classes.map((c: any) => c.id);

    // 4. Fetch Arms (only for scoped classes to prevent Prisma crashes on orphaned arms)
    const arms = await prisma.arm.findMany({
      where: { schoolId, classId: { in: classIds } },
      include: { class: true, classTeacher: true },
      orderBy: { name: 'asc' },
    });

    // 5. Fetch Subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });

    // 6. Fetch Grading Rules — section-scoped admins get school-wide + their section rules
    const gradingWhere: any = { schoolId };
    if (sectionScope) {
      gradingWhere.OR = [
        { sectionId: null },
        { sectionId: { in: sectionScope } }
      ];
    }

    const gradingRules = await prisma.gradingRule.findMany({
      where: gradingWhere,
      orderBy: { minScore: 'desc' },
    });

    // 7. Fetch all active teachers in school
    const teachers = await prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] },
        status: 'ACTIVE'
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    // 8. Fetch school sections — scoped if applicable
    const sectionsWhere: any = { schoolId, isActive: true };
    if (sectionScope) sectionsWhere.id = { in: sectionScope };

    const sections = await prisma.schoolSection.findMany({
      where: sectionsWhere,
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { classes: true } } },
    });

    return NextResponse.json(
      { success: true, data: { sessions, terms, classes, arms, subjects, gradingRules, teachers, sections } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate', 'Pragma': 'no-cache', 'Expires': '0' } }
    );
  } catch (error: any) {
    console.error('Setup GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch setup configurations' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
