'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileCheck, Search, Filter, RefreshCw, CheckCircle2, XCircle, FileEdit, 
  Clock, Eye, User, BookOpen, Users, HeartPulse, FileText, Briefcase, 
  Building2, AlertCircle, Sparkles, Check, ArrowRight, Download, ExternalLink, ShieldCheck
} from 'lucide-react';

interface Application {
  id: string;
  schoolId: string;
  referenceNumber: string;
  type: 'STUDENT' | 'TEACHER' | 'STAFF';
  status: 'DRAFT' | 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  applicantName: string;
  applicantEmail: string | null;
  applicantPhone: string | null;
  applyingClass: string | null;
  department: string | null;
  applicationData: string;
  uploadedDocuments: string | null;
  reviewNotes: string | null;
  correctionNotes: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  updatedAt: string;
}

export default function ApplicationsDashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Application Modal State
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [parsedData, setParsedData] = useState<any>({});
  const [parsedDocs, setParsedDocs] = useState<any[]>([]);

  // Action Dialog State
  const [activeModalAction, setActiveModalAction] = useState<'NONE' | 'APPROVE' | 'REJECT' | 'CORRECTION'>('NONE');
  const [reviewNotesInput, setReviewNotesInput] = useState('');
  const [correctionNotesInput, setCorrectionNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [provisionedResult, setProvisionedResult] = useState<any>(null);

  // Load Session
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try { setSession(JSON.parse(sessionStr)); } catch (e) {}
    }
  }, []);

  // Fetch Applications List
  const fetchApplications = async () => {
    if (!session?.school?.id) return;
    setLoading(true);
    setError('');

    try {
      const url = `/api/applications?schoolId=${session.school.id}&status=${statusFilter}&type=${typeFilter}&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('report_auth_token')}`
        }
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch applications');

      setApplications(json.data || []);
      setStats(json.stats || null);
    } catch (err: any) {
      setError(err.message || 'Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.school?.id) {
      fetchApplications();
    }
  }, [session, typeFilter, statusFilter]);

  const handleOpenAppDetails = (app: Application) => {
    setSelectedApp(app);
    setReviewNotesInput(app.reviewNotes || '');
    setCorrectionNotesInput(app.correctionNotes || '');
    setRejectionReasonInput(app.rejectionReason || '');
    setProvisionedResult(null);
    setActiveModalAction('NONE');

    try {
      setParsedData(JSON.parse(app.applicationData || '{}'));
      setParsedDocs(JSON.parse(app.uploadedDocuments || '[]'));
    } catch (e) {
      setParsedData({});
      setParsedDocs([]);
    }
  };

  const handleExecuteReviewAction = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION') => {
    if (!selectedApp) return;

    if (action === 'REJECT' && !rejectionReasonInput.trim()) {
      alert('Please specify a rejection reason.');
      return;
    }
    if (action === 'REQUEST_CORRECTION' && !correctionNotesInput.trim()) {
      alert('Please specify the correction notes for the applicant.');
      return;
    }

    setSubmittingAction(true);
    setError('');
    setActionSuccess('');

    try {
      const res = await fetch(`/api/applications/${selectedApp.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('report_auth_token')}`
        },
        body: JSON.stringify({
          action,
          reviewNotes: reviewNotesInput,
          correctionNotes: correctionNotesInput,
          rejectionReason: rejectionReasonInput
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to process application action');

      setActionSuccess(json.message || 'Action executed successfully!');
      if (action === 'APPROVE' && json.data?.provisionedRecord) {
        setProvisionedResult(json.data);
      } else {
        setTimeout(() => {
          setSelectedApp(null);
          fetchApplications();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Error processing application action');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 border border-amber-200 text-amber-700 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 border border-blue-200 text-blue-700 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> Reviewing</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 border border-red-200 text-red-700 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'CORRECTION_REQUESTED':
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 border border-purple-200 text-purple-700 flex items-center gap-1"><FileEdit className="w-3 h-3" /> Correction Requested</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'STUDENT':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">Student</span>;
      case 'TEACHER':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase">Teacher</span>;
      case 'STAFF':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase">Staff</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 selection:bg-emerald-100 selection:text-emerald-900 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div>
          <div className="flex items-center gap-2 text-emerald-600">
            <FileCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Admissions & Recruitment</span>
          </div>
          <h1 className="text-2xl font-normal text-slate-900 tracking-tight mt-1">Pending Applications & Registrations</h1>
          <p className="text-slate-500 text-xs font-semibold mt-0.5">
            Review public student admissions, teacher applications, and staff registrations before auto-provisioning accounts.
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </button>
      </div>

      {/* Public Shareable Registration Links Banner */}
      {session?.school?.slug && (
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <Sparkles className="w-4 h-4" /> Shareable Public Registration Links
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Tenant: {session.school.slug}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
            {/* Student Admission Link */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Student Admission</span>
                <p className="text-slate-300 text-xs font-mono truncate pt-1">{`/admission/${session.school.slug}`}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <a href={`/admission/${session.school.slug}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] text-center flex justify-center items-center gap-1 transition-all">
                  <ExternalLink className="w-3 h-3" /> Open Portal
                </a>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/admission/${session.school.slug}`); alert('Student Admission link copied!'); }} className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold">
                  Copy
                </button>
              </div>
            </div>

            {/* Teacher Registration Link */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400">Teacher Registration</span>
                <p className="text-slate-300 text-xs font-mono truncate pt-1">{`/teacher-registration/${session.school.slug}`}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <a href={`/teacher-registration/${session.school.slug}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] text-center flex justify-center items-center gap-1 transition-all">
                  <ExternalLink className="w-3 h-3" /> Open Portal
                </a>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/teacher-registration/${session.school.slug}`); alert('Teacher Registration link copied!'); }} className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold">
                  Copy
                </button>
              </div>
            </div>

            {/* Staff Registration Link */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400">Staff Registration</span>
                <p className="text-slate-300 text-xs font-mono truncate pt-1">{`/staff-registration/${session.school.slug}`}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <a href={`/staff-registration/${session.school.slug}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] text-center flex justify-center items-center gap-1 transition-all">
                  <ExternalLink className="w-3 h-3" /> Open Portal
                </a>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/staff-registration/${session.school.slug}`); alert('Staff Registration link copied!'); }} className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold">
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Counter Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Apps</p>
            <p className="text-xl font-black text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Review</p>
            <p className="text-xl font-black text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Approved</p>
            <p className="text-xl font-black text-emerald-600">{stats.approved}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Correction Req.</p>
            <p className="text-xl font-black text-purple-600">{stats.correctionRequested}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Rejected</p>
            <p className="text-xl font-black text-red-600">{stats.rejected}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Students / Teachers</p>
            <p className="text-xl font-black text-blue-600">{stats.studentCount} / {stats.teacherCount}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchApplications()}
            placeholder="Search ref #, name, email..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-300 font-semibold"
          />
        </div>

        {/* Type & Status Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Application Types</option>
            <option value="STUDENT">Students Only</option>
            <option value="TEACHER">Teachers Only</option>
            <option value="STAFF">Non-Teaching Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CORRECTION_REQUESTED">Correction Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs font-bold">Loading Applications Registry...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileCheck className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">No applications match your criteria.</p>
            <p className="text-xs text-slate-400">Applications submitted via public links will appear here for review.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-4">Ref Number</th>
                  <th className="p-4">Applicant Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Target Class / Dept</th>
                  <th className="p-4">Contact Details</th>
                  <th className="p-4">Submitted Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{app.referenceNumber}</td>
                    <td className="p-4 font-bold text-slate-900">{app.applicantName}</td>
                    <td className="p-4">{getTypeBadge(app.type)}</td>
                    <td className="p-4">{app.applyingClass || app.department || 'N/A'}</td>
                    <td className="p-4 text-slate-500">
                      <div>{app.applicantPhone || 'No Phone'}</div>
                      <div className="text-[11px] text-slate-400">{app.applicantEmail || ''}</div>
                    </td>
                    <td className="p-4 text-slate-500">{new Date(app.submittedAt).toLocaleDateString()}</td>
                    <td className="p-4">{getStatusBadge(app.status)}</td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenAppDetails(app)}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer shadow-sm transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED APPLICATION REVIEW MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">{selectedApp.referenceNumber}</span>
                  {getTypeBadge(selectedApp.type)}
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">{selectedApp.applicantName}</h2>
                <p className="text-xs text-slate-500 font-semibold">{session?.school?.name}</p>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 font-bold flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {actionSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Provisioning Success Summary Box */}
              {provisionedResult && (
                <div className="p-5 rounded-2xl bg-emerald-950 text-white space-y-3 shadow-xl">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Sparkles className="w-5 h-5" /> Account Auto-Provisioned Successfully!
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold pt-1">
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Assigned Username</p>
                      <p className="font-mono text-white text-sm">{provisionedResult.generatedUsername}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px] uppercase font-bold">Temporary Password</p>
                      <p className="font-mono text-emerald-400 text-sm">{provisionedResult.temporaryPassword}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300">A welcome email with login credentials has been sent to {selectedApp.applicantEmail || 'applicant'}.</p>
                  <button
                    onClick={() => { setSelectedApp(null); fetchApplications(); }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                  >
                    Done & Close
                  </button>
                </div>
              )}

              {/* Applicant Profile Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400">Applicant Info</h4>
                  <p><strong className="text-slate-500">Full Name:</strong> {selectedApp.applicantName}</p>
                  <p><strong className="text-slate-500">Gender / DOB:</strong> {parsedData.gender || 'N/A'} | {parsedData.dateOfBirth || 'N/A'}</p>
                  <p><strong className="text-slate-500">Email:</strong> {selectedApp.applicantEmail || 'N/A'}</p>
                  <p><strong className="text-slate-500">Phone:</strong> {selectedApp.applicantPhone || 'N/A'}</p>
                  <p><strong className="text-slate-500">Target Class/Dept:</strong> {selectedApp.applyingClass || selectedApp.department || 'N/A'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400">Parent / Guardian Contact</h4>
                  <p><strong className="text-slate-500">Guardian Name:</strong> {parsedData.guardianFirstName} {parsedData.guardianLastName}</p>
                  <p><strong className="text-slate-500">Guardian Phone:</strong> {parsedData.guardianPhone || 'N/A'}</p>
                  <p><strong className="text-slate-500">Guardian Email:</strong> {parsedData.guardianEmail || 'N/A'}</p>
                  <p><strong className="text-slate-500">Address:</strong> {parsedData.guardianAddress || parsedData.address || 'N/A'}</p>
                </div>
              </div>

              {/* Uploaded Documents List */}
              <div className="space-y-3">
                <h4 className="font-extrabold uppercase tracking-widest text-[10px] text-slate-400">Uploaded Documents ({parsedDocs.length})</h4>
                {parsedDocs.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic">No external documents uploaded.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {parsedDocs.map((doc, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900 truncate max-w-[180px]">{doc.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-extrabold">{doc.type}</p>
                        </div>
                        {doc.url && (
                          <a
                            href={doc.url}
                            download={doc.name}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Internal Admin Notes</label>
                <textarea
                  rows={2}
                  value={reviewNotesInput}
                  onChange={(e) => setReviewNotesInput(e.target.value)}
                  placeholder="Notes visible only to school administrators..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none font-semibold"
                />
              </div>

              {/* ACTION DIALOG FORMS */}
              {activeModalAction === 'REJECT' && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-3 animate-fadeIn">
                  <h4 className="font-bold text-red-900 text-xs flex items-center gap-1.5"><XCircle className="w-4 h-4 text-red-600" /> Specify Rejection Reason</h4>
                  <textarea
                    rows={2}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="State reason for rejecting application..."
                    className="w-full bg-white border border-red-200 rounded-xl p-3 text-xs text-slate-800 font-semibold focus:outline-none"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteReviewAction('REJECT')}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Rejection
                    </button>
                    <button onClick={() => setActiveModalAction('NONE')} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Cancel</button>
                  </div>
                </div>
              )}

              {activeModalAction === 'CORRECTION' && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-3 animate-fadeIn">
                  <h4 className="font-bold text-purple-900 text-xs flex items-center gap-1.5"><FileEdit className="w-4 h-4 text-purple-600" /> Specify Required Correction Notes</h4>
                  <textarea
                    rows={2}
                    value={correctionNotesInput}
                    onChange={(e) => setCorrectionNotesInput(e.target.value)}
                    placeholder="List specific fields or documents the applicant must update..."
                    className="w-full bg-white border border-purple-200 rounded-xl p-3 text-xs text-slate-800 font-semibold focus:outline-none"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteReviewAction('REQUEST_CORRECTION')}
                      disabled={submittingAction}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                    >
                      Send Correction Request
                    </button>
                    <button onClick={() => setActiveModalAction('NONE')} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Cancel</button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer Actions */}
            {!provisionedResult && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveModalAction('CORRECTION')}
                    className="px-4 py-2.5 rounded-xl border border-purple-200 hover:bg-purple-50 text-purple-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Request Correction
                  </button>
                  <button
                    onClick={() => setActiveModalAction('REJECT')}
                    className="px-4 py-2.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Reject Application
                  </button>
                </div>

                <button
                  onClick={() => handleExecuteReviewAction('APPROVE')}
                  disabled={submittingAction}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {submittingAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submittingAction ? 'Auto-Provisioning Account...' : 'Approve & Auto-Provision Account'}
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
