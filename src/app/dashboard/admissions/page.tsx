'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Check, X, FileImage, Info, Search, 
  MapPin, Phone, Mail, Calendar, HelpCircle, Loader2,
  AlertCircle, ChevronRight, Award
} from 'lucide-react';

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  gender: string;
  dateOfBirth: string | null;
  passportPhoto: string | null;
  status: string;
  classId: string;
  class: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface Arm {
  id: string;
  name: string;
  classId: string;
}

export default function AdmissionsQueue() {
  const router = useRouter();
  const [session, setSession] = useState<{ user: any; school: any } | null>(null);
  
  // Data states
  const [applications, setApplications] = useState<Application[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected details drawer
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [selectedArmId, setSelectedArmId] = useState<string>('');

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Load session
  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (!userSession) {
      router.push('/login');
      return;
    }
    try {
      setSession(JSON.parse(userSession));
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  // Load applications & arms once session is active
  useEffect(() => {
    if (!session) return;
    fetchData();
  }, [session]);

  const fetchData = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const schoolId = session.school.id;
      
      // Fetch applications
      const appsRes = await fetch(`/api/admissions?schoolId=${schoolId}&status=PENDING`);
      const appsData = await appsRes.json();
      
      // Fetch classes & arms
      const classesRes = await fetch(`/api/classes?schoolId=${schoolId}`);
      const classesData = await classesRes.json();

      if (appsData.success) {
        setApplications(appsData.data);
      }
      if (classesData.success && classesData.data && Array.isArray(classesData.data.arms)) {
        setArms(classesData.data.arms);
      }
    } catch (error) {
      console.error('Failed to load admissions queue:', error);
      showToast('Failed to fetch admissions pipeline records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Get arms matching the selected application's target class
  const getFilteredArms = (classId: string) => {
    return arms.filter(arm => arm.classId === classId);
  };

  // Auto select first arm of target class when selectedApp changes
  useEffect(() => {
    if (selectedApp) {
      const filtered = getFilteredArms(selectedApp.classId);
      if (filtered.length > 0) {
        setSelectedArmId(filtered[0].id);
      } else {
        setSelectedArmId('');
      }
    }
  }, [selectedApp]);

  // Approve application
  const handleApprove = async (appId: string) => {
    if (!session) return;
    if (!selectedArmId) {
      showToast('Please allocate a Class Arm stream first.', 'error');
      return;
    }

    setProcessingId(appId);
    try {
      const response = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          status: 'APPROVED',
          armId: selectedArmId,
          schoolId: session.school.id
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showToast(`Approved successfully! Student registered with Admission No: ${resData.data.admissionNumber}`, 'success');
        // Update local state
        setApplications(prev => prev.filter(app => app.id !== appId));
        setSelectedApp(null);
      } else {
        showToast(resData.error || 'Failed to approve application.', 'error');
      }
    } catch (error) {
      console.error('Approval error:', error);
      showToast('A network failure occurred during approval transaction.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reject application
  const handleReject = async (appId: string) => {
    if (!session) return;
    if (!confirm('Are you absolutely sure you want to reject this student application?')) return;

    setProcessingId(appId);
    try {
      const response = await fetch('/api/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: appId,
          status: 'REJECTED',
          schoolId: session.school.id
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showToast('Application successfully rejected and marked.', 'success');
        setApplications(prev => prev.filter(app => app.id !== appId));
        setSelectedApp(null);
      } else {
        showToast(resData.error || 'Failed to process rejection.', 'error');
      }
    } catch (error) {
      console.error('Rejection error:', error);
      showToast('Network error during application rejection.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter pending list
  const filteredApps = applications.filter(app => {
    const fullName = `${app.firstName} ${app.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase()) || (app.class?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl border shadow-xl flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toast.type === 'success' ? (
            <div className="p-1 rounded-full bg-emerald-500 text-white"><Check className="w-3.5 h-3.5" /></div>
          ) : (
            <div className="p-1 rounded-full bg-red-500 text-white"><AlertCircle className="w-3.5 h-3.5" /></div>
          )}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Student Admissions Queue</h1>
          <p className="text-xs text-slate-500">Review pending admissions applications, assign class streams, and provision new student login credentials.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold">
          <Users className="w-4 h-4" />
          <span>{applications.length} Pending Applications</span>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 text-xs tracking-wider uppercase font-bold">Loading admissions database pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* LEFT LIST COLUMN */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Search filter banner */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search applicant name or target grade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-300"
                />
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Showing {filteredApps.length} entries
              </span>
            </div>

            {filteredApps.length === 0 ? (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center shadow-sm">
                <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No applications in queue</h3>
                <p className="text-slate-400 text-xs mt-1">There are currently no pending student applications matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredApps.map((app) => (
                  <div 
                    key={app.id} 
                    onClick={() => setSelectedApp(app)}
                    className={`bg-white border rounded-2xl p-5 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between h-48 relative overflow-hidden ${
                      selectedApp?.id === app.id ? 'border-blue-500 ring-2 ring-blue-50 ring-offset-0' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Avatar Photo */}
                      <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden flex-shrink-0">
                        {app.passportPhoto ? (
                          <img src={app.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                        ) : (
                          <FileImage className="w-5 h-5 text-slate-300" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-sm tracking-tight hover:underline">
                            {app.firstName} {app.lastName}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        
                        <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold">
                          Class: {app.class?.name || 'Unassigned'}
                        </span>
                        
                        <p className="text-[10px] text-slate-400 font-medium">Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="border-t border-slate-50 pt-3 flex items-center justify-between mt-4">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {app.gender}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                        className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-[10px] font-bold text-slate-600 transition-colors"
                      >
                        Evaluate Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT EVALUATION PANEL */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm sticky top-6">
            {selectedApp ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-5 border-b border-slate-100">
                  <div className="w-20 h-20 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs overflow-hidden mx-auto mb-3 shadow-inner">
                    {selectedApp.passportPhoto ? (
                      <img src={selectedApp.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                      <FileImage className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedApp.firstName} {selectedApp.lastName}</h2>
                  {selectedApp.middleName && <p className="text-xs text-slate-400 font-semibold">{selectedApp.middleName}</p>}
                  <span className="inline-block mt-2 px-3 py-1 rounded-full bg-yellow-50 border border-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-wider">
                    PENDING REVIEW
                  </span>
                </div>

                {/* Details list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Biological Details</span>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase">Gender</span>
                      <span className="font-bold text-slate-700 capitalize">{selectedApp.gender.toLowerCase()}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase">Date of Birth</span>
                      <span className="font-bold text-slate-700">
                        {selectedApp.dateOfBirth ? new Date(selectedApp.dateOfBirth).toLocaleDateString() : 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">Guardian Contacts</span>
                  
                  <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600 truncate">{selectedApp.email || 'No email provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-slate-600">{selectedApp.phone || 'No phone provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Class and Arm Allocation */}
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 block">Grade Assignment</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="block text-[9px] font-bold text-blue-500 uppercase">Target Grade</span>
                      <span className="font-bold text-slate-800">{selectedApp.class?.name}</span>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold text-blue-500 uppercase">Allocate Arm Stream</label>
                      {getFilteredArms(selectedApp.classId).length === 0 ? (
                        <div className="text-[10px] text-red-500 font-bold">No arms exist. Create one first!</div>
                      ) : (
                        <select
                          value={selectedArmId}
                          onChange={(e) => setSelectedArmId(e.target.value)}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:border-slate-300 w-full"
                          required
                        >
                          {getFilteredArms(selectedApp.classId).map((arm) => (
                            <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Evaluation Action Triggers */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <button
                    type="button"
                    disabled={processingId === selectedApp.id}
                    onClick={() => handleReject(selectedApp.id)}
                    className="py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject Application
                  </button>
                  <button
                    type="button"
                    disabled={processingId === selectedApp.id || getFilteredArms(selectedApp.classId).length === 0}
                    onClick={() => handleApprove(selectedApp.id)}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                  >
                    {processingId === selectedApp.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Approve & Enroll
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No student selected</h3>
                <p className="text-slate-400 text-xs">Select any candidate application from the pending queue ledger to view full profiles and complete class allocations.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
export const dynamic = 'force-dynamic';
