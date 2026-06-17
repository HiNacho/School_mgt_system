'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Building2, GraduationCap, Mail, Phone, Calendar, 
  Settings, PlayCircle, CheckCircle, Trash2, Star, Send, Eye, X,
  Clock, Activity, BookOpen, AlertCircle, Loader2, ExternalLink
} from 'lucide-react';

interface TesterActivity {
  id: string;
  loginCount: number;
  timeSpent: number; // seconds
  reportCardsGeneratedCount: number;
  attendanceSessionsCount: number;
  resultsViewedCount: number;
  featuresVisited: string;
  lastLogin: string | null;
}

interface Feedback {
  id: string;
  easeOfUse: number;
  design: number;
  usefulness: number;
  mostUsefulFeature: string;
  confusingFeature: string;
  suggestions: string;
  wouldUseInSchool: string;
  wouldPay: string;
  additionalComments: string | null;
  createdAt: string;
}

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  sentAt: string;
}

interface RelatedSchoolUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isFirstLogin: boolean;
}

interface RelatedSchool {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionStatus: string;
  users: RelatedSchoolUser[];
}

interface Lead {
  id: string;
  schoolName: string;
  schoolType: string | null;
  ownershipType: string | null;
  contactName: string;
  position: string | null;
  email: string;
  phone: string | null;
  studentCount: number | null;
  teacherCount: number | null;
  classCount: number | null;
  currentResultMethod: string | null;
  currentAttendanceMethod: string | null;
  biggestChallenge: string | null;
  interestedFeatures: string | null;
  leadStatus: string;
  demoSchoolId: string | null;
  createdAt: string;
  feedback: Feedback | null;
  testerActivity: TesterActivity | null;
  emailLogs: EmailLog[];
  relatedSchools?: RelatedSchool[];
}

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Email form state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Status state
  const [statusVal, setStatusVal] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // General Action Loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Email Preview Modal
  const [previewingEmail, setPreviewingEmail] = useState<EmailLog | null>(null);

  useEffect(() => {
    if (leadId) {
      loadLeadDetails();
    }
  }, [leadId]);

  const loadLeadDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/superadmin/leads/${leadId}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success) {
        setLead(json.data);
        setStatusVal(json.data.leadStatus);
      } else {
        setErrorMsg(json.error || 'Failed to retrieve lead profile.');
      }
    } catch (err) {
      console.error('Fetch Lead Error:', err);
      setErrorMsg('Network error. Failed to load lead details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuperadminAction = async (action: string) => {
    setActionLoading(action);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/superadmin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, action }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Action executed successfully.');
        if (action === 'deleteLead') {
          router.push('/dashboard/tenants/leads');
        } else {
          await loadLeadDetails();
        }
      } else {
        setErrorMsg(json.error || 'Failed to execute requested action.');
      }
    } catch (err) {
      console.error('Superadmin Action Error:', err);
      setErrorMsg('Network error while performing action.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatusVal(newStatus);
    setUpdatingStatus(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, action: 'updateStatus', status: newStatus }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Pipeline status updated successfully.');
        await loadLeadDetails();
      } else {
        setErrorMsg(json.error || 'Failed to update lead status.');
      }
    } catch (err) {
      console.error('Update Status Error:', err);
      setErrorMsg('Network error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSubject || !emailBody) return;
    setSendingEmail(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort: 'CUSTOM',
          customEmail: lead?.email,
          customLeadId: lead?.id,
          subject: emailSubject,
          body: emailBody
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Manual onboarding email sent and logged successfully.');
        setEmailSubject('');
        setEmailBody('');
        await loadLeadDetails(); // Refresh logs
      } else {
        setErrorMsg(json.error || 'Failed to dispatch email.');
      }
    } catch (err) {
      console.error('Send Email Error:', err);
      setErrorMsg('Network error while dispatching email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour(s) ${mins} minute(s)`;
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star 
            key={s} 
            className={`w-3.5 h-3.5 ${s <= rating ? 'fill-amber-500' : 'text-slate-200'}`} 
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing lead details...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-sm font-bold uppercase text-slate-800">Lead Not Found</h3>
        <p className="text-xs text-slate-500">The requested lead registry could not be found or has been deleted.</p>
        <Link href="/dashboard/tenants/leads" className="inline-block px-4 py-2 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-widest">
          Return to CRM
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-left">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <Link 
            href="/dashboard/tenants/leads"
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>BACK TO CRM LEADS</span>
          </Link>
          <h1 className="text-lg font-bold uppercase text-slate-800 tracking-tight mt-2 flex items-center gap-2">
            <span>{lead.schoolName}</span>
            {lead.demoSchoolId && (
              <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200">
                Sandbox Active
              </span>
            )}
          </h1>
          <p className="text-[10px] text-slate-400 font-mono">Lead UUID: {lead.id}</p>
        </div>

        {/* Delete button */}
        <button
          type="button"
          disabled={actionLoading !== null}
          onClick={() => {
            if (window.confirm('Wipe this lead, feedback logs, and active demo environments? This cannot be undone.')) {
              handleSuperadminAction('deleteLead');
            }
          }}
          className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{actionLoading === 'deleteLead' ? 'Deleting...' : 'Delete Lead'}</span>
        </button>
      </div>

      {/* Alert feeds */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs font-bold uppercase tracking-wider">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-150 text-red-800 text-xs font-bold uppercase tracking-wider">
          {errorMsg}
        </div>
      )}

      {/* Columns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Onboarding Profile */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" /> Onboarding Demographics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
              <div className="space-y-2.5">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">School Name</span>
                  <span className="text-slate-800 font-extrabold text-sm">{lead.schoolName}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contact Name</span>
                  <span className="text-slate-800 font-extrabold">{lead.contactName}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Role / Position</span>
                  <span className="text-slate-800 font-bold uppercase tracking-wide text-[10px]">{lead.position || 'Not Provided'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email Address</span>
                  <span className="font-mono text-slate-700">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</span>
                    <span className="font-mono text-slate-700">{lead.phone}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Level</span>
                    <span className="text-slate-700 font-bold">{lead.schoolType || 'COMBINED'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ownership</span>
                    <span className="text-slate-700 font-bold">{lead.ownershipType || 'PRIVATE'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border border-slate-100">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                    <span className="font-mono font-bold text-slate-700">{lead.studentCount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Teachers</span>
                    <span className="font-mono font-bold text-slate-700">{lead.teacherCount || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Classes</span>
                    <span className="font-mono font-bold text-slate-700">{lead.classCount || 'N/A'}</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Registered On</span>
                  <span className="text-slate-650 flex items-center gap-1 font-mono"><Calendar className="w-3.5 h-3.5" /> {new Date(lead.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Active Portal Credentials */}
          {lead.relatedSchools && lead.relatedSchools.length > 0 && (
            <div className="bg-white border-2 border-emerald-500/30 p-6 shadow-sm space-y-4 text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-700 border-b border-emerald-50 pb-2 flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-600 animate-pulse" /> 🔑 Active Portal Credentials
              </h3>
              
              <div className="space-y-4">
                {lead.relatedSchools.map((school) => (
                  <div key={school.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded text-xs space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">School Name / Tenant</span>
                        <span className="text-slate-800 font-extrabold">{school.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Subscription / Status</span>
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {school.subscriptionStatus}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">School Slug (Tenant ID)</span>
                        <code className="bg-slate-200/80 text-[#1e293b] px-1.5 py-0.5 rounded font-mono font-bold text-[10px] break-all">{school.slug}</code>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Access URL</span>
                        <a href="/login" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5">
                          <span>/login</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {school.users && school.users.length > 0 ? (
                      <div className="pt-2 border-t border-slate-100 space-y-3">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Administrator Accounts</span>
                        {school.users.map((u) => (
                          <div key={u.id} className="bg-white p-3 border border-slate-100 shadow-sm rounded relative group space-y-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <span className="block text-[8px] font-semibold text-slate-400 uppercase">Username</span>
                                <span className="font-mono text-slate-700 font-bold">{u.username}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] font-semibold text-slate-400 uppercase">Email</span>
                                <span className="font-mono text-slate-700 font-bold">{u.email}</span>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-slate-50 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="block text-[8px] font-semibold text-slate-400 uppercase">Default Password</span>
                                <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold text-[10px]">password</code>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const credentialsText = `School: ${school.name}\nTenant ID: ${school.slug}\nUsername: ${u.username}\nEmail: ${u.email}\nTemporary Password: password\nLogin URL: http://localhost:3000/login`;
                                  navigator.clipboard.writeText(credentialsText);
                                  alert('Credentials copied to clipboard!');
                                }}
                                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[9px] font-black uppercase tracking-wider cursor-pointer rounded transition-colors animate-in"
                              >
                                Copy Credentials
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="block text-[10px] text-slate-400 italic">No admin user accounts found for this school.</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card 2: Operations & Challenge */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" /> Operational Context
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Result Compilation</span>
                <span className="text-slate-700 font-extrabold bg-slate-50 px-2 py-1 border border-slate-100 rounded block">{lead.currentResultMethod || 'No Central Method'}</span>
              </div>
              <div className="space-y-1">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Current Attendance compilation</span>
                <span className="text-slate-700 font-extrabold bg-slate-50 px-2 py-1 border border-slate-100 rounded block">{lead.currentAttendanceMethod || 'No Central Method'}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Features Interested In</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {lead.interestedFeatures ? (
                  lead.interestedFeatures.split(',').map((f) => (
                    <span key={f} className="px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase tracking-wider">{f.trim()}</span>
                  ))
                ) : (
                  <span className="text-slate-450 italic text-[11px]">No selections captured</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5 bg-slate-50 p-4 border border-slate-100/80">
              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Biggest Operational Challenge</span>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "{lead.biggestChallenge || 'No challenge description provided during registration.'}"
              </p>
            </div>
          </div>

          {/* Card 3: Email Audit Logs */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" /> Communications History Audit
            </h3>

            <div className="overflow-x-auto rounded border border-slate-200/60 shadow-sm text-xs">
              {lead.emailLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-bold italic">
                  No automated emails have been logged for this lead yet.
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-3">Subject</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Dispatched At</th>
                      <th className="p-3 text-right">View</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lead.emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/20 font-semibold text-slate-650">
                        <td className="p-3 max-w-[220px] truncate text-slate-800">{log.subject}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-550">{log.recipient}</td>
                        <td className="p-3 text-[10px] text-slate-400 font-mono">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setPreviewingEmail(log)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-800 cursor-pointer"
                            title="Preview sent email"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Telemetry, feedback and Action Cockpit */}
        <div className="space-y-6">
          
          {/* Card 4: Funnel Control Cockpit */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" /> CRM Action Center
            </h3>

            {/* Pipeline Status Select */}
            <div className="space-y-1 text-xs">
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Pipeline Status</label>
              <select
                disabled={updatingStatus}
                value={statusVal}
                onChange={handleUpdateStatus}
                className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs focus:outline-none focus:border-slate-350 font-bold text-slate-700 hover:border-slate-300 transition-colors"
              >
                <option value="NEW">New Lead / Inquiry</option>
                <option value="CONTACTED">Contacted / Engaged</option>
                <option value="DEMO_SENT">Demo Credentials Sent</option>
                <option value="TESTING">Testing Sandbox (Active)</option>
                <option value="FEEDBACK_RECEIVED">Feedback Received</option>
                <option value="INTERESTED">Interested / Warm Lead</option>
                <option value="PILOT_SCHOOL">Converted: Pilot School</option>
                <option value="CUSTOMER">Converted: Paying Customer</option>
                <option value="NOT_INTERESTED">Not Interested</option>
              </select>
            </div>

            {/* Operations */}
            <div className="flex flex-col gap-2 pt-2">
              {!lead.demoSchoolId ? (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => handleSuperadminAction('approveDemo')}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  {actionLoading === 'approveDemo' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  <span>Approve & Provision Demo</span>
                </button>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs space-y-1.5">
                  <span className="block font-bold text-slate-700">Sandbox Environment Active</span>
                  <Link
                    href={`/dashboard/tenants`} // Leads to general school list
                    className="text-[10px] text-indigo-600 hover:underline flex items-center justify-center gap-0.5 font-bold uppercase tracking-wider"
                  >
                    <span>View sandbox tenant</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}

              {lead.leadStatus !== 'PILOT_SCHOOL' && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => handleSuperadminAction('convertToPilot')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  {actionLoading === 'convertToPilot' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Convert to Pilot School</span>
                </button>
              )}

              {lead.leadStatus !== 'CUSTOMER' && (
                <button
                  type="button"
                  disabled={actionLoading !== null}
                  onClick={() => handleSuperadminAction('convertToCustomer')}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  {actionLoading === 'convertToCustomer' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>Convert to Customer</span>
                </button>
              )}
            </div>
          </div>

          {/* Card 5: Tester Telemetry Metrics */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" /> Tester Active Telemetry
            </h3>

            {lead.testerActivity ? (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 border border-slate-100">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Logins</span>
                    <span className="text-lg font-black text-slate-800">{lead.testerActivity.loginCount}</span>
                  </div>
                  <div className="bg-slate-50 p-3 border border-slate-100">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Time Active</span>
                    <span className="text-xs font-black text-slate-800 block mt-1">{formatDuration(lead.testerActivity.timeSpent)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-450 font-bold text-[10px] uppercase">Report Cards Compiled</span>
                    <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{lead.testerActivity.reportCardsGeneratedCount}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-450 font-bold text-[10px] uppercase">Attendance Marked</span>
                    <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{lead.testerActivity.attendanceSessionsCount}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-50 pb-1">
                    <span className="text-slate-450 font-bold text-[10px] uppercase">Results Sheet Hits</span>
                    <span className="font-mono font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{lead.testerActivity.resultsViewedCount}</span>
                  </div>
                </div>

                {/* Features visited */}
                <div className="space-y-1">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Features Explored</span>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lead.testerActivity.featuresVisited ? (
                      lead.testerActivity.featuresVisited.split(',').map((f) => (
                        <span key={f} className="px-1.5 py-0.5 bg-slate-150 rounded text-[9px] font-black uppercase text-slate-650 border border-slate-200 tracking-wider">
                          {f.trim() === 'reports' && 'Report Compilation'}
                          {f.trim() === 'scores' && 'Score Entry'}
                          {f.trim() === 'attendance' && 'Class Attendance'}
                          {f.trim() === 'portals' && 'Portals Access'}
                          {!['reports', 'scores', 'attendance', 'portals'].includes(f.trim()) && f.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-450 italic">No navigations registered</span>
                    )}
                  </div>
                </div>

                {lead.testerActivity.lastLogin && (
                  <div className="text-[10px] text-slate-400 font-mono">
                    Last Session: {new Date(lead.testerActivity.lastLogin).toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 font-bold italic text-xs">
                No sandbox telemetry logs. Sandbox has not been created or visited yet.
              </div>
            )}
          </div>

          {/* Card 6: Tester Feedback Summary */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-slate-500" /> Tester Feedback Scorecard
            </h3>

            {lead.feedback ? (
              <div className="space-y-4 text-xs">
                
                {/* Ratings */}
                <div className="space-y-2 bg-slate-50 p-3 border border-slate-100/85">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Ease of Use</span>
                    {renderStars(lead.feedback.easeOfUse)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Design Aesthetics</span>
                    {renderStars(lead.feedback.design)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Usefulness</span>
                    {renderStars(lead.feedback.usefulness)}
                  </div>
                </div>

                {/* Open responses */}
                <div className="space-y-3">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Most Useful Feature</span>
                    <p className="text-slate-700 font-bold mt-0.5">"{lead.feedback.mostUsefulFeature || 'None listed'}"</p>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Confusing / Weak Point</span>
                    <p className="text-slate-700 font-bold mt-0.5">"{lead.feedback.confusingFeature || 'None listed'}"</p>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Suggestions</span>
                    <p className="text-slate-650 italic mt-0.5">"{lead.feedback.suggestions || 'None listed'}"</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <span className="block text-[8px] font-bold text-slate-450 uppercase tracking-wider">Would Adopt?</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black uppercase text-slate-800 tracking-wider inline-block mt-0.5">
                        {lead.feedback.wouldUseInSchool}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-bold text-slate-450 uppercase tracking-wider">Would Pay?</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black uppercase text-slate-800 tracking-wider inline-block mt-0.5">
                        {lead.feedback.wouldPay}
                      </span>
                    </div>
                  </div>
                </div>

                {lead.feedback.additionalComments && (
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-slate-600">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Comments</span>
                    <p className="italic">"{lead.feedback.additionalComments}"</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 font-bold italic text-xs">
                No feedback submitted by tester yet.
              </div>
            )}
          </div>

          {/* Card 7: Direct Manual Email Dispatch */}
          <div className="bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-slate-500" /> Direct Communication Box
            </h3>

            <form onSubmit={handleSendEmail} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Subject Line</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule a NachoEd Pilot Program call"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Body (HTML supported)</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type message content here..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sendingEmail || !emailSubject || !emailBody}
                className="w-full py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                {sendingEmail ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Direct Email</span>
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Sent Email Preview Modal */}
      {previewingEmail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 max-w-2xl w-full p-6 shadow-2xl relative rounded-none flex flex-col h-[80vh]">
            {/* Close */}
            <button
              type="button"
              onClick={() => setPreviewingEmail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-100 pb-3 mb-4 space-y-1 text-xs">
              <h3 className="text-sm font-extrabold uppercase text-slate-800 tracking-wider">Logged Email Dispatch</h3>
              <p><strong className="text-slate-600">To:</strong> <code className="bg-slate-50 px-1 py-0.5 rounded font-mono">{previewingEmail.recipient}</code></p>
              <p><strong className="text-slate-600">Subject:</strong> <span className="font-bold text-slate-800">{previewingEmail.subject}</span></p>
              <p><strong className="text-slate-600">Sent At:</strong> <span className="font-mono text-slate-500">{new Date(previewingEmail.sentAt).toLocaleString()}</span></p>
            </div>

            {/* Scrolling Body */}
            <div className="flex-1 overflow-y-auto border border-slate-100 p-4 bg-slate-50 text-xs">
              {previewingEmail.body.includes('<html') || previewingEmail.body.includes('<!DOCTYPE') ? (
                <iframe 
                  srcDoc={previewingEmail.body} 
                  className="w-full h-full border-none bg-white" 
                  title="Sent Email Content Preview"
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{previewingEmail.body}</pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
