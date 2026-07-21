'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Key, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear session storage on mount
  useEffect(() => {
    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
    document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again to continue.');
    }
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
              <img src="/logo.png" alt="Operon Logo" className="w-8 h-8 object-contain" />
              <span className="font-poppins-bold text-lg tracking-wide text-[#1e293b]">
                Operon
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

            {/* STANDARD LOGIN FORM ONLY */}
            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-[#10b981]">
                  <Key className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Portal Access</span>
                </div>
                <h2 className="text-2xl font-normal text-[#1e293b] tracking-tight">User Login</h2>
                <p className="text-[#64748b] text-xs font-semibold">
                  Enter your assigned credentials to securely access your dashboard.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                    Username or Email Address
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@greenwood.com"
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400"
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5 flex justify-between items-center">
                    <span>Password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400 pr-12"
                      disabled={loading}
                      required
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
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2 cursor-pointer"
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

          </div>

        </div>

      </div>
    </div>
  );
}
