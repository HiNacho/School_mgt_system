'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, Plus, Shield, CheckCircle, AlertCircle, 
  RefreshCw, Sparkles, X, Mail, Phone, Calendar, UserPlus, UserCheck, ToggleLeft, ToggleRight, Trash2, Search, Eye, Edit, Archive
} from 'lucide-react';

interface TeacherMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  passportPhoto?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  createdAt: string;
  classTeacherArms?: any[];
  subjectAssignments?: any[];
}

import * as XLSX from 'xlsx';
import { UploadCloud, FileSpreadsheet, FileUp, AlertTriangle, Upload, Download } from 'lucide-react';


export default function TeachersDirectoryPage() {
  const [teachers, setTeachers] = useState<TeacherMember[]>([]);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Bulk Excel Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedTeachers, setParsedTeachers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  const downloadTemplate = () => {
    const wsData = [
      { 'First Name': 'Sarah', 'Last Name': 'Okon', 'Email': 'sarah.okon@school.com', 'Role': 'CLASS_TEACHER', 'Phone': '+234 803 111 2222' },
      { 'First Name': 'David', 'Last Name': 'Alabi', 'Email': 'david.alabi@school.com', 'Role': 'SUBJECT_TEACHER', 'Phone': '+234 803 333 4444' },
      { 'First Name': 'Grace', 'Last Name': 'Adenike', 'Email': 'grace.adenike@school.com', 'Role': 'HEAD_TEACHER', 'Phone': '+234 803 555 6666' }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'TeachersTemplate');
    XLSX.writeFile(wb, 'Teachers_Upload_Template.xlsx');
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
          const firstName = String(r['First Name'] || r['FirstName'] || r['Firstname'] || '').trim();
          const lastName = String(r['Last Name'] || r['LastName'] || r['Lastname'] || '').trim();
          const email = String(r['Email'] || r['Email Address'] || r['email'] || '').trim();
          const phone = String(r['Phone'] || r['Phone Number'] || r['phone'] || '').trim();
          let role = String(r['Role'] || r['role'] || 'SUBJECT_TEACHER').trim().toUpperCase();

          // Limit and normalize to teacher roles
          if (!['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'].includes(role)) {
            role = 'SUBJECT_TEACHER';
          }

          if (!firstName || !lastName || !email) continue;

          parsed.push({
            firstName,
            lastName,
            email,
            phone: phone || null,
            role
          });
        }

        setParsedTeachers(parsed);
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

    if (parsedTeachers.length === 0) {
      setErrorMsg('No teacher records parsed from Excel sheet to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/staff/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staff: parsedTeachers
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload teachers list');

      setUploadResult(json.data);
      setSuccessMsg(`Bulk teachers registration complete: successfully imported ${json.data.successCount} accounts!`);
      setParsedTeachers([]);
      setShowUploadModal(false);
      
      // Refresh teachers directory
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing bulk upload.');
    } finally {
      setUploading(false);
    }
  };


  // Setup options from academic configuration
  const [arms, setArms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Search & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Add Teacher passport photo Base64 state
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);

  // Teacher allocation states
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [isSubjectTeacher, setIsSubjectTeacher] = useState(true);
  const [classTeacherArmId, setClassTeacherArmId] = useState('');
  const [subjectAssignments, setSubjectAssignments] = useState<{ subjectId: string; armIds: string[] }[]>([]);

  // Active details drawer state
  const [viewingTeacher, setViewingTeacher] = useState<any | null>(null);

  // Editing State Variables
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTeacherId, setEditTeacherId] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassportPhoto, setEditPassportPhoto] = useState<string | null>(null);
  const [editIsClassTeacher, setEditIsClassTeacher] = useState(false);
  const [editIsSubjectTeacher, setEditIsSubjectTeacher] = useState(false);
  const [editClassTeacherArmId, setEditClassTeacherArmId] = useState('');
  const [editSubjectAssignments, setEditSubjectAssignments] = useState<{ subjectId: string; armIds: string[] }[]>([]);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadStaffRoster(sessionObj.school.id);
        loadSetupData(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
      }
    }
  }, []);

  const loadSetupData = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setArms(json.data.arms || []);
        setSubjects(json.data.subjects || []);
      }
    } catch (err) {
      console.error('Error fetching academic setup parameters:', err);
    }
  };

  const loadStaffRoster = async (schoolId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/staff?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch staff accounts');

      // Filter only teachers for this directory
      const allStaff = json.data || [];
      const teacherRoles = ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'];
      const filteredTeachers = allStaff.filter((s: any) => teacherRoles.includes(s.role));
      setTeachers(filteredTeachers);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with server directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (teacher: TeacherMember) => {
    setViewingTeacher(teacher);
    try {
      const res = await fetch(`/api/staff?schoolId=${school.id}&staffId=${teacher.id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setViewingTeacher(json.data);
      }
    } catch (e) {
      console.error('Failed to load full teacher details:', e);
    }
  };

  // Base64 file uploader handler
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

  const handleEditPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds the 2MB limit. Please upload a smaller passport photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditPassportPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addSubjectAssignmentRow = () => {
    setSubjectAssignments([...subjectAssignments, { subjectId: '', armIds: [] }]);
  };

  const removeSubjectAssignmentRow = (index: number) => {
    setSubjectAssignments(subjectAssignments.filter((_, i) => i !== index));
  };

  const groupFlatAssignments = (flatAssignments: any[]) => {
    const grouped = new Map<string, string[]>();
    flatAssignments?.forEach((sa: any) => {
      const existing = grouped.get(sa.subjectId) || [];
      if (!existing.includes(sa.armId)) {
        grouped.set(sa.subjectId, [...existing, sa.armId]);
      }
    });
    return Array.from(grouped.entries()).map(([subjectId, armIds]) => ({
      subjectId,
      armIds
    }));
  };

  const updateSubjectAssignment = (index: number, field: 'subjectId' | 'armIds', value: any) => {
    const updated = [...subjectAssignments];
    if (field === 'subjectId') {
      updated[index].subjectId = value as string;
    } else {
      updated[index].armIds = value as string[];
    }
    setSubjectAssignments(updated);
  };

  const addEditSubjectAssignmentRow = () => {
    setEditSubjectAssignments([...editSubjectAssignments, { subjectId: '', armIds: [] }]);
  };

  const removeEditSubjectAssignmentRow = (index: number) => {
    setEditSubjectAssignments(editSubjectAssignments.filter((_, i) => i !== index));
  };

  const updateEditSubjectAssignment = (index: number, field: 'subjectId' | 'armIds', value: any) => {
    const updated = [...editSubjectAssignments];
    if (field === 'subjectId') {
      updated[index].subjectId = value as string;
    } else {
      updated[index].armIds = value as string[];
    }
    setEditSubjectAssignments(updated);
  };

  const handleRegisterTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('Mandatory fields (First Name, Last Name, Email) must be filled.');
      return;
    }

    let determinedRole = 'SUBJECT_TEACHER';
    if (!isClassTeacher && !isSubjectTeacher) {
      setErrorMsg('Please select at least one instructional role: Class Teacher or Subject Teacher.');
      return;
    }

    if (isClassTeacher) {
      determinedRole = 'CLASS_TEACHER';
      if (!classTeacherArmId) {
        setErrorMsg('Please select the Class Arm that this Class Teacher manages.');
        return;
      }
    }

    if (isSubjectTeacher) {
      if (subjectAssignments.length === 0) {
        setErrorMsg('Please add at least one subject teaching assignment, or uncheck "Subject Teacher".');
        return;
      }
      for (let i = 0; i < subjectAssignments.length; i++) {
        const sa = subjectAssignments[i];
        if (!sa.subjectId || sa.armIds.length === 0) {
          setErrorMsg(`Subject Allocation Row #${i + 1} is incomplete. Select a subject and check at least one class arm.`);
          return;
        }
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const flattenedAssignments = isSubjectTeacher
        ? subjectAssignments.flatMap((sa) => sa.armIds.map((armId) => ({ subjectId: sa.subjectId, armId })))
        : [];

      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          firstName,
          lastName,
          email,
          role: determinedRole,
          phone,
          passportPhoto, // Pass base64 passport photo
          classTeacherArmId: isClassTeacher ? classTeacherArmId : undefined,
          subjectAssignments: flattenedAssignments
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register teacher profile.');

      setSuccessMsg(`Teacher credentials successfully active for Mr. ${lastName} ${firstName}!`);
      
      // Reset form states
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassportPhoto(null);
      setIsClassTeacher(false);
      setIsSubjectTeacher(true);
      setClassTeacherArmId('');
      setSubjectAssignments([]);
      setShowModal(false);
      
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (teacherId: string, currentStatus: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED') => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staffId: teacherId,
          status: nextStatus
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle account credentials.');

      setSuccessMsg(`Teacher status successfully updated to ${nextStatus}!`);
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating credentials.');
    }
  };

  const handleArchiveTeacher = async (teacherId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    setErrorMsg('');
    setSuccessMsg('');

    if (nextStatus === 'ARCHIVED') {
      const confirmAction = window.confirm("Are you sure you want to archive this teacher? They will be marked as fired/inactive.");
      if (!confirmAction) return;
    }

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staffId: teacherId,
          status: nextStatus
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to archive teacher.');

      setSuccessMsg(nextStatus === 'ARCHIVED' ? 'Teacher successfully archived!' : 'Teacher successfully reactivated!');
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error archiving teacher.');
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const confirmAction = window.confirm("Are you sure you want to completely DELETE this teacher profile? This will delete all their teaching assignments and cannot be undone.");
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/staff?schoolId=${school.id}&staffId=${teacherId}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete teacher.');

      setSuccessMsg('Teacher profile successfully deleted.');
      setSelectedTeacherIds(prev => prev.filter(id => id !== teacherId));
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting teacher.');
    }
  };

  const handleBatchArchive = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const confirmAction = window.confirm(`Are you sure you want to archive the ${selectedTeacherIds.length} selected teachers?`);
    if (!confirmAction) return;

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staffIds: selectedTeacherIds,
          status: 'ARCHIVED'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to batch archive teachers.');

      setSuccessMsg(`Successfully archived ${selectedTeacherIds.length} teachers.`);
      setSelectedTeacherIds([]);
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error archiving selected teachers.');
    }
  };

  const handleBatchDelete = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const confirmAction = window.confirm(`WARNING: Are you sure you want to completely DELETE the ${selectedTeacherIds.length} selected teachers? This will erase their schedules, assignments and cannot be undone!`);
    if (!confirmAction) return;

    try {
      const res = await fetch(`/api/staff?schoolId=${school.id}&staffIds=${selectedTeacherIds.join(',')}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to batch delete teachers.');

      setSuccessMsg(`Successfully deleted ${selectedTeacherIds.length} teachers.`);
      setSelectedTeacherIds([]);
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting selected teachers.');
    }
  };

  const handleUpdateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setEditError('First Name, Last Name, and Email are required.');
      return;
    }

    let determinedRole = editRole || 'SUBJECT_TEACHER';
    const isTeacherRole = editRole === 'CLASS_TEACHER' || editRole === 'SUBJECT_TEACHER';

    if (isTeacherRole || editIsClassTeacher || editIsSubjectTeacher) {
      if (!editIsClassTeacher && !editIsSubjectTeacher) {
        setEditError('Please select at least one instructional role: Class Teacher or Subject Teacher.');
        return;
      }

      if (editIsClassTeacher) {
        determinedRole = 'CLASS_TEACHER';
        if (!editClassTeacherArmId) {
          setEditError('Please select the Class Arm that this Class Teacher manages.');
          return;
        }
      } else {
        determinedRole = 'SUBJECT_TEACHER';
      }

      if (editIsSubjectTeacher) {
        if (editSubjectAssignments.length === 0) {
          setEditError('Please add at least one subject teaching assignment, or uncheck "Subject Teacher".');
          return;
        }
        for (let i = 0; i < editSubjectAssignments.length; i++) {
          const sa = editSubjectAssignments[i];
          if (!sa.subjectId || sa.armIds.length === 0) {
            setEditError(`Subject Allocation Row #${i + 1} is incomplete. Select a subject and check at least one class arm.`);
            return;
          }
        }
      }
    }

    setEditSubmitting(true);
    setEditError('');
    try {
      const flattenedAssignments = editIsSubjectTeacher
        ? editSubjectAssignments.flatMap((sa) => sa.armIds.map((armId) => ({ subjectId: sa.subjectId, armId })))
        : [];

      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: editTeacherId,
          schoolId: school.id,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.toLowerCase().trim(),
          phone: editPhone.trim() || null,
          role: determinedRole,
          passportPhoto: editPassportPhoto,
          classTeacherArmId: editIsClassTeacher ? editClassTeacherArmId : null,
          subjectAssignments: flattenedAssignments
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update teacher profile.');
      }

      await loadStaffRoster(school.id);

      // Update viewing teacher if currently open
      if (viewingTeacher && viewingTeacher.id === editTeacherId) {
        const detailRes = await fetch(`/api/staff?schoolId=${school.id}&staffId=${editTeacherId}`);
        const detailJson = await detailRes.json();
        if (detailRes.ok && detailJson.data) {
          setViewingTeacher(detailJson.data);
        } else {
          setViewingTeacher(null);
        }
      }

      setSuccessMsg(`Teacher profile successfully updated!`);
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating the profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const getRoleLabel = (r: string) => {
    switch(r) {
      case 'HEAD_TEACHER': return 'Head Teacher / Dean';
      case 'CLASS_TEACHER': return 'Class Teacher';
      case 'SUBJECT_TEACHER': return 'Subject Teacher';
      default: return r;
    }
  };

  // SEARCH AND PAGINATION FILTERS
  const filteredTeachers = teachers.filter(t => {
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    const emailSearch = t.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || emailSearch.includes(query);
  });

  const totalItems = filteredTeachers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentTeachers = filteredTeachers.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Teachers Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Manage instructional staff, teaching allocations, class assignments, and active system logins.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setUploadResult(null);
              setParsedTeachers([]);
              setShowUploadModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm shadow-slate-100 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-green-650" /> Bulk Upload Teachers
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Teacher
          </button>
        </div>

      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-150 text-green-600 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-150 text-red-650 text-xs flex items-center justify-between font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {/* Directory Table and Search Controls */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
        
        {/* Top filter bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 on query change
              }}
              className="w-full bg-slate-50 border border-slate-150 rounded-2xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:ring-0"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>

          <div className="text-[11px] text-slate-400 font-bold">
            Showing {totalItems > 0 ? startIndex + 1 : 0}-{endIndex} of {totalItems} teachers
          </div>
        </div>

        {/* Batch Actions Bar */}
        {selectedTeacherIds.length > 0 && (
          <div className="flex items-center justify-between bg-blue-50/80 border border-blue-100 rounded-2xl px-6 py-3 mb-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-blue-800">
                Selected {selectedTeacherIds.length} teachers
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBatchArchive}
                className="flex items-center gap-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Archive className="w-3.5 h-3.5" />
                Archive Selected
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Directory Table */}
        {loading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-6 h-6 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-xs font-semibold">Accessing teachers ledger...</p>
            </div>
          </div>
        ) : currentTeachers.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-200 rounded-3xl space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">No matching teachers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={currentTeachers.length > 0 && currentTeachers.every(t => selectedTeacherIds.includes(t.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const newIds = [...selectedTeacherIds];
                          currentTeachers.forEach(t => {
                            if (!newIds.includes(t.id)) newIds.push(t.id);
                          });
                          setSelectedTeacherIds(newIds);
                        } else {
                          const currentTeacherIds = currentTeachers.map(t => t.id);
                          setSelectedTeacherIds(prev => prev.filter(id => !currentTeacherIds.includes(id)));
                        }
                      }}
                      className="rounded border-slate-350 text-blue-650 focus:ring-blue-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-4">Teacher Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Phone Contact</th>
                  <th className="p-4">Cleared Role</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {currentTeachers.map((row) => (
                  <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${selectedTeacherIds.includes(row.id) ? 'bg-blue-50/20' : ''}`}>
                    {/* Checkbox */}
                    <td className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTeacherIds.includes(row.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeacherIds(prev => [...prev, row.id]);
                          } else {
                            setSelectedTeacherIds(prev => prev.filter(id => id !== row.id));
                          }
                        }}
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                      />
                    </td>

                    {/* Name */}
                    <td className="p-4">
                      <span className="font-extrabold text-sm text-slate-800 block">
                        Mr. {row.lastName} {row.firstName}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="p-4 text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {row.email}
                      </span>
                    </td>

                    {/* Phone */}
                    <td className="p-4 text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {row.phone}
                      </span>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border ${
                        row.role === 'CLASS_TEACHER'
                          ? 'bg-green-50 text-green-600 border-green-100'
                          : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {getRoleLabel(row.role)}
                      </span>
                    </td>

                    {/* Toggle Status */}
                    <td className="p-4">
                      <div className="flex justify-center items-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (row.status === 'ARCHIVED') {
                              handleArchiveTeacher(row.id, row.status);
                            } else {
                              handleToggleStatus(row.id, row.status);
                            }
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border transition-all ${
                            row.status === 'ACTIVE'
                              ? 'bg-green-50 text-green-600 border-green-150 hover:bg-green-100'
                              : row.status === 'ARCHIVED'
                              ? 'bg-amber-50 text-amber-600 border-amber-150 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {row.status === 'ACTIVE' ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-green-500" />
                              Active
                            </>
                          ) : row.status === 'ARCHIVED' ? (
                            <>
                              <Archive className="w-4 h-4 text-amber-500" />
                              Archived
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              Locked
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center font-semibold">
                      <div className="flex justify-center items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(row)}
                          title="View Details"
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditTeacherId(row.id);
                            setEditFirstName(row.firstName);
                            setEditLastName(row.lastName);
                            setEditEmail(row.email);
                            setEditPhone(row.phone === 'Not Provided' ? '' : row.phone);
                            setEditRole(row.role || '');
                            setEditPassportPhoto(row.passportPhoto || null);
                            
                            const hasClassArm = row.classTeacherArms && row.classTeacherArms.length > 0;
                            setEditIsClassTeacher(hasClassArm || row.role === 'CLASS_TEACHER');
                            setEditClassTeacherArmId(row.classTeacherArms?.[0]?.id || '');
                            
                            const hasSubjects = row.subjectAssignments && row.subjectAssignments.length > 0;
                            setEditIsSubjectTeacher(hasSubjects || row.role === 'SUBJECT_TEACHER');
                            setEditSubjectAssignments(groupFlatAssignments(row.subjectAssignments || []));
                            
                            setEditError('');
                            setShowEditModal(true);
                          }}
                          title="Edit Profile"
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveTeacher(row.id, row.status)}
                          title={row.status === 'ARCHIVED' ? "Reactivate Teacher" : "Archive Teacher (Fire)"}
                          className={`p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer ${
                            row.status === 'ARCHIVED' ? 'text-amber-500 hover:text-amber-700' : 'text-slate-400 hover:text-amber-600'
                          }`}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(row.id)}
                          title="Delete Teacher"
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-650 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      {/* Details viewing drawer */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              type="button"
              onClick={() => setViewingTeacher(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {viewingTeacher.passportPhoto ? (
                  <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-100 flex-shrink-0">
                    <img 
                      src={viewingTeacher.passportPhoto} 
                      alt={`${viewingTeacher.firstName} ${viewingTeacher.lastName}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm flex-shrink-0">
                    {viewingTeacher.firstName[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Mr. {viewingTeacher.lastName} {viewingTeacher.firstName}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{getRoleLabel(viewingTeacher.role)}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2 text-xs font-semibold text-slate-500">
                <p>Email Address: <strong className="text-slate-700 font-mono">{viewingTeacher.email}</strong></p>
                <p>Contact Phone: <strong className="text-slate-700 font-mono">{viewingTeacher.phone}</strong></p>
                <p>Access Status: <strong className={viewingTeacher.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}>{viewingTeacher.status}</strong></p>
                <p>Registration Date: <strong className="text-slate-700">{new Date(viewingTeacher.createdAt).toLocaleDateString()}</strong></p>
              </div>

              {/* Class Teacher Allocation */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-left">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Classroom In Charge</span>
                {viewingTeacher.classTeacherArms && viewingTeacher.classTeacherArms.length > 0 ? (
                  viewingTeacher.classTeacherArms.map((arm: any) => (
                    <div key={arm.id} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-150 rounded-xl text-[10px] font-black tracking-wider uppercase font-mono shadow-sm">
                      Form Teacher: {arm.class?.name || 'Class'} {arm.name}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-450 italic text-[11px] font-medium block">No Class Arm assigned (Subject Instructor only)</span>
                )}
              </div>

              {/* Subject Allocations */}
              <div className="border-t border-slate-100 pt-3 space-y-1.5 text-left">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Taught Subject Allocations</span>
                {viewingTeacher.subjectAssignments && viewingTeacher.subjectAssignments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {viewingTeacher.subjectAssignments.map((sa: any) => (
                      <div key={sa.id} className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold">
                        {sa.subject?.name || 'Subject'} ({sa.class?.name || ''}{sa.arm?.name || ''})
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-450 italic text-[11px] font-medium block">No active teaching assignments loaded</span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditTeacherId(viewingTeacher.id);
                    setEditFirstName(viewingTeacher.firstName);
                    setEditLastName(viewingTeacher.lastName);
                    setEditEmail(viewingTeacher.email);
                    setEditPhone(viewingTeacher.phone === 'Not Provided' ? '' : viewingTeacher.phone);
                    setEditRole(viewingTeacher.role || '');
                    setEditPassportPhoto(viewingTeacher.passportPhoto || null);
                    
                    const hasClassArm = viewingTeacher.classTeacherArms && viewingTeacher.classTeacherArms.length > 0;
                    setEditIsClassTeacher(hasClassArm || viewingTeacher.role === 'CLASS_TEACHER');
                    setEditClassTeacherArmId(viewingTeacher.classTeacherArms?.[0]?.id || '');
                    
                    const hasSubjects = viewingTeacher.subjectAssignments && viewingTeacher.subjectAssignments.length > 0;
                    setEditIsSubjectTeacher(hasSubjects || viewingTeacher.role === 'SUBJECT_TEACHER');
                    setEditSubjectAssignments(groupFlatAssignments(viewingTeacher.subjectAssignments || []));
                    
                    setEditError('');
                    setShowEditModal(true);
                  }}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 transition-colors text-center flex items-center justify-center cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-400 animate-pulse" /> Edit Profile
                </button>
                <Link
                  href={`/dashboard/teachers/${viewingTeacher.id}`}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-600/10 transition-colors text-center flex items-center justify-center"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" /> View Schedule
                </Link>
                <button
                  type="button"
                  onClick={() => setViewingTeacher(null)}
                  className="py-2 px-5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Teacher drawer/modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-500" /> Add Teaching Staff Account
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterTeacher} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
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
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher Passport Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold hover:file:bg-blue-100" 
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
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Staff Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. grace.adenike@school.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0 transition-colors font-mono"
                  />
                </div>

                {/* Sub-Roles Panel */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-4">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher Roles & Assignments</span>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Class Teacher Checkbox */}
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-150 cursor-pointer hover:border-slate-200 transition-colors shadow-sm">
                      <input
                        type="checkbox"
                        checked={isClassTeacher}
                        onChange={(e) => {
                          setIsClassTeacher(e.target.checked);
                          if (e.target.checked && !classTeacherArmId && arms.length > 0) {
                            setClassTeacherArmId(arms[0].id);
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="block text-xs font-black text-slate-800">Class Teacher</span>
                        <span className="block text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Form Master</span>
                      </div>
                    </label>

                    {/* Subject Teacher Checkbox */}
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-150 cursor-pointer hover:border-slate-200 transition-colors shadow-sm">
                      <input
                        type="checkbox"
                        checked={isSubjectTeacher}
                        onChange={(e) => {
                          setIsSubjectTeacher(e.target.checked);
                          if (e.target.checked && subjectAssignments.length === 0) {
                            addSubjectAssignmentRow();
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="block text-xs font-black text-slate-800">Subject Teacher</span>
                        <span className="block text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Instructional</span>
                      </div>
                    </label>
                  </div>

                  {/* Class Leadership Dropdown */}
                  {isClassTeacher && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Classroom Arm Leadership</label>
                      <select
                        value={classTeacherArmId}
                        onChange={(e) => setClassTeacherArmId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="">-- Select Class Arm --</option>
                        {arms.map((arm) => (
                          <option key={arm.id} value={arm.id}>
                            {arm.class?.name} {arm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subject Allocations List */}
                  {isSubjectTeacher && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Teaching Subject Allocations</label>
                        <button
                          type="button"
                          onClick={addSubjectAssignmentRow}
                          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-500"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Assignment
                        </button>
                      </div>

                      {subjectAssignments.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-white border border-slate-200 border-dashed">
                          <span className="text-[10px] text-slate-400 font-bold">No subject assignments allocated.</span>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-65 overflow-y-auto pr-1">
                          {subjectAssignments.map((assignment, index) => (
                            <div key={index} className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignment.subjectId}
                                  onChange={(e) => updateSubjectAssignment(index, 'subjectId', e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                                >
                                  <option value="">-- Select Subject --</option>
                                  {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => removeSubjectAssignmentRow(index)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Remove Assignment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-1">
                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Teaching Class Arms</span>
                                <div className="flex flex-wrap gap-1">
                                  {arms.map((arm) => {
                                    const isChecked = assignment.armIds.includes(arm.id);
                                    return (
                                      <button
                                        key={arm.id}
                                        type="button"
                                        onClick={() => {
                                          const newArmIds = isChecked
                                            ? assignment.armIds.filter(id => id !== arm.id)
                                            : [...assignment.armIds, arm.id];
                                          updateSubjectAssignment(index, 'armIds', newArmIds);
                                        }}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                          isChecked
                                            ? 'bg-blue-50 text-blue-600 border-blue-150'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {arm.class?.name} {arm.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Creating...' : 'Deploy Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#c3ebfa] px-6 py-5 relative">
              <h3 className="text-base font-extrabold text-slate-900">
                Update Staff Profile
              </h3>
              <p className="text-[10px] text-slate-650 font-bold uppercase mt-0.5 tracking-wider">
                Modify Registry Records & Allocations
              </p>
              <button 
                type="button"
                onClick={() => setShowEditModal(false)}
                className="absolute top-5 right-6 w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 flex items-center justify-center shadow-sm transition-all text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateTeacherSubmit} className="p-6 flex flex-col space-y-4 font-semibold text-xs text-slate-650 overflow-hidden">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1.5 text-left">
                {/* Passport photo edit field */}
                <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-150 rounded-2xl mb-2 text-left">
                  <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                    {editPassportPhoto ? (
                      <img src={editPassportPhoto} alt="Passport preview" className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-slate-350" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Edit Passport Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-blue-50 file:text-blue-600 file:font-bold hover:file:bg-blue-100" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      placeholder="e.g. Apeh"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                      placeholder="e.g. Solomon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-mono"
                    placeholder="e.g. solomon@greenwood.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-mono"
                    placeholder="e.g. +234 803 123 4567"
                  />
                </div>

                {/* Sub-Roles Panel */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-4">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher Roles & Assignments</span>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Class Teacher Checkbox */}
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-150 cursor-pointer hover:border-slate-200 transition-colors shadow-sm">
                      <input
                        type="checkbox"
                        checked={editIsClassTeacher}
                        onChange={(e) => {
                          setEditIsClassTeacher(e.target.checked);
                          if (e.target.checked && !editClassTeacherArmId && arms.length > 0) {
                            setEditClassTeacherArmId(arms[0].id);
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="block text-xs font-black text-slate-800">Class Teacher</span>
                        <span className="block text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Form Master</span>
                      </div>
                    </label>

                    {/* Subject Teacher Checkbox */}
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-150 cursor-pointer hover:border-slate-200 transition-colors shadow-sm">
                      <input
                        type="checkbox"
                        checked={editIsSubjectTeacher}
                        onChange={(e) => {
                          setEditIsSubjectTeacher(e.target.checked);
                          if (e.target.checked && editSubjectAssignments.length === 0) {
                            addEditSubjectAssignmentRow();
                          }
                        }}
                        className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-0"
                      />
                      <div>
                        <span className="block text-xs font-black text-slate-800">Subject Teacher</span>
                        <span className="block text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Instructional</span>
                      </div>
                    </label>
                  </div>

                  {/* Class Leadership Dropdown */}
                  {editIsClassTeacher && (
                    <div className="space-y-1.5 animate-fadeIn">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Classroom Arm Leadership</label>
                      <select
                        value={editClassTeacherArmId}
                        onChange={(e) => setEditClassTeacherArmId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                      >
                        <option value="">-- Select Class Arm --</option>
                        {arms.map((arm) => (
                          <option key={arm.id} value={arm.id}>
                            {arm.class?.name} {arm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subject Allocations List */}
                  {editIsSubjectTeacher && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <div className="flex justify-between items-center">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Teaching Subject Allocations</label>
                        <button
                          type="button"
                          onClick={addEditSubjectAssignmentRow}
                          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-500"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Assignment
                        </button>
                      </div>

                      {editSubjectAssignments.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-white border border-slate-200 border-dashed">
                          <span className="text-[10px] text-slate-400 font-bold">No subject assignments allocated.</span>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-65 overflow-y-auto pr-1">
                          {editSubjectAssignments.map((assignment, index) => (
                            <div key={index} className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-slate-150 shadow-sm animate-fadeIn">
                              <div className="flex items-center gap-2">
                                <select
                                  value={assignment.subjectId}
                                  onChange={(e) => updateEditSubjectAssignment(index, 'subjectId', e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-250 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none"
                                >
                                  <option value="">-- Select Subject --</option>
                                  {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => removeEditSubjectAssignmentRow(index)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                                  title="Remove Assignment"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="space-y-1">
                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Teaching Class Arms</span>
                                <div className="flex flex-wrap gap-1">
                                  {arms.map((arm) => {
                                    const isChecked = assignment.armIds.includes(arm.id);
                                    return (
                                      <button
                                        key={arm.id}
                                        type="button"
                                        onClick={() => {
                                          const newArmIds = isChecked
                                            ? assignment.armIds.filter(id => id !== arm.id)
                                            : [...assignment.armIds, arm.id];
                                          updateEditSubjectAssignment(index, 'armIds', newArmIds);
                                        }}
                                        className={`px-2.5 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                                          isChecked
                                            ? 'bg-blue-50 text-blue-600 border-blue-150'
                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {arm.class?.name} {arm.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel Upload Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" /> Bulk Import Teachers
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedTeachers([]);
                  setUploadResult(null);
                }}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 font-semibold text-xs text-left">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">Excel Import</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  Upload an Excel spreadsheet to import your teacher registry in bulk. Download the template, fill in the records, and upload.
                </p>
              </div>

              {/* Download Template Panel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">Teacher Roster Template</span>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Columns: First Name, Last Name, Email, Role, Phone</span>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold transition-all border border-slate-200 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Upload Spreadsheet (.xlsx, .xls)</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-350 bg-slate-50 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-2">
                  <UploadCloud className="w-8 h-8 text-slate-300" />
                  <div>
                    <span className="block text-xs font-bold text-slate-700">Choose or drag Excel file here</span>
                    <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Max 5MB · .xlsx or .xls only</span>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
              </div>

              {/* Live Preview Registry Grid */}
              {parsedTeachers.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Preview — {parsedTeachers.length} accounts found
                  </span>
                  <div className="border border-slate-200 bg-white rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Name</th>
                          <th className="py-2.5 px-3">Email</th>
                          <th className="py-2.5 px-3">Role</th>
                          <th className="py-2.5 px-3">Phone</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                        {parsedTeachers.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-extrabold text-slate-800">{p.lastName}, {p.firstName}</td>
                            <td className="py-2 px-3">{p.email}</td>
                            <td className="py-2 px-3 uppercase text-[9px] font-bold text-sky-600">{p.role.replace('_', ' ')}</td>
                            <td className="py-2 px-3">{p.phone || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {uploadResult && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn text-[11px]">
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-extrabold text-slate-800">Import Results</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="text-emerald-600 font-bold">✓ {uploadResult.successCount} imported successfully</div>
                    <div className="text-red-500 font-bold">✗ {uploadResult.failCount} failed/skipped</div>
                  </div>
                  {uploadResult.failures.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto text-[10px] font-mono border-t border-slate-200 pt-2 text-red-500">
                      {uploadResult.failures.map((f: any, i: number) => (
                        <div key={i} className="leading-relaxed">
                          ⚠️ {f.name} ({f.email}): {f.error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedTeachers([]);
                  setUploadResult(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
              >
                Close
              </button>
              {parsedTeachers.length > 0 && (
                <button
                  type="button"
                  onClick={triggerExcelUpload}
                  disabled={uploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  {uploading ? 'Importing...' : 'Run Bulk Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';
