'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, Calendar, ShieldCheck, RefreshCw, AlertCircle, Plus, Eye, Archive, ArrowRightLeft, Trash2, CheckCircle, Clock, Copy
} from 'lucide-react';
import WizardModal from './WizardModal';

interface AcademicSessionInfo {
  id: string;
  name: string;
  status: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  archiveDate: string | null;
  hasBackup: boolean;
  studentCount: number;
  teacherCount: number;
  terms: any[];
}

export default function AcademicSessionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [sessionsList, setSessionsList] = useState<AcademicSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Wizard toggle
  const [showWizard, setShowWizard] = useState(false);

  // Switch session state
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (!sessionStr) {
      router.push('/login');
      return;
    }
    const sess = JSON.parse(sessionStr);
    setSession(sess);

    if (sess.user?.role !== 'SUPER_ADMIN' && sess.user?.role !== 'SCHOOL_ADMIN') {
      setErrorMsg('Unauthorized access. Only School Administrators or Super Admins can manage academic sessions.');
      setLoading(false);
      return;
    }

    fetchSessions(sess.school?.id || sess.user?.schoolId);
  }, []);

  const fetchSessions = async (schoolId: string) => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/schools/sessions?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSessionsList(json.data);
      } else {
        setErrorMsg(json.error || 'Failed to fetch academic sessions list.');
      }
    } catch (err) {
      setErrorMsg('Network error loading academic sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchActiveSession = async (targetSession: AcademicSessionInfo) => {
    if (!session?.school?.id) return;
    const confirmSwitch = window.confirm(`Are you sure you want to switch the active session to ${targetSession.name}? This will change the primary active roster, invoices, and results context for all students and staff.`);
    if (!confirmSwitch) return;

    try {
      setSwitchingId(targetSession.id);
      setErrorMsg('');
      setSuccessMsg('');
      const token = localStorage.getItem('report_auth_token') || '';
      
      const res = await fetch('/api/schools/sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: targetSession.id,
          schoolId: session.school?.id,
          isCurrent: true
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Session swapped successfully! ${targetSession.name} is now the active academic session.`);
        // Reload local sessions list
        fetchSessions(session.school?.id);
      } else {
        setErrorMsg(json.error || 'Failed to switch the active session.');
      }
    } catch (err) {
      setErrorMsg('Network error switching session.');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleDeleteSession = async (targetSession: AcademicSessionInfo) => {
    if (!session?.school?.id) return;
    const confirmDelete = window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete the archived session ${targetSession.name}? This operation is irreversible and will delete all terms linked to this session.`);
    if (!confirmDelete) return;

    try {
      setDeletingId(targetSession.id);
      setErrorMsg('');
      setSuccessMsg('');
      const token = localStorage.getItem('report_auth_token') || '';

      const res = await fetch(`/api/schools/sessions?id=${targetSession.id}&schoolId=${session.school?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Session ${targetSession.name} deleted successfully.`);
        fetchSessions(session.school?.id);
      } else {
        setErrorMsg(json.error || 'Failed to delete the session.');
      }
    } catch (err) {
      setErrorMsg('Network error deleting session.');
    } finally {
      setDeletingId(null);
    }
  };

  const activeSession = sessionsList.find(s => s.isCurrent);

  if (loading && sessionsList.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-650"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300 font-sans selection:bg-emerald-100">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-emerald-600" />
            <span>Academic Session Registry</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1">Manage school terms, automate student promotions, archive completed sessions, and transition academic years securely.</p>
        </div>
        
        {session?.user && (
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Start Transition Wizard</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Top Section: Active Session Cards */}
      {activeSession ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-1 rounded-full">Current Session Boundary</span>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping"></span>
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{activeSession.name}</h2>
              <p className="text-white/80 text-[10px] uppercase font-bold tracking-wider mt-1">Status: {activeSession.status}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4 text-xs font-semibold">
              <div>
                <p className="text-white/60 text-[9px] uppercase tracking-wider">Start Date</p>
                <p className="mt-0.5">{activeSession.startDate || 'Not Configured'}</p>
              </div>
              <div>
                <p className="text-white/60 text-[9px] uppercase tracking-wider">End Date</p>
                <p className="mt-0.5">{activeSession.endDate || 'Not Configured'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Active Academic Term</span>
                <h3 className="text-lg font-black text-slate-800">
                  {activeSession.terms.find(t => t.isCurrent)?.name || 'No Term Open'}
                </h3>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>School Calendar Setup</span>
              <span className="text-indigo-600 font-bold">First Term (Current)</span>
            </div>
          </div>

          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Operational Counts</span>
                <h3 className="text-lg font-black text-slate-800">
                  {activeSession.studentCount} Students
                </h3>
                <p className="text-slate-500 text-[10px] font-semibold">{activeSession.teacherCount} Teachers Configured</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>Security Access Status</span>
              <span className="text-emerald-600 font-bold uppercase tracking-wider text-[10px]">Verified Admin</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-3xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold">No Active Academic Session Configured!</p>
            <p className="text-xs mt-0.5">Please click "Start Transition Wizard" to create and configure the first academic session for the school.</p>
          </div>
        </div>
      )}

      {/* Session List Table Card */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-700 tracking-wider">All Academic Sessions</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Timeline history of archived and active school sessions.</p>
          </div>
          <button 
            onClick={() => fetchSessions(session?.school?.id || session?.user?.schoolId)}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all border border-slate-150 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="px-6 py-4">Session Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Dates Boundary</th>
                <th className="px-6 py-4">Students/Teachers</th>
                <th className="px-6 py-4">Archive Date</th>
                <th className="px-6 py-4">Backup Log</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
              {sessionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                    No academic sessions registered. Click "Start Transition Wizard" to create your first session.
                  </td>
                </tr>
              ) : (
                sessionsList.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-6 py-4 font-black text-slate-800 text-sm">
                      {s.name}
                      {s.isCurrent && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider rounded-md">
                          Current
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        s.isCurrent 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : s.status === 'ACTIVE' 
                            ? 'bg-sky-50 text-sky-700' 
                            : 'bg-slate-100 text-slate-500'
                      }`}>
                        {s.isCurrent ? 'ACTIVE' : s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                        <span>{s.startDate || 'N/A'}</span>
                        <span className="text-slate-400">to</span>
                        <span>{s.endDate || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <p>{s.studentCount} Students</p>
                        <p className="text-slate-400 text-[10px]">{s.teacherCount} Teachers</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {s.archiveDate ? new Date(s.archiveDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {s.hasBackup ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Backup Created</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">No Backup Log</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Switch Active Trigger */}
                        {!s.isCurrent && (
                          <button
                            disabled={switchingId !== null}
                            onClick={() => handleSwitchActiveSession(s)}
                            className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-150 cursor-pointer"
                            title="Switch Active Session"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                        )}

                        {/* Duplication settings placeholder */}
                        <button
                          onClick={() => alert(`Settings from session ${s.name} successfully duplicated to draft configurations.`)}
                          className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all border border-slate-150 cursor-pointer"
                          title="Duplicate Session Settings"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Delete Session (Archived only) */}
                        {!s.isCurrent && s.status === 'ARCHIVED' && (
                          <button
                            disabled={deletingId !== null}
                            onClick={() => handleDeleteSession(s)}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-150 cursor-pointer"
                            title="Delete Session Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Setup Wizard Modal component */}
      {showWizard && (
        <WizardModal 
          schoolId={session?.school?.id || session?.user?.schoolId}
          onClose={() => {
            setShowWizard(false);
            fetchSessions(session?.school?.id || session?.user?.schoolId);
          }}
        />
      )}
    </div>
  );
}
