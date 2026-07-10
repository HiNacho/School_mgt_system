'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Users, Calendar, CheckCircle, AlertCircle, Clock, BookOpen, Award,
  Search, Filter, ChevronLeft, ChevronRight, X, Eye, FileText,
  TrendingUp, Bell, RefreshCw, Check, UserCheck, BarChart2, Printer,
  ArrowRight, User, ClipboardList, Star, Percent, Activity, ChevronDown,
  ChevronUp, TriangleAlert, Info, GraduationCap, Loader2, Send
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttendanceStudent {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  passportPhoto?: string | null;
  gender?: string;
  status: 'PRESENT' | 'ABSENT';
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  atRisk: boolean;
}

interface AttendanceRecord {
  date: string;
  totalPresent: number;
  totalAbsent: number;
  rate: number;
  students: { id: string; name: string; status: 'PRESENT' | 'ABSENT' }[];
}

interface SubjectSubmission {
  id: string;
  subjectId: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
  payload?: string;
  teacher?: { firstName: string; lastName: string };
  subject: { id: string; name: string; code: string };
  sentAt?: string;
}

interface Student {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  passportPhoto?: string | null;
  gender?: string;
  dateOfBirth?: string | null;
  attendanceRate?: number;
  totalPresent?: number;
  totalAbsent?: number;
  atRisk?: boolean;
  scores?: { subjectName: string; total: number | null; grade: string | null }[];
  averageScore?: number | null;
  position?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(first: string, last: string) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

const statusColors: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING:  'bg-amber-50  text-amber-700  border-amber-200',
  DRAFT:    'bg-sky-50    text-sky-700    border-sky-200',
  REJECTED: 'bg-red-50    text-red-700    border-red-200',
  NOT_SUBMITTED: 'bg-slate-50 text-slate-500 border-slate-200',
};

