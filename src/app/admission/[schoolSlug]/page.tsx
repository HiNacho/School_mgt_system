'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, User, BookOpen, Users, HeartPulse, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, UploadCloud, Save, RefreshCw, AlertCircle, Sparkles,
  Search, ShieldCheck, Check, Info, FileCheck, Phone, Mail, MapPin, Calendar, Clock
} from 'lucide-react';

interface FormStepProps {
  school: any;
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  nextStep: () => void;
  prevStep: () => void;
  isSubmitting: boolean;
}

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function StudentAdmissionContent({ schoolSlug }: { schoolSlug: string }) {
  const searchParams = useSearchParams();
  const refParam = searchParams.get('ref');

  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedMsg, setDraftSavedMsg] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [correctionNotesBanner, setCorrectionNotesBanner] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    passportPhoto: '',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    nationality: 'Nigerian',
    stateOfOrigin: '',
    lga: '',
    religion: '',
    address: '',
    phone: '',
    email: '',

    // Step 2: Academic
    className: 'Primary 1',
    previousSchool: '',
    previousClass: '',
    isTransfer: false,
    category: 'DAY',
    house: '',

    // Step 3: Parent
    fatherName: '',
    fatherPhone: '',
    fatherEmail: '',
    fatherOccupation: '',
    motherName: '',
    motherPhone: '',
    motherEmail: '',
    motherOccupation: '',
    guardianFirstName: '',
    guardianLastName: '',
    guardianRelationship: 'FATHER',
    guardianPhone: '',
    guardianEmail: '',
    guardianDateOfBirth: '',
    guardianOccupation: '',
    guardianAddress: '',

    // Step 4: Medical
    bloodGroup: 'O+',
    genotype: 'AA',
    allergies: '',
    chronicIllnesses: '',
    medications: '',
    disabilities: '',
    emergencyInstructions: '',
    medicalNotes: '',

    // Step 5: Documents
    documents: [] as { name: string; type: string; url: string; mimeType: string; size: number }[],

    // Reference ID if resuming draft or updating application
    referenceNumber: ''
  });

  // Fetch School Info & Existing Application (if refParam supplied)
  useEffect(() => {
    async function loadSchoolAndApp() {
      try {
        const res = await fetch(`/api/schools?slug=${schoolSlug}`);
        const json = await res.json();
        if (!res.ok || !json.data) throw new Error('School not found or inactive');
        setSchool(json.data);

        if (refParam) {
          const appRes = await fetch(`/api/applications/track?ref=${encodeURIComponent(refParam)}`);
          const appJson = await appRes.json();
          if (appRes.ok && appJson.data?.parsedData) {
            setFormData(prev => ({
              ...prev,
              ...appJson.data.parsedData,
              referenceNumber: appJson.data.referenceNumber
            }));
            if (appJson.data.correctionNotes) {
              setCorrectionNotesBanner(appJson.data.correctionNotes);
            }
          }
        } else {
          // Load saved draft if exists
          const savedDraft = localStorage.getItem(`operon_admission_draft_${schoolSlug}`);
          if (savedDraft) {
            try {
              const parsed = JSON.parse(savedDraft);
              setFormData(prev => ({ ...prev, ...parsed }));
            } catch (e) {}
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load admission portal.');
      } finally {
        setLoading(false);
      }
    }
    loadSchoolAndApp();
  }, [schoolSlug, refParam]);

  // Auto-Save Draft to LocalStorage every 6 seconds
  useEffect(() => {
    if (!school || submittedRef) return;
    const timer = setInterval(() => {
      localStorage.setItem(`operon_admission_draft_${schoolSlug}`, JSON.stringify(formData));
      setDraftSavedMsg(true);
      setTimeout(() => setDraftSavedMsg(false), 2000);
    }, 8000);
    return () => clearInterval(timer);
  }, [formData, school, schoolSlug, submittedRef]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds maximum allowed limit of 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = ev => {
      const base64Url = ev.target?.result as string;
      if (docType === 'PASSPORT') {
        setFormData(prev => ({ ...prev, passportPhoto: base64Url }));
      } else {
        setFormData(prev => ({
          ...prev,
          documents: [
            ...prev.documents.filter(d => d.type !== docType),
            { name: file.name, type: docType, url: base64Url, mimeType: file.type, size: file.size }
          ]
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const validateStep = (step: number): boolean => {
    setError('');
    if (step === 1) {
      if (!formData.firstName.trim()) {
        setError('Please fill in Student First Name before proceeding.');
        return false;
      }
      if (!formData.lastName.trim()) {
        setError('Please fill in Student Last Name / Surname before proceeding.');
        return false;
      }
      if (!formData.gender) {
        setError('Please select Student Gender.');
        return false;
      }
      if (!formData.dateOfBirth) {
        setError('Please select Student Date of Birth.');
        return false;
      }
      if (!formData.address.trim()) {
        setError('Please fill in Student Residential Address.');
        return false;
      }
    }

    if (step === 2) {
      if (!formData.className) {
        setError('Please select the Applying Class.');
        return false;
      }
      if (!formData.category) {
        setError('Please select Student Category (Day or Boarding).');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.guardianFirstName.trim()) {
        setError('Please fill in Primary Guardian First Name.');
        return false;
      }
      if (!formData.guardianLastName.trim()) {
        setError('Please fill in Primary Guardian Last Name.');
        return false;
      }
      if (!formData.guardianPhone.trim()) {
        setError('Please fill in Primary Guardian Phone Number.');
        return false;
      }
      if (!formData.guardianEmail.trim()) {
        setError('Please fill in Primary Guardian Email Address.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.guardianEmail.trim())) {
        setError('Please enter a valid Guardian Email Address (e.g. name@example.com).');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep(prev => Math.min(prev + 1, 6));
    }
  };

  const handleSubmitApplication = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const applicantName = `${formData.firstName} ${formData.lastName}`.trim();
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          type: 'STUDENT',
          applicantName,
          applicantEmail: formData.guardianEmail || formData.email || null,
          applicantPhone: formData.guardianPhone || formData.phone || null,
          applyingClass: formData.className,
          applicationData: formData,
          uploadedDocuments: formData.documents,
          isDraft: false,
          referenceNumber: formData.referenceNumber || undefined
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit application');

      localStorage.removeItem(`operon_admission_draft_${schoolSlug}`);
      setSubmittedRef(json.data.referenceNumber);
    } catch (err: any) {
      setError(err.message || 'Error submitting application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Academic Info', icon: BookOpen },
    { number: 3, title: 'Parent Info', icon: Users },
    { number: 4, title: 'Medical Info', icon: HeartPulse },
    { number: 5, title: 'Documents', icon: FileText },
    { number: 6, title: 'Review & Submit', icon: CheckCircle2 },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs font-bold tracking-widest uppercase">Loading Admission Portal...</p>
      </div>
    );
  }

  if (error && !school) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-6">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <h2 className="text-lg font-black">Portal Access Error</h2>
          <p className="text-slate-400 text-xs font-semibold">{error}</p>
          <Link href="/" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all">
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* Header Banner */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt={school.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-700 bg-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white text-lg shadow-lg">
                {school?.name?.[0] || 'S'}
              </div>
            )}
            <div>
              <h1 className="font-black text-base text-white tracking-tight">{school?.name}</h1>
              <p className="text-xs text-emerald-400 font-semibold">{school?.motto || 'Official Student Admission & Registration Portal'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {draftSavedMsg && (
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full animate-fadeIn">
                <Save className="w-3 h-3" /> Draft Saved
              </span>
            )}
            <Link href={`/track-application`} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all">
              <Search className="w-3.5 h-3.5 text-blue-400" /> Track Application
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* SUCCESS SUBMITTED VIEW */}
        {submittedRef ? (
          <div className="bg-slate-900 border border-emerald-800/50 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Submission Received</span>
              <h2 className="text-2xl font-black text-white">Student Application Submitted Successfully!</h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                Your admission application for <strong className="text-slate-200">{formData.firstName} {formData.lastName}</strong> has been transmitted to the school administration desk.
              </p>
            </div>

            {/* Reference Number Box */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Application Reference Number</p>
              <p className="text-xl font-black text-emerald-400 font-mono tracking-wider">{submittedRef}</p>
              <p className="text-[11px] text-slate-400 pt-1">Save this reference number to track review progress.</p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
              <Link href={`/track-application?ref=${submittedRef}`} className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all">
                <Search className="w-4 h-4" /> Track Status Online
              </Link>
              <button 
                type="button"
                onClick={() => { setSubmittedRef(null); setCurrentStep(1); }}
                className="px-6 py-3 rounded-2xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Step Wizard Progress Bar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl">
              <div className="grid grid-cols-6 gap-2">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const isActive = currentStep === s.number;
                  const isCompleted = currentStep > s.number;
                  return (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => isCompleted && setCurrentStep(s.number)}
                      disabled={!isCompleted && currentStep !== s.number}
                      className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-400' 
                          : isCompleted 
                            ? 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800' 
                            : 'text-slate-600 opacity-60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isActive 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' 
                          : isCompleted 
                            ? 'bg-emerald-950 border border-emerald-700 text-emerald-400' 
                            : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className="text-[10px] font-bold hidden md:inline tracking-tight text-center">{s.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Correction Request Notes Banner */}
            {correctionNotesBanner && (
              <div className="bg-purple-950/80 border border-purple-800 rounded-3xl p-5 text-purple-200 text-xs font-semibold space-y-1.5 shadow-xl animate-fadeIn">
                <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-purple-400" /> Admin Correction Requested for {formData.referenceNumber}
                </div>
                <p className="leading-relaxed text-slate-200">{correctionNotesBanner}</p>
                <p className="text-[11px] text-purple-400 font-bold pt-1">Your previously submitted details have been pre-filled below. Please update the requested information and click "Submit Application Now" to return to Pending Review.</p>
              </div>
            )}

            {/* Step Content Container */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              
              {/* STEP 1: PERSONAL INFORMATION */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-emerald-400" /> Student Personal Information
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Enter the student's legal name, birth details, and residential address.
                    </p>
                  </div>

                  {/* Passport Photo Upload Box */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950 border border-slate-800">
                    <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center overflow-hidden bg-slate-900 relative group">
                      {formData.passportPhoto ? (
                        <img src={formData.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div className="space-y-2 text-center sm:text-left">
                      <h4 className="text-xs font-bold text-white">Student Passport Photo</h4>
                      <p className="text-[11px] text-slate-400">Clear front-facing portrait photo (JPEG or PNG, max 5MB).</p>
                      <label className="inline-block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all">
                        Browse Photo
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'PASSPORT')} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">First Name *</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleFieldChange} placeholder="e.g. Marilyn" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Middle Name</label>
                      <input type="text" name="middleName" value={formData.middleName} onChange={handleFieldChange} placeholder="e.g. Charlotte" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Last Name / Surname *</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleFieldChange} placeholder="e.g. Kalba" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Gender *</label>
                      <select name="gender" value={formData.gender} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Date of Birth *</label>
                      <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Nationality</label>
                      <input type="text" name="nationality" value={formData.nationality} onChange={handleFieldChange} placeholder="Nigerian" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">State of Origin</label>
                      <input type="text" name="stateOfOrigin" value={formData.stateOfOrigin} onChange={handleFieldChange} placeholder="e.g. Nasarawa" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Local Government Area (LGA)</label>
                      <input type="text" name="lga" value={formData.lga} onChange={handleFieldChange} placeholder="e.g. Karu" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Religion (Optional)</label>
                      <input type="text" name="religion" value={formData.religion} onChange={handleFieldChange} placeholder="e.g. Christianity / Islam" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Residential Address *</label>
                    <textarea name="address" rows={2} value={formData.address} onChange={handleFieldChange} placeholder="Full street address..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                  </div>
                </div>
              )}

              {/* STEP 2: ACADEMIC INFORMATION */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-400" /> Academic & Class Preferences
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Specify the target class, previous academic history, and residential type.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Applying Class *</label>
                      <select name="className" value={formData.className} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                        <option value="Creche">Creche / Nursery</option>
                        <option value="Reception">Reception</option>
                        <option value="Primary 1">Primary 1</option>
                        <option value="Primary 2">Primary 2</option>
                        <option value="Primary 3">Primary 3</option>
                        <option value="Primary 4">Primary 4</option>
                        <option value="Primary 5">Primary 5</option>
                        <option value="JSS 1">JSS 1</option>
                        <option value="JSS 2">JSS 2</option>
                        <option value="JSS 3">JSS 3</option>
                        <option value="SSS 1">SSS 1</option>
                        <option value="SSS 2">SSS 2</option>
                        <option value="SSS 3">SSS 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Student Category *</label>
                      <select name="category" value={formData.category} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                        <option value="DAY">Day Student</option>
                        <option value="BOARDING">Boarding Student</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Previous School Attended</label>
                      <input type="text" name="previousSchool" value={formData.previousSchool} onChange={handleFieldChange} placeholder="e.g. Model Primary School" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Previous Class Completed</label>
                      <input type="text" name="previousClass" value={formData.previousClass} onChange={handleFieldChange} placeholder="e.g. Primary 4" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white">Transfer Student Status</h4>
                      <p className="text-[11px] text-slate-400">Is the student transferring from another institution mid-session?</p>
                    </div>
                    <input type="checkbox" name="isTransfer" checked={formData.isTransfer} onChange={handleFieldChange} className="w-5 h-5 rounded accent-emerald-500 cursor-pointer" />
                  </div>
                </div>
              )}

              {/* STEP 3: PARENT / GUARDIAN INFORMATION */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-400" /> Parent & Guardian Information
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Guardian details will automatically provision system logins & link multi-child wards.
                    </p>
                  </div>

                  {/* Primary Guardian Section */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Primary Guardian Contact</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Guardian First Name *</label>
                        <input type="text" name="guardianFirstName" value={formData.guardianFirstName} onChange={handleFieldChange} placeholder="e.g. Charles" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Guardian Last Name *</label>
                        <input type="text" name="guardianLastName" value={formData.guardianLastName} onChange={handleFieldChange} placeholder="e.g. Kalba" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Relationship *</label>
                        <select name="guardianRelationship" value={formData.guardianRelationship} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                          <option value="FATHER">Father</option>
                          <option value="MOTHER">Mother</option>
                          <option value="GUARDIAN">Legal Guardian</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Guardian Phone *</label>
                        <input type="tel" name="guardianPhone" value={formData.guardianPhone} onChange={handleFieldChange} placeholder="+2348012345678" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Guardian Email Address *</label>
                        <input type="email" name="guardianEmail" value={formData.guardianEmail} onChange={handleFieldChange} placeholder="guardian@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Guardian Date of Birth</label>
                        <input type="date" name="guardianDateOfBirth" value={formData.guardianDateOfBirth} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Occupation</label>
                        <input type="text" name="guardianOccupation" value={formData.guardianOccupation} onChange={handleFieldChange} placeholder="e.g. Civil Engineer" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">Residential Address</label>
                        <input type="text" name="guardianAddress" value={formData.guardianAddress} onChange={handleFieldChange} placeholder="Home Address..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: MEDICAL INFORMATION */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-emerald-400" /> Student Medical Profile
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Provide health details, allergies, and emergency medical instructions.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Blood Group</label>
                      <select name="bloodGroup" value={formData.bloodGroup} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Genotype</label>
                      <select name="genotype" value={formData.genotype} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold">
                        <option value="AA">AA</option>
                        <option value="AS">AS</option>
                        <option value="SS">SS</option>
                        <option value="AC">AC</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Known Allergies (Food / Meds)</label>
                      <input type="text" name="allergies" value={formData.allergies} onChange={handleFieldChange} placeholder="e.g. Peanuts, Penicillin" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Chronic Illnesses / Conditions</label>
                      <input type="text" name="chronicIllnesses" value={formData.chronicIllnesses} onChange={handleFieldChange} placeholder="e.g. Asthma, Diabetes" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Emergency Medical Instructions</label>
                    <textarea name="emergencyInstructions" rows={2} value={formData.emergencyInstructions} onChange={handleFieldChange} placeholder="Instructions for school nurse or emergency responders..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold" />
                  </div>
                </div>
              )}

              {/* STEP 5: DOCUMENT UPLOAD */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" /> Required Application Documents
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Upload supporting documents (PDF or Images, maximum 5MB per file).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { type: 'BIRTH_CERTIFICATE', title: 'Birth Certificate' },
                      { type: 'PREVIOUS_RESULT', title: 'Previous School Report / Result' },
                      { type: 'TRANSFER_LETTER', title: 'Transfer Letter (If applicable)' },
                      { type: 'MEDICAL_REPORT', title: 'Medical Fitness Report' },
                    ].map(doc => {
                      const uploaded = formData.documents.find(d => d.type === doc.type);
                      return (
                        <div key={doc.type} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                            {uploaded && <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800">Uploaded</span>}
                          </div>
                          {uploaded ? (
                            <p className="text-xs font-semibold text-slate-300 truncate">{uploaded.name}</p>
                          ) : (
                            <p className="text-[11px] text-slate-500 font-semibold">No file selected</p>
                          )}
                          <label className="inline-block px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all">
                            {uploaded ? 'Replace File' : 'Select File'}
                            <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, doc.type)} className="hidden" />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 6: REVIEW & SUBMIT */}
              {currentStep === 6 && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Review Application Details
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Verify all entered details before transmitting your application.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <h4 className="font-extrabold text-emerald-400 uppercase tracking-widest text-[10px]">Student Biodata</h4>
                      <p><strong className="text-slate-400">Name:</strong> {formData.firstName} {formData.middleName} {formData.lastName}</p>
                      <p><strong className="text-slate-400">Gender / DOB:</strong> {formData.gender} | {formData.dateOfBirth}</p>
                      <p><strong className="text-slate-400">Applying Class:</strong> {formData.className}</p>
                      <p><strong className="text-slate-400">Category:</strong> {formData.category}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <h4 className="font-extrabold text-emerald-400 uppercase tracking-widest text-[10px]">Guardian Contact</h4>
                      <p><strong className="text-slate-400">Guardian:</strong> {formData.guardianFirstName} {formData.guardianLastName}</p>
                      <p><strong className="text-slate-400">Phone:</strong> {formData.guardianPhone}</p>
                      <p><strong className="text-slate-400">Email:</strong> {formData.guardianEmail}</p>
                      <p><strong className="text-slate-400">Address:</strong> {formData.guardianAddress}</p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold">
                    <p>By submitting this application, I confirm that all information provided is accurate and true to the best of my knowledge.</p>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => { setError(''); setCurrentStep(prev => prev - 1); }}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" /> Previous Step
                  </button>
                ) : <div />}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    Next Step <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitApplication}
                    disabled={isSubmitting}
                    className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isSubmitting ? 'Transmitting Application...' : 'Submit Application Now'}
                  </button>
                )}
              </div>

            </div>
          </>
        )}

      </main>

    </div>
  );
}

export default function StudentAdmissionPortal({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-400" /></div>}>
      <StudentAdmissionContent schoolSlug={resolvedParams.schoolSlug} />
    </Suspense>
  );
}
