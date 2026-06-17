// Excel Scoresheet Upload Handler Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseExcelScoreSheet } from '@/lib/excelParser';
import { calculateScoreDetails } from '@/lib/rankingEngine';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const schoolId = formData.get('schoolId') as string;
    const classId = formData.get('classId') as string;
    const armId = formData.get('armId') as string;
    const subjectId = formData.get('subjectId') as string;
    const termId = formData.get('termId') as string;
    const teacherId = formData.get('teacherId') as string || null;

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'Excel scoresheet file is required' }, { status: 400 });
    }

    if (!schoolId || !classId || !armId || !subjectId || !termId) {
      return NextResponse.json({ error: 'Missing required configuration parameters' }, { status: 400 });
    }

    // 1. Read file to Buffer
    const arrayBuffer = await fileEntry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Parse sheet using SheetJS parser
    const { data: parsedRows, errors: parsingErrors } = parseExcelScoreSheet(buffer);

    // If Excel parser found sheet level errors, reject immediately
    if (parsingErrors.length > 0 && parsedRows.length === 0) {
      return NextResponse.json({
        error: 'Failed to read sheet: ' + parsingErrors[0].message,
        details: parsingErrors,
      }, { status: 422 });
    }

    // 3. Fetch students in the target class arm to map IDs
    const dbStudents = await prisma.student.findMany({
      where: {
        schoolId,
        classId,
        armId,
        status: 'ACTIVE',
      },
    });

    if (dbStudents.length === 0) {
      return NextResponse.json({
        error: 'The selected class arm has no active students registered. Please upload students first.',
      }, { status: 404 });
    }

    // Fetch school grading rules to compute grades on upload
    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId },
    });

    const successLogs: any[] = [];
    const warningLogs: { row: number; column: string; message: string }[] = [];
    
    // Attach parser errors to general warnings list
    parsingErrors.forEach(err => {
      warningLogs.push({ row: err.row, column: err.column, message: err.message });
    });

    // 4. Map parsed Excel rows to DB students and upsert
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const excelRowNum = i + 2; // Excel is 1-indexed and has header row
      
      let matchedStudent = null;

      // Rule A: Try to match by Admission Number (Fuzzy Case-insensitive check)
      if (row.admissionNumber) {
        const cleanAdminNo = row.admissionNumber.toLowerCase().trim();
        matchedStudent = dbStudents.find(
          s => s.admissionNumber.toLowerCase().trim() === cleanAdminNo
        );
      }

      // Rule B: Try to match by Student Name if admission number did not match or wasn't provided
      if (!matchedStudent && row.studentName) {
        const cleanName = row.studentName.toLowerCase().replace(/[^a-z]/g, '');
        
        matchedStudent = dbStudents.find(s => {
          const dbFullName1 = `${s.lastName}${s.firstName}`.toLowerCase().replace(/[^a-z]/g, '');
          const dbFullName2 = `${s.firstName}${s.lastName}`.toLowerCase().replace(/[^a-z]/g, '');
          return dbFullName1 === cleanName || dbFullName2 === cleanName;
        });
      }

      // If no student matched, log a warning and skip this row
      if (!matchedStudent) {
        warningLogs.push({
          row: excelRowNum,
          column: 'Student Match',
          message: `Could not identify student in this class arm. In file: [Adm: ${row.admissionNumber || 'N/A'}, Name: ${row.studentName || 'N/A'}]`,
        });
        continue;
      }

      // Check if scores are loaded, otherwise skip upsert or save as empty
      const c1 = row.ca1 ?? null;
      const c2 = row.ca2 ?? null;
      const asg = row.assignment ?? null;
      const ex = row.exam ?? null;

      const hasRecord = c1 !== null || c2 !== null || asg !== null || ex !== null;
      
      let total = null;
      let grade = null;
      let remarks = null;

      if (hasRecord) {
        const details = calculateScoreDetails(c1, c2, asg, ex, gradingRules);
        total = details.total;
        grade = details.grade;
        remarks = details.remarks;
      }

      // Gather parsed score entry
      successLogs.push({
        studentId: matchedStudent.id,
        admissionNumber: matchedStudent.admissionNumber,
        firstName: matchedStudent.firstName,
        lastName: matchedStudent.lastName,
        ca1: c1,
        ca2: c2,
        assignment: asg,
        exam: ex,
        total,
        grade,
        remarks
      });
    }

    // Fetch existing score submission if any to prevent wiping out existing data
    const existingSubmission = await prisma.scoreSubmission.findUnique({
      where: {
        schoolId_subjectId_classId_armId_termId: {
          schoolId,
          subjectId,
          classId,
          armId,
          termId
        }
      }
    });

    const existingScoresMap = new Map<string, any>();
    if (existingSubmission && typeof existingSubmission.payload === 'string') {
      try {
        const parsedPayload = JSON.parse(existingSubmission.payload);
        if (Array.isArray(parsedPayload)) {
          parsedPayload.forEach((scoreObj: any) => {
            if (scoreObj && scoreObj.studentId) {
              existingScoresMap.set(scoreObj.studentId, scoreObj);
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse existing scores payload:', e);
      }
    }

    // Merge database students roster with uploaded successes to ensure a complete sheet payload
    const finalScoresList = dbStudents.map(student => {
      const match = successLogs.find(x => x.studentId === student.id);
      const existing = existingScoresMap.get(student.id);

      if (match) {
        // Merge uploaded scores with existing ones if fields are empty in the upload
        const mergedCa1 = match.ca1 !== null ? match.ca1 : (existing && existing.ca1 !== undefined ? existing.ca1 : null);
        const mergedCa2 = match.ca2 !== null ? match.ca2 : (existing && existing.ca2 !== undefined ? existing.ca2 : null);
        const mergedAsg = match.assignment !== null ? match.assignment : (existing && existing.assignment !== undefined ? existing.assignment : null);
        const mergedEx = match.exam !== null ? match.exam : (existing && existing.exam !== undefined ? existing.exam : null);

        const hasRecord = mergedCa1 !== null || mergedCa2 !== null || mergedAsg !== null || mergedEx !== null;
        let total = null;
        let grade = null;
        let remarks = null;
        if (hasRecord) {
          const details = calculateScoreDetails(mergedCa1, mergedCa2, mergedAsg, mergedEx, gradingRules);
          total = details.total;
          grade = details.grade;
          remarks = details.remarks;
        }

        return {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          ca1: mergedCa1,
          ca2: mergedCa2,
          assignment: mergedAsg,
          exam: mergedEx,
          total,
          grade,
          remarks
        };
      }

      if (existing) {
        return {
          studentId: student.id,
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          ca1: existing.ca1 ?? null,
          ca2: existing.ca2 ?? null,
          assignment: existing.assignment ?? null,
          exam: existing.exam ?? null,
          total: existing.total ?? null,
          grade: existing.grade ?? null,
          remarks: existing.remarks ?? null
        };
      }

      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        ca1: null,
        ca2: null,
        assignment: null,
        exam: null,
        total: null,
        grade: null,
        remarks: null
      };
    });

    const payloadJson = JSON.stringify(finalScoresList);

    // Save draft score submission
    await prisma.scoreSubmission.upsert({
      where: {
        schoolId_subjectId_classId_armId_termId: {
          schoolId,
          subjectId,
          classId,
          armId,
          termId
        }
      },
      update: {
        teacherId: teacherId || '',
        status: 'DRAFT',
        payload: payloadJson
      },
      create: {
        schoolId,
        subjectId,
        classId,
        armId,
        termId,
        teacherId: teacherId || '',
        status: 'DRAFT',
        payload: payloadJson
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRowsProcessed: parsedRows.length,
        savedCount: successLogs.length,
        successes: successLogs,
        warningsCount: warningLogs.length,
        warnings: warningLogs,
      },
    });
  } catch (error: any) {
    console.error('Scores upload API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error while parsing sheet' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
