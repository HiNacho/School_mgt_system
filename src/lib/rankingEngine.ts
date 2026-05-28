// Result Processing & Automated Class Ranking Engine

export interface RawScoreInput {
  studentId: string;
  subjectId: string;
  ca1?: number | null;
  ca2?: number | null;
  assignment?: number | null;
  exam?: number | null;
}

export interface GradingScaleRule {
  minScore: number;
  maxScore: number;
  grade: string;
  interpretation: string;
}

export interface CompiledSubjectResult {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  ca1: number;
  ca2: number;
  assignment: number;
  exam: number;
  total: number;
  grade: string;
  remarks: string;
  subjectRank: number; // Position in subject class-wide
}

export interface StudentCompiledReport {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  subjects: CompiledSubjectResult[];
  aggregateScore: number;
  averageScore: number;
  classPosition: number;
  totalStudents: number;
  status: string;
}

// 1. Core Calculator for a Single Score Row
export function calculateScoreDetails(
  ca1: number | null | undefined,
  ca2: number | null | undefined,
  assignment: number | null | undefined,
  exam: number | null | undefined,
  rules: GradingScaleRule[]
): { total: number; grade: string; remarks: string } {
  const c1 = ca1 || 0;
  const c2 = ca2 || 0;
  const asg = assignment || 0;
  const ex = exam || 0;
  const total = Number((c1 + c2 + asg + ex).toFixed(1));

  // Find matching grading rule
  let grade = 'F';
  let remarks = 'Fail';

  // Sort rules descending to match correctly or check range
  for (const rule of rules) {
    if (total >= rule.minScore && total <= rule.maxScore) {
      grade = rule.grade;
      remarks = rule.interpretation;
      break;
    }
  }

  return { total, grade, remarks };
}

// 2. Class Compilation Engine with Competition Ranking
export function compileClassResults(
  students: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    status: string;
  }[],
  subjects: { id: string; name: string; code: string }[],
  scores: RawScoreInput[],
  rules: GradingScaleRule[]
): StudentCompiledReport[] {
  const activeStudents = students.filter(s => s.status === 'ACTIVE');
  if (activeStudents.length === 0) return [];

  // Group scores by studentId
  const studentScoresMap: Record<string, RawScoreInput[]> = {};
  for (const score of scores) {
    if (!studentScoresMap[score.studentId]) {
      studentScoresMap[score.studentId] = [];
    }
    studentScoresMap[score.studentId].push(score);
  }

  // Pre-calculate all totals per subject for subject ranking
  // Map of subjectId -> Array of { studentId, total }
  const subjectTotals: Record<string, { studentId: string; total: number }[]> = {};
  for (const sub of subjects) {
    subjectTotals[sub.id] = [];
  }

  // Helper map for student raw compilation
  const studentsCompiledRaw = activeStudents.map(student => {
    const sScores = studentScoresMap[student.id] || [];
    const compiledSubjects: CompiledSubjectResult[] = [];

    let totalSum = 0;
    let countedSubjects = 0;

    for (const sub of subjects) {
      const score = sScores.find(sc => sc.subjectId === sub.id);
      const c1 = score?.ca1 ?? null;
      const c2 = score?.ca2 ?? null;
      const asg = score?.assignment ?? null;
      const ex = score?.exam ?? null;

      // Check if at least one score component is entered, otherwise it's empty
      const hasRecord = c1 !== null || c2 !== null || asg !== null || ex !== null;
      if (hasRecord) {
        const details = calculateScoreDetails(c1, c2, asg, ex, rules);
        compiledSubjects.push({
          subjectId: sub.id,
          subjectName: sub.name,
          subjectCode: sub.code,
          ca1: c1 || 0,
          ca2: c2 || 0,
          assignment: asg || 0,
          exam: ex || 0,
          total: details.total,
          grade: details.grade,
          remarks: details.remarks,
          subjectRank: 0, // Assigned later
        });

        totalSum += details.total;
        countedSubjects++;

        // Add to subject rankings array
        subjectTotals[sub.id].push({
          studentId: student.id,
          total: details.total,
        });
      }
    }

    const average = countedSubjects > 0 ? Number((totalSum / countedSubjects).toFixed(2)) : 0;

    return {
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName,
      subjects: compiledSubjects,
      aggregateScore: Number(totalSum.toFixed(1)),
      averageScore: average,
      classPosition: 0, // Assigned later
      totalStudents: activeStudents.length,
      status: student.status,
    };
  });

  // Calculate Subject Rankings per student
  for (const sub of subjects) {
    const list = subjectTotals[sub.id] || [];
    // Sort descending by total score
    list.sort((a, b) => b.total - a.total);

    // Compute standard competition rank for this subject
    let rank = 1;
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].total < list[i - 1].total) {
        rank = i + 1;
      }
      const targetStudent = studentsCompiledRaw.find(s => s.studentId === list[i].studentId);
      if (targetStudent) {
        const subResult = targetStudent.subjects.find(su => su.subjectId === sub.id);
        if (subResult) {
          subResult.subjectRank = rank;
        }
      }
    }
  }

  // Calculate Overall Class Position (Competition Ranking: 1st, 2nd, 2nd, 4th)
  // Sort by averageScore descending
  studentsCompiledRaw.sort((a, b) => b.averageScore - a.averageScore);

  let position = 1;
  for (let i = 0; i < studentsCompiledRaw.length; i++) {
    if (i > 0 && studentsCompiledRaw[i].averageScore < studentsCompiledRaw[i - 1].averageScore) {
      position = i + 1;
    }
    studentsCompiledRaw[i].classPosition = position;
  }

  return studentsCompiledRaw;
}

// 3. Format ordinal numbers (e.g. 1st, 2nd, 3rd, 4th, 21st)
export function getOrdinalSuffix(num: number): string {
  if (num <= 0) return '-';
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) {
    return num + 'st';
  }
  if (j === 2 && k !== 12) {
    return num + 'nd';
  }
  if (j === 3 && k !== 13) {
    return num + 'rd';
  }
  return num + 'th';
}
