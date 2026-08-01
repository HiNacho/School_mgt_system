'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, User, BookOpen, Briefcase, Award, FileText, CheckCircle2, 
  ArrowRight, ArrowLeft, UploadCloud, Save, RefreshCw, AlertCircle, Sparkles,
  Search, ShieldCheck, Check, Info, FileCheck, Phone, Mail, MapPin, Calendar, Clock
} from 'lucide-react';

export default function TeacherRegistrationPortal({ params }: { params: Promise<{ schoolSlug: string }> }) {
  const resolvedParams = use(params);
  const schoolSlug = resolvedParams.schoolSlug;

  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: 'Mr.',
    firstName: '',
    middleName: '',
    lastName: '',
    gender: 'MALE',
    dateOfBirth: '',
    phone: '',
    email: '',
    address: '',
    trcnNumber: '',
    qualifications: 'B.Ed Mathematics',
    teachingExperienceYears: '5',
    preferredSubjects: 'Mathematics, Further Mathematics',
    preferredClasses: 'JSS 1, JSS 2, SSS 1',
    previousSchool: '',
    employmentHistory: '',
    references: '',
    passportPhoto: '',
    documents: [] as { name: string; type: string; url: string; mimeType: string; size: number }[]
  });

  useEffect(() => {
    async function loadSchool() {
      try {
        const res = await fetch(`/api/schools?slug=${schoolSlug}`);
        const json = await res.json();
        if (!res.ok || !json.data) throw new Error('School not found or inactive');
        setSchool(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load teacher portal.');
      } finally {
        setLoading(false);
      }
    }
    loadSchool();
  }, [schoolSlug]);

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmitApplication = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      alert('Please fill in all required fields (First Name, Last Name, Email, Phone).');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const applicantName = `${formData.title} ${formData.firstName} ${formData.lastName}`.trim();
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          type: 'TEACHER',
          applicantName,
          applicantEmail: formData.email,
          applicantPhone: formData.phone,
          department: 'Academic / Teaching Faculty',
          applicationData: formData,
          uploadedDocuments: formData.documents,
          isDraft: false
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit teacher application');

      setSubmittedRef(json.data.referenceNumber);
    } catch (err: any) {
      setError(err.message || 'Error submitting application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-xs font-bold tracking-widest uppercase">Loading Teacher Portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header Banner */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {school?.logoUrl ? (
              <img src={school.logoUrl} alt={school.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-700 bg-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center font-black text-white text-lg shadow-lg">
                {school?.name?.[0] || 'T'}
              </div>
            )}
            <div>
              <h1 className="font-black text-base text-white tracking-tight">{school?.name}</h1>
              <p className="text-xs text-blue-400 font-semibold">Teacher & Academic Staff Recruitment Portal</p>
            </div>
          </div>

          <Link href={`/track-application`} className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all">
            <Search className="w-3.5 h-3.5 text-blue-400" /> Track Application
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {submittedRef ? (
          <div className="bg-slate-900 border border-blue-800/50 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-blue-400">Application Submitted</span>
              <h2 className="text-2xl font-black text-white">Teacher Application Received!</h2>
              <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                Thank you for applying to join the teaching faculty at <strong className="text-slate-200">{school?.name}</strong>.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-1">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Application Reference Number</p>
              <p className="text-xl font-black text-blue-400 font-mono tracking-wider">{submittedRef}</p>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <Link href={`/track-application?ref=${submittedRef}`} className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                <Search className="w-4 h-4" /> Track Status Online
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="border-b border-slate-800 pb-4">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-400" /> Teaching Position Application Form
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                Fill in your qualifications, teaching experience, TRCN certification, and upload your CV.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title</label>
                <select name="title" value={formData.title} onChange={handleFieldChange} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold">
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleFieldChange} placeholder="First Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Middle Name</label>
                <input type="text" name="middleName" value={formData.middleName} onChange={handleFieldChange} placeholder="Middle Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleFieldChange} placeholder="Last Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleFieldChange} placeholder="teacher@example.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number *</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleFieldChange} placeholder="+2348012345678" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">TRCN Registration Number</label>
                <input type="text" name="trcnNumber" value={formData.trcnNumber} onChange={handleFieldChange} placeholder="e.g. TRCN/NG/129038" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Highest Qualification *</label>
                <input type="text" name="qualifications" value={formData.qualifications} onChange={handleFieldChange} placeholder="e.g. B.Ed Mathematics, M.Sc Education" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Teaching Experience (Years)</label>
                <input type="number" name="teachingExperienceYears" value={formData.teachingExperienceYears} onChange={handleFieldChange} placeholder="5" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Subjects Willing to Teach</label>
                <input type="text" name="preferredSubjects" value={formData.preferredSubjects} onChange={handleFieldChange} placeholder="e.g. Mathematics, Basic Science" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Classes Willing to Teach</label>
                <input type="text" name="preferredClasses" value={formData.preferredClasses} onChange={handleFieldChange} placeholder="e.g. Primary 1 - Primary 5, JSS 1" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-semibold" />
              </div>
            </div>

            {/* Document Uploads */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest">Upload CV & Certificates</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { type: 'CV', title: 'Curriculum Vitae (CV / Resume)' },
                  { type: 'CERTIFICATE', title: 'Degree / Teaching Certificate' },
                ].map(doc => {
                  const uploaded = formData.documents.find(d => d.type === doc.type);
                  return (
                    <div key={doc.type} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-white">{doc.title}</h4>
                        {uploaded && <span className="text-[10px] font-extrabold text-blue-400 bg-blue-950 px-2 py-0.5 rounded-md border border-blue-800">Uploaded</span>}
                      </div>
                      <label className="inline-block px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all">
                        {uploaded ? 'Replace File' : 'Select File (PDF / Image)'}
                        <input type="file" accept=".pdf,image/*" onChange={(e) => handleFileUpload(e, doc.type)} className="hidden" />
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmitApplication}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest flex justify-center items-center gap-2 shadow-xl shadow-blue-600/20 cursor-pointer transition-all disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isSubmitting ? 'Submitting Application...' : 'Submit Teacher Application'}
            </button>

          </div>
        )}

      </main>

    </div>
  );
}
