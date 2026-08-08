import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { calculateScoreDetails } from '@/lib/rankingEngine';

// POST: Import filled Broadsheet scores and auto-generate student report cards
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER']);

    const body = await req.json();
    const { schoolId, classId, armId, termId, records } = body;

    if (!schoolId || !classId || !armId || !termId || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Missing required parameters or invalid records payload' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Fetch school subjects, active students in class arm, and grading scale
    const [subjects, students, gradingRules] = await Promise.all([
      prisma.subject.findMany({ where: { schoolId } }),
      prisma.student.findMany({ where: { schoolId, classId, armId, status: 'ACTIVE' } }),
      prisma.gradingRule.findMany({ where: { schoolId }, orderBy: { minScore: 'desc' } })
    ]);

    const subjectMapByName: Record<string, any> = {};
    const subjectMapByCode: Record<string, any> = {};
    subjects.forEach(s => {
      subjectMapByName[s.name.trim().toLowerCase()] = s;
      subjectMapByCode[s.code.trim().toLowerCase()] = s;
    });

    const studentMapByAdmNo: Record<string, any> = {};
    const studentMapByName: Record<string, any> = {};
    students.forEach(st => {
      if (st.admissionNumber) {
        studentMapByAdmNo[st.admissionNumber.trim().toLowerCase()] = st;
      }
      const fullName = `${st.lastName} ${st.firstName}`.trim().toLowerCase();
      studentMapByName[fullName] = st;
      const reverseName = `${st.firstName} ${st.lastName}`.trim().toLowerCase();
      studentMapByName[reverseName] = st;
    });

    let updatedCount = 0;
    let studentsProcessed = 0;

    for (const record of records) {
      const admNoRaw = String(record.admissionNumber || record['Admission Number'] || '').trim().toLowerCase();
      const nameRaw = String(record.studentName || record['Student Name'] || record.name || '').trim().toLowerCase();

      const student = studentMapByAdmNo[admNoRaw] || studentMapByName[nameRaw];
      if (!student) continue;

      studentsProcessed++;

      const scoresObj = record.scores || {};
      for (const [subjectKey, compObj] of Object.entries<any>(scoresObj)) {
        const subKeyClean = subjectKey.trim().toLowerCase();
        const subject = subjectMapByName[subKeyClean] || subjectMapByCode[subKeyClean];
        if (!subject) continue;

        const c1Raw = compObj.ca1 ?? compObj.CA1;
        const c2Raw = compObj.ca2 ?? compObj.CA2;
        const asgRaw = compObj.assignment ?? compObj.ASG ?? compObj.Asg;
        const exRaw = compObj.exam ?? compObj.Exam ?? compObj.EXAM;

        const c1 = c1Raw !== undefined && c1Raw !== null && c1Raw !== '' ? Math.round((Number(c1Raw) + Number.EPSILON) * 100) / 100 : null;
        const c2 = c2Raw !== undefined && c2Raw !== null && c2Raw !== '' ? Math.round((Number(c2Raw) + Number.EPSILON) * 100) / 100 : null;
        const asg = asgRaw !== undefined && asgRaw !== null && asgRaw !== '' ? Math.round((Number(asgRaw) + Number.EPSILON) * 100) / 100 : null;
        const ex = exRaw !== undefined && exRaw !== null && exRaw !== '' ? Math.round((Number(exRaw) + Number.EPSILON) * 100) / 100 : null;

        const hasRecord = c1 !== null || c2 !== null || asg !== null || ex !== null;
        if (!hasRecord) continue;

        const details = calculateScoreDetails(c1, c2, asg, ex, gradingRules);

        await prisma.score.upsert({
          where: {
            schoolId_studentId_subjectId_termId: {
              schoolId,
              studentId: student.id,
              subjectId: subject.id,
              termId
            }
          },
          update: {
            ca1: c1,
            ca2: c2,
            assignment: asg,
            exam: ex,
            total: details.total,
            grade: details.grade,
            remarks: details.remarks
          },
          create: {
            schoolId,
            studentId: student.id,
            subjectId: subject.id,
            termId,
            classId,
            armId,
            ca1: c1,
            ca2: c2,
            assignment: asg,
            exam: ex,
            total: details.total,
            grade: details.grade,
            remarks: details.remarks
          }
        });

        updatedCount++;
      }
    }

    // Auto-update/compile Class Report Card status so report cards are immediately ready!
    await prisma.classReportStatus.upsert({
      where: {
        schoolId_classId_armId_termId: {
          schoolId,
          classId,
          armId,
          termId
        }
      },
      update: {
        status: 'AWAITING_APPROVAL'
      },
      create: {
        schoolId,
        classId,
        armId,
        termId,
        status: 'AWAITING_APPROVAL'
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed broadsheet for ${studentsProcessed} students. Updated ${updatedCount} subject score entries and auto-generated report cards!`,
      data: {
        studentsProcessed,
        updatedCount
      }
    });
  } catch (error: any) {
    console.error('Broadsheet Import Error:', error);
    return NextResponse.json({ error: 'Failed to import broadsheet scores' }, { status: 500 });
  }
}
