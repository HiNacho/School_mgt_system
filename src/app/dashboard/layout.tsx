'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Users, GraduationCap, BookOpen, Layers, ClipboardList, 
  MessageSquare, User, Settings, LogOut, Menu, X, 
  Bell, Award, Shield, Sparkles, Calendar, FileText, CheckCircle
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<{ user: any; school: any } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAlerts, setLatestAlerts] = useState<any[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  // Telemetry Feedback Modal State
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackLeadId, setFeedbackLeadId] = useState('');
  const [easeOfUse, setEaseOfUse] = useState(5);
  const [designRating, setDesignRating] = useState(5);
  const [usefulness, setUsefulness] = useState(5);
  const [mostUseful, setMostUseful] = useState('');
  const [confusing, setConfusing] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [wouldUse, setWouldUse] = useState('YES');
  const [wouldPay, setWouldPay] = useState('YES');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackLoading(true);

    try {
      const res = await fetch('/api/tester/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: feedbackLeadId,
          easeOfUse,
          design: designRating,
          usefulness,
          mostUsefulFeature: mostUseful,
          confusingFeature: confusing,
          suggestions,
          wouldUseInSchool: wouldUse,
          wouldPay,
        }),
      });

      if (res.ok) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setFeedbackOpen(false);
          setFeedbackSuccess(false);
        }, 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Network error. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const fetchUnreadNotifications = async (schoolId: string, userId: string) => {
    try {
      const res = await fetch(`/api/notifications/unread?schoolId=${schoolId}&userId=${userId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setUnreadCount(json.data.unreadCount);
        setLatestAlerts(json.data.latest || []);
      }
    } catch (err) {
      console.error('Navbar Bell Fetch Error:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('report_auth_token');
    const userSession = localStorage.getItem('report_user_session');

    if (!token || !userSession) {
      router.push('/login');
      return;
    }

    try {
      const parsedSession = JSON.parse(userSession);
      setSession(parsedSession);
      
      const backup = localStorage.getItem('report_super_session_backup');
      if (backup) {
        setIsImpersonating(true);
      }

      setReady(true);
    } catch (e) {
      localStorage.removeItem('report_auth_token');
      localStorage.removeItem('report_user_session');
      document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  }, [router]);


  useEffect(() => {
    if (!ready || !session) return;

    if (session.school?.id) {
      fetchUnreadNotifications(session.school.id, session.user.id);
    }

    const interval = setInterval(() => {
      if (session.school?.id) {
        fetchUnreadNotifications(session.school.id, session.user.id);
      }
    }, 15000); // Poll every 15 seconds

    return () => clearInterval(interval);
  }, [ready, session]);

  // Telemetry: Time spent active heartbeat
  useEffect(() => {
    if (!ready || !session || !session.user?.id) return;
    const userId = session.user.id;

    // Send heartbeat immediately on load
    fetch('/api/tester/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action: 'heartbeat' }),
    }).catch(err => console.error('[Telemetry] Heartbeat error:', err));

    // Send heartbeat every 15 seconds
    const interval = setInterval(() => {
      fetch('/api/tester/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'heartbeat' }),
      }).catch(err => console.error('[Telemetry] Heartbeat error:', err));
    }, 15000);

    return () => clearInterval(interval);
  }, [ready, session]);

  // Telemetry: Features visited tracking on navigation
  useEffect(() => {
    if (!ready || !session || !session.user?.id || !pathname) return;
    const userId = session.user.id;

    // Map path to product features
    let featureCode = '';
    if (pathname.includes('/dashboard/compile') || pathname.includes('/dashboard/scores')) {
      featureCode = 'scores';
    } else if (pathname.includes('/dashboard/attendance')) {
      featureCode = 'attendance';
    } else if (pathname.includes('/dashboard/students') || pathname.includes('/dashboard/teachers') || pathname.includes('/dashboard/staff')) {
      featureCode = 'reports';
    } else if (pathname.includes('/dashboard/parents')) {
      featureCode = 'portals';
    }

    if (featureCode) {
      fetch('/api/tester/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, featureCode }),
      }).catch(err => console.error('[Telemetry] Feature tracking error:', err));
    }
  }, [ready, session, pathname]);

  // Telemetry: Check feedback status and trigger 45s modal timer
  useEffect(() => {
    if (!ready || !session || !session.user?.id) return;
    const userId = session.user.id;

    let timer: NodeJS.Timeout;

    const checkFeedbackStatus = async () => {
      try {
        const res = await fetch(`/api/tester/feedback?userId=${userId}`);
        const json = await res.json();
        
        if (res.ok && json.isTester && !json.feedbackSubmitted) {
          setFeedbackLeadId(json.leadId);
          
          // Trigger feedback modal after 45 seconds of cumulative active time
          timer = setTimeout(() => {
            setFeedbackOpen(true);
          }, 45000); // 45 seconds
        }
      } catch (err) {
        console.error('[Feedback] Error checking tester feedback status:', err);
      }
    };

    checkFeedbackStatus();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [ready, session]);

  if (!ready || !session) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-xs tracking-wider uppercase font-bold">Verifying Session Security...</p>
        </div>
      </div>
    );
  }

  const { user, school } = session;
  const role = user.role;

  const handleExitImpersonation = () => {
    const backup = localStorage.getItem('report_super_session_backup');
    const tokenBackup = localStorage.getItem('report_super_token_backup');
    if (backup && tokenBackup) {
      localStorage.setItem('report_user_session', backup);
      localStorage.setItem('report_auth_token', tokenBackup);
      document.cookie = `report_auth_token=${tokenBackup}; path=/; max-age=3600; SameSite=Lax`;
      localStorage.removeItem('report_super_session_backup');
      localStorage.removeItem('report_super_token_backup');
      window.location.href = '/dashboard/tenants';
    }
  };

  const handleLogout = () => {
    const userSessionStr = localStorage.getItem('report_user_session');
    let isDemoUser = false;
    if (userSessionStr) {
      try {
        const sessionObj = JSON.parse(userSessionStr);
        if (sessionObj.user?.email?.endsWith('@nacho.com') || sessionObj.school?.slug === 'nacho-secondary') {
          isDemoUser = true;
        }
      } catch (e) {}
    }

    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
    localStorage.removeItem('report_super_session_backup');
    localStorage.removeItem('report_super_token_backup');
    document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    if (isDemoUser) {
      window.location.href = '/?try=true';
    } else {
      router.push('/login');
    }
  };


  const getRoleLabel = (r: string) => {
    switch(r) {
      case 'SUPER_ADMIN': return 'super admin';
      case 'SCHOOL_ADMIN': return 'admin';
      case 'CLASS_TEACHER': return 'teacher';
      case 'SUBJECT_TEACHER': return 'teacher';
      case 'PARENT': return 'parent';
      case 'STUDENT': return 'student';
      default: return r.toLowerCase();
    }
  };

  // Define sidebar lists
  let menuItems: SidebarItem[] = [];
  
  if (role === 'SUPER_ADMIN') {
    menuItems = [
      { name: 'Home', href: '/dashboard', icon: Home },
      { name: 'Tenants', href: '/dashboard/tenants', icon: Layers },
      { name: 'Global Rules', href: '/dashboard/global-rules', icon: Settings },
    ];
  } else if (role === 'SCHOOL_ADMIN') {
    menuItems = [
      { name: 'Home', href: '/dashboard', icon: Home },
      { name: 'Staff Registry', href: '/dashboard/staff', icon: Shield },
      { name: 'Teachers', href: '/dashboard/teachers', icon: Users },
      { name: 'Students', href: '/dashboard/students', icon: GraduationCap },
      { name: 'Parents', href: '/dashboard/parents', icon: User },
      { name: 'Subjects', href: '/dashboard/subjects', icon: BookOpen },
      { name: 'Classes', href: '/dashboard/classes', icon: Layers },
      { name: 'Attendance', href: '/dashboard/attendance', icon: ClipboardList },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
    ];
  } else {
    // Teachers, Parents, Students default links
    menuItems = [
      { name: 'Home', href: '/dashboard', icon: Home },
    ];
    if (role === 'CLASS_TEACHER') {
      menuItems.push(
        { name: 'My Class', href: '/dashboard/class', icon: Users },
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      );
    } else if (role === 'SUBJECT_TEACHER') {
      menuItems.push(
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      );
    } else if (role === 'PARENT') {
      menuItems.push(
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      );
    } else if (role === 'STUDENT') {
      menuItems.push(
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      );
    }
  }

  const otherItems: SidebarItem[] = [
    { name: 'Profile', href: '/dashboard/profile', icon: User },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  if (role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN') {
    otherItems.push({ name: 'Audit Logs', href: '/dashboard/logs', icon: FileText });
  }

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-[#f8f9fa]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,600&display=swap');
        
        :root {
          --font-sans: 'Plus Jakarta Sans', sans-serif;
          --font-serif: 'Playfair Display', serif;
        }

        body, .font-sans, .font-sans-custom {
          font-family: var(--font-sans) !important;
          background-color: #f8f9fa !important;
        }

        .serif-italic {
          font-family: var(--font-serif) !important;
        }

        /* Border Overrides */
        .border-slate-100, .border-slate-200, .border-slate-150, .border-slate-300, .border-slate-200\/60, .border-slate-200\/80, .border-slate-800\/80, .border-slate-850, .border-slate-250 {
          border-color: #e9ecef !important;
        }
        .divide-slate-100 > * + * {
          border-color: #e9ecef !important;
        }

        /* Card and container backgrounds */
        .bg-slate-50, .bg-slate-900\/60, .bg-slate-900\/80, .bg-slate-950, .bg-slate-950\/40, .bg-slate-100 {
          background-color: #f8f9fa !important;
        }
        main {
          background-color: #f8f9fa !important;
        }
        aside, header {
          background-color: #ffffff !important;
        }
        .bg-white {
          background-color: #ffffff !important;
        }
        
        /* Table headers */
        .bg-slate-50, th {
          background-color: #f8f9fa !important;
        }
        
        /* Sidebar active items */
        .bg-blue-50, .bg-indigo-50, .bg-emerald-50, .bg-blue-50\/50, .bg-indigo-50\/50, .bg-emerald-50\/50 {
          background-color: #f1f3f5 !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }
        .text-blue-600, .text-indigo-600, .text-emerald-600 {
          color: #1e293b !important;
        }
        .border-blue-100, .border-indigo-100, .border-emerald-100 {
          border-color: #cbd5e1 !important;
        }

        /* Forms, Inputs, Selects & Textareas */
        input, select, textarea {
          font-family: var(--font-sans) !important;
          background-color: #ffffff !important;
          border: 1px solid #e9ecef !important;
          color: #1e293b !important;
          border-radius: 0.75rem !important;
          font-weight: 500 !important;
          transition: all 0.2s ease-in-out !important;
        }
        input:focus, select:focus, textarea:focus {
          border-color: #cbd5e1 !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(30, 41, 59, 0.05) !important;
        }
        label, .text-\[9px\]\.font-bold\.uppercase\.tracking-widest {
          color: #64748b !important;
          font-weight: 700 !important;
          letter-spacing: 0.08em !important;
        }

        /* Buttons Overrides */
        .bg-blue-600, .bg-indigo-600, .bg-emerald-600, .bg-blue-500, .bg-indigo-500, .bg-emerald-500 {
          background-color: #1e293b !important;
          color: #ffffff !important;
          border-radius: 0.75rem !important;
          transition: all 0.2s ease-in-out !important;
        }
        .bg-blue-600:hover, .bg-indigo-600:hover, .bg-emerald-600:hover, .bg-blue-500:hover, .bg-indigo-500:hover, .bg-emerald-500:hover {
          background-color: #0f172a !important;
        }
        .text-blue-600, .text-indigo-600, .text-emerald-600 {
          color: #1e293b !important;
        }

        /* Calendar Widget Custom Overrides */
        .bg-blue-600.text-white, .bg-indigo-600.text-white {
          background-color: #1e293b !important;
          color: #ffffff !important;
        }
        .bg-blue-50.text-blue-600, .bg-indigo-50.text-indigo-600 {
          background-color: #f1f3f5 !important;
          color: #1e293b !important;
          border-color: #cbd5e1 !important;
        }

        /* Status Badge/Card overrides (keeps semantics but clean/soft) */
        .bg-green-50, .bg-emerald-50\/20 {
          background-color: #eafaf1 !important;
          color: #10b981 !important;
          border-color: #d1fae5 !important;
        }
        .bg-red-50, .bg-red-50\/20 {
          background-color: #fbf1f2 !important;
          color: #ef4444 !important;
          border-color: #fee2e2 !important;
        }
        .bg-amber-50, .bg-amber-50\/20 {
          background-color: #fdf4e9 !important;
          color: #f59e0b !important;
          border-color: #fef3c7 !important;
        }
        .text-green-800, .text-emerald-800 {
          color: #10b981 !important;
        }
        .text-red-800 {
          color: #ef4444 !important;
        }
        .text-amber-800 {
          color: #d97706 !important;
        }

        /* KPI Card Override */
        .bg-\[\#edf2fe\], .bg-\[\#fdf4e9\], .bg-\[\#eafaf1\], .bg-\[\#fbf1f2\] {
          background-color: #ffffff !important;
          border-color: #e9ecef !important;
        }

        /* KPI Text Colors */
        .text-blue-800, .text-amber-800, .text-emerald-800, .text-red-800 {
          color: #1e293b !important;
        }
        .text-blue-500, .text-amber-600, .text-emerald-600, .text-red-650, .text-red-600 {
          color: #94a3b8 !important;
        }

        /* Global headings to match NachoEd theme */
        h1, h2, h3, h4, h5, h6, .text-slate-800, .text-slate-900 {
          color: #1e293b !important;
        }
        .text-slate-400, .text-slate-500, .text-slate-450 {
          color: #64748b !important;
        }

        /* Modals & Dialog Boxes */
        .modal-content, .bg-white.rounded-3xl {
          background-color: #ffffff !important;
          border: 1px solid #e9ecef !important;
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .animate-float-slow {
          animation: float-slow 7s ease-in-out infinite;
        }
      `}</style>
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-yellow-500 text-slate-900 px-6 py-2.5 flex items-center justify-between z-[9999] text-xs font-black shadow-md shrink-0 border-b border-yellow-600 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-sm">🕵️</span>
            <span>
              Impersonation Mode Active: Viewing as Principal Admin of <strong className="underline">{session.school.name}</strong> (Tenant: <code className="font-mono bg-yellow-600/25 px-1 py-0.5 rounded">{session.school.slug}</code>)
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonation}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">

      
      {/* 1. Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden lg:flex flex-shrink-0 z-40">
        <div className="overflow-y-auto flex-1">
          <div className="p-5 flex items-center gap-3 border-b border-[#e9ecef] mb-2">
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt="School Crest" className="w-8 h-8 rounded-xl object-cover border border-slate-200 bg-white" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 15 C25 25 25 60 50 85 C75 60 75 25 50 15 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
                <path d="M36 45 C42 48 48 51 50 54 C52 51 58 48 64 45 V65 C58 68 52 71 50 74 C48 71 42 68 36 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M50 54 V74" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M50 22 L62 27 L50 32 L38 27 Z" fill="#1e293b" />
                <path d="M44 29.5 V33 C44 36 56 36 56 33 V29.5" fill="#1e293b" />
                <path d="M62 27 V35" stroke="#db2777" strokeWidth="1.5" />
                <circle cx="62" cy="35" r="1.5" fill="#db2777" />
              </svg>
            )}
            <span className="font-bold text-base text-[#1e293b] tracking-tight truncate max-w-[150px] uppercase font-sans-custom" title={role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}>
              {role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}
            </span>
          </div>

          {/* MENU SECTION */}
          <div className="px-4 py-3">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              MENU
            </span>
            <nav className="space-y-0.5">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* OTHER SECTION */}
          <div className="px-4 py-3">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              OTHER
            </span>
            <nav className="space-y-0.5">
              {otherItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer (Logout) */}
        <div className="p-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50/50 hover:text-red-600 transition-all text-left"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Hamburger Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="w-64 h-full bg-white p-5 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[#e9ecef] mb-4">
                <div className="flex items-center gap-2.5">
                  {school?.logoUrl ? (
                    <img src={school.logoUrl} alt="School Crest" className="w-6 h-6 rounded-lg object-cover border border-slate-200 bg-white" />
                  ) : (
                    <svg viewBox="0 0 100 100" className="w-6 h-6 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 15 C25 25 25 60 50 85 C75 60 75 25 50 15 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
                      <path d="M36 45 C42 48 48 51 50 54 C52 51 58 48 64 45 V65 C58 68 52 71 50 74 C48 71 42 68 36 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                      <path d="M50 54 V74" stroke="#1d4ed8" strokeWidth="1.5" />
                      <path d="M50 22 L62 27 L50 32 L38 27 Z" fill="#1e293b" />
                      <path d="M44 29.5 V33 C44 36 56 36 56 33 V29.5" fill="#1e293b" />
                      <path d="M62 27 V35" stroke="#db2777" strokeWidth="1.5" />
                      <circle cx="62" cy="35" r="1.5" fill="#db2777" />
                    </svg>
                  )}
                  <span className="font-bold text-sm text-[#1e293b] truncate max-w-[130px] uppercase font-sans-custom" title={role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}>
                    {role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}
                  </span>
                </div>
                <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-md bg-slate-50 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-4">
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  MENU
                </span>
                <nav className="space-y-0.5">
                  {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  OTHER
                </span>
                <nav className="space-y-0.5">
                  {otherItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border border-blue-100 shadow-sm'
                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700 border border-transparent'
                        }`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all text-left"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0 z-30">
          {/* Left menu toggle */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 lg:hidden hover:text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            {/* Notifications badge */}
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setBellOpen(!bellOpen)}
                className="relative p-1.5 rounded-full bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 text-slate-900 rounded-full text-[8px] flex items-center justify-center font-bold animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {bellOpen && (
                <>
                  {/* Invisible Overlay to close on click outside */}
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
                  
                  {/* Glassmorphic Dropdown Panel */}
                  <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden font-sans animate-fadeIn">
                    {/* Panel Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-slate-800 tracking-wider">🔔 Announcements</span>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await fetch('/api/messages', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  userId: session.user.id,
                                  messageIds: latestAlerts.map(a => a.messageId)
                                })
                              });
                              setUnreadCount(0);
                              setLatestAlerts([]);
                              setBellOpen(false);
                            } catch (e) {
                              console.error(e);
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-500"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Panel Content List */}
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {latestAlerts.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 space-y-2">
                          <Bell className="w-8 h-8 mx-auto text-slate-200" />
                          <p className="text-[11px] font-bold">All caught up!</p>
                          <p className="text-[10px] text-slate-400 font-normal">No unread announcements.</p>
                        </div>
                      ) : (
                        latestAlerts.map((alert: any) => {
                          const priorityColor = 
                            alert.priority === 'URGENT' 
                              ? 'bg-red-500 text-white' 
                              : alert.priority === 'HIGH' 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-100 text-slate-600';
                          
                          return (
                            <div 
                              key={alert.messageId}
                              className="p-3.5 hover:bg-slate-50 transition-colors flex gap-2.5 items-start text-xs font-semibold cursor-pointer text-left"
                              onClick={() => {
                                setBellOpen(false);
                                router.push('/dashboard/messages');
                              }}
                            >
                              <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${priorityColor}`}>
                                    {alert.priority}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold capitalize">
                                    {alert.sender ? `${alert.sender.firstName} (${alert.sender.role.toLowerCase().replace('_', ' ')})` : 'System'}
                                  </span>
                                </div>
                                <h4 className="text-slate-850 font-bold leading-tight">{alert.title}</h4>
                                <p className="text-[11px] text-slate-400 font-normal line-clamp-2 leading-relaxed">
                                  {alert.body}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Panel Footer */}
                    <Link 
                      href="/dashboard/messages"
                      onClick={() => setBellOpen(false)}
                      className="p-3 bg-slate-50 border-t border-slate-100 text-center block text-[10px] font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    >
                      View Inbox & Announcements
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Profile summary */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <span className="block text-xs font-bold text-slate-800">{user.firstName} {user.lastName}</span>
                <span className="block text-[9px] font-bold text-slate-400 capitalize">{getRoleLabel(role)}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-xs text-indigo-600 shadow-inner">
                {user.firstName ? user.firstName[0].toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Scrolling Area */}
        <main className="flex-1 overflow-y-auto p-5 md:p-6 bg-slate-50 relative">
          {children}
        </main>
      </div>
      {/* Telemetry Feedback Collection Modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 max-w-md w-full p-6 shadow-2xl relative rounded-none animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setFeedbackOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {feedbackSuccess ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Feedback Submitted</h3>
                <p className="text-xs text-slate-500">Thank you! Your feedback has been logged in our CRM and we have sent you a confirmation email.</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">Share Your Experience</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Help Us Refine NachoEd</p>
                </div>

                {/* Ratings block */}
                <div className="space-y-3 bg-slate-50 p-3.5 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Ease of Use</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setEaseOfUse(val)}
                          className={`w-6 h-6 text-xs font-bold transition-all ${
                            easeOfUse >= val 
                              ? 'bg-[#1e293b] text-white' 
                              : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Design Quality</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDesignRating(val)}
                          className={`w-6 h-6 text-xs font-bold transition-all ${
                            designRating >= val 
                              ? 'bg-[#1e293b] text-white' 
                              : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Feature Usefulness</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setUsefulness(val)}
                          className={`w-6 h-6 text-xs font-bold transition-all ${
                            usefulness >= val 
                              ? 'bg-[#1e293b] text-white' 
                              : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Feature details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Most Useful Feature</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Importer, PDF cards"
                      value={mostUseful}
                      onChange={(e) => setMostUseful(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 text-slate-700"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Confusing Features</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Score approvals"
                      value={confusing}
                      onChange={(e) => setConfusing(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 text-slate-700"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Your Suggestions</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="What can we improve or add to make the app more valuable?"
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 text-slate-700 resize-none"
                  />
                </div>

                {/* Yes/No block */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Would adopt in school?</label>
                    <select
                      value={wouldUse}
                      onChange={(e) => setWouldUse(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 text-slate-700"
                    >
                      <option value="YES">Yes, definitely</option>
                      <option value="MAYBE">Maybe in future</option>
                      <option value="NO">No, unlikely</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Would pay for service?</label>
                    <select
                      value={wouldPay}
                      onChange={(e) => setWouldPay(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-400 text-slate-700"
                    >
                      <option value="YES">Yes, willing to pay</option>
                      <option value="MAYBE">Maybe / Depends on price</option>
                      <option value="NO">No, only free version</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    Later
                  </button>
                  <button
                    type="submit"
                    disabled={feedbackLoading}
                    className="flex-2 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-md flex justify-center items-center gap-1.5"
                  >
                    {feedbackLoading ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';

