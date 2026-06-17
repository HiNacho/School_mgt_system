'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Users, Mail, Phone, Search, RefreshCw, CheckCircle, 
  Trash2, ArrowRight, Star, PlayCircle, ShieldAlert, 
  ExternalLink, GraduationCap, Building2, HelpCircle, Activity, Loader2, X, Send
} from 'lucide-react';

interface TesterActivity {
  id: string;
  loginCount: number;
  timeSpent: number; // seconds
  reportCardsGeneratedCount: number;
}

interface Feedback {
  id: string;
  easeOfUse: number;
  design: number;
  usefulness: number;
  wouldUseInSchool: string;
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
}

export default function LeadsCRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Campaign Builder State
  const [showCampaignBuilder, setShowCampaignBuilder] = useState(false);
  const [campaignCohort, setCampaignCohort] = useState('ALL_LEADS');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcastCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcasting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort: campaignCohort,
          subject: campaignSubject,
          body: campaignBody
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Campaign broadcast sent successfully!');
        setCampaignSubject('');
        setCampaignBody('');
        setShowCampaignBuilder(false);
        await fetchLeads(); // Refresh leads
      } else {
        setErrorMsg(json.error || 'Failed to send campaign broadcast.');
      }
    } catch (err) {
      console.error('Campaign Broadcast Error:', err);
      setErrorMsg('Network error broadcasting campaign.');
    } finally {
      setBroadcasting(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/leads', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success) {
        setLeads(json.data || []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch leads from CRM database.');
      }
    } catch (err) {
      console.error('Fetch Leads Error:', err);
      setErrorMsg('Network error. Failed to retrieve leads.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuperadminAction = async (leadId: string, action: string) => {
    setActionLoadingId(`${leadId}-${action}`);
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
        await fetchLeads(); // Reload leads
      } else {
        setErrorMsg(json.error || 'Failed to execute requested action.');
      }
    } catch (err) {
      console.error('Super Admin Action Error:', err);
      setErrorMsg('Network error while performing action.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-150">NEW</span>;
      case 'CONTACTED':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-150">CONTACTED</span>;
      case 'TESTING':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-150">SANDBOX TEST</span>;
      case 'FEEDBACK_RECEIVED':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-150">FEEDBACK IN</span>;
      case 'INTERESTED':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-50 text-pink-700 border border-pink-150">WARM LEAD</span>;
      case 'PILOT_SCHOOL':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-150">PILOT</span>;
      case 'CUSTOMER':
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-teal-50 text-teal-700 border border-teal-150">CUSTOMER</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-50 text-slate-550 border border-slate-200">{status}</span>;
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const calculateAverageRating = (feedback: Feedback | null) => {
    if (!feedback) return null;
    const avg = (feedback.easeOfUse + feedback.design + feedback.usefulness) / 3;
    return avg.toFixed(1);
  };

  // Funnel calculations
  const totalCount = leads.length;
  const testingCount = leads.filter(l => l.leadStatus === 'TESTING' || l.demoSchoolId).length;
  const feedbackCount = leads.filter(l => l.feedback).length;
  const convertedCount = leads.filter(l => l.leadStatus === 'PILOT_SCHOOL' || l.leadStatus === 'CUSTOMER').length;
  const conversionRate = totalCount > 0 ? Math.round((convertedCount / totalCount) * 100) : 0;

  // Filters
  const filteredLeads = leads.filter(l => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'CONVERTED' && l.leadStatus !== 'PILOT_SCHOOL' && l.leadStatus !== 'CUSTOMER') return false;
      if (statusFilter === 'TESTING' && l.leadStatus !== 'TESTING' && !l.demoSchoolId) return false;
      if (statusFilter !== 'CONVERTED' && statusFilter !== 'TESTING' && l.leadStatus !== statusFilter) return false;
    }
    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.schoolName.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-[#94a3b8]">
            <Link href="/dashboard/tenants" className="hover:text-slate-800 transition-colors">Tenants</Link>
            <span>/</span>
            <span className="text-slate-800">Leads CRM</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase mt-1">Leads CRM Funnel</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor incoming trials, approve sandboxes, track active tester telemetry, and convert leads to live portals.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCampaignBuilder(!showCampaignBuilder)}
            className="px-4 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Broadcast Campaign</span>
          </button>

          <button
            type="button"
            onClick={fetchLeads}
            className="px-4 py-2 border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Funnel</span>
          </button>
        </div>
      </div>

      {/* Campaign Broadcast Builder Card */}
      {showCampaignBuilder && (
        <div className="bg-white border border-slate-200/85 p-6 shadow-md animate-in slide-in-from-top-2 duration-300 text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-600" /> Broadcast Email Campaign
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
                Send bulk email messages to specific cohorts in the database
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCampaignBuilder(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleBroadcastCampaign} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-1">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Target Cohort</label>
                <select
                  value={campaignCohort}
                  onChange={(e) => setCampaignCohort(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-300 font-bold text-slate-700"
                >
                  <option value="ALL_LEADS">All Leads ({totalCount})</option>
                  <option value="ACTIVE_TESTERS">Active Sandbox Testers ({testingCount})</option>
                  <option value="PILOT_SCHOOLS">Pilot Schools ({leads.filter(l => l.leadStatus === 'PILOT_SCHOOL').length})</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Subject Line</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule a NachoEd setup review"
                  value={campaignSubject}
                  onChange={(e) => setCampaignSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-300 font-semibold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Email Message (HTML supported)</label>
                <span className="text-[8px] text-slate-400 font-bold uppercase">Merge tags: {"{Name}"}, {"{Email}"}</span>
              </div>
              <textarea
                rows={5}
                required
                placeholder="Hello {Name}, \n\nThank you for exploring our school result sheets automations..."
                value={campaignBody}
                onChange={(e) => setCampaignBody(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCampaignBuilder(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={broadcasting || !campaignSubject || !campaignBody}
                className="px-5 py-2 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-md flex items-center gap-1.5"
              >
                {broadcasting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Campaign</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alert Feedbacks */}
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

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-none shadow-sm relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Leads</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{totalCount}</span>
            <span className="text-[10px] text-slate-400 font-bold">registered</span>
          </div>
          <div className="w-1.5 h-full bg-indigo-600 absolute left-0 top-0" />
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-none shadow-sm relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Testers</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{testingCount}</span>
            <span className="text-[10px] text-slate-400 font-bold">in sandbox</span>
          </div>
          <div className="w-1.5 h-full bg-amber-500 absolute left-0 top-0" />
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-none shadow-sm relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Feedbacks Collected</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{feedbackCount}</span>
            <span className="text-[10px] text-slate-400 font-bold">reviews</span>
          </div>
          <div className="w-1.5 h-full bg-purple-600 absolute left-0 top-0" />
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-none shadow-sm relative overflow-hidden flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conversion Rate</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-800">{conversionRate}%</span>
            <span className="text-[10px] text-slate-400 font-bold">to live schools</span>
          </div>
          <div className="w-1.5 h-full bg-emerald-500 absolute left-0 top-0" />
        </div>
      </div>

      {/* Funnel Pipeline Tabs and Search */}
      <div className="bg-white border border-slate-200/80 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          {/* Status Pipeline Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'All Leads' },
              { key: 'NEW', label: 'New Inquiries' },
              { key: 'TESTING', label: 'In Sandbox' },
              { key: 'FEEDBACK_RECEIVED', label: 'Feedback Received' },
              { key: 'CONVERTED', label: 'Converted Portal' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 border text-[10px] font-black uppercase tracking-wider transition-all duration-150 ${
                  statusFilter === tab.key
                    ? 'bg-[#1e293b] text-white border-[#1e293b]'
                    : 'bg-white text-slate-650 border-slate-200 hover:border-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Search name, email, school..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 transition-colors hover:border-slate-300"
            />
          </div>
        </div>

        {/* CRM Data Table */}
        <div className="overflow-x-auto rounded-none border border-slate-200/60 shadow-sm">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Syncing leads database...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-16 text-center font-bold text-slate-400 italic">
              No registered leads match the active filters.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs font-semibold text-slate-650">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4">School & Level</th>
                  <th className="p-4">Contact Person</th>
                  <th className="p-4">Pipeline Status</th>
                  <th className="p-4">Telemetry Metrics</th>
                  <th className="p-4 text-center">Feedback Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {filteredLeads.map((l) => {
                  const telemetry = l.testerActivity;
                  const feedback = l.feedback;
                  const avgRating = calculateAverageRating(feedback);

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/40">
                      {/* School details */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="text-slate-800 font-extrabold block text-sm leading-tight">{l.schoolName}</span>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" /> {l.schoolType || 'COMBINED'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5"><GraduationCap className="w-3 h-3" /> {l.studentCount || 'Unknown'} stds</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact details */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <span className="text-slate-800 font-extrabold block">{l.contactName}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-black block tracking-wider">{l.position || 'ROLE NOT PROVIDED'}</span>
                          <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-mono mt-1">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {l.email}</span>
                            {l.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {l.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <div className="space-y-1">
                          <div>{getStatusBadge(l.leadStatus)}</div>
                          <span className="text-[9px] text-slate-400 font-mono block">Registered {new Date(l.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Telemetry metrics */}
                      <td className="p-4">
                        {telemetry ? (
                          <div className="space-y-1 text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">Logins:</span>
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-800">{telemetry.loginCount}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">Time Spent:</span>
                              <span className="font-mono font-bold text-slate-800">{formatDuration(telemetry.timeSpent)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">Cards Compiled:</span>
                              <span className="font-mono font-bold text-slate-800">{telemetry.reportCardsGeneratedCount}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No sandbox telemetry</span>
                        )}
                      </td>

                      {/* Feedback rating */}
                      <td className="p-4 text-center">
                        {feedback && avgRating ? (
                          <div className="inline-flex flex-col items-center">
                            <div className="flex items-center gap-1 text-amber-500 font-black text-sm">
                              <Star className="w-4 h-4 fill-amber-500" />
                              <span>{avgRating}</span>
                            </div>
                            <span className="text-[8px] text-[#64748b] uppercase tracking-wider font-extrabold mt-0.5">
                              Adopt: {feedback.wouldUseInSchool}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No feedback received</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          {/* Main Navigate link */}
                          <Link
                            href={`/dashboard/tenants/leads/${l.id}`}
                            className="px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1"
                          >
                            <span>Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>

                          {/* Quick Admin Actions */}
                          <div className="flex gap-1">
                            {!l.demoSchoolId && (
                              <button
                                type="button"
                                disabled={actionLoadingId !== null}
                                onClick={() => handleSuperadminAction(l.id, 'approveDemo')}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-indigo-700 text-[9px] font-extrabold uppercase tracking-wide cursor-pointer transition-colors inline-flex items-center gap-0.5"
                                title="Spin up custom demo sandbox and send email credentials"
                              >
                                {actionLoadingId === `${l.id}-approveDemo` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="w-2.5 h-2.5" />
                                )}
                                <span>Demo</span>
                              </button>
                            )}

                            {l.leadStatus !== 'PILOT_SCHOOL' && l.leadStatus !== 'CUSTOMER' && (
                              <button
                                type="button"
                                disabled={actionLoadingId !== null}
                                onClick={() => handleSuperadminAction(l.id, 'convertToPilot')}
                                className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-700 text-[9px] font-extrabold uppercase tracking-wide cursor-pointer transition-colors inline-flex items-center gap-0.5"
                                title="Convert to clean, active live Pilot School instance"
                              >
                                {actionLoadingId === `${l.id}-convertToPilot` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-2.5 h-2.5" />
                                )}
                                <span>Pilot</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={actionLoadingId !== null}
                              onClick={() => {
                                if (window.confirm('Are you sure you want to permanently delete this lead registry? This will wipe telemetry metrics.')) {
                                  handleSuperadminAction(l.id, 'deleteLead');
                                }
                              }}
                              className="p-1 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-450 hover:text-red-650 cursor-pointer transition-colors"
                              title="Delete lead registry"
                            >
                              {actionLoadingId === `${l.id}-deleteLead` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
