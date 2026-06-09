'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, Users, GraduationCap, BookOpen, Layers, ClipboardList, 
  MessageSquare, User, Settings, LogOut, Menu, X, 
  Bell, Award, Shield, Sparkles, Calendar, FileText
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
    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
    localStorage.removeItem('report_super_session_backup');
    localStorage.removeItem('report_super_token_backup');
    document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
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
    <div className="min-h-screen flex flex-col font-sans overflow-hidden bg-slate-50">
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
          <div className="p-5 flex items-center gap-3">
            {role === 'SUPER_ADMIN' ? (
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
            ) : school?.logoUrl ? (
              <img src={school.logoUrl} alt="School Crest" className="w-8 h-8 rounded-xl object-cover border border-slate-200 bg-white" />
            ) : (
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
            )}
            <span className="font-bold text-lg text-slate-900 tracking-tight truncate max-w-[150px]" title={role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}>
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
              <div className="flex items-center justify-between pb-5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  {role === 'SUPER_ADMIN' ? (
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                  ) : school?.logoUrl ? (
                    <img src={school.logoUrl} alt="School Crest" className="w-6 h-6 rounded-lg object-cover border border-slate-200 bg-white" />
                  ) : (
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                    </div>
                  )}
                  <span className="font-bold text-sm text-slate-900 truncate max-w-[130px]" title={role === 'SUPER_ADMIN' ? 'NachoEd' : (school?.name || 'NachoEd')}>
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
    </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';

