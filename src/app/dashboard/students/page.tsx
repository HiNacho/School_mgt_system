'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, UserPlus, Search, GraduationCap, Archive, 
  Trash2, ShieldCheck, RefreshCw, X, AlertCircle, Edit, ArrowRightLeft, UserCheck,
  FileSpreadsheet, UploadCloud, AlertTriangle, FileUp, CheckCircle, Eye, Sparkles, Loader2,
  Award, FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function StudentsManagerPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterArm, setFilterArm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE'); // ACTIVE, ARCHIVED, GRADUATED, etc.
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [viewingStudent, setViewingStudent] = useState<any>(null);
  const [extendedStudentDetail, setExtendedStudentDetail] = useState<any | null>(null);
  const [showExtendedView, setShowExtendedView] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'scores' | 'progression' | 'attendance' | 'comments' | 'wellbeing'>('scores');

  // Wellbeing and Timeline state hooks
  const [wellbeingData, setWellbeingData] = useState<any | null>(null);
  const [loadingWellbeing, setLoadingWellbeing] = useState(false);
  const [newLogCategory, setNewLogCategory] = useState('POSITIVE');
  const [newLogSeverity, setNewLogSeverity] = useState('INFO');
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogDesc, setNewLogDesc] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [addingLog, setAddingLog] = useState(false);

  // Excel upload & DB clear state
  const [excelModalOpen, setExcelModalOpen] = useState(false);
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmWipeText, setConfirmWipeText] = useState('');

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [gender, setGender] = useState('MALE');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetArmId, setTargetArmId] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState('');

  // Bulk selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Clear bulk selection on pagination or filter changes
  useEffect(() => {
    setSelectedStudentIds([]);
  }, [currentPage, filterClass, filterArm, filterStatus, searchQuery, students]);

  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      try {
        const parsed = JSON.parse(userSession);
        const role = parsed.user?.role;
        if (role === 'PARENT' || role === 'STUDENT') {
          window.location.href = '/dashboard';
          return;
        }
        setSession(parsed);
        loadRegistries(parsed);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const loadRegistries = async (sess: any) => {
    try {
      const setupRes = await fetch(`/api/setup?schoolId=${sess.school.id}`);
      const setupJson = await setupRes.json();
      const setupData = setupJson.data;
      setSetup(setupData);

      const userRole = sess?.user?.role;
      const isTeacher = userRole === 'CLASS_TEACHER';

      if (isTeacher) {
        const teacherArm = setupData.arms?.find((arm: any) => arm.classTeacherId === sess?.user?.id);
        if (teacherArm) {
          setFilterClass(teacherArm.classId);
          setFilterArm(teacherArm.id);
          setTargetClassId(teacherArm.classId);
          setTargetArmId(teacherArm.id);
        } else {
          setFilterClass('');
          setFilterArm('');
        }
      } else {
        if (setupData.classes?.length > 0) {
          setFilterClass(setupData.classes[0].id);
          setTargetClassId(setupData.classes[0].id);
        }

        if (setupData.arms?.length > 0) {
          const firstArm = setupData.arms.find((a: any) => a.classId === setupData.classes[0].id);
          if (firstArm) {
            setFilterArm(firstArm.id);
            setTargetArmId(firstArm.id);
          }
        }
      }

      await loadStudents(sess.school.id);
    } catch (e) {
      setErrorMsg('Failed to initialize configuration setup');
    }
  };

  const loadStudents = async (schoolId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}&status=ALL`);
      const json = await res.json();
      setStudents(json.data || []);
      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to load student registry');
      setLoading(false);
    }
  };

  // Class toggle helper in setup selection
  const handleClassChange = (classId: string) => {
    setFilterClass(classId);
    setCurrentPage(1);
    const relatedArms = setup?.arms?.filter((a: any) => a.classId === classId) || [];
    if (relatedArms.length > 0) {
      setFilterArm(relatedArms[0].id);
    } else {
      setFilterArm('');
    }
  };

  const handleModalClassChange = (classId: string) => {
    setTargetClassId(classId);
    const relatedArms = setup?.arms?.filter((a: any) => a.classId === classId) || [];
    if (relatedArms.length > 0) {
      setTargetArmId(relatedArms[0].id);
    } else {
      setTargetArmId('');
    }
  };

  // Base64 passport photo uploader handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds the 2MB limit. Please upload a smaller passport photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPassportPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const downloadTemplate = () => {
    const classSpecificStudents = students.filter(
      s => s.classId === targetClassId && s.armId === targetArmId
    );

    const wsData = classSpecificStudents.length > 0
      ? classSpecificStudents.map(s => ({
          'Student Name': s.lastName ? `${s.lastName}, ${s.firstName}` : s.firstName,
          'Admission Number': s.admissionNumber,
          'Gender': s.gender
        }))
      : [
          { 'Student Name': 'Nwachukwu, Emeka', 'Admission Number': 'GW-2025-001', 'Gender': 'MALE' },
          { 'Student Name': 'Alabi, Yetunde', 'Admission Number': 'GW-2025-002', 'Gender': 'FEMALE' },
          { 'Student Name': 'Bello, Zainab', 'Admission Number': 'GW-2025-003', 'Gender': 'FEMALE' }
        ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'StudentTemplate');
    XLSX.writeFile(wb, 'Student_Upload_Template.xlsx');
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        const parsed: any[] = [];
        for (const r of rawRows) {
          const admissionNumber = String(r['Admission Number'] || r['AdmissionNumber'] || r['AdmissionNo'] || r['Admission ID'] || r['ID'] || '').trim();
          const fullName = String(r['Student Name'] || r['Name'] || r['Full Name'] || '').trim();
          let firstName = String(r['First Name'] || r['FirstName'] || '').trim();
          let lastName = String(r['Last Name'] || r['LastName'] || '').trim();
          const middleName = String(r['Middle Name'] || r['MiddleName'] || '').trim();
          let gender = String(r['Gender'] || 'MALE').trim().toUpperCase();
          if (gender !== 'MALE' && gender !== 'FEMALE') gender = 'MALE';

          if (!admissionNumber) continue;

          if (!firstName && fullName) {
            const nameParts = fullName.split(',');
            if (nameParts.length > 1) {
              lastName = nameParts[0]?.trim() || '';
              firstName = nameParts[1]?.trim() || '';
            } else {
              const spaceParts = fullName.split(' ');
              firstName = spaceParts[0]?.trim() || '';
              lastName = spaceParts.slice(1).join(' ')?.trim() || 'Student';
            }
          }

          if (!firstName) firstName = 'Student';

          parsed.push({
            firstName,
            lastName,
            middleName: middleName || null,
            admissionNumber,
            gender
          });
        }

        setParsedStudents(parsed);
        setUploadResult(null);
        setErrorMsg('');
      } catch (err) {
        setErrorMsg('Failed to parse Excel sheet. Ensure the file is not corrupted.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const triggerExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setUploading(true);

    if (parsedStudents.length === 0) {
      setErrorMsg('No students parsed from Excel sheet to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          classId: targetClassId,
          armId: targetArmId,
          students: parsedStudents
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload students list');

      setUploadResult(json.data);
      setSuccessMsg(`Bulk enrollment complete: successfully admitted ${json.data.successCount} students to ${json.data.className} Arm ${json.data.armName}!`);
      setParsedStudents([]);
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  };

  const triggerClearDatabase = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setClearing(true);

    try {
      const res = await fetch('/api/setup/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to clear database');

      setSuccessMsg(json.message);
      setClearModalOpen(false);
      await loadRegistries(session);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setClearing(false);
    }
  };

  const triggerCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (session?.user?.role === 'CLASS_TEACHER') {
      setErrorMsg('Unauthorized: Class Teachers are not permitted to admit or modify student lists.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          firstName,
          lastName,
          middleName,
          admissionNumber,
          gender,
          classId: targetClassId,
          armId: targetArmId,
          passportPhoto
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register student');

      setSuccessMsg(`Student '${lastName}, ${firstName}' successfully registered!`);
      setCreateModalOpen(false);
      resetForm();
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const triggerUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (session?.user?.role === 'CLASS_TEACHER') {
      setErrorMsg('Unauthorized: Class Teachers are not permitted to admit or modify student lists.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          firstName,
          lastName,
          middleName,
          admissionNumber,
          gender,
          classId: targetClassId,
          armId: targetArmId,
          passportPhoto
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update student profile');

      setSuccessMsg(`Student profile updated successfully!`);
      setEditModalOpen(false);
      resetForm();
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveChange = async (student: any, nextStatus: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (session?.user?.role === 'CLASS_TEACHER') {
      setErrorMsg('Unauthorized: Class Teachers are not permitted to admit or modify student lists.');
      return;
    }

    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: student.id,
          status: nextStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to alter student status');

      setSuccessMsg(`Student status successfully changed to '${nextStatus}'!`);
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const triggerDelete = async (student: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    setDeleteBlockedMsg('');

    if (session?.user?.role === 'CLASS_TEACHER') {
      setErrorMsg('Unauthorized: Class Teachers are not permitted to admit or modify student lists.');
      return;
    }

    try {
      const res = await fetch(`/api/students?id=${student.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (res.status === 403) {
        setDeleteBlockedMsg(json.error);
        return;
      }

      if (!res.ok) throw new Error(json.error || 'Failed to delete student');

      setSuccessMsg('Student profile permanently deleted successfully.');
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleSelectStudentChange = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllChange = () => {
    const currentIds = currentStudents.map(s => s.id);
    const allSelectedOnPage = currentIds.every(id => selectedStudentIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedStudentIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const triggerBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;

    if (session?.user?.role === 'CLASS_TEACHER') {
      setErrorMsg('Unauthorized: Class Teachers are not permitted to admit or modify student lists.');
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete the ${selectedStudentIds.length} selected student(s)? This action is irreversible.`)) {
      return;
    }

    setBulkDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    setDeleteBlockedMsg('');

    try {
      const res = await fetch(`/api/students?ids=${selectedStudentIds.join(',')}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (res.status === 403) {
        setDeleteBlockedMsg(json.error);
        setBulkDeleting(false);
        return;
      }

      if (!res.ok) throw new Error(json.error || 'Failed to delete student profiles');

      setSuccessMsg(`Successfully deleted ${selectedStudentIds.length} student profile(s).`);
      setSelectedStudentIds([]);
      await loadStudents(session.school.id);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setAdmissionNumber('');
    setGender('MALE');
    setPassportPhoto(null);
    setSelectedStudent(null);
  };

  const openEditModal = (student: any) => {
    setSelectedStudent(student);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setMiddleName(student.middleName || '');
    setAdmissionNumber(student.admissionNumber);
    setGender(student.gender);
    setTargetClassId(student.classId);
    setTargetArmId(student.armId);
    setPassportPhoto(student.passportPhoto || null);
    setEditModalOpen(true);
  };

  const isGreenwood = session?.school?.slug === 'nacho-secondary';
  const role = session?.user?.role;
  const isClassTeacher = role === 'CLASS_TEACHER';
  const assignedArm = isClassTeacher ? setup?.arms?.find((arm: any) => arm.classTeacherId === session?.user?.id) : null;

  // Filter students array based on selections
  const filteredStudents = students.filter(s => {
    if (isClassTeacher) {
      if (!assignedArm) return false;
      const classMatch = s.classId === assignedArm.classId;
      const armMatch = s.armId === assignedArm.id;
      const statusMatch = s.status === filterStatus;
      
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(searchLower);

      return classMatch && armMatch && statusMatch && nameMatch;
    }

    const classMatch = s.classId === filterClass;
    const armMatch = !filterArm || s.armId === filterArm;
    const statusMatch = s.status === filterStatus;
    
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase().includes(searchLower);

    return classMatch && armMatch && statusMatch && nameMatch;
  });

  const themeAccentColor = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10';

  // SEARCH AND PAGINATION FILTERS
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <GraduationCap className={`w-6 h-6 ${themeAccentColor}`} /> Students Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            {isClassTeacher 
              ? 'View active class rosters, academic indicators, and student profiles.' 
              : 'Manage active class lists, transfers, status archiving, and registrations.'
            }
          </p>
        </div>

        {!isClassTeacher && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSuccessMsg('');
                setConfirmWipeText('');
                setClearModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-50 border border-red-200 hover:border-red-300 text-red-700 hover:text-red-800 hover:bg-red-100/80 text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow-red-100/50"
            >
              <Trash2 className="w-4 h-4 text-red-600 animate-pulse" /> Wipe Academic Data
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setParsedStudents([]);
                setUploadResult(null);
                setExcelModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-black transition-all cursor-pointer animate-fadeIn"
            >
              <FileUp className="w-4 h-4 text-emerald-600" /> Upload from Excel
            </button>

            <button
              type="button"
              onClick={() => { resetForm(); setCreateModalOpen(true); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-xs transition-all shadow-md cursor-pointer ${themeBgAccent}`}
            >
              <UserPlus className="w-4 h-4" /> Add Student
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-150 text-green-600 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-150 text-red-650 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {deleteBlockedMsg && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-150 text-slate-700 text-xs space-y-3 font-semibold animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-amber-800 text-sm">Academic Record Retention Boundary Warning</h4>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">{deleteBlockedMsg}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={() => setDeleteBlockedMsg('')}
              className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-bold"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Filtering & Search Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {isClassTeacher ? (
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Assigned Classroom Cohort
            </label>
            <div className={`flex items-center gap-2.5 p-2 px-3.5 rounded-2xl border font-extrabold text-xs select-none h-[38px] ${
              isGreenwood 
                ? 'bg-emerald-50/5 border-emerald-100 text-emerald-600' 
                : 'bg-indigo-50/5 border-indigo-100 text-indigo-600'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${
                isGreenwood ? 'bg-emerald-500' : 'bg-indigo-500'
              }`} />
              <span>
                {assignedArm ? `${assignedArm.class?.name} Arm ${assignedArm.name}` : 'Loading classroom allocation...'}
              </span>
              <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase ml-auto">
                Profile Lock
              </span>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Select Class
              </label>
              <select
                value={filterClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-300 text-slate-700 h-[38px]"
              >
                {setup?.classes?.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Class Arm / Stream
              </label>
              <select
                value={filterArm}
                onChange={(e) => { setFilterArm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-150 rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-300 text-slate-700 h-[38px]"
              >
                <option value="">All Streams</option>
                {setup?.arms?.filter((a: any) => a.classId === filterClass).map((arm: any) => (
                  <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Registry Status
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-50 p-1 border border-slate-150 rounded-2xl h-[38px]">
            <button
              type="button"
              onClick={() => { setFilterStatus('ACTIVE'); setCurrentPage(1); }}
              className={`py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all ${
                filterStatus === 'ACTIVE' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400'
              }`}
            >
              Active List
            </button>
            <button
              type="button"
              onClick={() => { setFilterStatus('ARCHIVED'); setCurrentPage(1); }}
              className={`py-1.5 rounded-xl text-[10px] font-black tracking-wider transition-all ${
                filterStatus === 'ARCHIVED' ? 'bg-white text-slate-800 shadow-sm border border-slate-100' : 'text-slate-400'
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        <div className="relative">
          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Live Search
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search name or ID..."
              className="w-full bg-slate-50 border border-slate-150 rounded-2xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-blue-300 placeholder-slate-400 text-slate-700 h-[38px]"
            />
            <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>

      {/* Roster List Table */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
        <div className="text-[11px] text-slate-400 font-bold flex justify-between items-center px-1">
          <span>Showing {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems} students</span>
          <span className={`${isGreenwood ? 'text-emerald-600' : 'text-indigo-600'} font-bold uppercase tracking-wider text-[10px]`}>
            {session?.school?.name || (isGreenwood ? 'Greenwood Academy' : 'Lagos Excel')}
          </span>
        </div>

        {selectedStudentIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-50/50 border border-red-100 rounded-2xl gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-bold text-red-800">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>{selectedStudentIds.length} student(s) selected for management operations</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-red-600/10 cursor-pointer animate-pulse"
              >
                {bulkDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete Selected Permanently
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-6 h-6 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-xs font-semibold">Accessing student ledgers...</p>
            </div>
          </div>
        ) : currentStudents.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-3xl space-y-3">
            <Users className="w-10 h-10 text-slate-350 mx-auto" />
            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">No matching students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {!isClassTeacher && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={currentStudents.length > 0 && currentStudents.every(s => selectedStudentIds.includes(s.id))}
                        onChange={handleSelectAllChange}
                        className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="p-4">Photo</th>
                  <th className="p-4">Admission ID</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4">Gender</th>
                  <th className="p-4">Class Stream</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentStudents.map((stud) => (
                  <tr key={stud.id} className="hover:bg-slate-50/50 transition-colors">
                    {!isClassTeacher && (
                      <td className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(stud.id)}
                          onChange={() => handleSelectStudentChange(stud.id)}
                          className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                    )}
                    {/* Passport Photo */}
                    <td className="p-4">
                      <div className="w-8 h-8 rounded-full border border-slate-200 overflow-hidden bg-slate-50 shadow-inner flex items-center justify-center flex-shrink-0">
                        {stud.passportPhoto ? (
                          <img src={stud.passportPhoto} alt={`${stud.firstName}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 uppercase">{stud.firstName[0]}{stud.lastName[0]}</span>
                        )}
                      </div>
                    </td>

                    {/* Admission ID */}
                    <td className="p-4 font-mono font-extrabold text-slate-800">
                      {stud.admissionNumber}
                    </td>

                    {/* Name */}
                    <td className="p-4">
                      <span className="font-extrabold text-slate-800 text-sm block">
                        {stud.lastName}, {stud.firstName} {stud.middleName || ''}
                      </span>
                    </td>

                    {/* Gender */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border ${
                        stud.gender === 'MALE' 
                          ? 'bg-sky-50 text-sky-600 border-sky-100' 
                          : 'bg-pink-50 text-pink-600 border-pink-100'
                      }`}>
                        {stud.gender}
                      </span>
                    </td>

                    {/* Class Arm */}
                    <td className="p-4 text-slate-500 font-bold">
                      {stud.class.name} <span className="text-slate-400">Arm {stud.arm.name}</span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            setViewingStudent(stud);
                            setShowExtendedView(false);
                            setExtendedStudentDetail(null);
                            setWellbeingData(null);
                            setLoadingDetail(true);
                            setLoadingWellbeing(true);
                            try {
                              const res = await fetch(`/api/students?studentId=${stud.id}`);
                              const json = await res.json();
                              if (res.ok && json.data) {
                                setExtendedStudentDetail(json.data);
                              }

                              const wRes = await fetch(`/api/wellbeing?schoolId=${session.school.id}&studentId=${stud.id}`);
                              const wJson = await wRes.json();
                              if (wRes.ok && wJson.success) {
                                setWellbeingData(wJson.data);
                              }
                            } catch (e) {
                              console.error("Error fetching student details:", e);
                            } finally {
                              setLoadingDetail(false);
                              setLoadingWellbeing(false);
                            }
                          }}
                          className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-450 hover:text-slate-800 transition-colors cursor-pointer"
                          title="View student profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!isClassTeacher && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(stud)}
                              className="p-1.5 rounded-xl hover:bg-slate-50 text-slate-450 hover:text-slate-800 transition-colors"
                              title="Edit profile details"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {stud.status === 'ACTIVE' ? (
                              <button
                                type="button"
                                onClick={() => handleArchiveChange(stud, 'ARCHIVED')}
                                className="p-1.5 rounded-xl hover:bg-slate-50 text-amber-600 hover:bg-amber-50 transition-colors"
                                title="Archive student"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleArchiveChange(stud, 'ACTIVE')}
                                className="p-1.5 rounded-xl hover:bg-slate-50 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Restore student"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => triggerDelete(stud)}
                              className="p-1.5 rounded-xl hover:bg-slate-50 text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Sliding Pagination controls */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center border-t border-slate-50 pt-4">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Previous Page
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    currentPage === p
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'hover:bg-slate-50 text-slate-500'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
              Next Page
            </button>
          </div>
        )}
      </div>

      {/* Details Viewing Drawer */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-150 rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 animate-fadeIn ${
            showExtendedView ? 'max-w-4xl w-full' : 'max-w-md w-full'
          }`}>
            
            {/* Modal Header bar */}
            <div className={`px-6 py-5 flex items-center justify-between border-b border-slate-50 ${
              isGreenwood ? 'bg-emerald-50/30' : 'bg-indigo-50/30'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${
                  isGreenwood ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}>
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-950">
                    {showExtendedView ? 'Comprehensive Academic Record' : 'Student Registry Card'}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                    {showExtendedView ? 'Full Profile Analytics' : 'Enrollment Ledger Metadata'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingStudent(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center shadow-sm text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content layout */}
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {!showExtendedView ? (
                // 1. Initial General View (Showing the 10 Essential Fields)
                <div className="space-y-6">
                  {/* Photo & Name Identity Card */}
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-slate-50 border border-slate-100">
                    <div className="w-16 h-16 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center flex-shrink-0">
                      {viewingStudent.passportPhoto ? (
                        <img src={viewingStudent.passportPhoto} alt="Passport preview" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-8 h-8 text-slate-350" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-800 leading-tight">
                        {viewingStudent.lastName}, {viewingStudent.firstName} {viewingStudent.middleName || ''}
                      </h4>
                      <span className="text-[10px] text-slate-450 font-bold tracking-wider font-mono bg-white px-2 py-0.5 border border-slate-150 rounded-md mt-1 inline-block">
                        Admin ID: {viewingStudent.admissionNumber}
                      </span>
                    </div>
                  </div>

                  {/* Core 10 Fields Attributes Grid */}
                  <div className="space-y-4">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-1">
                      Essential Demographic & Cohort Coordinates
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Class Grade:</span>
                        <strong className="text-slate-700">{viewingStudent.class?.name}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Stream / Arm:</span>
                        <strong className="text-slate-700">Arm {viewingStudent.arm?.name}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Biological Gender:</span>
                        <strong className="text-slate-700">{viewingStudent.gender}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Date of Birth:</span>
                        <strong className="text-slate-700 font-mono">{viewingStudent.dateOfBirth || 'Not Provided'}</strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Clearance status:</span>
                        <strong className={viewingStudent.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}>
                          {viewingStudent.status}
                        </strong>
                      </div>
                      <div className="flex justify-between p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Enrollment Date:</span>
                        <strong className="text-slate-700 font-mono">
                          {new Date(viewingStudent.createdAt).toLocaleDateString()}
                        </strong>
                      </div>
                    </div>

                    <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-1 pt-2">
                      Primary Parent / Guardian Contact Details
                    </span>

                    <div className="space-y-2 text-xs font-semibold text-slate-500">
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Parent/Guardian Name:</span>
                        <strong className="text-slate-700">
                          {viewingStudent.parent 
                            ? `${viewingStudent.parent.firstName} ${viewingStudent.parent.lastName}`
                            : 'Not Assigned'
                          }
                        </strong>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
                        <span className="text-slate-400">Parent phone Contact:</span>
                        <strong className="text-slate-750 font-mono">
                          {viewingStudent.parent?.phone || 'Not Provided'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-50 justify-end font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewingStudent(null)}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      Close Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExtendedView(true)}
                      className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-black text-white shadow-md cursor-pointer ${themeBgAccent}`}
                    >
                      <span>View More Details</span>
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    </button>
                  </div>
                </div>
              ) : (
                // 2. Extended Detailed Analytics View (Tabs console)
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column Profile snapshot sidebar */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="bg-slate-50 p-4 border border-slate-100 rounded-3xl text-center space-y-3">
                      <div className="w-20 h-20 rounded-2xl border-2 border-white overflow-hidden bg-white shadow-md flex items-center justify-center mx-auto shadow-slate-100">
                        {viewingStudent.passportPhoto ? (
                          <img src={viewingStudent.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-10 h-10 text-slate-350" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-tight">
                          {viewingStudent.lastName}, {viewingStudent.firstName}
                        </h4>
                        <span className="text-[9px] font-bold font-mono tracking-wider bg-white px-2 py-0.5 border border-slate-150 rounded text-slate-500 mt-1 inline-block">
                          ID: {viewingStudent.admissionNumber}
                        </span>
                      </div>

                      <div className="border-t border-slate-200/60 pt-3 text-[11px] font-semibold text-slate-500 space-y-1.5 text-left">
                        <div className="flex justify-between"><span>Grade:</span> <strong className="text-slate-700">{viewingStudent.class?.name} Arm {viewingStudent.arm?.name}</strong></div>
                        <div className="flex justify-between"><span>Gender:</span> <strong className="text-slate-700">{viewingStudent.gender}</strong></div>
                        <div className="flex justify-between"><span>DOB:</span> <strong className="text-slate-700 font-mono">{viewingStudent.dateOfBirth || 'Not Provided'}</strong></div>
                        <div className="flex justify-between"><span>Parent Name:</span> <strong className="text-slate-750">{viewingStudent.parent ? `${viewingStudent.parent.firstName} ${viewingStudent.parent.lastName}` : 'N/A'}</strong></div>
                        <div className="flex justify-between"><span>Parent Contact:</span> <strong className="text-slate-700 font-mono">{viewingStudent.parent?.phone || 'N/A'}</strong></div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowExtendedView(false)}
                      className="w-full py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      ← Back to General Info
                    </button>
                  </div>

                  {/* Right Column Profile Tab content */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Tab Navigation header */}
                    <div className="flex border-b border-slate-100 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-150">
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('scores')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'scores' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Academic Scores
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('attendance')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'attendance' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Attendance Logs
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('comments')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'comments' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Teacher Comments
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetailTab('wellbeing')}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeDetailTab === 'wellbeing' 
                            ? 'bg-white text-slate-850 shadow-sm border border-slate-100 font-black' 
                            : 'text-slate-400 hover:text-slate-650'
                        }`}
                      >
                        Well-being & Timeline
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="bg-white border border-slate-150 rounded-3xl p-5 min-h-[220px]">
                      {loadingDetail ? (
                        <div className="h-44 flex items-center justify-center">
                          <div className="text-center space-y-2">
                            <div className="w-5 h-5 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Synchronizing files...</p>
                          </div>
                        </div>
                      ) : extendedStudentDetail ? (
                        <>
                          {/* 1. Academic Scores Tab */}
                          {activeDetailTab === 'scores' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Academic Performance Summary</span>
                              
                              {!extendedStudentDetail.scores || extendedStudentDetail.scores.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No academic scores recorded for this student in the current session.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-100 max-h-[260px] overflow-y-auto">
                                  <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                        <th className="p-3">Subject Name</th>
                                        <th className="p-3 text-center">CA (30)</th>
                                        <th className="p-3 text-center">Assign (10)</th>
                                        <th className="p-3 text-center">Exam (60)</th>
                                        <th className="p-3 text-center">Total (100)</th>
                                        <th className="p-3 text-center">Grade</th>
                                        <th className="p-3 text-center">Term</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {extendedStudentDetail.scores.map((score: any) => {
                                        const caTotal = (score.ca1 || 0) + (score.ca2 || 0);
                                        const total = caTotal + (score.assignment || 0) + (score.exam || 0);
                                        return (
                                          <tr key={score.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-extrabold text-slate-800 text-[11px]">
                                              {score.subject?.name}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {caTotal}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {score.assignment || 0}
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-mono font-bold text-[11px]">
                                              {score.exam || 0}
                                            </td>
                                            <td className="p-3 text-center font-black text-blue-650 font-mono text-sm">
                                              {total}
                                            </td>
                                            <td className="p-3 text-center">
                                              <span className="px-2 py-0.5 rounded-lg text-[9px] font-black border bg-blue-50 text-blue-650 border-blue-100">
                                                {score.grade || 'N/A'}
                                              </span>
                                            </td>
                                            <td className="p-3 text-center text-[10px] text-slate-400 font-extrabold tracking-wider uppercase">
                                              {score.term?.name?.split(' ')?.[0] || score.term?.name || 'N/A'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. Attendance Ledger Tab */}
                          {activeDetailTab === 'attendance' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Attendance registry</span>
                              
                              {!extendedStudentDetail.attendance || extendedStudentDetail.attendance.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No attendance logs drafted for this student yet.
                                </div>
                              ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                  <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400">
                                        <th className="p-3">Academic Term</th>
                                        <th className="p-3 text-center">Present</th>
                                        <th className="p-3 text-center">Absent</th>
                                        <th className="p-3 text-center">Ratio Rate</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {extendedStudentDetail.attendance.map((att: any) => {
                                        const totalDays = (att.daysPresent || 0) + (att.daysAbsent || 0);
                                        const rate = totalDays > 0 ? Math.round(((att.daysPresent || 0) / totalDays) * 100) : 0;
                                        return (
                                          <tr key={att.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-3 font-extrabold text-slate-800 text-[11px]">
                                              {att.term?.name || 'Academic Term'}
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-500 font-mono">
                                              {att.daysPresent || 0} days
                                            </td>
                                            <td className="p-3 text-center font-bold text-slate-450 font-mono">
                                              {att.daysAbsent || 0} days
                                            </td>
                                            <td className="p-3 text-center">
                                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black border ${
                                                rate >= 90 
                                                  ? 'bg-green-50 text-green-600 border-green-100' 
                                                  : rate >= 75 
                                                  ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                                  : 'bg-red-50 text-red-600 border-red-100'
                                              }`}>
                                                {rate}%
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* 3. Teacher Remarks Tab */}
                          {activeDetailTab === 'comments' && (
                            <div className="space-y-4">
                              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Teacher & Dean Remarks</span>
                              
                              {!extendedStudentDetail.reportComments || extendedStudentDetail.reportComments.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No official reports comments logged for this student.
                                </div>
                              ) : (
                                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                  {extendedStudentDetail.reportComments.map((comment: any) => (
                                    <div key={comment.id} className="p-3 bg-slate-50 border border-slate-150 rounded-2xl space-y-2">
                                      <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                                        <span className="font-extrabold text-[10px] text-slate-700 uppercase tracking-wider">
                                          {comment.term?.name || 'Academic Term'}
                                        </span>
                                      </div>
                                      
                                      {comment.teacherComment && (
                                        <div className="text-[11px] leading-relaxed text-slate-600">
                                          <strong className="text-slate-800 text-[10px] block font-black uppercase text-slate-400 tracking-wider">Class Teacher Comment:</strong>
                                          <p className="mt-0.5 italic">"{comment.teacherComment}"</p>
                                        </div>
                                      )}

                                      {comment.principalComment && (
                                        <div className="text-[11px] leading-relaxed text-slate-600 border-t border-slate-100 pt-2 mt-2">
                                          <strong className="text-slate-800 text-[10px] block font-black uppercase text-slate-400 tracking-wider">Principal Comment:</strong>
                                          <p className="mt-0.5 italic">"{comment.principalComment}"</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* 4. Well-being Dashboard Tab */}
                          {activeDetailTab === 'wellbeing' && (
                            <div className="space-y-6 animate-fadeIn">
                              {loadingWellbeing ? (
                                <div className="h-44 flex items-center justify-center">
                                  <div className="text-center space-y-2">
                                    <div className="w-5 h-5 border-2 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Compiling metrics...</p>
                                  </div>
                                </div>
                              ) : wellbeingData ? (
                                <div className="space-y-6">
                                  {/* Wellbeing indexes grid */}
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Attendance Rate</span>
                                      <span className="text-sm font-extrabold text-slate-800">{wellbeingData.attendanceRate}%</span>
                                    </div>
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Academic Average</span>
                                      <span className="text-sm font-extrabold text-slate-800">{wellbeingData.academicAverage}%</span>
                                    </div>
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Behaviour Rating</span>
                                      <span className="text-sm font-extrabold text-slate-800">{wellbeingData.behaviourRating} / 5 ⭐</span>
                                    </div>
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Homework Completion</span>
                                      <span className="text-sm font-extrabold text-slate-800">{wellbeingData.homeworkCompletion}%</span>
                                    </div>
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Social development</span>
                                      <span className="text-sm font-extrabold text-slate-800">{wellbeingData.socialDevelopment}%</span>
                                    </div>
                                    <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl space-y-1">
                                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Conduct Points</span>
                                      <span className={`text-sm font-extrabold ${wellbeingData.conductBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {wellbeingData.conductBalance >= 0 ? `+${wellbeingData.conductBalance}` : wellbeingData.conductBalance}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                    {/* Left: Behaviour & Timeline */}
                                    <div className="space-y-4">
                                      {/* Log behaviour event form */}
                                      <div className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                                        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                          <Award className="w-4 h-4 text-indigo-600" />
                                          Log Conduct Event
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Category</label>
                                            <select
                                              value={newLogCategory}
                                              onChange={(e) => setNewLogCategory(e.target.value)}
                                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] bg-white focus:outline-none"
                                            >
                                              <option value="POSITIVE">Positive conduct</option>
                                              <option value="NEGATIVE">Negative conduct</option>
                                              <option value="LEADERSHIP">Leadership</option>
                                              <option value="DISCIPLINE">Discipline</option>
                                              <option value="ACHIEVEMENT">Achievement</option>
                                              <option value="HEALTH">Health Alert</option>
                                            </select>
                                          </div>
                                          <div>
                                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Severity</label>
                                            <select
                                              value={newLogSeverity}
                                              onChange={(e) => setNewLogSeverity(e.target.value)}
                                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] bg-white focus:outline-none"
                                            >
                                              <option value="INFO">Information</option>
                                              <option value="MINOR">Minor</option>
                                              <option value="MODERATE">Moderate</option>
                                              <option value="MAJOR">Major</option>
                                              <option value="CRITICAL">Critical</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Title</label>
                                          <input
                                            type="text"
                                            placeholder="e.g. Helped peer with tutoring"
                                            value={newLogTitle}
                                            onChange={(e) => setNewLogTitle(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Description</label>
                                          <textarea
                                            rows={2}
                                            placeholder="Details of the conduct..."
                                            value={newLogDesc}
                                            onChange={(e) => setNewLogDesc(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          disabled={addingLog || !newLogTitle.trim()}
                                          onClick={async () => {
                                            setAddingLog(true);
                                            try {
                                              const res = await fetch('/api/communication/behaviour', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  schoolId: session.school.id,
                                                  studentId: viewingStudent.id,
                                                  category: newLogCategory,
                                                  severity: newLogSeverity,
                                                  title: newLogTitle.trim(),
                                                  description: newLogDesc.trim()
                                                })
                                              });
                                              if (res.ok) {
                                                setNewLogTitle('');
                                                setNewLogDesc('');
                                                // Reload wellbeing details
                                                const wRes = await fetch(`/api/wellbeing?schoolId=${session.school.id}&studentId=${viewingStudent.id}`);
                                                const wJson = await wRes.json();
                                                if (wRes.ok) setWellbeingData(wJson.data);
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            } finally {
                                              setAddingLog(false);
                                            }
                                          }}
                                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold transition-all disabled:opacity-50"
                                        >
                                          {addingLog ? 'Logging Event...' : 'Log Conduct Event'}
                                        </button>
                                      </div>

                                      {/* Student Timeline list */}
                                      <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold text-slate-800">Chronological Activity Timeline</h4>
                                        <div className="border-l border-slate-200 pl-4 space-y-4 max-h-[300px] overflow-y-auto pr-1 animate-fadeIn">
                                          {(!wellbeingData.timeline || wellbeingData.timeline.length === 0) ? (
                                            <p className="text-[10px] text-slate-400 italic">No timeline activities recorded.</p>
                                          ) : (
                                            wellbeingData.timeline.map((t: any) => (
                                              <div key={t.id} className="relative space-y-0.5">
                                                <span className="w-2 h-2 bg-indigo-600 rounded-full absolute -left-[21px] top-1 border border-white" />
                                                <div className="flex justify-between items-center text-[9px] text-slate-400">
                                                  <span className="font-extrabold uppercase text-indigo-500 tracking-wider">{t.eventType}</span>
                                                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h5 className="text-[10px] font-bold text-slate-800">{t.title}</h5>
                                                <p className="text-[10px] text-slate-500 leading-normal">"{t.description}"</p>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Private Teacher Notes */}
                                    <div className="space-y-4">
                                      <div className="p-4 border border-slate-200 rounded-2xl space-y-3 bg-amber-50/10">
                                        <h4 className="text-xs font-bold text-slate-855 flex items-center gap-1.5">
                                          <FileText className="w-4 h-4 text-amber-600" />
                                          Private Teacher Observations
                                        </h4>
                                        <p className="text-[10px] text-slate-400 leading-normal">
                                          These notes remain strictly confidential. Guardians and students do not have visibility into this record.
                                        </p>
                                        <textarea
                                          rows={3}
                                          placeholder="Write internal observations (e.g. Discuss with counsellor)..."
                                          value={newNoteText}
                                          onChange={(e) => setNewNoteText(e.target.value)}
                                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                                        />
                                        <button
                                          type="button"
                                          disabled={addingLog || !newNoteText.trim()}
                                          onClick={async () => {
                                            setAddingLog(true);
                                            try {
                                              const res = await fetch('/api/communication/notes', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  schoolId: session.school.id,
                                                  studentId: viewingStudent.id,
                                                  note: newNoteText.trim()
                                                })
                                              });
                                              if (res.ok) {
                                                setNewNoteText('');
                                                // Reload wellbeing details
                                                const wRes = await fetch(`/api/wellbeing?schoolId=${session.school.id}&studentId=${viewingStudent.id}`);
                                                const wJson = await wRes.json();
                                                if (wRes.ok) setWellbeingData(wJson.data);
                                              }
                                            } catch (err) {
                                              console.error(err);
                                            } finally {
                                              setAddingLog(false);
                                            }
                                          }}
                                          className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-all disabled:opacity-50"
                                        >
                                          {addingLog ? 'Saving Observation...' : 'Save Private Note'}
                                        </button>
                                      </div>

                                      {/* Private Notes feed */}
                                      <div className="space-y-2 pt-2">
                                        <h4 className="text-xs font-bold text-slate-800">Observations History</h4>
                                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                                          {wellbeingData.latestWeeklyReport?.comment && (
                                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                              <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase font-black">
                                                <span>Weekly Progress Remarks</span>
                                                <span>Week {wellbeingData.latestWeeklyReport.weekNumber}</span>
                                              </div>
                                              <p className="text-[10px] text-slate-650 mt-1 italic">"{wellbeingData.latestWeeklyReport.comment}"</p>
                                            </div>
                                          )}
                                          {(!wellbeingData.behaviourLogs || wellbeingData.behaviourLogs.length === 0) ? (
                                            <p className="text-[10px] text-slate-400 italic">No historical observations logged.</p>
                                          ) : (
                                            wellbeingData.behaviourLogs.map((b: any) => (
                                              <div key={b.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1 animate-fadeIn">
                                                <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase">
                                                  <span>{b.category} ({b.severity})</span>
                                                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <h5 className="text-[10px] font-bold text-slate-700">{b.title}</h5>
                                                <p className="text-[10px] text-slate-500 italic">"{b.description}"</p>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                                  No wellbeing details parsed for this student.
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-8 text-center text-slate-450 text-xs font-bold uppercase tracking-wider">
                          Error loading database relations
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Modal bottom-bar */}
            {showExtendedView && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between font-semibold">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  School Results Automation platform
                </span>
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  Close Workspace
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <UserPlus className={`w-4 h-4 ${themeAccentColor}`} /> Manual Student Registry Form
              </h3>
              <button 
                type="button" 
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerCreateSubmit} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                
                {/* Passport photo upload field */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                    {passportPhoto ? (
                      <img src={passportPhoto} alt="Passport preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Student Passport Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-[10px] text-slate-450 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold hover:file:bg-blue-100" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Last Name (Surname)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adenike"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Middle Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Alao"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Admission ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GW-2025-001"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 focus:outline-none focus:border-blue-300"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Target Class</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-705 focus:outline-none"
                    >
                      {setup?.classes?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Class Stream / Arm</label>
                    <select
                      value={targetArmId}
                      onChange={(e) => setTargetArmId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-705 focus:outline-none"
                    >
                      {setup?.arms?.filter((a: any) => a.classId === targetClassId).map((arm: any) => (
                        <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all disabled:opacity-50 ${themeBgAccent}`}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <Edit className={`w-4 h-4 ${themeAccentColor}`} /> Edit Student Profile
              </h3>
              <button 
                type="button" 
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerUpdateSubmit} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                
                {/* Passport photo upload field */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                    {passportPhoto ? (
                      <img src={passportPhoto} alt="Passport preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Student Passport Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-[10px] text-slate-450 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold hover:file:bg-blue-100" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Last Name (Surname)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adenike"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Middle Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Alao"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Admission ID</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GW-2025-001"
                      value={admissionNumber}
                      onChange={(e) => setAdmissionNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-750 focus:outline-none focus:border-blue-300"
                    >
                      <option value="MALE">MALE</option>
                      <option value="FEMALE">FEMALE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Target Class</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-705 focus:outline-none"
                    >
                      {setup?.classes?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Class Stream / Arm</label>
                    <select
                      value={targetArmId}
                      onChange={(e) => setTargetArmId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-705 focus:outline-none"
                    >
                      {setup?.arms?.filter((a: any) => a.classId === targetClassId).map((arm: any) => (
                        <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-all disabled:opacity-50 ${themeBgAccent}`}
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Updating...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload from Excel Modal */}
      {excelModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel Student Uploader
              </h3>
              <button 
                type="button" 
                onClick={() => setExcelModalOpen(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={triggerExcelUpload} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5">
                
                <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Target Class Stream</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => handleModalClassChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      {setup?.classes?.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 font-sans">Class Arm / Stream</label>
                    <select
                      value={targetArmId}
                      onChange={(e) => setTargetArmId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                    >
                      {setup?.arms?.filter((a: any) => a.classId === targetClassId).map((arm: any) => (
                        <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl bg-slate-50/50 text-center relative transition-all cursor-pointer">
                  <UploadCloud className="w-10 h-10 text-slate-400 mb-2" />
                  <span className="block font-black text-slate-750">Drag and drop or select student sheet</span>
                  <span className="block text-[10px] text-slate-400 mt-1">XLSX, XLS, or CSV files supported</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    onChange={handleExcelFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-150">
                  <div className="text-[10px] text-emerald-800 font-bold max-w-sm">
                    Need a structural template? Download pre-formatted student sheet.
                  </div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors shrink-0 shadow-sm"
                  >
                    Template Download
                  </button>
                </div>

                {parsedStudents.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-450">
                      <span>Parsed Roster Registry Preview ({parsedStudents.length} Students)</span>
                      <span className="text-emerald-600 font-bold">Status: Ready to Enroll</span>
                    </div>
                    <div className="max-h-48 border border-slate-150 rounded-2xl bg-white overflow-y-auto shadow-inner">
                      <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-650">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 text-[9px] font-black uppercase tracking-wider">
                            <th className="p-2.5 pl-4">Admission Number</th>
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5">Gender</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedStudents.slice(0, 10).map((st, i) => (
                            <tr key={i} className="border-b border-slate-50 text-slate-700 hover:bg-slate-50/50">
                              <td className="p-2.5 pl-4 font-mono font-bold">{st.admissionNumber}</td>
                              <td className="p-2.5 font-bold">{st.lastName}, {st.firstName}</td>
                              <td className="p-2.5 text-slate-550 font-bold">{st.gender}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {parsedStudents.length > 10 && (
                        <div className="p-2.5 bg-slate-50 text-center text-[9px] text-slate-450 border-t border-slate-100 font-black uppercase tracking-wider">
                          ... and {parsedStudents.length - 10} more rows parsed
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {uploadResult && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-3 animate-fadeIn font-semibold text-slate-600">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Upload Summary Diagnostics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-center font-black">
                      <div className="p-3 bg-green-50 border border-green-150 text-green-600 rounded-xl">
                        <span className="block text-xl font-mono">{uploadResult.successCount}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 block">Successfully Enrolled</span>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-150 text-red-650 rounded-xl">
                        <span className="block text-xl font-mono">{uploadResult.failCount}</span>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 mt-1 block">Skipped / Duplicates</span>
                      </div>
                    </div>

                    {uploadResult.failures.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block text-[9px] font-black uppercase text-red-600">Conflict / Skipping Details logs</span>
                        <div className="max-h-28 overflow-y-auto border border-red-100 bg-red-50/[0.1] p-2.5 rounded-xl space-y-1 font-mono text-[9px] text-slate-500">
                          {uploadResult.failures.map((f: any, idx: number) => (
                            <div key={idx} className="flex gap-2">
                              <span className="text-red-500 font-bold">[SKIP]</span>
                              <span>ID: {f.admissionNumber} | {f.name} - {f.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setExcelModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || parsedStudents.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl font-black text-xs tracking-wider uppercase transition-all shadow-md bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 cursor-pointer text-center"
                >
                  {uploading ? 'Registering Students...' : `Register ${parsedStudents.length} Students`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Database Confirmation Modal */}
      {clearModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-fadeIn">
            <button
              type="button"
              onClick={() => setClearModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 border-b border-red-100 bg-red-50/30 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-red-700 uppercase tracking-wider">
                  Wipe Academic Data
                </h3>
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">This action is permanent and irreversible</p>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs font-semibold text-slate-500">
              <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100 text-red-650 leading-relaxed font-bold space-y-2">
                <span className="font-black text-red-700 block text-[10px] uppercase tracking-wider">Scope of Deletion</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-600">
                  <div className="flex items-center gap-1.5 text-red-700">
                    <span className="text-red-500">✕</span> Classes & Arms
                  </div>
                  <div className="flex items-center gap-1.5 text-red-700">
                    <span className="text-red-500">✕</span> Student Profiles
                  </div>
                  <div className="flex items-center gap-1.5 text-red-700">
                    <span className="text-red-500">✕</span> Grades & Comments
                  </div>
                  <div className="flex items-center gap-1.5 text-red-700">
                    <span className="text-red-500">✕</span> Attendance Logs
                  </div>
                  <div className="flex items-center gap-1.5 text-red-700 col-span-2">
                    <span className="text-red-500">✕</span> Teacher Subject Assignments
                  </div>
                </div>
                
                <div className="pt-2 border-t border-red-100/50 mt-2 text-[10px] text-emerald-700 flex items-start gap-1">
                  <span className="text-emerald-500 font-extrabold">✓</span>
                  <span>School logins (Administrators, Head Teacher, Mr. Apeh Solomon, Mr. Tunde Bello) remain preserved.</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  To confirm database wipe, type <span className="text-red-600 font-extrabold">WIPE</span> below:
                </label>
                <input
                  type="text"
                  value={confirmWipeText}
                  onChange={(e) => setConfirmWipeText(e.target.value)}
                  placeholder="Type WIPE in uppercase"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-center font-black uppercase text-xs tracking-widest text-slate-800 focus:outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-semibold"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setClearModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={triggerClearDatabase}
                  disabled={clearing || confirmWipeText !== 'WIPE'}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-550 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-red-600/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {clearing ? 'Wiping...' : 'Wipe Everything'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';
