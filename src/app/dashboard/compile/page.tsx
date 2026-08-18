'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileBarChart, CheckSquare, Sparkles, Printer, RefreshCw, 
  AlertCircle, CheckCircle, Award, Percent, Users, TrendingUp,
  Search, Eye, HelpCircle, X, Check, XCircle, FileSpreadsheet, Edit3
} from 'lucide-react';
import ResultsCardTemplate from './ResultsCardTemplate';

interface StudentReport {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    middleName: string;
    gender: 'MALE' | 'FEMALE';
    passportPhoto: string | null;
    className: string;
    armName: string;
  };
  classTeacherName?: string;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    ca1: number | null;
    ca2: number | null;
    assignment: number | null;
    exam: number | null;
    total: number;
    grade: string;
    remarks: string;
    subjectRank: number;
    rankFormatted: string;
  }>;
  summary: {
    aggregateScore: number;
    averageScore: number;
    classPosition: number;
    classPositionFormatted: string;
    totalStudents: number;
    passStatus: 'PASS' | 'FAIL';
  };
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  comments: {
    teacher: string;
    headTeacher: string;
    isAIGenerated: boolean;
  };
  traits: {
    punctuality: number;
    neatness: number;
    honesty: number;
    politeness: number;
    selfControl: number;
    attentiveness: number;
    reliability: number;
    sportsmanship: number;
  };
}

