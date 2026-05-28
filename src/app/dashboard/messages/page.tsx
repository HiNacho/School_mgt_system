'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, Send, CheckCircle, AlertCircle, Users, 
  RefreshCw, Calendar, Megaphone, Inbox, Bookmark, Eye,
  AlertTriangle, Clock, ArrowRight, ShieldAlert, Award, FileText,
  ArrowLeft, Check, BookOpen, Sparkles
} from 'lucide-react';

interface Message {
  id: string;
  title: string;
  body: string;
  messageType: string;
  targetAudience: string;
  priority: string;
  isPinned: boolean;
  scheduledFor: string | null;
  expiresAt: string | null;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    passportPhoto: string | null;
  } | null;
  deliveryStats?: {
    totalRecipients: number;
    readCount: number;
    viewedPercentage: number;
  };
}

interface Term {
  id: string;
  name: string;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Arm {
  id: string;
  name: string;
  classId: string;
}

interface Template {
  id: string;
  name: string;
  category: 'Academic' | 'Attendance' | 'Administrative' | 'Teacher Notifications';
  defaultCategory: string;
  defaultPriority: 'NORMAL' | 'HIGH' | 'URGENT';
  defaultTargetAudience: string;
  title: string;
  body: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'scratch',
    name: '📝 Start from Scratch',
    category: 'Administrative',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'ALL',
    title: '',
    body: '',
    description: 'Create a blank message with custom audience and settings.'
  },
  {
    id: 'result-published',
    name: '🎓 Result Published',
    category: 'Academic',
    defaultCategory: 'Regarding Result',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'PARENTS',
    title: 'Student Terminal Results Officially Published',
    body: 'Dear Parents and Students,\n\nWe are pleased to inform you that the academic terminal results for the [Term] have been officially compiled and published.\n\nYou can now log in to your portal dashboard, click on the "Report Cards" section, and download or print your child\'s scorecard.\n\nShould you have any questions regarding subject grading or performance metrics, please do not hesitate to contact the academic director\'s office.\n\nWarm regards,\nGreenwood Academic Registry',
    description: 'Notify parents and students that report cards are published.'
  },
  {
    id: 'test-reminder',
    name: '📝 Test Reminder',
    category: 'Academic',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'STUDENTS',
    title: 'Continuous Assessment Tests (CA) Commencing Soon',
    body: 'Dear Students and Parents,\n\nThis is a quick reminder that the continuous assessment (CA) tests for this term will commence on [Date].\n\nThese tests contribute 30% of the overall terminal grade. We advise all students to utilize the revision materials and class notes provided by subject teachers. Daily preparation schedules should be strictly followed.\n\nBest of luck to all our students!\n\nSincerely,\nSchool Administration',
    description: 'Remind students of upcoming continuous assessment tests.'
  },
  {
    id: 'exam-schedule',
    name: '📅 Exam Schedule',
    category: 'Academic',
    defaultCategory: 'General Announcement',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'ALL',
    title: 'Official Terminal Examination Timetable & Rules',
    body: 'Dear Greenwood Community,\n\nThe official examination timetable for the [Term] terminal exams has been uploaded and pinned to the bulletin board.\n\nExaminations will officially begin on [StartDate] and conclude on [EndDate].\n\nImportant Guidelines:\n1. Students must arrive at least 30 minutes before their scheduled paper.\n2. Complete, neat school uniforms are mandatory.\n3. All writing materials must be sorted in transparent cases.\n\nLet us cooperate to ensure a smooth exam cycle.\n\nBest regards,\nOffice of the Principal',
    description: 'Broadcast final examination timetable and rules.'
  },
  {
    id: 'outstanding-results',
    name: '📁 Outstanding Result Submission',
    category: 'Academic',
    defaultCategory: 'General Announcement',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'TEACHERS',
    title: 'Urgent: Outstanding Subject Score Sheet Submissions',
    body: 'Dear Teachers,\n\nAs we approach the end of the term, please ensure all outstanding student score sheets for your assigned subjects are fully updated and locked on the portal.\n\nThe deadline for submission is [Date] at [Time].\n\nTimely submissions are critical to ensure that report cards are compiled and reviewed before the final publication. Thank you for your continued dedication.\n\nAcademic Registrar',
    description: 'Urge teachers to submit their outstanding grades.'
  },
  {
    id: 'absent-today',
    name: '⚠️ Absent Today',
    category: 'Attendance',
    defaultCategory: 'Regarding Attendance',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'PARENTS',
    title: 'Daily Roster Alert: Student Notice of Absence',
    body: 'Dear Parent,\n\nThis is to notify you that your child, [StudentName], was officially marked ABSENT during today\'s morning register check on [Date].\n\nIf you are aware of this absence due to illness or personal reasons, please reply to this notice or call the school administrator at your earliest convenience to provide formal verification.\n\nThank you for partnering with us to ensure student safety.\n\nAttendance Office',
    description: 'Alert a parent that their child is marked absent today.'
  },
  {
    id: 'low-attendance',
    name: '📉 Low Attendance Warning',
    category: 'Attendance',
    defaultCategory: 'Regarding Attendance',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'PARENTS',
    title: 'Urgent: Low Terminal Attendance Caution Alert',
    body: 'Dear Parent,\n\nUpon reviewing our school register databases, we have noticed that your child\'s overall attendance rate for the current term has fallen to [AttendanceRate]%, which is below the mandatory 70% threshold.\n\nRegular class attendance is directly linked to academic excellence. We kindly request that you schedule a brief physical meeting with the Principal on or before [Date] to discuss support measures.\n\nYours sincerely,\nManagement Board',
    description: 'Alert a parent that their child is below 70% attendance.'
  },
  {
    id: 'pta-meeting',
    name: '👥 PTA Meeting Invitation',
    category: 'Administrative',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'PARENTS',
    title: 'Invitation: General Parent-Teacher Association (PTA) Meeting',
    body: 'Dear Parents and Guardians,\n\nYou are cordially invited to the [Term] General Meeting of the Parent-Teacher Association (PTA).\n\nDetails:\n📅 Date: [Date]\n⏰ Time: [Time]\n📍 Venue: School Main Auditorium\n\nKey Agenda Items:\n1. Terminal academic review and curriculum highlights.\n2. Security and student welfare initiatives.\n3. Upcoming co-curricular events.\n\nYour voice and presence are vital to our shared growth. We look forward to seeing you.\n\nWarm regards,\nPTA Executive Committee',
    description: 'Invite parents to the termly general PTA meeting.'
  },
  {
    id: 'school-resumption',
    name: '🚀 School Resumption',
    category: 'Administrative',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'ALL',
    title: 'Welcome Back: New Term Resumption Notice',
    body: 'Dear Parents, Students, and Staff,\n\nWe trust you had a refreshing holiday. Greenwood Secondary is set to resume academic sessions for the [Term] on [Date].\n\nAll pupils are expected to arrive before the general assembly bell at 7:45 AM.\n\nPlease ensure students return with all required textbooks, updated notebooks, and in complete, clean school uniform.\n\nLet\'s start this term strong!\n\nBest regards,\nOffice of the Principal',
    description: 'Notify parents/students of the upcoming resumption date.'
  },
  {
    id: 'holiday-notice',
    name: '🏖️ Holiday Notice',
    category: 'Administrative',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'ALL',
    title: 'School Closing & Upcoming Term Holidays Notice',
    body: 'Dear Parents and Students,\n\nThis is to officially announce that the school will close for the [HolidayName] holidays on [ClosingDate] following the completion of terminal academic tasks.\n\nWe will officially resume for academic activities on [ResumptionDate].\n\nWe wish all our staff, students, and parents a restful, safe, and joyful holiday season!\n\nManagement',
    description: 'Notify the school community of upcoming holidays.'
  },
  {
    id: 'event-reminder',
    name: '🌟 Event Reminder',
    category: 'Administrative',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'ALL',
    title: 'Reminder: Upcoming School Co-curricular Event',
    body: 'Dear Greenwood Community,\n\nGet ready! Our highly anticipated [EventName] is coming up soon.\n\n📅 Date: [Date]\n⏰ Time: [Time]\n📍 Location: [Location]\n\nThis event showcases our students\' talent, creativity, and teamwork. Parents are highly encouraged to attend, cheer, and support our pupils. Refreshments will be served.\n\nWe can\'t wait to host you!\n\nOrganizing Committee',
    description: 'Send a reminder for a school-wide social or sports event.'
  },
  {
    id: 'timetable-updated',
    name: '📅 Timetable Updated',
    category: 'Teacher Notifications',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'TEACHERS',
    title: 'Academic Notice: Staff Timetable Re-distribution',
    body: 'Dear Teachers,\n\nPlease be informed that the academic master timetable has been slightly adjusted to optimize our teaching resources and subject layouts.\n\nThe updated schedules will go into effect on [Date]. Please log in to your portal and check the "My Timetable" sidebar to review your updated weekly teaching slots.\n\nThank you for your agility and support.\n\nVice Principal (Academics)',
    description: 'Notify staff members of updates to the teaching timetable.'
  },
  {
    id: 'pending-scores',
    name: '⏱️ Pending Score Submission',
    category: 'Teacher Notifications',
    defaultCategory: 'General Announcement',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'TEACHERS',
    title: 'Reminder: Pending Student Grades & Termly Comments',
    body: 'Dear Teachers,\n\nThis is a friendly reminder to review your gradebooks on the portal. There are pending grades and principal/form teacher comments for your assigned classes.\n\nAll entries must be submitted and locked before the end of day on [DeadlineDate].\n\nYour prompt compliance allows us to compile report cards on schedule.\n\nBest regards,\nAcademic Registry',
    description: 'Remind teachers of pending scores or terminal comments.'
  },
  {
    id: 'fees-reminder',
    name: '💰 Fees Reminder',
    category: 'Administrative',
    defaultCategory: 'Regarding Fee Reminder',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'PARENTS',
    title: 'Important Notice: Outstanding School Fees Payment Reminder',
    body: 'Dear Parents and Guardians,\n\nThis is a friendly reminder regarding the outstanding school fees for your child, [StudentName], for the [Term].\n\nTo ensure uninterrupted access to classroom activities, academic portal resources, and upcoming terminal assessments, please make payments to the designated school bank account on or before [Date].\n\nIf you have already made this payment, please upload your proof of payment via the parent portal or present it directly to the accounts office for clearance.\n\nThank you for your cooperation and timely support.\n\nBest regards,\nBursar\'s Department',
    description: 'Remind parents about outstanding tuition fees.'
  },
  {
    id: 'salary-payment',
    name: '💸 Salary Payment',
    category: 'Teacher Notifications',
    defaultCategory: 'General Announcement',
    defaultPriority: 'NORMAL',
    defaultTargetAudience: 'TEACHERS',
    title: 'Staff Salary Disbursal & Pay Slip Update',
    body: 'Dear Esteemed Staff Members,\n\nWe are pleased to inform you that staff salaries for the month of [MonthName] have been successfully disbursed to your designated bank accounts.\n\nYour individual pay slips have been uploaded to your staff dashboard. Please review them under the "My Payroll" sidebar section.\n\nThank you for your outstanding dedication, tireless efforts, and contribution to our student success this month.\n\nWarm regards,\nAccounts & HR Department',
    description: 'Notify teachers/staff that salaries have been disbursed.'
  },
  {
    id: 'staff-meeting',
    name: '👥 Staff General Meeting',
    category: 'Teacher Notifications',
    defaultCategory: 'General Announcement',
    defaultPriority: 'HIGH',
    defaultTargetAudience: 'TEACHERS',
    title: 'Academic Staff General Meeting & Term Planning',
    body: 'Dear Teachers and Academic Staff,\n\nYou are requested to attend our upcoming General Staff Meeting.\n\nDetails:\n📅 Date: [Date]\n⏰ Time: [Time]\n📍 Location: Staff Common Room / Virtual link\n\nAgenda:\n1. Termly syllabus progression and scoresheet validation.\n2. Review of student attendance registers and affective trait updates.\n3. General administrative updates and upcoming school events.\n\nAttendance is mandatory for all teaching and academic support staff. Please come with your class progress diaries.\n\nSincerely,\nOffice of the Principal',
    description: 'Schedule and summon teachers for a general staff meeting.'
  }
];

