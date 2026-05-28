'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Mail, Phone, Calendar, BookOpen, 
  Layers, Clock, ShieldCheck, User, Sparkles, AlertCircle,
  Target, GraduationCap, ClipboardCheck, Network, ChevronRight,
  Plus, Trash2, RefreshCw
} from 'lucide-react';

interface SubjectAssignment {
  id: string;
  subject: {
    name: string;
    code: string;
  };
  class: {
    name: string;
  };
  arm: {
    name: string;
  };
}

interface TeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  passportPhoto?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  classTeacherArms?: {
    id: string;
    name: string;
    class: {
      name: string;
    };
  }[];
  subjectAssignments?: SubjectAssignment[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Hourly blocks matching the reference image
const HOURS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM'
];

// Color definitions helper for timetable chips matching the reference image's pastel look
function getTimetableSlotStyle(styleIdx: number): string {
  const index = styleIdx % 6;
  switch (index) {
    case 0: return 'bg-sky-50 border border-sky-100 text-sky-700'; // Light Blue
    case 1: return 'bg-purple-50 border border-purple-100 text-purple-700'; // Light Purple
    case 2: return 'bg-amber-50 border border-amber-100 text-amber-700'; // Light Yellow
    case 3: return 'bg-orange-50 border border-orange-100 text-orange-700'; // Light Orange
    case 4: return 'bg-pink-50 border border-pink-100 text-pink-700'; // Light Pink
    case 5: return 'bg-emerald-50 border border-emerald-100 text-emerald-700'; // Light Emerald
    default: return 'bg-sky-50 border border-sky-100 text-sky-700';
  }
}

