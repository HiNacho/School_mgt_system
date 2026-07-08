'use client';

import React, { useEffect, useState, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, Download, ArrowUp, ArrowDown, 
  CheckCircle, AlertCircle, Save, Wifi, WifiOff, RefreshCw, X, FileUp
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ScoreRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  ca1: number | null;
  ca2: number | null;
  assignment: number | null;
  exam: number | null;
  total: number | null;
  grade: string | null;
  remarks: string | null;
}

export default function ScoresManagerPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedArm, setSelectedArm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Scores state
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; col: 'ca1' | 'ca2' | 'assignment' | 'exam' } | null>(null);
  
  // Collaborative submission state
  const [myAssignments, setMyAssignments] = useState<any[]>([]);
  const [submissionState, setSubmissionState] = useState<any>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Indicators & Statuses
  const [savingStatus, setSavingStatus] = useState<'saved' | 'saving' | 'offline-queued' | 'error'>('saved');
  const [isOnline, setIsOnline] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Excel File upload
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadDiagnostics, setUploadDiagnostics] = useState<any>(null);

  // Coordinates references for spreadsheet keyboard navigation
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    // Check initial online status and listen to connection changes
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); syncOfflineScores(); };
    const handleOffline = () => { setIsOnline(false); setSavingStatus('offline-queued'); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      setSession(parsed);
      loadSetupConfigs(parsed);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadSetupConfigs = async (sess: any) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${sess.school.id}`);
      const json = await res.json();
      const setupObj = json.data;
      setSetup(setupObj);

      // Fetch subject assignments to enforce RBAC teaching boundaries
      const subjectsRes = await fetch(`/api/subjects?schoolId=${sess.school.id}`);
      const subjectsJson = await subjectsRes.json();
      const allAssignments = subjectsJson?.data?.assignments || [];
      
      const isTeacher = sess.user.role === 'CLASS_TEACHER' || sess.user.role === 'SUBJECT_TEACHER';
      const myAss = isTeacher ? allAssignments.filter((a: any) => a.teacherId === sess.user.id) : [];
      setMyAssignments(myAss);

      let firstClass = setupObj.classes?.[0]?.id || '';
      let firstArm = '';
      let firstSubject = '';
      let firstTerm = setupObj.terms?.[0]?.id || '';

      if (isTeacher && myAss.length > 0) {
        firstClass = myAss[0].classId;
        firstArm = myAss[0].armId;
        firstSubject = myAss[0].subjectId;
        firstTerm = myAss[0].termId || firstTerm;
      } else {
        const initialArm = setupObj.arms?.find((a: any) => a.classId === firstClass);
        firstArm = initialArm ? initialArm.id : '';
        firstSubject = setupObj.subjects?.[0]?.id || '';
      }

      setSelectedClass(firstClass);
      setSelectedArm(firstArm);
      setSelectedSubject(firstSubject);
      setSelectedTerm(firstTerm);

      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to fetch school configuration parameters');
      setLoading(false);
    }
  };

  // Fetch scores when parameters change
  useEffect(() => {
    if (selectedClass && selectedArm && selectedSubject && selectedTerm && session) {
      const isTeacher = session.user?.role === 'CLASS_TEACHER' || session.user?.role === 'SUBJECT_TEACHER';
      const assignedSubjectIds = new Set(
        myAssignments
          .filter((a: any) => a.classId === selectedClass && a.armId === selectedArm)
          .map((a: any) => a.subjectId)
      );
      const isValid = !isTeacher || assignedSubjectIds.has(selectedSubject);
      if (isValid) {
        loadScoresheet();
      }
    }
  }, [selectedClass, selectedArm, selectedSubject, selectedTerm, myAssignments, session]);

  const loadScoresheet = async () => {
    setLoading(true);
    setUploadDiagnostics(null);
    try {
      // 1. Fetch submission state
      const subRes = await fetch(
        `/api/submissions?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&subjectId=${selectedSubject}&termId=${selectedTerm}`
      );
      const subJson = await subRes.json();
      setSubmissionState(subJson.data || null);

      // 2. Fetch scores sheet (checks submission draft cache internally)
      const res = await fetch(
        `/api/scores?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&subjectId=${selectedSubject}&termId=${selectedTerm}`
      );
      const json = await res.json();
      
      // If there are offline queued edits in localStorage, load those instead
      const cacheKey = `offline_scores_${selectedArm}_${selectedSubject}_${selectedTerm}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setScores(JSON.parse(cached));
        setSavingStatus('offline-queued');
      } else {
        setScores(json.data || []);
        setSavingStatus('saved');
      }
      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to load scoresheet array');
      setLoading(false);
    }
  };

  // Handle local cell edit
  const handleCellChange = (rowIdx: number, col: 'ca1' | 'ca2' | 'assignment' | 'exam', value: string) => {
    const nextScores = [...scores];
    const row = nextScores[rowIdx];

    let numVal: number | null = null;
    if (value !== '') {
      numVal = Number(value);
      if (isNaN(numVal)) return; // Ignore non-numeric typing
    }

    // 1. Boundary checking (Max CA1:15, CA2:15, Assignment:10, Exam:60)
    const bounds = { ca1: 15, ca2: 15, assignment: 10, exam: 60 };
    if (numVal !== null && (numVal < 0 || numVal > bounds[col])) {
      return; // Ignore values out of boundaries
    }

    row[col] = numVal;

    // 2. Client-side Real-time calculation of total and grades for immediate feedback
    const c1 = row.ca1 || 0;
    const c2 = row.ca2 || 0;
    const asg = row.assignment || 0;
    const ex = row.exam || 0;
    const computedTotal = Number((c1 + c2 + asg + ex).toFixed(1));

    row.total = row.ca1 === null && row.ca2 === null && row.assignment === null && row.exam === null ? null : computedTotal;

    // Client-side quick grading rules feedback
    if (row.total !== null) {
      const scale = session.school.gradingType; // PRIMARY or SECONDARY
      if (scale === 'SECONDARY') {
        if (row.total >= 75) { row.grade = 'A1'; row.remarks = 'Excellent'; }
        else if (row.total >= 70) { row.grade = 'B2'; row.remarks = 'Very Good'; }
        else if (row.total >= 65) { row.grade = 'B3'; row.remarks = 'Good'; }
        else if (row.total >= 60) { row.grade = 'C4'; row.remarks = 'Credit'; }
        else if (row.total >= 55) { row.grade = 'C5'; row.remarks = 'Credit'; }
        else if (row.total >= 50) { row.grade = 'C6'; row.remarks = 'Credit'; }
        else if (row.total >= 45) { row.grade = 'D7'; row.remarks = 'Pass'; }
        else if (row.total >= 40) { row.grade = 'E8'; row.remarks = 'Pass'; }
        else { row.grade = 'F9'; row.remarks = 'Fail'; }
      } else {
        if (row.total >= 80) { row.grade = 'A'; row.remarks = 'Excellent'; }
        else if (row.total >= 60) { row.grade = 'B'; row.remarks = 'Good'; }
        else if (row.total >= 40) { row.grade = 'C'; row.remarks = 'Pass'; }
        else { row.grade = 'D'; row.remarks = 'Needs Improvement'; }
      }
    } else {
      row.grade = null;
      row.remarks = null;
    }

    setScores(nextScores);

    // 3. Trigger debounced autosave
    triggerAutosave(row);
  };

  const triggerAutosave = (updatedRow: ScoreRow) => {
    setSavingStatus('saving');

    const cacheKey = `offline_scores_${selectedArm}_${selectedSubject}_${selectedTerm}`;
    
    // Always persist to localStorage for offline security
    localStorage.setItem(cacheKey, JSON.stringify(scores));

    if (!navigator.onLine) {
      setSavingStatus('offline-queued');
      return;
    }

    // Debounce saves by scoresheet context
    const contextKey = `${selectedArm}_${selectedSubject}_${selectedTerm}`;
    if (saveTimeoutRef.current[contextKey]) {
      clearTimeout(saveTimeoutRef.current[contextKey]);
    }

    saveTimeoutRef.current[contextKey] = setTimeout(async () => {
      try {
        const payloadScores = scores.map((s: any) => ({
          studentId: s.studentId,
          ca1: s.ca1,
          ca2: s.ca2,
          assignment: s.assignment,
          exam: s.exam
        }));

        const response = await fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: session.school.id,
            classId: selectedClass,
            armId: selectedArm,
            subjectId: selectedSubject,
            termId: selectedTerm,
            teacherId: session.user.id,
            scores: payloadScores,
            status: 'DRAFT'
          }),
        });

        if (!response.ok) throw new Error('Autosave failed');
        const json = await response.json();
        setSubmissionState(json.data);

        // Clean cache on success
        localStorage.removeItem(cacheKey);
        setSavingStatus('saved');
      } catch (err) {
        setSavingStatus('offline-queued');
      }
    }, 600);
  };

  const syncOfflineScores = async () => {
    const cacheKey = `offline_scores_${selectedArm}_${selectedSubject}_${selectedTerm}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return;

    setSavingStatus('saving');
    try {
      const queuedScores = JSON.parse(cached);
      const payloadScores = queuedScores.map((s: any) => ({
        studentId: s.studentId,
        ca1: s.ca1,
        ca2: s.ca2,
        assignment: s.assignment,
        exam: s.exam
      }));

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          classId: selectedClass,
          armId: selectedArm,
          subjectId: selectedSubject,
          termId: selectedTerm,
          teacherId: session.user.id,
          scores: payloadScores,
          status: 'DRAFT'
        }),
      });

      if (!res.ok) throw new Error();
      const json = await res.json();
      setSubmissionState(json.data);

      localStorage.removeItem(cacheKey);
      setSavingStatus('saved');
      setSuccessMsg('Offline scores synced successfully with database!');
    } catch (e) {
      setSavingStatus('offline-queued');
    }
  };

  const submitToClassTeacher = async () => {
    try {
      setSavingStatus('saving');
      const payloadScores = scores.map((s: any) => ({
        studentId: s.studentId,
        ca1: s.ca1,
        ca2: s.ca2,
        assignment: s.assignment,
        exam: s.exam
      }));

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          classId: selectedClass,
          armId: selectedArm,
          subjectId: selectedSubject,
          termId: selectedTerm,
          teacherId: session.user.id,
          scores: payloadScores,
          status: 'PENDING'
        })
      });
      
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to submit');
      
      setSubmissionState(json.data);
      setSuccessMsg('Scoresheet successfully submitted to the Class Teacher for review!');
      setSavingStatus('saved');
    } catch (err: any) {
      setErrorMsg(err.message);
      setSavingStatus('error');
    }
  };

  // Keyboard navigation mappings (ArrowUp / ArrowDown / Enter)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number,
    col: 'ca1' | 'ca2' | 'assignment' | 'exam'
  ) => {
    const colsOrder: ('ca1' | 'ca2' | 'assignment' | 'exam')[] = ['ca1', 'ca2', 'assignment', 'exam'];
    const colIdx = colsOrder.indexOf(col);

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextRow = rowIdx + 1;
      const refKey = `${nextRow}_${col}`;
      inputRefs.current[refKey]?.focus();
      inputRefs.current[refKey]?.select();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = rowIdx - 1;
      const refKey = `${prevRow}_${col}`;
      inputRefs.current[refKey]?.focus();
      inputRefs.current[refKey]?.select();
    } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      const nextColIdx = colIdx + 1;
      if (nextColIdx < colsOrder.length) {
        e.preventDefault();
        const refKey = `${rowIdx}_${colsOrder[nextColIdx]}`;
        inputRefs.current[refKey]?.focus();
        inputRefs.current[refKey]?.select();
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      const prevColIdx = colIdx - 1;
      if (prevColIdx >= 0) {
        e.preventDefault();
        const refKey = `${rowIdx}_${colsOrder[prevColIdx]}`;
        inputRefs.current[refKey]?.focus();
        inputRefs.current[refKey]?.select();
      }
    }
  };

  // Excel template downloader
  const downloadExcelTemplate = () => {
    const activeClass = setup.classes.find((c: any) => c.id === selectedClass);
    const activeSubject = setup.subjects.find((s: any) => s.id === selectedSubject);
    
    const wsData = scores.map(s => ({
      'Admission Number': s.admissionNumber,
      'Student Name': `${s.lastName}, ${s.firstName}`,
      'CA 1 (Max 15)': s.ca1 ?? '',
      'CA 2 (Max 15)': s.ca2 ?? '',
      'Assignment (Max 10)': s.assignment ?? '',
      'Exam (Max 60)': s.exam ?? '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    
    // Width boundaries
    ws['!cols'] = [{ wch: 18 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Scoresheet');
    
    const subjectTitle = (activeSubject?.name || 'Subject').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `${activeClass?.name}_${subjectTitle}_Scoresheet.xlsx`);
  };

  // Excel scores uploader
  const handleExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) return;

    setUploadLoading(true);
    setUploadDiagnostics(null);
    setErrorMsg('');
    setSuccessMsg('');

    const formData = new FormData();
    formData.append('file', excelFile);
    formData.append('schoolId', session.school.id);
    formData.append('classId', selectedClass);
    formData.append('armId', selectedArm);
    formData.append('subjectId', selectedSubject);
    formData.append('termId', selectedTerm);
    formData.append('teacherId', session.user.id);

    try {
      const res = await fetch('/api/scores/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to parse sheet');

      setSuccessMsg(`Spreadsheet scores compiled! Loaded ${json.data.savedCount} student scores successfully.`);
      setExcelFile(null);
      
      if (json.data.warningsCount > 0) {
        setUploadDiagnostics(json.data);
      }

      await loadScoresheet();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploadLoading(false);
    }
  };

  const isTeacher = session?.user?.role === 'CLASS_TEACHER' || session?.user?.role === 'SUBJECT_TEACHER';

  // Compute available items based on RBAC rules
  const availableClasses = React.useMemo(() => {
    if (!setup?.classes) return [];
    if (!isTeacher) return setup.classes;
    
    // Filter classes that appear in teacher's assignments
    const assignedClassIds = new Set(myAssignments.map((a: any) => a.classId));
    return setup.classes.filter((c: any) => assignedClassIds.has(c.id));
  }, [setup, isTeacher, myAssignments]);

  const availableArms = React.useMemo(() => {
    if (!setup?.arms || !selectedClass) return [];
    const classArms = setup.arms.filter((a: any) => a.classId === selectedClass);
    if (!isTeacher) return classArms;

    // Filter arms that appear in teacher's assignments for this class
    const assignedArmIds = new Set(
      myAssignments
        .filter((a: any) => a.classId === selectedClass)
        .map((a: any) => a.armId)
    );
    return classArms.filter((a: any) => assignedArmIds.has(a.id));
  }, [setup, selectedClass, isTeacher, myAssignments]);

  const availableSubjects = React.useMemo(() => {
    if (!setup?.subjects || !selectedClass || !selectedArm) return [];
    if (!isTeacher) return setup.subjects;

    // Filter subjects that are assigned to this teacher in this class and arm
    const assignedSubjectIds = new Set(
      myAssignments
        .filter((a: any) => a.classId === selectedClass && a.armId === selectedArm)
        .map((a: any) => a.subjectId)
    );
    return setup.subjects.filter((s: any) => assignedSubjectIds.has(s.id));
  }, [setup, selectedClass, selectedArm, isTeacher, myAssignments]);

  // Reset selected subject when class/arm changes to ensure it's always valid
  useEffect(() => {
    if (isTeacher && availableSubjects.length > 0) {
      const isValid = availableSubjects.some((s: any) => s.id === selectedSubject);
      if (!isValid) {
        setSelectedSubject(availableSubjects[0].id);
      }
    }
  }, [selectedClass, selectedArm, availableSubjects, isTeacher, selectedSubject]);

  const isGreenwood = session?.school?.slug === 'nacho-secondary';
  const themeAccentColor = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = isGreenwood ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800';

  const submissionStatus = submissionState?.status || 'DRAFT';
  const isReadOnly = submissionStatus === 'PENDING' || submissionStatus === 'APPROVED';

  if (!loading && isTeacher && availableClasses.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center max-w-md mx-auto space-y-4 my-12 animate-fadeIn">
        <AlertCircle className={`w-12 h-12 ${isGreenwood ? 'text-emerald-500' : 'text-indigo-500'} mx-auto animate-bounce`} />
        <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">No Subject Assignments found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You are not currently assigned to teach any subjects for the active term. Please contact your school administrator or Principal to register your subject allocations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className={`w-6 h-6 ${themeAccentColor}`} /> Scoresheet Entry Panel
          </h1>
          <p className="text-xs text-slate-500 mt-1">Input scores via desktop keyboard spreadsheet, or bulk import via pre-populated Excel files.</p>
        </div>

        {/* Sync, Autosave and Gateway status banners */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Submission Gate Status Badge */}
          {submissionState && (
            <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              submissionStatus === 'APPROVED' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : submissionStatus === 'PENDING'
                  ? 'bg-amber-50 border-amber-250 text-amber-700 animate-pulse'
                  : submissionStatus === 'REJECTED'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                submissionStatus === 'APPROVED' ? 'bg-emerald-500' :
                submissionStatus === 'PENDING' ? 'bg-amber-500 animate-ping' :
                submissionStatus === 'REJECTED' ? 'bg-red-500' : 'bg-slate-400'
              }`} />
              <span>Status: {submissionStatus}</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm text-slate-700">
            {savingStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> All changes autosaved</span>
            )}
            {savingStatus === 'saving' && (
              <span className="text-amber-600 flex items-center gap-1.5"><RefreshCw className="w-4 h-4 animate-spin" /> Saving cells...</span>
            )}
            {savingStatus === 'offline-queued' && (
              <span className="text-sky-600 flex items-center gap-1.5"><WifiOff className="w-4 h-4 animate-pulse" /> Offline saving queued</span>
            )}
          </div>
        </div>
      </div>

      {/* Alert boxes */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-850 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Correction / Rejection feedback warning banner */}
      {submissionStatus === 'REJECTED' && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex flex-col gap-2 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[10px]">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>Scoresheet Returned for Correction</span>
          </div>
          {submissionState?.feedback && (
            <p className="text-[11px] text-slate-700 leading-relaxed font-semibold bg-red-100/50 p-3 rounded-lg border border-red-200/40 mt-1">
              Feedback from Class Teacher: <strong className="text-red-950">"{submissionState.feedback}"</strong>
            </p>
          )}
        </div>
      )}

      {/* Setup configuration selectors */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              const relatedArms = setup?.arms?.filter((a: any) => a.classId === e.target.value) || [];
              const availableRelatedArms = isTeacher
                ? relatedArms.filter((a: any) => myAssignments.some((asg: any) => asg.armId === a.id && asg.classId === e.target.value))
                : relatedArms;
              if (availableRelatedArms.length > 0) {
                setSelectedArm(availableRelatedArms[0].id);
              }
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium transition-all shadow-inner hover:border-slate-350"
          >
            {availableClasses.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Arm / Stream</label>
          <select
            value={selectedArm}
            onChange={(e) => setSelectedArm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium transition-all shadow-inner hover:border-slate-350"
          >
            {availableArms.map((arm: any) => (
              <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium transition-all shadow-inner hover:border-slate-350"
          >
            {availableSubjects.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium transition-all shadow-inner hover:border-slate-350"
          >
            {setup?.terms?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t.session.name})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spreadsheet Actions (Download & Upload Template) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Drag & Drop Excel Panel & Submission Gateway */}
        <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Upload className={`w-4 h-4 ${themeAccentColor}`} /> Excel Scoresheet Loader
          </h3>
          
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={downloadExcelTemplate}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-xs font-bold text-emerald-700 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Download Pre-filled Template
            </button>
            <span className="text-[10px] text-slate-500 text-center">Downloads roster pre-mapped for the selected configuration.</span>
          </div>

          {isReadOnly ? (
            <div className="border-t border-slate-100 pt-5 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Scoresheet locked for review</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">This scoresheet has been submitted or approved. Manual editing and spreadsheet uploads are disabled.</p>
            </div>
          ) : (
            <form onSubmit={handleExcelUpload} className="border-t border-slate-100 pt-5 space-y-3">
              <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Drag scoresheet spreadsheet file here</label>
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100/50 hover:border-slate-350 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <FileUp className="w-8 h-8 text-slate-400 mb-2 animate-bounce" />
                    <p className="text-xs text-slate-700 font-bold max-w-full truncate">
                      {excelFile ? excelFile.name : 'Select scoresheet file'}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">XLSX, XLS, or CSV files up to 5MB</p>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={!excelFile || uploadLoading}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex justify-center items-center gap-2 ${
                  !excelFile || uploadLoading
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : themeBgAccent + ' shadow-md shadow-emerald-600/10'
                }`}
              >
                {uploadLoading ? 'Compiling scores sheet...' : 'Parse & Upload Scores'}
              </button>
            </form>
          )}

          {/* Submit for Final Review Card */}
          {(submissionStatus === 'DRAFT' || submissionStatus === 'REJECTED') && scores.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3 animate-fadeIn">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">Submit Scoresheet</h4>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Finished entering scores? Submit this sheet to the Class Teacher. This will lock manual edits and notify the class teacher for final report card compilation.
              </p>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition-all flex justify-center items-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <CheckCircle className="w-4 h-4" /> Submit for Final Review
              </button>
            </div>
          )}

          {submissionStatus === 'PENDING' && (
            <div className="border-t border-slate-100 pt-5 space-y-2 text-center bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
              <RefreshCw className="w-6 h-6 text-amber-500 mx-auto animate-spin" />
              <p className="text-xs font-bold text-amber-700">Pending Review</p>
              <p className="text-[10px] text-amber-600/90 leading-relaxed font-semibold">
                This scoresheet is currently locked and awaiting review by the Class Teacher.
              </p>
            </div>
          )}

          {submissionStatus === 'APPROVED' && (
            <div className="border-t border-slate-100 pt-5 space-y-2 text-center bg-emerald-50 p-4 rounded-xl border border-emerald-250 shadow-sm">
              <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-emerald-700">Published to Reports</p>
              <p className="text-[10px] text-emerald-600/90 leading-relaxed font-semibold">
                Approved and locked. These scores have been successfully compiled into the official student report cards.
              </p>
            </div>
          )}
        </div>

        {/* Right: Spreadsheet grid list */}
        <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className={`w-4 h-4 ${themeAccentColor}`} /> Keyboard-Navigable Manual score matrix
            </h3>
            <span className="text-[9px] text-slate-500 hidden sm:inline-block font-mono font-bold">Use arrow keys or Enter to navigate cell focus</span>
          </div>

          {loading ? (
            <div className="h-60 flex items-center justify-center">
              <div className={`w-6 h-6 border-2 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin`} />
            </div>
          ) : scores.length === 0 ? (
            <div className="h-60 flex flex-col justify-center items-center text-slate-500 space-y-2 p-6 bg-slate-50 rounded-xl border border-slate-200">
              <FileSpreadsheet className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold text-slate-400">No students active in selected arm.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-550">
                    <th className="p-3 w-16">Adm ID</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3 w-16 text-center">CA1 (15)</th>
                    <th className="p-3 w-16 text-center">CA2 (15)</th>
                    <th className="p-3 w-16 text-center">Asg (10)</th>
                    <th className="p-3 w-16 text-center">Exam (60)</th>
                    <th className="p-3 w-16 text-center">Total</th>
                    <th className="p-3 w-16 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {scores.map((row, rowIdx) => (
                    <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-500">{row.admissionNumber}</td>
                      <td className="p-3 font-bold text-slate-800">{row.lastName}, {row.firstName}</td>
                      
                      {/* CA1 */}
                      <td className="p-1 text-center">
                        <input
                          type="text"
                          ref={(el) => { inputRefs.current[`${rowIdx}_ca1`] = el; }}
                          value={row.ca1 ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, 'ca1', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'ca1')}
                          onFocus={() => setEditingCell({ rowIdx, col: 'ca1' })}
                          onBlur={() => setEditingCell(null)}
                          disabled={isReadOnly}
                          className="w-12 bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-350 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded px-1.5 py-1 text-xs text-center focus:outline-none font-mono font-bold text-slate-800 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed shadow-inner"
                        />
                      </td>

                      {/* CA2 */}
                      <td className="p-1 text-center">
                        <input
                          type="text"
                          ref={(el) => { inputRefs.current[`${rowIdx}_ca2`] = el; }}
                          value={row.ca2 ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, 'ca2', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'ca2')}
                          onFocus={() => setEditingCell({ rowIdx, col: 'ca2' })}
                          onBlur={() => setEditingCell(null)}
                          disabled={isReadOnly}
                          className="w-12 bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-350 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded px-1.5 py-1 text-xs text-center focus:outline-none font-mono font-bold text-slate-800 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed shadow-inner"
                        />
                      </td>

                      {/* Assignment */}
                      <td className="p-1 text-center">
                        <input
                          type="text"
                          ref={(el) => { inputRefs.current[`${rowIdx}_assignment`] = el; }}
                          value={row.assignment ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, 'assignment', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'assignment')}
                          onFocus={() => setEditingCell({ rowIdx, col: 'assignment' })}
                          onBlur={() => setEditingCell(null)}
                          disabled={isReadOnly}
                          className="w-12 bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-350 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded px-1.5 py-1 text-xs text-center focus:outline-none font-mono font-bold text-slate-800 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed shadow-inner"
                        />
                      </td>

                      {/* Exam */}
                      <td className="p-1 text-center">
                        <input
                          type="text"
                          ref={(el) => { inputRefs.current[`${rowIdx}_exam`] = el; }}
                          value={row.exam ?? ''}
                          onChange={(e) => handleCellChange(rowIdx, 'exam', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, rowIdx, 'exam')}
                          onFocus={() => setEditingCell({ rowIdx, col: 'exam' })}
                          onBlur={() => setEditingCell(null)}
                          disabled={isReadOnly}
                          className="w-12 bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-350 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 rounded px-1.5 py-1 text-xs text-center focus:outline-none font-mono font-bold text-slate-800 transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed shadow-inner"
                        />
                      </td>

                      {/* Total */}
                      <td className="p-3 text-center font-mono font-extrabold text-slate-805 bg-slate-50/60 border-l border-r border-slate-100">{row.total ?? '-'}</td>

                      {/* Grade Badge */}
                      <td className="p-3 text-center">
                        {row.grade ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider border ${
                            row.grade.startsWith('A') 
                              ? 'bg-emerald-50 border-emerald-250/65 text-emerald-700' 
                              : row.grade.startsWith('B') || row.grade.startsWith('C') 
                                ? 'bg-sky-50 border-sky-200/65 text-sky-700' 
                                : row.grade.startsWith('D') || row.grade.startsWith('E')
                                  ? 'bg-amber-50 border-amber-250/65 text-amber-700'
                                  : 'bg-red-50 border-red-200/65 text-red-700 font-black'
                          }`}>
                            {row.grade}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Row 3: Upload warnings diagnostic reporter */}
      {uploadDiagnostics && (
        <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-250 text-slate-700 space-y-3 z-10 relative shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h4 className="font-extrabold text-xs uppercase tracking-wider">Excel upload diagnostic warnings ({uploadDiagnostics.warningsCount})</h4>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            The database successfully synchronized all valid columns. However, some rows in the Excel file could not be mapped automatically or contained invalid boundaries and were ignored:
          </p>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-150 text-xs">
            {uploadDiagnostics.warnings?.map((warn: any, idx: number) => (
              <div key={idx} className="py-2.5 flex items-start gap-4">
                <span className="font-mono font-bold text-slate-550">Row {warn.row}</span>
                <span className="font-bold text-amber-750 w-24">[{warn.column}]</span>
                <span className="text-slate-800 font-medium">{warn.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setIsSubmitModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mb-2">
                <AlertCircle className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Submit Scoresheet for Review?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to submit the scoresheet for <strong className="text-slate-800">
                  {setup?.classes?.find((c: any) => c.id === selectedClass)?.name} - {setup?.arms?.find((a: any) => a.id === selectedArm)?.name}
                </strong> in <strong className="text-slate-800">
                  {setup?.subjects?.find((s: any) => s.id === selectedSubject)?.name}
                </strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3.5 text-xs text-slate-700 shadow-inner">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total Students:</span>
                <span className="font-bold text-slate-950 font-mono">{scores.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Graded Students:</span>
                <span className="font-bold text-slate-950 font-mono">{scores.filter(s => s.ca1 !== null || s.ca2 !== null || s.assignment !== null || s.exam !== null).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Ungraded Students:</span>
                <span className="font-bold text-amber-600 font-mono">
                  {scores.length - scores.filter(s => s.ca1 !== null || s.ca2 !== null || s.assignment !== null || s.exam !== null).length}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  submitToClassTeacher();
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors"
              >
                Yes, Submit Scores
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