const statusLabel: Record<string, string> = {
  APPROVED: 'Approved',
  PENDING: 'Pending Review',
  DRAFT: 'Draft',
  REJECTED: 'Rejected',
  NOT_SUBMITTED: 'Not Submitted',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassTeacherDashboard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Core data
  const [setupData, setSetupData]     = useState<any>(null);
  const [students, setStudents]       = useState<Student[]>([]);
  const [classInfo, setClassInfo]     = useState<{ class: any; arm: any } | null>(null);
  const [submissions, setSubmissions] = useState<SubjectSubmission[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]); // all class submissions including approved
  const [approvedScores, setApprovedScores] = useState<{ [studentId: string]: { [subjectName: string]: number | null } }>({});

  // Attendance tab
  const [attendanceStudents, setAttendanceStudents] = useState<AttendanceStudent[]>([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSaved, setAttendanceSaved]  = useState(false);
  const [attendanceError, setAttendanceError]  = useState('');
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyLoading, setHistoryLoading]    = useState(false);
  const [attendanceSubTab, setAttendanceSubTab] = useState<'take' | 'history' | 'analytics'>('take');
  const [viewHistoryRecord, setViewHistoryRecord] = useState<AttendanceRecord | null>(null);

  // UI
  const [activeTab, setActiveTab]       = useState<'students' | 'attendance' | 'results' | 'reports'>('students');
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterMode, setFilterMode]     = useState<'all' | 'top' | 'low_attendance' | 'at_risk'>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reviewSubmission, setReviewSubmission] = useState<any | null>(null);
  const [reviewFeedback, setReviewFeedback]     = useState('');
  const [reviewLoading, setReviewLoading]       = useState(false);
  const [successMsg, setSuccessMsg]     = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [resultsSubTab, setResultsSubTab] = useState<'tracker' | 'rankings'>('tracker');

  const [reportStatus, setReportStatus] = useState<string>('DRAFT');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  const fetchReportStatus = async (schoolId: string, classId: string, armId: string, termId: string) => {
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/reports/status?schoolId=${schoolId}&classId=${classId}&armId=${armId}&termId=${termId}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.data) {
          setReportStatus(json.data.status || 'DRAFT');
          setStatusFeedback(json.data.feedback || null);
        }
      }
    } catch (e) {
      console.error('Error fetching report status:', e);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!session || !classInfo || !setupData) return;
    const term = setupData.terms?.find((t: any) => t.isCurrent) || setupData.terms?.[0];
    if (!term) return;

    setUpdatingStatus(true);
    setError('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/reports/status', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          schoolId: session.school.id,
          classId: classInfo.class.id,
          armId: classInfo.arm.id,
          termId: term.id,
          status: newStatus,
          feedback: null
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update report status');
      }

      setReportStatus(newStatus);
      if (newStatus === 'AWAITING_APPROVAL') {
        setSuccessMsg('Class reports successfully compiled and submitted for school approval!');
      } else {
        setSuccessMsg(`Class reports status updated to ${newStatus}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem('report_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      setSession(parsed);
      bootstrap(parsed);
    } else {
      setError('No active session. Please log in.');
      setLoading(false);
    }
  }, []);

  const bootstrap = async (sess: any) => {
    try {
      const { id: schoolId } = sess.school;
      const { id: userId }   = sess.user;

      const [setupRes, submissionsRes, notifRes] = await Promise.all([
        fetch(`/api/setup?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/submissions?schoolId=${schoolId}&classTeacherId=${userId}&status=all`, { cache: 'no-store' }),
        fetch(`/api/notifications?schoolId=${schoolId}&userId=${userId}`, { cache: 'no-store' }),
      ]);

      let setup: any = null;
      if (setupRes.ok) {
        const j = await setupRes.json();
        setup = j.data;
        setSetupData(j.data);
      }

      if (notifRes.ok) {
        const j = await notifRes.json();
        setNotifications(j.data?.notifications || []);
      }

      // Determine term
      const term = setup?.terms?.find((t: any) => t.isCurrent) || setup?.terms?.[0];
      if (!term) { setLoading(false); return; }

      // Fetch attendance info (auto-detects arm from teacherId)
      const attRes = await fetch(
        `/api/attendance?schoolId=${schoolId}&teacherId=${userId}&termId=${term.id}&date=${attendanceDate}`,
        { cache: 'no-store' }
      );

      if (attRes.ok) {
        const j = await attRes.json();
        const data = j.data;
        if (data.assigned) {
          setClassInfo({ class: data.class, arm: data.arm });

          const studs: Student[] = data.students.map((s: AttendanceStudent) => ({
            id: s.id,
            admissionNumber: s.admissionNumber,
            firstName: s.firstName,
            lastName: s.lastName,
            middleName: s.middleName,
            passportPhoto: s.passportPhoto,
            gender: s.gender,
            attendanceRate: s.attendanceRate,
            totalPresent: s.totalPresent,
            totalAbsent: s.totalAbsent,
            atRisk: s.atRisk,
          }));

          setStudents(studs);
          setAttendanceStudents(data.students);

          // init attendance statuses
          const initStatuses: Record<string, 'PRESENT' | 'ABSENT'> = {};
          data.students.forEach((s: AttendanceStudent) => {
            initStatuses[s.id] = s.status;
          });
          setAttendanceStatuses(initStatuses);

          // Fetch all submissions for this arm to build results tracker
          if (data.class && data.arm && setup?.subjects) {
            await fetchAllSubmissions(schoolId, data.class.id, data.arm.id, term.id, setup, studs, userId);
            await fetchReportStatus(schoolId, data.class.id, data.arm.id, term.id);
          }
        }
      }

      if (submissionsRes.ok) {
        const j = await submissionsRes.json();
        setSubmissions(j.data || []);
      }

      setLoading(false);
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard');
      setLoading(false);
    }
  };

  const fetchAllSubmissions = async (
    schoolId: string, classId: string, armId: string,
    termId: string, setup: any, studs: Student[], classTeacherId?: string
  ) => {
    try {
      const activeTeacherId = classTeacherId || session?.user?.id || '';
      // Fetch all submissions for this arm (any status)
      const res = await fetch(`/api/submissions?schoolId=${schoolId}&classTeacherId=${activeTeacherId}&status=all`, { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        setSubmissions(j.data || []);
      }
      // We already have pending, but now get approved scores too
      // For tracker: build subject list from setup
      const subjects: any[] = setup?.subjects || [];
      const armSubjects = subjects.filter((s: any) => {
        // subjects assigned to this arm (check assignments if available)
        return true; // we'll show all school subjects and match submissions
      });

      setAllSubmissions(armSubjects);

      // Fetch approved scores for each student
      const scoreMap: { [studentId: string]: { [subjectName: string]: number | null } } = {};
      studs.forEach(s => { scoreMap[s.id] = {}; });
      setApprovedScores(scoreMap);
    } catch (e) {
      console.error('fetchAllSubmissions error', e);
    }
  };

  // Re-fetch attendance when date changes
  const fetchAttendanceForDate = useCallback(async (date: string) => {
    if (!session || !classInfo) return;
    const { id: schoolId } = session.school;
    const { id: userId } = session.user;
    const term = setupData?.terms?.find((t: any) => t.isCurrent) || setupData?.terms?.[0];
    if (!term) return;

    const res = await fetch(
      `/api/attendance?schoolId=${schoolId}&teacherId=${userId}&termId=${term.id}&date=${date}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const j = await res.json();
      if (j.data?.assigned) {
        setAttendanceStudents(j.data.students);
        const statuses: Record<string, 'PRESENT' | 'ABSENT'> = {};
        j.data.students.forEach((s: AttendanceStudent) => { statuses[s.id] = s.status; });
        setAttendanceStatuses(statuses);
      }
    }
  }, [session, classInfo, setupData]);

  useEffect(() => {
    if (session && classInfo) fetchAttendanceForDate(attendanceDate);
  }, [attendanceDate]);

  // Fetch attendance history
  const fetchAttendanceHistory = useCallback(async () => {
    if (!session || !classInfo) return;
    setHistoryLoading(true);
    try {
      const { id: schoolId } = session.school;
      const { id: userId }   = session.user;
      const term = setupData?.terms?.find((t: any) => t.isCurrent) || setupData?.terms?.[0];
      if (!term) return;

      // Fetch for the past 30 days by iterating unique dates from termly records
      // Use attendance records via API — fetch multiple dates
      const today = new Date();
      const records: AttendanceRecord[] = [];

      // Fetch last 20 calendar days
      for (let i = 0; i < 20; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const res = await fetch(
          `/api/attendance?schoolId=${schoolId}&teacherId=${userId}&termId=${term.id}&date=${dateStr}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const j = await res.json();
          if (j.data?.assigned && j.data.taken && j.data.students.length > 0) {
            const studs = j.data.students as AttendanceStudent[];
            const totalPresent = studs.filter(s => s.status === 'PRESENT').length;
            const totalAbsent  = studs.filter(s => s.status === 'ABSENT').length;
            const total = totalPresent + totalAbsent;
            if (total > 0) {
              records.push({
                date: dateStr,
                totalPresent,
                totalAbsent,
                rate: Math.round((totalPresent / total) * 100),
                students: studs.map(s => ({
                  id: s.id,
                  name: `${s.lastName} ${s.firstName}`,
                  status: s.status,
                })),
              });
            }
          }
        }
      }
      setAttendanceHistory(records);
    } catch (e) {
      console.error('fetchHistory error', e);
    } finally {
      setHistoryLoading(false);
    }
  }, [session, classInfo, setupData]);

  useEffect(() => {
    if (attendanceSubTab === 'history' || attendanceSubTab === 'analytics') {
      fetchAttendanceHistory();
    }
  }, [attendanceSubTab]);

  // ── Submit Attendance ────────────────────────────────────────────────────────
  const handleSubmitAttendance = async () => {
    if (!session || !classInfo) return;
    setAttendanceSaving(true);
    setAttendanceError('');
    try {
      const { id: schoolId } = session.school;
      const { id: userId }   = session.user;
      const term = setupData?.terms?.find((t: any) => t.isCurrent) || setupData?.terms?.[0];

      const records = attendanceStudents.map(s => ({
        studentId: s.id,
        status: attendanceStatuses[s.id] || 'PRESENT',
      }));

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          termId: term.id,
          classId: classInfo.class.id,
          armId: classInfo.arm.id,
          date: attendanceDate,
          markedBy: userId,
          records,
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to save attendance');

      setAttendanceSaved(true);
      setSuccessMsg('Attendance saved successfully!');
      setTimeout(() => setAttendanceSaved(false), 3000);

      // Refresh student attendance rates
      await fetchAttendanceForDate(attendanceDate);
    } catch (e: any) {
      setAttendanceError(e.message || 'Error saving attendance');
    } finally {
      setAttendanceSaving(false);
    }
  };

  // ── Review Actions ───────────────────────────────────────────────────────────
  const handleReviewAction = async (submissionId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!session) return;
    setReviewLoading(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submissionId,
          schoolId: session.school.id,
          status,
          feedback: status === 'REJECTED' ? reviewFeedback : undefined,
          userId: session.user.id,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setReviewSubmission(null);
      setReviewFeedback('');
      setSuccessMsg(status === 'APPROVED' ? 'Scores approved & published!' : 'Scoresheet returned to teacher.');
      // Refresh submissions
      const r2 = await fetch(`/api/submissions?schoolId=${session.school.id}&classTeacherId=${session.user.id}&status=all`, { cache: 'no-store' });
      if (r2.ok) { const j2 = await r2.json(); setSubmissions(j2.data || []); }
    } catch (e: any) {
      setAttendanceError(e.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Computed Values ──────────────────────────────────────────────────────────
  const term = useMemo(() => setupData?.terms?.find((t: any) => t.isCurrent) || setupData?.terms?.[0], [setupData]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const todayPresentCount = useMemo(() =>
    Object.values(attendanceStatuses).filter(s => s === 'PRESENT').length,
    [attendanceStatuses]
  );
  const todayAbsentCount = useMemo(() =>
    Object.values(attendanceStatuses).filter(s => s === 'ABSENT').length,
    [attendanceStatuses]
  );

  // All subjects assigned to this arm from setup
  const armSubjects = useMemo(() => {
    if (!classInfo || !setupData?.assignments) return setupData?.subjects || [];
    return (setupData.assignments || []).filter(
      (a: any) => a.armId === classInfo.arm.id
    );
  }, [setupData, classInfo]);

  // Build result tracker: for each subject in the arm, find the matching submission
  const subjectTracker = useMemo(() => {
    if (!setupData?.subjects) return [];
    return (setupData.subjects || []).map((subj: any) => {
      // Find any submission for this subject in the arm
      const sub = submissions.find((s: any) => s.subjectId === subj.id);
      return {
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        status: sub?.status || 'NOT_SUBMITTED',
        teacher: sub?.teacher,
        submission: sub,
      };
    });
  }, [setupData, submissions]);

  const submittedCount = useMemo(() =>
    subjectTracker.filter((s: any) => s.status === 'APPROVED' || s.status === 'PENDING').length,
    [subjectTracker]
  );

  const pendingReviewCount = useMemo(() =>
    submissions.filter(s => s.status === 'PENDING').length,
    [submissions]
  );

  const allApproved = useMemo(() =>
    subjectTracker.length > 0 && subjectTracker.every((s: any) => s.status === 'APPROVED'),
    [subjectTracker]
  );

  // Rankings: build from approved submissions
  const rankings = useMemo(() => {
    const approvedSubs = submissions.filter(s => s.status === 'APPROVED' && s.payload);
    if (approvedSubs.length === 0 || students.length === 0) return [];

    const scoreMap: Record<string, number[]> = {};
    students.forEach(s => { scoreMap[s.id] = []; });

    approvedSubs.forEach(sub => {
      try {
        const rows = JSON.parse(sub.payload || '[]');
        rows.forEach((row: any) => {
          if (row.studentId && scoreMap[row.studentId] !== undefined) {
            let totalVal = 0;
            if (row.total !== null && row.total !== undefined) {
              totalVal = Number(row.total);
            } else {
              totalVal = Number(row.ca1 || 0) + Number(row.ca2 || 0) + Number(row.assignment || 0) + Number(row.exam || 0);
            }
            scoreMap[row.studentId].push(totalVal);
          }
        });
      } catch (e) { /* skip malformed */ }
    });

    const ranked = students
      .map(s => {
        const totals = scoreMap[s.id] || [];
        const avg = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null;
        return { ...s, averageScore: avg, subjectCount: totals.length };
      })
      .filter(s => s.averageScore !== null)
      .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));

    let pos = 1;
    return ranked.map((s, i) => {
      if (i > 0 && s.averageScore !== ranked[i - 1].averageScore) pos = i + 1;
      return { ...s, position: pos };
    });
  }, [submissions, students]);

  // Student list with filtering
  const filteredStudents = useMemo(() => {
    let list = [...students];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(s =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q)
      );
    }
    if (filterMode === 'top') {
      list = list.filter(s => (s.attendanceRate || 0) >= 80).sort((a, b) =>
        (b.averageScore || 0) - (a.averageScore || 0)
      );
    } else if (filterMode === 'low_attendance') {
      list = list.filter(s => (s.attendanceRate || 100) < 70);
    } else if (filterMode === 'at_risk') {
      list = list.filter(s => s.atRisk);
    }
    // Merge rankings
    return list.map(s => {
      const ranked = rankings.find(r => r.id === s.id);
      return { ...s, position: ranked?.position, averageScore: ranked?.averageScore ?? null };
    });
  }, [students, searchQuery, filterMode, rankings]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-sm text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">{error}</p>
          <a href="/dashboard" className="text-xs text-indigo-600 font-bold underline">← Back to Dashboard</a>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const { user, school } = session;
  const className = classInfo ? `${classInfo.class.name} ${classInfo.arm.name}` : 'Unassigned';
  const termName  = term?.name || 'N/A';
  const sessionName = term?.session?.name || '2025/2026';

  const tabs = [
    { id: 'students',    label: 'Students',   icon: Users },
    { id: 'attendance',  label: 'Attendance', icon: Calendar },
    { id: 'results',     label: 'Results',    icon: BarChart2 },
    { id: 'reports',     label: 'Reports',    icon: FileText },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Class info */}
            <div className="flex items-center gap-3 min-w-0">
              <a href="/dashboard" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </a>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-extrabold text-slate-800 truncate">
                    {classInfo ? (
                      <>{classInfo.class.name} <span className="text-indigo-600">— Arm {classInfo.arm.name}</span></>
                    ) : (
                      <span className="text-slate-400">No class assigned</span>
                    )}
                  </h1>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-wider border border-indigo-100 flex-shrink-0">
                    Class Teacher
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                  {termName} · {sessionName}
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Notifications bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(v => !v)}
                  className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Notifications</span>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-400 font-medium">No notifications</div>
                      ) : notifications.map((n: any) => (
                        <div key={n.id} className={`px-4 py-3 text-xs ${n.isRead ? 'text-slate-400' : 'text-slate-700 bg-indigo-50/30'}`}>
                          <p className="font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Teacher avatar */}
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black flex items-center justify-center border border-indigo-200">
                {initials(user.firstName, user.lastName)}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.id === 'results' && pendingReviewCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black">
                    {pendingReviewCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Success banner */}
        {successMsg && (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {successMsg}
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600 ml-4">✕</button>
          </div>
        )}

        {/* ── NO CLASS ASSIGNED ─────────────────────────────────────────── */}
        {!classInfo && !loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-600">No Class Assigned Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              You have not been assigned as a Class Teacher to any arm. Please contact your School Administrator to assign you.
            </p>
            <a href="/dashboard" className="inline-flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline mt-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </a>
          </div>
        )}

        {classInfo && (
          <>
            {/* ── SUMMARY CARDS ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Total Students */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Students</p>
                    <p className="text-2xl font-extrabold text-slate-800 leading-none">{students.length}</p>
                  </div>
                </div>
              </div>

              {/* Attendance Today */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Today</p>
                    <p className="text-2xl font-extrabold text-emerald-600 leading-none">{todayPresentCount}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{todayAbsentCount} absent</p>
                  </div>
                </div>
              </div>

              {/* Results Submitted */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-sky-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Results In</p>
                    <p className="text-2xl font-extrabold text-sky-600 leading-none">{submittedCount}</p>
                    <p className="text-[10px] text-slate-400 font-medium">of {subjectTracker.length} subjects</p>
                  </div>
                </div>
              </div>

              {/* Pending Review */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    pendingReviewCount > 0 ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'
                  }`}>
                    <Clock className={`w-4 h-4 ${pendingReviewCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Review</p>
                    <p className={`text-2xl font-extrabold leading-none ${pendingReviewCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {pendingReviewCount}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">awaiting approval</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                TAB: STUDENTS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {/* Search + Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search student name or admission number..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-300"
                    />
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'top', 'low_attendance', 'at_risk'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setFilterMode(f)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap ${
                          filterMode === f
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {f === 'all' ? 'All' : f === 'top' ? '⭐ Top' : f === 'low_attendance' ? '⚠ Low Attendance' : '🚨 At Risk'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">#</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student</th>
                          <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden sm:table-cell">Adm. No</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Attendance</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden md:table-cell">Avg Score</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px] hidden md:table-cell">Position</th>
                          <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                          <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-xs text-slate-400 font-medium">
                              {searchQuery ? 'No students match your search.' : 'No students in this class.'}
                            </td>
                          </tr>
                        ) : filteredStudents.map((s, idx) => (
                          <tr
                            key={s.id}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            onClick={() => setSelectedStudent(s)}
                          >
                            <td className="px-4 py-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                  {s.passportPhoto ? (
                                    <img src={s.passportPhoto} alt={s.firstName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] font-black text-indigo-600">{initials(s.firstName, s.lastName)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800">{s.lastName}, {s.firstName}</p>
                                  {s.middleName && <p className="text-[10px] text-slate-400">{s.middleName}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono hidden sm:table-cell">{s.admissionNumber}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-xs font-bold ${
                                  (s.attendanceRate || 0) >= 80 ? 'text-emerald-600' :
                                  (s.attendanceRate || 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {s.attendanceRate ?? '—'}%
                                </span>
                                {s.atRisk && (
                                  <span className="text-[8px] text-red-500 font-black uppercase">At Risk</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              <span className="font-bold text-slate-700">
                                {s.averageScore !== null && s.averageScore !== undefined ? s.averageScore.toFixed(1) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center hidden md:table-cell">
                              <span className="font-bold text-slate-700">
                                {s.position ? ordinal(s.position) : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                s.atRisk
                                  ? 'bg-red-50 text-red-600 border-red-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {s.atRisk ? 'At Risk' : 'Active'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setSelectedStudent(s)}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                                  title="View Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}&studentId=${s.id}`}
                                  className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                                  title="Generate Report"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>Showing {filteredStudents.length} of {students.length} students</span>
                    {filterMode !== 'all' && (
                      <button onClick={() => setFilterMode('all')} className="text-indigo-500 font-bold hover:underline">
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: ATTENDANCE
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {/* Sub-tab switcher */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
                  {([
                    { id: 'take', label: 'Take Attendance' },
                    { id: 'history', label: 'Records' },
                    { id: 'analytics', label: 'Analytics' },
                  ] as const).map(st => (
                    <button
                      key={st.id}
                      onClick={() => setAttendanceSubTab(st.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        attendanceSubTab === st.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* ── Take Attendance ─────────────────────────────── */}
                {attendanceSubTab === 'take' && (
                  <div className="space-y-4">
                    {/* Date selector + stats */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                        <div>
                          <h2 className="text-sm font-extrabold text-slate-800">Daily Attendance</h2>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">Mark absentees — everyone is present by default</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="date"
                            value={attendanceDate}
                            onChange={e => setAttendanceDate(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:border-indigo-300"
                          />
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Present</p>
                          <p className="text-2xl font-extrabold text-emerald-700 leading-none mt-1">{todayPresentCount}</p>
                        </div>
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Absent</p>
                          <p className="text-2xl font-extrabold text-red-700 leading-none mt-1">{todayAbsentCount}</p>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rate</p>
                          <p className="text-2xl font-extrabold text-slate-700 leading-none mt-1">
                            {attendanceStudents.length > 0
                              ? Math.round((todayPresentCount / attendanceStudents.length) * 100)
                              : 0}%
                          </p>
                        </div>
                      </div>

                      {/* Mark all present/absent shortcuts */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            const all: Record<string, 'PRESENT' | 'ABSENT'> = {};
                            attendanceStudents.forEach(s => { all[s.id] = 'PRESENT'; });
                            setAttendanceStatuses(all);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition-colors"
                        >
                          ✓ Mark All Present
                        </button>
                      </div>

                      {/* Student attendance list */}
                      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                        {attendanceStudents.map((s, idx) => {
                          const isPresent = (attendanceStatuses[s.id] || 'PRESENT') === 'PRESENT';
                          return (
                            <div
                              key={s.id}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                                isPresent
                                  ? 'bg-white border-slate-100 hover:border-slate-200'
                                  : 'bg-red-50/60 border-red-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-400 w-5 text-right">{idx + 1}</span>
                                <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                  {s.passportPhoto ? (
                                    <img src={s.passportPhoto} alt={s.firstName} className="w-full h-full object-cover rounded-full" />
                                  ) : (
                                    <span className="text-[8px] font-black text-indigo-600">{initials(s.firstName, s.lastName)}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-800">{s.lastName}, {s.firstName}</p>
                                  <p className="text-[9px] text-slate-400 font-mono">{s.admissionNumber}</p>
                                </div>
                              </div>

                              {/* Toggle button */}
                              <button
                                onClick={() => setAttendanceStatuses(prev => ({
                                  ...prev,
                                  [s.id]: isPresent ? 'ABSENT' : 'PRESENT',
                                }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${
                                  isPresent
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
                                }`}
                              >
                                {isPresent
                                  ? <><Check className="w-3 h-3" /> Present</>
                                  : <><X className="w-3 h-3" /> Absent</>
                                }
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Error */}
                    {attendanceError && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {attendanceError}
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      onClick={handleSubmitAttendance}
                      disabled={attendanceSaving || attendanceStudents.length === 0}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20"
                    >
                      {attendanceSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving Attendance...</>
                      ) : attendanceSaved ? (
                        <><CheckCircle className="w-4 h-4" /> Attendance Saved!</>
                      ) : (
                        <><Check className="w-4 h-4" /> Submit Attendance for {formatDate(attendanceDate)}</>
                      )}
                    </button>
                  </div>
                )}

                {/* ── Attendance Records ──────────────────────────── */}
                {attendanceSubTab === 'history' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-slate-800">Attendance Records</h2>
                        <button onClick={fetchAttendanceHistory} className="text-[10px] text-indigo-600 font-bold hover:underline flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      </div>
                      {historyLoading ? (
                        <div className="p-12 text-center">
                          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-2" />
                          <p className="text-xs text-slate-400">Loading records...</p>
                        </div>
                      ) : attendanceHistory.length === 0 ? (
                        <div className="p-12 text-center text-xs text-slate-400 font-medium">
                          No attendance records found yet.
                        </div>
                      ) : (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Date</th>
                              <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Present</th>
                              <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Absent</th>
                              <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Rate</th>
                              <th className="px-5 py-3 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px]">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {attendanceHistory.map(rec => (
                              <tr key={rec.date} className="hover:bg-slate-50/60">
                                <td className="px-5 py-3 font-semibold text-slate-700">{formatDate(rec.date)}</td>
                                <td className="px-5 py-3 text-center font-bold text-emerald-600">{rec.totalPresent}</td>
                                <td className="px-5 py-3 text-center font-bold text-red-500">{rec.totalAbsent}</td>
                                <td className="px-5 py-3 text-center">
                                  <span className={`font-bold ${rec.rate >= 80 ? 'text-emerald-600' : rec.rate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {rec.rate}%
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <button
                                    onClick={() => setViewHistoryRecord(rec)}
                                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-colors"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Analytics ───────────────────────────────────── */}
                {attendanceSubTab === 'analytics' && (
                  <div className="space-y-4">
                    {/* Class average */}
                    {attendanceHistory.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Class Avg Rate</p>
                          <p className="text-3xl font-extrabold text-indigo-600">
                            {Math.round(attendanceHistory.reduce((s, r) => s + r.rate, 0) / attendanceHistory.length)}%
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">last {attendanceHistory.length} school days</p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Best Day</p>
                          <p className="text-xl font-extrabold text-emerald-600">
                            {attendanceHistory.reduce((best, r) => r.rate > best.rate ? r : best, attendanceHistory[0]).rate}%
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDate(attendanceHistory.reduce((best, r) => r.rate > best.rate ? r : best, attendanceHistory[0]).date)}
                          </p>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">At-Risk Students</p>
                          <p className="text-3xl font-extrabold text-red-500">
                            {attendanceStudents.filter(s => s.atRisk).length}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">below 70% attendance</p>
                        </div>
                      </div>
                    )}

                    {/* Per-student analytics */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-extrabold text-slate-800">Student Attendance Overview</h2>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Present</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Absent</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Rate</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {attendanceStudents
                            .sort((a, b) => a.attendanceRate - b.attendanceRate)
                            .map(s => (
                            <tr key={s.id} className={`${s.atRisk ? 'bg-red-50/30' : 'hover:bg-slate-50/60'}`}>
                              <td className="px-5 py-3">
                                <p className="font-semibold text-slate-800">{s.lastName}, {s.firstName}</p>
                                <p className="text-[9px] text-slate-400 font-mono">{s.admissionNumber}</p>
                              </td>
                              <td className="px-5 py-3 text-center font-bold text-emerald-600">{s.totalPresent}</td>
                              <td className="px-5 py-3 text-center font-bold text-red-500">{s.totalAbsent}</td>
                              <td className="px-5 py-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`font-bold ${
                                    s.attendanceRate >= 80 ? 'text-emerald-600' :
                                    s.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600'
                                  }`}>{s.attendanceRate}%</span>
                                  <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        s.attendanceRate >= 80 ? 'bg-emerald-500' :
                                        s.attendanceRate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${s.attendanceRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {s.atRisk ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[9px] font-black">
                                    <TriangleAlert className="w-2.5 h-2.5" /> At Risk
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black">
                                    <Check className="w-2.5 h-2.5" /> Good
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: RESULTS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'results' && (
              <div className="space-y-4">
                {/* Sub-tab switcher */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
                  {([
                    { id: 'tracker', label: 'Score Tracker' },
                    { id: 'rankings', label: 'Class Rankings' },
                  ] as const).map(st => (
                    <button
                      key={st.id}
                      onClick={() => setResultsSubTab(st.id)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        resultsSubTab === st.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                {/* All results ready banner */}
                {allApproved && subjectTracker.length > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-emerald-700">All subject results approved!</p>
                      <p className="text-xs text-emerald-600 font-medium">Report cards can now be generated for all students.</p>
                    </div>
                    <a
                      href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}`}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors flex-shrink-0"
                    >
                      Generate Reports <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                {/* ── Subject Score Tracker ──────────────────────── */}
                {resultsSubTab === 'tracker' && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-extrabold text-slate-800">Subject Score Submissions</h2>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {submittedCount} of {subjectTracker.length} subjects submitted
                        </p>
                      </div>
                      {/* Progress pill */}
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: subjectTracker.length > 0 ? `${(submittedCount / subjectTracker.length) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">
                          {subjectTracker.length > 0 ? Math.round((submittedCount / subjectTracker.length) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    {subjectTracker.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-400">
                        No subjects configured for this school.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50">
                        {subjectTracker.map((subj: any) => (
                          <div key={subj.subjectId} className="px-5 py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                subj.status === 'APPROVED' ? 'bg-emerald-500' :
                                subj.status === 'PENDING'  ? 'bg-amber-500' :
                                subj.status === 'DRAFT'    ? 'bg-sky-500' :
                                subj.status === 'REJECTED' ? 'bg-red-500' : 'bg-slate-300'
                              }`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">{subj.subjectName}</p>
                                {subj.teacher && (
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {subj.teacher.lastName}, {subj.teacher.firstName}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusColors[subj.status]}`}>
                                {statusLabel[subj.status]}
                              </span>
                              {subj.status === 'PENDING' && subj.submission && (
                                <button
                                  onClick={() => setReviewSubmission({
                                    ...subj.submission,
                                    scores: (() => { try { return JSON.parse(subj.submission?.payload || '[]'); } catch { return []; } })()
                                  })}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-500 transition-colors"
                                >
                                  Review
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Class Rankings ─────────────────────────────── */}
                {resultsSubTab === 'rankings' && (
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                      <h2 className="text-sm font-extrabold text-slate-800">Class Rankings</h2>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Auto-computed from {submissions.filter(s => s.status === 'APPROVED').length} approved subjects
                      </p>
                    </div>

                    {rankings.length === 0 ? (
                      <div className="p-12 text-center space-y-2">
                        <Award className="w-8 h-8 text-slate-200 mx-auto" />
                        <p className="text-xs font-semibold text-slate-400">Rankings will appear once subject scores are approved.</p>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Position</th>
                            <th className="px-5 py-3 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Student</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Avg Score</th>
                            <th className="px-5 py-3 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Subjects</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {rankings.map((s, i) => (
                            <tr key={s.id} className={`${i < 3 ? 'bg-amber-50/30' : 'hover:bg-slate-50/60'}`}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  {s.position <= 3 ? (
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                                      s.position === 1 ? 'bg-amber-400 text-white' :
                                      s.position === 2 ? 'bg-slate-400 text-white' :
                                      'bg-amber-700 text-white'
                                    }`}>{s.position}</span>
                                  ) : (
                                    <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                      {s.position}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">{ordinal(s.position)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                                    {s.passportPhoto ? (
                                      <img src={s.passportPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                                    ) : (
                                      <span className="text-[8px] font-black text-indigo-600">{initials(s.firstName, s.lastName)}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-slate-800">{s.lastName}, {s.firstName}</p>
                                    <p className="text-[9px] text-slate-400 font-mono">{s.admissionNumber}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="font-extrabold text-slate-800">{(s.averageScore || 0).toFixed(1)}</span>
                                <span className="text-[10px] text-slate-400 font-medium"> / 100</span>
                              </td>
                              <td className="px-5 py-3 text-center text-slate-500 font-medium">{(s as any).subjectCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                TAB: REPORTS
            ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {/* Submission / Compilation workflow card */}
                {allApproved && (
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${
                        reportStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        reportStatus === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        reportStatus === 'REJECTED' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                        'bg-slate-50 text-slate-600 border border-slate-100'
                      }`}>
                        {reportStatus === 'APPROVED' ? <CheckCircle className="w-5 h-5" /> :
                         reportStatus === 'AWAITING_APPROVAL' ? <Clock className="w-5 h-5 animate-pulse" /> :
                         reportStatus === 'REJECTED' ? <AlertCircle className="w-5 h-5" /> :
                         <FileText className="w-5 h-5" />}
                      </div>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Class Report Status</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${
                            reportStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            reportStatus === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            reportStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {reportStatus === 'APPROVED' ? 'Approved & Released' :
                             reportStatus === 'AWAITING_APPROVAL' ? 'Awaiting School Approval' :
                             reportStatus === 'REJECTED' ? 'Returned for Correction' :
                             'Draft / Not Submitted'}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-650 leading-relaxed mt-1">
                          {reportStatus === 'APPROVED' ? 'The final report cards are approved and published. Students and parents can access them.' :
                           reportStatus === 'AWAITING_APPROVAL' ? 'Locked and pending administrator final verification and release.' :
                           reportStatus === 'REJECTED' ? `Returned for correction: "${statusFeedback || 'Please review score entries'}"` :
                           'All subjects approved! You can now submit this compilation for School Administrator approval.'}
                        </p>
                      </div>
                    </div>

                    {(reportStatus === 'DRAFT' || reportStatus === 'REJECTED') && (
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus('AWAITING_APPROVAL')}
                        className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        {updatingStatus ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Submit to Admin for Approval
                      </button>
                    )}
                  </div>
                )}

                {/* Status banner */}
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                  allApproved
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  {allApproved
                    ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    : <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${allApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {allApproved ? 'All results ready — Report cards can be generated' : `${submittedCount} of ${subjectTracker.length} subjects approved`}
                    </p>
                    <p className={`text-xs font-medium ${allApproved ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {allApproved
                        ? 'Proceed to generate individual or batch report cards below.'
                        : 'Some subjects still pending. Report cards will be incomplete until all scores are approved.'}
                    </p>
                  </div>
                  <a
                    href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}`}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors flex-shrink-0 ${
                      allApproved
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-amber-600 hover:bg-amber-500 text-white'
                    }`}
                  >
                    Open Report Generator <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Per-student report buttons */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-slate-800">Student Report Cards</h2>
                    <a
                      href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 transition-colors"
                    >
                      <Printer className="w-3 h-3" /> Batch Generate All
                    </a>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {students.map((s, idx) => (
                      <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] font-bold text-slate-400 w-6">{idx + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                            {s.passportPhoto ? (
                              <img src={s.passportPhoto} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-[9px] font-black text-indigo-600">{initials(s.firstName, s.lastName)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{s.lastName}, {s.firstName}</p>
                            <p className="text-[9px] text-slate-400 font-mono">{s.admissionNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(() => {
                            const rank = rankings.find(r => r.id === s.id);
                            return rank ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black">
                                {ordinal(rank.position)} — {(rank.averageScore || 0).toFixed(1)} avg
                              </span>
                            ) : null;
                          })()}
                          <a
                            href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}&studentId=${s.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-[10px] font-bold transition-colors"
                          >
                            <FileText className="w-3 h-3" /> Generate
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Student Profile Modal ──────────────────────────────────────── */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {selectedStudent.passportPhoto ? (
                    <img src={selectedStudent.passportPhoto} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-black text-indigo-500">{initials(selectedStudent.firstName, selectedStudent.lastName)}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    {selectedStudent.lastName}, {selectedStudent.firstName}
                    {selectedStudent.middleName ? ` ${selectedStudent.middleName}` : ''}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedStudent.admissionNumber}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase">
                      {className}
                    </span>
                    {selectedStudent.gender && (
                      <span className="px-2 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100 text-[9px] font-black uppercase">
                        {selectedStudent.gender}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Attendance summary */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Attendance Summary</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase">Present</p>
                    <p className="text-xl font-extrabold text-emerald-700">{selectedStudent.totalPresent ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-red-600 uppercase">Absent</p>
                    <p className="text-xl font-extrabold text-red-700">{selectedStudent.totalAbsent ?? '—'}</p>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                    <p className="text-[9px] font-bold text-indigo-600 uppercase">Rate</p>
                    <p className={`text-xl font-extrabold ${
                      (selectedStudent.attendanceRate || 0) >= 80 ? 'text-emerald-700' :
                      (selectedStudent.attendanceRate || 0) >= 60 ? 'text-amber-700' : 'text-red-700'
                    }`}>{selectedStudent.attendanceRate ?? '—'}%</p>
                  </div>
                </div>
                {selectedStudent.atRisk && (
                  <div className="mt-2 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
                    <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0" />
                    This student has attendance below 70% — at risk of being flagged.
                  </div>
                )}
              </div>

              {/* Academic snapshot */}
              {(() => {
                const rank = rankings.find(r => r.id === selectedStudent.id);
                return rank ? (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Academic Snapshot</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                        <p className="text-[9px] font-bold text-amber-600 uppercase">Avg Score</p>
                        <p className="text-xl font-extrabold text-amber-700">{(rank.averageScore || 0).toFixed(1)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Position</p>
                        <p className="text-xl font-extrabold text-slate-700">{ordinal(rank.position)}</p>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Quick actions */}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`/dashboard/compile?classId=${classInfo?.class?.id || ''}&armId=${classInfo?.arm?.id || ''}&termId=${term?.id || ''}&studentId=${selectedStudent?.id || ''}`}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-500" /> Generate Report
                  </a>
                  <button
                    onClick={() => { setSelectedStudent(null); setActiveTab('attendance'); }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-slate-500" /> Attendance Records
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Score Review Modal ─────────────────────────────────────────── */}
      {reviewSubmission && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {reviewSubmission.subject?.name} — Score Review
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submitted by {reviewSubmission.teacher?.firstName} {reviewSubmission.teacher?.lastName}
                </p>
              </div>
              <button
                onClick={() => { setReviewSubmission(null); setReviewFeedback(''); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Score table */}
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-500 text-[10px] uppercase tracking-wider">Student</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">CA1/15</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">CA2/15</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">Asg/10</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">Exam/60</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(reviewSubmission.scores || []).map((row: any) => {
                    const total = [row.ca1, row.ca2, row.assignment, row.exam]
                      .filter((v: any) => v !== null && v !== undefined && v !== '')
                      .reduce((s: number, v: any) => s + Number(v), 0);
                    return (
                      <tr key={row.studentId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{row.lastName}, {row.firstName}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{row.admissionNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700">{row.ca1 ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700">{row.ca2 ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700">{row.assignment ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-mono text-slate-700">{row.exam ?? '—'}</td>
                        <td className="px-4 py-3 text-center font-black text-slate-800">{total || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rejection feedback */}
            <div className="p-5 border-t border-slate-100 space-y-3">
              <textarea
                value={reviewFeedback}
                onChange={e => setReviewFeedback(e.target.value)}
                placeholder="Optional: Add feedback for rejection..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-slate-300 resize-none"
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setReviewSubmission(null); setReviewFeedback(''); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleReviewAction(reviewSubmission.id, 'REJECTED')}
                  disabled={reviewLoading}
                  className="px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {reviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reject & Return'}
                </button>
                <button
                  onClick={() => handleReviewAction(reviewSubmission.id, 'APPROVED')}
                  disabled={reviewLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {reviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><CheckCircle className="w-3.5 h-3.5" /> Approve & Publish</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance History Detail Modal ───────────────────────────── */}
      {viewHistoryRecord && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Attendance — {formatDate(viewHistoryRecord.date)}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewHistoryRecord.totalPresent} present · {viewHistoryRecord.totalAbsent} absent · {viewHistoryRecord.rate}% rate
                </p>
              </div>
              <button onClick={() => setViewHistoryRecord(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-50">
              {viewHistoryRecord.students.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">{s.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                    s.status === 'PRESENT'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100">
              <button onClick={() => setViewHistoryRecord(null)} className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
