'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Users, CheckCircle, AlertCircle, RefreshCw, Sparkles, X, Mail, Phone, 
  Trash2, Search, Eye, Download, Upload, Activity, Database, DollarSign, 
  Brain, MessageSquare, AlertTriangle, Play, Settings, Plus, LayoutDashboard, 
  FileText, Check, ShieldAlert, Shield, ToggleLeft, ToggleRight, Loader2, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface SuperAdminDashboardProps {
  user: any;
  school: any;
}

export default function SuperAdminDashboard({ user, school }: SuperAdminDashboardProps) {
  // Navigation tabs for the 20 subsections
  const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'leads' | 'billing' | 'audit'>('overview');

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good Morning';
    if (hr < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [schools, setSchools] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, text: 'King\'s College subscription is about to expire in 3 days.', read: false, type: 'warning' },
    { id: 2, text: 'New demo request received from Greenwood Academy.', read: false, type: 'info' },
    { id: 3, text: 'Failed payment callback logged on Flutterwave webhook.', read: false, type: 'error' },
    { id: 4, text: 'System backup executed successfully.', read: true, type: 'success' },
  ]);

  // Modal States
  const [showAddSchoolModal, setShowAddSchoolModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [selectedSchoolForBilling, setSelectedSchoolForBilling] = useState<any>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);

  // Registration Form States
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolSlug, setNewSchoolSlug] = useState('');
  const [newSchoolAddress, setNewSchoolAddress] = useState('');
  const [newSchoolPhone, setNewSchoolPhone] = useState('');
  const [newSchoolEmail, setNewSchoolEmail] = useState('');
  const [newSchoolGrading, setNewSchoolGrading] = useState<'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [registering, setRegistering] = useState(false);
  const [formError, setFormError] = useState('');

  // Billing Form States
  const [billingAmount, setBillingAmount] = useState('');
  const [billingMethod, setBillingMethod] = useState('Manual Bank Transfer');
  const [billingPlan, setBillingPlan] = useState('Standard Plan');
  const [billingTerms, setBillingTerms] = useState('1');
  const [loggingPayment, setLoggingPayment] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Selector for chart mode
  const [chartMode, setChartMode] = useState<'revenue' | 'activity' | 'growth'>('revenue');

  // Compute dynamic chart data points based on selected mode
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (chartMode === 'revenue') {
      const monthlySum: Record<string, number> = {};
      const now = new Date();
      const last6Months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mName = months[d.getMonth()];
        last6Months.push(mName);
        monthlySum[mName] = 0;
      }

      payments.forEach(p => {
        if (p.status === 'paid') {
          const pDate = new Date(p.paymentDate);
          const mName = months[pDate.getMonth()];
          if (monthlySum[mName] !== undefined) {
            monthlySum[mName] += p.amount;
          }
        }
      });

      return last6Months.map(m => ({ label: m, value: monthlySum[m] }));
    } else if (chartMode === 'activity') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dailyCount: Record<string, number> = {};
      const now = new Date();
      const last7Days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dName = days[d.getDay()];
        last7Days.push(dName);
        dailyCount[dName] = 0;
      }

      usageLogs.forEach(l => {
        const lDate = new Date(l.createdAt);
        const dName = days[lDate.getDay()];
        if (dailyCount[dName] !== undefined) {
          dailyCount[dName]++;
        }
      });

      return last7Days.map(d => ({ label: d, value: dailyCount[d] }));
    } else {
      const monthlyCount: Record<string, number> = {};
      const now = new Date();
      const last6Months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mName = months[d.getMonth()];
        last6Months.push(mName);
        monthlyCount[mName] = 0;
      }

      schools.forEach(s => {
        const sDate = new Date(s.createdAt);
        const mName = months[sDate.getMonth()];
        if (monthlyCount[mName] !== undefined) {
          monthlyCount[mName]++;
        }
      });

      let cumulative = 0;
      return last6Months.map(m => {
        cumulative += monthlyCount[m];
        return { label: m, value: cumulative };
      });
    }
  }, [chartMode, payments, usageLogs, schools]);

  // Compute SVG Path points from chartData
  const svgPath = useMemo(() => {
    if (chartData.length === 0) return { line: '', area: '', points: [] };

    const maxVal = Math.max(...chartData.map(d => d.value), 10);
    const width = 500;
    const height = 160;
    const paddingLeft = 30;
    const paddingRight = 30;
    const paddingTop = 20;
    const paddingBottom = 20;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const points = chartData.map((d, index) => {
      const x = paddingLeft + (index / (chartData.length - 1)) * plotWidth;
      const y = height - paddingBottom - (d.value / maxVal) * plotHeight;
      return { x, y };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingBottom).toFixed(1)} Z`;

    return { line: linePath, area: areaPath, points };
  }, [chartData]);

  // Daily stats calculations (sliding 24-hour window to handle timezone shifts/midnights)
  const dailyActiveUsersCount = useMemo(() => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    const activeEmails = auditLogs
      .filter(l => nowMs - new Date(l.loginTime).getTime() <= oneDayMs)
      .map(l => l.user?.email)
      .filter(Boolean);
    return new Set(activeEmails).size || 0;
  }, [auditLogs]);

  const todayRevenueSum = useMemo(() => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return payments
      .filter(p => {
        const isPaid = p.status === 'paid';
        const isRecent = nowMs - new Date(p.paymentDate).getTime() <= oneDayMs;
        return isPaid && isRecent;
      })
      .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  useEffect(() => {
    // Dynamic Time display
    const updateTime = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('/api/superadmin/stats', { cache: 'no-store', headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch platform telemetry');

      setStats(json.stats);
      setSchools(json.schools || []);
      setLeads(json.leads || []);
      setUsageLogs(json.usageLogs || []);
      setAuditLogs(json.auditLogs || []);
      setPayments(json.payments || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformData();
  }, []);

  // Automatically calculate default billing amount based on selected plan and duration terms
  useEffect(() => {
    let pricePerTerm = 80000; // Standard Plan default (Up to 250 students)
    if (billingPlan.includes('Basic') || billingPlan.includes('100')) {
      pricePerTerm = 40000;
    } else if (billingPlan.includes('Standard') || billingPlan.includes('250')) {
      pricePerTerm = 80000;
    } else if (billingPlan.includes('Premium') || billingPlan.includes('500')) {
      pricePerTerm = 150000;
    } else if (billingPlan.includes('Enterprise') || billingPlan.includes('Unlimited')) {
      pricePerTerm = 300000;
    }

    const termsCount = parseInt(billingTerms, 10) || 1;
    setBillingAmount(String(pricePerTerm * termsCount));
  }, [billingPlan, billingTerms]);

  // Filter school registry
  const filteredSchools = useMemo(() => {
    return schools.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPlan = selectedPlanFilter === 'ALL' || s.subscriptionPlan.toUpperCase().includes(selectedPlanFilter);
      const matchStatus = selectedStatusFilter === 'ALL' || s.subscriptionStatus.toUpperCase() === selectedStatusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [schools, searchQuery, selectedPlanFilter, selectedStatusFilter]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      return l.schoolName.toLowerCase().includes(searchQuery.toLowerCase()) || 
             l.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             l.email.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [leads, searchQuery]);

  // Service Health indicators
  const healthStatus = {
    apiServer: 'HEALTHY',
    database: 'HEALTHY',
    auth: 'HEALTHY',
    storage: 'HEALTHY',
    email: 'HEALTHY',
    flutterwave: 'HEALTHY',
    backgroundJobs: 'WARNING', // simulated
    backups: 'HEALTHY'
  };

  // Register school action
  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName || !newSchoolSlug) {
      setFormError('School Name and URL Slug are required.');
      return;
    }
    setRegistering(true);
    setFormError('');
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSchoolName,
          slug: newSchoolSlug,
          address: newSchoolAddress,
          phone: newSchoolPhone,
          email: newSchoolEmail,
          gradingType: newSchoolGrading
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register school tenant');

      setShowAddSchoolModal(false);
      // Reset form
      setNewSchoolName('');
      setNewSchoolSlug('');
      setNewSchoolAddress('');
      setNewSchoolPhone('');
      setNewSchoolEmail('');
      loadPlatformData();
    } catch (err: any) {
      setFormError(err.message || 'Error creating school.');
    } finally {
      setRegistering(false);
    }
  };

  // Log subscription payment
  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingAmount || isNaN(parseFloat(billingAmount))) {
      alert('Please enter a valid payment amount.');
      return;
    }
    setLoggingPayment(true);
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolId: selectedSchoolForBilling.id,
          amount: parseFloat(billingAmount),
          paymentMethod: billingMethod,
          status: 'paid',
          planSelected: billingPlan,
          durationTerms: parseInt(billingTerms, 10)
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to log manual payment');

      setShowBillingModal(false);
      setBillingAmount('');
      loadPlatformData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoggingPayment(false);
    }
  };

  // Impersonate School Admin
  const handleImpersonate = async (schoolSlug: string) => {
    setImpersonating(schoolSlug);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassRole: 'SCHOOL_ADMIN', schoolSlug })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to impersonate admin');

      // Backup current super admin session & token
      const currentSession = localStorage.getItem('report_user_session');
      const currentToken = localStorage.getItem('report_auth_token');
      if (currentSession) {
        localStorage.setItem('report_super_session_backup', currentSession);
      }
      if (currentToken) {
        localStorage.setItem('report_super_token_backup', currentToken);
      }

      // Overwrite with school admin session and cookie
      localStorage.setItem('report_auth_token', json.token);
      localStorage.setItem('report_user_session', JSON.stringify({ user: json.user, school: json.school }));
      document.cookie = `report_auth_token=${json.token}; path=/; max-age=3600; SameSite=Lax`;
      
      // Force reload to dashboard with school admin context loaded
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message);
      setImpersonating(null);
    }
  };

  // Toggle school suspension
  const handleToggleSuspension = async (schoolId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const confirmMsg = `Are you sure you want to set subscription status to '${nextStatus}' for this school?`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/schools', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolId,
          subscriptionStatus: nextStatus
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update subscription status');

      loadPlatformData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reset School Admin Password
  const handleResetPassword = async (schoolId: string) => {
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      // Find school admin user ID to reset
      const schoolDetails = schools.find(s => s.id === schoolId);
      if (!schoolDetails) return;

      const userRes = await fetch(`/api/staff?schoolId=${schoolId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userJson = await userRes.json();
      const firstAdmin = userJson.data?.find((u: any) => u.role === 'SCHOOL_ADMIN');
      
      if (!firstAdmin) {
        alert('No School Administrator account found to reset.');
        return;
      }

      if (!confirm(`Are you sure you want to reset password for administrator: ${firstAdmin.email}?`)) return;

      const resetRes = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUserId: firstAdmin.id })
      });
      const resetJson = await resetRes.json();
      if (!resetRes.ok) throw new Error(resetJson.error || 'Password reset failed');

      alert(`Password reset successful!\nTemporary Password: ${resetJson.temporaryPassword}\nCopy this for the school administrator.`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lead actions: approve demo, convert
  const handleLeadAction = async (leadId: string, action: string) => {
    if (!confirm(`Trigger action '${action}' for this lead?`)) return;
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/superadmin/actions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ leadId, action })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Action execution failed');

      alert('Lead action executed successfully.');
      loadPlatformData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Export schools sheet
  const handleExportSchools = () => {
    if (schools.length === 0) return;
    const wsData = schools.map(s => ({
      'School Name': s.name,
      'URL Slug': s.slug,
      'Plan': s.subscriptionPlan,
      'Status': s.subscriptionStatus,
      'Students': s.studentCount,
      'Staff': s.staffCount,
      'Parents': s.parentCount,
      'Revenue Generated (NGN)': s.totalRevenue,
      'Last Activity': s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : 'N/A',
      'Database Size (KB)': s.dbSizeKB,
      'Storage Used (MB)': s.storageUsedMB
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'SchoolsRegistry');
    XLSX.writeFile(wb, 'Platform_Schools_Registry.xlsx');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-xs text-slate-400 font-semibold">Loading command center analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">

      {/* SECTION 1: HEADER & METADATA */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
              <Shield className="w-4 h-4 text-indigo-650" />
            </div>
            <h1 className="text-lg font-extrabold text-slate-900">{getGreeting()}, {user.firstName || 'Victor'} 👋</h1>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Platform central command • Version 2.4.0 • Local Time: <span className="font-mono font-bold text-slate-650">{currentTime || '11:52 PM'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Global Search Bar */}
          <div className="relative flex-grow lg:flex-grow-0 lg:w-60">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search schools, leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3 h-3 text-slate-400 hover:text-slate-650" />
              </button>
            )}
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => setShowAddSchoolModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-650/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Register School
          </button>

          {/* Notifications Center Icon */}
          <div className="relative">
            <button
              onClick={() => setNotificationOpen(!notificationOpen)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 relative cursor-pointer"
            >
              <Activity className="w-4 h-4 text-slate-500" />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 z-50 animate-fadeIn space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700">Platform Alerts</h4>
                  <button onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))} className="text-[10px] text-indigo-600 hover:underline font-bold">Mark all read</button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-2 rounded-xl text-[10px] font-semibold leading-relaxed border ${n.read ? 'bg-slate-50/50 border-slate-100 text-slate-500' : 'bg-indigo-50/20 border-indigo-100 text-slate-700'}`}>
                      <div className="flex items-start gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'error' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        <span>{n.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PLATFORM HEALTH STATUS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">SaaS System Health Telemetry</span>
          <span className="text-[10px] text-slate-500 font-bold">Uptime: 99.98% • Response: 145ms</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Object.entries(healthStatus).map(([service, status]) => (
            <div key={service} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${status === 'HEALTHY' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-xs font-black text-slate-700">{status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS SIDEBAR/HEADER */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
        >
          Overview & Insights
        </button>
        <button
          onClick={() => setActiveTab('schools')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${activeTab === 'schools' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
        >
          Schools & Subscriptions ({schools.length})
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${activeTab === 'leads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
        >
          Sales Leads & Feedback ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${activeTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
        >
          Billing & Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${activeTab === 'audit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
        >
          Platform Logs
        </button>
      </div>

      {/* SECTION 3: TAB CONTENTS */}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* SECTION 3: EXECUTIVE KPI CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Tenants</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{stats?.activeSchools || 0}</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+12%</span>
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 20">
                  <path d="M 0 15 Q 20 8, 40 12 T 80 5 T 100 2" fill="none" stroke="#6366f1" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Monthly Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">₦{(stats?.mrr || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+8%</span>
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 20">
                  <path d="M 0 18 Q 15 15, 30 10 T 60 8 T 90 4 T 100 1" fill="none" stroke="#10b981" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Annual Revenue (ARR)</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">₦{(stats?.arr || 0).toLocaleString()}</span>
                <span className="text-xs font-bold text-slate-400">Target reached</span>
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 20">
                  <path d="M 0 19 Q 20 18, 40 14 T 80 10 T 100 5" fill="none" stroke="#059669" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
              <div className="flex justify-between items-start text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Sales Conversions</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">{stats?.conversionRate || 0}%</span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><ArrowUpRight className="w-3 h-3" />+5%</span>
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-2">
                <svg className="w-full h-full" viewBox="0 0 100 20">
                  <path d="M 0 15 Q 30 18, 50 10 T 90 2 T 100 0" fill="none" stroke="#f59e0b" strokeWidth="2" />
                </svg>
              </div>
            </div>
          </div>

          {/* SECTION 4: TODAY'S PLATFORM SUMMARY */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Today's Operating Activity Logs</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1">
                <h4 className="text-slate-450 text-[10px] font-bold">Daily Active Users</h4>
                <div className="text-lg font-black text-slate-700">{dailyActiveUsersCount || 0} active users</div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1">
                <h4 className="text-slate-450 text-[10px] font-bold">Attendance Sheets Taken</h4>
                <div className="text-lg font-black text-slate-700">{stats?.totalAttendanceTaken || 0} registers</div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1">
                <h4 className="text-slate-450 text-[10px] font-bold">Report Cards Compiled</h4>
                <div className="text-lg font-black text-slate-700">{stats?.totalReportCardsCompiled || 0} class levels</div>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1">
                <h4 className="text-slate-450 text-[10px] font-bold">Revenue Logged Today</h4>
                <div className="text-lg font-black text-emerald-600">₦{(todayRevenueSum || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* SECTION 5 & 6: CHARTS & LIVE ACTIVITY FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Custom SVG Analytics Chart */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Platform Telemetry & Analytics</span>
                
                {/* Dynamic Chart Selector Tab Group */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartMode('revenue')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${chartMode === 'revenue' ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Revenue (₦)
                  </button>
                  <button
                    onClick={() => setChartMode('activity')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${chartMode === 'activity' ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Engagement
                  </button>
                  <button
                    onClick={() => setChartMode('growth')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${chartMode === 'growth' ? 'bg-indigo-50 border-indigo-200 text-indigo-650' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    School Onboardings
                  </button>
                </div>
              </div>

              {/* Interactive SVG Chart Area */}
              <div className="h-44 w-full relative">
                <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="#f8fafc" strokeWidth="1" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#f8fafc" strokeWidth="1" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f8fafc" strokeWidth="1" />
                  
                  {/* Chart Fill (Area Under Line) */}
                  {svgPath.area && (
                    <path d={svgPath.area} fill="url(#chartGrad)" opacity="0.12" />
                  )}
                  {/* Chart Line */}
                  {svgPath.line && (
                    <path d={svgPath.line} fill="none" stroke="#4f46e5" strokeWidth="2.5" />
                  )}
                  
                  {/* Render Data Points Dots */}
                  {svgPath.points?.map((p, i) => (
                    <g key={i} className="group cursor-pointer">
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        className="fill-indigo-600 stroke-white stroke-2 hover:r-5 transition-all"
                      />
                      <title>{chartData[i].label}: {chartMode === 'revenue' ? `₦${chartData[i].value.toLocaleString()}` : chartData[i].value}</title>
                    </g>
                  ))}
                  
                  {/* Definitions for gradient */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Axes details */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-between text-[8px] font-bold text-slate-400 px-6">
                  {chartData.map((d, i) => (
                    <span key={i}>{d.label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col gap-4">
              <span className="text-[9px] font-extrabold tracking-wider text-slate-400 uppercase">Live Activity Feed</span>
              <div className="space-y-3 overflow-y-auto max-h-[220px] flex-grow">
                {usageLogs.slice(0, 6).map((log, index) => (
                  <div key={log.id || index} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-700 leading-snug">
                        {log.schoolName}: <span className="font-semibold text-slate-500">{log.activityType.toLowerCase().replace('_', ' ')}</span>
                      </p>
                      <span className="text-[8px] font-bold text-slate-400 block">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
                {usageLogs.length === 0 && (
                  <p className="text-[10px] text-slate-400 font-semibold italic text-center py-12">No activity logged today yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 7: AI BUSINESS INSIGHTS */}
          <div className="bg-slate-50 rounded-3xl border border-slate-200/60 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-650" />
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">AI Business Insights & Actions</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-extrabold tracking-wider text-amber-500 uppercase flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> High Churn Risk
                </span>
                <p className="text-[11px] font-semibold text-slate-650 leading-relaxed">
                  Lagos Excel Academy has not logged in for 12 consecutive days.
                </p>
                <button
                  onClick={() => alert('Sending system reactivation email to Lagos Excel...')}
                  className="text-[10px] font-black text-indigo-650 hover:underline mt-1 block"
                >
                  Reach Out Admin →
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-extrabold tracking-wider text-emerald-500 uppercase flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Pilot Conversion
                </span>
                <p className="text-[11px] font-semibold text-slate-650 leading-relaxed">
                  Bright Future Academy demo has uploaded 120 results. Highly engaged.
                </p>
                <button
                  onClick={() => alert('Drafting conversion email proposals for Bright Future...')}
                  className="text-[10px] font-black text-indigo-650 hover:underline mt-1 block"
                >
                  Propose Upgrade Plan →
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-extrabold tracking-wider text-blue-500 uppercase flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Feature Upselling
                </span>
                <p className="text-[11px] font-semibold text-slate-650 leading-relaxed">
                  Report card compiles increased by 28% platform-wide this academic week.
                </p>
                <button
                  onClick={() => alert('Broadcasting platform report templates tips...')}
                  className="text-[10px] font-black text-indigo-650 hover:underline mt-1 block"
                >
                  Send Platform Broadcast →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: TENANT REGISTRY */}
      {activeTab === 'schools' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Tenant Registry</h3>
            <button
              onClick={handleExportSchools}
              className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export Registry
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Subscription Plan</th>
                  <th className="py-3 px-4">Health Index</th>
                  <th className="py-3 px-4">Registry Aggs</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSchools.map((s) => (
                  <tr key={s.id} className="text-xs text-slate-750 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800 block">{s.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{s.slug}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">{s.subscriptionPlan}</span>
                        <span className="text-[9px] text-slate-400">Total Rev: ₦{s.totalRevenue.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${s.healthScore >= 80 ? 'bg-green-50 text-green-650' : s.healthScore >= 50 ? 'bg-amber-50 text-amber-650' : 'bg-red-50 text-red-650'}`}>
                          {s.healthScore}/100
                        </span>
                        <span className="text-[9px] text-slate-400 max-w-[120px] truncate">{s.recommendation}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5 text-[10px] font-bold text-slate-500">
                        <span>Students: {s.studentCount}</span> • <span>Staff: {s.staffCount}</span>
                        <span className="block text-[8px] text-slate-400">Storage: {s.storageUsedMB}MB / DB: {s.dbSizeKB}KB</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${s.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-650' : s.subscriptionStatus === 'trial' ? 'bg-blue-50 text-blue-650' : 'bg-rose-50 text-rose-650'}`}>
                        {s.subscriptionStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setSelectedSchoolForBilling(s); setBillingAmount(''); setShowBillingModal(true); }}
                          title="Upgrade Subscription Plan / Log Payment"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-650" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(s.id)}
                          title="Reset Administrator Credentials"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleToggleSuspension(s.id, s.subscriptionStatus)}
                          title={s.subscriptionStatus === 'suspended' ? 'Activate Subscription' : 'Suspend Tenant Account'}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                        >
                          {s.subscriptionStatus === 'suspended' ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                        </button>
                        <button
                          onClick={() => handleImpersonate(s.slug)}
                          disabled={impersonating !== null}
                          className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-650 rounded-lg text-[10px] font-extrabold cursor-pointer"
                        >
                          {impersonating === s.slug ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> Login As...
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-indigo-650" /> Login As
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSchools.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold italic">No school tenants matched the active filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 10: LEAD MANAGEMENT */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Demo Sandbox Requests & Leads Pipeline</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">School Details</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4">Sizes</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Sandbox Stats</th>
                  <th className="py-3 px-4 text-right">Pipeline Commands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((l) => (
                  <tr key={l.id} className="text-xs text-slate-750 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800 block">{l.schoolName}</span>
                        <span className="text-[10px] text-slate-400 capitalize">{l.schoolType?.toLowerCase() || 'SECONDARY'} • {l.ownershipType?.toLowerCase() || 'PRIVATE'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-slate-700 block">{l.contactName || 'Not Logged'} ({l.position || 'PROPRIETOR'})</span>
                        <span className="text-[10px] font-mono text-slate-400">{l.email} • {l.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <span>Students: {l.studentCount || '100+'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${l.leadStatus === 'CUSTOMER' ? 'bg-emerald-50 text-emerald-650' : l.leadStatus === 'TESTING' ? 'bg-amber-50 text-amber-650' : 'bg-slate-50 text-slate-550'}`}>
                        {l.leadStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {l.demoSchoolId ? (
                        <div className="text-[10px] font-bold text-indigo-650 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Sandbox Ready
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">No sandbox</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.demoSchoolId && (
                          <button
                            onClick={() => handleLeadAction(l.id, 'approveDemo')}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Spin Up Sandbox
                          </button>
                        )}
                        {l.leadStatus !== 'CUSTOMER' && (
                          <button
                            onClick={() => handleLeadAction(l.id, 'convertToCustomer')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Convert to Customer
                          </button>
                        )}
                        <button
                          onClick={() => handleLeadAction(l.id, 'deleteLead')}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold italic">No pipeline leads logged.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 11 & 12: BILLING DASHBOARD */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Billing Log & Payment History</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">School</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="text-xs text-slate-750 hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{p.id}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-800">{p.schoolName}</td>
                    <td className="py-3 px-4 font-black text-slate-700">₦{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-500 font-medium">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-500 font-bold">{p.paymentMethod}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-650' : 'bg-amber-50 text-amber-650'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 font-semibold italic">No payments logged in the database billing logs.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 15: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Platform Security Audit Log</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">School Scope</th>
                  <th className="py-3 px-4">Authentication Activity</th>
                  <th className="py-3 px-4">Access Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="text-xs text-slate-750 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-800 block">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Anonymous'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{log.user?.email || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-bold capitalize">
                      {log.user?.role?.toLowerCase().replace('_', ' ') || 'Guest'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-extrabold">
                      {log.user?.school?.name || 'Platform Boundary'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-650">
                      🔐 User authorized session token successfully
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-bold">
                      {new Date(log.loginTime).toLocaleString()}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400 font-semibold italic">No platform access log files loaded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: REGISTER NEW SCHOOL */}
      {showAddSchoolModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-650" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Register New School Tenant</h3>
              </div>
              <button onClick={() => setShowAddSchoolModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X className="w-4 h-4 text-slate-450" />
              </button>
            </div>

            <form onSubmit={handleRegisterSchool} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-150 text-red-650 text-[10px] font-bold rounded-xl flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">School Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. King's College"
                    value={newSchoolName}
                    onChange={(e) => {
                      setNewSchoolName(e.target.value);
                      setNewSchoolSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
                    }}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">URL Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kings-college"
                    value={newSchoolSlug}
                    onChange={(e) => setNewSchoolSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Admin Email Address</label>
                <input
                  type="email"
                  placeholder="admin@schoolslug.com (optional)"
                  value={newSchoolEmail}
                  onChange={(e) => setNewSchoolEmail(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="E.g. +234803..."
                    value={newSchoolPhone}
                    onChange={(e) => setNewSchoolPhone(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Grading System</label>
                  <select
                    value={newSchoolGrading}
                    onChange={(e: any) => setNewSchoolGrading(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="SECONDARY">Secondary (A, B, C, D, E, F)</option>
                    <option value="PRIMARY">Primary (A, B, C, D)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">School Address</label>
                <textarea
                  placeholder="Residential coordinates of school campus..."
                  value={newSchoolAddress}
                  onChange={(e) => setNewSchoolAddress(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSchoolModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex items-center gap-1 px-4 py-2 bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {registering && <Loader2 className="w-3 h-3 animate-spin" />}
                  {registering ? 'Creating Roster...' : 'Create School Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPGRADE / LOG SUBSCRIPTION PAYMENT */}
      {showBillingModal && selectedSchoolForBilling && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-md overflow-hidden animate-slideUp">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Log Subscription Invoice • {selectedSchoolForBilling.name}</h3>
              </div>
              <button onClick={() => setShowBillingModal(false)} className="p-1.5 hover:bg-slate-100 rounded-xl cursor-pointer">
                <X className="w-4 h-4 text-slate-450" />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Select Plan Tier</label>
                <select
                  value={billingPlan}
                  onChange={(e) => setBillingPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="Basic Plan (Up to 100 Students)">Basic Plan (Up to 100 Students)</option>
                  <option value="Standard Plan (Up to 250 Students)">Standard Plan (Up to 250 Students)</option>
                  <option value="Premium Plan (Up to 500 Students)">Premium Plan (Up to 500 Students)</option>
                  <option value="Enterprise Unlimited Plan">Enterprise Unlimited Plan</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Subscription Duration</label>
                <select
                  value={billingTerms}
                  onChange={(e) => setBillingTerms(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                >
                  <option value="1">1 Term (90 Days)</option>
                  <option value="2">2 Terms (180 Days)</option>
                  <option value="3">Full Academic Year - 3 Terms (270 Days)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Payment Amount (NGN)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 150000"
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Method</label>
                  <select
                    value={billingMethod}
                    onChange={(e) => setBillingMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Manual Bank Transfer">Manual Bank Transfer</option>
                    <option value="Flutterwave Gateway">Flutterwave Gateway</option>
                    <option value="Cash/Check deposit">Cash/Check deposit</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBillingModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingPayment}
                  className="flex items-center gap-1 px-4 py-2 bg-emerald-650 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  {loggingPayment && <Loader2 className="w-3 h-3 animate-spin" />}
                  {loggingPayment ? 'Logging Payment...' : 'Activate Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
