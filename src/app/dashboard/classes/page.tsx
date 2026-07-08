'use client';

import React, { useEffect, useState } from 'react';
import { 
  Layers, Plus, Shield, Users, CheckCircle, AlertCircle, 
  RefreshCw, Sparkles, X, UserCheck, GraduationCap, ChevronRight,
  FileSpreadsheet, UploadCloud, FileUp, AlertTriangle, Search, Info, HelpCircle,
  Trash2
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassLevel {
  id: string;
  name: string;
  _count?: {
    students: number;
  };
}

interface Arm {
  id: string;
  name: string;
  classId: string;
  classTeacherId: string | null;
  class: ClassLevel;
  classTeacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    students: number;
  };
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface StudentRosterItem {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  admissionNumber: string;
  gender: string;
  status: string;
}

export default function ClassesAndArmsPage() {
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Modals & Drawers States
  const [showClassModal, setShowClassModal] = useState(false);
  const [showArmModal, setShowArmModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newArmName, setNewArmName] = useState('');
  const [newArmClassId, setNewArmClassId] = useState('');
  const [newArmTeacherId, setNewArmTeacherId] = useState('');

  // Roster Drawer State
  const [selectedArm, setSelectedArm] = useState<Arm | null>(null);
  const [rosterStudents, setRosterStudents] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');

  // Bulk Excel Upload State
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [drawerErrorMsg, setDrawerErrorMsg] = useState('');

  useEffect(() => {
    // Load local SaaS session context
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadClassesData(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid authentication session context.');
      }
    }
  }, []);

  const loadClassesData = async (schoolId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load classroom registries');
      
      setClasses(json.data.classes || []);
      setArms(json.data.arms || []);
      setStaff(json.data.staff || []);

      // Set default class select option for Arm creation
      if (json.data.classes && json.data.classes.length > 0) {
        setNewArmClassId(json.data.classes[0].id);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with database ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArm = async (armId: string) => {
    if (!confirm('Are you sure you want to delete this class division (Arm)? All grading sheets, assignments, and records for this division will be permanently lost.')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch(`/api/classes?schoolId=${school.id}&armId=${armId}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete class division.');

      setSuccessMsg(json.message);
      if (selectedArm && selectedArm.id === armId) {
        setSelectedArm(null);
      }
      await loadClassesData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing delete request.');
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class cohort level? All arms and rosters inside it must be deleted first.')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      const res = await fetch(`/api/classes?schoolId=${school.id}&classId=${classId}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete class level.');

      setSuccessMsg(json.message);
      await loadClassesData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing delete request.');
    }
  };

  // Load roster students for a selected arm subdivision
  const loadRosterStudents = async (arm: Arm) => {
    if (!school) return;
    setRosterLoading(true);
    setDrawerErrorMsg('');
    setParsedStudents([]);
    setUploadResult(null);
    try {
      const res = await fetch(`/api/students?schoolId=${school.id}&classId=${arm.classId}&armId=${arm.id}&status=ALL`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch roster students');
      setRosterStudents(json.data || []);
    } catch (e: any) {
      setDrawerErrorMsg(e.message || 'Failed to load arm stream roster.');
    } finally {
      setRosterLoading(false);
    }
  };

  useEffect(() => {
    if (selectedArm) {
      loadRosterStudents(selectedArm);
    } else {
      setRosterStudents([]);
    }
  }, [selectedArm]);

  // 1. Create Class Level (e.g. JSS 1, SSS 3)
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CLASS',
          schoolId: school.id,
          name: newClassName.trim()
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create class level.');

      setSuccessMsg(`Academic level "${newClassName}" initialized successfully!`);
      setNewClassName('');
      setShowClassModal(false);
      await loadClassesData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error compiling database rules.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Create Arm Subdivision (e.g. A, Gold)
  const handleCreateArm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArmName.trim() || !newArmClassId) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ARM',
          schoolId: school.id,
          name: newArmName.trim(),
          classId: newArmClassId,
          classTeacherId: newArmTeacherId || null
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to subdivide classroom.');

      setSuccessMsg(`Class division "${json.data.class.name} ${newArmName}" successfully deployed!`);
      setNewArmName('');
      setNewArmTeacherId('');
      setShowArmModal(false);
      await loadClassesData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error mapping database parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Assign Class Teacher to Arm Subdivision (Inline Dropdown Update)
  const handleTeacherAssignment = async (armId: string, teacherId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/classes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          armId,
          classTeacherId: teacherId || null
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update teacher assignment.');

      setSuccessMsg(
        json.data.classTeacher 
          ? `Class Teacher ${json.data.classTeacher.firstName} ${json.data.classTeacher.lastName} assigned to oversee ${json.data.class.name} ${json.data.name}!` 
          : `Teacher assignment removed from ${json.data.class.name} ${json.data.name}.`
      );
      
      // Refresh current states
      await loadClassesData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating staff routing assignment.');
    }
  };

  // Excel Roster Sheet download
  const downloadTemplate = () => {
    const wsData = [
      { 'Student Name': 'Nwachukwu, Emeka', 'Admission Number': 'GW-2026-901', 'Gender': 'MALE' },
      { 'Student Name': 'Alabi, Yetunde', 'Admission Number': 'GW-2026-902', 'Gender': 'FEMALE' },
      { 'Student Name': 'Bello, Zainab', 'Admission Number': 'GW-2026-903', 'Gender': 'FEMALE' }
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'RosterUpload');
    XLSX.writeFile(wb, `${selectedArm ? `${selectedArm.class.name}_Arm_${selectedArm.name}` : 'Student'}_Roster_Template.xlsx`);
  };

  // Excel file parsing
  const processExcelData = (file: File) => {
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
        setDrawerErrorMsg('');
      } catch (err) {
        setDrawerErrorMsg('Failed to parse Excel sheet. Ensure the file is valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processExcelData(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelData(e.dataTransfer.files[0]);
    }
  };

  // Execute Direct Arm bulk enrollment upload
  const triggerExcelUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArm) return;
    
    setDrawerErrorMsg('');
    setUploading(true);

    if (parsedStudents.length === 0) {
      setDrawerErrorMsg('No students parsed from Excel sheet to upload.');
      setUploading(false);
      return;
    }

    try {
      const res = await fetch('/api/students/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          classId: selectedArm.classId,
          armId: selectedArm.id,
          students: parsedStudents
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk enrollment failed.');

      setUploadResult(json.data);
      setParsedStudents([]);
      
      // Reload lists
      await loadRosterStudents(selectedArm);
      await loadClassesData(school.id);
    } catch (err: any) {
      setDrawerErrorMsg(err.message || 'A network exception occurred during direct uploader.');
    } finally {
      setUploading(false);
    }
  };

  // Multi-tenant styling parameters
  const isGreenwood = school?.slug === 'nacho-secondary';
  
  // Theme Color Configurations (NachoEd Premium Light Mode Aesthetic)
  const accentText = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-indigo-50 text-indigo-800 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-150 shadow-md' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-150 shadow-md';
  const borderHighlight = isGreenwood ? 'border-emerald-200' : 'border-indigo-200';
  const textDark = 'text-slate-800';

  // Filter roster by search
  const filteredRoster = rosterStudents.filter(s => {
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return fullName.includes(rosterSearch.toLowerCase()) || s.admissionNumber.toLowerCase().includes(rosterSearch.toLowerCase());
  });

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Layers className={`w-6 h-6 ${accentText}`} /> Academic Classes & Streams
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Delegate oversight duties, assign class teachers, and upload student rosters per individual arm stream subdivisions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowClassModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> New Class Level
          </button>

          <button
            type="button"
            onClick={() => setShowArmModal(true)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${buttonPrimary}`}
          >
            <Plus className="w-3.5 h-3.5" /> Subdivide Class (Arm)
          </button>
        </div>
      </div>

      {/* 2. Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
        </div>
      )}

      {/* 3. Operational Statistics (Light Pastel Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className={`p-3.5 rounded-2xl ${accentBg} flex-shrink-0`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Tiers</span>
            <span className="text-lg font-extrabold text-slate-800">{classes.length} Grade Levels</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Subdivision Streams</span>
            <span className="text-lg font-extrabold text-slate-800">{arms.length} Active Arms</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Oversight Assignments</span>
            <span className="text-lg font-extrabold text-slate-800">
              {arms.filter(a => a.classTeacherId).length} / {arms.length} Overseers
            </span>
          </div>
        </div>
      </div>

      {/* 4. Core Layout split: Classes & Arms registries */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-xs font-semibold">Synchronizing classroom registry boundaries...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* A. Academic Classes Roster (Left column) */}
          <div className="lg:col-span-1 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className={`w-4 h-4 ${accentText}`} /> Class Cohorts
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{classes.length} Tiers</span>
            </div>

            {classes.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-2">
                <Layers className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-slate-400 text-xs font-medium">No class cohorts defined.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {classes.map((cls) => (
                  <div 
                    key={cls.id}
                    className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between hover:border-slate-350 transition-all font-semibold text-xs text-slate-700 group"
                  >
                    <span className="text-slate-800 text-xs font-extrabold">{cls.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> 
                        {cls._count?.students || 0}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(cls.id)}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                        title="Delete class level"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. Subdivisions & Overseers Matrix Table (Right 2 columns) */}
          <div className="lg:col-span-2 p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <GraduationCap className={`w-4 h-4 ${accentText}`} /> Arm Divisions & Overseers
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">Interactive Roster Management</span>
            </div>

            {arms.length === 0 ? (
              <div className="p-12 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-700 text-sm font-bold">No subdivision streams created yet.</p>
                <p className="text-slate-400 text-xs max-w-sm mx-auto">Create a class level, then divide it into arms (e.g. Arm A) to register student rosters and assign class teacher oversight.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <th className="p-4">Academic division stream</th>
                      <th className="p-4">Student Enrollment</th>
                      <th className="p-4">Assigned Class Teacher (Overseer)</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {arms.map((arm) => (
                      <tr key={arm.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Division Room */}
                        <td className="p-4">
                          <div className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${accentBg}`}>
                              {arm.class.name}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-800 font-extrabold">Arm {arm.name}</span>
                          </div>
                        </td>
                        
                        {/* Student Roll */}
                        <td className="p-4 font-mono font-bold text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {arm._count?.students || 0} Students
                          </span>
                        </td>

                        {/* Assigned Class Teacher */}
                        <td className="p-4">
                          <select
                            value={arm.classTeacherId || ''}
                            onChange={(e) => handleTeacherAssignment(arm.id, e.target.value)}
                            className="bg-[#f8fafc] border border-slate-200 text-slate-700 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:border-slate-350 transition-colors font-bold w-48"
                          >
                            <option value="">-- No Teacher Assigned --</option>
                            {staff.map((teacher) => (
                              <option key={teacher.id} value={teacher.id}>
                                {teacher.lastName} {teacher.firstName} ({teacher.role.replace('_', ' ')})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Roster & Import triggers & Delete */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedArm(arm)}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors shadow-sm"
                            >
                              Roster & Import
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteArm(arm.id)}
                              className="p-2 rounded-xl border border-transparent hover:border-red-100 bg-transparent hover:bg-red-50/40 text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              title="Delete division"
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
          </div>

        </div>
      )}

      {/* 5. SIDE DRAWER OVERLAY: CLASS STREAM ROSTER & EXCEL BULK IMPORT */}
      {selectedArm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Class Stream Workspace</span>
                <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  <GraduationCap className={`w-5 h-5 ${accentText}`} />
                  {selectedArm.class.name} — Arm {selectedArm.name}
                </h2>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedArm(null)}
                className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawerErrorMsg && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold my-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>{drawerErrorMsg}</span>
              </div>
            )}

            {/* Roster & Import tabs in scroll body */}
            <div className="flex-1 py-4 space-y-6">
              
              {/* SECTION A: Bulk Excel Enrollment slot */}
              <div className="bg-slate-50/50 rounded-2xl border border-slate-150 p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-green-600" /> Bulk Student Enrollment
                  </h4>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Download Excel Template
                  </button>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                    dragActive ? `border-indigo-400 bg-indigo-50/20` : 'border-slate-200 bg-white hover:border-slate-350'
                  }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
                  <p className="text-xs font-bold text-slate-700">Drag and drop student spreadsheet here</p>
                  <p className="text-[10px] text-slate-400 mt-1">or click below to browse directories (.xlsx, .xls, .csv)</p>
                  
                  <label className="mt-3 inline-block px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-colors shadow-sm">
                    Select File
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleExcelFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Parsed list review preview */}
                {parsedStudents.length > 0 && (
                  <form onSubmit={triggerExcelUpload} className="space-y-3 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      <span>Parsed Candidates ({parsedStudents.length})</span>
                      <button 
                        type="button" 
                        onClick={() => setParsedStudents([])} 
                        className="text-red-500 hover:underline"
                      >
                        Clear Sheet
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-slate-100 rounded-lg bg-white divide-y divide-slate-100 text-[11px] font-medium text-slate-600">
                      {parsedStudents.map((s, idx) => (
                        <div key={idx} className="p-2 flex items-center justify-between">
                          <span>{s.lastName}, {s.firstName}</span>
                          <span className="font-mono text-slate-400">{s.admissionNumber}</span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      disabled={uploading}
                      className={`w-full py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center gap-1.5 ${buttonPrimary}`}
                    >
                      {uploading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileUp className="w-4 h-4" />
                      )}
                      {uploading ? 'Registering Candidates...' : `Enroll ${parsedStudents.length} Students Now`}
                    </button>
                  </form>
                )}

                {/* Bulk upload results banner */}
                {uploadResult && (
                  <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                    uploadResult.failCount === 0 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  }`}>
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>Upload Completed: {uploadResult.successCount} enrolled successfully.</span>
                    </div>

                    {uploadResult.failCount > 0 && (
                      <div className="space-y-1 text-[11px]">
                        <p className="font-extrabold text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failed Records ({uploadResult.failCount}):
                        </p>
                        <div className="max-h-24 overflow-y-auto divide-y divide-yellow-100/50 bg-white/40 rounded p-1 font-mono">
                          {uploadResult.failures.map((fail: any, idx: number) => (
                            <div key={idx} className="py-1 text-[10px] flex justify-between">
                              <span className="truncate max-w-[200px]">{fail.name}</span>
                              <span className="text-red-600">{fail.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SECTION B: Roster students list */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" /> Roster Ledger ({rosterStudents.length})
                  </h4>
                  <div className="relative w-full sm:w-48 flex-shrink-0">
                    <input
                      type="text"
                      placeholder="Filter roster..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg pl-8 pr-3 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-350"
                    />
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {rosterLoading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">Querying enrolled student databases...</p>
                  </div>
                ) : filteredRoster.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs border border-slate-100 rounded-2xl bg-slate-50/50">
                    <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span>No students registered in this stream roster.</span>
                  </div>
                ) : (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-sm">
                    {filteredRoster.map((stud) => (
                      <div key={stud.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                        <div>
                          <p className="text-slate-800 font-extrabold">{stud.lastName}, {stud.firstName}</p>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest">{stud.gender}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 border border-slate-100 rounded bg-[#f8fafc] px-2 py-0.5">
                          {stud.admissionNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Close action */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedArm(null)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
              >
                Close Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL FORM: CREATE CLASS LEVEL */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Initialize New Class Cohort
              </h3>
              <button 
                type="button" 
                onClick={() => setShowClassModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSS 1, JSS 2, Grade 4"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-350 transition-colors"
                />
                <span className="block text-[9px] text-slate-400 mt-1 font-mono">This represents the main cohort tier. Add divisions (Arms) inside this cohort afterwards.</span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${buttonPrimary}`}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Initializing...' : 'Deploy Class Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL FORM: CREATE ARM SUBDIVISION */}
      {showArmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Subdivide Class (Deploy Arm)
              </h3>
              <button 
                type="button" 
                onClick={() => setShowArmModal(false)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateArm} className="p-6 space-y-4 text-xs font-semibold text-slate-700">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Class Cohort</label>
                {classes.length === 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px]">
                    Create a class level first before setting up subdivision arms.
                  </div>
                ) : (
                  <select
                    value={newArmClassId}
                    onChange={(e) => setNewArmClassId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Arm Subdivision Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A, B, Gold, Science, commercial"
                  value={newArmName}
                  onChange={(e) => setNewArmName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-350 transition-colors"
                />
                <span className="block text-[9px] text-slate-400 mt-1 font-mono">For cohort JSS 1, Arm A will output: "JSS 1 A".</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Initial Class Teacher Assignment (Optional)</label>
                <select
                  value={newArmTeacherId}
                  onChange={(e) => setNewArmTeacherId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-none"
                >
                  <option value="">-- Assign Later --</option>
                  {staff.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.lastName} {teacher.firstName} ({teacher.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowArmModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || classes.length === 0}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${buttonPrimary}`}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Creating division...' : 'Deploy Arm subdivision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
