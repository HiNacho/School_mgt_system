'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, AlertCircle, CheckCircle, ChevronRight, ChevronLeft, ShieldCheck, Database, GraduationCap, ArrowRight, Settings, Users, BookOpen, Loader2
} from 'lucide-react';

interface WizardModalProps {
  schoolId: string;
  onClose: () => void;
}

export default function WizardModal({ schoolId, onClose }: WizardModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 1 & 2 Data: Review & Validate
  const [reviewData, setReviewData] = useState<any>(null);

  // Step 3 Data: Promotion mappings
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [promotionsMap, setPromotionsMap] = useState<Record<string, { toClassId: string; toArmId: string; status: string }>>({});

  // Step 4 Data: Graduation
  const [finalYearStudents, setFinalYearStudents] = useState<any[]>([]);
  const [selectedGraduates, setSelectedGraduates] = useState<Record<string, boolean>>({});

  // Step 5 Data: Configurations
  const [configsToCopy, setConfigsToCopy] = useState({
    teachers: true,
    subjects: true,
    classStructure: true,
    feeStructure: true,
    schoolSettings: true,
    gradingSystem: true,
    reportCardTemplate: true,
    timetableRules: true,
    parentAccounts: true,
    studentAccounts: true,
    staffAccounts: true,
    messageTemplates: true,
    schoolLogo: true
  });

  // Step 6 Data: New Session creation fields
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('');
  const [newSessionEnd, setNewSessionEnd] = useState('');
  const [termsConfig, setTermsConfig] = useState([
    { name: 'First Term', startDate: '', endDate: '' },
    { name: 'Second Term', startDate: '', endDate: '' },
    { name: 'Third Term', startDate: '', endDate: '' }
  ]);

  // Draft backup confirmation
  const [backupId, setBackupId] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    fetchReviewData();
    fetchClasses();
  }, []);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await fetch(`/api/schools/sessions/wizard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'review', schoolId })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setReviewData(json.data);
        
        // Populate default new session name based on active one
        if (json.data.activeSession?.name) {
          const parts = json.data.activeSession.name.split('/');
          if (parts.length === 2) {
            const startYear = parseInt(parts[0]) + 1;
            const endYear = parseInt(parts[1]) + 1;
            setNewSessionName(`${startYear}/${endYear}`);
          }
        } else {
          setNewSessionName('2026/2027');
        }
      } else {
        setErrorMsg(json.error || 'Failed to initialize session review data.');
      }
    } catch (err) {
      setErrorMsg('Network error loading review summary.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch(`/api/classes?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setClasses(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching classes', err);
    }
  };

  // Fetch students for Selected Class in Step 3
  const handleSelectClass = async (classId: string) => {
    setSelectedClassId(classId);
    if (!classId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/students?schoolId=${schoolId}&classId=${classId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const activeList = (json.data || []).filter((s: any) => s.status === 'ACTIVE');
        setClassStudents(activeList);
        
        // Find next class logic (e.g. JSS 1 -> JSS 2)
        const currentClass = classes.find(c => c.id === classId);
        let nextClass = null;
        if (currentClass) {
          if (currentClass.name.includes('JSS 1')) nextClass = classes.find(c => c.name.includes('JSS 2'));
          else if (currentClass.name.includes('JSS 2')) nextClass = classes.find(c => c.name.includes('JSS 3'));
          else if (currentClass.name.includes('JSS 3')) nextClass = classes.find(c => c.name.includes('SSS 1'));
          else if (currentClass.name.includes('SSS 1')) nextClass = classes.find(c => c.name.includes('SSS 2'));
          else if (currentClass.name.includes('SSS 2')) nextClass = classes.find(c => c.name.includes('SSS 3'));
        }

        // Initialize maps
        const initialMap: Record<string, any> = { ...promotionsMap };
        activeList.forEach((s: any) => {
          if (!initialMap[s.id]) {
            initialMap[s.id] = {
              toClassId: nextClass?.id || '',
              toArmId: s.armId || '',
              status: nextClass ? 'PROMOTED' : 'RETAINED'
            };
          }
        });
        setPromotionsMap(initialMap);
      }
    } catch (err) {
      setErrorMsg('Failed to load class students.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch SSS3 / final class students for Step 4
  const loadFinalYearStudents = async () => {
    // Find final classes (e.g., SSS 3 or Grade 6)
    const finalClass = classes.find(c => c.name.includes('SSS 3') || c.name.includes('Grade 6') || c.name.includes('Primary 6'));
    if (!finalClass) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/students?schoolId=${schoolId}&classId=${finalClass.id}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const list = (json.data || []).filter((s: any) => s.status === 'ACTIVE');
        setFinalYearStudents(list);
        
        // Auto-select all for graduation
        const initialGrads: Record<string, boolean> = {};
        list.forEach((s: any) => {
          initialGrads[s.id] = true;
        });
        setSelectedGraduates(initialGrads);
      }
    } catch (err) {
      console.error('Graduation list error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 3 && Object.keys(promotionsMap).length === 0) {
      // Prompt warning but allow passing
    }
    if (step === 3) {
      loadFinalYearStudents();
    }
    setStep(prev => Math.min(prev + 1, 8));
  };

  const handleBack = () => {
    setErrorMsg('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Save current promotions mapped list
  const executePromotions = async () => {
    if (!reviewData?.activeSession?.id) return;
    try {
      setLoading(true);
      const promotionsPayload = Object.entries(promotionsMap).map(([studentId, data]) => ({
        studentId,
        toClassId: data.status === 'PROMOTED' ? data.toClassId : null,
        toArmId: data.status === 'PROMOTED' ? data.toArmId : null,
        status: data.status
      }));

      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/schools/sessions/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'promote',
          schoolId,
          currentSessionId: reviewData.activeSession.id,
          promotions: promotionsPayload
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Roster promotion configurations successfully processed for ${json.count} students!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(json.error || 'Failed to register student promotions.');
      }
    } catch (e) {
      setErrorMsg('Network error executing promotions.');
    } finally {
      setLoading(false);
    }
  };

  // Execute Graduation
  const executeGraduation = async () => {
    if (!reviewData?.activeSession?.id) return;
    const gradIds = Object.entries(selectedGraduates)
      .filter(([_, isGrad]) => isGrad)
      .map(([id]) => id);

    if (gradIds.length === 0) {
      alert('Please select at least one student to graduate.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/schools/sessions/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'graduate',
          schoolId,
          currentSessionId: reviewData.activeSession.id,
          studentIds: gradIds
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(`Successfully graduated ${json.count} students!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg(json.error || 'Failed to execute student graduation.');
      }
    } catch (e) {
      setErrorMsg('Network error executing graduation.');
    } finally {
      setLoading(false);
    }
  };

  // Create target draft session in Step 6
  const [createdNewSessionId, setCreatedNewSessionId] = useState<string>('');
  
  const createNewSessionDraft = async () => {
    if (!newSessionName || !newSessionStart || !newSessionEnd) {
      setErrorMsg('Please specify a session year name, start date, and end date.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('report_auth_token') || '';
      
      const res = await fetch('/api/schools/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          schoolId,
          name: newSessionName,
          startDate: newSessionStart,
          endDate: newSessionEnd,
          terms: termsConfig
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCreatedNewSessionId(json.data.id);
        setSuccessMsg(`Academic Session draft "${newSessionName}" created successfully!`);
        setTimeout(() => {
          setSuccessMsg('');
          handleNext();
        }, 1500);
      } else {
        setErrorMsg(json.error || 'Failed to create new session draft year.');
      }
    } catch (err) {
      setErrorMsg('Network error creating session.');
    } finally {
      setLoading(false);
    }
  };

  // Activate & Backup Final Step 8
  const finalizeActivation = async () => {
    if (!reviewData?.activeSession?.id || !createdNewSessionId) {
      setErrorMsg('Configuration parameters missing. Please restart the wizard.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('report_auth_token') || '';
      
      const res = await fetch('/api/schools/sessions/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'backup_archive',
          schoolId,
          currentSessionId: reviewData.activeSession.id,
          newSessionId: createdNewSessionId
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message);
        setBackupId('done');
      } else {
        setErrorMsg(json.error || 'Failed to commit the session transition.');
      }
    } catch (err) {
      setErrorMsg('Network error finalising session activation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-sm font-black uppercase text-slate-800 tracking-wider">Session Setup & Transition Wizard</h2>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Step {step} of 8: Progress through active school closing routines</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Indicator */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 grid grid-cols-8 gap-1.5 text-center text-[9px] font-black uppercase tracking-wider text-slate-400">
          {[
            'Review', 'Validate', 'Promote', 'Graduate', 
            'Copy Config', 'New Session', 'Summary', 'Activate'
          ].map((label, idx) => (
            <div key={label} className={`pb-1.5 border-b-2 transition-all ${
              step === idx + 1 ? 'border-emerald-600 text-emerald-700' : 'border-transparent'
            }`}>
              {idx + 1}. {label}
            </div>
          ))}
        </div>

        {/* Error / Success logs */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Wizard Step Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: Review Current Session */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 1: Review Active Session Data</h3>
                <p className="text-xs text-slate-500">Review historical statistics and task status of the current active session boundary before proceeding.</p>
              </div>

              {loading && !reviewData ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Session</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">{reviewData?.activeSession?.name || 'None'}</h4>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Students Roster</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">{reviewData?.studentCount || 0} Students</h4>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Teachers Loaded</span>
                    <h4 className="text-lg font-black text-slate-800 mt-1">{reviewData?.teacherCount || 0} Staff</h4>
                  </div>
                </div>
              )}

              {reviewData?.outstandingTasks?.length > 0 ? (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-250 text-amber-850 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">Outstanding Tasks Warning</h4>
                  <ul className="list-disc list-inside text-[11px] space-y-1 font-semibold text-amber-700">
                    {reviewData.outstandingTasks.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] font-bold text-amber-700 pt-1">
                    ⚠️ You can bypass these constraints to archive the session, but it is recommended to resolve pending grades before closure.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>All grades submitted, attendances checked, and report card approvals resolved! You are clear to proceed.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Validate Academic Records */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 2: Validate Records & Finalize Marks</h3>
                <p className="text-xs text-slate-500">Perform deep checks to ensure no orphan records exist and all class files are sealed.</p>
              </div>

              <div className="border border-slate-150 rounded-2xl divide-y divide-slate-150 text-xs font-semibold text-slate-700">
                <div className="p-4 flex justify-between items-center bg-slate-50/50">
                  <span className="font-black">Validation Checkpoint</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Result</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>No Pending Subject Score Submissions</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${reviewData?.scoresSubmitted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {reviewData?.scoresSubmitted ? 'Passed' : 'Bypassed'}
                  </span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>Class Teacher Report Approvals Completed</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${reviewData?.reportsGenerated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {reviewData?.reportsGenerated ? 'Passed' : 'Bypassed'}
                  </span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>Session Attendance finalize verification</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${reviewData?.attendanceCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {reviewData?.attendanceCompleted ? 'Passed' : 'Bypassed'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Student Promotion Engine */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 3: Student Promotion engine</h3>
                <p className="text-xs text-slate-500">Configure promotion target maps for classes, select students, and bulk promote them to next year class registries.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Class selector */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Select Class to Manage</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleSelectClass(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="">-- Choose Class --</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Class actions */}
                {selectedClassId && (
                  <div className="sm:col-span-2 bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider"> Roster: {classStudents.length} Students</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Apply bulk class promotion map actions.</p>
                    </div>
                    <button
                      onClick={executePromotions}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Save Promotions
                    </button>
                  </div>
                )}
              </div>

              {/* Student mapping grid */}
              {selectedClassId && classStudents.length > 0 && (
                <div className="border border-slate-150 rounded-2xl divide-y divide-slate-150 overflow-hidden max-h-[350px] overflow-y-auto">
                  <div className="p-3 bg-slate-50 grid grid-cols-3 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <span>Student Name</span>
                    <span>Action Status</span>
                    <span>Target Class & Arm</span>
                  </div>
                  {classStudents.map(student => {
                    const promo = promotionsMap[student.id] || { toClassId: '', toArmId: '', status: 'RETAINED' };
                    return (
                      <div key={student.id} className="p-3 grid grid-cols-3 items-center text-xs font-semibold text-slate-700">
                        <span className="font-bold text-slate-800">{student.firstName} {student.lastName}</span>
                        <div>
                          <select
                            value={promo.status}
                            onChange={(e) => setPromotionsMap({
                              ...promotionsMap,
                              [student.id]: { ...promo, status: e.target.value }
                            })}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                          >
                            <option value="PROMOTED">Promote</option>
                            <option value="RETAINED">Retain / Repeat</option>
                            <option value="WITHDRAWN">Withdraw</option>
                            <option value="TRANSFERRED">Transfer Out</option>
                          </select>
                        </div>
                        <div>
                          {promo.status === 'PROMOTED' && (
                            <select
                              value={promo.toClassId}
                              onChange={(e) => setPromotionsMap({
                                ...promotionsMap,
                                [student.id]: { ...promo, toClassId: e.target.value }
                              })}
                              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-full"
                            >
                              <option value="">-- Target Class --</option>
                              {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Graduate Students */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 4: Graduate Final-Year Students</h3>
                <p className="text-xs text-slate-500">Seal graduation boundaries for students who have successfully completed the final grade levels.</p>
              </div>

              {finalYearStudents.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center text-slate-400 text-xs">
                  No students found in graduation year classes (e.g. SSS 3 / Grade 6). You can skip to the next step.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Eligible Graduates: {finalYearStudents.length} Students</span>
                    <button
                      onClick={executeGraduation}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                    >
                      Graduate Selected Students
                    </button>
                  </div>

                  <div className="border border-slate-150 rounded-2xl max-h-[300px] overflow-y-auto divide-y divide-slate-150">
                    {finalYearStudents.map(student => (
                      <div key={student.id} className="p-3.5 flex justify-between items-center text-xs font-semibold text-slate-700">
                        <span className="font-bold text-slate-800">{student.firstName} {student.lastName} ({student.admissionNumber})</span>
                        <input
                          type="checkbox"
                          checked={!!selectedGraduates[student.id]}
                          onChange={(e) => setSelectedGraduates({
                            ...selectedGraduates,
                            [student.id]: e.target.checked
                          })}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Copy Config */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 5: Carry forward school configurations</h3>
                <p className="text-xs text-slate-500">Choose what registry settings, fees structures, logo templates, or rosters you want to carry forward.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider border-b border-emerald-100 pb-1.5">Carry Forward Configs (Duplicate)</h4>
                  <div className="space-y-2">
                    {Object.entries(configsToCopy).map(([key, val]) => (
                      <label key={key} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={val}
                          onChange={(e) => setConfigsToCopy({ ...configsToCopy, [key]: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-5 rounded-3xl bg-slate-50 border border-slate-100">
                  <h4 className="text-xs font-black text-rose-700 uppercase tracking-wider border-b border-rose-100 pb-1.5">Reset Operational Data (Fresh Start)</h4>
                  <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                    The following operational indices will be reset and initialized blank for the new session terms:
                  </p>
                  <ul className="list-disc list-inside text-[11px] font-semibold text-slate-500 space-y-1">
                    <li>Continuous Assessments (CA)</li>
                    <li>Examination Grades</li>
                    <li>Term Attendance logs</li>
                    <li>Report Card Comments & Seals</li>
                    <li>Student Outstanding Balances (Fees status)</li>
                  </ul>
                  <p className="text-[10px] text-emerald-600 font-black tracking-wider uppercase pt-2">
                    ✓ All historical results remain searchable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Create New Session */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 6: Configure New Session Year</h3>
                <p className="text-xs text-slate-500">Input year descriptors and configure term boundaries for the commencing academic session.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Academic Session Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2026/2027"
                    value={newSessionName}
                    onChange={(e) => setNewSessionName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Session Start Date</label>
                  <input
                    type="date"
                    required
                    value={newSessionStart}
                    onChange={(e) => setNewSessionStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Session End Date</label>
                  <input
                    type="date"
                    required
                    value={newSessionEnd}
                    onChange={(e) => setNewSessionEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-semibold"
                  />
                </div>
              </div>

              {/* Terms Config */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Commencing Terms Schedule</h4>
                <div className="space-y-3">
                  {termsConfig.map((term, index) => (
                    <div key={term.name} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                      <span className="text-xs font-bold text-slate-700">{term.name}</span>
                      <input
                        type="date"
                        placeholder="Start Date"
                        value={term.startDate}
                        onChange={(e) => {
                          const updated = [...termsConfig];
                          updated[index].startDate = e.target.value;
                          setTermsConfig(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                      <input
                        type="date"
                        placeholder="End Date"
                        value={term.endDate}
                        onChange={(e) => {
                          const updated = [...termsConfig];
                          updated[index].endDate = e.target.value;
                          setTermsConfig(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 text-right">
                <button
                  type="button"
                  onClick={createNewSessionDraft}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Create & Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Review Summary */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Step 7: Review Transition Summary</h3>
                <p className="text-xs text-slate-500">Ensure all mapped promote targets, configs, and target sessions match expectation before committing database operations.</p>
              </div>

              <div className="border border-slate-150 rounded-2xl divide-y divide-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/20">
                <div className="p-4 flex justify-between items-center">
                  <span>Archived Session</span>
                  <span className="font-bold text-slate-800">{reviewData?.activeSession?.name || 'None'}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>Activated Session (New Boundary)</span>
                  <span className="font-bold text-emerald-700">{newSessionName}</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>Config Duplication</span>
                  <span>Duplicate config selections carried forward</span>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span>Automatic Backup Strategy</span>
                  <span className="text-indigo-600 font-bold uppercase tracking-wider text-[10px]">Secure JSON Blob Snapshot</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 8: Activate Session */}
          {step === 8 && (
            <div className="space-y-6 text-center py-6">
              {!backupId ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Database className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Finalize Session Activation</h3>
                    <p className="text-xs text-slate-500 mt-1">This will seal the database snapshot backup, archive the current session, and roll active class rosters forward.</p>
                  </div>
                  <button
                    onClick={finalizeActivation}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Finalize and Activate</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Transition Completed Successfully!</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      A secure backup of the <strong>{reviewData?.activeSession?.name}</strong> academic session has been created successfully. The new session <strong>{newSessionName}</strong> is now active.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Close Wizard
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer (Next/Back button controls) */}
        {step < 8 && (
          <div className="p-6 border-t border-slate-50 flex justify-between bg-slate-50/50">
            <button
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="flex items-center gap-1 px-4 py-2.5 border border-slate-150 hover:bg-slate-100 text-slate-600 disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {step !== 6 && (
              <button
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-1 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
