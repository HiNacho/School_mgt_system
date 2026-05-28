// CSV Bulk Importer API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { schoolId, csvData } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    if (!csvData || typeof csvData !== 'string' || csvData.trim().length === 0) {
      return NextResponse.json({ error: 'CSV string content is required' }, { status: 400 });
    }

    // Split rows and parse
    const lines = csvData.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) {
      return NextResponse.json({ error: 'CSV data is too short or has no content rows.' }, { status: 400 });
    }

    // Identify columns from header
    // Header format: Class,Arm,Subject Code,Teacher Email,Periods Per Week,Double Period
    const header = lines[0].toLowerCase();
    const rows = lines.slice(1);

    // Fetch existing entities to resolve by name/code/email and avoid N+1 queries
    const classes = await prisma.class.findMany({ where: { schoolId } });
    const arms = await prisma.arm.findMany({ where: { schoolId }, include: { class: true } });
    const subjects = await prisma.subject.findMany({ where: { schoolId } });
    const teachers = await prisma.user.findMany({ 
      where: { schoolId, role: { in: ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER', 'SCHOOL_ADMIN'] } } 
    });

    const successRows: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowText = rows[i];
      // Skip commented or empty rows
      if (rowText.startsWith('#')) continue;

      // Handle simple CSV splitting (supporting simple quotes if present)
      const cols = rowText.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 5) {
        errors.push(`Row ${i + 2}: Invalid column count (expected at least 5 columns).`);
        continue;
      }

      const classNameInput = cols[0];
      const armNameInput = cols[1];
      const subjectCodeInput = cols[2].toUpperCase();
      const teacherEmailInput = cols[3].toLowerCase();
      const periodsInput = Number(cols[4]);
      const doublePeriodInput = cols[5]?.toLowerCase();

      // Resolve Class
      const matchedClass = classes.find(c => c.name.toLowerCase() === classNameInput.toLowerCase());
      if (!matchedClass) {
        errors.push(`Row ${i + 2}: Class "${classNameInput}" does not exist.`);
        continue;
      }

      // Resolve Arm
      const matchedArm = arms.find(
        a => a.classId === matchedClass.id && a.name.toLowerCase() === armNameInput.toLowerCase()
      );
      if (!matchedArm) {
        errors.push(`Row ${i + 2}: Arm "${armNameInput}" does not exist in class "${classNameInput}".`);
        continue;
      }

      // Resolve Subject
      const matchedSubject = subjects.find(s => s.code.toUpperCase() === subjectCodeInput);
      if (!matchedSubject) {
        errors.push(`Row ${i + 2}: Subject code "${subjectCodeInput}" does not exist.`);
        continue;
      }

      // Resolve Teacher
      const matchedTeacher = teachers.find(t => t.email.toLowerCase() === teacherEmailInput);
      if (!matchedTeacher) {
        errors.push(`Row ${i + 2}: Teacher with email "${teacherEmailInput}" does not exist.`);
        continue;
      }

      // Validate periods count
      if (isNaN(periodsInput) || periodsInput < 0 || periodsInput > 15) {
        errors.push(`Row ${i + 2}: Invalid periods count "${cols[4]}".`);
        continue;
      }

      const isDoublePeriod = doublePeriodInput === 'yes' || doublePeriodInput === 'true' || doublePeriodInput === '1';

      successRows.push({
        schoolId,
        classId: matchedClass.id,
        armId: matchedArm.id,
        subjectId: matchedSubject.id,
        teacherId: matchedTeacher.id,
        periodsPerWeek: periodsInput,
        doublePeriod: isDoublePeriod,
        preferredDays: "",
        restrictedDays: "",
        combinedWithArmId: "",
        isSplit: false
      });
    }

    if (successRows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Bulk import failed. No rows were successfully validated.',
        validationErrors: errors
      }, { status: 400 });
    }

    // Perform bulk upserts in a database transaction
    await prisma.$transaction(
      successRows.map(row => 
        prisma.timetableRequirement.upsert({
          where: {
            schoolId_classId_armId_subjectId: {
              schoolId: row.schoolId,
              classId: row.classId,
              armId: row.armId,
              subjectId: row.subjectId
            }
          },
          update: {
            teacherId: row.teacherId,
            periodsPerWeek: row.periodsPerWeek,
            doublePeriod: row.doublePeriod
          },
          create: row
        })
      )
    );

    return NextResponse.json({
      success: true,
      importedCount: successRows.length,
      warningCount: errors.length,
      validationErrors: errors
    });

  } catch (error: any) {
    console.error('Timetable Requirements CSV Import Error:', error);
    return NextResponse.json({ error: 'Failed to process bulk spreadsheet import' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
