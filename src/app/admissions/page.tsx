'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Sparkles, Upload, Calendar, User, 
  Mail, Phone, GraduationCap, Shield, HelpCircle,
  FileImage, CheckCircle, Loader2
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  gradingType: string;
}

interface ClassLevel {
  id: string;
  name: string;
}

export default function AdmissionsPortal() {
  // Page states
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [passportPhoto, setPassportPhoto] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch schools on load
  useEffect(() => {
    async function loadSchools() {
      try {
        const response = await fetch('/api/schools');
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data)) {
          setSchools(resData.data);
          // Auto select first school if available
          if (resData.data.length > 0) {
            setSelectedSchoolId(resData.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load schools:', err);
      } finally {
        setLoadingSchools(false);
      }
    }
    loadSchools();
  }, []);

  // Fetch classes when selected school changes
  useEffect(() => {
    if (!selectedSchoolId) {
      setClasses([]);
      return;
    }

    async function loadClasses() {
      setLoadingClasses(true);
      try {
        const response = await fetch(`/api/classes?schoolId=${selectedSchoolId}`);
        const resData = await response.json();
        if (resData.success && resData.data && Array.isArray(resData.data.classes)) {
          setClasses(resData.data.classes);
          if (resData.data.classes.length > 0) {
            setSelectedClassId(resData.data.classes[0].id);
          } else {
            setSelectedClassId('');
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, [selectedSchoolId]);

  // Handle Photo Upload & Base64 conversions
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Passport picture should be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPassportPhoto(base64String);
      setPhotoPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  // Submit Application Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSchoolId) {
      setErrorMessage('Please select a tenant school.');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('First Name and Last Name are required.');
      return;
    }
    if (!selectedClassId) {
      setErrorMessage('Please select a target class level.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedSchoolId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || undefined,
          gender,
          dateOfBirth: dateOfBirth || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          classId: selectedClassId,
          passportPhoto: passportPhoto || undefined
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        setSubmitSuccess(true);
        // Clear state
        setFirstName('');
        setLastName('');
        setMiddleName('');
        setDateOfBirth('');
        setEmail('');
        setPhone('');
        setPassportPhoto(null);
        setPhotoPreview(null);
      } else {
        setErrorMessage(resData.error || 'Failed to submit admission application. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between">
      {/* Radiant glow spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-950/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-950/20 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Main
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-sm tracking-wider bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              ADMISSIONS HUB
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-6 py-12 w-full relative z-10">
        {submitSuccess ? (
          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-emerald-950/10 blur-[80px]" />
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Application Submitted Successfully!</h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mb-8 leading-relaxed">
              Your application has been received and added to our pending review queue. The school academic board will review the candidate bio details, allocate a class Arm, and dispatch an account confirmation details message shortly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setSubmitSuccess(false)}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/10"
              >
                Submit Another Application
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-850 text-xs font-semibold transition-all flex items-center justify-center"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-md">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Admission Application Portal</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Apply for Admission</h1>
            <p className="text-slate-400 text-xs leading-relaxed mb-8">
              Welcome to the prospective student registration portal. Please accurately complete the biological and contact profiles below. Submissions are processed transactionally by school administrators.
            </p>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-semibold mb-6 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Tenant Institution Selection */}
              <div className="p-5 bg-slate-950/40 border border-slate-900 rounded-2xl">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  1. Academic Tenant Selection
                </h3>
                
                {loadingSchools ? (
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading schools directory...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Target School
                    </label>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-slate-600 transition-colors"
                      required
                    >
                      <option value="">Select a School</option>
                      {schools.map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.name} ({school.slug.includes('secondary') ? 'Secondary' : 'Primary'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* SECTION 2: Student Biological Profile */}
              <div className="p-5 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-5">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  2. Student Biological Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">First Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="E.g., Zainab"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                        required
                      />
                      <User className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Last Name / Surname <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="E.g., Bello"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                        required
                      />
                      <User className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Middle Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="E.g., Chioma"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                      />
                      <User className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGender('MALE')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          gender === 'MALE'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-inner'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setGender('FEMALE')}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          gender === 'FEMALE'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-inner'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Date of Birth</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                      />
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Class Level <span className="text-red-500">*</span></label>
                    <div className="relative">
                      {loadingClasses ? (
                        <div className="flex items-center gap-1.5 py-3 text-slate-500 text-xs font-semibold">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Classes...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                          disabled={!selectedSchoolId}
                          required
                        >
                          <option value="">Choose Class</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <GraduationCap className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>

                {/* Passport Photo Selector */}
                <div className="pt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Passport Photograph</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="w-16 h-16 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden flex-shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <FileImage className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-colors shadow-md border border-slate-700/50">
                          <Upload className="w-3 h-3 inline-block mr-1.5 -mt-0.5" />
                          Choose Picture File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                        {photoPreview && (
                          <button
                            type="button"
                            onClick={() => { setPassportPhoto(null); setPhotoPreview(null); }}
                            className="text-xs text-red-400 hover:text-red-300 font-bold"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">Supports JPG, PNG (Max size: 2MB). Direct Base64 upload.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Guardian / Contact Profile */}
              <div className="p-5 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-4">
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  3. Primary Contact / Guardian Profile
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Guardian Email Address</label>
                    <div className="relative">
                      <input
                        type="email"
                        placeholder="parent@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                      />
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Guardian Phone Number</label>
                    <div className="relative">
                      <input
                        type="tel"
                        placeholder="E.g., +234 803 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 placeholder-slate-600"
                      />
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3.5 text-slate-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing Application...
                  </>
                ) : (
                  'Submit Admission Application'
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <span>© 2026 Academic Result Automation SaaS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Secure Sessions Enabled</span>
            <span>GDPR/NDPR Isolated Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
