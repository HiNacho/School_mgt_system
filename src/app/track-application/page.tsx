'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, CheckCircle2, Clock, AlertTriangle, XCircle, FileEdit, 
  ArrowLeft, RefreshCw, Sparkles, Building2, User, Phone, Mail, Calendar, ShieldCheck
} from 'lucide-react';

function ApplicationTrackerContent() {
  const searchParams = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [refNumber, setRefNumber] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [appData, setAppData] = useState<any>(null);

  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!refNumber.trim()) {
      setError('Please enter your Application Reference Number');
      return;
    }

    setLoading(true);
    setError('');
    setAppData(null);

    try {
      const res = await fetch(`/api/applications/track?ref=${encodeURIComponent(refNumber.trim())}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to locate application');
      setAppData(json.data);
    } catch (err: any) {
      setError(err.message || 'Application not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      handleTrackSearch();
    }
  }, [initialRef]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending Admin Review</span>;
      case 'UNDER_REVIEW':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Under Verification</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Admission Approved & Provisioned</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Application Rejected</span>;
      case 'CORRECTION_REQUESTED':
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center gap-1.5"><FileEdit className="w-3.5 h-3.5" /> Correction Requested</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-white font-black text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Operon Application Tracker</span>
          </Link>
          <Link href="/login" className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all">
            Portal Sign In
          </Link>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Search Header Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white">Track Admission & Application Status</h1>
            <p className="text-xs text-slate-400 font-semibold">
              Enter your Application Reference Number (e.g. <span className="text-emerald-400 font-mono">APP-STU-2026-9812</span>) to view real-time progress.
            </p>
          </div>

          <form onSubmit={handleTrackSearch} className="flex gap-2 max-w-md mx-auto pt-2">
            <input
              type="text"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. APP-STU-2026-9812"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Track</span>
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-bold max-w-md mx-auto flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Application Details Card */}
        {appData && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            
            {/* Top Info Banner */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">{appData.referenceNumber}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">({appData.type})</span>
                </div>
                <h2 className="text-xl font-black text-white">{appData.applicantName}</h2>
                <p className="text-xs text-slate-400 font-semibold">{appData.schoolName}</p>
              </div>

              <div>
                {getStatusBadge(appData.status)}
              </div>
            </div>

            {/* Application Timeline Progress */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Application Progress Timeline</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                {appData.timeline.map((item: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-2xl border space-y-2 relative transition-all ${
                      item.completed 
                        ? 'bg-slate-950 border-emerald-500/40 text-emerald-300' 
                        : 'bg-slate-950/50 border-slate-800 text-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-extrabold uppercase">{item.step}</span>
                      {item.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-slate-600" />}
                    </div>
                    <p className="text-xs font-bold text-slate-200">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Correction Notes Alert if Action Required */}
            {appData.status === 'CORRECTION_REQUESTED' && appData.correctionNotes && (
              <div className="p-5 rounded-2xl bg-purple-950/50 border border-purple-800/60 space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-black text-xs">
                  <FileEdit className="w-4 h-4 text-purple-400" /> Action Required: Correction Notes
                </div>
                <p className="text-slate-300 text-xs font-semibold leading-relaxed">{appData.correctionNotes}</p>
                <div className="pt-2">
                  <Link 
                    href={
                      appData.type === 'TEACHER' 
                        ? `/teacher-registration/${appData.schoolSlug}?ref=${appData.referenceNumber}`
                        : appData.type === 'STAFF'
                        ? `/staff-registration/${appData.schoolSlug}?ref=${appData.referenceNumber}`
                        : `/admission/${appData.schoolSlug}?ref=${appData.referenceNumber}`
                    } 
                    className="inline-block px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    Edit & Resubmit Application
                  </Link>
                </div>
              </div>
            )}

            {/* Rejection Reason Alert */}
            {appData.status === 'REJECTED' && appData.rejectionReason && (
              <div className="p-5 rounded-2xl bg-red-950/50 border border-red-800/60 space-y-2">
                <div className="flex items-center gap-2 text-red-300 font-black text-xs">
                  <XCircle className="w-4 h-4 text-red-400" /> Application Decision: Not Approved
                </div>
                <p className="text-slate-300 text-xs font-semibold leading-relaxed">{appData.rejectionReason}</p>
              </div>
            )}

            {/* Application Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Contact Details</h4>
                <p><strong className="text-slate-500">Email:</strong> {appData.applicantEmail || 'N/A'}</p>
                <p><strong className="text-slate-500">Phone:</strong> {appData.applicantPhone || 'N/A'}</p>
                <p><strong className="text-slate-500">Target Class/Dept:</strong> {appData.applyingClass || appData.department || 'N/A'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Submission Timestamps</h4>
                <p><strong className="text-slate-500">Submitted Date:</strong> {new Date(appData.submittedAt).toLocaleDateString()}</p>
                <p><strong className="text-slate-500">Last Status Update:</strong> {new Date(appData.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>

          </div>
        )}

      </main>

    </div>
  );
}

export default function ApplicationTrackerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-emerald-400" /></div>}>
      <ApplicationTrackerContent />
    </Suspense>
  );
}
