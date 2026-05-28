// Excel Score sheet Parser & Template Generator
import * as XLSX from 'xlsx';

export interface ExcelRowParsed {
  admissionNumber?: string;
  studentName?: string;
  ca1?: number | null;
  ca2?: number | null;
  assignment?: number | null;
  exam?: number | null;
}

export interface ParseResult {
  data: ExcelRowParsed[];
  errors: { row: number; column: string; message: string }[];
  headers: string[];
}

// 1. Fuzzy Column Matchers
const ADMISSION_PATTERNS = [/admission\s*number/i, /admission\s*no/i, /admin\s*no/i, /reg\s*no/i, /student\s*id/i, /id/i];
const NAME_PATTERNS = [/student\s*name/i, /name/i, /full\s*name/i, /student/i];
const CA1_PATTERNS = [/ca\s*1/i, /test\s*1/i, /assessment\s*1/i, /ca1/i, /first\s*ca/i];
const CA2_PATTERNS = [/ca\s*2/i, /test\s*2/i, /assessment\s*2/i, /ca2/i, /second\s*ca/i];
const ASSIGNMENT_PATTERNS = [/assignment/i, /homework/i, /project/i, /proj/i, /asg/i];
const EXAM_PATTERNS = [/exam/i, /examination/i, /paper/i, /finals/i];

function matchesPattern(header: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(header));
}

// 2. Main Excel Buffer Parser
export function parseExcelScoreSheet(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert worksheet to array of JSON objects (raw rows)
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
  if (rows.length === 0) {
    return { data: [], errors: [{ row: 0, column: 'Sheet', message: 'The sheet is empty' }], headers: [] };
  }

  // Find column headers mapping
  const headers = Object.keys(rows[0]);
  let admissionCol = '';
  let nameCol = '';
  let ca1Col = '';
  let ca2Col = '';
  let assignmentCol = '';
  let examCol = '';

  for (const h of headers) {
    if (matchesPattern(h, ADMISSION_PATTERNS) && !admissionCol) admissionCol = h;
    else if (matchesPattern(h, NAME_PATTERNS) && !nameCol) nameCol = h;
    else if (matchesPattern(h, CA1_PATTERNS) && !ca1Col) ca1Col = h;
    else if (matchesPattern(h, CA2_PATTERNS) && !ca2Col) ca2Col = h;
    else if (matchesPattern(h, ASSIGNMENT_PATTERNS) && !assignmentCol) assignmentCol = h;
    else if (matchesPattern(h, EXAM_PATTERNS) && !examCol) examCol = h;
  }

  const data: ExcelRowParsed[] = [];
  const errors: { row: number; column: string; message: string }[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // Excel is 1-indexed and has header row
    const admissionNumber = admissionCol ? String(row[admissionCol]).trim() : undefined;
    const studentName = nameCol ? String(row[nameCol]).trim() : undefined;

    // Helper to parse score and validate boundaries
    const parseScore = (val: any, colName: string, maxVal: number): number | null => {
      if (val === undefined || val === null || val === '') return null;
      const num = Number(val);
      if (isNaN(num)) {
        errors.push({ row: rowNum, column: colName, message: `Value '${val}' is not a valid number` });
        return null;
      }
      if (num < 0 || num > maxVal) {
        errors.push({ row: rowNum, column: colName, message: `Score ${num} exceeds allowed range (0 - ${maxVal})` });
        return null;
      }
      return num;
    };

    const ca1 = ca1Col ? parseScore(row[ca1Col], 'CA 1', 15) : null;
    const ca2 = ca2Col ? parseScore(row[ca2Col], 'CA 2', 15) : null;
    const assignment = assignmentCol ? parseScore(row[assignmentCol], 'Assignment', 10) : null;
    const exam = examCol ? parseScore(row[examCol], 'Exam', 60) : null;

    if (!admissionNumber && !studentName) {
      errors.push({ row: rowNum, column: 'Identity', message: 'Neither Student Name nor Admission Number was found' });
      return;
    }

    data.push({
      admissionNumber,
      studentName,
      ca1,
      ca2,
      assignment,
      exam,
    });
  });

  return { data, errors, headers };
}

// 3. Generate Blank Scoresheet Template
export function generateExcelTemplate(
  students: { admissionNumber: string; firstName: string; lastName: string }[],
  subjectName: string,
  className: string
): Buffer {
  const wsData = students.map(s => ({
    'Admission Number': s.admissionNumber,
    'Student Name': `${s.lastName}, ${s.firstName}`,
    'CA 1 (Max 15)': '',
    'CA 2 (Max 15)': '',
    'Assignment (Max 10)': '',
    'Exam (Max 60)': '',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);
  
  // Set column widths
  const colWidths = [
    { wch: 18 }, // Admission Number
    { wch: 25 }, // Student Name
    { wch: 15 }, // CA1
    { wch: 15 }, // CA2
    { wch: 20 }, // Assignment
    { wch: 15 }, // Exam
  ];
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Scoresheet');
  
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return excelBuffer;
}
