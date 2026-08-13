import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);

    let schoolId = session.schoolId;
    const targetSchoolId = url.searchParams.get('schoolId');

    if (session.role === 'SUPER_ADMIN' && targetSchoolId) {
      schoolId = targetSchoolId;
    }

    if (!schoolId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'School context missing' }, { status: 400 });
    }

    // Fast Single-Query Summary Execution
    if (session.role === 'SUPER_ADMIN' && !schoolId) {
      const [schools, leads] = await Promise.all([
        prisma.school.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            subscriptionStatus: true,
            subscriptionPlan: true,
            _count: {
              select: {
                students: true,
                users: true,
              }
            }
          }
        }),
        prisma.lead.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' }
        })
      ]);

      return NextResponse.json({
        success: true,
        role: 'SUPER_ADMIN',
        schools,
        leads
      });
    }

    // Consolidated database queries for School Admin / Teacher / Parent / Bursar
    const [
      school,
      sessions,
      classes,
      subjects,
      events,
      announcements,
      studentCounts,
      staffCount,
      parentCount,
      studentsList,
      staffList,
      subjectAssignments
    ] = await Promise.all([
      prisma.school.findUnique({
        where: { id: schoolId! },
        select: { id: true, name: true, slug: true, logoUrl: true, gradingType: true }
      }),
      prisma.academicSession.findMany({
        where: { schoolId: schoolId! },
        include: { terms: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.class.findMany({
        where: { schoolId: schoolId! },
        include: { arms: true, _count: { select: { students: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.subject.findMany({
        where: { schoolId: schoolId! },
        select: { id: true, name: true, code: true, category: true, color: true }
      }),
      prisma.event.findMany({
        where: { schoolId: schoolId! },
        take: 10,
        orderBy: { date: 'asc' }
      }),
      prisma.announcement.findMany({
        where: { schoolId: schoolId! },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.student.groupBy({
        by: ['status', 'gender'],
        where: { schoolId: schoolId! },
        _count: { id: true }
      }),
      prisma.user.count({
        where: { schoolId: schoolId!, role: { in: ['SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'BURSAR'] } }
      }),
      prisma.user.count({
        where: { schoolId: schoolId!, role: 'PARENT' }
      }),
      // Light student summary for stats
      prisma.student.findMany({
        where: { schoolId: schoolId! },
        select: { id: true, firstName: true, lastName: true, admissionNumber: true, status: true, gender: true, classId: true, armId: true }
      }),
      // Light staff summary
      prisma.user.findMany({
        where: { schoolId: schoolId!, role: { in: ['SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'BURSAR'] } },
        select: { id: true, firstName: true, lastName: true, role: true, email: true }
      }),
      // Subject Assignments for Teacher Course Allocations
      prisma.subjectAssignment.findMany({
        where: {
          schoolId: schoolId!,
          ...(session.role === 'CLASS_TEACHER' || session.role === 'SUBJECT_TEACHER' ? { teacherId: session.id } : {})
        },
        include: {
          subject: true,
          class: true,
          arm: true,
          teacher: { select: { id: true, firstName: true, lastName: true } }
        }
      })
    ]);

    const currentSession = sessions.find(s => s.isCurrent) || sessions[0];
    const currentTerm = currentSession?.terms.find(t => t.isCurrent) || currentSession?.terms[0];

    // Fetch report status & score counts in parallel if currentTerm exists
    let classReportStatuses: any[] = [];
    if (currentTerm) {
      const [dbStatuses, scoreGroups] = await Promise.all([
        prisma.classReportStatus.findMany({
          where: { schoolId: schoolId!, termId: currentTerm.id }
        }),
        prisma.score.groupBy({
          by: ['classId', 'armId'],
          where: { schoolId: schoolId!, termId: currentTerm.id },
          _count: { _all: true }
        })
      ]);

      for (const cls of classes) {
        for (const arm of cls.arms) {
          const matchedStatus = dbStatuses.find(s => s.classId === cls.id && s.armId === arm.id);
          const matchedScores = scoreGroups.find(sg => sg.classId === cls.id && sg.armId === arm.id);
          const scoreCount = matchedScores?._count._all || 0;

          let status = matchedStatus?.status || 'DRAFT';

          const teacherName = (arm as any).classTeacher 
            ? `${(arm as any).classTeacher.firstName} ${(arm as any).classTeacher.lastName}`
            : 'Unassigned';

          classReportStatuses.push({
            classId: cls.id,
            className: cls.name,
            armId: arm.id,
            armName: arm.name,
            classTeacherName: teacherName,
            status,
            feedback: matchedStatus?.feedback || null,
            scoreCount
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        school,
        setup: {
          sessions,
          classes,
          terms: currentSession?.terms || []
        },
        currentSession,
        currentTerm,
        subjects,
        events,
        announcements,
        students: studentsList,
        staff: staffList,
        staffCount,
        parentCount,
        studentCounts,
        classReportStatuses,
        subjectAssignments: subjectAssignments || []
      }
    });

  } catch (error: any) {
    console.error('Dashboard Summary API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard summary' }, { status: 500 });
  }
}
