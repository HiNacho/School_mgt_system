'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  School, Plus, Shield, Users, FileSpreadsheet, CheckCircle, 
  AlertCircle, RefreshCw, Mail, Phone, MapPin, Sparkles, X, Check,
  Search, Lock, Calendar, DollarSign, LineChart, Activity, Eye, Settings, AlertTriangle, CreditCard, ArrowRightLeft, Trash2, Loader2
} from 'lucide-react';

interface SchoolTenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  gradingType: 'PRIMARY' | 'SECONDARY';
  createdAt: string;
  studentCount: number;
  staffCount: number;
  scoresRecorded: number;
  subscriptionPlan: string;
  subscriptionStatus: 'active' | 'trial' | 'expired' | 'suspended' | 'archived';
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  gracePeriodEnd: string | null;
  maxStudents?: number;
  totalRevenue: number;
  lastActive: string | null;
}

interface PaymentRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
}

interface UsageRecord {
  id: string;
  schoolId: string;
  schoolName: string;
  activityType: string;
  createdAt: string;
}

export default function SchoolTenantsPage() {
  const [tenants, setTenants] = useState<SchoolTenant[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageRecord[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'schools' | 'payments' | 'usage' | 'leads'>('schools');
  const [searchLeadQuery, setSearchLeadQuery] = useState('');
  const [resendingLeadId, setResendingLeadId] = useState<string | null>(null);
  
  // Registration Form State
  const [showRegModal, setShowRegModal] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gradingType, setGradingType] = useState<'PRIMARY' | 'SECONDARY'>('SECONDARY');
  const [registering, setRegistering] = useState(false);

  // Manual Subscription Billing Form State
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingSchool, setBillingSchool] = useState<SchoolTenant | null>(null);
  const [billingAmount, setBillingAmount] = useState('250000');
  const [billingMethod, setBillingMethod] = useState('Bank Transfer');
  const [billingPlan, setBillingPlan] = useState<string>('Tier 2 (Up to 250 Students)');
  const [billingStatus, setBillingStatus] = useState<'paid' | 'pending'>('paid');
  const [submittingBilling, setSubmittingBilling] = useState(false);

  // Detail Drawer State
  const [viewingTenant, setViewingTenant] = useState<SchoolTenant | null>(null);

  // Status feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadAllSaaSData();
  }, []);

  const getAuthHeaders = (contentType: string | null = 'application/json') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('report_auth_token') || '' : '';
    return {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const loadAllSaaSData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders(null);
      const [schoolsRes, paymentsRes, usageRes, leadsRes] = await Promise.all([
        fetch('/api/schools', { cache: 'no-store', headers }),
        fetch('/api/superadmin/payments', { cache: 'no-store', headers }),
        fetch('/api/superadmin/usage', { cache: 'no-store', headers }),
        fetch('/api/superadmin/leads', { cache: 'no-store', headers })
      ]);

      const schoolsJson = await schoolsRes.json();
      const paymentsJson = await paymentsRes.json();
      const usageJson = await usageRes.json();
      const leadsJson = await leadsRes.json();

      if (!schoolsRes.ok) throw new Error(schoolsJson.error || 'Failed to load school tenants');
      if (!paymentsRes.ok) throw new Error(paymentsJson.error || 'Failed to load payments logs');
      if (!usageRes.ok) throw new Error(usageJson.error || 'Failed to load usage telemetry');
      if (!leadsRes.ok) throw new Error(leadsJson.error || 'Failed to load registered leads');

      setTenants(schoolsJson.data || []);
      setPayments(paymentsJson.data || []);
      setUsageLogs(usageJson.data || []);
      setLeads(leadsJson.data || []);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error loading platform separation matrix databases');
    } finally {
      setLoading(false);
    }
  };

  const handleResendWelcomeEmail = async (lead: any) => {
    setResendingLeadId(lead.id);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      // Simulate network request/email sending delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      console.log(`
============================================================
📬 [RESEND AUTOMATED WELCOME EMAIL] DISPATCHED!
============================================================
To: ${lead.email}
Name: ${lead.name}
School Name: ${lead.schoolName}
Timestamp: ${new Date().toISOString()}
Subject: Welcome to NachoEd - Report Card Automation Onboarding!

Dear ${lead.name},

Here is your requested welcome email resend containing the default credentials to access and explore the NachoEd platform!

Use the link below to access the demo portals:
Demo Portal Link: http://localhost:3000/login

--------------------------------------------------
🔑 PLATFORM-WIDE SUPER ADMIN CREDENTIALS
--------------------------------------------------
Role: Super Admin
Username: superadmin
Email: superadmin@system.com
Password: password
(Accesses SaaS tenants, billing plans, and central lead registries)

--------------------------------------------------
🔑 GREENWOOD SECONDARY ACADEMY (DEMO SCHOOL TENANT)
--------------------------------------------------
1. SCHOOL ADMIN PORTAL:
   Username: schooladmin
   Email: admin@greenwood.com
   Password: password

2. CLASS TEACHER PORTAL:
   Username: classteacher
   Email: classteacher@greenwood.com
   Password: password

3. SUBJECT TEACHER PORTAL:
   Username: subjectteacher
   Email: subjectteacher@greenwood.com
   Password: password

4. PARENT PORTAL:
   Username: greenwood_parent
   Email: parent@greenwood.com
   Password: password

5. STUDENT PORTAL:
   Username: greenwood_student
   Email: student@greenwood.com
   Password: password

Please use these credentials to log in, test workflows, view class registries, input grades, and compile academic reports.

Best Regards,
The NachoEd Support Team
============================================================
`);
      
      setSuccessMsg(`Simulated welcome email successfully resent to ${lead.email}! Check server terminal logs.`);
    } catch (e: any) {
      setErrorMsg('Failed to resend automated welcome email.');
    } finally {
      setResendingLeadId(null);
    }
  };

  // Auto-generate URL slug from school name typing
  const handleNameChange = (name: string) => {
    setSchoolName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // remove special chars
      .replace(/\s+/g, '-'); // replace spaces with hyphens
    setSchoolSlug(generatedSlug);
  };

  const handleRegisterSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName || !schoolSlug) {
      setErrorMsg('School Name and URL Slug are required.');
      return;
    }

    setRegistering(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: schoolName,
          slug: schoolSlug,
          address,
          phone,
          email,
          gradingType,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to register school');

      // Write usage log trace
      await fetch('/api/superadmin/usage', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: json.data.id,
          activityType: 'School Tenant Initialized'
        })
      });

      setSuccessMsg(`School Tenant "${schoolName}" successfully initialized in SaaS registry! Default ${gradingType.toLowerCase()} grading rules and trial credentials provisioned.`);
      
      // Reset form & reload
      setSchoolName('');
      setSchoolSlug('');
      setAddress('');
      setPhone('');
      setEmail('');
      setGradingType('SECONDARY');
      setShowRegModal(false);
      
      await loadAllSaaSData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error registering tenant');
    } finally {
      setRegistering(false);
    }
  };

  const handleManualBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingSchool) return;

    setSubmittingBilling(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: billingSchool.id,
          amount: billingAmount,
          paymentMethod: billingMethod,
          status: billingStatus,
          planSelected: billingPlan
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit billing log');

      // Write usage log trace
      await fetch('/api/superadmin/usage', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: billingSchool.id,
          activityType: `Manual Payment Logged: ₦${parseFloat(billingAmount).toLocaleString()} (${billingPlan})`
        })
      });

      setSuccessMsg(`Manuel subscription payment logged successfully! school subscription updated to active standard.`);
      setShowBillingModal(false);
      setBillingSchool(null);
      await loadAllSaaSData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error logging manual billing');
    } finally {
      setSubmittingBilling(false);
    }
  };

  const handleResetAdminPassword = async (tenant: SchoolTenant) => {
    if (!window.confirm(`Are you sure you want to reset the admin password for "${tenant.name}"? The password will be reset to "password".`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/actions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'reset_admin_password',
          schoolId: tenant.id
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to execute reset action');

      setSuccessMsg(json.message || 'Admin password reset executed successfully!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resetting password');
    }
  };

  const handleToggleSuspension = async (tenant: SchoolTenant) => {
    const isSuspended = tenant.subscriptionStatus === 'suspended';
    const nextStatus = isSuspended ? 'active' : 'suspended';
    
    if (!window.confirm(`Are you sure you want to set subscription status to "${nextStatus}" for "${tenant.name}"?`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/schools', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: tenant.id,
          subscriptionStatus: nextStatus
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      // Log usage trace
      await fetch('/api/superadmin/usage', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: tenant.id,
          activityType: `Subscription Status Updated: ${nextStatus.toUpperCase()}`
        })
      });

      setSuccessMsg(`School tenant suspension toggle updated successfully!`);
      await loadAllSaaSData();
      if (viewingTenant && viewingTenant.id === tenant.id) {
        setViewingTenant({ ...viewingTenant, subscriptionStatus: nextStatus });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error toggling school status');
    }
  };

  const handleArchiveSchool = async (tenant: SchoolTenant) => {
    if (!window.confirm(`Are you sure you want to archive "${tenant.name}"? This restricts active write access to all features.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/schools', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          schoolId: tenant.id,
          subscriptionStatus: 'archived'
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to archive school');

      setSuccessMsg(`School tenant successfully archived!`);
      await loadAllSaaSData();
      if (viewingTenant && viewingTenant.id === tenant.id) {
        setViewingTenant({ ...viewingTenant, subscriptionStatus: 'archived' });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error archiving school tenant');
    }
  };

  const handleDeleteSchool = async (tenant: SchoolTenant) => {
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete school "${tenant.name}"? This will erase all student data, grades, staff accounts, term setups, and scores. This operation is irreversible!`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/schools?schoolId=${tenant.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(null)
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete school tenant');

      setSuccessMsg(`School tenant "${tenant.name}" and all associated data have been permanently deleted.`);
      await loadAllSaaSData();
      if (viewingTenant && viewingTenant.id === tenant.id) {
        setViewingTenant(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting school tenant');
    }
  };

  const handleImpersonate = async (tenant: SchoolTenant) => {
    try {
      const res = await fetch('/api/superadmin/actions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'get_impersonation_session',
          schoolId: tenant.id
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch impersonation credentials');

      // Backup current super admin session & token
      const currentSession = localStorage.getItem('report_user_session');
      const currentToken = localStorage.getItem('report_auth_token');
      
      // Log usage trace using Super Admin credentials before they are overwritten
      try {
        await fetch('/api/superadmin/usage', {
          method: 'POST',
          headers: getAuthHeaders(), // reads Super Admin token
          body: JSON.stringify({
            schoolId: tenant.id,
            activityType: 'Super Admin Impersonation Session Active'
          })
        });
      } catch (usageErr) {
        console.error('Failed to log impersonation audit trace', usageErr);
      }

      if (currentSession) {
        localStorage.setItem('report_super_session_backup', currentSession);
      }
      if (currentToken) {
        localStorage.setItem('report_super_token_backup', currentToken);
      }

      // Overwrite with school admin session
      localStorage.setItem('report_user_session', JSON.stringify({
        user: json.data.user,
        school: json.data.school
      }));

      // Set auth token in localStorage and cookie
      localStorage.setItem('report_auth_token', json.data.token);
      document.cookie = `report_auth_token=${json.data.token}; path=/; max-age=3600; SameSite=Lax`;

      // Redirect and reload to reflect new session boundary
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.message || 'Error executing support impersonation');
    }
  };

  // SaaS aggregated statistics
  const totalStudents = tenants.reduce((acc, t) => acc + t.studentCount, 0);
  const totalStaff = tenants.reduce((acc, t) => acc + t.staffCount, 0);
  const totalScores = tenants.reduce((acc, t) => acc + t.scoresRecorded, 0);
  const totalRevenueVal = tenants.reduce((acc, t) => acc + t.totalRevenue, 0);
  const activeCount = tenants.filter(t => t.subscriptionStatus === 'active' || t.subscriptionStatus === 'trial').length;
  const expiredCount = tenants.filter(t => t.subscriptionStatus === 'expired').length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-600 border-green-100';
      case 'trial':
        return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'expired':
        return 'bg-red-50 text-red-500 border-red-100';
      case 'suspended':
        return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'archived':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const getDaysRemaining = (expiryStr: string | null) => {
    if (!expiryStr) return null;
    const diff = new Date(expiryStr).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Page Header Welcome Card */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">NachoEd Global Platform</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            SaaS School <span className="text-emerald-500 serif-italic font-normal">Tenant Registry</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Super Administrator console to deploy, isolate, monitor, and scale multi-tenant school academic engines.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRegModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/10 cursor-pointer w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Register New Tenant
        </button>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-150 text-green-600 text-xs flex items-center justify-between font-bold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-150 text-red-650 text-xs flex items-center justify-between font-bold shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 animate-bounce" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {/* Business Stat Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total/Active Schools */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total / Active</span>
            <School className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-800">{tenants.length}</span>
            <span className="text-xs font-bold text-emerald-500">/ {activeCount} Live</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${tenants.length ? (activeCount / tenants.length) * 100 : 0}%` }} />
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Registered Leads</span>
            <Mail className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-800">{leads.length}</span>
            <span className="text-xs font-bold text-slate-450">Leads</span>
          </div>
          <div className="h-1 w-full bg-purple-100/50 rounded-full" />
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-855 text-slate-800">₦{(totalRevenueVal / 1000000).toFixed(2)}M</span>
          </div>
          <div className="h-1 w-full bg-sky-100/50 rounded-full" />
        </div>

        {/* Enrollment */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Wards Enrollment</span>
            <Users className="w-4 h-4 text-indigo-650" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-800">{totalStudents}</span>
          </div>
          <div className="h-1 w-full bg-indigo-100/50 rounded-full" />
        </div>

        {/* Expired / Closed */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-2 col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inactive / Closed</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-extrabold text-slate-800">{expiredCount + tenants.filter(t=>t.subscriptionStatus==='suspended').length}</span>
          </div>
          <div className="h-1 w-full bg-amber-100/50 rounded-full" />
        </div>
      </div>

      {/* Tabs navigation block */}
      <div className="flex border-b border-slate-200 gap-6 w-full">
        <button
          type="button"
          onClick={() => setActiveTab('schools')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'schools' 
              ? 'border-emerald-600 text-emerald-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <School className="w-3.5 h-3.5" /> Schools Registry
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leads')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'leads' 
              ? 'border-emerald-600 text-emerald-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Mail className="w-3.5 h-3.5" /> Lead Registrations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'payments' 
              ? 'border-emerald-600 text-emerald-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" /> Payments Ledger
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('usage')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'usage' 
              ? 'border-emerald-600 text-emerald-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-650'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> Telemetry Logs
        </button>
      </div>

      {/* Loading fallback */}
      {loading ? (
        <div className="h-80 flex items-center justify-center bg-white border border-slate-200/80 rounded-3xl shadow-sm">
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-450 text-xs font-semibold">Accessing central telemetry registry...</p>
          </div>
        </div>
      ) : (
        <>
          {/* TAB 1: SCHOOLS REGISTRY COCKPIT */}
          {activeTab === 'schools' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" /> Active SaaS Tenant Isolations
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Grace period: 14 days</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
                <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4">School Details</th>
                      <th className="p-4">Billing Plan</th>
                      <th className="p-4 text-center">Enrollment</th>
                      <th className="p-4">Access Status</th>
                      <th className="p-4">Subscription End</th>
                      <th className="p-4 text-center">Telemetry</th>
                      <th className="p-4 text-center">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {tenants.map((row) => {
                      const daysLeft = getDaysRemaining(row.subscriptionEnd);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/40 transition-colors">
                          {/* Name & Contact */}
                          <td className="p-4 space-y-1">
                            <span className="font-extrabold text-sm text-slate-850 block">
                              {row.name}
                            </span>
                            <span className="font-mono text-[9px] bg-slate-50 text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md w-fit block shadow-sm">
                              /{row.slug}
                            </span>
                          </td>

                          {/* Billing Plan */}
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase ${
                              row.subscriptionPlan === 'Premium' 
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                : row.subscriptionPlan === 'Standard'
                                ? 'bg-sky-50 text-sky-600 border-sky-100'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {row.subscriptionPlan} Plan
                            </span>
                          </td>

                          {/* Enrollment counts */}
                          <td className="p-4 text-center space-y-0.5">
                            <span className={`font-extrabold text-xs block font-mono ${
                              row.maxStudents && row.studentCount >= row.maxStudents 
                                ? 'text-red-500 font-black' 
                                : row.maxStudents && row.studentCount >= row.maxStudents * 0.9 
                                ? 'text-amber-500' 
                                : 'text-slate-800'
                            }`}>
                              {row.studentCount} / {row.maxStudents || 100}
                            </span>
                            <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">{row.staffCount} staff</span>
                          </td>

                          {/* Access Status */}
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-wider ${getStatusStyle(row.subscriptionStatus)}`}>
                              {row.subscriptionStatus}
                            </span>
                          </td>

                          {/* Expiry end */}
                          <td className="p-4 space-y-0.5 font-mono">
                            <span className="text-xs text-slate-700 font-extrabold block">
                              {row.subscriptionEnd ? new Date(row.subscriptionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            </span>
                            {(row.subscriptionStatus === 'active' || row.subscriptionStatus === 'trial') && daysLeft !== null && (
                              <span className={`block text-[9px] font-black uppercase ${daysLeft <= 30 ? 'text-red-500 animate-pulse' : 'text-emerald-600'}`}>
                                {daysLeft <= 0 ? 'Expired' : `${daysLeft} days remaining`}
                              </span>
                            )}
                          </td>

                          {/* Telemetry metrics */}
                          <td className="p-4 text-center font-mono">
                            <span className="text-[10px] text-slate-500 font-extrabold block">Recorded: <strong>{row.scoresRecorded}</strong></span>
                            <span className="text-[8px] text-slate-400 font-bold block uppercase mt-0.5">
                              {row.lastActive ? `Active: ${new Date(row.lastActive).toLocaleDateString()}` : 'No activity logged'}
                            </span>
                          </td>

                          {/* Operations */}
                          <td className="p-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setViewingTenant(row)}
                                title="View School Profile Card"
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBillingSchool(row);
                                  setBillingPlan(row.subscriptionPlan);
                                  setShowBillingModal(true);
                                }}
                                title="Activate/Renew subscription"
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-emerald-600 cursor-pointer transition-colors"
                              >
                                <CreditCard className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSuspension(row)}
                                title={row.subscriptionStatus === 'suspended' ? 'Reactivate Tenant' : 'Suspend Tenant'}
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-amber-500 cursor-pointer transition-colors"
                              >
                                <Lock className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResetAdminPassword(row)}
                                title="Reset Admin Password"
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleImpersonate(row)}
                                title="Impersonate School Administrator"
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors"
                              >
                                <ArrowRightLeft className="w-4 h-4 text-emerald-650" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSchool(row)}
                                title="Permanently Delete School Tenant"
                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENTS TELEMETRY */}
          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" /> platform manual billing database
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Track historical payments, cash deposits and manual bank transfers</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
                <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4">Payment ID Reference</th>
                      <th className="p-4">School Tenant</th>
                      <th className="p-4">Manual Amount</th>
                      <th className="p-4 text-center">Payment Method</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Transaction Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 font-bold italic">No manual billing records logged in the central ledger.</td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/40">
                          <td className="p-4 font-mono text-[9px] text-slate-400 uppercase">#{p.id.split('-')[0]}</td>
                          <td className="p-4 text-slate-800 font-extrabold">{p.schoolName}</td>
                          <td className="p-4 font-mono text-xs text-slate-800 font-black">₦{p.amount.toLocaleString()}</td>
                          <td className="p-4 text-center text-slate-500 uppercase text-[10px]">{p.paymentMethod}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wide border ${
                              p.status === 'paid'
                                ? 'bg-green-50 text-green-600 border-green-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-4 text-[10px] text-slate-400 font-mono">
                            {new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY ENGAGEMENT LOGS */}
          {activeTab === 'usage' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" /> platform activity & telemetry dashboard
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Monitor active school logins, grading reports generation and support traces</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm">
                <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4">Telemetry Reference</th>
                      <th className="p-4">School Tenant</th>
                      <th className="p-4">Logged Operation / Activity</th>
                      <th className="p-4">Trigger Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    {usageLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400 font-bold italic">No platform usage logs recorded.</td>
                      </tr>
                    ) : (
                      usageLogs.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/40">
                          <td className="p-4 font-mono text-[9px] text-slate-400 uppercase">#{l.id.split('-')[0]}</td>
                          <td className="p-4 text-slate-800 font-extrabold">{l.schoolName}</td>
                          <td className="p-4">
                            <span className="text-slate-700 font-bold text-xs">{l.activityType}</span>
                          </td>
                          <td className="p-4 text-[10px] text-slate-400 font-mono">
                            {new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEADS REGISTRATIONS */}
          {activeTab === 'leads' && (
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm p-8 text-center space-y-6 max-w-xl mx-auto my-6 animate-fadeIn">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black uppercase tracking-wider text-slate-800">Upgraded Leads CRM Cockpit</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  We have upgraded the lead registry system to a comprehensive CRM Funnel. You can now track active sandbox usage logs, monitor real-time heartbeats, read tester feedback, and perform one-click activations.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard/tenants/leads"
                  className="px-6 py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md inline-flex items-center gap-2"
                >
                  <span>Open Leads CRM Funnel</span>
                  <ArrowRightLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* DETAIL DRAWER / MODAL COCKPIT */}
      {viewingTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-150 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative animate-fadeIn text-left">
            <button
              type="button"
              onClick={() => setViewingTenant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center font-black text-sm border border-slate-200">
                  {viewingTenant.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-850">{viewingTenant.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SaaS Isolation Profile Card</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2.5 text-xs font-semibold text-slate-500">
                <p className="flex justify-between"><span className="text-slate-400">Unique URL Prefix:</span> <strong className="text-emerald-650 font-mono bg-slate-50 px-2 py-0.5 rounded border">/{viewingTenant.slug}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400">Grading Section Scale:</span> <strong className="text-slate-700 uppercase">{viewingTenant.gradingType} Rules</strong></p>
                <p className="flex justify-between"><span className="text-slate-400">Billing Plan:</span> <strong className="text-slate-700 uppercase font-mono">{viewingTenant.subscriptionPlan}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400">Access Status:</span> <strong className={`uppercase ${viewingTenant.subscriptionStatus === 'active' ? 'text-green-600' : 'text-red-500'}`}>{viewingTenant.subscriptionStatus}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400">Subscription End:</span> <strong className="text-slate-700">{viewingTenant.subscriptionEnd ? new Date(viewingTenant.subscriptionEnd).toLocaleDateString() : 'N/A'}</strong></p>
                <p className="flex justify-between"><span className="text-slate-400">Grace Expiry:</span> <strong className="text-slate-700">{viewingTenant.gracePeriodEnd ? new Date(viewingTenant.gracePeriodEnd).toLocaleDateString() : 'N/A'}</strong></p>
                <div className="flex justify-between items-center bg-slate-50/70 p-2 rounded-xl border border-slate-100 mt-1">
                  <span className="text-slate-400">Capacity Limit:</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-center font-extrabold font-mono text-xs focus:outline-none focus:border-slate-400 text-slate-850"
                      defaultValue={viewingTenant.maxStudents || 100}
                      id={`max-capacity-${viewingTenant.id}`}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const inputEl = document.getElementById(`max-capacity-${viewingTenant.id}`) as HTMLInputElement;
                        if (!inputEl) return;
                        const newCapacity = parseInt(inputEl.value, 10);
                        if (isNaN(newCapacity) || newCapacity < 1) {
                          alert('Please enter a valid capacity number >= 1');
                          return;
                        }
                        try {
                          const res = await fetch('/api/schools', {
                            method: 'PATCH',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({
                              schoolId: viewingTenant.id,
                              maxStudents: newCapacity
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert('Capacity limit updated successfully!');
                            setTenants(prev => prev.map(t => t.id === viewingTenant.id ? { ...t, maxStudents: newCapacity } : t));
                            setViewingTenant(prev => prev ? { ...prev, maxStudents: newCapacity } : null);
                          } else {
                            alert(data.error || 'Failed to update capacity limit');
                          }
                        } catch (err: any) {
                          alert(err.message || 'An error occurred while updating limit');
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Demographics Enrollment Summary</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Wards</span>
                    <strong className="text-sm font-extrabold text-slate-800 font-mono">{viewingTenant.studentCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Staff</span>
                    <strong className="text-sm font-extrabold text-slate-800 font-mono">{viewingTenant.staffCount}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Scores</span>
                    <strong className="text-sm font-extrabold text-slate-800 font-mono">{viewingTenant.scoresRecorded}</strong>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setViewingTenant(null);
                    setBillingSchool(viewingTenant);
                    setBillingPlan(viewingTenant.subscriptionPlan);
                    setShowBillingModal(true);
                  }}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 cursor-pointer shadow-sm"
                >
                  Log Sub Payment
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSuspension(viewingTenant)}
                  className="py-2 px-4 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {viewingTenant.subscriptionStatus === 'suspended' ? 'Reactivate Subscription' : 'Suspend Account'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSchool(viewingTenant)}
                  className="py-2 px-4 rounded-xl text-xs font-black bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 cursor-pointer"
                >
                  Delete Tenant
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTenant(null)}
                  className="py-2 px-4 rounded-xl text-xs font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER SCHOOL TENANT MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col text-left">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" /> Register New School Tenant
              </h3>
              <button 
                type="button" 
                onClick={() => setShowRegModal(false)}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-650 border border-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterSchool} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">School Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greenwood Academy, Lagos"
                  value={schoolName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 transition-colors font-semibold hover:border-slate-250"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Unique URL Prefix Slug (Auto-Generated)</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <span className="bg-slate-50 px-3 py-2.5 text-slate-400 border-r border-slate-200 font-mono select-none font-bold">/</span>
                  <input
                    type="text"
                    required
                    placeholder="greenwood-academy"
                    value={schoolSlug}
                    onChange={(e) => setSchoolSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    className="flex-1 bg-white text-emerald-600 font-mono focus:outline-none py-2.5 text-xs px-3 focus:border-slate-350 transition-colors font-bold"
                  />
                </div>
                <span className="block text-[9px] text-slate-400 mt-1 font-mono font-medium">This URL slug dictates their separate SaaS context subdomain.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Phone Contact</label>
                  <input
                    type="text"
                    placeholder="+234 803 000 0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 font-semibold hover:border-slate-250"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Contact</label>
                  <input
                    type="email"
                    placeholder="info@school.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 font-semibold hover:border-slate-250"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">School Physical Location</label>
                <input
                  type="text"
                  placeholder="Lekki Phase 1, Lagos, Nigeria"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 font-semibold hover:border-slate-250"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Grading Scale Rules</label>
                <select
                  value={gradingType}
                  onChange={(e) => setGradingType(e.target.value as 'PRIMARY' | 'SECONDARY')}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold hover:border-slate-250 transition-colors cursor-pointer"
                >
                  <option value="SECONDARY">SECONDARY (A1, B2, B3, C4, C5, C6, D7, E8, F9)</option>
                  <option value="PRIMARY">PRIMARY (A, B, C, D)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowRegModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {registering ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Initialize School
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL SUBSCRIPTION PAYMENT LOGGING MODAL */}
      {showBillingModal && billingSchool && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col text-left">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Log School Manual Billing Payment
              </h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowBillingModal(false);
                  setBillingSchool(null);
                }}
                className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualBillingSubmit} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">School Tenant</label>
                <input
                  type="text"
                  disabled
                  value={billingSchool.name}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Billing Cycle Plan</label>
                  <select
                    value={billingPlan}
                    onChange={(e) => setBillingPlan(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    <option value="Tier 1 (Up to 100 Students)">Tier 1 (Up to 100 Students)</option>
                    <option value="Tier 2 (Up to 250 Students)">Tier 2 (Up to 250 Students)</option>
                    <option value="Tier 3 (Up to 500 Students)">Tier 3 (Up to 500 Students)</option>
                    <option value="Tier 4 (Unlimited Students)">Tier 4 (Unlimited Students)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Billing Amount (₦)</label>
                  <input
                    type="number"
                    required
                    value={billingAmount}
                    onChange={(e) => setBillingAmount(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 font-bold hover:border-slate-250 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Payment Method</label>
                  <select
                    value={billingMethod}
                    onChange={(e) => setBillingMethod(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    <option value="Bank Transfer">Bank Transfer (Manual)</option>
                    <option value="Cash Deposit">Cash Deposit (Manual)</option>
                    <option value="Card Online">Card Online (Gateway)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Log Status</label>
                  <select
                    value={billingStatus}
                    onChange={(e) => setBillingStatus(e.target.value as 'paid' | 'pending')}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold transition-colors cursor-pointer"
                  >
                    <option value="paid">PAID (Instantly Activate)</option>
                    <option value="pending">PENDING (Admin Review)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 text-blue-800 text-[10px] rounded-2xl flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Automated Action:</strong> Selecting "PAID" status transactionally activates standard yearly subscription (365 days) and sets school status to active.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowBillingModal(false);
                    setBillingSchool(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBilling}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {submittingBilling && <RefreshCw className="w-4 h-4 animate-spin" />}
                  {submittingBilling ? 'Logging...' : 'Confirm Manual Payment'}
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
