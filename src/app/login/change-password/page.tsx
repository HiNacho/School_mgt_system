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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const user = session.user;
  const school = session.school;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-950/20 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md relative overflow-hidden shadow-2xl space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-slate-800/10 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Update Temporary Password</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-[280px] mx-auto">
              Hi <span className="text-slate-200 font-semibold">{user.firstName}</span>, for security compliance you must update your temporary password before accessing the system.
            </p>
          </div>

          {/* School boundary badge */}
          {school && (
            <div className="py-2.5 px-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="Crest" className="w-5 h-5 rounded object-cover bg-white flex-shrink-0" />
              ) : (
                <Shield className="w-5 h-5 text-slate-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 leading-none">Security Scope context</span>
                <span className="block text-xs font-semibold text-slate-300 truncate mt-0.5">{school.name}</span>
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password updated successfully! Loading dashboard...</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Current Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter temp password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600 pr-12 text-slate-200"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Secure Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600 pr-12 text-slate-200"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Password Strength Visualizer */}
              {newPassword && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-slate-500 uppercase">Password Strength</span>
                    <span className={
                      strengthScore <= 2 ? 'text-red-400' : strengthScore <= 4 ? 'text-amber-400' : 'text-emerald-400'
                    }>{strength.label}</span>
                  </div>
                  <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((idx) => (
                      <div 
                        key={idx} 
                        className={`h-full flex-1 transition-all duration-300 ${
                          idx <= strengthScore ? strength.color : 'bg-slate-850'
                        }`} 
                      />
                    ))}
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <div className="flex items-center gap-1 text-[9.5px] font-medium">
                      {checks.minLength ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                      <span className={checks.minLength ? 'text-slate-300' : 'text-slate-500'}>Min 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9.5px] font-medium">
                      {checks.hasUpper ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                      <span className={checks.hasUpper ? 'text-slate-300' : 'text-slate-500'}>One uppercase</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9.5px] font-medium">
                      {checks.hasLower ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                      <span className={checks.hasLower ? 'text-slate-300' : 'text-slate-500'}>One lowercase</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9.5px] font-medium">
                      {checks.hasNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                      <span className={checks.hasNumber ? 'text-slate-300' : 'text-slate-500'}>One number</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-[9.5px] font-medium">
                      {checks.hasSpecial ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                      <span className={checks.hasSpecial ? 'text-slate-300' : 'text-slate-500'}>One special char (!@#$ etc.)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-slate-600 transition-colors placeholder-slate-600 pr-12 text-slate-200"
                  disabled={loading || success}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success || strengthScore < 5}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all flex justify-center items-center gap-2 ${
                school?.slug === 'greenwood-secondary'
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-md shadow-emerald-500/10 disabled:bg-emerald-800 disabled:text-slate-500'
                  : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-md shadow-indigo-500/10 disabled:bg-indigo-800 disabled:text-indigo-500'
              } cursor-pointer`}
            >
              {loading ? 'Updating Password...' : 'Save and Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase transition-all flex justify-center items-center gap-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
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
