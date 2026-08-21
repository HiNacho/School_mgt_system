import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, buildSectionFilter } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const url = new URL(req.url);

    let schoolId = session.schoolId || url.searchParams.get('schoolId');
    const targetSchoolId = url.searchParams.get('schoolId');

    if ((session.role === 'SUPER_ADMIN' || !session.schoolId) && targetSchoolId) {
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

    // ── Section scope ─────────────────────────────────────────────────────────
    // null = full school access, array = restricted to these section IDs
    const sectionScope = session.managedSectionIds || null;

    // Build class-level where clause for section-scoped admins
    const classWhere: any = { schoolId: schoolId! };
    if (sectionScope) classWhere.sectionId = { in: sectionScope };

    // Build student-level where clause (students belong to a class with a sectionId)
    const studentWhere: any = { schoolId: schoolId! };
    if (sectionScope) studentWhere.class = { sectionId: { in: sectionScope } };

    // Build staff where clause — for section-scoped admins, show teachers whose
    // class teacher arm is in one of the scoped sections, plus all admins/bursars
    const staffRoles = ['SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER', 'BURSAR'];
    const staffWhere: any = { schoolId: schoolId!, role: { in: staffRoles } };

    // Consolidated database queries
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
      // Classes — scoped to managed sections
      prisma.class.findMany({
        where: classWhere,
        include: { 
          arms: { 
            include: { 
              classTeacher: { 
                select: { id: true, firstName: true, lastName: true } 
              } 
            } 
          }, 
          _count: { select: { students: true } }
        },
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
      // Student counts — scoped to managed sections
      prisma.student.groupBy({
        by: ['status', 'gender'],
        where: studentWhere,
        _count: { id: true }
      }),
      // Staff count — for section-scoped admin, count teachers in their classes + all admins/bursars
      sectionScope
        ? prisma.user.count({
            where: {
              schoolId: schoolId!,
              OR: [
                // Admins and bursars (not scoped)
                { role: { in: ['SCHOOL_ADMIN', 'BURSAR'] } },
                // Teachers assigned to arms in scoped sections
                {
                  role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] },
                  classTeacherArms: { some: { class: { sectionId: { in: sectionScope } } } }
                }
              ]
            }
          })
        : prisma.user.count({ where: staffWhere }),
      prisma.user.count({
        where: { schoolId: schoolId!, role: 'PARENT' }
      }),
      // Light student summary — scoped
      prisma.student.findMany({
        where: studentWhere,
        select: { id: true, firstName: true, lastName: true, admissionNumber: true, status: true, gender: true, classId: true, armId: true }
      }),
      // Light staff summary — scoped for section admins
      sectionScope
        ? prisma.user.findMany({
            where: {
              schoolId: schoolId!,
              OR: [
                { role: { in: ['SCHOOL_ADMIN', 'BURSAR'] } },
                {
                  role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'] },
                  classTeacherArms: { some: { class: { sectionId: { in: sectionScope } } } }
                }
              ]
            },
            select: { id: true, firstName: true, lastName: true, role: true, email: true }
          })
        : prisma.user.findMany({
            where: staffWhere,
            select: { id: true, firstName: true, lastName: true, role: true, email: true }
          }),
      // Subject Assignments
      prisma.subjectAssignment.findMany({
        where: {
          schoolId: schoolId!,
          ...(session.role === 'CLASS_TEACHER' || session.role === 'SUBJECT_TEACHER'
            ? { teacherId: session.userId || (session as any).id }
            : {}),
          ...(sectionScope
            ? { class: { sectionId: { in: sectionScope } } }
            : {})
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

    // Fetch report status in parallel if currentTerm exists
    let classReportStatuses: any[] = [];
    if (currentTerm) {
      try {
        const dbStatuses = await prisma.classReportStatus.findMany({
          where: { schoolId: schoolId!, termId: currentTerm.id }
        });

        for (const cls of (classes || [])) {
          for (const arm of (cls.arms || [])) {
            const matchedStatus = dbStatuses.find(s => s.classId === cls.id && s.armId === arm.id);
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
            });
          }
        }
      } catch (err) {
        console.error('Error fetching classReportStatuses for dashboard:', err);
        classReportStatuses = [];
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
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to fetch dashboard summary' }, { status });
  }
}
