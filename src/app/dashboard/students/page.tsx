'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, UserPlus, Search, GraduationCap, Archive, Trash2, RefreshCw, X,
  AlertCircle, Edit, ArrowRightLeft, FileSpreadsheet, UploadCloud, FileUp,
  CheckCircle, Eye, Loader2, LayoutGrid, List, Filter, SortAsc, SortDesc,
  Download, ChevronLeft, ChevronRight, MoreHorizontal, Activity, DollarSign,
  Award, BookOpen, Calendar, Phone, Mail, MapPin, User, Shield, AlertTriangle,
  Clock, TrendingUp, TrendingDown, Star, XCircle, CheckSquare, Square
} from 'lucide-react';
import * as XLSX from 'xlsx';

type ViewMode = 'card' | 'table';
type SortField = 'name' | 'admissionNumber' | 'class' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ACTIVE:      { label: 'Active',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  GRADUATED:   { label: 'Graduated',   color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20',       dot: 'bg-blue-400'    },
  TRANSFERRED: { label: 'Transferred', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     dot: 'bg-amber-400'   },
  WITHDRAWN:   { label: 'Withdrawn',   color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',   dot: 'bg-orange-400'  },
  SUSPENDED:   { label: 'Suspended',   color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         dot: 'bg-red-400'     },
  ARCHIVED:    { label: 'Archived',    color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     dot: 'bg-slate-400'   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.ACTIVE;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Avatar({ photo, name, size = 'md' }: { photo?: string | null; name: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' };
  const initials = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const colors = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (photo) {
    return <img src={photo} alt={name} className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
}

function StatPill({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${color} text-xs`}>
      <Icon className="w-3 h-3 opacity-80" />
      <span className="opacity-70">{label}:</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

export default function StudentsDirectoryPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // View & sort
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterArm, setFilterArm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [filterHouse, setFilterHouse] = useState('');
  const [filterCategory, setFilterCategory] = useState(''); // DAY, BOARDING
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'card' ? 12 : 25;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [excelOpen, setExcelOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [confirmWipeText, setConfirmWipeText] = useState('');
  const [clearing, setClearing] = useState(false);

  // Upload state
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    isDanger: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
    isDanger: false,
  });

  // Create form
  const [form, setForm] = useState({
    firstName: '', lastName: '', middleName: '', admissionNumber: '',
    gender: 'MALE', classId: '', armId: '', dateOfBirth: '',
    passportPhoto: null as string | null, category: '', house: '',
    phone: '', email: '', admissionDate: '', admissionType: 'NEW',
  });

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 6000); };

  useEffect(() => {
    const raw = localStorage.getItem('report_user_session');
    if (!raw) { window.location.href = '/login'; return; }
    try {
      const parsed = JSON.parse(raw);
      if (['PARENT', 'STUDENT'].includes(parsed.user?.role)) { window.location.href = '/dashboard'; return; }
      setSession(parsed);
      loadAll(parsed);
    } catch { showError('Invalid session'); }
  }, []);

  const loadAll = async (sess: any) => {
    setLoading(true);
    try {
      const [setupRes, studRes] = await Promise.all([
        fetch(`/api/setup?schoolId=${sess.school.id}`),
        fetch(`/api/students?schoolId=${sess.school.id}&status=ALL`),
      ]);
      const [setupJson, studJson] = await Promise.all([setupRes.json(), studRes.json()]);
      setSetup(setupJson.data);
      setStudents(studJson.data || []);

      // Auto-filter for class teachers
      if (sess.user?.role === 'CLASS_TEACHER') {
        const arm = setupJson.data?.arms?.find((a: any) => a.classTeacherId === sess.user.id);
        if (arm) { setFilterClass(arm.classId); setFilterArm(arm.id); }
      }
    } catch { showError('Failed to load data'); }
    setLoading(false);
  };

  // ── Filtered & Sorted Data ──────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    let data = [...students];

    if (filterStatus !== 'ALL') data = data.filter(s => s.status === filterStatus);
    if (filterClass) data = data.filter(s => s.classId === filterClass);
    if (filterArm) data = data.filter(s => s.armId === filterArm);
    if (filterHouse) data = data.filter(s => s.house === filterHouse);
    if (filterCategory) data = data.filter(s => s.category === filterCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(s =>
        `${s.firstName} ${s.lastName} ${s.middleName || ''}`.toLowerCase().includes(q) ||
        s.admissionNumber?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      let va: string | number = '', vb: string | number = '';
      if (sortField === 'name') { va = `${a.lastName}${a.firstName}`; vb = `${b.lastName}${b.firstName}`; }
      else if (sortField === 'admissionNumber') { va = a.admissionNumber || ''; vb = b.admissionNumber || ''; }
      else if (sortField === 'class') { va = a.class?.name || ''; vb = b.class?.name || ''; }
      else if (sortField === 'status') { va = a.status; vb = b.status; }
      else if (sortField === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [students, filterStatus, filterClass, filterArm, filterHouse, filterCategory, searchQuery, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const pagedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); setSelectedIds([]); }, [filterClass, filterArm, filterStatus, filterHouse, filterCategory, searchQuery, viewMode]);

  // ── Sort toggle ─────────────────────────────────────────────────────────────
  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Bulk selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(pagedStudents.map(s => s.id));
  const clearSelection = () => setSelectedIds([]);
  const isAllSelected = pagedStudents.length > 0 && pagedStudents.every(s => selectedIds.includes(s.id));

  // ── Export ──────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const toExport = selectedIds.length > 0 ? students.filter(s => selectedIds.includes(s.id)) : filteredStudents;
    const rows = toExport.map(s => ({
      'Admission No': s.admissionNumber,
      'First Name': s.firstName,
      'Last Name': s.lastName,
      'Middle Name': s.middleName || '',
      'Gender': s.gender,
      'Date of Birth': s.dateOfBirth || '',
      'Class': s.class?.name || '',
      'Arm': s.arm?.name || '',
      'Status': s.status,
      'House': s.house || '',
      'Category': s.category || '',
      'Phone': s.phone || '',
      'Email': s.email || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Create Student ──────────────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, passportPhoto: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.admissionNumber || !form.classId || !form.armId) {
      showError('First name, last name, admission number, class and arm are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, schoolId: session.school.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create student');
      showSuccess(`Student registered: ${form.firstName} ${form.lastName} (${form.admissionNumber})`);
      setCreateOpen(false);
      setForm({ firstName: '', lastName: '', middleName: '', admissionNumber: '', gender: 'MALE', classId: '', armId: '', dateOfBirth: '', passportPhoto: null, category: '', house: '', phone: '', email: '', admissionDate: '', admissionType: 'NEW' });
      await loadAll(session);
    } catch (e: any) { showError(e.message); }
    setSubmitting(false);
  };

  // ── Archive Single Student ──────────────────────────────────────────────────
  const archiveStudent = async (student: any) => {
    setConfirmModal({
      isOpen: true,
      title: "Archive Student Profile",
      message: `Are you sure you want to archive ${student.firstName} ${student.lastName}? They will be marked as inactive.`,
      confirmText: "Archive Profile",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: student.id, status: 'ARCHIVED' }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to archive');
          showSuccess(`${student.firstName} ${student.lastName} archived.`);
          await loadAll(session);
        } catch (e: any) { showError(e.message); }
      }
    });
  };

  // ── Batch Delete Students ─────────────────────────────────────────────────
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Selected Students",
      message: `WARNING: Are you sure you want to completely DELETE the ${selectedIds.length} selected student profile${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone!`,
      confirmText: "Delete Selected",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch(`/api/students?ids=${selectedIds.join(',')}`, {
            method: 'DELETE',
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to delete selected students');
          showSuccess(`Successfully deleted ${selectedIds.length} student profile${selectedIds.length !== 1 ? 's' : ''}.`);
          clearSelection();
          await loadAll(session);
        } catch (e: any) {
          showError(e.message || 'Error deleting selected students.');
        }
      }
    });
  };

  // ── Batch Archive Students ────────────────────────────────────────────────
  const handleBatchArchive = async () => {
    if (selectedIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Archive Selected Students",
      message: `Are you sure you want to archive the ${selectedIds.length} selected student${selectedIds.length !== 1 ? 's' : ''}? They will be marked as inactive.`,
      confirmText: "Archive Selected",
      cancelText: "Cancel",
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const res = await fetch('/api/students', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds, status: 'ARCHIVED' })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Failed to archive selected students');
          showSuccess(`Successfully archived ${selectedIds.length} student${selectedIds.length !== 1 ? 's' : ''}.`);
          clearSelection();
          await loadAll(session);
        } catch (e: any) {
          showError(e.message || 'Error archiving selected students.');
        }
      }
    });
  };

  // ── Download Excel Template ──────────────────────────────────────────────────
  const downloadStudentTemplate = () => {
    const sampleData = [
      {
        'First Name': 'Marilyn',
        'Middle Name': 'Charlotte',
        'Last Name': 'Kalba',
        'Preferred Name': 'Mari',
        'Admission No': '26001',
        'Gender': 'FEMALE',
        'Date of Birth': '2015-06-14',
        'Class': 'Primary 1',
        'Arm': 'A',
        'Category': 'DAY',
        'House': 'Blue House',
        'Nationality': 'Nigerian',
        'State of Origin': 'Nasarawa',
        'LGA': 'Karu',
        'Religion': 'Christianity',
        'Blood Group': 'O+',
        'Genotype': 'AA',
        'Address': '12 Hospital Road',
        'Town': 'Daura',
        'State': 'Nasarawa',
        'Country': 'Nigeria',
        'Phone': '+2348012345678',
        'Email': 'marilyn.kalba@example.com',
        'Languages Spoken': 'English, Hausa',
        'Student Notes': 'Enjoys mathematics and art',
        'Admission Date': '2024-09-10',
        'Admission Type': 'NEW',
        'Previous School': 'Model Primary School',
        'Guardian First Name': 'Charles',
        'Guardian Last Name': 'Kalba',
        'Guardian Relationship': 'FATHER',
        'Guardian Phone': '+2348033334444',
        'Guardian Email': 'charles.kalba@example.com',
        'Guardian Date of Birth': '1978-08-14',
        'Guardian Occupation': 'Civil Engineer',
        'Guardian Address': '12 Hospital Road, Daura',
        'Allergies': 'Peanuts',
        'Chronic Illnesses': 'Asthma',
        'Disabilities': 'None',
        'Emergency Instructions': 'Keep inhaler in school clinic',
        'Medical Notes': 'Requires reading glasses',
        'Immunization Status': 'Fully Vaccinated',
      },
      {
        'First Name': 'David',
        'Middle Name': 'Oluwaseun',
        'Last Name': 'Adeyemi',
        'Preferred Name': 'Dave',
        'Admission No': '26002',
        'Gender': 'MALE',
        'Date of Birth': '2014-11-20',
        'Class': 'Primary 2',
        'Arm': 'B',
        'Category': 'BOARDING',
        'House': 'Red House',
        'Nationality': 'Nigerian',
        'State of Origin': 'Ogun',
        'LGA': 'Abeokuta South',
        'Religion': 'Christianity',
        'Blood Group': 'A+',
        'Genotype': 'AS',
        'Address': '45 Crescent Way',
        'Town': 'Abeokuta',
        'State': 'Ogun',
        'Country': 'Nigeria',
        'Phone': '+2348098765432',
        'Email': 'david.adeyemi@example.com',
        'Languages Spoken': 'English, Yoruba',
        'Student Notes': 'School football team captain',
        'Admission Date': '2023-09-12',
        'Admission Type': 'TRANSFER',
        'Previous School': 'St. Nicholas Primary',
        'Guardian First Name': 'Grace',
        'Guardian Last Name': 'Adeyemi',
        'Guardian Relationship': 'MOTHER',
        'Guardian Phone': '+2348022221111',
        'Guardian Email': 'grace.adeyemi@example.com',
        'Guardian Date of Birth': '1982-12-05',
        'Guardian Occupation': 'Accountant',
        'Guardian Address': '45 Crescent Way, Abeokuta',
        'Allergies': 'None',
        'Chronic Illnesses': 'None',
        'Disabilities': 'None',
        'Emergency Instructions': 'Contact mother immediately',
        'Medical Notes': 'No special medical conditions',
        'Immunization Status': 'Fully Vaccinated',
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comprehensive_Student_Template');
    XLSX.writeFile(wb, 'Comprehensive_Student_Import_Template.xlsx');
  };

  // ── Excel Upload ────────────────────────────────────────────────────────────
  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setParsedStudents(rows.map(r => ({
        // Personal & Academic
        firstName: r['First Name'] || r['firstName'] || '',
        lastName: r['Last Name'] || r['lastName'] || '',
        middleName: r['Middle Name'] || r['middleName'] || '',
        preferredName: r['Preferred Name'] || r['preferredName'] || '',
        admissionNumber: String(r['Admission No'] || r['Admission Number'] || r['admissionNumber'] || '').trim(),
        gender: String(r['Gender'] || r['gender'] || 'MALE').toUpperCase(),
        dateOfBirth: r['Date of Birth'] || r['dateOfBirth'] || '',
        className: r['Class'] || r['class'] || '',
        armName: r['Arm'] || r['arm'] || '',
        category: r['Category'] || r['category'] || '',
        house: r['House'] || r['house'] || '',
        nationality: r['Nationality'] || r['nationality'] || '',
        stateOfOrigin: r['State of Origin'] || r['stateOfOrigin'] || '',
        lga: r['LGA'] || r['lga'] || '',
        religion: r['Religion'] || r['religion'] || '',
        bloodGroup: r['Blood Group'] || r['bloodGroup'] || '',
        genotype: r['Genotype'] || r['genotype'] || '',
        address: r['Address'] || r['address'] || '',
        town: r['Town'] || r['town'] || '',
        state: r['State'] || r['state'] || '',
        country: r['Country'] || r['country'] || '',
        phone: r['Phone'] || r['phone'] || '',
        email: r['Email'] || r['email'] || '',
        languages: r['Languages Spoken'] || r['languages'] || '',
        studentNotes: r['Student Notes'] || r['studentNotes'] || '',
        admissionDate: r['Admission Date'] || r['admissionDate'] || '',
        admissionType: r['Admission Type'] || r['admissionType'] || '',
        previousSchool: r['Previous School'] || r['previousSchool'] || '',

        // Guardian Information
        guardianFirstName: r['Guardian First Name'] || r['guardianFirstName'] || '',
        guardianLastName: r['Guardian Last Name'] || r['guardianLastName'] || '',
        guardianRelationship: r['Guardian Relationship'] || r['guardianRelationship'] || 'GUARDIAN',
        guardianPhone: r['Guardian Phone'] || r['guardianPhone'] || '',
        guardianEmail: r['Guardian Email'] || r['guardianEmail'] || '',
        guardianDateOfBirth: r['Guardian Date of Birth'] || r['Guardian DOB'] || r['guardianDateOfBirth'] || r['guardianDob'] || '',
        guardianOccupation: r['Guardian Occupation'] || r['guardianOccupation'] || '',
        guardianAddress: r['Guardian Address'] || r['guardianAddress'] || '',

        // Medical Information
        allergies: r['Allergies'] || r['allergies'] || '',
        chronicIllnesses: r['Chronic Illnesses'] || r['chronicIllnesses'] || '',
        disabilities: r['Disabilities'] || r['disabilities'] || '',
        emergencyInstructions: r['Emergency Instructions'] || r['emergencyInstructions'] || '',
        medicalNotes: r['Medical Notes'] || r['medicalNotes'] || '',
        immunizationStatus: r['Immunization Status'] || r['immunizationStatus'] || '',
      })));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkUpload = async () => {
    setUploading(true);
    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: session.school.id, students: parsedStudents }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setUploadResult(json);
      showSuccess(`Bulk upload complete: ${json.created || 0} students imported.`);
      await loadAll(session);
    } catch (e: any) { showError(e.message); }
    setUploading(false);
  };

  // ── Unique houses for filter ─────────────────────────────────────────────────
  const uniqueHouses = useMemo(() => [...new Set(students.map(s => s.house).filter(Boolean))], [students]);

  // ── Arm filter options ───────────────────────────────────────────────────────
  const armOptions = useMemo(() => setup?.arms?.filter((a: any) => !filterClass || a.classId === filterClass) || [], [setup, filterClass]);

  const isAdmin = session?.user?.role && ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER'].includes(session.user.role);
  const isTeacher = session?.user?.role === 'CLASS_TEACHER';

  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading student registry…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Notification Toasts ─────────────────────────────────────────────── */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl px-4 py-3 max-w-sm shadow-xl backdrop-blur-sm animate-in slide-in-from-right-4">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 max-w-sm shadow-xl backdrop-blur-sm animate-in slide-in-from-right-4">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Student Registry</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} found
              {filterStatus !== 'ALL' && ` · ${STATUS_CONFIG[filterStatus]?.label || filterStatus}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button onClick={() => setExcelOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all hover:scale-105" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  <UploadCloud className="w-4 h-4" /> Bulk Import
                </button>
                <button onClick={() => setCreateOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-all hover:scale-105 shadow-lg shadow-violet-500/20">
                  <UserPlus className="w-4 h-4" /> Add Student
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
            const count = students.filter(s => s.status === status).length;
            return (
              <button
                key={status}
                onClick={() => { setFilterStatus(status === filterStatus ? 'ALL' : status); }}
                className={`rounded-xl p-3 border text-left transition-all hover:scale-105 ${filterStatus === status ? `${cfg.bg} ${cfg.color}` : 'hover:border-violet-500/30'}`}
                style={{ borderColor: filterStatus === status ? undefined : 'var(--border-color)', background: filterStatus === status ? undefined : 'var(--bg-card)' }}
              >
                <div className={`text-2xl font-bold ${filterStatus === status ? cfg.color : ''}`} style={{ color: filterStatus === status ? undefined : 'var(--text-primary)' }}>{count}</div>
                <div className={`text-xs mt-0.5 ${filterStatus === status ? cfg.color : ''}`} style={{ color: filterStatus === status ? undefined : 'var(--text-secondary)' }}>{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search by name, admission number, phone, email…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border transition-colors"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          {/* Class filter */}
          <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setFilterArm(''); }}
            className="px-3 py-2.5 rounded-xl text-sm border outline-none min-w-[130px]"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <option value="">All Classes</option>
            {setup?.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {/* Arm filter */}
          <select value={filterArm} onChange={e => setFilterArm(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm border outline-none min-w-[100px]"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
            <option value="">All Arms</option>
            {armOptions.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {/* More filters */}
          <button onClick={() => setShowFilterPanel(p => !p)} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors ${showFilterPanel ? 'bg-violet-600 text-white border-violet-600' : ''}`}
            style={{ borderColor: showFilterPanel ? undefined : 'var(--border-color)', color: showFilterPanel ? undefined : 'var(--text-secondary)', background: showFilterPanel ? undefined : 'var(--bg-card)' }}>
            <Filter className="w-4 h-4" />
            Filters
            {(filterHouse || filterCategory) && <span className="w-2 h-2 rounded-full bg-violet-400" />}
          </button>
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
            <button onClick={() => setViewMode('card')} className={`px-3 py-2.5 transition-colors ${viewMode === 'card' ? 'bg-violet-600 text-white' : ''}`} style={{ background: viewMode === 'card' ? undefined : 'var(--bg-card)', color: viewMode === 'card' ? undefined : 'var(--text-secondary)' }}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-2.5 transition-colors ${viewMode === 'table' ? 'bg-violet-600 text-white' : ''}`} style={{ background: viewMode === 'table' ? undefined : 'var(--bg-card)', color: viewMode === 'table' ? undefined : 'var(--text-secondary)' }}>
              <List className="w-4 h-4" />
            </button>
          </div>
          {/* Export */}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm border transition-colors hover:border-violet-500/50"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* ── Extra Filter Panel ───────────────────────────────────────────────── */}
        {showFilterPanel && (
          <div className="rounded-xl border p-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>House</label>
              <select value={filterHouse} onChange={e => setFilterHouse(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">All Houses</option>
                {uniqueHouses.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                <option value="">All</option>
                <option value="DAY">Day Students</option>
                <option value="BOARDING">Boarding</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterHouse(''); setFilterCategory(''); }} className="px-3 py-2 text-sm rounded-lg border text-red-400 border-red-500/20 hover:bg-red-500/10">
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* ── Bulk Action Bar ──────────────────────────────────────────────────── */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-violet-500/30 bg-violet-500/10 backdrop-blur-sm animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-violet-300">
                Selected <span className="text-white font-black px-0.5">{selectedIds.length}</span> student{selectedIds.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" /> Export Selected
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={handleBatchArchive}
                    className="flex items-center gap-1.5 !bg-blue-600 !border-blue-600 !text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 hover:!bg-blue-500"
                  >
                    <Archive className="w-3.5 h-3.5 !text-white" /> Archive Selected
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    className="flex items-center gap-1.5 !bg-red-600 !border-red-600 !text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 hover:!bg-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5 !text-white" /> Delete Selected
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-600/50 text-slate-300 hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
          </div>
        )}

        {/* ── Student List ─────────────────────────────────────────────────────── */}
        {pagedStudents.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No students found</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or adding a new student.</p>
          </div>
        ) : viewMode === 'card' ? (
          // ── Card Grid ──────────────────────────────────────────────────────
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Select All card */}
            <div className="col-span-full flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <button onClick={isAllSelected ? clearSelection : selectAll} className="flex items-center gap-2 hover:text-violet-400 transition-colors">
                {isAllSelected ? <CheckSquare className="w-4 h-4 text-violet-400" /> : <Square className="w-4 h-4" />}
                {isAllSelected ? 'Deselect page' : 'Select page'}
              </button>
            </div>
            {pagedStudents.map(s => (
              <div key={s.id} className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative ${selectedIds.includes(s.id) ? 'border-violet-500/60 shadow-violet-500/10 shadow-lg' : 'hover:border-violet-500/30'}`}
                style={{ background: 'var(--bg-card)', borderColor: selectedIds.includes(s.id) ? undefined : 'var(--border-color)' }}>
                {/* Select checkbox */}
                <button onClick={e => { e.stopPropagation(); toggleSelect(s.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  {selectedIds.includes(s.id)
                    ? <CheckSquare className="w-4 h-4 text-violet-400" />
                    : <Square className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
                </button>

                {/* Header row */}
                <div className="flex items-start gap-3">
                  <Avatar photo={s.passportPhoto} name={`${s.firstName} ${s.lastName}`} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.firstName} {s.lastName}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.admissionNumber}</p>
                    <div className="mt-1.5"><StatusBadge status={s.status} /></div>
                  </div>
                </div>

                {/* Class / Arm / House */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {s.class?.name} {s.arm?.name}
                  </span>
                  {s.house && <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">{s.house}</span>}
                  {s.category && <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{s.category}</span>}
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-500/10">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span style={{ color: 'var(--text-secondary)' }}>Attendance</span>
                    <span className="ml-auto font-semibold text-slate-300">—</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-500/10">
                    <TrendingUp className="w-3 h-3 text-slate-400" />
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Score</span>
                    <span className="ml-auto font-semibold text-slate-300">—</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <a href={`/dashboard/students/${s.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <Eye className="w-3 h-3" /> View Profile
                  </a>
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); archiveStudent(s); }}
                      className="p-1.5 rounded-lg border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-colors"
                      style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                      title="Archive">
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // ── Table View ─────────────────────────────────────────────────────
          <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                    <th className="w-10 px-4 py-3">
                      <button onClick={isAllSelected ? clearSelection : selectAll}>
                        {isAllSelected ? <CheckSquare className="w-4 h-4 text-violet-400" /> : <Square className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
                      </button>
                    </th>
                    {([
                      { field: 'name', label: 'Student' },
                      { field: 'admissionNumber', label: 'Adm. No' },
                      { field: 'class', label: 'Class' },
                      { field: 'status', label: 'Status' },
                    ] as { field: SortField; label: string }[]).map(col => (
                      <th key={col.field} className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
                        <button className="flex items-center gap-1 hover:text-violet-400 transition-colors" onClick={() => toggleSort(col.field)}>
                          {col.label}
                          {sortField === col.field
                            ? sortDir === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />
                            : <SortAsc className="w-3.5 h-3.5 opacity-30" />}
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>House</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Category</th>
                    <th className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStudents.map((s, idx) => (
                    <tr key={s.id} className={`border-b transition-colors hover:bg-violet-500/5 ${selectedIds.includes(s.id) ? 'bg-violet-500/8' : ''}`}
                      style={{ borderColor: 'var(--border-color)', background: selectedIds.includes(s.id) ? 'rgba(139,92,246,0.08)' : idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-primary)' }}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleSelect(s.id)}>
                          {selectedIds.includes(s.id)
                            ? <CheckSquare className="w-4 h-4 text-violet-400" />
                            : <Square className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar photo={s.passportPhoto} name={`${s.firstName} ${s.lastName}`} size="sm" />
                          <div>
                            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.firstName} {s.lastName}</p>
                            {s.middleName && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.middleName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{s.admissionNumber}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>{s.class?.name} {s.arm?.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.house || '—'}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{s.category || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <a href={`/dashboard/students/${s.id}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                            <Eye className="w-3 h-3" /> View
                          </a>
                          {isAdmin && (
                            <button onClick={() => archiveStudent(s)} className="p-1.5 rounded-lg border hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }} title="Archive">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length}
            </p>
            <div className="flex items-center gap-1">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                className="p-2 rounded-lg border disabled:opacity-40 hover:border-violet-500/40 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let page: number;
                if (totalPages <= 7) page = i + 1;
                else if (currentPage <= 4) page = i + 1;
                else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                else page = currentPage - 3 + i;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm border transition-colors ${currentPage === page ? 'bg-violet-600 text-white border-violet-600' : 'hover:border-violet-500/40'}`}
                    style={{ borderColor: currentPage === page ? undefined : 'var(--border-color)', color: currentPage === page ? undefined : 'var(--text-secondary)' }}>
                    {page}
                  </button>
                );
              })}
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                className="p-2 rounded-lg border disabled:opacity-40 hover:border-violet-500/40 transition-colors"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          CREATE STUDENT MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Register New Student</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Fill in student details to enrol them into the school</p>
              </div>
              <button onClick={() => setCreateOpen(false)} className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ color: 'var(--text-secondary)' }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="overflow-y-auto max-h-[80vh]">
              <div className="p-6 space-y-5">
                {/* Passport photo */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ borderColor: 'var(--border-color)' }}>
                    {form.passportPhoto
                      ? <img src={form.passportPhoto} className="w-full h-full object-cover" alt="passport" />
                      : <User className="w-8 h-8 opacity-30" style={{ color: 'var(--text-secondary)' }} />}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Passport Photo</label>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                </div>

                {/* Name fields */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'First Name *', key: 'firstName' },
                    { label: 'Last Name *', key: 'lastName' },
                    { label: 'Middle Name', key: 'middleName' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>{f.label}</label>
                      <input type="text" value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                        style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                </div>

                {/* Admission & gender */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Admission No. *</label>
                    <input type="text" value={form.admissionNumber} onChange={e => setForm(p => ({ ...p, admissionNumber: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Gender *</label>
                    <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Date of Birth</label>
                    <input type="date" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                </div>

                {/* Class & Arm */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Class *</label>
                    <select value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value, armId: '' }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="">Select class…</option>
                      {setup?.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Arm *</label>
                    <select value={form.armId} onChange={e => setForm(p => ({ ...p, armId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="">Select arm…</option>
                      {setup?.arms?.filter((a: any) => a.classId === form.classId).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* House / Category / Admission type */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>House</label>
                    <input type="text" value={form.house} onChange={e => setForm(p => ({ ...p, house: e.target.value }))} placeholder="e.g. Eagles"
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Category</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="">Not specified</option>
                      <option value="DAY">Day Student</option>
                      <option value="BOARDING">Boarding</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Admission Type</label>
                    <select value={form.admissionType} onChange={e => setForm(p => ({ ...p, admissionType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                      <option value="NEW">New Admission</option>
                      <option value="TRANSFER">Transfer</option>
                      <option value="RETURNING">Returning</option>
                    </select>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                    <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t flex items-center justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
                <button type="button" onClick={() => setCreateOpen(false)} className="px-4 py-2 rounded-xl text-sm border transition-colors"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Cancel</button>
                <button type="submit" disabled={submitting} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {submitting ? 'Registering…' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          BULK UPLOAD MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      {excelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h2 className="font-extrabold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <FileSpreadsheet className="w-5 h-5 text-violet-500" />
                  Bulk Import Students
                </h2>
                <p className="text-xs opacity-60" style={{ color: 'var(--text-secondary)' }}>
                  Upload student roster with personal, guardian, and medical profiles.
                </p>
              </div>
              <button onClick={() => { setExcelOpen(false); setParsedStudents([]); setUploadResult(null); }} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Template Download Card */}
              <div className="p-4 rounded-2xl border bg-violet-500/5 border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-violet-400">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Comprehensive Excel Template</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Includes columns for Personal Biodata, Academic Info, Guardians, and Medical Records.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={downloadStudentTemplate}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  Download Template (.xlsx)
                </button>
              </div>

              {uploadResult ? (
                <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-emerald-400 space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm"><CheckCircle className="w-5 h-5" /> Upload Complete</div>
                  <p className="text-xs font-semibold">{uploadResult.created || 0} students imported · {uploadResult.skipped || 0} skipped/failed</p>
                  <p className="text-xs opacity-75">Default password for all imported students: <strong className="font-mono bg-emerald-500/20 px-1.5 py-0.5 rounded">password</strong></p>
                  
                  {uploadResult.data?.failures && uploadResult.data.failures.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-emerald-500/20 space-y-1">
                      <p className="text-[11px] font-bold text-red-400">Skipped Records Logs:</p>
                      <div className="max-h-32 overflow-y-auto text-[10px] font-mono space-y-1 bg-red-500/10 p-2 rounded-xl text-red-300">
                        {uploadResult.data.failures.map((f: any, idx: number) => (
                          <div key={idx}>⚠️ {f.name} ({f.admissionNumber}): {f.error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Drag & Drop Upload Zone */}
                  <div className="rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:border-violet-500/50" style={{ borderColor: 'var(--border-color)' }}>
                    <FileUp className="w-9 h-9 mx-auto mb-2 opacity-50 text-violet-500" />
                    <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Select Excel or CSV File</p>
                    <p className="text-xs mb-3 text-slate-400">
                      Supports <span className="font-bold">.xlsx</span>, <span className="font-bold">.xls</span>, or <span className="font-bold">.csv</span>
                    </p>

                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFile} className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer" style={{ color: 'var(--text-secondary)' }} />
                  </div>

                  {/* Section Coverage Tags */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-wider">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">👤 Personal & Academic</span>
                    <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">👨‍👩‍👧 Guardian & Contact</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🏥 Medical & Health</span>
                  </div>

                  {/* Parsed Preview */}
                  {parsedStudents.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-400">✓ {parsedStudents.length} students ready to import</p>
                      </div>
                      <div className="max-h-48 overflow-y-auto rounded-2xl border text-xs divide-y divide-slate-100 dark:divide-slate-800" style={{ borderColor: 'var(--border-color)' }}>
                        {parsedStudents.map((s, i) => {
                          const hasGuardian = Boolean(s.guardianFirstName || s.guardianLastName || s.guardianPhone);
                          const hasMedical = Boolean(s.allergies || s.chronicIllnesses || s.disabilities || s.bloodGroup || s.genotype);
                          return (
                            <div key={i} className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-2 font-medium">
                                <span className="opacity-40 text-[10px] font-mono">{i + 1}.</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName}</span>
                                <span className="opacity-40">·</span>
                                <span className="font-mono text-slate-500">{s.admissionNumber}</span>
                                {(s.className || s.armName) && (
                                  <>
                                    <span className="opacity-40">·</span>
                                    <span className="text-slate-400">{s.className} {s.armName}</span>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {hasGuardian && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                    + Guardian
                                  </span>
                                )}
                                {hasMedical && (
                                  <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    + Medical
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <button onClick={() => { setExcelOpen(false); setParsedStudents([]); setUploadResult(null); }} className="px-4 py-2 rounded-xl text-sm border font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>Close</button>
              {!uploadResult && parsedStudents.length > 0 && (
                <button onClick={handleBulkUpload} disabled={uploading} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-black bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50 active:scale-95 cursor-pointer">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploading ? 'Importing…' : `Import ${parsedStudents.length} Students`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 max-w-md w-full p-6 shadow-2xl rounded-3xl relative animate-in zoom-in-95 duration-200 space-y-4">
            
            {/* Header / Icon */}
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                confirmModal.isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight font-sans">
                  {confirmModal.title}
                </h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer transition-colors active:scale-95"
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer transition-all active:scale-95 shadow-sm ${
                  confirmModal.isDanger 
                    ? '!bg-red-600 !border-red-600 hover:!bg-red-500' 
                    : '!bg-blue-600 !border-blue-600 hover:!bg-blue-500'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
