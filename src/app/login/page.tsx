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
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-emerald-500 hover:bg-emerald-50/10 hover:shadow-lg text-emerald-600',
    },
    {
      id: 'SCHOOL_ADMIN',
      name: 'School Admin',
      description: 'Principal/Owner. Oversee classes, teachers, student rosters, grading scales.',
      icon: Award,
      color: 'blue',
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-blue-500 hover:bg-blue-50/10 hover:shadow-lg text-blue-600',
    },
    {
      id: 'CLASS_TEACHER',
      name: 'Class Teacher',
      description: 'Manage classroom roster, mark attendance, and add remarks.',
      icon: Users,
      color: 'indigo',
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-indigo-500 hover:bg-indigo-50/10 hover:shadow-lg text-indigo-600',
    },
    {
      id: 'SUBJECT_TEACHER',
      name: 'Subject Teacher',
      description: 'Input subject marks, calculate totals/grades via offline gradesheets.',
      icon: BookOpen,
      color: 'amber',
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-amber-500 hover:bg-amber-50/10 hover:shadow-lg text-amber-650',
    },
    {
      id: 'PARENT',
      name: 'Parent View',
      description: 'Evaluate student scorecards, track attendance, and download reports.',
      icon: Heart,
      color: 'pink',
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-pink-500 hover:bg-pink-50/10 hover:shadow-lg text-pink-650',
    },
    {
      id: 'STUDENT',
      name: 'Student View',
      description: 'View academic grades, print reports, view school events/notices.',
      icon: GraduationCap,
      color: 'violet',
      bgClass: 'border-[#e9ecef] bg-[#f8f9fa] hover:border-violet-500 hover:bg-violet-50/10 hover:shadow-lg text-violet-600',
    },
  ];

  const getRoleDetails = (roleId: string) => {
    return roles.find(r => r.id === roleId);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#2d3748] flex flex-col justify-center items-center p-6 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      
      {/* Import custom fonts & inject styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,600&display=swap');
        
        :root {
          --font-sans: 'Plus Jakarta Sans', sans-serif;
          --font-serif: 'Playfair Display', serif;
        }

        body {
          font-family: var(--font-sans);
          background-color: #f8f9fa;
        }

        .serif-italic {
          font-family: var(--font-serif);
        }
      `}</style>

      {/* Floating subtle background accents (Minimalist) */}
      <div className="absolute top-[10%] left-[5%] w-72 h-72 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[10%] right-[5%] w-80 h-80 rounded-full bg-blue-100/20 blur-3xl pointer-events-none z-0" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
        
        {/* Left Hand: Product Vision Card */}
        <div className="lg:col-span-5 flex flex-col justify-between p-8 rounded-3xl bg-white border border-[#e9ecef] shadow-[0_10px_40px_rgba(0,0,0,0.02)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-100/10 blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-3 mb-8">
              {/* Brand Logo matching page.tsx */}
              <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 15 C25 25 25 60 50 85 C75 60 75 25 50 15 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
                <path d="M36 45 C42 48 48 51 50 54 C52 51 58 48 64 45 V65 C58 68 52 71 50 74 C48 71 42 68 36 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M50 54 V74" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M50 22 L62 27 L50 32 L38 27 Z" fill="#1e293b" />
                <path d="M44 29.5 V33 C44 36 56 36 56 33 V29.5" fill="#1e293b" />
                <path d="M62 27 V35" stroke="#db2777" strokeWidth="1.5" />
                <circle cx="62" cy="35" r="1.5" fill="#db2777" />
              </svg>
              <span className="font-semibold text-lg tracking-wider text-[#1e293b] uppercase">
                NachoEd
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold uppercase tracking-wider rounded">
                Engine
              </span>
            </div>
            
            <h1 className="text-3xl font-normal leading-tight text-[#1e293b] tracking-tight mb-4">
              A Modern Operating System for <span className="text-[#10b981] serif-italic font-normal">Academic Management</span>.
            </h1>
            <p className="text-[#64748b] text-xs leading-relaxed font-semibold mb-6">
              Empowering administrators and teachers to convert weeks of tedious compilation, class rankings, and report card generations into a single click. Optimized for low-bandwidth environments.
            </p>
          </div>

          <div className="space-y-4 border-t border-[#e9ecef] pt-6">
            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#1e293b] font-bold">Multi-Tenant Isolation</strong>: Securely houses unlimited schools with isolated PostgreSQL schemas.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#1e293b] font-bold">Configurable Grading Rules</strong>: Secondary section (A1-F9 scales) & Primary section (A-D scales) isolated per school.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 rounded bg-emerald-50 border border-emerald-100 text-emerald-600 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#475569] leading-relaxed">
                <strong className="text-[#1e293b] font-bold">Offline-First Scoresheet</strong>: Interactive spreadsheet interface persists in IndexedDB on local connection dropouts.
              </p>
            </div>
          </div>
        </div>

        {/* Right Hand: Actionable Login Panel */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          
          <div className="p-8 rounded-3xl bg-white border border-[#e9ecef] shadow-[0_15px_50px_rgba(0,0,0,0.03)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-slate-50/50 blur-3xl pointer-events-none" />
            
            {/* Alert/Status Indicators */}
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
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
                      <div className="flex items-center gap-2 text-emerald-600">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Interactive Evaluation Portal</span>
                      </div>
                      <h2 className="text-2xl font-normal text-[#1e293b] tracking-tight">Who are you logging in as?</h2>
                      <p className="text-[#64748b] text-xs font-semibold">
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
                            className={`flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-200 group outline-none cursor-pointer ${role.bgClass}`}
                            disabled={loading}
                          >
                            <div className="p-2.5 rounded-xl bg-white border border-[#cbd5e1] mb-3 group-hover:scale-105 transition-transform flex items-center justify-center">
                              <IconComponent className="w-5 h-5" />
                            </div>
                            <h3 className="text-sm font-bold text-[#1e293b] transition-colors">
                              {role.name}
                            </h3>
                            <p className="text-[#64748b] text-[10px] mt-1.5 leading-relaxed font-semibold">
                              {role.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border-t border-[#e9ecef] pt-5 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setLoginMode('standard');
                        }}
                        className="text-[10px] font-bold text-[#64748b] hover:text-[#1e293b] uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
                        className="p-2 rounded-lg bg-[#f8f9fa] hover:bg-slate-100 border border-[#e9ecef] text-[#475569] hover:text-slate-900 transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-normal text-[#1e293b] tracking-tight">Select School Context</h2>
                        <p className="text-[#64748b] text-[11px] font-semibold">
                          Choose a school boundary to load accounts for: <strong className="text-slate-700">{getRoleDetails(selectedRole)?.name}</strong>
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
                            type="button; "
                            onClick={() => {
                              setSelectedSchoolObj(school);
                              setStep('user');
                              fetchDemoUsers(selectedRole, school);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? isSchoolGreenwood
                                  ? 'bg-emerald-55/30 border-emerald-500 text-slate-800 shadow-md shadow-emerald-100'
                                  : 'bg-blue-55/30 border-blue-500 text-slate-800 shadow-md shadow-blue-100'
                                : 'bg-[#f8f9fa] border-[#e9ecef] text-[#64748b] hover:border-[#cbd5e1] hover:bg-slate-100/30'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                                isSchoolGreenwood ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-blue-50 border border-blue-100 text-blue-600'
                              }`}>
                                {school.logoUrl ? (
                                  <img src={school.logoUrl} alt="School Crest" className="w-5 h-5 rounded object-cover bg-white" />
                                ) : (
                                  <School className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-850 truncate">{school.name}</h4>
                                <span className={`text-[9px] uppercase font-bold tracking-wider block mt-0.5 ${
                                  isSchoolGreenwood ? 'text-emerald-600' : 'text-blue-600'
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
                        className="p-2 rounded-lg bg-[#f8f9fa] hover:bg-slate-100 border border-[#e9ecef] text-[#475569] hover:text-slate-900 transition-colors cursor-pointer"
                        disabled={loading}
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h2 className="text-xl font-normal text-[#1e293b] tracking-tight">Select Demo User</h2>
                        <p className="text-[#64748b] text-[11px] font-semibold leading-relaxed">
                          Click any active <strong className="text-slate-700">{getRoleDetails(selectedRole)?.name}</strong> profile in <strong className="text-slate-700">{selectedSchoolObj.name}</strong> to login:
                        </p>
                      </div>
                    </div>

                    {loadingUsers ? (
                      <div className="flex flex-col items-center justify-center py-10 space-y-3">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                        <span className="text-[#64748b] text-xs font-semibold">Querying database school context...</span>
                      </div>
                    ) : demoUsers.length === 0 ? (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs space-y-2 leading-relaxed font-semibold">
                          <p className="font-bold flex items-center gap-1.5">
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
                            className="flex-1 py-3 px-4 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
                          >
                            Log in as School Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStep('school');
                              setSelectedSchoolObj(null);
                            }}
                            className="flex-1 py-3 px-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef] hover:bg-slate-100 text-[#64748b] hover:text-[#1e293b] text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-center"
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
                            className="w-full flex items-center justify-between p-3.5 rounded-xl border border-[#e9ecef] bg-[#f8f9fa] hover:bg-white hover:border-[#cbd5e1] text-left transition-all duration-150 outline-none group cursor-pointer"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center flex-shrink-0 group-hover:border-[#cbd5e1] transition-colors overflow-hidden">
                                {user.passportPhoto ? (
                                  <img src={user.passportPhoto} alt="User Passport" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-800 group-hover:text-[#1e293b] truncate">
                                  {user.lastName} {user.firstName}
                                </h4>
                                <p className="text-[10px] text-[#64748b] font-semibold truncate mt-0.5">
                                  {user.email}
                                </p>
                                {user.extraInfo && (
                                  <span className="block text-[9px] text-[#94a3b8] font-bold uppercase tracking-wider truncate mt-1">
                                    {user.extraInfo}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#1e293b] group-hover:translate-x-0.5 transition-all" />
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
                    <h2 className="text-xl font-normal text-[#1e293b] tracking-tight">Staff / User Login</h2>
                    <p className="text-[#64748b] text-xs font-semibold">
                      Enter your credentials below to log into your account context.
                    </p>
                  </div>

                  {/* School Tenant Selector */}
                  <div className="p-4 rounded-xl bg-[#f8f9fa] border border-[#e9ecef]">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-2 flex items-center gap-1.5">
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
                            className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isSelected
                                ? isSchoolGreenwood
                                  ? 'bg-emerald-50/50 border-emerald-500 text-slate-800 shadow-sm'
                                  : 'bg-blue-50/50 border-blue-500 text-slate-800 shadow-sm'
                                : 'bg-[#f8f9fa] border-[#e9ecef] text-[#64748b] hover:border-[#cbd5e1]'
                            }`}
                          >
                            <div className={`p-1.5 rounded-md flex-shrink-0 ${
                              isSelected
                                ? isSchoolGreenwood ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-blue-50 border border-blue-100 text-blue-600'
                                : 'bg-[#f8f9fa] border border-[#e9ecef] text-[#64748b]'
                            }`}>
                              {school.logoUrl ? (
                                <img src={school.logoUrl} alt="School Crest" className="w-4 h-4 rounded object-cover bg-white" />
                              ) : (
                                <School className="w-4 h-4" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs font-bold truncate text-slate-800" title={school.name}>{school.name}</h4>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                        Username or Email Address
                      </label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. admin@greenwood.com or admin001"
                        className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400 pr-12"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-3 text-[#cbd5e1] hover:text-[#94a3b8] transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying Records...</span>
                        </>
                      ) : (
                        <>
                          <span>Access Dashboard</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="border-t border-[#e9ecef] pt-5 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setLoginMode('demo');
                      setStep('role');
                      setSelectedRole(null);
                      setSelectedSchoolObj(null);
                    }}
                    className="text-[10px] font-bold text-[#64748b] hover:text-[#1e293b] uppercase tracking-widest transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
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