export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teacherId = params.id as string;

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'work-week' | 'day'>('work-week');

  // Admin Profile Update Form States
  const [session, setSession] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassportPhoto, setEditPassportPhoto] = useState<string | null>(null);

  // Setup options from academic configuration
  const [arms, setArms] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Teacher allocation states
  const [editIsClassTeacher, setEditIsClassTeacher] = useState(false);
  const [editIsSubjectTeacher, setEditIsSubjectTeacher] = useState(false);
  const [editClassTeacherArmId, setEditClassTeacherArmId] = useState('');
  const [editSubjectAssignments, setEditSubjectAssignments] = useState<{ subjectId: string; armId: string }[]>([]);

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

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSession(sessionObj);
        loadTeacherProfile(sessionObj.school.id);
        loadSetupData(sessionObj.school.id);
      } catch (e) {
        setError('Invalid session credentials.');
        setLoading(false);
      }
    } else {
      setError('No session found. Please log in.');
      setLoading(false);
    }
  }, [teacherId]);

  const loadTeacherProfile = async (schoolId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/staff?schoolId=${schoolId}&staffId=${teacherId}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load teacher workspace.');
      }
      setTeacher(json.data);
      
      // Pre-populate fields
      setEditFirstName(json.data.firstName || '');
      setEditLastName(json.data.lastName || '');
      setEditEmail(json.data.email || '');
      setEditPhone(json.data.phone === 'Not Provided' ? '' : (json.data.phone || ''));
      setEditRole(json.data.role || '');
      setEditPassportPhoto(json.data.passportPhoto || null);
    } catch (err: any) {
      setError(err.message || 'Error loading teacher ledger profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
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
          staffId: teacherId,
          schoolId: session?.school?.id,
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          email: editEmail.toLowerCase().trim(),
          phone: editPhone.trim() || null,
          role: determinedRole,
          passportPhoto: editPassportPhoto,
          classTeacherArmId: editIsClassTeacher ? editClassTeacherArmId : null,
          subjectAssignments: editIsSubjectTeacher ? editSubjectAssignments : []
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update teacher profile.');
      }

      await loadTeacherProfile(session?.school?.id);
      setShowEditModal(false);
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating the profile.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const getRoleLabel = (r?: string) => {
    if (!r) return 'Teacher';
    switch(r) {
      case 'HEAD_TEACHER': return 'Head Teacher';
      case 'CLASS_TEACHER': return 'Class Teacher';
      case 'SUBJECT_TEACHER': return 'Subject Teacher';
      default: return r;
    }
  };

  // Helper to map dynamic/static slots exactly as shown in the screenshot
  const getTimetableSlot = (day: string, hour: string) => {
    // Exact slot coordinates from screenshot:
    const scheduleData: { [key: string]: { [key: string]: { class: string, subject: string, styleIdx: number, duration: string } } } = {
      'Monday': {
        '8:00 AM': { class: '4A', subject: 'Physics', styleIdx: 0, duration: '8:00 AM - 8:45 AM' },
        '10:00 AM': { class: '2B', subject: 'Physics', styleIdx: 1, duration: '10:00 AM - 10:45 AM' },
        '11:00 AM': { class: '5A', subject: 'Physics', styleIdx: 4, duration: '11:00 AM - 11:45 AM' },
        '1:00 PM': { class: '6C', subject: 'Physics', styleIdx: 0, duration: '1:00 PM - 1:45 PM' },
        '2:00 PM': { class: '2B', subject: 'Physics', styleIdx: 2, duration: '2:00 PM - 2:45 PM' },
      },
      'Tuesday': {
        '9:00 AM': { class: '2B', subject: 'Physics', styleIdx: 0, duration: '9:00 AM - 9:45 AM' },
        '10:00 AM': { class: '3A', subject: 'Physics', styleIdx: 2, duration: '10:00 AM - 10:45 AM' },
        '11:00 AM': { class: '5B', subject: 'Physics', styleIdx: 4, duration: '11:00 AM - 11:45 AM' },
        '2:00 PM': { class: '1A', subject: 'Physics', styleIdx: 4, duration: '2:00 PM - 2:45 PM' },
      },
      'Wednesday': {
        '8:00 AM': { class: '1A', subject: 'Chemistry', styleIdx: 0, duration: '8:00 AM - 8:45 AM' },
        '10:00 AM': { class: '2B', subject: 'Physics', styleIdx: 2, duration: '10:00 AM - 10:45 AM' },
        '1:00 PM': { class: '3C', subject: 'Chemistry', styleIdx: 1, duration: '1:00 PM - 1:45 PM' },
      },
      'Thursday': {
        '9:00 AM': { class: '6A', subject: 'Physics', styleIdx: 2, duration: '9:00 AM - 9:45 AM' },
        '10:00 AM': { class: '6B', subject: 'Chemistry', styleIdx: 2, duration: '10:00 AM - 10:45 AM' },
        '11:00 AM': { class: '5C', subject: 'Physics', styleIdx: 1, duration: '11:00 AM - 11:45 AM' },
        '2:00 PM': { class: '4A', subject: 'Physics', styleIdx: 4, duration: '2:00 PM - 2:45 PM' },
      },
      'Friday': {
        '8:00 AM': { class: '4A', subject: 'Chemistry', styleIdx: 0, duration: '8:00 AM - 8:45 AM' },
        '9:00 AM': { class: '3B', subject: 'Physics', styleIdx: 2, duration: '9:00 AM - 9:45 AM' },
        '11:00 AM': { class: '6A', subject: 'Physics', styleIdx: 1, duration: '11:00 AM - 11:45 AM' },
        '1:00 PM': { class: '6A', subject: 'Chemistry', styleIdx: 4, duration: '1:00 PM - 1:45 PM' },
        '2:00 PM': { class: '6B', subject: 'Chemistry', styleIdx: 0, duration: '2:00 PM - 2:45 PM' },
      }
    };

    const daySlot = scheduleData[day];
    if (!daySlot) return null;
    const slot = daySlot[hour];
    if (!slot) return null;

    // Map dynamic database values to replace mock ones if assignments exist
    const assignments = teacher?.subjectAssignments || [];
    if (assignments.length > 0) {
      const isChem = slot.subject === 'Chemistry';
      let matchedAssignment = assignments[0];
      
      if (isChem && assignments.length > 1) {
        matchedAssignment = assignments[1];
      } else if (assignments.length > 2) {
        matchedAssignment = assignments[slot.styleIdx % assignments.length];
      }
      
      return {
        className: `${matchedAssignment.class.name}${matchedAssignment.arm.name}`,
        subjectName: matchedAssignment.subject.name,
        duration: slot.duration,
        style: getTimetableSlotStyle(slot.styleIdx)
      };
    }

    return {
      className: slot.class,
      subjectName: slot.subject,
      duration: slot.duration,
      style: getTimetableSlotStyle(slot.styleIdx)
    };
  };

  // Helper to determine photo matching gender/roles
  const getTeacherPhoto = () => {
    if (!teacher) return '';
    if (teacher.passportPhoto) return teacher.passportPhoto;
    if (teacher.lastName === 'Bello') {
      return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop';
    }
    if (teacher.lastName === 'Solomon' || teacher.firstName.toLowerCase().startsWith('k')) {
      return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop';
  };

  if (loading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-semibold">Retrieving educator workspace...</p>
        </div>
      </div>
    );
  }

  if (error || !teacher) {
    return (
      <div className="max-w-xl mx-auto mt-16 p-8 bg-white border border-red-100 rounded-3xl shadow-sm text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-black text-slate-800">Workspace Access Error</h2>
        <p className="text-slate-400 text-xs font-semibold">{error || 'Requested staff profile could not be loaded.'}</p>
        <button
          onClick={() => router.push('/dashboard/teachers')}
          className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Teachers Registry
        </button>
      </div>
    );
  }

  const totalAssignments = teacher.subjectAssignments?.length || 0;
  const classStreamsCount = new Set(teacher.subjectAssignments?.map(a => a.arm.name + a.class.name)).size || 4;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-2">
      
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/teachers"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Teachers List
        </Link>
      </div>

      {/* Main Grid: Left Hand (Profile & Schedule) vs Right Hand (Shortcuts, Perf, Announce) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN (8 of 12 columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top Row Grid: Profile Card (col-span-2) & Stats Grid (col-span-1) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Soft Blue Teacher Profile Card */}
            <div className="md:col-span-2 bg-[#c3ebfa] rounded-[30px] p-6 shadow-sm relative overflow-hidden flex flex-row items-center gap-6 min-h-[170px]">
              {(session?.user?.role === 'SCHOOL_ADMIN' || session?.user?.role === 'SUPER_ADMIN') && (
                <button
                  type="button"
                  onClick={() => {
                    setEditFirstName(teacher.firstName);
                    setEditLastName(teacher.lastName);
                    setEditEmail(teacher.email);
                    setEditPhone(teacher.phone === 'Not Provided' ? '' : (teacher.phone || ''));
                    setEditRole(teacher.role || '');
                    setEditPassportPhoto(teacher.passportPhoto || null);
                    
                    const hasClassArm = teacher.classTeacherArms && teacher.classTeacherArms.length > 0;
                    setEditIsClassTeacher(hasClassArm || teacher.role === 'CLASS_TEACHER');
                    setEditClassTeacherArmId(teacher.classTeacherArms?.[0]?.id || '');
                    
                    const hasSubjects = teacher.subjectAssignments && teacher.subjectAssignments.length > 0;
                    setEditIsSubjectTeacher(hasSubjects || teacher.role === 'SUBJECT_TEACHER');
                    setEditSubjectAssignments(teacher.subjectAssignments?.map((sa: any) => ({
                      subjectId: sa.subjectId,
                      armId: sa.armId
                    })) || []);
                    
                    setEditError('');
                    setShowEditModal(true);
                  }}
                  className="absolute top-4 right-4 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-[10px] font-black rounded-full shadow-sm hover:shadow transition-all hover:scale-105 flex items-center gap-1 cursor-pointer z-20"
                >
                  <Sparkles className="w-3 h-3 text-blue-600 animate-pulse" />
                  <span>Edit Profile</span>
                </button>
              )}

              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white bg-white flex-shrink-0 shadow-md relative z-10">
                <img 
                  src={getTeacherPhoto()} 
                  alt={`${teacher.firstName} ${teacher.lastName}`} 
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">
                    {teacher.firstName} {teacher.lastName}
                  </h2>
                  <button type="button" className="p-1 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center flex-shrink-0">
                    <Target className="w-3 h-3" />
                  </button>
                </div>
                
                <p className="text-[10px] text-slate-600 leading-relaxed max-w-xs font-medium">
                  Lorem ipsum, dolor sit amet consectetur adipisicing elit.
                </p>

                {/* 2x2 Metadata Grid */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 pt-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800">
                    <span className="text-red-500 font-extrabold">🩸</span>
                    <span>A+</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800">
                    <Calendar className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span>14/09/1994</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800 min-w-0">
                    <Mail className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="truncate">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-bold text-slate-800 truncate">
                    <Phone className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <span className="truncate">{teacher.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2x2 Stats Cards Grid */}
            <div className="md:col-span-1 grid grid-cols-2 gap-4">
              
              {/* Stat 1: Attendance */}
              <div className="bg-white rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow border-none">
                <div className="w-9 h-9 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-500 flex-shrink-0">
                  <ClipboardCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-base font-black text-slate-800 leading-none">98%</span>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Attendance</span>
                </div>
              </div>

              {/* Stat 2: Branches */}
              <div className="bg-white rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow border-none">
                <div className="w-9 h-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 flex-shrink-0">
                  <Network className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-base font-black text-slate-800 leading-none">2</span>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Branches</span>
                </div>
              </div>

              {/* Stat 3: Lessons */}
              <div className="bg-white rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow border-none">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-base font-black text-slate-800 leading-none">
                    {Math.max(8, totalAssignments * 2)}
                  </span>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Lessons</span>
                </div>
              </div>

              {/* Stat 4: Classes */}
              <div className="bg-white rounded-3xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow border-none">
                <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-base font-black text-slate-800 leading-none">
                    {classStreamsCount}
                  </span>
                  <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Classes</span>
                </div>
              </div>

            </div>

          </div>

          {/* Teacher's Schedule Calendar Grid */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-6">
            
            {/* Header with Date and View Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100/60 pb-4 gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Teacher's Schedule
                </h3>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-400">
                  September 16 – 20
                </span>
                
                <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-2xl">
                  <button
                    onClick={() => setViewMode('work-week')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      viewMode === 'work-week' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Work Week
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                      viewMode === 'day' 
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-100' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Day
                  </button>
                </div>
              </div>
            </div>

            {/* Weekly Schedule Grid */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600 min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-3 w-20 text-center">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="p-3 w-1/5 text-center font-bold text-slate-400">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                  {HOURS.map((hour) => {
                    const isLunch = hour === '12:00 PM';
                    return (
                      <tr key={hour} className="hover:bg-slate-50/10">
                        {/* Time Row Label */}
                        <td className="p-3 text-slate-400 text-center font-bold align-middle border-r border-slate-100/40 w-20 bg-slate-50/20">
                          {hour}
                        </td>

                        {/* Daily Columns */}
                        {DAYS.map((day) => {
                          if (isLunch) {
                            return (
                              <td key={day} className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-350 bg-slate-50/20">
                                — Lunch / Recess —
                              </td>
                            );
                          }

                          const slot = getTimetableSlot(day, hour);

                          return (
                            <td key={day} className="p-2 border-r border-slate-100/30 align-middle">
                              {slot ? (
                                <div className={`p-2.5 rounded-[15px] ${slot.style} space-y-1 text-left hover:shadow-sm transition-all`}>
                                  <span className="block text-[8px] font-bold opacity-80 leading-none">
                                    {slot.duration}
                                  </span>
                                  <span className="block text-[10.5px] font-extrabold leading-tight">
                                    {slot.className} - {slot.subjectName}
                                  </span>
                                </div>
                              ) : (
                                <div className="h-10 rounded-xl hover:bg-slate-50/20 transition-all" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN (4 of 12 columns) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Shortcuts Panel */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-extrabold text-slate-800">Shortcuts</h4>
            
            <div className="flex flex-wrap gap-2">
              <Link 
                href="/dashboard/classes"
                className="px-3.5 py-2.5 rounded-xl bg-sky-50 text-[10px] font-bold text-sky-700 hover:bg-sky-100 transition-colors border-0"
              >
                Teacher's Classes
              </Link>
              <Link 
                href="/dashboard/students"
                className="px-3.5 py-2.5 rounded-xl bg-purple-50 text-[10px] font-bold text-purple-700 hover:bg-purple-100 transition-colors border-0"
              >
                Teacher's Students
              </Link>
              <Link 
                href="/dashboard/subjects"
                className="px-3.5 py-2.5 rounded-xl bg-amber-50 text-[10px] font-bold text-amber-700 hover:bg-amber-100 transition-colors border-0"
              >
                Teacher's Lessons
              </Link>
              <Link 
                href="/dashboard"
                className="px-3.5 py-2.5 rounded-xl bg-pink-50 text-[10px] font-bold text-pink-700 hover:bg-pink-100 transition-colors border-0"
              >
                Teacher's Exams
              </Link>
              <Link 
                href="/dashboard/subjects"
                className="px-3.5 py-2.5 rounded-xl bg-teal-50 text-[10px] font-bold text-teal-700 hover:bg-teal-100 transition-colors border-0"
              >
                Teacher's Assignments
              </Link>
            </div>
          </div>

          {/* Performance Circle Gauge */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 flex flex-col justify-between h-[230px] relative overflow-hidden">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-extrabold text-slate-800">Performance</h4>
              <span className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">...</span>
            </div>
            
            <div className="relative flex items-center justify-center flex-1 mt-4">
              {/* Custom SVG Semi-Circle Gauge */}
              <svg viewBox="0 0 100 50" className="w-full max-w-[150px]">
                {/* Gray Background Circle Track (Full Arc) */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                
                {/* Light Blue Main Sector (0% to 80%) */}
                <path
                  d="M 10 50 A 40 40 0 0 1 82.36 26.49"
                  fill="none"
                  stroke="#c3ebfa"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                
                {/* Golden sector highlighting (starts at 80% and covers up to 92%) */}
                <path
                  d="M 82.36 26.49 A 40 40 0 0 1 88.74 40.05"
                  fill="none"
                  stroke="#fde047"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Inner details text */}
              <div className="absolute bottom-2 text-center space-y-0.5">
                <span className="block text-2xl font-black text-slate-800 leading-none">9.2</span>
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">of 10 max LTS</span>
              </div>
            </div>
            
            <div className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider pt-2">
              1st Semester - 2nd Semester
            </div>
          </div>

          {/* Announcements Card */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-extrabold text-slate-800">Announcements</h4>
              <Link 
                href="/dashboard/announcements" 
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              
              {/* Announcement 1: Picture Day */}
              <div className="p-4 rounded-2xl bg-sky-50/70 space-y-1 text-left border-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-extrabold text-slate-800">Picture Day Reminder</h5>
                  <span className="text-[8px] font-bold text-slate-400">16/09/2024</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  School Picture Day is tomorrow! Don't forget to wear your full uniform and bring your best smile.
                </p>
              </div>

              {/* Announcement 2: Book Fair */}
              <div className="p-4 rounded-2xl bg-purple-50/70 space-y-1 text-left border-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-extrabold text-slate-800">Book Fair Opening</h5>
                  <span className="text-[8px] font-bold text-slate-400">16/09/2024</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  The annual Book Fair will open this Thursday. Stop by the library to browse the newest books.
                </p>
              </div>

              {/* Announcement 3: Sports Day */}
              <div className="p-4 rounded-2xl bg-amber-50/70 space-y-1 text-left border-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[11px] font-extrabold text-slate-800">Sports Day Postponed</h5>
                  <span className="text-[8px] font-bold text-slate-400">16/09/2024</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  Due to weather, Sports Day has been postponed. A new date will be announced soon.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-[32px] shadow-2xl border border-slate-100 max-w-xl w-full overflow-hidden flex flex-col animate-fadeIn"
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
                className="absolute top-5 right-6 w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 flex items-center justify-center shadow-sm transition-all text-xs cursor-pointer animate-fadeIn"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateProfile} className="p-6 flex flex-col space-y-4 font-semibold text-xs text-slate-650 overflow-hidden">
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
                      <User className="w-6 h-6 text-slate-350" />
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
                      className="w-full px-4 py-2.5 bg-[#c3ebfa]/30 border border-[#a0def7] rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c3ebfa]/50 focus:bg-white transition-all"
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
                      className="w-full px-4 py-2.5 bg-[#c3ebfa]/30 border border-[#a0def7] rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c3ebfa]/50 focus:bg-white transition-all"
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
                    className="w-full px-4 py-2.5 bg-[#c3ebfa]/30 border border-[#a0def7] rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c3ebfa]/50 focus:bg-white transition-all font-mono"
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
                    className="w-full px-4 py-2.5 bg-[#c3ebfa]/30 border border-[#a0def7] rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c3ebfa]/50 focus:bg-white transition-all font-mono"
                    placeholder="e.g. +234 803 123 4567"
                  />
                </div>

                {/* Sub-Roles Panel */}
                <div className="p-4 rounded-2xl bg-[#c3ebfa]/15 border border-[#a0def7]/40 space-y-4">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Teacher Roles & Assignments</span>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Class Teacher Checkbox */}
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-[#a0def7]/30 cursor-pointer hover:bg-[#c3ebfa]/10 hover:border-[#a0def7]/60 transition-colors shadow-sm">
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
                    <label className="flex-1 flex items-start gap-3 p-3 rounded-xl bg-white border border-[#a0def7]/30 cursor-pointer hover:bg-[#c3ebfa]/10 hover:border-[#a0def7]/60 transition-colors shadow-sm">
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
                        className="w-full bg-[#c3ebfa]/30 border border-[#a0def7] rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:bg-white"
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
                          className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-500 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Assignment
                        </button>
                      </div>

                      {editSubjectAssignments.length === 0 ? (
                        <div className="p-4 text-center rounded-xl bg-white border border-slate-200 border-dashed">
                          <span className="text-[10px] text-slate-400 font-bold">No subject assignments allocated.</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {editSubjectAssignments.map((assignment, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-150 shadow-sm animate-fadeIn">
                              <select
                                value={assignment.subjectId}
                                onChange={(e) => updateEditSubjectAssignment(index, 'subjectId', e.target.value)}
                                className="flex-1 bg-[#c3ebfa]/20 border border-[#a0def7]/70 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:bg-white"
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
                                className="flex-1 bg-[#c3ebfa]/20 border border-[#a0def7]/70 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-700 focus:outline-none focus:bg-white"
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
                                className="p-1.5 text-slate-450 hover:text-red-500 transition-colors cursor-pointer"
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

    </div>
  );
}
