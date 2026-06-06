'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, School, Key, ArrowRight, UserCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [demoTeachers, setDemoTeachers] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  // Clear session storage on mount
  useEffect(() => {
    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
  }, []);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await fetch('/api/schools', { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.data) {
          setSchools(json.data);
          if (json.data.length > 0) {
            const hasGreenwood = json.data.some((s: any) => s.slug === 'greenwood-secondary');
            setSelectedSchool(hasGreenwood ? 'greenwood-secondary' : json.data[0].slug);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    const fetchDemoTeachers = async () => {
      if (!selectedSchool || schools.length === 0) return;
      try {
        const school = schools.find((s: any) => s.slug === selectedSchool);
        if (school) {
          const staffRes = await fetch(`/api/staff?schoolId=${school.id}`, { cache: 'no-store' });
          const staffJson = await staffRes.json();
          if (staffRes.ok && staffJson.data) {
            const teachers = staffJson.data.filter((s: any) => 
              ['CLASS_TEACHER', 'SUBJECT_TEACHER', 'HEAD_TEACHER'].includes(s.role) && s.status === 'ACTIVE'
            );
            setDemoTeachers(teachers);
            return;
          }
        }
        setDemoTeachers([]);
      } catch (e) {
        console.error(e);
        setDemoTeachers([]);
      }
    };
    fetchDemoTeachers();
  }, [selectedSchool, schools]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    await loginRequest({ email, password });
  };

  const handleDemoBypass = async (role: string) => {
    await loginRequest({ bypassRole: role, schoolSlug: selectedSchool });
  };

  const loginRequest = async (payload: any) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'Authentication failed');
      }

      setSuccess(true);
      
      // Store token and user data
      localStorage.setItem('report_auth_token', resData.token);
      localStorage.setItem('report_user_session', JSON.stringify({
        user: resData.user,
        school: resData.school
      }));

      // Short delay for micro-animation success visual
      setTimeout(() => {
        router.push('/dashboard');
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Server connection timed out');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-950/20 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Hand: Product Vision Card */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Shield className="w-6 h-6 animate-pulse" />
              </div>
              <span className="font-bold text-xl tracking-wide bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
                RESULT ENGINE
              </span>
            </div>
            
            <h1 className="text-3xl font-extrabold leading-tight text-white mb-4">
              A Modern Operating System for Academic Management.
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Empowering administrators and teachers to convert weeks of tedious compilation, class rankings, and report card generations into a single click. Optimized for low-bandwidth environments.
            </p>
          </div>

          <div className="space-y-4 border-t border-slate-800/80 pt-6">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong>Multi-Tenant Isolation</strong>: Securely houses unlimited schools with isolated PostgreSQL schemas.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong>Configurable Grading Rules</strong>: Secondary section (A1-F9 scales) & Primary section (A-D scales) isolated per school.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300">
                <strong>Offline-First Scoresheet</strong>: Interactive spreadsheet interface persists in IndexedDB on local connection dropouts.
              </p>
            </div>
          </div>
        </div>

        {/* Right Hand: Actionable Login Panel */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Step 1: School Tenant Selector */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5" /> 1. Select School Tenant (School-id boundary)
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-1">
              {schools.map((school) => {
                const isSelected = selectedSchool === school.slug;
                const isSchoolGreenwood = school.slug === 'greenwood-secondary';
                return (
                  <button
                    key={school.id}
                    type="button"
                    onClick={() => setSelectedSchool(school.slug)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? isSchoolGreenwood
                          ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5'
                          : 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      isSelected
                        ? isSchoolGreenwood
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-indigo-500/20 text-indigo-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {school.logoUrl ? (
                        <img src={school.logoUrl} alt="School Crest" className="w-5 h-5 rounded object-cover bg-white" />
                      ) : (
                        <School className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold truncate" title={school.name}>{school.name}</h4>
                      <span className={`text-[10px] uppercase font-bold block ${
                        isSchoolGreenwood ? 'text-emerald-500/80' : 'text-indigo-500/80'
                      }`}>
                        {school.gradingType === 'SECONDARY' ? 'Secondary (A1-F9)' : 'Primary (A-D)'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form & One-Click Panel */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md relative">
            
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Login successful! Injecting JWT and initializing dashboard...</span>
              </div>
            )}

            <div className="p-3.5 mb-5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Tip:</strong> Any newly registered or imported staff/teacher can log in using their email address and the default password: <code className="bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded font-mono font-bold">password</code>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@greenwood.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600"
                    disabled={loading}
                  />
                  <Key className="absolute right-4 top-3.5 w-4 h-4 text-slate-600" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm transition-all flex justify-center items-center gap-2 ${
                  selectedSchool === 'greenwood-secondary'
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10'
                    : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/10'
                }`}
              >
                {loading ? 'Verifying Records...' : 'Access Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* One-Click Role Bypass Panel */}
            <div className="border-t border-slate-800 pt-5">
              <div className="flex items-center justify-between mb-4">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-bounce" /> 2. One-Click Demo Access Shortcuts (Bypass credentials)
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoBypass('SUPER_ADMIN')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">Super Admin</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Multi-School</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoBypass('SCHOOL_ADMIN')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">School Admin</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Principal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoBypass('CLASS_TEACHER')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">Class Teacher</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">JSS 1A Arm</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoBypass('SUBJECT_TEACHER')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">Subject Teacher</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Maths Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoBypass('PARENT')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-pink-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">Parent View</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">Child Stats</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoBypass('STUDENT')}
                  className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-center transition-all group"
                >
                  <UserCheck className="w-4 h-4 mx-auto text-violet-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="block text-[10px] font-bold text-slate-200">Student View</span>
                  <span className="block text-[8px] text-slate-500 uppercase font-semibold">My Grades</span>
                </button>
              </div>

              {demoTeachers.length > 0 && (
                <div className="mt-4 space-y-1.5 text-left">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ⚡ Quick-Access Specific Registered Teacher
                  </label>
                  <select
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (!val) return;
                      setEmail(val);
                      setPassword('password');
                      await loginRequest({ email: val, password: 'password' });
                    }}
                    value=""
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-slate-250 text-xs font-bold focus:outline-none focus:border-slate-700 cursor-pointer"
                  >
                    <option value="" disabled>-- Select a registered teacher to login --</option>
                    {demoTeachers.map((t) => (
                      <option key={t.id} value={t.email}>
                        {t.lastName} {t.firstName} ({t.role.replace('_', ' ')}) — {t.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
