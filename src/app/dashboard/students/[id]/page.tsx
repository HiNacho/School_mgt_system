'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { use } from 'react';
import {
  ArrowLeft, Edit, Archive, ArrowRightLeft, Printer, Download, Plus, X, Loader2,
  CheckCircle, AlertCircle, User, BookOpen, Users, Heart, Calendar, TrendingUp, TrendingDown,
  Shield, FileText, MessageSquare, Clock, DollarSign, Award, Activity,
  Phone, Mail, MapPin, Home, Briefcase, ChevronRight, Camera, Upload,
  Star, AlertTriangle, CheckSquare, XCircle, Eye, RefreshCw, Save,
  GraduationCap, Stethoscope, Paperclip, MoreHorizontal, ChevronDown, ChevronUp,
  Zap, Globe, Flag
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

type Tab = 'overview' | 'personal' | 'academic' | 'guardians' | 'medical' | 'attendance' | 'performance' | 'behaviour' | 'finances' | 'documents' | 'communication' | 'timeline';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'overview',      label: 'Overview',       icon: Zap },
  { id: 'personal',      label: 'Personal',        icon: User },
  { id: 'academic',      label: 'Academic',        icon: BookOpen },
  { id: 'guardians',     label: 'Guardians',       icon: Users },
  { id: 'medical',       label: 'Medical',         icon: Stethoscope },
  { id: 'attendance',    label: 'Attendance',      icon: Calendar },
  { id: 'performance',   label: 'Performance',     icon: TrendingUp },
  { id: 'behaviour',     label: 'Behaviour',       icon: Shield },
  { id: 'finances',      label: 'Finances',        icon: DollarSign },
  { id: 'documents',     label: 'Documents',       icon: FileText },
  { id: 'communication', label: 'Communication',   icon: MessageSquare },
  { id: 'timeline',      label: 'Timeline',        icon: Clock },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:      { label: 'Active',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  GRADUATED:   { label: 'Graduated',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  TRANSFERRED: { label: 'Transferred', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30' },
  WITHDRAWN:   { label: 'Withdrawn',   color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/30' },
  SUSPENDED:   { label: 'Suspended',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/30' },
  ARCHIVED:    { label: 'Archived',    color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/30' },
};

const BEHAVIOUR_CONFIG: Record<string, { color: string; bg: string }> = {
  POSITIVE:      { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  NEGATIVE:      { color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
  LEADERSHIP:    { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
  DISCIPLINE:    { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
  PARTICIPATION: { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
  ACHIEVEMENT:   { color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/20' },
  ATTENDANCE:    { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  HEALTH:        { color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  INFO:     { label: 'Info',     color: 'text-blue-400' },
  MINOR:    { label: 'Minor',    color: 'text-amber-400' },
  MODERATE: { label: 'Moderate', color: 'text-orange-400' },
  MAJOR:    { label: 'Major',    color: 'text-red-400' },
  CRITICAL: { label: 'Critical', color: 'text-rose-500' },
};

const DOC_TYPES = [
  'BIRTH_CERTIFICATE', 'ADMISSION_LETTER', 'TRANSFER_LETTER',
  'PREVIOUS_RESULT', 'MEDICAL_REPORT', 'PASSPORT', 'PARENT_ID', 'CERTIFICATE', 'OTHER',
];

function Avatar({ photo, name, size = 'md' }: { photo?: string | null; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl', '2xl': 'w-28 h-28 text-3xl' };
  const initials = name.split(' ').filter(Boolean).map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[(name.charCodeAt(0) || 0) % colors.length];
  if (photo) return <img src={photo} alt={name} className={`${sizes[size]} rounded-full object-cover flex-shrink-0 border-4 border-white/10`} />;
  return <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 border-4 border-white/10`}>{initials}</div>;
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: any }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
      {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-60" style={{ color: 'var(--text-secondary)' }} />}
      <div className="flex-1 grid grid-cols-2 gap-2">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon: Icon }: { label: string; value: string | number; sub?: string; color: string; icon: any }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className="w-5 h-5 opacity-70" />
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-xs mt-0.5 font-medium opacity-80">{label}</div>
      {sub && <div className="text-xs mt-0.5 opacity-50">{sub}</div>}
    </div>
  );
}

export default function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = use(params);

  const [session, setSession] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Sub-data
  const [guardians, setGuardians] = useState<any[]>([]);
  const [medical, setMedical] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [behaviour, setBehaviour] = useState<any[]>([]);

  const [loadingTab, setLoadingTab] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Edit personal form
  const [personalForm, setPersonalForm] = useState<any>({});
  const [savingPersonal, setSavingPersonal] = useState(false);

  // Guardian form
  const [guardianModal, setGuardianModal] = useState(false);
  const [guardianForm, setGuardianForm] = useState<any>({ firstName: '', lastName: '', relationship: 'FATHER', phone: '', email: '', occupation: '', address: '', isPrimary: false, isEmergencyContact: true });
  const [savingGuardian, setSavingGuardian] = useState(false);

  // Medical form
  const [medicalForm, setMedicalForm] = useState<any>({});
  const [savingMedical, setSavingMedical] = useState(false);

  // Behaviour form
  const [behaviourForm, setBehaviourForm] = useState({ category: 'POSITIVE', severity: 'INFO', title: '', description: '' });
  const [logBehaviourModal, setLogBehaviourModal] = useState(false);
  const [savingBehaviour, setSavingBehaviour] = useState(false);

  // Document upload
  const [docModal, setDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ documentType: 'OTHER', name: '', url: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
  const showError   = (msg: string) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''), 6000); };

  const isAdmin   = session?.user?.role && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER'].includes(session.user.role);
  const isTeacher = session?.user?.role && ['CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(session.user.role);
  const isBursar  = session?.user?.role === 'BURSAR';

  useEffect(() => {
    const raw = localStorage.getItem('report_user_session');
    if (!raw) { window.location.href = '/login'; return; }
    try {
      const parsed = JSON.parse(raw);
      setSession(parsed);
      loadStudent(parsed);
    } catch { showError('Invalid session'); }
  }, [studentId]);

  const loadStudent = async (sess: any) => {
    setLoading(true);
    try {
      const [stuRes, setupRes] = await Promise.all([
        fetch(`/api/students?studentId=${studentId}`),
        fetch(`/api/setup?schoolId=${sess.school.id}`),
      ]);
      const [stuJson, setupJson] = await Promise.all([stuRes.json(), setupRes.json()]);
      if (!stuRes.ok) throw new Error(stuJson.error || 'Student not found');
      setStudent(stuJson.data);
      setSetup(setupJson.data);
      setPersonalForm(stuJson.data);
    } catch (e: any) { showError(e.message); }
    setLoading(false);
  };

  const loadTabData = useCallback(async (tab: Tab) => {
    if (!studentId) return;
    setLoadingTab(true);
    try {
      if (tab === 'guardians' && guardians.length === 0) {
        const r = await fetch(`/api/students/${studentId}/guardians`);
        const j = await r.json();
        setGuardians(j.data || []);
      }
      if (tab === 'medical' && !medical) {
        const r = await fetch(`/api/students/${studentId}/medical`);
        const j = await r.json();
        setMedical(j.data);
        setMedicalForm(j.data || {});
      }
      if (tab === 'documents' && documents.length === 0) {
        const r = await fetch(`/api/students/${studentId}/documents`);
        const j = await r.json();
        setDocuments(j.data || []);
      }
      if (tab === 'timeline' && timeline.length === 0) {
        const r = await fetch(`/api/students/${studentId}/timeline`);
        const j = await r.json();
        setTimeline(j.data || []);
      }
      if (tab === 'attendance' && !attendance) {
        const r = await fetch(`/api/students/${studentId}/attendance`);
        const j = await r.json();
        setAttendance(j.data);
      }
      if (tab === 'performance' && !performance) {
        const r = await fetch(`/api/students/${studentId}/performance`);
        const j = await r.json();
        setPerformance(j.data);
      }
      if (tab === 'behaviour' && behaviour.length === 0) {
        const r = await fetch(`/api/wellbeing?studentId=${studentId}&type=behaviour`);
        const j = await r.json();
        setBehaviour(j.data?.behaviourLogs || []);
      }
    } catch (e: any) { console.error(e); }
    setLoadingTab(false);
  }, [studentId, guardians.length, medical, documents.length, timeline.length, attendance, performance, behaviour.length]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    loadTabData(tab);
  };

  // ── Save Personal Info ────────────────────────────────────────────────────────
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleDirectPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showError('Image file size exceeds maximum limit of 5MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Photo = ev.target?.result as string;
        try {
          const res = await fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: studentId, passportPhoto: base64Photo }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to upload photo');
          setStudent((prev: any) => ({ ...prev, passportPhoto: base64Photo }));
          setPersonalForm((p: any) => ({ ...p, passportPhoto: base64Photo }));
          showSuccess('Passport photo updated successfully!');
        } catch (err: any) {
          showError(err.message || 'Failed to update passport photo.');
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      showError('Error reading image file');
      setUploadingPhoto(false);
    }
  };

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: studentId, ...personalForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStudent(json.data);
      setEditMode(false);
      showSuccess('Student profile updated.');
    } catch (e: any) { showError(e.message); }
    setSavingPersonal(false);
  };

  // ── Save Guardian ─────────────────────────────────────────────────────────────
  const saveGuardian = async () => {
    if (!guardianForm.firstName || !guardianForm.lastName || !guardianForm.phone) {
      showError('First name, last name and phone are required.'); return;
    }
    setSavingGuardian(true);
    try {
      const res = await fetch(`/api/students/${studentId}/guardians`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guardianForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setGuardians(prev => [json.data, ...prev]);
      setGuardianModal(false);
      setGuardianForm({ firstName: '', lastName: '', relationship: 'FATHER', phone: '', email: '', occupation: '', address: '', isPrimary: false, isEmergencyContact: true });
      showSuccess('Guardian added successfully.');
    } catch (e: any) { showError(e.message); }
    setSavingGuardian(false);
  };

  // ── Delete Guardian ────────────────────────────────────────────────────────────
  const deleteGuardian = async (guardianId: string) => {
    try {
      await fetch(`/api/students/${studentId}/guardians?guardianId=${guardianId}`, { method: 'DELETE' });
      setGuardians(prev => prev.filter(g => g.id !== guardianId));
      showSuccess('Guardian removed.');
    } catch (e: any) { showError(e.message); }
  };

  // ── Save Medical ──────────────────────────────────────────────────────────────
  const saveMedical = async () => {
    setSavingMedical(true);
    try {
      const res = await fetch(`/api/students/${studentId}/medical`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicalForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMedical(json.data);
      showSuccess('Medical record saved.');
    } catch (e: any) { showError(e.message); }
    setSavingMedical(false);
  };

  // ── Log Behaviour ─────────────────────────────────────────────────────────────
  const logBehaviour = async () => {
    if (!behaviourForm.title) { showError('Title is required.'); return; }
    setSavingBehaviour(true);
    try {
      const res = await fetch('/api/wellbeing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, schoolId: student?.schoolId, type: 'BEHAVIOUR', ...behaviourForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setBehaviour(prev => [json.data, ...prev]);
      setLogBehaviourModal(false);
      setBehaviourForm({ category: 'POSITIVE', severity: 'INFO', title: '', description: '' });
      showSuccess('Behaviour log added.');
    } catch (e: any) { showError(e.message); }
    setSavingBehaviour(false);
  };

  // ── Upload Document ───────────────────────────────────────────────────────────
  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setDocForm(f => ({ ...f, url: ev.target?.result as string, name: f.name || file.name }));
    reader.readAsDataURL(file);
  };

  const uploadDoc = async () => {
    if (!docForm.url || !docForm.name) { showError('Please select a file.'); return; }
    setUploadingDoc(true);
    try {
      const res = await fetch(`/api/students/${studentId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(docForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDocuments(prev => [json.data, ...prev]);
      setDocModal(false);
      setDocForm({ documentType: 'OTHER', name: '', url: '' });
      showSuccess('Document uploaded.');
    } catch (e: any) { showError(e.message); }
    setUploadingDoc(false);
  };

  // ── Archive Student ───────────────────────────────────────────────────────────
  const archiveStudent = async () => {
    if (!confirm(`Archive ${student?.firstName} ${student?.lastName}?`)) return;
    try {
      const res = await fetch('/api/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: studentId, status: 'ARCHIVED' }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setStudent((p: any) => ({ ...p, status: 'ARCHIVED' }));
      showSuccess('Student archived.');
    } catch (e: any) { showError(e.message); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading student profile…</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Student not found</p>
          <a href="/dashboard/students" className="text-sm text-violet-400 hover:underline mt-2 block">← Back to Registry</a>
        </div>
      </div>
    );
  }

  const fullName = `${student.firstName} ${student.middleName ? student.middleName + ' ' : ''}${student.lastName}`;
  const statusCfg = STATUS_CONFIG[student.status] || STATUS_CONFIG.ACTIVE;
  const currentSession = setup?.sessions?.find((s: any) => s.isCurrent);
  const currentTerm = setup?.terms?.find((t: any) => t.isCurrent);

  // Attendance % from existing data
  const attPct = (() => {
    if (!student.attendance?.length) return null;
    const total = student.attendance.reduce((s: number, a: any) => s + a.daysPresent + a.daysAbsent, 0);
    const present = student.attendance.reduce((s: number, a: any) => s + a.daysPresent, 0);
    return total > 0 ? Math.round((present / total) * 100) : null;
  })();

  // Average score from existing data
  const avgScore = (() => {
    const scores = student.scores?.filter((s: any) => s.total !== null) || [];
    if (!scores.length) return null;
    return Math.round(scores.reduce((s: number, x: any) => s + x.total, 0) / scores.length);
  })();

  // Outstanding fees
  const outstanding = (() => {
    const invoices = student.invoices?.filter((i: any) => i.status !== 'PAID') || [];
    return invoices.reduce((s: number, i: any) => s + (i.netAmount - i.paidAmount), 0);
  })();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Toasts ─────────────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 max-w-sm shadow-xl backdrop-blur-sm">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 opacity-60" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 max-w-sm shadow-xl backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 opacity-60" /></button>
        </div>
      )}

      {/* ── Profile Hero Header ───────────────────────────────────────────────── */}
      <div className="border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
          {/* Back button */}
          <a href="/dashboard/students" className="inline-flex items-center gap-1.5 text-sm mb-5 hover:text-violet-400 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Registry
          </a>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Passport + upload overlay */}
            <div className="relative flex-shrink-0">
              <Avatar photo={student.passportPhoto} name={fullName} size="2xl" />
              {isAdmin && (
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center cursor-pointer shadow-lg transition-colors" title="Change photo">
                  {uploadingPhoto ? (
                    <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5 text-white" />
                  )}
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={handleDirectPhotoUpload} />
                </label>
              )}
            </div>

            {/* Name / identifiers */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fullName}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono">{student.admissionNumber}</span>
                <span>·</span>
                <span>{student.class?.name} {student.arm?.name}</span>
                {student.house && <><span>·</span><span className="flex items-center gap-1"><Star className="w-3 h-3" />{student.house} House</span></>}
                {student.category && <><span>·</span><span>{student.category === 'DAY' ? 'Day Student' : 'Boarding'}</span></>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {currentSession && <span>Session: <strong style={{ color: 'var(--text-primary)' }}>{currentSession.name}</strong></span>}
                {currentTerm && <span>Term: <strong style={{ color: 'var(--text-primary)' }}>{currentTerm.name}</strong></span>}
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-2 mt-3">
                {attPct !== null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs">
                    <Calendar className="w-3 h-3 text-blue-400" />
                    <span className="text-blue-400 font-semibold">{attPct}%</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Attendance</span>
                  </div>
                )}
                {avgScore !== null && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">{avgScore}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Score</span>
                  </div>
                )}
                {outstanding > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
                    <DollarSign className="w-3 h-3 text-red-400" />
                    <span className="text-red-400 font-semibold">₦{outstanding.toLocaleString()}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Outstanding</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {isAdmin && (
              <div className="flex flex-col gap-2 min-w-[160px]">
                <button onClick={() => setEditMode(p => !p)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${editMode ? 'bg-violet-600 text-white' : 'border hover:border-violet-500/40'}`}
                  style={{ borderColor: editMode ? undefined : 'var(--border-color)', color: editMode ? undefined : 'var(--text-secondary)', background: editMode ? undefined : 'var(--bg-primary)' }}>
                  <Edit className="w-4 h-4" /> {editMode ? 'Editing…' : 'Edit Student'}
                </button>
                <button onClick={() => setLogBehaviourModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:border-violet-500/40 transition-all"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                  <Shield className="w-4 h-4" /> Log Behaviour
                </button>
                <button onClick={archiveStudent}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
                  <Archive className="w-4 h-4" /> Archive
                </button>
              </div>
            )}
            {(isTeacher) && (
              <div className="flex flex-col gap-2">
                <button onClick={() => setLogBehaviourModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border hover:border-violet-500/40 transition-all"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-primary)' }}>
                  <Shield className="w-4 h-4" /> Log Behaviour
                </button>
              </div>
            )}
          </div>

          {/* ── Tab Strip ──────────────────────────────────────────────────────── */}
          <div className="mt-6 -mb-px flex gap-1 overflow-x-auto scrollbar-none">
            {TABS.filter(tab => {
              if (tab.id === 'medical' && isBursar) return false;
              if (tab.id === 'finances' && isTeacher) return false;
              return true;
            }).map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-all ${active ? 'border-violet-500 text-violet-400' : 'border-transparent hover:text-violet-400'}`}
                  style={{ color: active ? undefined : 'var(--text-secondary)' }}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {loadingTab && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
          </div>
        )}

        {!loadingTab && (
          <>
            {/* ══════════════════════════════════════════════════════════════════
                TAB: OVERVIEW
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Quick stats */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Attendance" value={attPct !== null ? `${attPct}%` : '—'} color="bg-blue-500/10 border border-blue-500/20 text-blue-400" icon={Calendar} />
                    <StatCard label="Avg Score" value={avgScore !== null ? avgScore : '—'} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" icon={TrendingUp} />
                    <StatCard label="Outstanding" value={outstanding > 0 ? `₦${(outstanding/1000).toFixed(0)}K` : '₦0'} color={outstanding > 0 ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-slate-500/10 border border-slate-500/20 text-slate-400"} icon={DollarSign} />
                    <StatCard label="Behaviour Logs" value={student.behaviourLogs?.length || 0} color="bg-violet-500/10 border border-violet-500/20 text-violet-400" icon={Shield} />
                  </div>

                  {/* Recent scores summary */}
                  <SectionCard title="Recent Academic Scores">
                    {student.scores?.length > 0 ? (
                      <div className="space-y-2">
                        {student.scores.slice(0, 6).map((s: any) => (
                          <div key={s.id} className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                            <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.subject?.name}</span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.term?.name}</span>
                            <span className={`text-sm font-semibold w-10 text-right ${(s.total || 0) >= 70 ? 'text-emerald-400' : (s.total || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{s.total ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--text-secondary)' }}>No scores recorded yet.</p>
                    )}
                  </SectionCard>

                  {/* Recent behaviour */}
                  <SectionCard title="Recent Behaviour Logs" action={
                    <button onClick={() => setLogBehaviourModal(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 text-white">
                      <Plus className="w-3 h-3" /> Log
                    </button>
                  }>
                    {student.behaviourLogs?.length > 0 ? (
                      <div className="space-y-2">
                        {student.behaviourLogs.slice(0, 4).map((log: any) => {
                          const cfg = BEHAVIOUR_CONFIG[log.category] || BEHAVIOUR_CONFIG.POSITIVE;
                          return (
                            <div key={log.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${cfg.bg}`}>
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{log.category}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{log.description}</p>
                              </div>
                              <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--text-secondary)' }}>No behaviour logs.</p>
                    )}
                  </SectionCard>
                </div>

                {/* Right: Student card summary */}
                <div className="space-y-4">
                  <SectionCard title="Student Details">
                    <InfoRow label="Gender" value={student.gender} icon={User} />
                    <InfoRow label="Date of Birth" value={student.dateOfBirth} icon={Calendar} />
                    {student.dateOfBirth && <InfoRow label="Age" value={`${new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()} years`} icon={Clock} />}
                    <InfoRow label="Nationality" value={student.nationality} icon={Globe} />
                    <InfoRow label="State of Origin" value={student.stateOfOrigin} icon={MapPin} />
                    <InfoRow label="Phone" value={student.phone} icon={Phone} />
                    <InfoRow label="Email" value={student.email} icon={Mail} />
                    <InfoRow label="Address" value={student.address} icon={Home} />
                    <InfoRow label="Blood Group" value={student.bloodGroup} icon={Stethoscope} />
                    <InfoRow label="Genotype" value={student.genotype} icon={Stethoscope} />
                  </SectionCard>

                  <SectionCard title="Academic Info">
                    <InfoRow label="Admission Date" value={student.admissionDate} icon={Calendar} />
                    <InfoRow label="Admission Type" value={student.admissionType} icon={GraduationCap} />
                    <InfoRow label="Previous School" value={student.previousSchool} icon={BookOpen} />
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: PERSONAL INFO
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {editMode && isAdmin && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-violet-500/30 bg-violet-500/10">
                    <Edit className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-violet-300 flex-1">Editing mode active. Changes won't be saved until you click "Save Changes".</span>
                    <button onClick={savePersonal} disabled={savingPersonal} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                      {savingPersonal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Changes
                    </button>
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 rounded-lg text-sm border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Biodata */}
                  <SectionCard title="Personal Biodata">
                    {editMode ? (
                      <div className="space-y-4">
                        {[
                          { label: 'First Name', key: 'firstName' },
                          { label: 'Middle Name', key: 'middleName' },
                          { label: 'Last Name', key: 'lastName' },
                          { label: 'Preferred Name', key: 'preferredName' },
                          { label: 'Nationality', key: 'nationality' },
                          { label: 'State of Origin', key: 'stateOfOrigin' },
                          { label: 'LGA', key: 'lga' },
                          { label: 'Religion', key: 'religion' },
                          { label: 'Blood Group', key: 'bloodGroup' },
                          { label: 'Genotype', key: 'genotype' },
                          { label: 'Phone', key: 'phone' },
                          { label: 'Email', key: 'email' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                            <input type="text" value={personalForm[f.key] || ''} onChange={e => setPersonalForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Gender</label>
                          <select value={personalForm.gender || 'MALE'} onChange={e => setPersonalForm((p: any) => ({ ...p, gender: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
                          <input type="date" value={personalForm.dateOfBirth || ''} onChange={e => setPersonalForm((p: any) => ({ ...p, dateOfBirth: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <InfoRow label="First Name" value={student.firstName} />
                        <InfoRow label="Middle Name" value={student.middleName} />
                        <InfoRow label="Last Name" value={student.lastName} />
                        <InfoRow label="Preferred Name" value={student.preferredName} />
                        <InfoRow label="Gender" value={student.gender} />
                        <InfoRow label="Date of Birth" value={student.dateOfBirth} />
                        {student.dateOfBirth && <InfoRow label="Age" value={`${new Date().getFullYear() - new Date(student.dateOfBirth).getFullYear()} years`} />}
                        <InfoRow label="Nationality" value={student.nationality} />
                        <InfoRow label="State of Origin" value={student.stateOfOrigin} />
                        <InfoRow label="LGA" value={student.lga} />
                        <InfoRow label="Religion" value={student.religion} />
                        <InfoRow label="Blood Group" value={student.bloodGroup} />
                        <InfoRow label="Genotype" value={student.genotype} />
                        <InfoRow label="Phone" value={student.phone} />
                        <InfoRow label="Email" value={student.email} />
                      </>
                    )}
                  </SectionCard>

                  {/* Address */}
                  <SectionCard title="Address & Contact">
                    {editMode ? (
                      <div className="space-y-4">
                        {[
                          { label: 'Residential Address', key: 'address' },
                          { label: 'Town', key: 'town' },
                          { label: 'State', key: 'state' },
                          { label: 'Country', key: 'country' },
                          { label: 'Languages Spoken (comma separated)', key: 'languages' },
                          { label: 'Student Notes', key: 'studentNotes' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                            {f.key === 'studentNotes' || f.key === 'languages'
                              ? <textarea value={personalForm[f.key] || ''} onChange={e => setPersonalForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                  rows={2} className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                              : <input type="text" value={personalForm[f.key] || ''} onChange={e => setPersonalForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <InfoRow label="Address" value={student.address} icon={Home} />
                        <InfoRow label="Town" value={student.town} />
                        <InfoRow label="State" value={student.state} />
                        <InfoRow label="Country" value={student.country} icon={Globe} />
                        <InfoRow label="Languages" value={student.languages} />
                        {student.studentNotes && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <p className="text-xs font-medium text-amber-400 mb-1">Student Notes</p>
                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{student.studentNotes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </SectionCard>
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: ACADEMIC INFO
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'academic' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectionCard title="Enrolment Information">
                  <InfoRow label="Admission Number" value={student.admissionNumber} />
                  <InfoRow label="Admission Date" value={student.admissionDate} icon={Calendar} />
                  <InfoRow label="Admission Type" value={student.admissionType} />
                  <InfoRow label="Current Class" value={student.class?.name} icon={BookOpen} />
                  <InfoRow label="Current Arm" value={student.arm?.name} />
                  <InfoRow label="House" value={student.house} icon={Star} />
                  <InfoRow label="Category" value={student.category === 'DAY' ? 'Day Student' : student.category === 'BOARDING' ? 'Boarding Student' : null} />
                  <InfoRow label="Status" value={STATUS_CONFIG[student.status]?.label} />
                  <InfoRow label="Current Session" value={currentSession?.name} />
                  <InfoRow label="Current Term" value={currentTerm?.name} />
                </SectionCard>

                <SectionCard title="History & Transfers">
                  <InfoRow label="Previous School" value={student.previousSchool} icon={BookOpen} />
                  <InfoRow label="Transfer Date" value={student.transferDate} icon={Calendar} />
                  <InfoRow label="Transfer Destination" value={student.transferDestination} />
                  <InfoRow label="Graduation Date" value={student.graduationDate} icon={GraduationCap} />
                  {student.promotions?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>PROMOTION HISTORY</p>
                      <div className="space-y-2">
                        {student.promotions.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-2 text-xs p-2 rounded-lg border" style={{ borderColor: 'var(--border-color)' }}>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${p.status === 'PROMOTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{p.status}</span>
                            <span style={{ color: 'var(--text-secondary)' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: GUARDIANS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'guardians' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{guardians.length} guardian{guardians.length !== 1 ? 's' : ''} on record</p>
                  {isAdmin && (
                    <button onClick={() => setGuardianModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white">
                      <Plus className="w-4 h-4" /> Add Guardian
                    </button>
                  )}
                </div>
                {guardians.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No guardians registered</p>
                    <p className="text-sm mt-1 opacity-60" style={{ color: 'var(--text-secondary)' }}>Add father, mother, or guardian information.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {guardians.map(g => (
                      <div key={g.id} className="rounded-2xl border p-5 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar photo={g.photo} name={`${g.firstName} ${g.lastName}`} size="md" />
                            <div>
                              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{g.firstName} {g.lastName}</p>
                              <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{g.relationship}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {g.isPrimary && <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">Primary</span>}
                            {g.isEmergencyContact && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Emergency</span>}
                            {isAdmin && <button onClick={() => deleteGuardian(g.id)} className="p-1 rounded hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }}><X className="w-3.5 h-3.5" /></button>}
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          {g.phone && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3.5 h-3.5 flex-shrink-0" />{g.phone}</div>}
                          {g.email && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3.5 h-3.5 flex-shrink-0" />{g.email}</div>}
                          {g.occupation && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><Briefcase className="w-3.5 h-3.5 flex-shrink-0" />{g.occupation}{g.employer ? ` · ${g.employer}` : ''}</div>}
                          {g.address && <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{g.address}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: MEDICAL
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'medical' && !isBursar && (
              <div className="space-y-6">
                {medical?._redacted && (
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm">
                    <Shield className="w-4 h-4" />
                    You are viewing a redacted summary. Full medical records are restricted to admin staff.
                  </div>
                )}
                {isAdmin && (
                  <div className="flex justify-end">
                    <button onClick={saveMedical} disabled={savingMedical} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                      {savingMedical ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Medical Record
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectionCard title="Health Summary">
                    {(['bloodGroup', 'genotype', 'allergies', 'conditions', 'medications', 'disabilities', 'specialNeeds', 'emergencyNotes'] as const).map(key => (
                      <div key={key} className="mb-4">
                        <label className="block text-xs font-medium mb-1.5 capitalize" style={{ color: 'var(--text-secondary)' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                        {isAdmin && !medical?._redacted
                          ? <input type="text" value={medicalForm[key] || ''} onChange={e => setMedicalForm((p: any) => ({ ...p, [key]: e.target.value }))}
                              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                              style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                          : <p className="text-sm py-1.5" style={{ color: medical?.[key] ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{medical?.[key] || '—'}</p>}
                      </div>
                    ))}
                    {isAdmin && !medical?._redacted && (
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        {[
                          { label: 'Visual Impairment', key: 'visualImpairment' },
                          { label: 'Hearing Impairment', key: 'hearingImpairment' },
                        ].map(f => (
                          <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={medicalForm[f.key] || false} onChange={e => setMedicalForm((p: any) => ({ ...p, [f.key]: e.target.checked }))} className="accent-violet-500" />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </SectionCard>

                  {isAdmin && !medical?._redacted && (
                    <SectionCard title="Medical Contact">
                      {(['doctorName', 'hospital', 'hospitalContact', 'insurance'] as const).map(key => (
                        <div key={key} className="mb-4">
                          <label className="block text-xs font-medium mb-1.5 capitalize" style={{ color: 'var(--text-secondary)' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                          <input type="text" value={medicalForm[key] || ''} onChange={e => setMedicalForm((p: any) => ({ ...p, [key]: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                            style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                        </div>
                      ))}
                    </SectionCard>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: ATTENDANCE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'attendance' && (
              <div className="space-y-6">
                {attendance ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <StatCard label="Days Present" value={attendance.summary.totalPresent} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" icon={CheckCircle} />
                      <StatCard label="Days Absent" value={attendance.summary.totalAbsent} color="bg-red-500/10 border border-red-500/20 text-red-400" icon={XCircle} />
                      <StatCard label="Total Days" value={attendance.summary.totalDays} color="bg-blue-500/10 border border-blue-500/20 text-blue-400" icon={Calendar} />
                      <StatCard label="Attendance %" value={`${attendance.summary.attendancePct}%`} color={attendance.summary.attendancePct >= 75 ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"} icon={TrendingUp} />
                    </div>

                    {/* Term breakdown */}
                    <SectionCard title="Attendance by Term">
                      <div className="space-y-2">
                        {attendance.byTerm.map((t: any) => {
                          const total = t.daysPresent + t.daysAbsent;
                          const pct = total > 0 ? Math.round((t.daysPresent / total) * 100) : 0;
                          return (
                            <div key={t.id} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.term?.session?.name} — {t.term?.name}</span>
                                  <span className={`text-sm font-semibold ${pct >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>{pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                                <div className="flex gap-4 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  <span>Present: {t.daysPresent}</span>
                                  <span>Absent: {t.daysAbsent}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>

                    {/* Daily heatmap (last 90 days) */}
                    {attendance.dailyLogs?.length > 0 && (
                      <SectionCard title="Daily Attendance (Last 90 Days)">
                        <div className="flex flex-wrap gap-1">
                          {attendance.dailyLogs.map((d: any) => (
                            <div key={d.id} title={`${d.attendanceDate}: ${d.status}`}
                              className={`w-4 h-4 rounded-sm ${d.status === 'PRESENT' ? 'bg-emerald-500' : 'bg-red-500'} opacity-80`} />
                          ))}
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Present</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-red-500" /> Absent</div>
                        </div>
                      </SectionCard>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No attendance data available.</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: PERFORMANCE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'performance' && (
              <div className="space-y-6">
                {performance ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {performance.bestSubject && <StatCard label="Best Subject" value={performance.bestSubject.name} sub={`Avg: ${performance.bestSubject.avg}`} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" icon={Star} />}
                      {performance.worstSubject && <StatCard label="Needs Work" value={performance.worstSubject.name} sub={`Avg: ${performance.worstSubject.avg}`} color="bg-red-500/10 border border-red-500/20 text-red-400" icon={TrendingDown} />}
                      <StatCard label="Subjects Recorded" value={performance.subjectAverages.length} color="bg-violet-500/10 border border-violet-500/20 text-violet-400" icon={BookOpen} />
                    </div>

                    {/* Performance trend chart */}
                    {performance.byTerm?.length > 0 && (
                      <SectionCard title="Average Score — Term Trend">
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={performance.byTerm}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="termName" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                            <Line type="monotone" dataKey="avg" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 4 }} name="Average" />
                          </LineChart>
                        </ResponsiveContainer>
                      </SectionCard>
                    )}

                    {/* Subject averages */}
                    {performance.subjectAverages?.length > 0 && (
                      <SectionCard title="Subject Performance Comparison">
                        <ResponsiveContainer width="100%" height={Math.max(180, performance.subjectAverages.length * 35)}>
                          <BarChart data={performance.subjectAverages} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={110} />
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                            <Bar dataKey="avg" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Average" />
                          </BarChart>
                        </ResponsiveContainer>
                      </SectionCard>
                    )}

                    {/* Raw scores table */}
                    <SectionCard title="Score Details">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                              {['Subject', 'Term', 'CA1', 'CA2', 'Assignment', 'Exam', 'Total', 'Grade'].map(h => (
                                <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {performance.scores.map((s: any) => (
                              <tr key={s.id} className="border-b hover:bg-violet-500/5" style={{ borderColor: 'var(--border-color)' }}>
                                <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>{s.subject?.name}</td>
                                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.term?.session?.name} · {s.term?.name}</td>
                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{s.ca1 ?? '—'}</td>
                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{s.ca2 ?? '—'}</td>
                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{s.assignment ?? '—'}</td>
                                <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{s.exam ?? '—'}</td>
                                <td className="px-3 py-2">
                                  <span className={`font-bold ${(s.total || 0) >= 70 ? 'text-emerald-400' : (s.total || 0) >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{s.total ?? '—'}</span>
                                </td>
                                <td className="px-3 py-2"><span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{s.grade || '—'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </SectionCard>
                  </>
                ) : (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No academic scores recorded yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: BEHAVIOUR
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'behaviour' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{behaviour.length} log{behaviour.length !== 1 ? 's' : ''} recorded</p>
                  <button onClick={() => setLogBehaviourModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white">
                    <Plus className="w-4 h-4" /> Log Behaviour
                  </button>
                </div>
                {behaviour.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No behaviour logs yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {behaviour.map((log: any) => {
                      const cfg = BEHAVIOUR_CONFIG[log.category] || BEHAVIOUR_CONFIG.POSITIVE;
                      const sev = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
                      return (
                        <div key={log.id} className={`rounded-2xl border p-4 ${cfg.bg}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{log.category}</span>
                                <span className={`text-xs font-medium ${sev.color}`}>{sev.label}</span>
                              </div>
                              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                              {log.description && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{log.description}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: FINANCES
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'finances' && !isTeacher && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Total Invoiced" value={`₦${student.invoices?.reduce((s: number, i: any) => s + i.netAmount, 0).toLocaleString() || 0}`} color="bg-blue-500/10 border border-blue-500/20 text-blue-400" icon={FileText} />
                  <StatCard label="Total Paid" value={`₦${student.studentPayments?.reduce((s: number, p: any) => s + p.amount, 0).toLocaleString() || 0}`} color="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" icon={CheckCircle} />
                  <StatCard label="Outstanding" value={`₦${outstanding.toLocaleString()}`} color={outstanding > 0 ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-slate-500/10 border border-slate-500/20 text-slate-400"} icon={AlertTriangle} />
                  <StatCard label="Scholarships" value={student.scholarshipType !== 'NONE' ? student.scholarshipType || '—' : 'None'} color="bg-violet-500/10 border border-violet-500/20 text-violet-400" icon={Award} />
                </div>

                {/* Invoices */}
                <SectionCard title="Invoices">
                  {student.invoices?.length > 0 ? (
                    <div className="space-y-2">
                      {student.invoices.filter((i: any) => !i.deletedAt).map((inv: any) => (
                        <div key={inv.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{inv.invoiceNumber}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(inv.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>₦{inv.netAmount.toLocaleString()}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : inv.status === 'PARTIALLY_PAID' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{inv.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--text-secondary)' }}>No invoices yet.</p>
                  )}
                </SectionCard>

                {/* Payments */}
                <SectionCard title="Payment History">
                  {student.studentPayments?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                            {['Receipt No', 'Amount', 'Method', 'Date', 'Status'].map(h => (
                              <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {student.studentPayments.filter((p: any) => !p.deletedAt).map((pay: any) => (
                            <tr key={pay.id} className="border-b hover:bg-violet-500/5" style={{ borderColor: 'var(--border-color)' }}>
                              <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{pay.receiptNumber}</td>
                              <td className="px-3 py-2 font-semibold" style={{ color: 'var(--text-primary)' }}>₦{pay.amount.toLocaleString()}</td>
                              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{pay.paymentMethod}</td>
                              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                              <td className="px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${pay.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{pay.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-center py-4 opacity-50" style={{ color: 'var(--text-secondary)' }}>No payments recorded.</p>
                  )}
                </SectionCard>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: DOCUMENTS
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
                  {isAdmin && (
                    <button onClick={() => setDocModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white">
                      <Upload className="w-4 h-4" /> Upload Document
                    </button>
                  )}
                </div>
                {documents.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <Paperclip className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No documents uploaded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                      <div key={doc.id} className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{doc.name}</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{doc.documentType.replace(/_/g, ' ')} · v{doc.version}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Clock className="w-3 h-3" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex gap-2">
                          {doc.url?.startsWith('data:') ? (
                            <a href={doc.url} download={doc.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border hover:border-violet-500/40 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                              <Download className="w-3 h-3" /> Download
                            </a>
                          ) : (
                            <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border hover:border-violet-500/40 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                              <Eye className="w-3 h-3" /> View
                            </a>
                          )}
                          {isAdmin && (
                            <button onClick={async () => {
                              await fetch(`/api/students/${studentId}/documents?docId=${doc.id}`, { method: 'DELETE' });
                              setDocuments(prev => prev.filter(d => d.id !== doc.id));
                            }} className="p-1.5 rounded-lg border hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: COMMUNICATION
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'communication' && (
              <div className="space-y-4">
                {student.chatConversations?.length > 0 ? (
                  student.chatConversations.map((conv: any) => (
                    <div key={conv.id} className="rounded-2xl border p-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{conv.subject}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{conv.category}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${conv.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : conv.status === 'RESOLVED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>{conv.status}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Last activity: {new Date(conv.lastActivity).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No communication history.</p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TAB: TIMELINE
            ══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'timeline' && (
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-primary)' }}>No timeline events yet.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-violet-500/20" />
                    <div className="space-y-4">
                      {timeline.map((event: any, idx) => (
                        <div key={event.id} className="relative flex gap-4 pl-12">
                          <div className="absolute left-3 w-4 h-4 rounded-full bg-violet-600 border-2 border-violet-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
                              </div>
                              <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>{new Date(event.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{event.eventType}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          GUARDIAN MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {guardianModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Add Guardian</h2>
              <button onClick={() => setGuardianModal(false)} style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'First Name *', key: 'firstName' }, { label: 'Last Name *', key: 'lastName' }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                    <input type="text" value={guardianForm[f.key]} onChange={e => setGuardianForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Relationship</label>
                <select value={guardianForm.relationship} onChange={e => setGuardianForm((p: any) => ({ ...p, relationship: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                  {['FATHER', 'MOTHER', 'GUARDIAN', 'EMERGENCY'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {[{ label: 'Phone *', key: 'phone', type: 'tel' }, { label: 'Email', key: 'email', type: 'email' }, { label: 'Occupation', key: 'occupation', type: 'text' }, { label: 'Employer', key: 'employer', type: 'text' }, { label: 'Address', key: 'address', type: 'text' }].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                  <input type={f.type} value={guardianForm[f.key] || ''} onChange={e => setGuardianForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              ))}
              <div className="flex flex-wrap gap-4">
                {[{ label: 'Primary Guardian', key: 'isPrimary' }, { label: 'Emergency Contact', key: 'isEmergencyContact' }, { label: 'Billing Contact', key: 'isBillingContact' }].map(f => (
                  <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={guardianForm[f.key] || false} onChange={e => setGuardianForm((p: any) => ({ ...p, [f.key]: e.target.checked }))} className="accent-violet-500" />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => setGuardianModal(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={saveGuardian} disabled={savingGuardian} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                {savingGuardian ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Guardian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          LOG BEHAVIOUR MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {logBehaviourModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Log Behaviour</h2>
              <button onClick={() => setLogBehaviourModal(false)} style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Category</label>
                  <select value={behaviourForm.category} onChange={e => setBehaviourForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    {Object.keys(BEHAVIOUR_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Severity</label>
                  <select value={behaviourForm.severity} onChange={e => setBehaviourForm(p => ({ ...p, severity: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                    {Object.entries(SEVERITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title *</label>
                <input type="text" value={behaviourForm.title} onChange={e => setBehaviourForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Excellent classroom participation"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea value={behaviourForm.description} onChange={e => setBehaviourForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => setLogBehaviourModal(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={logBehaviour} disabled={savingBehaviour} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                {savingBehaviour ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          UPLOAD DOCUMENT MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {docModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl border shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Upload Document</h2>
              <button onClick={() => setDocModal(false)} style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Document Type</label>
                <select value={docForm.documentType} onChange={e => setDocForm(p => ({ ...p, documentType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Document Name</label>
                <input type="text" value={docForm.name} onChange={e => setDocForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Birth Certificate 2024"
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div className="border-2 border-dashed rounded-xl p-4 text-center" style={{ borderColor: 'var(--border-color)' }}>
                <Upload className="w-6 h-6 mx-auto mb-2 opacity-40" style={{ color: 'var(--text-secondary)' }} />
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Upload PDF, image, or document</p>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleDocFile} className="text-xs" style={{ color: 'var(--text-secondary)' }} />
              </div>
              {docForm.url && <p className="text-xs text-emerald-400">✓ File loaded</p>}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => setDocModal(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={uploadDoc} disabled={uploadingDoc} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50">
                {uploadingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
