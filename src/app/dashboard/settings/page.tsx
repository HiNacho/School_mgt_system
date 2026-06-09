'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, Building, FileText, CheckCircle, AlertCircle, Save,
  RefreshCw, Volume2, Moon, Sun, Bell, Shield, Info, Image, MapPin,
  UploadCloud, Link as LinkIcon
} from 'lucide-react';

export default function SettingsPage() {
  const [school, setSchool] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // School Form states (Admins only)
  const [schoolName, setSchoolName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gradingType, setGradingType] = useState('SECONDARY');

  // User Local preferences (All roles)
  const [themeMode, setThemeMode] = useState('light');
  const [enableSound, setEnableSound] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  // Loading and alerts
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) { // 1MB size limit
      setErrorMsg('School crest logo file must be less than 1MB.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoUrl(reader.result as string);
      setErrorMsg('');
    };
    reader.onerror = () => {
      setErrorMsg('Failed to process school logo image file.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setUser(sessionObj.user);

        // Populate school details if school context exists
        if (sessionObj.school) {
          setSchoolName(sessionObj.school.name || '');
          setLogoUrl(sessionObj.school.logoUrl || '');
          setAddress(sessionObj.school.address || '');
          setPhone(sessionObj.school.phone || '');
          setEmail(sessionObj.school.email || '');
          setGradingType(sessionObj.school.gradingType || 'SECONDARY');
        }

        // Populate local user preference configurations
        const localTheme = localStorage.getItem('pref_theme') || 'light';
        const localSound = localStorage.getItem('pref_sound') !== 'false';
        const localEmail = localStorage.getItem('pref_email') !== 'false';

        setThemeMode(localTheme);
        setEnableSound(localSound);
        setEmailAlerts(localEmail);

      } catch (e) {
        setErrorMsg('Failed to parse active user settings coordinates.');
      }
    }
    setLoading(false);
  }, []);

  const handleSaveSchoolSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      setErrorMsg('School Institution Name is required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          name: schoolName,
          logoUrl,
          address,
          phone,
          email,
          gradingType
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update school configurations.');

      setSuccessMsg('Academic institution configurations successfully saved! Session synchronized.');
      
      // Update session locally
      const updatedSchool = {
        ...school,
        name: schoolName,
        logoUrl,
        address,
        phone,
        email,
        gradingType
      };

      localStorage.setItem('report_user_session', JSON.stringify({
        school: updatedSchool,
        user
      }));

      setSchool(updatedSchool);

      // Force context reload to align header styles
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with SQL server.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserPreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    try {
      localStorage.setItem('pref_theme', themeMode);
      localStorage.setItem('pref_sound', enableSound ? 'true' : 'false');
      localStorage.setItem('pref_email', emailAlerts ? 'true' : 'false');
      
      // Apply theme class instantly
      if (themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      setSuccessMsg('Personal preferences updated successfully.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg('Failed to write preferences to local storage.');
    }
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'HEAD_TEACHER';
  const isSchoolAdmin = user?.role === 'SCHOOL_ADMIN' || user?.role === 'HEAD_TEACHER';
  const isGreenwood = school?.slug === 'greenwood-secondary';

  const accentText = isGreenwood ? 'text-emerald-500' : 'text-indigo-500';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100';

  if (loading || !user) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-slate-400 text-xs font-semibold">Pulling configuration matrices...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${accentBg}`}>
              <Settings className="w-5 h-5" />
            </div>
            Settings & System Preferences
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            {isAdmin 
              ? 'Configure institution identity attributes, adjust terminal grading systems, and toggle personal display settings.'
              : 'Modify your interface display rules and alert notifications triggers.'
            }
          </p>
        </div>
      </div>

      {/* 2. Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* 3. Columns Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Local preferences */}
        <div className="md:col-span-1 space-y-6">
          <form onSubmit={handleSaveUserPreferences} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sun className={`w-4.5 h-4.5 ${accentText}`} />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">My Preferences</h3>
            </div>

            {/* Theme selector */}
            <div className="text-xs font-semibold space-y-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">UI Display Theme</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`flex items-center justify-center gap-1.5 py-2 border rounded-xl font-bold transition-all ${
                    themeMode === 'light' 
                      ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                      : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Light Mode
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`flex items-center justify-center gap-1.5 py-2 border rounded-xl font-bold transition-all ${
                    themeMode === 'dark' 
                      ? 'bg-slate-900 border-slate-950 text-white shadow-sm'
                      : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Dark Mode
                </button>
              </div>
            </div>

            {/* Notification settings */}
            <div className="text-xs font-semibold space-y-3 pt-2">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interaction Prefs</label>
              
              {/* Sound alert */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  Sound Indicators
                </span>
                <input
                  type="checkbox"
                  checked={enableSound}
                  onChange={(e) => setEnableSound(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Email summary alert */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-slate-400" />
                  Weekly Summary
                </span>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-extrabold transition-all shadow-sm`}
              >
                <Save className="w-3.5 h-3.5" />
                Apply Preferences
              </button>
            </div>
          </form>

          {/* Secure details card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-950 font-semibold space-y-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl" />
            <div className="flex items-center gap-2 text-indigo-400">
              <Shield className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">Security Access Level</span>
            </div>
            <div>
              <span className="block text-xs font-extrabold capitalize text-slate-200">{user.role.toLowerCase().replace('_', ' ')}</span>
              <p className="text-[10px] text-slate-400 font-normal leading-relaxed mt-1">
                You have active authorization clearance to read database registries, record scores sheets, and adjust personal settings.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Academic Settings (Admins only) */}
        <div className="md:col-span-2">
          {isSchoolAdmin ? (
            <form onSubmit={handleSaveSchoolSettings} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Building className={`w-4.5 h-4.5 ${accentText}`} />
                <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">School Institution Settings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                {/* School Name */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">School Name</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="E.g., Greenwood Secondary School"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
                    disabled={saving}
                  />
                </div>

                {/* Grading rule system */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Grading standard system</label>
                  <select
                    value={gradingType}
                    onChange={(e) => setGradingType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 font-bold focus:outline-none focus:border-slate-300"
                  >
                    <option value="PRIMARY">PRIMARY (Grade Scale A, B, C, D)</option>
                    <option value="SECONDARY">SECONDARY (WAEC Scale A1 - F9)</option>
                  </select>
                </div>

                {/* Logo URL & File Upload */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Crest Shield Logo</label>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
                    {/* Visual Preview */}
                    <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {logoUrl ? (
                        <img src={logoUrl} alt="School Crest Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Image className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    
                    {/* Input Controls */}
                    <div className="flex-1 w-full space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Hidden File Input */}
                        <input
                          type="file"
                          id="school-logo-file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="school-logo-file"
                          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                        >
                          <UploadCloud className="w-4 h-4 text-emerald-600 animate-pulse" />
                          Upload Local Image
                        </label>

                        {logoUrl && (
                          <button
                            type="button"
                            onClick={() => setLogoUrl('')}
                            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50/40 rounded-xl transition-all border border-transparent hover:border-red-100"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>

                      {/* URL Field as fallback */}
                      {logoUrl.startsWith('data:image/') ? (
                        <div className="flex items-center gap-2 bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 w-full animate-fadeIn">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Local image file loaded successfully (Base64 encoded)</span>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <input
                            type="text"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                            placeholder="Or paste external image URL here..."
                            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300 text-xs h-[38px]"
                          />
                          <LinkIcon className="absolute left-3 top-3 w-3.5 h-3.5 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Phone contact */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Institution Phone Contact</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="E.g., +234 803 999 8888"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
                  />
                </div>

                {/* Email contact */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Institution Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E.g., info@greenwood.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
                  />
                </div>

                {/* Address info */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Physical School Address</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="E.g., 45 Greenwood Boulevard, Lekki, Lagos State"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
                    />
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 ${buttonPrimary}`}
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Applying configurations...' : 'Apply School Settings'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
                <Shield className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto space-y-2">
                <h4 className="text-sm font-extrabold text-slate-800">
                  {user?.role === 'SUPER_ADMIN' ? 'Platform-Wide Settings' : 'Academic Parameters Locked'}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-normal">
                  {user?.role === 'SUPER_ADMIN' 
                    ? 'You are logged in under a platform-wide Super Admin context. School-specific settings must be managed within individual school boundary portals.'
                    : `You are logged in under a ${getRoleLabel(user.role)} authorization context. General institutional settings are locked. Contact school administration to modify academic configurations.`
                  }
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

const getRoleLabel = (r: string) => {
  switch(r) {
    case 'SUPER_ADMIN': return 'Super Admin';
    case 'SCHOOL_ADMIN': return 'School Admin';
    case 'HEAD_TEACHER': return 'Head Teacher';
    case 'CLASS_TEACHER': return 'Class Teacher';
    case 'SUBJECT_TEACHER': return 'Subject Teacher';
    case 'PARENT': return 'Parent';
    case 'STUDENT': return 'Student';
    default: return r;
  }
};

export const dynamic = 'force-dynamic';