export default function MessagesDashboardPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  
  // Roster parameters
  const [school, setSchool] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Loading and alerts
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Compose form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General Announcement');
  const [priority, setPriority] = useState('NORMAL');
  const [targetAudience, setTargetAudience] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Tab states for Admin console ('compose' vs 'history')
  const [adminTab, setAdminTab] = useState<'compose' | 'history'>('compose');

  // Wizard state machine
  const [composeStep, setComposeStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState('scratch');
  const [activeCategoryTab, setActiveCategoryTab] = useState<'Academic' | 'Attendance' | 'Administrative' | 'Teacher Notifications'>('Academic');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledForDate, setScheduledForDate] = useState('');

  // Unpaid fees targeting states
  const [unpaidStudents, setUnpaidStudents] = useState<any[]>([]);
  const [loadingUnpaid, setLoadingUnpaid] = useState(false);

  useEffect(() => {
    if (targetAudience === 'UNPAID_PARENTS' && school) {
      fetchUnpaidStudents();
    }
  }, [targetAudience, selectedClassId, selectedArmId, school]);

  const fetchUnpaidStudents = async () => {
    if (!school) return;
    setLoadingUnpaid(true);
    try {
      let url = `/api/students?schoolId=${school.id}&feesPaid=false`;
      if (selectedClassId) url += `&classId=${selectedClassId}`;
      if (selectedArmId) url += `&armId=${selectedArmId}`;
      
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setUnpaidStudents(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load unpaid list:', e);
    } finally {
      setLoadingUnpaid(false);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setUser(sessionObj.user);
        initializeMessaging(sessionObj.school.id, sessionObj.user);
      } catch (e) {
        setErrorMsg('Invalid session parameters.');
      }
    }
  }, []);

  const initializeMessaging = async (schoolId: string, currentUser: any) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch metadata setup for dropdown selectors
      const setupRes = await fetch(`/api/setup?schoolId=${schoolId}`);
      const setupJson = await setupRes.json();
      if (setupRes.ok && setupJson.success) {
        setClasses(setupJson.data.classes || []);
        setArms(setupJson.data.arms || []);
        if (setupJson.data.classes?.length > 0) {
          setSelectedClassId(setupJson.data.classes[0].id);
          const firstArm = setupJson.data.arms?.find((a: Arm) => a.classId === setupJson.data.classes[0].id);
          if (firstArm) setSelectedArmId(firstArm.id);
        }
      }

      // 2. Fetch appropriate messages
      const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'SCHOOL_ADMIN' || currentUser.role === 'HEAD_TEACHER';
      const mode = isAdmin && adminTab === 'history' ? 'sent' : 'inbox';
      
      const msgRes = await fetch(`/api/messages?schoolId=${schoolId}&userId=${currentUser.id}&mode=${mode}`);
      const msgJson = await msgRes.json();
      if (!msgRes.ok) throw new Error(msgJson.error || 'Failed to retrieve inbox.');
      setMessages(msgJson.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with messages database.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger content refresh when Admin switches tabs
  const handleTabSwitch = async (tab: 'compose' | 'history') => {
    setAdminTab(tab);
    if (!school || !user) return;
    
    setLoading(true);
    try {
      const mode = tab === 'history' ? 'sent' : 'inbox';
      const res = await fetch(`/api/messages?schoolId=${school.id}&userId=${user.id}&mode=${mode}`);
      const json = await res.json();
      if (res.ok) {
        setMessages(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Mark message as read
  const handleMarkAsRead = async (messageId: string) => {
    try {
      const res = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          messageIds: [messageId]
        })
      });

      if (res.ok) {
        // Toggle locally for instant reactive updates
        setMessages(prev => 
          prev.map(m => m.id === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m)
        );
        // Force navbar bell to refresh unread badges
        const navEvent = new CustomEvent('refresh-notifications');
        window.dispatchEvent(navEvent);
      }
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  // Submit Broadcast Announcement (Admin / Principal)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setErrorMsg('Announcement Title and Message Body are required.');
      return;
    }

    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          senderId: user.id,
          title,
          body,
          messageType: category, // Structuring structured category tags inside type
          targetAudience,
          priority,
          isPinned,
          classId: targetAudience === 'CLASS' || targetAudience === 'ARM' ? selectedClassId : null,
          armId: targetAudience === 'ARM' ? selectedArmId : null,
          scheduledFor: isScheduled && scheduledForDate ? new Date(scheduledForDate).toISOString() : null
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to dispatch broadcast.');

      setSuccessMsg(`Announcement successfully sent! targeted group notified.`);
      
      // Clear form
      setTitle('');
      setBody('');
      setIsPinned(false);
      setCategory('General Announcement');
      setPriority('NORMAL');
      setSelectedTemplateId('scratch');
      setIsScheduled(false);
      setScheduledForDate('');
      setComposeStep(1);
      
      // Toggle to history tab to view metrics
      await handleTabSwitch('history');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing broadcast transmission.');
    } finally {
      setSending(false);
    }
  };

  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
    const filteredArms = arms.filter(a => a.classId === classId);
    if (filteredArms.length > 0) {
      setSelectedArmId(filteredArms[0].id);
    }
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'HEAD_TEACHER';
  const isGreenwood = school?.slug === 'greenwood-secondary';
  
  const accentText = isGreenwood ? 'text-emerald-500' : 'text-indigo-500';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100';
  const tabActive = isGreenwood ? 'border-emerald-500 text-emerald-600' : 'border-indigo-600 text-indigo-600';

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${accentBg}`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            Messages & Official Broadcasts
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            {isAdmin 
              ? 'Draft structured alerts, dispatch targeted broadcasts, and track real-time delivery percentages and viewed ratios.'
              : 'Access active school notifications, official academic updates, and urgent alerts.'
            }
          </p>
        </div>
      </div>

      {/* 2. Success / Error alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* 3. Layout: Dual Admin Console vs Standard Inbox */}
      {isAdmin ? (
        <div className="space-y-6">
          {/* Navigation tabs */}
          <div className="border-b border-slate-200 flex gap-6 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            <button
              type="button"
              onClick={() => handleTabSwitch('compose')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
                adminTab === 'compose' ? tabActive : 'border-transparent hover:text-slate-600'
              }`}
            >
              <Send className="w-4 h-4" />
              Compose Broadcast
            </button>
            
            <button
              type="button"
              onClick={() => handleTabSwitch('history')}
              className={`pb-3 border-b-2 transition-all flex items-center gap-1.5 ${
                adminTab === 'history' ? tabActive : 'border-transparent hover:text-slate-600'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Broadcast History & Analytics
            </button>
          </div>

          {/* TAB CONTENT: Compose Form */}
          {adminTab === 'compose' && (
            <div className="max-w-4xl mx-auto w-full animate-fadeIn">
              <form onSubmit={handleSendBroadcast} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
                
                {/* Stepper Progress Bar */}
                <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-2">
                  {[
                    { step: 1, label: 'Template' },
                    { step: 2, label: 'Target' },
                    { step: 3, label: 'Refine & Preview' },
                    { step: 4, label: 'Send / Schedule' }
                  ].map((s) => (
                    <div key={s.step} className="flex items-center gap-2 flex-1 last:flex-none">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                            composeStep === s.step
                              ? isGreenwood ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' : 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                              : composeStep > s.step
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {composeStep > s.step ? <Check className="w-4 h-4" /> : s.step}
                        </div>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-extrabold hidden md:inline ${
                            composeStep === s.step ? 'text-slate-800' : 'text-slate-400 font-bold'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {s.step < 4 && (
                        <div className="h-0.5 bg-slate-100 flex-1 mx-2 hidden sm:block" />
                      )}
                    </div>
                  ))}
                </div>

                {/* STEP 1: CHOOSE TEMPLATE */}
                {composeStep === 1 && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 ${isGreenwood ? 'text-emerald-500' : 'text-indigo-500'}`} />
                        Step 1: Select Announcement Template
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        Select a pre-designed template below to accelerate message generation, or start completely from scratch.
                      </p>
                    </div>

                    {/* Category Selector Tabs */}
                    <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100">
                      {(['Academic', 'Attendance', 'Administrative', 'Teacher Notifications'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveCategoryTab(tab)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider font-black transition-all border ${
                            activeCategoryTab === tab
                              ? isGreenwood
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {/* Template Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {TEMPLATES.filter(t => t.id === 'scratch' || t.category === activeCategoryTab).map(tpl => {
                        const isScratch = tpl.id === 'scratch';
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplateId(tpl.id);
                              setTitle(tpl.title);
                              setBody(tpl.body);
                              setCategory(tpl.defaultCategory);
                              setPriority(tpl.defaultPriority);
                              setTargetAudience(tpl.defaultTargetAudience);
                              setComposeStep(2);
                            }}
                            className={`text-left p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-44 ${
                              selectedTemplateId === tpl.id
                                ? isGreenwood
                                  ? 'border-emerald-500 bg-emerald-50/20 shadow-emerald-50'
                                  : 'border-indigo-500 bg-indigo-50/20 shadow-indigo-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide leading-tight flex items-center gap-1.5">
                                {tpl.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-3">
                                {tpl.description}
                              </p>
                            </div>

                            {!isScratch && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 w-full text-[9px] font-bold text-slate-400">
                                <span className={`px-2 py-0.5 rounded uppercase font-black ${
                                  tpl.defaultPriority === 'URGENT'
                                    ? 'bg-red-50 text-red-600 border border-red-100'
                                    : tpl.defaultPriority === 'HIGH'
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                }`}>
                                  {tpl.defaultPriority}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase font-black">
                                  {tpl.defaultTargetAudience}
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: CHOOSE RECIPIENTS */}
                {composeStep === 2 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Step 2: Choose Recipients & Routing</h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        Specify exactly which groups should receive this announcement. The system automatically maps matching active user accounts.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      {/* Target Audience Dropdown */}
                      <div className="text-xs font-semibold">
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Target Audience Group</label>
                        <select
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 font-bold focus:outline-none"
                        >
                          <option value="ALL">Entire School (All Users)</option>
                          <option value="TEACHERS">All Teachers & Staff</option>
                          <option value="PARENTS">All Parents</option>
                          <option value="STUDENTS">All Students</option>
                          <option value="UNPAID_PARENTS">Parents of Unpaid Wards (Fees Outstanding)</option>
                          <option value="CLASS">Specific Class Cohort</option>
                          <option value="ARM">Specific Classroom Arm</option>
                        </select>
                      </div>

                      {/* Conditional Class & Arm dropdowns */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(targetAudience === 'CLASS' || targetAudience === 'ARM' || targetAudience === 'UNPAID_PARENTS') && (
                          <div className="text-xs font-semibold animate-fadeIn">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Select Class</label>
                            <select
                              value={selectedClassId}
                              onChange={(e) => handleClassSelection(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 font-bold focus:outline-none"
                            >
                              {targetAudience === 'UNPAID_PARENTS' && (
                                <option value="">Entire School (All Classes)</option>
                              )}
                              {classes.map(cls => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {(targetAudience === 'ARM' || targetAudience === 'UNPAID_PARENTS') && (
                          <div className="text-xs font-semibold animate-fadeIn">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Select Classroom Arm</label>
                            <select
                              value={selectedArmId}
                              onChange={(e) => setSelectedArmId(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-700 font-bold focus:outline-none"
                            >
                              {targetAudience === 'UNPAID_PARENTS' && (
                                <option value="">All Arms in Class</option>
                              )}
                              {arms
                                .filter(a => a.classId === selectedClassId)
                                .map(arm => (
                                  <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                                ))
                              }
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Dynamic Unpaid Students Listing Panel */}
                      {targetAudience === 'UNPAID_PARENTS' && (
                        <div className="p-5 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-3 animate-fadeIn text-xs">
                          <div className="flex items-center justify-between border-b border-amber-100/50 pb-2">
                            <span className="font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                              ⚠️ Outstandings Roster ({unpaidStudents.length} Students)
                            </span>
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-100/50 px-2 py-0.5 rounded-lg">
                              Pending clearance target list
                            </span>
                          </div>

                          {loadingUnpaid ? (
                            <div className="py-6 flex items-center justify-center gap-2 text-slate-400 font-semibold">
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Loading unpaid register...
                            </div>
                          ) : unpaidStudents.length === 0 ? (
                            <p className="text-slate-400 font-medium py-3 text-center">
                              No active students found with outstanding fees matching these filters!
                            </p>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-amber-100/20 pr-1.5">
                              {unpaidStudents.map((st) => (
                                <div key={st.id} className="pt-2.5 first:pt-0 flex justify-between items-center text-slate-700 font-medium">
                                  <div>
                                    <span className="font-extrabold text-slate-800">{st.firstName} {st.lastName}</span>
                                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                      Adm: {st.admissionNumber} | Parent: {st.parent ? `${st.parent.firstName} ${st.parent.lastName}` : 'No Linked Parent'}
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    isGreenwood ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  }`}>
                                    {st.class?.name || 'Class'} - {st.arm?.name || 'Arm'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setComposeStep(1)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-xs transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeStep(3)}
                        className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md ${buttonPrimary}`}
                      >
                        Next: Refine & Preview
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: REFINE AND LIVE PREVIEW */}
                {composeStep === 3 && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Step 3: Refine and Live Preview</h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        Review the template details and edit the text freely. Tap the placeholders panel below to insert custom markers.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                      {/* Left: Editor form fields (3/5 width) */}
                      <div className="xl:col-span-3 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Category */}
                          <div className="text-xs font-semibold">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Structured Category</label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-bold focus:outline-none"
                            >
                              <option value="General Announcement">General Announcement</option>
                              <option value="Regarding Attendance">Regarding Attendance</option>
                              <option value="Regarding Result">Regarding Result</option>
                              <option value="Regarding Fee Reminder">Regarding Fee Reminder</option>
                            </select>
                          </div>

                          {/* Priority */}
                          <div className="text-xs font-semibold">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Priority Level</label>
                            <select
                              value={priority}
                              onChange={(e) => setPriority(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-bold focus:outline-none"
                            >
                              <option value="NORMAL">Slate (Normal)</option>
                              <option value="HIGH">Amber (High Alert)</option>
                              <option value="URGENT">Red Pulsing (Urgent)</option>
                            </select>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-xs font-semibold">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Announcement Title</label>
                          <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="E.g., PTA Meeting / Low Attendance caution..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 font-bold"
                          />
                        </div>

                        {/* Body Message */}
                        <div className="text-xs font-semibold">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Message Body Content</label>
                          <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            placeholder="Provide professional, structured bulletin directions here..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300 font-medium leading-relaxed font-mono text-[11px]"
                          />
                        </div>

                        {/* Pinned toggle */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="pin-announcement"
                            checked={isPinned}
                            onChange={(e) => setIsPinned(e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor="pin-announcement" className="text-xs font-bold text-slate-500 cursor-pointer">
                            Pin Announcement to Bulletin Header
                          </label>
                        </div>

                        {/* Clickable Quick Placeholders */}
                        <div className="space-y-1.5 pt-2">
                          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Quick Helper Tokens (Tap to insert)</span>
                          <div className="flex flex-wrap gap-1.5">
                            {['[Term]', '[Date]', '[StudentName]', '[AttendanceRate]', '[StartDate]', '[EndDate]', '[Time]'].map(placeholder => (
                              <button
                                key={placeholder}
                                type="button"
                                onClick={() => {
                                  setBody(prev => prev + ' ' + placeholder);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-bold text-slate-600 border border-slate-200/60 transition-colors"
                              >
                                {placeholder}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Live Preview Panel (2/5 width) */}
                      <div className="xl:col-span-2 space-y-3">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Live Recipient Feed Preview</span>
                        
                        {/* Interactive Bulletin Card Mockup */}
                        <div className={`p-5 rounded-2xl bg-white border shadow-sm relative overflow-hidden transition-all duration-300 ${
                          priority === 'URGENT' 
                            ? 'border-l-4 border-l-red-500 border-slate-200' 
                            : priority === 'HIGH' 
                            ? 'border-l-4 border-l-amber-500 border-slate-200'
                            : 'border border-slate-200/80'
                        }`}>
                          {!isPinned && (
                            <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                          )}
                          <div className="space-y-3 font-semibold">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs uppercase">
                                {user ? user.firstName[0] : 'S'}
                              </div>
                              <div>
                                <span className="block text-[10px] font-black text-slate-800 leading-tight">
                                  {user ? `${user.firstName} ${user.lastName}` : 'School System'}
                                </span>
                                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                                  {user ? user.role.toLowerCase().replace('_', ' ') : 'Administrator'}
                                </span>
                              </div>
                              <span className="text-slate-200 ml-auto font-normal text-xs">|</span>
                              <span className="text-slate-400 flex items-center gap-1 font-medium text-[8px] ml-1">
                                <Clock className="w-3 h-3" />
                                Today
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded border text-[8px] font-black uppercase ${
                                  priority === 'URGENT' 
                                    ? 'bg-red-50 text-red-600 border-red-100' 
                                    : priority === 'HIGH' 
                                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                    : 'bg-slate-50 text-slate-500 border border-slate-200/60'
                                }`}>
                                  {priority}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[8px] font-black uppercase">
                                  {category}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-slate-800 leading-snug break-words">
                                {title || 'Untitled Announcement'}
                              </h4>
                            </div>

                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed whitespace-pre-line max-w-full break-words bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                              {body || 'Provide content in the editor to see a preview here...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setComposeStep(2)}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-xs transition-all"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setComposeStep(4)}
                        className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md ${buttonPrimary}`}
                      >
                        Next: Send & Schedule
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: SEND & SCHEDULE */}
                {composeStep === 4 && (
                  <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                    <div className="flex flex-col gap-1.5 text-center">
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Step 4: Dispatch Announcement</h3>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                        Configure the dispatch timing and review target summaries before compiling transmission packages.
                      </p>
                    </div>

                    {/* Schedule Option Toggle */}
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Transmission Scheduling</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsScheduled(false)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                              !isScheduled
                                ? isGreenwood
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Send Now
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsScheduled(true)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border transition-all ${
                              isScheduled
                                ? isGreenwood
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Schedule Later
                          </button>
                        </div>
                      </div>

                      {isScheduled && (
                        <div className="text-xs font-semibold space-y-1.5 animate-fadeIn pt-2 border-t border-slate-200/50">
                          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Scheduled Dispatch Date & Time</label>
                          <input
                            type="datetime-local"
                            value={scheduledForDate}
                            onChange={(e) => setScheduledForDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold focus:outline-none"
                            required
                          />
                          <p className="text-[10px] text-slate-400 font-normal">
                            Note: The server background tasks will monitor the queue and dispatch automatically when this time expires.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary Card */}
                    <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-950 font-semibold space-y-4">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                        <Megaphone className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-wider">Transmission Summary</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold">
                        <div>
                          <span className="text-slate-400 block font-normal uppercase">Recipients Group</span>
                          <span className="text-white uppercase font-extrabold">{targetAudience}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-normal uppercase">Priority Index</span>
                          <span className="text-white uppercase font-extrabold">{priority}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-normal uppercase">Announcement Type</span>
                          <span className="text-white uppercase font-extrabold">{category}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-normal uppercase">Pinned Bulletin</span>
                          <span className="text-white uppercase font-extrabold">{isPinned ? 'YES (ALWAYS TOP)' : 'NO'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Navigation and Final Send Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setComposeStep(3)}
                        disabled={sending}
                        className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-extrabold text-xs transition-all disabled:opacity-50"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={sending || (isScheduled && !scheduledForDate)}
                        className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 ${buttonPrimary}`}
                      >
                        {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sending
                          ? 'Compiling and Dispatching...'
                          : isScheduled
                          ? 'Schedule Announcement'
                          : 'Dispatch Announcement Now'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB CONTENT: Sent History & Delivery Analytics */}
          {adminTab === 'history' && (
            <div className="space-y-4">
              {loading ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  <p className="text-slate-400 text-xs font-semibold">Compiling delivery stats and metrics...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-800">No Sent History</h4>
                    <p className="text-xs text-slate-400 mt-1">Announcements you broadcast will appear here along with viewed ratios.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {messages.map((msg, idx) => {
                    const stats = msg.deliveryStats;
                    const percent = stats?.viewedPercentage || 0;
                    
                    const priorityColor = 
                      msg.priority === 'URGENT' 
                        ? 'bg-red-50 text-red-600 border-red-100' 
                        : msg.priority === 'HIGH' 
                        ? 'bg-amber-50 text-amber-600 border-amber-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-200/60';

                    return (
                      <div key={msg.id || idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        
                        {/* Message details */}
                        <div className="space-y-2 flex-1 font-semibold">
                          <div className="flex flex-wrap items-center gap-2 text-[10px]">
                            <span className={`px-2 py-0.5 rounded border font-black uppercase ${priorityColor}`}>
                              {msg.priority}
                            </span>
                            {msg.scheduledFor && new Date(msg.scheduledFor) > new Date() ? (
                              <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-100 uppercase font-black animate-pulse flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Scheduled: {new Date(msg.scheduledFor).toLocaleString(undefined, { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase font-black">
                                {msg.messageType}
                              </span>
                            )}
                            <span className="text-slate-400 font-bold">
                              Audience: <strong className="text-slate-600 uppercase font-extrabold">{msg.targetAudience}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-400 flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(msg.createdAt).toLocaleDateString(undefined, { 
                                month: 'short', 
                                day: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-800 leading-snug">{msg.title}</h3>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 max-w-2xl">
                            {msg.body}
                          </p>
                        </div>

                        {/* Viewed Ratios Ring (Smart Analytics) */}
                        <div className="flex items-center gap-4 bg-slate-50/50 border border-slate-200/40 p-4 rounded-2xl flex-shrink-0 w-full md:w-auto justify-between md:justify-start">
                          <div className="text-left md:text-right">
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Viewed Ratio</span>
                            <span className="text-sm font-extrabold text-slate-800">{stats?.readCount} of {stats?.totalRecipients} read</span>
                            <span className="block text-[9px] text-slate-400 font-normal mt-0.5">Real-time recipient indicators</span>
                          </div>

                          {/* Graphical Ring */}
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                className="stroke-slate-200"
                                strokeWidth="4"
                                fill="transparent"
                              />
                              <circle
                                cx="24"
                                cy="24"
                                r="20"
                                className={percent >= 80 ? "stroke-emerald-500" : percent >= 40 ? "stroke-amber-500" : "stroke-indigo-500"}
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={125.6}
                                strokeDashoffset={125.6 - (125.6 * percent) / 100}
                              />
                            </svg>
                            <span className="absolute text-[10px] font-black text-slate-800">{percent}%</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD USER INBOX (Teachers, Parents, Students) */
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Inbox className={`w-4.5 h-4.5 ${accentText}`} /> Active Bulletin Inbox
            </h3>
            <span className="text-[10px] text-slate-400 font-bold font-mono">
              Unread announcements will highlight yellow or red alert states
            </span>
          </div>

          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <p className="text-slate-400 text-xs font-semibold">Assembling announcements boards...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Inbox is Clean</h4>
                <p className="text-xs text-slate-400 mt-1">You have no official announcements logged in your feed.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {messages.map((msg, idx) => {
                const priorityBorder = 
                  msg.priority === 'URGENT' 
                    ? 'border-l-4 border-l-red-500 border border-slate-200/80' 
                    : msg.priority === 'HIGH' 
                    ? 'border-l-4 border-l-amber-500 border border-slate-200/80'
                    : 'border border-slate-200/80';
                
                const priorityColor = 
                  msg.priority === 'URGENT' 
                    ? 'bg-red-50 text-red-600 border-red-100' 
                    : msg.priority === 'HIGH' 
                    ? 'bg-amber-50 text-amber-600 border-amber-100' 
                    : 'bg-slate-50 text-slate-500 border-slate-200/60';

                return (
                  <div 
                    key={msg.id || idx} 
                    className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start gap-4 relative overflow-hidden ${priorityBorder} ${
                      !msg.isRead ? 'bg-slate-50/20' : ''
                    }`}
                  >
                    {/* Unread circle highlight */}
                    {!msg.isRead && (
                      <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    )}

                    <div className="space-y-3 flex-1 font-semibold">
                      {/* Sender details and priority header */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Letter avatar */}
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-black text-xs">
                          {msg.sender ? msg.sender.firstName[0].toUpperCase() : 'S'}
                        </div>
                        
                        <div>
                          <span className="block text-xs font-extrabold text-slate-800">
                            {msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'School System'}
                          </span>
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-0.5">
                            {msg.sender ? msg.sender.role.toLowerCase().replace('_', ' ') : 'Administrator'}
                          </span>
                        </div>

                        <span className="text-slate-300">|</span>

                        <span className="text-slate-400 flex items-center gap-1 font-medium text-[10px]">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(msg.createdAt).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>

                      {/* Title & Structured tags */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded border text-[9px] font-black uppercase ${priorityColor}`}>
                            {msg.priority}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase">
                            {msg.messageType}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800 leading-snug">{msg.title}</h4>
                      </div>

                      {/* Body snippet */}
                      <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl whitespace-pre-line">
                        {msg.body}
                      </p>
                    </div>

                    {/* Mark as read trigger */}
                    {!msg.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(msg.id)}
                        className={`mt-2 md:mt-0 flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all relative overflow-hidden flex-shrink-0`}
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        Mark as Read
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';
