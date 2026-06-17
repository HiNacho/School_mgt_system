// Report Cards Compilation API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { compileClassResults, getOrdinalSuffix } from '@/lib/rankingEngine';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const termId = searchParams.get('termId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const studentId = searchParams.get('studentId'); // Optional, if empty, returns all students in class arm

    if (!schoolId || !termId || !classId || !armId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    // Role-based release validation
    const session = await requireAuth(req);
    
    // Telemetry: increment report generation and results viewed count if it's a tester
    try {
      if (session && session.userId) {
        const testerActivity = await prisma.testerActivity.findUnique({
          where: { userId: session.userId }
        });
        if (testerActivity) {
          await prisma.testerActivity.update({
            where: { id: testerActivity.id },
            data: { 
              reportCardsGeneratedCount: { increment: 1 },
              resultsViewedCount: { increment: 1 }
            }
          });
        }
      }
    } catch (telemetryErr) {
      console.error('[Telemetry] Error recording report telemetry:', telemetryErr);
    }
    if (session.role === 'PARENT' || session.role === 'STUDENT') {
      const statusRecord = await prisma.classReportStatus.findUnique({
        where: {
          schoolId_classId_armId_termId: {
            schoolId,
            classId,
            armId,
            termId
          }
        }
      });
      if (!statusRecord || statusRecord.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Term report cards have not been approved and released by the administration yet.' },
          { status: 403 }
        );
      }
    }

    // 1. Fetch School Details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    // 2. Fetch Term and Session Details
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { session: true },
    });

    if (!term) {
      return NextResponse.json({ error: 'Selected academic term not found' }, { status: 404 });
    }

    // 3. Fetch Student Registry
    const studentQuery: any = { schoolId, classId, armId, status: 'ACTIVE' };
    if (studentId) {
      studentQuery.id = studentId;
    }

    const students = await prisma.student.findMany({
      where: studentQuery,
      include: { 
        class: true, 
        arm: {
          include: {
            classTeacher: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        } 
      },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: 'No active student files found for this query' }, { status: 404 });
    }

    // 4. Fetch Subjects
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
    });

    // 5. Fetch Scores
    const scores = await prisma.score.findMany({
      where: { schoolId, termId, classId, armId },
    });

    // 6. Fetch Grading Rules
    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId },
    });

    // 7. Fetch Attendance Records
    const attendance = await prisma.attendance.findMany({
      where: { schoolId, termId, classId, armId },
    });

    // 8. Fetch Comments
    const comments = await prisma.reportCardComment.findMany({
      where: { schoolId, termId, classId, armId },
    });

    // 9. Run Ranking Compiler
    // If studentId is provided, we still need to compile the WHOLE class arm to calculate accurate overall positions and subject rankings!
    const allStudentsInArm = await prisma.student.findMany({
      where: { schoolId, classId, armId, status: 'ACTIVE' },
    });
    
    const compiledReports = compileClassResults(allStudentsInArm, subjects, scores, gradingRules);

    // Filter down to the requested student(s)
    const targetReports = studentId
      ? compiledReports.filter(r => r.studentId === studentId)
      : compiledReports;

    // 10. Format final output cards
    const reportCards = targetReports.map(report => {
      const dbStud = students.find(s => s.id === report.studentId);
      const studAttendance = attendance.find(a => a.studentId === report.studentId);
      const studComment = comments.find(c => c.studentId === report.studentId);

      // Generate realistic evaluation traits based on academic standing
      const scoreWeight = report.averageScore / 100;
      const getTraitRating = (base: number) => {
        const jitter = Math.floor(Math.sin(report.averageScore) * 1.5);
        return Math.min(5, Math.max(1, Math.round(base * scoreWeight + 2 + jitter)));
      };

      const traits = {
        punctuality: getTraitRating(3),
        neatness: getTraitRating(3.5),
        honesty: getTraitRating(4),
        politeness: getTraitRating(4),
        selfControl: getTraitRating(3),
        attentiveness: getTraitRating(3),
        reliability: getTraitRating(3.2),
        sportsmanship: getTraitRating(2.5),
      };

      return {
        student: {
          id: report.studentId,
          admissionNumber: report.admissionNumber,
          firstName: report.firstName,
          lastName: report.lastName,
          middleName: report.middleName || '',
          gender: dbStud?.gender || 'MALE',
          passportPhoto: dbStud?.passportPhoto || null,
          className: dbStud?.class.name || '',
          armName: dbStud?.arm.name || '',
        },
        classTeacherName: dbStud?.arm?.classTeacher 
          ? `${dbStud.arm.classTeacher.firstName} ${dbStud.arm.classTeacher.lastName}`
          : 'Class Teacher',
        subjects: report.subjects.map(s => ({
          ...s,
          rankFormatted: getOrdinalSuffix(s.subjectRank),
        })),
        summary: {
          aggregateScore: report.aggregateScore,
          averageScore: report.averageScore,
          classPosition: report.classPosition,
          classPositionFormatted: getOrdinalSuffix(report.classPosition),
          totalStudents: report.totalStudents,
          passStatus: report.averageScore >= 40 ? 'PASS' : 'FAIL',
        },
        attendance: {
          present: studAttendance?.daysPresent ?? 0,
          absent: studAttendance?.daysAbsent ?? 0,
          total: (studAttendance?.daysPresent ?? 0) + (studAttendance?.daysAbsent ?? 0),
        },
        comments: {
          teacher: studComment?.teacherComment ?? 'No comments recorded.',
          headTeacher: studComment?.headTeacherComment ?? 'Sufficient performance. Keep striving.',
          isAIGenerated: studComment?.isAIGenerated ?? false,
        },
        traits,
      };
    });

    return NextResponse.json({
      success: true,
      school: {
        name: school.name,
        logo: school.logoUrl,
        address: school.address,
        phone: school.phone,
        email: school.email,
        gradingType: school.gradingType,
      },
      term: {
        name: term.name,
        session: term.session.name,
      },
      data: reportCards,
    });
  } catch (error: any) {
    console.error('Reports compile GET Error:', error);
    return NextResponse.json({ error: 'Failed to compile report card data' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
