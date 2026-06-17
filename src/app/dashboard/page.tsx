'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, GraduationCap, Award, BookOpen, AlertCircle, 
  TrendingUp, BarChart2, Star, CheckCircle, Smartphone, X,
  ArrowRight, Eye, Calendar as CalendarIcon, Megaphone, User,
  ChevronLeft, ChevronRight, Activity, Plus, ShieldCheck, Mail, MapPin, Phone
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';

export default function DashboardHome() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard Aggregated States
  const [setupData, setSetupData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [subjectsData, setSubjectsData] = useState<any>(null);
  
  // Teachers specifics
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<any>(null);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterClassName, setRosterClassName] = useState('');
  const [rosterStudents, setRosterStudents] = useState<any[]>([]);
  const [classStatuses, setClassStatuses] = useState<any[]>([]);
  const [activeReportStatus, setActiveReportStatus] = useState<string>('DRAFT');

  // Parent specific states
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Calendar Widget states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Add Event modal states
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('08:00 AM - 09:00 AM');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);


  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      setSession(parsed);
      fetchDashboardDetails(parsed);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    const role = session.user?.role;
    const termId = setupData?.terms?.find((t: any) => t.isCurrent)?.id || setupData?.terms?.[0]?.id || '';
    if (!termId) return;

    const fetchActiveStatus = async (classId: string, armId: string) => {
      try {
        const statusRes = await fetch(
          `/api/reports/status?schoolId=${session.school?.id}&classId=${classId}&armId=${armId}&termId=${termId}`
        );
        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.success && statusJson.data) {
            setActiveReportStatus(statusJson.data.status || 'DRAFT');
            return;
          }
        }
        setActiveReportStatus('DRAFT');
      } catch (err) {
        console.error('Error fetching report status', err);
        setActiveReportStatus('DRAFT');
      }
    };

    if (role === 'STUDENT' && session.user?.student) {
      fetchActiveStatus(session.user.student.classId, session.user.student.armId);
    } else if (role === 'PARENT' && selectedChildId && session.user?.parent?.students) {
      const kid = session.user.parent.students.find((k: any) => k.id === selectedChildId);
      if (kid) {
        fetchActiveStatus(kid.classId, kid.armId);
      }
    }
  }, [selectedChildId, session, setupData]);

  const fetchDashboardDetails = async (sess: any) => {
    try {
      const schoolId = sess.school?.id;
      const role = sess.user.role;
      let currentTermId = '';

      if (role === 'SUPER_ADMIN') {
        // Fetch global platform-wide statistics for Super Admin
        const [schoolsRes, leadsRes] = await Promise.all([
          fetch('/api/schools', { cache: 'no-store' }),
          fetch('/api/superadmin/leads', { cache: 'no-store' })
        ]);

        let allSchools: any[] = [];
        if (schoolsRes.ok) {
          const json = await schoolsRes.json();
          allSchools = json.data || [];
        }

        // Aggregate platform totals
        const totalStudents = allSchools.reduce((sum: number, s: any) => sum + (s.studentCount || 0), 0);
        const totalParents = allSchools.reduce((sum: number, s: any) => sum + (s.parentCount || 0), 0);

        // Populate local states so standard KPI metric card logic works
        setStudents(new Array(totalStudents).fill({ status: 'ACTIVE' }));
        
        // Re-create a representative staff list with roles to feed filters:
        const aggregatedStaff: any[] = [];
        allSchools.forEach((s: any) => {
          const adminsCount = s.adminCount || 0;
          const teachersCount = s.teacherCount || 0;
          for (let i = 0; i < adminsCount; i++) {
            aggregatedStaff.push({ role: 'SCHOOL_ADMIN' });
          }
          for (let i = 0; i < teachersCount; i++) {
            aggregatedStaff.push({ role: 'CLASS_TEACHER' });
          }
        });
        setStaff(aggregatedStaff);

        // Map parents count to actual registered school parents
        setParents(new Array(totalParents).fill({}));
        setLoading(false);
        return;
      }

      if (!schoolId) {
        setLoading(false);
        return;
      }

      // 1. Parallel loading of primary configurations
      const [setupRes, studentsRes, parentsRes, staffRes, eventsRes, announcementsRes, subjectsRes, weeklyAttendanceRes] = await Promise.all([
        fetch(`/api/setup?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/students?schoolId=${schoolId}&status=ALL`, { cache: 'no-store' }),
        fetch(`/api/parents?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/staff?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/events?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/announcements?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/subjects?schoolId=${schoolId}`, { cache: 'no-store' }),
        fetch(`/api/attendance?schoolId=${schoolId}&weekly=true`, { cache: 'no-store' })
      ]);

      if (setupRes.ok) {
        const json = await setupRes.json();
        setSetupData(json.data);
        currentTermId = json.data.terms?.find((t: any) => t.isCurrent)?.id || json.data.terms?.[0]?.id || '';
      }
      if (studentsRes.ok) {
        const json = await studentsRes.json();
        setStudents(json.data || []);
      }
      if (parentsRes.ok) {
        const json = await parentsRes.json();
        setParents(json.data || []);
      }
      if (staffRes.ok) {
        const json = await staffRes.json();
        setStaff(json.data || []);
      }
      if (eventsRes.ok) {
        const json = await eventsRes.json();
        setEvents(json.data || []);
      }
      if (announcementsRes.ok) {
        const json = await announcementsRes.json();
        setAnnouncements(json.data || []);
      }
      if (subjectsRes.ok) {
        const json = await subjectsRes.json();
        setSubjectsData(json.data || []);
      }
      if (weeklyAttendanceRes.ok) {
        const json = await weeklyAttendanceRes.json();
        setWeeklyAttendance(json.data || []);
      }

      // Fetch class statuses if admin
      if ((role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN') && currentTermId) {
        try {
          const statusRes = await fetch(`/api/reports/status?schoolId=${schoolId}&termId=${currentTermId}&all=true`, { cache: 'no-store' });
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            if (statusJson.success && statusJson.data) {
              setClassStatuses(statusJson.data);
            }
          }
        } catch (statusErr) {
          console.error('Error fetching class statuses', statusErr);
        }
      }

      // 2. Fetch notifications and submissions for teachers
      if (role === 'CLASS_TEACHER' || role === 'SUBJECT_TEACHER') {
        try {
          const notificationsRes = await fetch(`/api/notifications?schoolId=${schoolId}&userId=${sess.user.id}`, { cache: 'no-store' });
          if (notificationsRes.ok) {
            const notJson = await notificationsRes.json();
            setNotifications(notJson.data.notifications || []);
            setUnreadNotificationsCount(notJson.data.unreadCount || 0);
          }

          const submissionsRes = await fetch(`/api/submissions?schoolId=${schoolId}&teacherId=${sess.user.id}`, { cache: 'no-store' });
          if (submissionsRes.ok) {
            const subJson = await submissionsRes.json();
            setMySubmissions(subJson.data || []);
          }

          if (role === 'CLASS_TEACHER') {
            const pendingRes = await fetch(`/api/submissions?schoolId=${schoolId}&classTeacherId=${sess.user.id}`, { cache: 'no-store' });
            if (pendingRes.ok) {
              const penJson = await pendingRes.json();
              setPendingSubmissions(penJson.data || []);
            }
          }
        } catch (err) {
          console.error('Error fetching collaborative data for teacher', err);
        }
      }

      // Set default child for parents
      if (role === 'PARENT' && sess.user.parent?.students?.length > 0) {
        setSelectedChildId(sess.user.parent.students[0].id);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to aggregate dashboard reports');
      setLoading(false);
    }
  };

  // Mark all notifications as read
  const handleMarkNotificationsRead = async () => {
    if (unreadNotificationsCount === 0 || !session) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school?.id,
          userId: session.user.id
        })
      });
      if (res.ok) {
        setUnreadNotificationsCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Clear/delete all notifications for the teacher
  const handleClearNotifications = async () => {
    if (notifications.length === 0 || !session) return;
    if (!confirm('Are you sure you want to clear all alerts?')) return;
    try {
      const res = await fetch(`/api/notifications?schoolId=${session.school?.id}&userId=${session.user.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications([]);
        setUnreadNotificationsCount(0);
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to clear alerts');
      }
    } catch (err: any) {
      alert(err.message || 'Error clearing alerts');
    }
  };

  // Dismiss a single notification
  const handleDismissNotification = async (id: string) => {
    if (!session) return;
    try {
      const res = await fetch(`/api/notifications?schoolId=${session.school?.id}&userId=${session.user.id}&id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        const matched = notifications.find(n => n.id === id);
        if (matched && !matched.isRead) {
          setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const json = await res.json();
        alert(json.error || 'Failed to dismiss alert');
      }
    } catch (err: any) {
      alert(err.message || 'Error dismissing alert');
    }
  };

  // Review scores submission
  const handleReviewAction = async (submissionId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!session) return;
    setReviewLoading(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: submissionId,
          schoolId: session.school?.id,
          status,
          feedback: status === 'REJECTED' ? feedbackComments : undefined,
          userId: session.user.id
        })
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to evaluate scoresheet');
      
      setSuccessMsg(`Scoresheet successfully ${status === 'APPROVED' ? 'approved & published to report cards' : 'returned with correction instructions'}!`);
      setActiveReviewSubmission(null);
      setFeedbackComments('');
      
      fetchDashboardDetails(session);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleOpenRoster = (armId: string, className: string) => {
    const rosterList = students.filter(s => s.armId === armId && s.status === 'ACTIVE');
    setRosterStudents(rosterList);
    setRosterClassName(className);
    setShowRosterModal(true);
  };

  // Calendar Widget helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { firstDay, totalDays };
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const selectDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    setSelectedDateStr(`${year}-${month}-${dayStr}`);
    
    // Automatically trigger Add Event modal for Admins
    if (session && session.user) {
      const uRole = session.user.role;
      if (uRole === 'SCHOOL_ADMIN' || uRole === 'SUPER_ADMIN') {
        setShowAddEventModal(true);
      }
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    setEventSubmitting(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school?.id,
          title: newEventTitle.trim(),
          description: newEventDesc.trim(),
          date: selectedDateStr,
          time: newEventTime.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to create event.');
      }
      setEvents([...events, json.data]);
      setNewEventTitle('');
      setNewEventDesc('');
      setNewEventTime('08:00 AM - 09:00 AM');
      setShowAddEventModal(false);
    } catch (err: any) {
      alert(err.message || 'Error creating event.');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const res = await fetch(`/api/events?id=${eventId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete event.');
      }
      setEvents(events.filter(evt => evt.id !== eventId));
    } catch (err: any) {
      alert(err.message || 'Error deleting event.');
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await fetch(`/api/announcements?id=${annId}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to delete announcement.');
      }
      setAnnouncements(announcements.filter(ann => ann.id !== annId));
    } catch (err: any) {
      alert(err.message || 'Error deleting announcement.');
    }
  };



  if (loading) {
    return (
      <div className="min-h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Loading NachoEd Hub...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-xs font-semibold">Error assembling school systems: {error}</span>
      </div>
    );
  }

  const { user, school } = session;
  const role = user.role;
  const activeStudents = students.filter(s => s.status === 'ACTIVE');

  // RENDER CORRESPONDING DASHBOARD
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN';
  const isTeacher = role === 'CLASS_TEACHER' || role === 'SUBJECT_TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // --- CALENDAR DATA COMPILATION ---
  const currentMonthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const { firstDay, totalDays } = getDaysInMonth(currentDate);
  const calendarCells = [];
  // Fill initial padding empty slots
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(null);
  }
  // Fill calendar days
  for (let d = 1; d <= totalDays; d++) {
    calendarCells.push(d);
  }

  // Filter events and announcements for selected calendar date
  const selectedDateEvents = events.filter(e => e.date === selectedDateStr);
  const selectedDateAnnouncements = announcements.filter(a => a.date === selectedDateStr);

  // Fallbacks for charts
  const boysCount = activeStudents.filter(s => s.gender === 'MALE').length;
  const girlsCount = activeStudents.filter(s => s.gender === 'FEMALE').length;
  const totalBoysGirls = boysCount + girlsCount;
  const genderDonutData = [
    { name: 'Boys', value: boysCount > 0 ? boysCount : 35, color: '#38bdf8' }, // Sky-400
    { name: 'Girls', value: girlsCount > 0 ? girlsCount : 25, color: '#f472b6' }  // Pink-400
  ];

  // Grouped Weekly Attendance (Mon-Fri)
  const attendanceBarData = weeklyAttendance.length > 0 ? weeklyAttendance : [
    { day: 'Mon', Present: Math.round(activeStudents.length * 0.95) || 48, Absent: Math.round(activeStudents.length * 0.05) || 2 },
    { day: 'Tue', Present: Math.round(activeStudents.length * 0.96) || 49, Absent: Math.round(activeStudents.length * 0.04) || 1 },
    { day: 'Wed', Present: Math.round(activeStudents.length * 0.92) || 47, Absent: Math.round(activeStudents.length * 0.08) || 3 },
    { day: 'Thu', Present: Math.round(activeStudents.length * 0.94) || 48, Absent: Math.round(activeStudents.length * 0.06) || 2 },
    { day: 'Fri', Present: Math.round(activeStudents.length * 0.88) || 45, Absent: Math.round(activeStudents.length * 0.12) || 5 },
  ];

  const kpiCountAdmins = staff.filter(s => s.role === 'SCHOOL_ADMIN').length;
  const kpiCountTeachers = staff.filter(s => ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'].includes(s.role)).length;
  const kpiCountStudents = students.length;
  const kpiCountParents = parents.length;

  return (
    <div className="space-y-6">
      
      {/* 1. TOP ANCHOR: Profile welcome block */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">{school?.name || 'NachoEd'} Operating Hub</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Hello, <span className="text-[#10b981] serif-italic font-normal">{user.firstName} {user.lastName}</span>!
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Active Tenant Boundary: <strong className="text-[#1e293b] font-bold">{school?.name || 'NachoEd Global Platform'}</strong> • Authorized Role: <strong className="text-slate-600 capitalize">{role.toLowerCase().replace('_', ' ')}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-4 py-2 rounded-2xl text-[11px] font-bold text-slate-600 shadow-inner">
          <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
          <span>Academic Term: {setupData?.terms?.find((t: any) => t.isCurrent)?.name || 'First Term'} (2025/2026)</span>
        </div>
      </div>

      {/* 2. CHOOSE DASHBOARD VIEW ACCORDING TO ROLE */}
      
      {/* ========================================================
          ADMINISTRATOR DASHBOARD VIEW
          ======================================================== */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SECTION (Col Span 8) - Primary Metrics and Analytics Charts */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* KPI Metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {/* Admins block */}
              <div className="bg-[#edf2fe] border border-blue-100/60 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="block text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Admins</span>
                  <span className="block text-2xl font-black text-blue-800 mt-1">{kpiCountAdmins}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white text-blue-600 shadow-inner">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* Teachers block */}
              <div className="bg-[#fdf4e9] border border-amber-100/60 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="block text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Teachers</span>
                  <span className="block text-2xl font-black text-amber-800 mt-1">{kpiCountTeachers}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white text-amber-600 shadow-inner">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* Students block */}
              <div className="bg-[#eafaf1] border border-emerald-100/60 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="block text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">Students</span>
                  <span className="block text-2xl font-black text-emerald-800 mt-1">{kpiCountStudents}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white text-emerald-600 shadow-inner">
                  <GraduationCap className="w-5 h-5" />
                </div>
              </div>

              {/* Parents block */}
              <div className="bg-[#fbf1f2] border border-red-100/60 p-4 rounded-3xl flex items-center justify-between shadow-sm">
                <div>
                  <span className="block text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Parents</span>
                  <span className="block text-2xl font-black text-red-800 mt-1">{kpiCountParents}</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-white text-red-600 shadow-inner">
                  <User className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Class Compilation Status Roster */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Class Report Cards Status Roster</h3>
                </div>
                <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">APPROVAL CONTROL</span>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-black uppercase tracking-wider text-slate-500">
                      <th className="p-3.5">Class / Arm</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {(() => {
                      const allClassArms = [];
                      if (setupData?.classes && setupData?.arms) {
                        for (const cls of setupData.classes) {
                          const relatedArms = setupData.arms.filter((a: any) => a.classId === cls.id);
                          for (const arm of relatedArms) {
                            const matchedStatus = classStatuses.find(
                              (s: any) => s.classId === cls.id && s.armId === arm.id
                            );
                            allClassArms.push({
                              classId: cls.id,
                              className: cls.name,
                              armId: arm.id,
                              armName: arm.name,
                              status: matchedStatus?.status || 'DRAFT',
                              feedback: matchedStatus?.feedback || null,
                            });
                          }
                        }
                      }

                      if (allClassArms.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-slate-400 font-medium italic">
                              No classes or arms configured yet in setups.
                            </td>
                          </tr>
                        );
                      }

                      const termId = setupData?.terms?.find((t: any) => t.isCurrent)?.id || setupData?.terms?.[0]?.id || '';

                      return allClassArms.map((item) => {
                        let statusColor = 'bg-slate-50 text-slate-600 border-slate-150';
                        let statusText = 'Draft';
                        if (item.status === 'AWAITING_APPROVAL') {
                          statusColor = 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse';
                          statusText = 'Pending Approval';
                        } else if (item.status === 'APPROVED') {
                          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          statusText = 'Released to Parents';
                        } else if (item.status === 'REJECTED') {
                          statusColor = 'bg-rose-50 text-rose-700 border-rose-200';
                          statusText = 'Correction Required';
                        }

                        return (
                          <tr key={`${item.classId}-${item.armId}`} className="hover:bg-slate-50/40 transition-colors">
                            <td className="p-3.5">
                              <span className="font-extrabold text-slate-800">{item.className} {item.armName}</span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase border ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <a
                                href={`/dashboard/compile?classId=${item.classId}&armId=${item.armId}&termId=${termId}`}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm border ${
                                  item.status === 'AWAITING_APPROVAL'
                                    ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white shadow-amber-500/10'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-650 hover:text-slate-805'
                                }`}
                              >
                                {item.status === 'AWAITING_APPROVAL' ? (
                                  <>Review & Approve <ArrowRight className="w-3 h-3" /></>
                                ) : (
                                  <>Inspect Compiler <Eye className="w-3 h-3" /></>
                                )}
                              </a>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CHARTS CONTAINER GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Boys vs Girls Donut Chart (Col Span 5) */}
              <div className="md:col-span-5 bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-80">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Students Gender Ratio</h3>
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[8px] font-extrabold">DEMOGRAPHICS</span>
                </div>

                <div className="relative h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {genderDonutData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute text-center">
                    <span className="block text-xl font-black text-slate-800">{totalBoysGirls}</span>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Enrolled</span>
                  </div>
                </div>

                <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span>Boys ({boysCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                    <span>Girls ({girlsCount})</span>
                  </div>
                </div>
              </div>

              {/* Attendance Present vs Absent Grouped Bar Chart (Col Span 7) */}
              <div className="md:col-span-7 bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-80">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Student Weekly Attendance</h3>
                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 text-[8px] font-extrabold animate-pulse">LIVE • MON-FRI</span>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={attendanceBarData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9', fontSize: '11px' }} />
                      <Bar dataKey="Present" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
                      <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex justify-center gap-6 text-[10px] font-bold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span>Present</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span>Absent</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Announcements BULLETIN board (Bottom) */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-purple-500" />
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">Official Announcements Bulletin</h3>
                </div>
                <span className="text-[9px] font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">BROADCAST FEED</span>
              </div>

              <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <p className="text-[11px] text-slate-400 font-bold text-center py-6">No announcements broadcasted yet.</p>
                ) : (
                  announcements.map((ann: any) => (
                    <div key={ann.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/50 hover:bg-slate-100/30 transition-colors relative group">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-[12px] text-slate-800 line-clamp-1">{ann.title}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded bg-white text-[9px] font-black text-slate-400 border border-slate-100 uppercase tracking-wider">{ann.date}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-1 rounded bg-red-50 hover:bg-red-100 border border-red-100 text-red-500 transition-colors cursor-pointer lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                              title="Delete announcement"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1.5">{ann.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* RIGHT SECTION (Col Span 4) - Calendar & Date Specific Events */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Interactive Calendar widget */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> School Calendar
                </h4>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-[10px] font-black text-slate-700 px-1 uppercase tracking-wide">{currentMonthName}</span>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Days of Week headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
                {calendarCells.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const cellDateStr = `${year}-${month}-${dayStr}`;
                  const isSelected = cellDateStr === selectedDateStr;
                  const isToday = cellDateStr === new Date().toISOString().split('T')[0];

                  // Has events on this day?
                  const hasEvents = events.some(e => e.date === cellDateStr);

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-all relative ${
                        isSelected 
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' 
                          : isToday 
                            ? 'bg-blue-50 text-blue-600 font-extrabold border border-blue-200' 
                            : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {day}
                      {hasEvents && !isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events schedule LISTING card (Linked to selected day) */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Events & Schedules</span>
                  <span className="block text-[8px] font-extrabold text-blue-600 bg-blue-50/60 px-2 py-0.5 rounded tracking-wider uppercase w-max">{selectedDateStr}</span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Event
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {selectedDateEvents.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl p-4">
                    <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Scheduled Events</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Nothing scheduled for this calendar date.</p>
                  </div>
                ) : (
                  selectedDateEvents.map((evt: any) => (
                    <div 
                      key={evt.id} 
                      className="border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 rounded-3xl space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-slate-800 text-[12px]">{evt.title}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="px-2 py-0.5 rounded bg-white text-[8px] font-black text-blue-600 border border-blue-100 uppercase tracking-widest">{evt.time}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(evt.id)}
                              className="p-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer flex items-center justify-center flex-shrink-0"
                              title="Delete Event"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      {evt.description && (
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{evt.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>


          </div>

        </div>
      )}

      {/* ========================================================
          TEACHER DASHBOARD VIEW
          ======================================================== */}
      {isTeacher && (
        <div className="space-y-6">

          {/* ── Class Teacher Command Center Banner ── */}
          {role === 'CLASS_TEACHER' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="h-1 w-full bg-indigo-500" />
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                      <Users className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800">Class Teacher Dashboard</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium max-w-lg leading-relaxed">
                    Access your dedicated dashboard — take attendance, track subject submissions, view class rankings, and generate report cards.
                  </p>
                </div>
                <a
                  href="/dashboard/class"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 flex-shrink-0"
                >
                  Open Class Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Welcome assignments card */}
          <div className="bg-[#edf2fe] border border-blue-100 p-6 rounded-3xl shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-blue-800 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" /> My Active Course Allocations
            </h3>
            <p className="text-xs text-blue-700/80 font-medium max-w-2xl leading-relaxed">
              Below is the overview of academic assignments mapped to your staff account for this term. Enter scores, record draft cards, and submit sheets for collaborative Class Teacher reviews.
            </p>
          </div>

          {/* Assignments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjectsData?.assignments?.filter((a: any) => a.teacherId === user.id).length === 0 ? (
              <div className="col-span-full py-16 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">No assigned class allocation rules</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto">Contact your Principal to assign subjects and classroom stream mappings to your profile.</p>
              </div>
            ) : (
              subjectsData?.assignments?.filter((a: any) => a.teacherId === user.id).map((assignment: any) => {
                const term = setupData?.terms?.find((t: any) => t.isCurrent) || setupData?.terms?.[0];
                const matchedSub = mySubmissions.find(
                  (s: any) => 
                    s.subjectId === assignment.subjectId && 
                    s.classId === assignment.classId && 
                    s.armId === assignment.armId && 
                    s.termId === term?.id
                );
                const subStatus = matchedSub?.status || 'NOT_STARTED';

                let statusLabel = 'Not Started';
                let badgeStyle = 'bg-slate-100 border-slate-200 text-slate-500';
                
                if (subStatus === 'DRAFT') {
                  statusLabel = 'Draft Saved';
                  badgeStyle = 'bg-blue-50 border-blue-100 text-blue-600';
                } else if (subStatus === 'PENDING') {
                  statusLabel = 'Awaiting Review';
                  badgeStyle = 'bg-amber-50 border-amber-100 text-amber-600';
                } else if (subStatus === 'APPROVED') {
                  statusLabel = 'Published';
                  badgeStyle = 'bg-green-50 border-green-100 text-green-600';
                } else if (subStatus === 'REJECTED') {
                  statusLabel = 'Corrections Required';
                  badgeStyle = 'bg-red-50 border-red-100 text-red-600 animate-pulse';
                }

                const className = `${assignment.class.name} ${assignment.arm.name}`;
                const subjectName = assignment.subject.name;

                return (
                  <div key={assignment.id} className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-44">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-sm text-slate-800 line-clamp-1">{subjectName}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border flex-shrink-0 tracking-wider ${badgeStyle}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-400 mt-1">Classroom: <strong className="text-slate-600">{className}</strong></p>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">{assignment.subject.code}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{assignment.subject.category}</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 border-t border-slate-50 pt-3">
                      <button
                        type="button"
                        onClick={() => handleOpenRoster(assignment.armId, className)}
                        className="flex-1 py-2 px-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Roster
                      </button>
                      <a
                        href={`/dashboard/scores?classId=${assignment.classId}&armId=${assignment.armId}&subjectId=${assignment.subjectId}&termId=${term?.id || ''}`}
                        className={`flex-1 py-2 px-3 rounded-2xl text-[10px] font-extrabold text-center flex items-center justify-center gap-1 transition-all ${
                          subStatus === 'APPROVED'
                            ? 'bg-slate-50 border border-slate-100 text-slate-300 pointer-events-none'
                            : 'bg-blue-600 text-white hover:bg-blue-500 shadow-sm shadow-blue-600/10'
                        }`}
                      >
                        {subStatus === 'APPROVED' ? 'Scores Locked' : 'Enter Scores'} <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Form Teacher Review Panel & Notifications Feed */}
          {role === 'CLASS_TEACHER' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left review list (Col Span 8) */}
              <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Collaborative Scoresheets Review Queue</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Approve subject-level submissions to compile student report cards.</p>
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button onClick={handleMarkNotificationsRead} className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded">Mark All Read</button>
                  )}
                </div>

                {successMsg && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600 text-xs flex justify-between items-center">
                    <span>{successMsg}</span>
                    <button type="button" onClick={() => setSuccessMsg('')} className="font-extrabold">✕</button>
                  </div>
                )}

                {pendingSubmissions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">No submissions in queue</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingSubmissions.map((sub: any) => {
                      const payloadScores = JSON.parse(sub.payload || '[]');
                      return (
                        <div key={sub.id} className="py-3.5 flex justify-between items-center gap-4">
                          <div>
                            <span className="font-bold text-slate-800 text-[13px]">{sub.subject.name} ({sub.subject.code})</span>
                            <p className="text-xs text-slate-400 mt-0.5">Compiled by: {sub.teacher.title ? `${sub.teacher.title} ` : ''}{sub.teacher.firstName} {sub.teacher.lastName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveReviewSubmission({ ...sub, scores: payloadScores })}
                            className="py-1.5 px-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-xs"
                          >
                            Review
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Notifications Feed (Col Span 4) */}
              <div className="lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Teacher Alerts</h3>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleClearNotifications}
                      className="text-[9px] font-black bg-red-50 text-red-600 hover:bg-red-100/70 px-2 py-1 rounded transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-[11px] text-slate-400 font-bold text-center py-8">No alerts received.</p>
                  ) : (
                    notifications.map((n: any) => (
                      <div key={n.id} className={`p-3 rounded-2xl border text-[11px] leading-relaxed relative pr-8 ${n.isRead ? 'bg-slate-50 border-slate-100 text-slate-400' : 'bg-blue-50/30 border-blue-100 text-slate-700'}`}>
                        {!n.isRead && <span className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        
                        {/* Individual Dismiss Button */}
                        <button
                          onClick={() => handleDismissNotification(n.id)}
                          className="absolute bottom-3 right-3 text-slate-455 hover:text-red-500 transition-colors font-extrabold text-[10px]"
                          title="Dismiss alert"
                        >
                          ✕
                        </button>
                        
                        <p>{n.message}</p>
                        <span className="block text-[8px] text-slate-400 font-extrabold mt-1">{new Date(n.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================
          STUDENT DASHBOARD VIEW
          ======================================================== */}
      {isStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Profile Overview (Col Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Student details block */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row gap-5 items-center">
              
              {/* Photo */}
              <div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                {user.student?.passportPhoto ? (
                  <img 
                    src={user.student.passportPhoto} 
                    alt="Passport" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-300" />
                )}
              </div>

              {/* Text info */}
              <div className="space-y-1.5 text-center sm:text-left flex-1">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-wider">ACTIVE PROFILE</span>
                <h2 className="text-lg font-black text-slate-800">{user.student?.lastName}, {user.student?.firstName} {user.student?.middleName || ''}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 font-semibold">
                  <p>Admission No: <strong className="text-slate-600">{user.student?.admissionNumber || 'GW-1002'}</strong></p>
                  <p>Class Stream: <strong className="text-slate-600">{user.student?.class?.name || 'JSS 1'} {user.student?.arm?.name || 'A'}</strong></p>
                  <p>Gender: <strong className="text-slate-600 uppercase">{user.student?.gender}</strong></p>
                  <p>DOB: <strong className="text-slate-600">{user.student?.dateOfBirth || 'Not Listed'}</strong></p>
                </div>
              </div>

            </div>

            {/* Attendance indicator card */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Term Attendance Ledger</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 bg-green-50 border border-green-100 rounded-2xl text-center">
                  <span className="block text-[10px] font-extrabold text-green-600 uppercase tracking-widest">Present Days</span>
                  <span className="block text-2xl font-black text-green-800 mt-1">48</span>
                </div>
                <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl text-center">
                  <span className="block text-[10px] font-extrabold text-red-600 uppercase tracking-widest">Absent Days</span>
                  <span className="block text-2xl font-black text-red-800 mt-1">2</span>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                  <span className="block text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Rate</span>
                  <span className="block text-2xl font-black text-blue-800 mt-1">96%</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Status</span>
                  <span className="block text-[11px] font-black text-slate-700 mt-3 uppercase tracking-wider">EXCELLENT</span>
                </div>
              </div>
            </div>

            {/* Grade card tracker */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider">Report Cards Overview</h3>
                {activeReportStatus === 'APPROVED' ? (
                  <a 
                    href={`/dashboard/compile?termId=${setupData?.terms?.find((t: any) => t.isCurrent)?.id || setupData?.terms?.[0]?.id || ''}`} 
                    className="text-[10px] font-black text-blue-600 hover:underline"
                  >
                    View Official Sheet →
                  </a>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Unavailable</span>
                )}
              </div>
              
              {activeReportStatus === 'APPROVED' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-150 text-emerald-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold uppercase">Results Published!</span>
                  </div>
                  <p className="text-[11px] text-emerald-750 font-semibold leading-relaxed animate-in fade-in duration-300">
                    Your official report card has been approved and released. Click the link above to view your grades, class position, teacher remarks, and print your card.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-150 text-amber-800 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase">Compilation Underway</span>
                  </div>
                  <p className="text-[11px] text-amber-700 font-semibold leading-relaxed animate-in fade-in duration-300">
                    First Term results compilation is currently in progress. The administration will publish and notify you as soon as report cards are approved.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Right Section: Interactive Calendar with selected day events (Col Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Interactive Calendar widget */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> School Calendar
                </h4>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <span className="text-[10px] font-black text-slate-700 px-1 uppercase tracking-wide">{currentMonthName}</span>
                  <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Days of Week headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
                {calendarCells.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} />;
                  
                  const year = currentDate.getFullYear();
                  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(day).padStart(2, '0');
                  const cellDateStr = `${year}-${month}-${dayStr}`;
                  const isSelected = cellDateStr === selectedDateStr;
                  const isToday = cellDateStr === new Date().toISOString().split('T')[0];

                  // Has events on this day?
                  const hasEvents = events.some(e => e.date === cellDateStr);

                  return (
                    <button
                      key={`day-${day}`}
                      type="button"
                      onClick={() => selectDay(day)}
                      className={`h-7 w-7 rounded-full flex items-center justify-center transition-all relative ${
                        isSelected 
                          ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' 
                          : isToday 
                            ? 'bg-blue-50 text-blue-600 font-extrabold border border-blue-200' 
                            : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {day}
                      {hasEvents && !isSelected && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Events schedule LISTING card (Linked to selected day) */}
            <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Events & Schedules</span>
                <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wider uppercase">{selectedDateStr}</span>
              </div>

              <div className="space-y-3.5">
                {selectedDateEvents.length === 0 ? (
                  <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl p-4">
                    <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Scheduled Events</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Nothing scheduled for this calendar date.</p>
                  </div>
                ) : (
                  selectedDateEvents.map((evt: any) => (
                    <div 
                      key={evt.id} 
                      className="border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 rounded-3xl space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-slate-800 text-[12px]">{evt.title}</span>
                        <span className="px-2 py-0.5 rounded bg-white text-[8px] font-black text-blue-600 border border-blue-100 uppercase tracking-widest">{evt.time}</span>
                      </div>
                      {evt.description && (
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{evt.description}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================
          PARENT DASHBOARD VIEW
          ======================================================== */}
      {isParent && (
        <div className="space-y-6">
          
          {/* Child Switcher Selector */}
          <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Control</span>
              <h2 className="text-base font-extrabold text-slate-700 mt-1">Supervise Enrolled Wards</h2>
            </div>

            {/* Child Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Select Child:</span>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="bg-slate-50 border border-slate-150 rounded-2xl py-1.5 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-0"
              >
                {user.parent?.students?.map((kid: any) => (
                  <option key={kid.id} value={kid.id}>{kid.firstName} {kid.lastName} ({kid.class?.name || 'Class'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Render selected child's details directly */}
          {selectedChildId ? (() => {
            const kid = user.parent.students.find((k: any) => k.id === selectedChildId);
            if (!kid) return null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Child profile details */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Bio details card */}
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row gap-5 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                      {kid.passportPhoto ? (
                        <img 
                          src={kid.passportPhoto} 
                          alt="Passport" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <User className="w-10 h-10 text-slate-300" />
                      )}
                    </div>

                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 text-[8px] font-black uppercase tracking-wider">WARD FILE ACTIVE</span>
                      <h3 className="text-base font-black text-slate-800 mt-1">{kid.lastName}, {kid.firstName} {kid.middleName || ''}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-slate-450 font-semibold">
                        <p>Admission No: <strong className="text-slate-600">{kid.admissionNumber}</strong></p>
                        <p>Class Stream: <strong className="text-slate-600">{kid.class?.name} {kid.arm?.name}</strong></p>
                        <p>Gender: <strong className="text-slate-600 uppercase">{kid.gender}</strong></p>
                        <p>DOB: <strong className="text-slate-600">{kid.dateOfBirth || 'Not Listed'}</strong></p>
                        <p>Status: <strong className="text-green-600 uppercase">{kid.status}</strong></p>
                        <p>Fees Ledger: <strong className={kid.feesPaid ? 'text-green-600' : 'text-amber-600'}>{kid.feesPaid ? 'Fully Paid' : 'Pending Allocation'}</strong></p>
                      </div>
                    </div>
                  </div>

                  {/* Ward attendance summaries */}
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-3">
                    <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Ward Performance & Attendance</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Days Present</span>
                        <span className="block text-xl font-black text-slate-700 mt-1">48</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                        <span className="block text-[9px] font-extrabold text-slate-400 uppercase">Days Absent</span>
                        <span className="block text-xl font-black text-slate-700 mt-1">2</span>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-center">
                        <span className="block text-[9px] font-extrabold text-blue-600 uppercase">Rate Ratio</span>
                        <span className="block text-xl font-black text-blue-700 mt-1">96%</span>
                      </div>
                    </div>
                  </div>

                  {/* Grades summary linking parent directly to scores */}
                  <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <h4 className="text-xs font-black uppercase text-slate-600 tracking-wider">Ward Academic Report cards</h4>
                      {activeReportStatus === 'APPROVED' ? (
                        <a 
                          href={`/dashboard/compile?classId=${kid.classId}&armId=${kid.armId}&termId=${setupData?.terms?.find((t: any) => t.isCurrent)?.id || setupData?.terms?.[0]?.id || ''}&studentId=${kid.id}`} 
                          className="text-[10px] font-black text-blue-650 hover:underline"
                        >
                          Access Official Grade Cards →
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Locked</span>
                      )}
                    </div>
                    
                    {activeReportStatus === 'APPROVED' ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-150 text-emerald-800 space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-extrabold uppercase">Results Released!</span>
                        </div>
                        <p className="text-[11px] text-emerald-700 font-semibold leading-relaxed animate-in fade-in duration-300">
                          {kid.firstName}'s official academic report card has been approved and released. Click the link above to inspect grades and print the card.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-150 text-amber-800 space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
                          <span className="text-xs font-extrabold uppercase">Compilation Underway</span>
                        </div>
                        <p className="text-[11px] text-amber-700 font-semibold leading-relaxed animate-in fade-in duration-300">
                          Results compile for {kid.firstName}'s class is currently being compiled and reviewed. We will notify you once they are released by the administration.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Calendar & events for parents (Col Span 4) */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Calendar */}
                  <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> School Calendar
                      </h4>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-[10px] font-black text-slate-700 px-1 uppercase tracking-wide">{currentMonthName}</span>
                        <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-500"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {/* Days of Week headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
                      {calendarCells.map((day, idx) => {
                        if (day === null) return <div key={`empty-${idx}`} />;
                        
                        const year = currentDate.getFullYear();
                        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                        const dayStr = String(day).padStart(2, '0');
                        const cellDateStr = `${year}-${month}-${dayStr}`;
                        const isSelected = cellDateStr === selectedDateStr;
                        const isToday = cellDateStr === new Date().toISOString().split('T')[0];

                        // Has events on this day?
                        const hasEvents = events.some(e => e.date === cellDateStr);

                        return (
                          <button
                            key={`day-${day}`}
                            type="button"
                            onClick={() => selectDay(day)}
                            className={`h-7 w-7 rounded-full flex items-center justify-center transition-all relative ${
                              isSelected 
                                ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20' 
                                : isToday 
                                  ? 'bg-blue-50 text-blue-600 font-extrabold border border-blue-200' 
                                  : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {day}
                            {hasEvents && !isSelected && (
                              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="bg-white border border-slate-100 p-5 rounded-3xl shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Events & Schedules</span>
                      <span className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded tracking-wider uppercase">{selectedDateStr}</span>
                    </div>

                    <div className="space-y-3.5">
                      {selectedDateEvents.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-3xl p-4">
                          <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Scheduled Events</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Nothing scheduled for this calendar date.</p>
                        </div>
                      ) : (
                        selectedDateEvents.map((evt: any) => (
                          <div 
                            key={evt.id} 
                            className="border-2 border-dashed border-blue-200 bg-blue-50/20 p-4 rounded-3xl space-y-1.5"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-slate-800 text-[12px]">{evt.title}</span>
                              <span className="px-2 py-0.5 rounded bg-white text-[8px] font-black text-blue-600 border border-blue-100 uppercase tracking-widest">{evt.time}</span>
                            </div>
                            {evt.description && (
                              <p className="text-[10px] text-slate-550 font-medium leading-relaxed">{evt.description}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            );
          })() : (
            <p className="text-xs font-bold text-center text-slate-400 py-16 bg-white border border-slate-100 rounded-3xl">No children mapped to your profile record.</p>
          )}

        </div>
      )}

      {/* ========================================================
          ROSTER MODAL & REVIEW SHEET DRAWER (Teacher shared context)
          ======================================================== */}
      
      {/* Review Drawer Modal */}
      {activeReviewSubmission && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn"
          onClick={() => {
            setActiveReviewSubmission(null);
            setFeedbackComments('');
          }}
        >
          <div 
            className="bg-white border border-slate-150 rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => {
                setActiveReviewSubmission(null);
                setFeedbackComments('');
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-800">Review Scoresheet: {activeReviewSubmission.subject.name}</h3>
                <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase">{activeReviewSubmission.subject.code}</span>
              </div>
              <p className="text-xs text-slate-450 font-semibold">
                Classroom: <strong className="text-slate-700">{activeReviewSubmission.class.name} {activeReviewSubmission.arm.name}</strong> • Compiled by <strong className="text-slate-700">{activeReviewSubmission.teacher.title ? `${activeReviewSubmission.teacher.title} ` : ''}{activeReviewSubmission.teacher.firstName} {activeReviewSubmission.teacher.lastName}</strong>
              </p>
            </div>

            {/* Score Grid Table Scrollable Container */}
            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-2xl bg-slate-50/50 mb-4 min-h-0">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500 sticky top-0 z-10">
                    <th className="p-3">Adm ID</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3 text-center">CA1 (15)</th>
                    <th className="p-3 text-center">CA2 (15)</th>
                    <th className="p-3 text-center">Asg (10)</th>
                    <th className="p-3 text-center">Exam (60)</th>
                    <th className="p-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {activeReviewSubmission.scores.map((row: any, idx: number) => {
                    const c1 = row.ca1 || 0;
                    const c2 = row.ca2 || 0;
                    const asg = row.assignment || 0;
                    const ex = row.exam || 0;
                    const computedTotal = row.ca1 === null && row.ca2 === null && row.assignment === null && row.exam === null ? null : Number((c1 + c2 + asg + ex).toFixed(1));
                    
                    const studName = students.find(s => s.id === row.studentId);
                    const nameLabel = studName ? `${studName.lastName}, ${studName.firstName}` : 'Unknown Student';
                    const admNum = studName ? studName.admissionNumber : '-';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-slate-400">{admNum}</td>
                        <td className="p-3 font-semibold text-slate-700">{nameLabel}</td>
                        <td className="p-3 text-center font-mono font-bold">{row.ca1 ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-bold">{row.ca2 ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-bold">{row.assignment ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-bold">{row.exam ?? '-'}</td>
                        <td className="p-3 text-center font-mono font-black text-blue-600 bg-blue-50/40">{computedTotal ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rejection comment field */}
            <div className="space-y-1.5 pt-2 mb-4">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Rejection Feedback comments</label>
              <textarea
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder="Write comments here only if rejecting scoresheet. E.g., Please adjust the CA scores of Timi..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-300 min-h-16"
              />
            </div>

            {/* Footer action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveReviewSubmission(null);
                  setFeedbackComments('');
                }}
                className="py-2.5 px-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors text-center"
              >
                Close Review
              </button>
              
              <div className="flex-1 flex gap-3">
                <button
                  type="button"
                  disabled={reviewLoading}
                  onClick={() => handleReviewAction(activeReviewSubmission.id, 'REJECTED')}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 font-bold text-xs transition-colors text-center disabled:opacity-50"
                >
                  Reject & Send Feedback
                </button>
                <button
                  type="button"
                  disabled={reviewLoading}
                  onClick={() => handleReviewAction(activeReviewSubmission.id, 'APPROVED')}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs transition-all text-center disabled:opacity-50 flex justify-center items-center gap-1.5 shadow-md shadow-green-600/10"
                >
                  <CheckCircle className="w-4 h-4" /> Approve & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {showRosterModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn"
          onClick={() => {
            setShowRosterModal(false);
            setRosterStudents([]);
            setRosterClassName('');
          }}
        >
          <div 
            className="bg-white border border-slate-150 rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => {
                setShowRosterModal(false);
                setRosterStudents([]);
                setRosterClassName('');
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="space-y-1 mb-4">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-500" />
                Class Roster: {rosterClassName}
              </h3>
              <p className="text-xs text-slate-450 font-semibold">
                Active students currently enrolled in this stream. Only school administrators can modify registers.
              </p>
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto border border-slate-150 rounded-2xl bg-slate-50/50 mb-5 min-h-0 divide-y divide-slate-100">
              {rosterStudents.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                  No active students registered in this class arm.
                </div>
              ) : (
                rosterStudents.map((st: any, idx: number) => (
                  <div key={st.id} className="p-3.5 flex items-center justify-between hover:bg-slate-100/30 transition-colors">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs text-slate-800">
                        {idx + 1}. {st.lastName}, {st.firstName} {st.middleName || ''}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">ADM NO: {st.admissionNumber}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        st.feesPaid 
                          ? 'bg-green-50 text-green-600 border-green-100' 
                          : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}>
                        {st.feesPaid ? 'Fees Paid' : 'Fees Pending'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{st.gender}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRosterModal(false);
                  setRosterStudents([]);
                  setRosterClassName('');
                }}
                className="py-2.5 px-6 rounded-2xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddEventModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn"
          onClick={() => setShowAddEventModal(false)}
        >
          <form 
            onSubmit={handleCreateEvent}
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-150 rounded-[30px] p-6 max-w-md w-full shadow-2xl relative flex flex-col space-y-4"
          >
            <button 
              type="button" 
              onClick={() => setShowAddEventModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-blue-500" />
                Add School Event
              </h3>
              <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                For Date: {selectedDateStr}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Event Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Science Exhibition"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Time/Duration</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. 09:00 AM - 11:30 AM"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Description</label>
                <textarea 
                  placeholder="Describe the activity..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddEventModal(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={eventSubmitting}
                className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/10 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {eventSubmitting ? 'Saving...' : 'Save Event'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';