export default function ReportCardCompilerPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  // Filter selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedArm, setSelectedArm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Compiled reports
  const [compiledSchool, setCompiledSchool] = useState<any>(null);
  const [compiledTerm, setCompiledTerm] = useState<any>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [autoPreviewStudentId, setAutoPreviewStudentId] = useState<string | null>(null);
  
  // Modals & previews
  const [previewReport, setPreviewReport] = useState<StudentReport | null>(null);
  const [showPosition, setShowPosition] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('report_show_position');
      if (saved !== null) {
        setShowPosition(saved === 'true');
      }
    }
  }, []);
  
  // Status feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Report Status states
  const [reportStatus, setReportStatus] = useState<string>('DRAFT');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [adminFeedbackInput, setAdminFeedbackInput] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [transitioningStatus, setTransitioningStatus] = useState(false);

  // Broadsheet Export & Import & Matrix Modal states
  const [broadsheetLoading, setBroadsheetLoading] = useState(false);
  const [importingBroadsheet, setImportingBroadsheet] = useState(false);
  const [showBroadsheetModal, setShowBroadsheetModal] = useState(false);
  const [broadsheetSearchQuery, setBroadsheetSearchQuery] = useState('');
  const broadsheetFileInputRef = React.useRef<HTMLInputElement>(null);

  const broadsheetSubjects = React.useMemo(() => {
    if (reports.length === 0) return [];
    const map = new Map();
    reports.forEach(r => {
      r.subjects.forEach(s => {
        if (!map.has(s.subjectId)) {
          map.set(s.subjectId, { id: s.subjectId, name: s.subjectName, code: s.subjectCode });
        }
      });
    });
    return Array.from(map.values());
  }, [reports]);

  const filteredBroadsheetReports = React.useMemo(() => {
    if (!broadsheetSearchQuery.trim()) return reports;
    const q = broadsheetSearchQuery.toLowerCase().trim();
    return reports.filter(r => 
      `${r.student.lastName} ${r.student.firstName} ${r.student.admissionNumber}`.toLowerCase().includes(q)
    );
  }, [reports, broadsheetSearchQuery]);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('report_auth_token') || '') : '';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const handleExportBroadsheet = async () => {
    if (!session?.school?.id || !selectedClass || !selectedArm || !selectedTerm) {
      alert('Please select a Class, Arm, and Term first.');
      return;
    }

    setBroadsheetLoading(true);
    try {
      const res = await fetch(
        `/api/broadsheet?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`,
        { headers: getAuthHeaders() }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to fetch broadsheet data');
        return;
      }

      const { class: cls, arm, term, subjects, students } = json.data;

      const headerRow1: string[] = ['Admission Number', 'Student Name'];
      const headerRow2: string[] = ['', ''];
      const merges: XLSX.Range[] = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      ];

      let colIndex = 2;

      subjects.forEach((sub: any) => {
        const numSubCols = 6;
        headerRow1.push(sub.name);
        for (let i = 1; i < numSubCols; i++) {
          headerRow1.push('');
        }

        headerRow2.push('CA1 (15)', 'CA2 (15)', 'ASG (10)', 'EXAM (60)', 'TOTAL (100)', 'GRADE');

        merges.push({
          s: { r: 0, c: colIndex },
          e: { r: 0, c: colIndex + numSubCols - 1 }
        });

        colIndex += numSubCols;
      });

      headerRow1.push('SUMMARY METRICS', '', '');
      headerRow2.push('Overall Aggregate', 'Term Average (%)', 'Class Position');

      merges.push({
        s: { r: 0, c: colIndex },
        e: { r: 0, c: colIndex + 2 }
      });

      const aoa: any[][] = [headerRow1, headerRow2];

      students.forEach((st: any) => {
        const rowData: any[] = [
          st.admissionNumber || '—',
          `${st.lastName}, ${st.firstName}${st.middleName ? ' ' + st.middleName : ''}`
        ];

        subjects.forEach((sub: any) => {
          const subResult = st.subjects.find((s: any) => s.subjectId === sub.id);
          rowData.push(
            subResult?.ca1 ?? '',
            subResult?.ca2 ?? '',
            subResult?.assignment ?? '',
            subResult?.exam ?? '',
            subResult?.total ?? '',
            subResult?.grade ?? ''
          );
        });

        rowData.push(
          st.aggregateScore ?? '',
          st.averageScore ?? '',
          st.classPosition ? `${st.classPosition}` : '—'
        );

        aoa.push(rowData);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = merges;

      const colWidths = [
        { wch: 18 },
        { wch: 28 },
      ];
      subjects.forEach(() => {
        colWidths.push({ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 10 });
      });
      colWidths.push({ wch: 18 }, { wch: 18 }, { wch: 16 });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Academic Broadsheet');

      const fileName = `${cls.name.replace(/\s+/g, '_')}_Arm_${arm.name}_Academic_Broadsheet.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err: any) {
      console.error('Broadsheet export error:', err);
      alert('Failed to generate Broadsheet Excel file.');
    } finally {
      setBroadsheetLoading(false);
    }
  };

  const handleImportBroadsheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!session?.school?.id || !selectedClass || !selectedArm || !selectedTerm) {
      alert('Please select a Class, Arm, and Term first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImportingBroadsheet(true);
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];

        const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (rawAoA.length < 2) {
          alert('The uploaded Excel file contains insufficient rows.');
          setImportingBroadsheet(false);
          return;
        }

        const row0 = (rawAoA[0] || []).map(c => String(c).trim());
        const row1 = (rawAoA[1] || []).map(c => String(c).trim());

        const is2RowLayout = row1.some(cell => /^(CA1|CA2|ASG|ASSIGNMENT|EXAM)/i.test(cell));

        let studentDataRows: any[][] = [];
        let columnSubjectMap: Record<number, { subjectName: string; component: string }> = {};

        if (is2RowLayout) {
          studentDataRows = rawAoA.slice(2);
          let currentSubject = '';
          for (let c = 2; c < Math.max(row0.length, row1.length); c++) {
            const cellSubject = row0[c];
            if (cellSubject && !/SUMMARY|OVERALL|TOTAL|AVERAGE|POSITION/i.test(cellSubject)) {
              currentSubject = cellSubject;
            }
            const compText = row1[c] || '';
            const match = compText.match(/^(CA1|CA2|ASG|ASSIGNMENT|EXAM)/i);
            if (currentSubject && match) {
              const componentType = match[1].toUpperCase();
              columnSubjectMap[c] = {
                subjectName: currentSubject,
                component: componentType === 'ASG' ? 'ASSIGNMENT' : componentType
              };
            }
          }
        } else {
          studentDataRows = rawAoA.slice(1);
          for (let c = 2; c < row0.length; c++) {
            const header = row0[c];
            const match = header.match(/^(.*?)\s*(CA1|CA2|ASG|ASSIGNMENT|EXAM)\s*(\(\d+\))?$/i);
            if (match) {
              const subjectName = match[1].trim();
              const componentType = match[2].toUpperCase();
              columnSubjectMap[c] = {
                subjectName,
                component: componentType === 'ASG' ? 'ASSIGNMENT' : componentType
              };
            }
          }
        }

        if (studentDataRows.length === 0) {
          alert('The uploaded Excel file contains no student data rows.');
          setImportingBroadsheet(false);
          return;
        }

        const formattedRecords = studentDataRows
          .filter(r => r && (r[0] || r[1]))
          .map((r: any[]) => {
            const admissionNumber = String(r[0] || '').trim();
            const studentName = String(r[1] || '').trim();
            const scores: Record<string, any> = {};

            Object.keys(columnSubjectMap).forEach(colIdxStr => {
              const c = Number(colIdxStr);
              const { subjectName, component } = columnSubjectMap[c];
              const val = r[c];

              if (!scores[subjectName]) {
                scores[subjectName] = {};
              }

              if (component === 'CA1') scores[subjectName].ca1 = val;
              else if (component === 'CA2') scores[subjectName].ca2 = val;
              else if (component === 'ASSIGNMENT') scores[subjectName].assignment = val;
              else if (component === 'EXAM') scores[subjectName].exam = val;
            });

            return {
              admissionNumber,
              studentName,
              scores
            };
          });

        const res = await fetch('/api/broadsheet/import', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            schoolId: session.school.id,
            classId: selectedClass,
            armId: selectedArm,
            termId: selectedTerm,
            records: formattedRecords
          })
        });

        const json = await res.json();
        if (res.ok && json.success) {
          setSuccessMsg(json.message);
          handleCompile();
        } else {
          alert(json.error || 'Failed to import broadsheet scores.');
        }
      } catch (err: any) {
        console.error('Broadsheet parse error:', err);
        alert('Error reading Excel broadsheet file. Please ensure it is a valid .xlsx file.');
      } finally {
        setImportingBroadsheet(false);
        if (e.target) e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      try {
        const parsed = JSON.parse(userSession);
        const role = parsed.user?.role;
        
        const params = new URLSearchParams(window.location.search);
        const queryClassId = params.get('classId');
        const queryArmId = params.get('armId');
        const queryTermId = params.get('termId');
        const queryStudentId = params.get('studentId');

        // Security validations for Parent and Student roles
        if (role === 'PARENT') {
          if (!queryStudentId) {
            window.location.href = '/dashboard';
            return;
          }
          const parentWards = parsed.user?.parent?.students || [];
          const hasWard = parentWards.some((kid: any) => kid.id === queryStudentId);
          if (!hasWard) {
            window.location.href = '/dashboard';
            return;
          }
        } else if (role === 'STUDENT') {
          if (!queryStudentId) {
            window.location.href = '/dashboard';
            return;
          }
          const studentId = parsed.user?.student?.id;
          if (studentId !== queryStudentId) {
            window.location.href = '/dashboard';
            return;
          }
        }

        setSession(parsed);

        if (queryStudentId) {
          setAutoPreviewStudentId(queryStudentId);
        }

        loadSetupConfigs(parsed, queryClassId, queryArmId, queryTermId);
      } catch (e) {
        window.location.href = '/login';
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const loadSetupConfigs = async (
    sess: any,
    queryClassId: string | null,
    queryArmId: string | null,
    queryTermId: string | null
  ) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${sess.school.id}`, { headers: getAuthHeaders() });
      const json = await res.json();
      setSetup(json.data);

      const isTeacherRole = sess.user?.role === 'CLASS_TEACHER' || sess.user?.role === 'FORM_TEACHER';
      const teacherAssignedArms = json.data.arms?.filter((a: any) => 
        a.classTeacherId === sess.user?.id || 
        a.classTeacher?.id === sess.user?.id || 
        (a.classTeacher?.email && a.classTeacher?.email === sess.user?.email)
      ) || [];

      let defaultClassId = '';
      let defaultArmId = '';

      if (isTeacherRole && teacherAssignedArms.length > 0) {
        const myArm = queryArmId && teacherAssignedArms.some((a: any) => a.id === queryArmId)
          ? teacherAssignedArms.find((a: any) => a.id === queryArmId)
          : teacherAssignedArms[0];
        defaultClassId = myArm.classId;
        defaultArmId = myArm.id;
      } else {
        defaultClassId = queryClassId && json.data.classes?.some((c: any) => c.id === queryClassId)
          ? queryClassId
          : (json.data.classes?.[0]?.id || '');

        const relatedArms = json.data.arms?.filter((a: any) => a.classId === defaultClassId) || [];
        defaultArmId = queryArmId && relatedArms.some((a: any) => a.id === queryArmId)
          ? queryArmId
          : (relatedArms[0]?.id || '');
      }

      setSelectedClass(defaultClassId);
      setSelectedArm(defaultArmId);

      const defaultTermId = queryTermId && json.data.terms?.some((t: any) => t.id === queryTermId)
        ? queryTermId
        : (json.data.terms?.find((t: any) => t.isCurrent)?.id || json.data.terms?.[0]?.id || '');
      setSelectedTerm(defaultTermId);

      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to fetch school configuration parameters');
      setLoading(false);
    }
  };

  // Auto preview triggered once compile completes
  useEffect(() => {
    if (autoPreviewStudentId && reports.length > 0) {
      const matched = reports.find(r => r.student.id === autoPreviewStudentId);
      if (matched) {
        setPreviewReport(matched);
        setAutoPreviewStudentId(null);
      }
    }
  }, [reports, autoPreviewStudentId]);

  // Auto compile when selections are populated to show immediate results
  useEffect(() => {
    if (selectedClass && selectedArm && selectedTerm && session) {
      handleCompile();
    }
  }, [selectedClass, selectedArm, selectedTerm]);

  const handleCompile = async () => {
    setCompiling(true);
    setErrorMsg('');
    setSuccessMsg('');
    setReports([]);
    setSelectedStudentIds(new Set());

    try {
      const params = new URLSearchParams(window.location.search);
      const queryStudentId = params.get('studentId');
      
      let url = `/api/reports?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`;
      if (queryStudentId) {
        url += `&studentId=${queryStudentId}`;
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to compile reports');

      setReports(json.data || []);
      setCompiledSchool(json.school);
      setCompiledTerm(json.term);

      // Select all by default for bulk printing
      if (json.data?.length > 0) {
        const ids = json.data.map((r: any) => r.student.id);
        setSelectedStudentIds(new Set(ids));
      }

      // Fetch status
      const statusRes = await fetch(
        `/api/reports/status?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`,
        { headers: getAuthHeaders() }
      );
      if (statusRes.ok) {
        const statusJson = await statusRes.json();
        if (statusJson.success && statusJson.data) {
          setReportStatus(statusJson.data.status || 'DRAFT');
          setStatusFeedback(statusJson.data.feedback || null);
        } else {
          setReportStatus('DRAFT');
          setStatusFeedback(null);
        }
      }

      setSuccessMsg(`Class Roster compiled! Calculated totals, grades, and positional ranks for ${json.data?.length || 0} students.`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error compiling reports. Ensure scores have been uploaded/saved first.');
    } finally {
      setCompiling(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string, reason?: string) => {
    setTransitioningStatus(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/reports/status', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: session.school.id,
          classId: selectedClass,
          armId: selectedArm,
          termId: selectedTerm,
          status: newStatus,
          feedback: reason || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update report status');
      }
      setReportStatus(newStatus);
      setStatusFeedback(newStatus === 'REJECTED' ? (reason || null) : null);
      
      let statusName = '';
      if (newStatus === 'AWAITING_APPROVAL') statusName = 'submitted for school approval';
      else if (newStatus === 'APPROVED') statusName = 'approved and released to parents';
      else if (newStatus === 'REJECTED') statusName = 'returned for correction';
      else if (newStatus === 'DRAFT') statusName = 'reset to draft';

      setSuccessMsg(`Report status successfully ${statusName}.`);
      setShowRejectModal(false);
      setAdminFeedbackInput('');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update status.');
    } finally {
      setTransitioningStatus(false);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === reports.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(reports.map(r => r.student.id)));
    }
  };

  const handlePrintSelected = () => {
    if (selectedStudentIds.size === 0) {
      setErrorMsg('Please select at least one student report card to print.');
      return;
    }
    // Simple window.print() is fully bound to @media print rules in print.css, which
    // automatically hides everything except our .report-card-container containers!
    window.print();
  };

  const handlePrintSingle = (studentId: string) => {
    // Select only this student, print, then restore selection
    const prevSelection = new Set(selectedStudentIds);
    setSelectedStudentIds(new Set([studentId]));
    setTimeout(() => {
      window.print();
      setSelectedStudentIds(prevSelection);
    }, 100);
  };

  // Analytics Helpers
  const getClassAverage = () => {
    if (reports.length === 0) return 0;
    const sum = reports.reduce((acc, r) => acc + r.summary.averageScore, 0);
    return Number((sum / reports.length).toFixed(1));
  };

  const getClassPassRate = () => {
    if (reports.length === 0) return 0;
    const passes = reports.filter(r => r.summary.passStatus === 'PASS').length;
    return Math.round((passes / reports.length) * 100);
  };

  const getLowestSubject = () => {
    if (reports.length === 0) return 'None';
    // Map all subjects and calculate averages
    const subjectTotals: Record<string, { sum: number; count: number; code: string }> = {};
    reports.forEach(r => {
      r.subjects.forEach(s => {
        if (!subjectTotals[s.subjectName]) {
          subjectTotals[s.subjectName] = { sum: 0, count: 0, code: s.subjectCode };
        }
        if (s.total !== null) {
          subjectTotals[s.subjectName].sum += s.total;
          subjectTotals[s.subjectName].count += 1;
        }
      });
    });

    let lowestAvg = 100;
    let lowestName = 'None';
    Object.entries(subjectTotals).forEach(([name, data]) => {
      if (data.count > 0) {
        const avg = data.sum / data.count;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          lowestName = `${name} (${data.code}) - ${avg.toFixed(1)}%`;
        }
      }
    });

    return lowestName;
  };

  const isGreenwood = session?.school?.slug === 'nacho-secondary';
  const themeAccentColor = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = isGreenwood ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700';
  const themeAccentBorder = isGreenwood ? 'border-emerald-250' : 'border-indigo-250';
  const themeBgSubtle = isGreenwood ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600';

  // Crest SVG for premium display
  const SchoolCrestSVG = () => (
    <svg className="w-16 h-16 text-amber-500 drop-shadow-md mx-auto" viewBox="0 0 100 100" fill="currentColor">
      <path d="M50 5 L85 20 C85 60 50 90 50 90 C50 90 15 60 15 20 Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M50 7 L82 21 C82 58 50 86 50 86 C50 86 18 58 18 21 Z" fill="#1e293b" />
      {/* Crown/Star */}
      <circle cx="50" cy="32" r="6" fill="currentColor" />
      <polygon points="50,15 54,23 63,24 56,30 58,39 50,34 42,39 44,30 37,24 46,23" fill="currentColor" />
      {/* Book */}
      <path d="M30 55 C35 50 48 50 50 55 C52 50 65 50 70 55 L70 70 C65 65 52 65 50 70 C48 65 35 65 30 70 Z" fill="currentColor" />
      <line x1="50" y1="55" x2="50" y2="70" stroke="#1e293b" strokeWidth="2" />
    </svg>
  );

  const getTraitLabel = (rating: number) => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Very Good';
      case 3: return 'Good';
      case 2: return 'Fair';
      default: return 'Needs Improvement';
    }
  };

  const userRole = session?.user?.role;
  const isClassTeacher = userRole === 'CLASS_TEACHER';
  const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN';
  const isParentOrStudent = userRole === 'PARENT' || userRole === 'STUDENT';

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`w-8 h-8 border-4 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto`} />
          <p className="text-slate-400 text-xs tracking-wider uppercase font-bold">Initializing printable compiler...</p>
        </div>
      </div>
    );
  }

  if (isParentOrStudent) {
    if (!previewReport) {
      return (
        <div className="h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-4 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs tracking-wider uppercase font-bold">Accessing academic record...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        {/* Visual Parent Header */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex justify-between items-center no-print">
          <div>
            <h1 className="text-xs font-black uppercase text-slate-500 tracking-wider">Academic Report card</h1>
            <h2 className="text-base font-black text-slate-850 mt-0.5">
              {previewReport.student.lastName}, {previewReport.student.firstName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${themeBgAccent}`}
            >
              <Printer className="w-4 h-4" /> Print Report Card
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>

        {/* Inline A4 Sheet View */}
        <div className="flex justify-center bg-slate-50 rounded-3xl p-6 border border-slate-200/80 overflow-x-auto">
          <div className="bg-white text-slate-950 p-8 rounded shadow-lg w-[210mm] min-h-[297mm] font-serif flex flex-col justify-between">
            {/* Visual Card Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div className="flex items-center gap-4">
                  {compiledSchool?.logo ? (
                    <img src={compiledSchool.logo} alt="School Logo" className="w-14 h-14 rounded-full object-cover border-2 border-slate-800 bg-white" />
                  ) : (
                    <div className="text-slate-800 border-2 border-slate-800 p-1 rounded-full w-14 h-14 flex items-center justify-center bg-slate-100 font-extrabold">
                      {isGreenwood ? 'G.S' : 'L.E.P'}
                    </div>
                  )}
                  <div>
                    <h1 className="font-extrabold text-lg uppercase tracking-tight text-slate-900">{compiledSchool?.name}</h1>
                    <p className="text-[10px] text-slate-600 font-sans italic">{compiledSchool?.address || 'Lagos, Nigeria'}</p>
                    <p className="text-[9px] text-slate-500 font-sans">Contact: {compiledSchool?.phone || '+234 803 000 0000'} | {compiledSchool?.email}</p>
                  </div>
                </div>

                <div className="text-right font-sans">
                  <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-[10px] rounded uppercase tracking-wider">
                    Official Academic Report
                  </span>
                  <p className="text-[10px] font-bold text-slate-600 mt-2 font-mono">{compiledTerm?.name} ({compiledTerm?.session})</p>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-12 gap-4 border border-slate-900 p-3 rounded font-sans text-[11px] bg-slate-50/50">
                <div className="col-span-8 grid grid-cols-2 gap-y-1.5">
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Student Name</span>
                    <strong className="text-slate-900 text-xs font-serif">{previewReport.student.lastName}, {previewReport.student.firstName} {previewReport.student.middleName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Admission ID</span>
                    <strong className="text-slate-900 text-xs font-mono font-bold">{previewReport.student.admissionNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Class Level</span>
                    <strong className="text-slate-900 text-xs">{previewReport.student.className} - Arm {previewReport.student.armName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Student Gender</span>
                    <strong className="text-slate-900 text-xs uppercase">{previewReport.student.gender}</strong>
                  </div>
                </div>

                <div className="col-span-4 border-l border-slate-200 pl-4 grid grid-cols-2 gap-y-1.5">
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Class Position</span>
                    <strong className="text-slate-900 text-sm font-serif font-extrabold">{previewReport.summary.classPositionFormatted} <span className="text-[10px] text-slate-500 font-normal">of {previewReport.summary.totalStudents}</span></strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Term Average</span>
                    <strong className="text-slate-900 text-sm font-serif font-extrabold">{previewReport.summary.averageScore}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Attendance</span>
                    <strong className="text-slate-900 text-xs">{previewReport.attendance.present} / {previewReport.attendance.total} days</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Result Status</span>
                    <strong className={`text-xs ${previewReport.summary.passStatus === 'PASS' ? 'text-emerald-700' : 'text-red-700'} font-extrabold`}>{previewReport.summary.passStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Subject Matrix */}
              <table className="w-full border-collapse border border-slate-900 text-slate-900 text-left font-sans text-[10px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                    <th className="p-1.5 border border-slate-900">Subject Name</th>
                    <th className="p-1.5 border border-slate-900 text-center w-12">CA1 (15)</th>
                    <th className="p-1.5 border border-slate-900 text-center w-12">CA2 (15)</th>
                    <th className="p-1.5 border border-slate-900 text-center w-12">Asg (10)</th>
                    <th className="p-1.5 border border-slate-900 text-center w-15">Exam (60)</th>
                    <th className="p-1.5 border border-slate-900 text-center w-15">Total (100)</th>
                    <th className="p-1.5 border border-slate-900 text-center w-15">Grade</th>
                    <th className="p-1.5 border border-slate-900 text-center w-15">Pos</th>
                    <th className="p-1.5 border border-slate-900 text-center w-24">Teacher Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {previewReport.subjects.map((sub) => (
                    <tr key={sub.subjectId} className="border-b border-slate-300">
                      <td className="p-1.5 border-r border-slate-300 font-bold uppercase">{sub.subjectName}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">{sub.ca1 !== null ? sub.ca1 : '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">{sub.ca2 !== null ? sub.ca2 : '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">{sub.assignment !== null ? sub.assignment : '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono">{sub.exam !== null ? sub.exam : '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">{sub.total !== null ? sub.total : '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-bold">{sub.grade || '-'}</td>
                      <td className="p-1.5 border-r border-slate-300 text-center font-mono font-bold">{sub.rankFormatted || '-'}</td>
                      <td className="p-1.5 text-[8.5px] italic text-slate-600 font-sans leading-none">{sub.remarks || 'Satisfactory progress.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cognitive & Psychomotor & Signatures */}
            <div className="space-y-4 mt-4 pt-2 border-t border-slate-200">
              <div className="grid grid-cols-12 gap-4">
                {/* Traits */}
                <div className="col-span-6 space-y-1.5">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Affective & Psychomotor Domains</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 border border-slate-300 rounded p-2 text-[9px] bg-slate-50/50 font-sans">
                    {Object.entries(previewReport.traits).map(([trait, rating]) => (
                      <div key={trait} className="flex justify-between border-b border-slate-150 pb-0.5">
                        <span className="capitalize text-slate-500 font-semibold">{trait.replace(/([A-Z])/g, ' $1')}:</span>
                        <strong className="text-slate-800">{rating} ({getTraitLabel(rating)})</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div className="col-span-6 space-y-1.5 font-sans">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">General Remarks & Recommendations</span>
                  <div className="border border-slate-300 rounded p-2.5 text-[9px] space-y-2 bg-slate-50/50">
                    <div>
                      <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block">Class Teacher Remark</span>
                      <p className="text-slate-700 italic font-medium">"{previewReport.comments.teacher}"</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider block">Head Teacher / Principal Remark</span>
                      <p className="text-slate-700 italic font-medium">"{previewReport.comments.headTeacher}"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-4 text-center font-sans">
                <div className="space-y-1">
                  <div className="h-6 flex items-end justify-center font-serif text-[10px] text-slate-800 italic font-bold">
                    {previewReport.classTeacherName || 'Class Teacher'}
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                    Class Teacher Signature
                  </div>
                </div>

                <div className="relative flex justify-center items-center">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/40 text-red-500/40 text-[7px] font-bold flex flex-col items-center justify-center transform -rotate-12 scale-90">
                    <span>APPROVED</span>
                    <span className="text-[5px] uppercase truncate max-w-[42px]" title={compiledSchool?.name || 'NACHO ACAD.'}>
                      {compiledSchool?.name || 'NACHO ACAD.'}
                    </span>
                    <span className="text-[5px]">LAGOS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="h-6 flex items-end justify-center font-serif text-[10px] text-indigo-700 italic font-bold">
                    Dr. A. B. Olumide
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                    Principal's Signature & Stamp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. Header controls (no-print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <FileBarChart className={`w-6 h-6 ${themeAccentColor}`} /> Report Cards
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Process session standings, review grade ranking leaderboards, and print high-fidelity A4 academic reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden file input for Broadsheet import */}
            <input
              type="file"
              ref={broadsheetFileInputRef}
              onChange={handleImportBroadsheetFile}
              accept=".xlsx, .xls"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => setShowBroadsheetModal(true)}
              disabled={reports.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-md disabled:opacity-50"
              title="Open full interactive broadsheet matrix table"
            >
              <Eye className="w-4 h-4 text-emerald-400" />
              📊 View Full Broadsheet Matrix
            </button>

            <button
              type="button"
              onClick={handleExportBroadsheet}
              disabled={broadsheetLoading || !selectedClass || !selectedArm || !selectedTerm}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              title="Download complete class broadsheet Excel file"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {broadsheetLoading ? 'Generating Broadsheet...' : '📥 Export Broadsheet (.xlsx)'}
            </button>

            <button
              type="button"
              onClick={() => broadsheetFileInputRef.current?.click()}
              disabled={importingBroadsheet || !selectedClass || !selectedArm || !selectedTerm}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all shadow-sm disabled:opacity-50"
              title="Import filled Broadsheet Excel file to auto-generate report cards"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              {importingBroadsheet ? 'Importing Scores & Generating...' : '📤 Import Broadsheet (.xlsx)'}
            </button>

            <button
              type="button"
              onClick={() => {
                const nextVal = !showPosition;
                setShowPosition(nextVal);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('report_show_position', String(nextVal));
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all shadow-sm ${
                showPosition 
                  ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100' 
                  : 'bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200'
              }`}
              title="Click to toggle Position/Ranking display on report cards"
            >
              <Award className={`w-4 h-4 ${showPosition ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Position: <strong className="uppercase">{showPosition ? 'ON (SHOW)' : 'OFF (HIDE)'}</strong></span>
            </button>

            <button
              type="button"
              onClick={handlePrintSelected}
              disabled={selectedStudentIds.size === 0 || reports.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${themeBgAccent}`}
            >
              <Printer className="w-4 h-4" />
              Print Selected Cards ({selectedStudentIds.size})
            </button>
          </div>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-250 text-red-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Compilation Workflow Status Banner */}
        {reports.length > 0 && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className={`p-3 rounded-2xl ${
                reportStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' :
                reportStatus === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-amber-600' :
                reportStatus === 'REJECTED' ? 'bg-rose-50 text-rose-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {reportStatus === 'APPROVED' ? <CheckCircle className="w-6 h-6" /> :
                 reportStatus === 'AWAITING_APPROVAL' ? <AlertCircle className="w-6 h-6 animate-pulse" /> :
                 reportStatus === 'REJECTED' ? <AlertCircle className="w-6 h-6" /> :
                 <CheckSquare className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Compilation Status</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold uppercase border ${
                    reportStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    reportStatus === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    reportStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {reportStatus === 'APPROVED' ? 'Approved & Released' :
                     reportStatus === 'AWAITING_APPROVAL' ? 'Awaiting School Approval' :
                     reportStatus === 'REJECTED' ? 'Returned for Correction' :
                     'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                  {reportStatus === 'APPROVED' ? 'The results for this class arm have been fully approved and released. Parents and students are now able to view and print report cards.' :
                   reportStatus === 'AWAITING_APPROVAL' ? 'The results are locked and awaiting final review and approval by school administrators. Subject teacher scoring is frozen.' :
                   reportStatus === 'REJECTED' ? 'The results compile has been returned for correction. Please check the feedback below and update scores/remarks.' :
                   'Draft mode. Score sheet updates are open. Once compiled and finalized, submit for school approval.'}
                </p>
                {reportStatus === 'REJECTED' && statusFeedback && (
                  <div className="mt-2.5 p-3 rounded-xl bg-rose-50/50 border border-rose-100 text-xs font-semibold text-rose-850 italic leading-relaxed">
                    <strong className="not-italic text-rose-900 block font-bold text-[10px] uppercase tracking-wider mb-0.5">Admin Correction Feedback:</strong>
                    "{statusFeedback}"
                  </div>
                )}
              </div>
            </div>

            {/* Actions for Class Teacher / Admin */}
            {(isClassTeacher || isAdmin) && (reportStatus === 'DRAFT' || reportStatus === 'REJECTED') && (
              <button
                type="button"
                disabled={transitioningStatus}
                onClick={() => handleUpdateStatus('AWAITING_APPROVAL')}
                className={`flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm ${themeBgAccent}`}
              >
                {transitioningStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Submit for School Approval
              </button>
            )}

            {/* Actions for School Admin / Super Admin */}
            {isAdmin && (
              <div className="flex flex-wrap gap-2.5 mt-2 md:mt-0">
                {(reportStatus === 'AWAITING_APPROVAL' || reportStatus === 'DRAFT' || reportStatus === 'REJECTED') && (
                  <button
                    type="button"
                    disabled={transitioningStatus}
                    onClick={() => handleUpdateStatus('APPROVED')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-750 transition-all shadow-sm"
                  >
                    {transitioningStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve & Release
                  </button>
                )}
                {reportStatus === 'AWAITING_APPROVAL' && (
                  <button
                    type="button"
                    disabled={transitioningStatus}
                    onClick={() => setShowRejectModal(true)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all shadow-sm"
                  >
                    <XCircle className="w-4 h-4 text-red-500" />
                    Return for Correction
                  </button>
                )}
                {reportStatus === 'APPROVED' && (
                  <button
                    type="button"
                    disabled={transitioningStatus}
                    onClick={() => handleUpdateStatus('DRAFT')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all border border-slate-250 shadow-sm"
                  >
                    {transitioningStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Revoke Approval (Reset to Draft)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Class</label>
              {isClassTeacher && (
                <span className="text-[9px] font-extrabold text-[#14B8A6] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1">
                  🔒 Assigned Class
                </span>
              )}
            </div>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                const relatedArms = setup?.arms?.filter((a: any) => a.classId === e.target.value) || [];
                if (relatedArms.length > 0) setSelectedArm(relatedArms[0].id);
              }}
              disabled={isClassTeacher && (() => {
                const teacherAssignedArms = setup?.arms?.filter((a: any) => 
                  a.classTeacherId === session?.user?.id || 
                  a.classTeacher?.id === session?.user?.id || 
                  (a.classTeacher?.email && a.classTeacher?.email === session?.user?.email)
                ) || [];
                return teacherAssignedArms.length > 0;
              })()}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              {(() => {
                let classesToDisplay = setup?.classes || [];
                if (isClassTeacher && session?.user) {
                  const teacherAssignedArms = setup?.arms?.filter((a: any) => 
                    a.classTeacherId === session.user.id || 
                    a.classTeacher?.id === session.user.id || 
                    (a.classTeacher?.email && a.classTeacher?.email === session.user.email)
                  ) || [];
                  if (teacherAssignedArms.length > 0) {
                    const assignedClassIds = new Set(teacherAssignedArms.map((a: any) => a.classId));
                    classesToDisplay = setup?.classes?.filter((c: any) => assignedClassIds.has(c.id)) || [];
                  }
                }
                return classesToDisplay.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ));
              })()}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Arm / Stream</label>
              {isClassTeacher && (
                <span className="text-[9px] font-extrabold text-[#14B8A6] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1">
                  🔒 Assigned Arm
                </span>
              )}
            </div>
            <select
              value={selectedArm}
              onChange={(e) => setSelectedArm(e.target.value)}
              disabled={isClassTeacher && (() => {
                const teacherAssignedArms = setup?.arms?.filter((a: any) => 
                  a.classTeacherId === session?.user?.id || 
                  a.classTeacher?.id === session?.user?.id || 
                  (a.classTeacher?.email && a.classTeacher?.email === session?.user?.email)
                ) || [];
                return teacherAssignedArms.length > 0;
              })()}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed"
            >
              {(() => {
                const classArms = setup?.arms?.filter((a: any) => a.classId === selectedClass) || [];
                let armsToDisplay = classArms;
                if (isClassTeacher && session?.user) {
                  const teacherAssignedArms = classArms.filter((a: any) => 
                    a.classTeacherId === session.user.id || 
                    a.classTeacher?.id === session.user.id || 
                    (a.classTeacher?.email && a.classTeacher?.email === session.user.email)
                  );
                  if (teacherAssignedArms.length > 0) {
                    armsToDisplay = teacherAssignedArms;
                  }
                }
                return armsToDisplay.map((arm: any) => (
                  <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                ));
              })()}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors"
            >
              {setup?.terms?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.session.name})</option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={handleCompile}
              disabled={compiling}
              className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 h-9 flex justify-center items-center gap-2 ${themeBgAccent}`}
            >
              {compiling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Compile Class Roster
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Statistical overview blocks */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${themeBgSubtle}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Evaluated</span>
                <span className="text-xl font-extrabold text-slate-800">{reports.length} Students</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Avg Score</span>
                <span className="text-xl font-extrabold text-slate-800">{getClassAverage()}%</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pass Rate</span>
                <span className="text-xl font-extrabold text-slate-800">{getClassPassRate()}%</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lowest Avg Subject</span>
                <span className="text-xs font-extrabold text-amber-700 truncate max-w-[150px] block" title={getLowestSubject()}>
                  {getLowestSubject()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Class compilation table */}
        {reports.length > 0 && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckSquare className={`w-4 h-4 ${themeAccentColor}`} /> Academic Roster & rankings matrix
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Select reports to include in compilation print.</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === reports.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 bg-white focus:ring-0 w-4 h-4 cursor-pointer accent-emerald-600"
                      />
                    </th>
                    <th className="p-4 w-16 text-center">Rank</th>
                    <th className="p-4">Admission No</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 w-24 text-center">Term Avg</th>
                    <th className="p-4 w-24 text-center">Status</th>
                    <th className="p-4 w-40 text-center">Print Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reports.map((row) => {
                    const isSelected = selectedStudentIds.has(row.student.id);
                    return (
                      <tr key={row.student.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-slate-50/20' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(row.student.id)}
                            className="rounded border-slate-300 bg-white focus:ring-0 w-4 h-4 cursor-pointer accent-emerald-600"
                          />
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 font-mono">
                          {showPosition ? row.summary.classPositionFormatted : '-'}
                        </td>
                        <td className="p-4 font-mono text-slate-500 font-bold uppercase">{row.student.admissionNumber}</td>
                        <td className="p-4 text-slate-800 font-semibold">{row.student.lastName}, {row.student.firstName} {row.student.middleName}</td>
                        <td className="p-4 text-center font-bold text-slate-700 font-mono">{row.summary.averageScore}%</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            row.summary.passStatus === 'PASS' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                              : 'bg-red-50 text-red-700 border border-red-200/80'
                          }`}>
                            {row.summary.passStatus}
                          </span>
                        </td>
                        <td className="p-4 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewReport(row)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(row.student.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-850 transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Printer className={`w-3.5 h-3.5 ${themeAccentColor}`} /> Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reports.length === 0 && !compiling && (
          <div className="p-16 rounded-3xl bg-white border border-dashed border-slate-250 text-center space-y-4 shadow-sm">
            <FileBarChart className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-700">Ready to Process report cards?</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Choose the desired Class-Arm and Term parameters above, and click "Compile Class Roster" to compute final scores and print cards.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Academic Broadsheet Matrix Modal (Image 2 design) */}
      {showBroadsheetModal && (
        <div className="no-print fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-[96vw] h-[92vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">
                      Academic Broadsheet — {setup?.classes?.find((c: any) => c.id === selectedClass)?.name || 'Class'} ({setup?.arms?.find((a: any) => a.id === selectedArm)?.name || 'Arm'})
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                      {setup?.terms?.find((t: any) => t.id === selectedTerm)?.name || 'Current Term'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Enrolled Students: <strong className="text-slate-700 font-bold">{reports.length}</strong> | Total Subjects: <strong className="text-slate-700 font-bold">{broadsheetSubjects.length}</strong>
                  </p>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={broadsheetSearchQuery}
                    onChange={(e) => setBroadsheetSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-medium w-44 sm:w-56 shadow-sm"
                  />
                  {broadsheetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBroadsheetSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <a
                  href={`/dashboard/scores?classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Scores
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                </button>

                <button
                  type="button"
                  onClick={handleExportBroadsheet}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export Excel
                </button>

                <button
                  type="button"
                  onClick={() => setShowBroadsheetModal(false)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Broadsheet Table */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/50">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-w-full">
                <table className="w-full border-collapse text-left text-xs font-sans">
                  <thead>
                    {/* Row 1: Subject Header Codes */}
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-[11px] font-bold">
                      <th className="p-3 sticky left-0 bg-slate-100 z-20 border-r border-slate-200 text-center min-w-[200px]" colSpan={2}>
                        STUDENT DETAILS
                      </th>
                      {broadsheetSubjects.map((sub: any) => (
                        <th key={sub.id} colSpan={6} className="p-2 text-center border-r border-slate-200 uppercase tracking-wider bg-slate-50 text-slate-700">
                          <div className="font-extrabold text-xs">{sub.code || sub.name.substring(0, 3).toUpperCase()}</div>
                          <div className="text-[9px] text-slate-400 font-normal truncate max-w-[150px] mx-auto" title={sub.name}>{sub.name}</div>
                        </th>
                      ))}
                      <th colSpan={3} className="p-2 text-center bg-indigo-50/50 text-indigo-900 font-extrabold uppercase tracking-wider">
                        OVERALL METRICS
                      </th>
                    </tr>

                    {/* Row 2: Score Components */}
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 tracking-wider uppercase text-center">
                      <th className="p-2 sticky left-0 bg-slate-50 z-20 border-r border-slate-200 text-slate-500 w-12">POS</th>
                      <th className="p-2 sticky left-[48px] bg-slate-50 z-20 border-r border-slate-200 text-left text-slate-600 min-w-[160px]">STUDENT NAME</th>
                      {broadsheetSubjects.map((sub: any) => (
                        <React.Fragment key={`sub-cols-${sub.id}`}>
                          <th className="p-1.5 border-r border-slate-150 w-10">CA1</th>
                          <th className="p-1.5 border-r border-slate-150 w-10">CA2</th>
                          <th className="p-1.5 border-r border-slate-150 w-10">ASG</th>
                          <th className="p-1.5 border-r border-slate-150 w-10">EXM</th>
                          <th className="p-1.5 border-r border-slate-150 w-11 bg-slate-100/60 font-black text-slate-700">TOT</th>
                          <th className="p-1.5 border-r border-slate-200 w-10 bg-slate-100/40">GRD</th>
                        </React.Fragment>
                      ))}
                      <th className="p-2 border-r border-slate-200 bg-indigo-50/30 text-indigo-700 w-16">AGG</th>
                      <th className="p-2 border-r border-slate-200 bg-indigo-50/40 text-indigo-800 w-16">AVG (%)</th>
                      <th className="p-2 bg-indigo-50/50 text-indigo-900 w-16">RANK</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150 bg-white">
                    {filteredBroadsheetReports.map((row: any) => {
                      const pos = row.summary.classPosition;
                      const posPillStyle = 
                        pos === 1 ? 'bg-amber-100 text-amber-800 border-amber-300 font-black' :
                        pos === 2 ? 'bg-slate-200 text-slate-700 border-slate-300 font-bold' :
                        pos === 3 ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold' :
                        'bg-slate-100 text-slate-600 font-semibold';

                      return (
                        <tr key={row.student.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Position Pill */}
                          <td className="p-2 sticky left-0 bg-white z-10 border-r border-slate-200 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] border ${posPillStyle}`}>
                              {row.summary.classPositionFormatted}
                            </span>
                          </td>

                          {/* Student Name & Admission Number */}
                          <td className="p-2.5 sticky left-[48px] bg-white z-10 border-r border-slate-200">
                            <div className="font-bold text-slate-800 leading-tight">
                              {row.student.lastName}, {row.student.firstName}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 font-semibold">
                              {row.student.admissionNumber || '—'}
                            </div>
                          </td>

                          {/* Per-Subject Score Components */}
                          {broadsheetSubjects.map((sub: any) => {
                            const subjectScore = row.subjects.find((s: any) => s.subjectId === sub.id);
                            const grade = subjectScore?.grade || '—';
                            const gradeStyle = 
                              grade === 'A' ? 'bg-emerald-100 text-emerald-800 font-black' :
                              grade === 'B' ? 'bg-blue-100 text-blue-800 font-bold' :
                              grade === 'C' ? 'bg-amber-100 text-amber-800 font-bold' :
                              grade === 'D' ? 'bg-orange-100 text-orange-800' :
                              grade === 'F' ? 'bg-rose-100 text-rose-800 font-bold' :
                              'text-slate-400';

                            return (
                              <React.Fragment key={`score-${row.student.id}-${sub.id}`}>
                                <td className="p-1.5 text-center border-r border-slate-150 text-slate-500 font-mono text-[11px]">
                                  {subjectScore?.ca1 ?? '—'}
                                </td>
                                <td className="p-1.5 text-center border-r border-slate-150 text-slate-500 font-mono text-[11px]">
                                  {subjectScore?.ca2 ?? '—'}
                                </td>
                                <td className="p-1.5 text-center border-r border-slate-150 text-slate-500 font-mono text-[11px]">
                                  {subjectScore?.assignment ?? '—'}
                                </td>
                                <td className="p-1.5 text-center border-r border-slate-150 text-slate-500 font-mono text-[11px]">
                                  {subjectScore?.exam ?? '—'}
                                </td>
                                <td className="p-1.5 text-center border-r border-slate-150 font-black text-slate-850 font-mono text-xs bg-slate-50/70">
                                  {subjectScore?.total ?? '—'}
                                </td>
                                <td className="p-1.5 text-center border-r border-slate-200 bg-slate-50/40">
                                  <span className={`inline-block w-6 py-0.5 rounded text-[10px] text-center uppercase ${gradeStyle}`}>
                                    {grade}
                                  </span>
                                </td>
                              </React.Fragment>
                            );
                          })}

                          {/* Overall Metrics */}
                          <td className="p-2 text-center border-r border-slate-200 font-mono font-bold text-slate-700 bg-indigo-50/20">
                            {row.summary.aggregateScore}
                          </td>
                          <td className="p-2 text-center border-r border-slate-200 font-mono font-black text-indigo-700 text-xs bg-indigo-50/30">
                            {row.summary.averageScore}%
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-700 bg-indigo-50/40">
                            {row.summary.classPositionFormatted}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 italic font-medium text-[11px]">
                * Scores are computed out of 100. CA1 (15), CA2 (15), ASG (10), EXAM (60).
              </span>

              <button
                type="button"
                onClick={() => setShowBroadsheetModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
              >
                Close Broadsheet
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. HIGH-FIDELITY PREVIEW MODAL (no-print) */}
      {previewReport && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                  <Eye className={`w-4 h-4 ${themeAccentColor}`} /> High-Fidelity Printable Card Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Showing exact A4 layout structure for {previewReport.student.lastName}, {previewReport.student.firstName}.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSingle(previewReport.student.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${themeBgAccent}`}
                >
                  <Printer className="w-3.5 h-3.5" /> Print This Card
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setPreviewReport(null)} 
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
              <div className="w-[210mm] scale-[0.85] origin-top my-auto">
                <ResultsCardTemplate
                  report={previewReport}
                  compiledSchool={compiledSchool}
                  compiledTerm={compiledTerm}
                  showPosition={showPosition}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.5. ADMIN REJECTION REASON MODAL (no-print) */}
      {showRejectModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                <AlertCircle className="w-4.5 h-4.5 text-rose-600" /> Return for Correction
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowRejectModal(false);
                  setAdminFeedbackInput('');
                }} 
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Please provide feedback or instructions explaining why these results are being returned for correction. The class teacher will see this message.
              </p>
              <textarea
                value={adminFeedbackInput}
                onChange={(e) => setAdminFeedbackInput(e.target.value)}
                placeholder="e.g. Please verify the Mathematics grades and recheck the attendance records for JSS 1A."
                className="w-full h-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors resize-none"
              />
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setAdminFeedbackInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 bg-white hover:bg-slate-50 border border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transitioningStatus || !adminFeedbackInput.trim()}
                onClick={() => handleUpdateStatus('REJECTED', adminFeedbackInput)}
                className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {transitioningStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                Send Feedback & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DYNAMIC PRINT-ONLY MULTI-PAGE CONTAINER (Only active during browser print pipeline) */}
      <div className="print-only">
        {reports.filter(r => selectedStudentIds.has(r.student.id)).map((report) => (
          <ResultsCardTemplate
            key={report.student.id}
            report={report}
            compiledSchool={compiledSchool}
            compiledTerm={compiledTerm}
            showPosition={showPosition}
          />
        ))}
      </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';
