'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  School, 
  Key, 
  ArrowRight, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Users, 
  Award, 
  BookOpen, 
  Heart, 
  GraduationCap, 
  ArrowLeft, 
  Loader2, 
  User,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Demo Persona States
  const [loginMode, setLoginMode] = useState<'demo' | 'standard'>('demo');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [step, setStep] = useState<'role' | 'school' | 'user'>('role');
  const [selectedSchoolObj, setSelectedSchoolObj] = useState<any | null>(null);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Clear session storage on mount
  useEffect(() => {
    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
    document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    await loginRequest({ email, password });
  };

  const handleDemoBypass = async (role: string) => {
    await loginRequest({ bypassRole: role, schoolSlug: selectedSchoolObj?.slug || selectedSchool });
  };

  const fetchDemoUsers = async (role: string, school: any) => {
    setLoadingUsers(true);
    setDemoUsers([]);
    setError('');

    try {
      const res = await fetch(`/api/auth/demo-users?schoolId=${school.id}&role=${role}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.data) {
        setDemoUsers(json.data);
      } else {
        throw new Error(json.error || `Failed to load demo accounts for ${role}`);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Could not fetch demo accounts for this school.');
    } finally {
      setLoadingUsers(false);
    }
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
      document.cookie = `report_auth_token=${resData.token}; path=/; max-age=3600; SameSite=Lax`;

      // Short delay for micro-animation success visual
      setTimeout(() => {
        if (resData.user?.isFirstLogin) {
          router.push('/login/change-password');
        } else {
          window.location.href = '/dashboard';
        }
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Server connection timed out');
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'SUPER_ADMIN',
      name: 'Super Admin',
      description: 'System-wide owner. View all schools and manage platform settings.',
      icon: Shield,
      color: 'emerald',
      bgClass: 'hover:border-emerald-500/50 hover:bg-emerald-500/5 hover:shadow-emerald-500/10 text-emerald-400',
    },
    {
      id: 'SCHOOL_ADMIN',
      name: 'School Admin',
      description: 'Principal/Owner. Oversee classes, teachers, student rosters, grading scales.',
      icon: Award,
      color: 'sky',
      bgClass: 'hover:border-sky-500/50 hover:bg-sky-500/5 hover:shadow-sky-500/10 text-sky-400',
    },
    {
      id: 'CLASS_TEACHER',
      name: 'Class Teacher',
      description: 'Manage classroom roster, mark attendance, and add remarks.',
      icon: Users,
      color: 'indigo',
      bgClass: 'hover:border-indigo-500/50 hover:bg-indigo-500/5 hover:shadow-indigo-500/10 text-indigo-400',
    },
    {
      id: 'SUBJECT_TEACHER',
      name: 'Subject Teacher',
      description: 'Input subject marks, calculate totals/grades via offline gradesheets.',
      icon: BookOpen,
      color: 'amber',
      bgClass: 'hover:border-amber-500/50 hover:bg-amber-500/5 hover:shadow-amber-500/10 text-amber-400',
    },
    {
      id: 'PARENT',
      name: 'Parent View',
      description: 'Evaluate student scorecards, track attendance, and download reports.',
      icon: Heart,
      color: 'pink',
      bgClass: 'hover:border-pink-500/50 hover:bg-pink-500/5 hover:shadow-pink-500/10 text-pink-400',
    },
    {
      id: 'STUDENT',
      name: 'Student View',
      description: 'View academic grades, print reports, view school events/notices.',
      icon: GraduationCap,
      color: 'violet',
      bgClass: 'hover:border-violet-500/50 hover:bg-violet-500/5 hover:shadow-violet-500/10 text-violet-400',
    },
  ];

  const getRoleDetails = (roleId: string) => {
    return roles.find(r => r.id === roleId);
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
        <div className="lg:col-span-7 flex flex-col justify-center">
          
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-slate-800/10 blur-3xl pointer-events-none" />
            
            {/* Alert/Status Indicators */}
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Login successful! Redirecting to dashboard...</span>
              </div>
            )}

            {loginMode === 'demo' ? (
              <div>
                {/* STEP 1: ROLE SELECTION */}
                {step === 'role' && (
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Interactive Evaluation Portal</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Who are you logging in as?</h2>
                      <p className="text-slate-400 text-xs">
                        Select a persona below to explore user-specific workflows and dashboards instantly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {roles.map((role) => {
                        const IconComponent = role.icon;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={async () => {
                              if (role.id === 'SUPER_ADMIN') {
                                // Super Admin logs in immediately
                                await handleDemoBypass('SUPER_ADMIN');
                              } else {
                                setSelectedRole(role.id);
                                setStep('school');
                              }
                            }}
                            className={`flex flex-col items-start p-4 rounded-2xl border border-slate-800 bg-slate-950/40 text-left transition-all duration-200 group outline-none ${role.bgClass}`}
                            disabled={loading}
                          >
                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 mb-3 group-hover:scale-105 transition-transform">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                              {role.name}
                            </h3>
                            <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">
                              {role.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-800/60 pt-5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setLoginMode('standard');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Standard Credentials Login (Email/Password)
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: SCHOOL SELECTION */}
                {step === 'school' && selectedRole && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('role');
                          setSelectedRole(null);
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-bold text-white">Select School Context</h2>
                        <p className="text-slate-400 text-[11px]">
                          Choose a school boundary to load accounts for: <strong className="text-slate-200">{getRoleDetails(selectedRole)?.name}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {schools.map((school) => {
                        const isSelected = selectedSchoolObj?.id === school.id;
                        const isSchoolGreenwood = school.slug === 'greenwood-secondary';
                        return (
                          <button
                            key={school.id}
                            type="button"
                            onClick={() => {
                              setSelectedSchoolObj(school);
                              setStep('user');
                              fetchDemoUsers(selectedRole, school);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                              isSelected
                                ? isSchoolGreenwood
                                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5'
                                  : 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900/30'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                isSchoolGreenwood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                              }`}>
                                {school.logoUrl ? (
                                  <img src={school.logoUrl} alt="School Crest" className="w-5 h-5 rounded object-cover bg-white" />
                                ) : (
                                  <School className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-100 truncate">{school.name}</h4>
                                <span className={`text-[9px] uppercase font-bold tracking-wider block mt-0.5 ${
                                  isSchoolGreenwood ? 'text-emerald-400' : 'text-indigo-400'
                                }`}>
                                  {school.gradingType === 'SECONDARY' ? 'Secondary Scale (A1 - F9)' : 'Primary Scale (A - D)'}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 3: USER PROFILE SELECTION */}
                {step === 'user' && selectedRole && selectedSchoolObj && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStep('school');
                          setSelectedSchoolObj(null);
                        }}
                        className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
                        disabled={loading}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-bold text-white">Select Demo User</h2>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Click any active <strong className="text-slate-200">{getRoleDetails(selectedRole)?.name}</strong> profile in <strong className="text-slate-200">{selectedSchoolObj.name}</strong> to login:
                        </p>
                      </div>
                    </div>

                    {loadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                        <span className="text-slate-500 text-xs">Querying database school context...</span>
                      </div>
                    ) : demoUsers.length === 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2 leading-relaxed">
                          <p className="font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            No active {getRoleDetails(selectedRole)?.name} profiles found!
                          </p>
                          <p>
                            We couldn't find any {getRoleDetails(selectedRole)?.name} records registered in {selectedSchoolObj.name} yet.
                          </p>
                          <p className="opacity-90">
                            💡 <strong>Recommendation:</strong> Log in as the School Admin first to add or import staff/students for this tenant.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRole('SCHOOL_ADMIN');
                              setStep('user');
                              fetchDemoUsers('SCHOOL_ADMIN', selectedSchoolObj);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-100 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition-colors"
                          >
                            Log in as School Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStep('school');
                              setSelectedSchoolObj(null);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-850 transition-colors"
                          >
                            Choose Another School
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {demoUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={async () => {
                              await loginRequest({ email: user.email, password: 'password' });
                            }}
                            disabled={loading}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-800/80 bg-slate-950 hover:bg-slate-900 hover:border-slate-700 text-left transition-all duration-150 outline-none group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:border-slate-700 transition-colors">
                                {user.passportPhoto ? (
                                  <img src={user.passportPhoto} alt="User Passport" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-white truncate">
                                  {user.lastName} {user.firstName}
                                </h4>
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {user.email}
                                </p>
                                {user.extraInfo && (
                                  <span className="block text-[9px] text-slate-500 font-medium truncate mt-1">
                                    {user.extraInfo}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* STANDARD LOGIN FORM */
              <div>
                <div className="space-y-6 mb-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">Staff / User Login</h2>
                    <p className="text-slate-400 text-xs">
                      Enter your credentials below to log into your account context.
                    </p>
                  </div>

                  {/* School Tenant Selector */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5" /> 1. Select School Tenant
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                      {schools.map((school) => {
                        const isSelected = selectedSchool === school.slug;
                        const isSchoolGreenwood = school.slug === 'greenwood-secondary';
                        return (
                          <button
                            key={school.id}
                            type="button"
                            onClick={() => setSelectedSchool(school.slug)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                              isSelected
                                ? isSchoolGreenwood
                                  ? 'bg-emerald-500/10 border-emerald-500 text-white'
                                  : 'bg-indigo-500/10 border-indigo-500 text-white'
                                : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${
                              isSelected
                                ? isSchoolGreenwood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {school.logoUrl ? (
                                <img src={school.logoUrl} alt="School Crest" className="w-4 h-4 rounded object-cover bg-white" />
                              ) : (
                                <School className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-semibold truncate" title={school.name}>{school.name}</h4>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Username or Email Address
                      </label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@greenwood.com or admin001"
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
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600 pr-12"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
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
                </div>

                <div className="border-t border-slate-800/60 pt-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginMode('demo');
                      setStep('role');
                      setSelectedRole(null);
                      setSelectedSchoolObj(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                    Switch to Demo Persona Portal (One-Click Bypass)
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
