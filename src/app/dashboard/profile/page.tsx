'use client';

import React, { useEffect, useState } from 'react';
import { 
  User, Mail, Phone, Shield, Building, Award, 
  Save, RefreshCw, CheckCircle, AlertCircle, Camera, 
  Key, Calendar, ClipboardCheck
} from 'lucide-react';

export default function UserProfilePage() {
  const [school, setSchool] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setUser(sessionObj.user);
        
        // Populate form fields
        setFirstName(sessionObj.user.firstName || '');
        setLastName(sessionObj.user.lastName || '');
        setEmail(sessionObj.user.email || '');
        setPhone(sessionObj.user.phone || '');
        setPassportPhoto(sessionObj.user.passportPhoto || null);
      } catch (e) {
        setErrorMsg('Failed to parse user session parameters.');
      }
    }
    setLoading(false);
  }, []);

  // Handle image conversion to Base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Passport photo must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPassportPhoto(reader.result as string);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file contents.');
    };
    reader.readAsDataURL(file);
  };

  // Submit profile edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('First Name, Last Name, and Email Address are required.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: user.id,
          schoolId: school?.id || null,
          firstName,
          lastName,
          email,
          phone,
          passportPhoto
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update profile coordinates.');

      setSuccessMsg('Your profile has been successfully updated! Session settings synchronized.');
      
      // Update local storage session so navbar headers adapt reactively
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        email,
        phone,
        passportPhoto
      };
      
      localStorage.setItem('report_user_session', JSON.stringify({
        school,
        user: updatedUser
      }));
      
      setUser(updatedUser);
      
      // Force page/layout refresh after 1.5 seconds to align layout state
      setTimeout(() => {
        window.location.reload();
      }, 15000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with SQL server.');
    } finally {
      setSaving(false);
    }
  };

  const getRoleLabel = (r: string) => {
    switch(r) {
      case 'SUPER_ADMIN': return 'Super Administrator';
      case 'SCHOOL_ADMIN': return 'School Administrator';
      case 'HEAD_TEACHER': return 'Head Teacher / Principal';
      case 'CLASS_TEACHER': return 'Classroom Form Teacher';
      case 'SUBJECT_TEACHER': return 'Subject Instructor';
      case 'PARENT': return 'Guardian / Parent';
      case 'STUDENT': return 'Student';
      default: return r;
    }
  };

  const isGreenwood = school?.slug === 'nacho-secondary';
  const accentText = isGreenwood ? 'text-emerald-500' : 'text-indigo-500';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-100' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-100';

  if (loading || !user) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-slate-400 text-xs font-semibold">Pulling user security profile...</p>
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
              <User className="w-5 h-5" />
            </div>
            My Profile Workspace
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            Manage your personal settings, modify contact details, and upload your official passport photo.
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
        
        {/* Left Column: Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 flex flex-col items-center text-center font-semibold">
          
          {/* Avatar Upload Slot */}
          <div className="relative group cursor-pointer w-28 h-28 rounded-full border-4 border-slate-50 shadow-md overflow-hidden bg-slate-50 flex items-center justify-center">
            {passportPhoto ? (
              <img 
                src={passportPhoto} 
                alt="Profile Photo" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-black text-indigo-500">
                {firstName[0]?.toUpperCase()}{lastName[0]?.toUpperCase()}
              </span>
            )}
            
            {/* Hover overlay */}
            <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold tracking-wider uppercase transition-opacity cursor-pointer">
              <Camera className="w-4 h-4 mb-1" />
              Upload Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="space-y-1 w-full">
            <h3 className="text-base font-extrabold text-slate-800 leading-snug">
              {firstName} {lastName}
            </h3>
            <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/40 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              {getRoleLabel(user.role)}
            </span>
          </div>

          {/* Metadata items list */}
          <div className="w-full border-t border-slate-100 pt-5 space-y-4 text-xs text-left">
            <div className="flex gap-3 items-center">
              <div className="p-1.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">School Institution</span>
                <span className="text-slate-700 font-bold">{school?.name || 'NachoEd Platform'}</span>
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <div className="p-1.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">System Username</span>
                <span className="text-slate-700 font-bold truncate max-w-[180px] block">{email}</span>
              </div>
            </div>

            {phone && (
              <div className="flex gap-3 items-center">
                <div className="p-1.5 bg-slate-50 text-slate-400 border border-slate-100 rounded-lg">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone Coordinates</span>
                  <span className="text-slate-700 font-bold">{phone}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Form Fields */}
        <form onSubmit={handleSaveProfile} className="md:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Shield className={`w-4.5 h-4.5 ${accentText}`} />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Update Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
            {/* First Name */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="E.g., Solomon"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Last Name (Surname)</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="E.g., Apeh"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Email Username</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E.g., solomon@greenwood.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
              />
            </div>

            {/* Phone Coordinates */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Phone Coordinates</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="E.g., +234 803 999 8888"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-bold focus:outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-xs font-semibold space-y-1 leading-normal flex gap-3 text-left">
            <Key className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="block text-slate-700 font-bold">Credential Credentials Safeguard</span>
              <p className="text-slate-400 font-normal text-[11px] leading-relaxed">
                Contact your School IT Administrator to request role modifications or to update account password coordinates.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md disabled:opacity-50 ${buttonPrimary}`}
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving changes...' : 'Save Settings'}
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}

export const dynamic = 'force-dynamic';
