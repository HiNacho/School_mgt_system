'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Plus, Shield, CheckCircle, AlertCircle, 
  RefreshCw, Sparkles, X, Mail, Phone, Calendar, UserPlus, UserCheck, ToggleLeft, ToggleRight, Trash2, Edit,
  Upload, Download, Search
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  classTeacherArms?: any[];
  subjectAssignments?: any[];
}

export default function StaffAccountsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Setup options from academic configuration
  const [arms, setArms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Form Modal States
  const [showModal, setShowModal] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Enhanced Instructional Role Assignments States
  const [staffCategory, setStaffCategory] = useState<'TEACHER' | 'HEAD_TEACHER' | 'SCHOOL_ADMIN'>('TEACHER');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [isSubjectTeacher, setIsSubjectTeacher] = useState(true);
  const [classTeacherArmId, setClassTeacherArmId] = useState('');
  const [subjectAssignments, setSubjectAssignments] = useState<{ subjectId: string; armId: string }[]>([]);

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editing Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editStaffId, setEditStaffId] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStaffCategory, setEditStaffCategory] = useState<'TEACHER' | 'HEAD_TEACHER' | 'SCHOOL_ADMIN'>('TEACHER');

  // Bulk Excel Upload States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [parsedStaff, setParsedStaff] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [editIsClassTeacher, setEditIsClassTeacher] = useState(false);
  const [editIsSubjectTeacher, setEditIsSubjectTeacher] = useState(false);
  const [editClassTeacherArmId, setEditClassTeacherArmId] = useState('');
  const [editSubjectAssignments, setEditSubjectAssignments] = useState<{ subjectId: string; armId: string }[]>([]);
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete Staff States
  const [deleteStaffId, setDeleteStaffId] = useState('');
  const [deleteStaffName, setDeleteStaffName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    // Load local multi-tenant SaaS session context
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadStaffRoster(sessionObj.school.id);
        loadSetupData(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid authentication credentials.');
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
        setClasses(json.data.classes || []);
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

      setStaff(json.data || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with SQLite DB ledger.');
    } finally {
      setLoading(false);
    }
  };

  // Helper Row Inserters for Teacher Subject Allocations
  const addSubjectAssignmentRow = () => {
    setSubjectAssignments([...subjectAssignments, { subjectId: '', armId: '' }]);
  };

  const removeSubjectAssignmentRow = (index: number) => {
    setSubjectAssignments(subjectAssignments.filter((_, i) => i !== index));
  };

  const updateSubjectAssignment = (index: number, field: 'subjectId' | 'armId', value: string) => {
    const updated = [...subjectAssignments];
    updated[index][field] = value;
    setSubjectAssignments(updated);
  };

  const addEditSubjectAssignmentRow = () => {
    setEditSubjectAssignments([...editSubjectAssignments, { subjectId: '', armId: '' }]);
  };

  const removeEditSubjectAssignmentRow = (index: number) => {
    setEditSubjectAssignments(editSubjectAssignments.filter((_, i) => i !== index));
  };

  const updateEditSubjectAssignment = (index: number, field: 'subjectId' | 'armId', value: string) => {
    const updated = [...editSubjectAssignments];
    updated[index][field] = value;
    setEditSubjectAssignments(updated);
  };

  const downloadTemplate = () => {
    const wsData = [
      { 'First Name': 'Solomon', 'Last Name': 'Apeh', 'Email': 'mr.apeh@greenwood.com', 'Role': 'CLASS_TEACHER', 'Phone': '+234 803 111 2222' },
      { 'First Name': 'Jane', 'Last Name': 'Doe', 'Email': 'jane.doe@greenwood.com', 'Role': 'SUBJECT_TEACHER', 'Phone': '+234 803 333 4444' },
      { 'First Name': 'Victor', 'Last Name': 'Iheanacho', 'Email': 'victor@greenwood.com', 'Role': 'SCHOOL_ADMIN', 'Phone': '+234 803 555 6666' }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'StaffTemplate');
    XLSX.writeFile(wb, 'Staff_Upload_Template.xlsx');
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
          const role = String(r['Role'] || r['role'] || 'SUBJECT_TEACHER').trim().toUpperCase();

          if (!firstName || !lastName || !email) continue;

          parsed.push({
            firstName,
            lastName,
            email,
            phone: phone || null,
            role
          });
        }

        setParsedStaff(parsed);
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

    if (parsedStaff.length === 0) {
      setErrorMsg('No staff records parsed from Excel sheet to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/staff/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staff: parsedStaff
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to upload staff list');

      setUploadResult(json.data);
      setSuccessMsg(`Bulk staff registration complete: successfully imported ${json.data.successCount} accounts! Default login password for all new accounts is set to "password".`);
      setParsedStaff([]);
      setShowUploadModal(false);
      
      // Refresh staff roster
      const updatedRes = await fetch(`/api/staff?schoolId=${school.id}`);
      const updatedJson = await updatedRes.json();
      if (updatedRes.ok && updatedJson.success) {
        setStaff(updatedJson.data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing bulk upload.');
    } finally {
      setUploading(false);
    }
  };

  // 1. Create a new staff user profile with roles and dynamic assignments
  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      setErrorMsg('All mandatory fields (First Name, Last Name, Email) must be filled.');
      return;
    }

    let determinedRole = 'SUBJECT_TEACHER';
    if (staffCategory === 'SCHOOL_ADMIN') {
      determinedRole = 'SCHOOL_ADMIN';
    } else if (staffCategory === 'HEAD_TEACHER') {
      determinedRole = 'HEAD_TEACHER';
    } else {
      // Teaching Staff
      if (!isClassTeacher && !isSubjectTeacher) {
        setErrorMsg('Please select at least one teaching role: Class Teacher or Subject Teacher.');
        return;
      }

      if (isClassTeacher) {
        determinedRole = 'CLASS_TEACHER';
        if (!classTeacherArmId) {
          setErrorMsg('Please select the Class Arm that this Class Teacher manages.');
          return;
        }
      } else {
        determinedRole = 'SUBJECT_TEACHER';
      }

      if (isSubjectTeacher) {
        if (subjectAssignments.length === 0) {
          setErrorMsg('Please add at least one subject teaching assignment, or uncheck "Subject Teacher".');
          return;
        }
        for (let i = 0; i < subjectAssignments.length; i++) {
          const sa = subjectAssignments[i];
          if (!sa.subjectId || !sa.armId) {
            setErrorMsg(`Subject Allocation Row #${i + 1} is incomplete. Select both a Subject and a Class Arm.`);
            return;
          }
        }
      }
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          title: title || undefined,
          firstName,
          lastName,
          email,
          role: determinedRole,
          phone,
          classTeacherArmId: (determinedRole === 'CLASS_TEACHER' && isClassTeacher) ? classTeacherArmId : undefined,
          subjectAssignments: isSubjectTeacher ? subjectAssignments : []
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register staff account.');

      setSuccessMsg(`Staff account successfully initialized for ${lastName} ${firstName}! Default login password set to "password".`);
      
      // Reset form states
      setTitle('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setStaffCategory('TEACHER');
      setIsClassTeacher(false);
      setIsSubjectTeacher(true);
      setClassTeacherArmId('');
      setSubjectAssignments([]);
      setShowModal(false);
      
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with SQLite database.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Toggle active/inactive account status
  const handleToggleStatus = async (staffId: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          staffId,
          status: nextStatus
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle account credentials.');

      setSuccessMsg(`Staff account status successfully updated to ${nextStatus}!`);
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating credentials.');
    }
  };

  const handleUpdateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) {
      setEditError('First Name, Last Name, and Email are required.');
      return;
    }

    let determinedRole = 'SUBJECT_TEACHER';
    if (editStaffCategory === 'SCHOOL_ADMIN') {
      determinedRole = 'SCHOOL_ADMIN';
    } else if (editStaffCategory === 'HEAD_TEACHER') {
      determinedRole = 'HEAD_TEACHER';
    } else {
      // Teaching Staff
      if (!editIsClassTeacher && !editIsSubjectTeacher) {
        setEditError('Please select at least one teaching role: Class Teacher or Subject Teacher.');
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
          if (!sa.subjectId || !sa.armId) {
            setEditError(`Subject Allocation Row #${i + 1} is incomplete.`);
            return;
          }
        }
      }
    }

    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: editStaffId,
          schoolId: school.id,
          title: editTitle || null,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.toLowerCase().trim(),
          phone: editPhone.trim() || null,
          role: determinedRole,
          classTeacherArmId: (determinedRole === 'CLASS_TEACHER' && editIsClassTeacher) ? editClassTeacherArmId : null,
          subjectAssignments: editIsSubjectTeacher ? editSubjectAssignments : []
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update staff profile.');
      }

      await loadStaffRoster(school.id);

      setSuccessMsg(`Staff profile successfully updated!`);
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating the profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;
    setDeleting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/staff?staffId=${deleteStaffId}&schoolId=${school.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete staff account.');

      setSuccessMsg(`Staff account for ${deleteStaffName} has been successfully deleted.`);
      setDeleteStaffId('');
      setDeleteStaffName('');
      
      await loadStaffRoster(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleLabel = (r: string) => {
    switch(r) {
      case 'SCHOOL_ADMIN': return 'School Admin / Principal';
      case 'HEAD_TEACHER': return 'Head Teacher / Dean';
      case 'CLASS_TEACHER': return 'Class Teacher';
      case 'SUBJECT_TEACHER': return 'Subject Teacher';
      default: return r;
    }
  };

  // Multi-tenant styling parameters
  const isGreenwood = school?.slug === 'greenwood-secondary';
  const accentText = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10 shadow-md' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10 shadow-md';
  // Filter staff by search query
  const filteredStaff = staff.filter(s => {
    const fullName = `${s.firstName} ${s.lastName} ${s.lastName} ${s.firstName}`.toLowerCase();
    const email = s.email.toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    return fullName.includes(query) || email.includes(query);
  });

  // Slicing for client-side pagination
  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const activePage = Math.min(currentPage, totalPages || 1);
  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStaff = filteredStaff.slice(indexOfFirstItem, indexOfLastItem);

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">

      {/* 1. Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className={`h-1 w-full ${isGreenwood ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
        <div className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${accentBg}`}>
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-extrabold text-slate-900">Staff Registry</h1>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-lg">
              Manage staff accounts, assign roles, and control access for your school.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap items-center flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${buttonPrimary}`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Staff
            </button>
          </div>
        </div>
      </div>

      {/* 2. Status Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-600 font-bold ml-4">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* 3. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Staff */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentBg}`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Staff</p>
            <p className="text-2xl font-extrabold text-slate-800 leading-none mt-0.5">{staff.length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">registered accounts</p>
          </div>
        </div>

        {/* Active Logins */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-50 border border-sky-100 text-sky-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Accounts</p>
            <p className="text-2xl font-extrabold text-sky-600 leading-none mt-0.5">{staff.filter(s => s.status === 'ACTIVE').length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">of {staff.length} total</p>
          </div>
        </div>

        {/* Admins */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-100 text-amber-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Administrators</p>
            <p className="text-2xl font-extrabold text-amber-600 leading-none mt-0.5">{staff.filter(s => s.role === 'SCHOOL_ADMIN').length}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">admin accounts</p>
          </div>
        </div>
      </div>

      {/* 4. Staff Registry Roster Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-7 h-7 border-2 border-t-slate-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-semibold">Loading staff accounts...</p>
          </div>
        </div>
      ) : staff.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white border border-slate-150 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">No Staff Accounts</h4>
            <p className="text-xs text-slate-400 mt-1">No staff have been registered yet. Add one to get started.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden space-y-0">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Shield className={`w-4 h-4 ${accentText}`} /> Staff Registry
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Passwords default to "password" for new accounts</p>
            </div>
            
            {/* Functional Search Bar */}
            <div className="relative w-full sm:w-64 font-sans text-xs">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page index on filter
                }}
                placeholder="Search staff by name or email..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-slate-800 focus:outline-none focus:border-slate-300 transition-colors placeholder-slate-400 font-medium"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-700 text-[10px] font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {filteredStaff.length === 0 ? (
            <div className="p-12 text-center space-y-3 font-semibold text-xs text-slate-400">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <span className="block font-extrabold text-slate-700 text-sm">No matching staff accounts found</span>
              <span className="block font-normal text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                No records match "{searchQuery}". Try refining your search.
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto font-semibold">
              <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Staff Member</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Date Registered</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentStaff.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Details */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                          {row.lastName[0]}{row.firstName[0]}
                        </div>
                        <span className="font-extrabold text-sm text-slate-800">
                          {row.title ? `${row.title} ` : ''}{row.lastName} {row.firstName}
                        </span>
                      </div>
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
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                        row.role === 'SCHOOL_ADMIN' 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : row.role === 'HEAD_TEACHER'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : row.role === 'CLASS_TEACHER'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-sky-50 text-sky-700 border-sky-200'
                      }`}>
                        {getRoleLabel(row.role)}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-[10px] text-slate-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-300" />
                        {new Date(row.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Toggle Status */}
                    <td className="p-4">
                      <div className="flex justify-center items-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(row.id, row.status)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all ${
                            row.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {row.status === 'ACTIVE' ? (
                            <>
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                              Inactive
                            </>
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditStaffId(row.id);
                            setEditTitle(row.title || '');
                            setEditFirstName(row.firstName);
                            setEditLastName(row.lastName);
                            setEditEmail(row.email);
                            setEditPhone(row.phone === 'Not Provided' ? '' : row.phone);
                            
                            // Initialize role state
                            let cat: 'TEACHER' | 'HEAD_TEACHER' | 'SCHOOL_ADMIN' = 'TEACHER';
                            if (row.role === 'SCHOOL_ADMIN') {
                              cat = 'SCHOOL_ADMIN';
                            } else if (row.role === 'HEAD_TEACHER') {
                              cat = 'HEAD_TEACHER';
                            }
                            setEditStaffCategory(cat);

                            const hasClassArm = row.classTeacherArms && row.classTeacherArms.length > 0;
                            setEditIsClassTeacher(hasClassArm || row.role === 'CLASS_TEACHER');
                            setEditClassTeacherArmId(row.classTeacherArms?.[0]?.id || '');

                            const hasSubjects = row.subjectAssignments && row.subjectAssignments.length > 0;
                            setEditIsSubjectTeacher(hasSubjects || row.role === 'SUBJECT_TEACHER');
                            setEditSubjectAssignments(row.subjectAssignments?.map((sa: any) => ({
                              subjectId: sa.subjectId,
                              armId: sa.armId
                            })) || []);

                            setEditError('');
                            setShowEditModal(true);
                          }}
                          title="Edit Profile"
                          className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteStaffId(row.id);
                            setDeleteStaffName(`${row.lastName}, ${row.firstName}`);
                          }}
                          title="Delete Account"
                          className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
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

          {/* Client-Side Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center border-t border-slate-100 px-5 py-4 font-sans text-xs">
              {/* Previous Page Button */}
              <button
                type="button"
                disabled={activePage === 1}
                onClick={() => setCurrentPage(activePage - 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                ← Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, idx) => {
                  const pageNum = idx + 1;
                  const isCurrent = pageNum === activePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(activePage + 1)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL FORM: CREATE STAFF ACCOUNT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`bg-white border border-slate-200 rounded-3xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col transition-all duration-300 ${
            staffCategory === 'TEACHER' ? 'max-w-xl' : 'max-w-md'
          }`}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${accentText}`} /> Add Staff Account
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterStaff} className="p-6 flex flex-col space-y-4 text-xs font-semibold overflow-hidden">
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                <div className="grid grid-cols-5 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-sans">Title</label>
                    <select
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                    >
                      <option value="">None</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Miss">Miss</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Rev.">Rev.</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">First Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Grace"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Adenike"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. grace.adenike@school.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Role & Clearance</label>
                  <select
                    value={staffCategory}
                    onChange={(e) => {
                      const cat = e.target.value as 'TEACHER' | 'HEAD_TEACHER' | 'SCHOOL_ADMIN';
                      setStaffCategory(cat);
                      if (cat === 'TEACHER' && subjectAssignments.length === 0) {
                        setSubjectAssignments([{ subjectId: '', armId: '' }]);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-400"
                  >
                    <option value="TEACHER">Teaching Staff (Class / Subject teacher roles)</option>
                    <option value="HEAD_TEACHER">Head Teacher / Dean (Curriculum coordinator/reviews)</option>
                    <option value="SCHOOL_ADMIN">School Admin / Principal (Full administrative security controls)</option>
                  </select>
                </div>

                {/* Sub-Roles Panel for Teachers */}
                {staffCategory === 'TEACHER' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher Roles & Assignments</span>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Class Teacher Checkbox */}
                      <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={isClassTeacher}
                          onChange={(e) => {
                            setIsClassTeacher(e.target.checked);
                            if (e.target.checked && !classTeacherArmId && arms.length > 0) {
                              setClassTeacherArmId(arms[0].id);
                            }
                          }}
                          className={`mt-0.5 rounded border-slate-300 focus:ring-0 ${
                            isGreenwood ? 'text-emerald-600' : 'text-indigo-600'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-slate-800">Class Teacher</span>
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Assign as lead of a specific class arm</span>
                        </div>
                      </label>

                      {/* Subject Teacher Checkbox */}
                      <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={isSubjectTeacher}
                          onChange={(e) => {
                            setIsSubjectTeacher(e.target.checked);
                            if (e.target.checked && subjectAssignments.length === 0) {
                              addSubjectAssignmentRow();
                            }
                          }}
                          className={`mt-0.5 rounded border-slate-300 focus:ring-0 ${
                            isGreenwood ? 'text-emerald-600' : 'text-indigo-600'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-slate-800">Subject Teacher</span>
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Teaches specific subjects across multiple arms</span>
                        </div>
                      </label>
                    </div>

                    {/* Class Leadership Dropdown */}
                    {isClassTeacher && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Classroom Arm Leadership</label>
                        <select
                          value={classTeacherArmId}
                          onChange={(e) => setClassTeacherArmId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                        >
                          <option value="">-- Select Class Arm --</option>
                          {arms.map((arm) => (
                            <option key={arm.id} value={arm.id}>
                              {arm.class?.name} {arm.name} {arm.classTeacher ? `(Assigned: ${arm.classTeacher.lastName} ${arm.classTeacher.firstName})` : '(Unassigned)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${buttonPrimary}`}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Staff Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className={`bg-white border border-slate-200 rounded-3xl w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 transition-all duration-300 ${
              editStaffCategory === 'TEACHER' ? 'max-w-xl' : 'max-w-md'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${accentText}`} /> Edit Staff Profile
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Update credentials & role assignments
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateStaffSubmit} className="p-6 flex flex-col space-y-4 text-xs font-semibold text-slate-700 overflow-hidden">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 text-left">
                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-1 col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Title
                    </label>
                    <select
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                    >
                      <option value="">None</option>
                      <option value="Mr.">Mr.</option>
                      <option value="Mrs.">Mrs.</option>
                      <option value="Miss">Miss</option>
                      <option value="Ms.">Ms.</option>
                      <option value="Dr.">Dr.</option>
                      <option value="Prof.">Prof.</option>
                      <option value="Rev.">Rev.</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                      placeholder="e.g. Apeh"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                      placeholder="e.g. Solomon"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors font-mono"
                    placeholder="e.g. solomon@greenwood.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-400 transition-colors font-mono"
                    placeholder="e.g. +234 803 123 4567"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Role & Clearance
                  </label>
                  <select
                    value={editStaffCategory}
                    onChange={(e) => {
                      const cat = e.target.value as 'TEACHER' | 'HEAD_TEACHER' | 'SCHOOL_ADMIN';
                      setEditStaffCategory(cat);
                      if (cat === 'TEACHER' && editSubjectAssignments.length === 0) {
                        setEditSubjectAssignments([{ subjectId: '', armId: '' }]);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 font-bold focus:outline-none focus:border-slate-400"
                  >
                    <option value="TEACHER">Teaching Staff (Class / Subject teacher roles)</option>
                    <option value="HEAD_TEACHER">Head Teacher / Dean (Curriculum coordinator/reviews)</option>
                    <option value="SCHOOL_ADMIN">School Admin / Principal (Full administrative security controls)</option>
                  </select>
                </div>

                {/* Sub-Roles Panel for Teachers */}
                {editStaffCategory === 'TEACHER' && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher Roles & Assignments</span>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Class Teacher Checkbox */}
                      <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={editIsClassTeacher}
                          onChange={(e) => {
                            setEditIsClassTeacher(e.target.checked);
                            if (e.target.checked && !editClassTeacherArmId && arms.length > 0) {
                              setEditClassTeacherArmId(arms[0].id);
                            }
                          }}
                          className={`mt-0.5 rounded border-slate-300 focus:ring-0 ${
                            isGreenwood ? 'text-emerald-600' : 'text-indigo-600'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-slate-800">Class Teacher</span>
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Assign as lead of a specific class arm</span>
                        </div>
                      </label>

                      {/* Subject Teacher Checkbox */}
                      <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
                        <input
                          type="checkbox"
                          checked={editIsSubjectTeacher}
                          onChange={(e) => {
                            setEditIsSubjectTeacher(e.target.checked);
                            if (e.target.checked && editSubjectAssignments.length === 0) {
                              addEditSubjectAssignmentRow();
                            }
                          }}
                          className={`mt-0.5 rounded border-slate-300 focus:ring-0 ${
                            isGreenwood ? 'text-emerald-600' : 'text-indigo-600'
                          }`}
                        />
                        <div>
                          <span className="block text-xs font-extrabold text-slate-800">Subject Teacher</span>
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5">Teaches specific subjects across multiple arms</span>
                        </div>
                      </label>
                    </div>

                    {/* Class Leadership Dropdown */}
                    {editIsClassTeacher && (
                      <div className="space-y-1.5 animate-in fade-in duration-200">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Classroom Arm</label>
                        <select
                          value={editClassTeacherArmId}
                          onChange={(e) => setEditClassTeacherArmId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
                        >
                          <option value="">-- Select Class Arm --</option>
                          {arms.map((arm) => (
                            <option key={arm.id} value={arm.id}>
                              {arm.class?.name} {arm.name} {arm.classTeacher ? `(Assigned: ${arm.classTeacher.lastName} ${arm.classTeacher.firstName})` : '(Unassigned)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Subject Allocations List */}
                    {editIsSubjectTeacher && (
                      <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Subject Allocations</label>
                          <button
                            type="button"
                            onClick={addEditSubjectAssignmentRow}
                            className={`flex items-center gap-1 text-[10px] font-extrabold transition-colors ${
                              isGreenwood ? 'text-emerald-600 hover:text-emerald-700' : 'text-indigo-600 hover:text-indigo-700'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>

                        {editSubjectAssignments.length === 0 ? (
                          <div className="p-4 text-center rounded-xl bg-white border border-slate-200 border-dashed">
                            <span className="text-[10px] text-slate-400 font-semibold">No subject assignments. Click "Add".</span>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {editSubjectAssignments.map((assignment, index) => (
                              <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 animate-in slide-in-from-top-1 duration-150">
                                <select
                                  value={assignment.subjectId}
                                  onChange={(e) => updateEditSubjectAssignment(index, 'subjectId', e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none"
                                >
                                  <option value="">-- Subject --</option>
                                  {subjects.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={assignment.armId}
                                  onChange={(e) => updateEditSubjectAssignment(index, 'armId', e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-700 focus:outline-none"
                                >
                                  <option value="">-- Class Arm --</option>
                                  {arms.map((arm) => (
                                    <option key={arm.id} value={arm.id}>
                                      {arm.class?.name} {arm.name}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => removeEditSubjectAssignmentRow(index)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
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
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${buttonPrimary}`}
                >
                  {editSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Bulk Excel Upload Modal Overlay */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Upload className={`w-5 h-5 ${accentText}`} /> Bulk Import Staff
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setParsedStaff([]);
                  setUploadResult(null);
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 font-semibold text-xs">
              <div className="space-y-1">
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wide">Excel Import</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  Upload an Excel spreadsheet to import your staff roster in bulk. Download the template, fill it in, and upload.
                </p>
              </div>

              {/* Download Template Panel */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">Staff Roster Template</span>
                  <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Columns: First Name, Last Name, Email, Role, Phone</span>
                </div>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold transition-all border border-slate-200"
                >
                  <Download className="w-4 h-4" /> Download Template
                </button>
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="space-y-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Upload Spreadsheet (.xlsx, .xls)</label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-slate-300 bg-slate-50 rounded-2xl p-6 transition-all duration-300 flex flex-col items-center justify-center text-center space-y-2">
                  <Upload className="w-8 h-8 text-slate-300" />
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
              {parsedStaff.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Preview — {parsedStaff.length} accounts found
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
                        {parsedStaff.map((p, idx) => (
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
                    <Shield className={`w-4 h-4 ${accentText}`} />
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
                  setParsedStaff([]);
                  setUploadResult(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
              >
                Close
              </button>
              {parsedStaff.length > 0 && (
                <button
                  type="button"
                  onClick={triggerExcelUpload}
                  disabled={uploading}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 cursor-pointer ${buttonPrimary}`}
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'Importing...' : 'Run Bulk Import'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 9. DELETE CONFIRMATION MODAL */}
      {deleteStaffId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" /> Delete Staff Account
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setDeleteStaffId('');
                  setDeleteStaffName('');
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                <div className="space-y-1">
                  <span className="font-extrabold block">This action cannot be undone</span>
                  <span className="font-normal block text-[11px] leading-relaxed">
                    The staff record for <strong className="font-black text-red-600">{deleteStaffName}</strong> will be permanently removed.
                  </span>
                </div>
              </div>
              <p className="font-normal text-[11px] text-slate-400 leading-relaxed">
                All subject allocations, form teacher assignments, and credential privileges linked to this account will be erased. Student grades and historic marks will be preserved under "unassigned".
              </p>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex justify-end gap-3 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setDeleteStaffId('');
                  setDeleteStaffName('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteStaff}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}
export const dynamic = 'force-dynamic';
