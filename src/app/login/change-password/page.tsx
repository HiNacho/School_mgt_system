'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Lock,
  Check,
  X
} from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Load user session from localStorage
  useEffect(() => {
    const token = localStorage.getItem('report_auth_token');
    const storedSession = localStorage.getItem('report_user_session');
    
    if (!token || !storedSession) {
      router.push('/login');
      return;
    }
    
    try {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      
      // If user has already changed password, don't force them here
      if (parsed.user && parsed.user.isFirstLogin === false) {
        window.location.href = '/dashboard';
      }
    } catch (e) {
      localStorage.removeItem('report_auth_token');
      localStorage.removeItem('report_user_session');
      document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  }, [router]);

  // Live password strength calculations
  const getChecks = (pw: string) => {
    return {
      minLength: pw.length >= 8,
      hasUpper: /[A-Z]/.test(pw),
      hasLower: /[a-z]/.test(pw),
      hasNumber: /[0-9]/.test(pw),
      hasSpecial: /[^A-Za-z0-9]/.test(pw)
    };
  };

  const checks = getChecks(newPassword);
  const strengthScore = Object.values(checks).filter(Boolean).length;

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: 'Empty', color: 'bg-slate-800' };
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500 shadow-red-500/20' };
    if (score <= 4) return { label: 'Medium', color: 'bg-amber-500 shadow-amber-500/20' };
    return { label: 'Strong', color: 'bg-emerald-500 shadow-emerald-500/20' };
  };

  const strength = getStrengthLabel(strengthScore);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (strengthScore < 5) {
      setError('Please meet all password complexity requirements.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('report_auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccess(true);

      // Update stored session data to reflect changed first login flag
      if (session) {
        const updated = {
          ...session,
          user: {
            ...session.user,
            isFirstLogin: false
          }
        };
        localStorage.setItem('report_user_session', JSON.stringify(updated));
      }

      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during update.');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    localStorage.removeItem('report_auth_token');
    localStorage.removeItem('report_user_session');
    document.cookie = 'report_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session.user;
  const school = session.school;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#2d3748] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
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

      <div className="w-full max-w-md z-10">
        <div className="p-8 rounded-3xl bg-white border border-[#e9ecef] shadow-[0_15px_50px_rgba(0,0,0,0.03)] relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-slate-50/50 blur-3xl pointer-events-none" />

          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="flex justify-center items-center gap-2 mb-2">
              <img src="/logo.png" alt="Operon Logo" className="w-8 h-8 object-contain" />
              <span className="font-semibold text-lg tracking-wider text-[#1e293b] uppercase">
                Operon
              </span>
            </div>
            <h2 className="text-xl font-normal text-[#1e293b] tracking-tight">Update Temporary Password</h2>
            <p className="text-[#64748b] text-xs font-semibold leading-relaxed max-w-[320px] mx-auto">
              Hi <span className="text-slate-800 font-bold">{user.firstName}</span>, for security compliance you must update your temporary password before accessing the system.
            </p>
          </div>

          {/* School boundary badge */}
          {school && (
            <div className="py-2.5 px-4 rounded-2xl bg-[#f8f9fa] border border-[#e9ecef] flex items-center gap-3">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="Crest" className="w-5 h-5 rounded object-cover bg-white flex-shrink-0" />
              ) : (
                <Shield className="w-5 h-5 text-[#94a3b8] flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="block text-[8px] uppercase tracking-wider font-extrabold text-[#94a3b8] leading-none">Security Scope context</span>
                <span className="block text-xs font-bold text-slate-700 truncate mt-0.5">{school.name}</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password updated successfully! Loading dashboard...</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                Current Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password"
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400 pr-12 text-slate-700"
                  disabled={loading || success}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                New Secure Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400 pr-12 text-slate-700"
                  disabled={loading || success}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Visualizer */}
              {newPassword && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-slate-400 uppercase tracking-wider">Password Strength</span>
                    <span className={
                      strengthScore <= 2 ? 'text-red-500' : strengthScore <= 4 ? 'text-amber-500' : 'text-emerald-600'
                    }>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div 
                        key={idx} 
                        className={`h-full flex-1 transition-all duration-300 ${
                          idx <= strengthScore ? strength.color : 'bg-slate-200'
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {checks.minLength ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-350" />}
                      <span className={checks.minLength ? 'text-slate-700' : 'text-slate-400'}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {checks.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-350" />}
                      <span className={checks.hasUpper ? 'text-slate-700' : 'text-slate-400'}>One uppercase</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {checks.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-350" />}
                      <span className={checks.hasLower ? 'text-slate-700' : 'text-slate-400'}>One lowercase</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      {checks.hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-350" />}
                      <span className={checks.hasNumber ? 'text-slate-700' : 'text-slate-400'}>One number</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-[10px] font-bold">
                      {checks.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-slate-350" />}
                      <span className={checks.hasSpecial ? 'text-slate-700' : 'text-slate-400'}>One special char (!@#$ etc.)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors placeholder-slate-400 pr-12 text-slate-700"
                  disabled={loading || success}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success || strengthScore < 5}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-all flex justify-center items-center gap-2 ${
                school?.slug === 'nacho-secondary'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10 disabled:bg-emerald-800 disabled:text-slate-500'
                  : 'bg-[#1e293b] text-white hover:bg-[#0f172a] shadow-md shadow-slate-500/10 disabled:bg-slate-300 disabled:text-slate-400'
              } cursor-pointer`}
            >
              {loading ? 'Updating Password...' : 'Save and Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase transition-colors flex justify-center items-center gap-2 bg-[#f8f9fa] border border-[#e9ecef] text-[#64748b] hover:text-[#2d3748] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
