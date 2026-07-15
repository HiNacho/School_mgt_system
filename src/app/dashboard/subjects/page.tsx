'use client';

import React, { useEffect, useState } from 'react';
import { 
  BookOpen, Plus, Shield, Users, CheckCircle, AlertCircle, 
  RefreshCw, Sparkles, X, UserCheck, GraduationCap, Trash2, Tag, Calendar, Search
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  category: string; // COMPULSORY, ELECTIVE
  _count?: {
    scores: number;
  };
}

interface Term {
  id: string;
  name: string;
  session: {
    name: string;
  };
  isCurrent: boolean;
}

interface Arm {
  id: string;
  name: string;
  class: {
    name: string;
  };
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface SubjectAssignment {
  id: string;
  subject: Subject;
  class: {
    name: string;
  };
  arm: {
    name: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
  };
  term: {
    name: string;
    session: {
      name: string;
    };
  };
}

export default function SubjectRegistryPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [teachers, setTeacherList] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Search & Pagination States
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [currentAssignmentPage, setCurrentAssignmentPage] = useState(1);
  const assignmentsPerPage = 20;

  // Modals & Form States
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // 1. New Subject Form State
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('COMPULSORY');

  // 2. New Assignment Form State
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignArmId, setAssignArmId] = useState('');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignTermId, setAssignTermId] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        const role = sessionObj.user?.role;
        if (role !== 'SCHOOL_ADMIN' && role !== 'SUPER_ADMIN') {
          window.location.href = '/dashboard';
          return;
        }
        setSchool(sessionObj.school);
        loadRegistryData(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid session credentials.');
      }
    } else {
      window.location.href = '/login';
    }
  }, []);

  const loadRegistryData = async (schoolId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/subjects?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load subject registries');

      setSubjects(json.data.subjects || []);
      setTerms(json.data.terms || []);
      setArms(json.data.arms || []);
      setTeacherList(json.data.teachers || []);
      setAssignments(json.data.assignments || []);

      // Seed form default values
      if (json.data.subjects && json.data.subjects.length > 0) {
        setAssignSubjectId(json.data.subjects[0].id);
      }
      if (json.data.arms && json.data.arms.length > 0) {
        setAssignArmId(json.data.arms[0].id);
      }
      if (json.data.teachers && json.data.teachers.length > 0) {
        setAssignTeacherId(json.data.teachers[0].id);
      }
      
      // Auto select current active term
      const currentTerm = json.data.terms?.find((t: Term) => t.isCurrent);
      if (currentTerm) {
        setAssignTermId(currentTerm.id);
      } else if (json.data.terms && json.data.terms.length > 0) {
        setAssignTermId(json.data.terms[0].id);
      }

    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with DB server.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Create a master Academic Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCode.trim()) return;

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'SUBJECT',
          schoolId: school.id,
          name: newSubName.trim(),
          code: newSubCode.trim().toUpperCase(),
          category: newSubCategory
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register academic subject.');

      setSuccessMsg(`Academic Subject "${newSubName}" [${newSubCode.toUpperCase()}] registered successfully!`);
      setNewSubName('');
      setNewSubCode('');
      setNewSubCategory('COMPULSORY');
      setShowSubjectModal(false);
      await loadRegistryData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database server.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Register Teacher Subject Assignment
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSubjectId || !assignArmId || !assignTeacherId || !assignTermId) {
      setErrorMsg('Please ensure all assignment parameter selections are complete.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ASSIGNMENT',
          schoolId: school.id,
          subjectId: assignSubjectId,
          armId: assignArmId,
          teacherId: assignTeacherId,
          termId: assignTermId
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record subject assignment.');

      setSuccessMsg(
        `Subject allocation successfully saved! Mr./Mrs. ${json.data.teacher.lastName} allocated to ${json.data.subject.name} in ${json.data.class.name} ${json.data.arm.name}.`
      );
      setShowAssignModal(false);
      await loadRegistryData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Duplicate assignment detected.');
    } finally {
      setSubmitting(false);
    }
  };
  // 3. De-allocate Teacher Assignment slot
  const handleDeallocateAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to de-allocate this teacher from this subject classroom slot? This will remove their exclusive score sheet entry permissions.')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/subjects?id=${assignmentId}&schoolId=${school.id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete assignment slot.');

      setSuccessMsg('Teacher assignment successfully de-allocated. Slot is now free.');
      await loadRegistryData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing request.');
    }
  };

  // 4. Delete Subject itself
  const handleDeleteSubject = async (subjectId: string, subjectName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the subject "${subjectName}"? This will delete all student scores and teacher assignments associated with this subject!`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/subjects?subjectId=${subjectId}&schoolId=${school.id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete subject.');

      setSuccessMsg(`Subject "${subjectName}" was successfully deleted along with all its relational data.`);
      await loadRegistryData(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing request.');
    }
  };

  // Multi-tenant styling parameters
  const isGreenwood = school?.slug === 'nacho-secondary';
  const themeAccentColor = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/10';

  // Filters for subjects
  const filteredSubjects = subjects.filter(s => {
    const query = subjectSearchQuery.toLowerCase();
    return s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query);
  });

  // Filters for assignments
  const filteredAssignments = assignments.filter(as => {
    const query = assignmentSearchQuery.toLowerCase();
    const teacherName = `${as.teacher.firstName} ${as.teacher.lastName}`.toLowerCase();
    const subjectName = as.subject.name.toLowerCase();
    const className = `${as.class.name} ${as.arm.name}`.toLowerCase();
    return teacherName.includes(query) || subjectName.includes(query) || className.includes(query);
  });

  // Pagination for assignments
  const totalAssignments = filteredAssignments.length;
  const totalPages = Math.ceil(totalAssignments / assignmentsPerPage) || 1;
  const startIndex = (currentAssignmentPage - 1) * assignmentsPerPage;
  const endIndex = Math.min(startIndex + assignmentsPerPage, totalAssignments);
  const currentAssignments = filteredAssignments.slice(startIndex, endIndex);

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className={`w-6 h-6 ${themeAccentColor}`} /> Subject & Allocation Registry
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-semibold">
            Principal console to manage curriculum subjects, map shortcodes, and delegate instructional responsibilities to teaching staff.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSubjectModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-black transition-all cursor-pointer animate-fadeIn"
          >
            <Plus className="w-3.5 h-3.5" /> Register Subject
          </button>

          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            disabled={subjects.length === 0 || arms.length === 0 || teachers.length === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md disabled:opacity-50 cursor-pointer ${themeBgAccent}`}
          >
            <Plus className="w-3.5 h-3.5" /> Allocate Instructor
          </button>
        </div>
      </div>

      {/* 2. Status Alerts */}
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

      {/* 3. Operational Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-semibold">
        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Curriculum Subjects</span>
            <span className="text-xl font-extrabold text-slate-800">{subjects.length} Registered</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex-shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Assignments</span>
            <span className="text-xl font-extrabold text-sky-600">{assignments.length} Teaching Slots</span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Core Curriculum Ratio</span>
            <span className="text-xl font-extrabold text-amber-600">
              {subjects.filter(s => s.category === 'COMPULSORY').length} / {subjects.length} Core Courses
            </span>
          </div>
        </div>
      </div>

      {/* 4. Split Layout */}
      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-xs font-semibold">Accessing curriculum ledger...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-semibold">
          
          {/* A. Master Course Catalog (Left Column) */}
          <div className="lg:col-span-1 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                <BookOpen className={`w-4 h-4 ${themeAccentColor}`} /> Curriculum Subjects
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-black">{subjects.length} Total</span>
            </div>

            {/* Subject Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search subject..."
                value={subjectSearchQuery}
                onChange={(e) => setSubjectSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-2xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-300 font-bold text-slate-700"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            {filteredSubjects.length === 0 ? (
              <div className="py-12 rounded-2xl border border-dashed border-slate-150 text-center space-y-2">
                <BookOpen className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">No matching subjects</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredSubjects.map((sub) => (
                  <div 
                    key={sub.id}
                    className="p-3 rounded-2xl bg-slate-50/50 border border-slate-100 flex items-center justify-between hover:bg-slate-50 hover:border-slate-200 transition-all text-xs"
                  >
                    <div>
                      <span className="text-slate-800 font-extrabold block text-xs">{sub.name}</span>
                      <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-lg border mt-1 ${
                        sub.category === 'COMPULSORY' 
                          ? 'bg-amber-50 text-amber-600 border-amber-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        {sub.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-700 bg-white px-2 py-1 rounded-xl font-mono border border-slate-150">
                        {sub.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub.id, sub.name)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
                        title={`Delete subject ${sub.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. Teacher-to-Subject Assignment matrix (Right 2 columns) */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                <Users className={`w-4 h-4 ${themeAccentColor}`} /> Teacher Subject Assignments
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-black">Curriculum Instructor Roster</span>
            </div>

            {/* Assignment Search Bar */}
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search teacher, subject, class..."
                value={assignmentSearchQuery}
                onChange={(e) => { setAssignmentSearchQuery(e.target.value); setCurrentAssignmentPage(1); }}
                className="w-full bg-slate-50 border border-slate-150 rounded-2xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-300 font-bold text-slate-700"
              />
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            </div>

            {currentAssignments.length === 0 ? (
              <div className="py-16 rounded-2xl border border-dashed border-slate-150 text-center space-y-3">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-slate-450 text-xs font-bold uppercase tracking-wider">No instructor allocations found</p>
                <p className="text-slate-400 text-[10px] max-w-sm mx-auto font-semibold">Allocate teachers to subjects in specific classroom arms (e.g. Mrs. Grace teaches Mathematics in JSS 1A) to enable score entries.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="p-4">Class Stream</th>
                        <th className="p-4">Curriculum Subject</th>
                        <th className="p-4">Assigned Instructor</th>
                        <th className="p-4">Active Term</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentAssignments.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Class arm */}
                          <td className="p-4">
                            <span className="font-extrabold text-slate-800">
                              {row.class.name} <span className="text-slate-450 font-bold">Arm {row.arm.name}</span>
                            </span>
                          </td>

                          {/* Subject */}
                          <td className="p-4 text-slate-800">
                            <span className="block font-extrabold">{row.subject.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">Code: {row.subject.code}</span>
                          </td>

                          {/* Teacher */}
                          <td className="p-4 text-slate-800">
                            <span className="flex items-center gap-1.5 font-bold">
                              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                              Mr./Mrs. {row.teacher.lastName} {row.teacher.firstName}
                            </span>
                          </td>

                          {/* Term */}
                          <td className="p-4 font-mono text-[10px] text-slate-500 font-bold">
                            <span>{row.term.name}</span>
                            <span className="block text-[8px] text-slate-400 font-sans mt-0.5">Session: {row.term.session.name}</span>
                          </td>

                          {/* Actions */}
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeallocateAssignment(row.id)}
                              className="p-1.5 rounded-xl hover:bg-red-50 text-slate-400 hover:text-red-650 transition-colors"
                              title="De-allocate assignment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sliding Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center border-t border-slate-50 pt-4">
                    <button
                      type="button"
                      disabled={currentAssignmentPage === 1}
                      onClick={() => setCurrentAssignmentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
                    >
                      Previous Page
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setCurrentAssignmentPage(p)}
                          className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                            currentAssignmentPage === p
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
                      disabled={currentAssignmentPage === totalPages}
                      onClick={() => setCurrentAssignmentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-40"
                    >
                      Next Page
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Register Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" /> Register Curriculum Subject
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSubjectModal(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-655"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubject} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English Language, Further Mathematics"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 transition-colors font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Report Code Shorthand</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ENG, MTH, FMA"
                  maxLength={5}
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-blue-300 transition-colors font-mono uppercase font-black"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Curriculum Category</label>
                <select
                  value={newSubCategory}
                  onChange={(e) => setNewSubCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-black text-slate-705"
                >
                  <option value="COMPULSORY">COMPULSORY (Core course in all scoresheets)</option>
                  <option value="ELECTIVE">ELECTIVE (Selectable per student)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
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
                  {submitting ? 'Registering...' : 'Register Curriculum Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Allocate Instructor Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-fadeIn flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" /> Allocate Course Instructor
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-slate-655"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignTeacher} className="p-6 space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Select Curriculum Subject</label>
                <select
                  value={assignSubjectId}
                  onChange={(e) => setAssignSubjectId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-705 font-bold"
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name} [{sub.code}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Target Classroom Arm</label>
                <select
                  value={assignArmId}
                  onChange={(e) => setAssignArmId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-705 font-bold"
                >
                  {arms.map((arm) => (
                    <option key={arm.id} value={arm.id}>{arm.class.name} Arm {arm.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Subject Instructor Teacher</label>
                <select
                  value={assignTeacherId}
                  onChange={(e) => setAssignTeacherId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-705 font-black"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.lastName} {t.firstName} ({t.role.replace('_', ' ')})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Academic Term Context</label>
                <select
                  value={assignTermId}
                  onChange={(e) => setAssignTermId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs text-slate-705 font-black"
                >
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.session.name}) {t.isCurrent ? '⭐ CURRENT' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
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
                  {submitting ? 'Allocating...' : 'Allocate Course Instructor'}
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
