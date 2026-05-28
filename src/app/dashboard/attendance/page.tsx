'use client';

import React, { useEffect, useState } from 'react';
import { 
  ClipboardList, CheckCircle, AlertCircle, Save, 
  Users, RefreshCw, Calendar, UserCheck, Info,
  Check, X, AlertTriangle
} from 'lucide-react';

interface AttendanceStudent {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  status: 'PRESENT' | 'ABSENT';
  totalPresent: number;
  totalAbsent: number;
  attendanceRate: number;
  atRisk: boolean;
}

interface Term {
  id: string;
  name: string;
  session: {
    name: string;
  };
  isCurrent: boolean;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Arm {
  id: string;
  name: string;
  classId: string;
  class: ClassLevel;
}

export default function AttendanceSheetsPage() {
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [arms, setArms] = useState<Arm[]>([]);
  
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedArmId, setSelectedArmId] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-05-26'); // Default to local time in metadata
  
  const [assigned, setAssigned] = useState(false);
  const [detectedClass, setDetectedClass] = useState<any>(null);
  const [detectedArm, setDetectedArm] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Initial configuration load
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setUser(sessionObj.user);
        
        // Use today's date from local time metadata as default
        const todayStr = new Date().toISOString().split('T')[0];
        // Ensure we fall back to a safe date if timezone parsing differs
        setSelectedDate(todayStr || '2026-05-26');
        
        initializeAttendanceMetadata(sessionObj.school.id, sessionObj.user, todayStr || '2026-05-26');
      } catch (e) {
        setErrorMsg('Invalid session parameters.');
      }
    }
  }, []);

  const initializeAttendanceMetadata = async (schoolId: string, currentUser: any, initialDate: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch school academic structures
      const setupRes = await fetch(`/api/setup?schoolId=${schoolId}`);
      const setupJson = await setupRes.json();
      if (!setupRes.ok) throw new Error(setupJson.error || 'Failed to initialize metadata.');

      setTerms(setupJson.data.terms || []);
      setClasses(setupJson.data.classes || []);
      setArms(setupJson.data.arms || []);

      // Auto select active term
      const activeTerm = setupJson.data.terms?.find((t: Term) => t.isCurrent);
      const initialTermId = activeTerm ? activeTerm.id : (setupJson.data.terms?.[0]?.id || '');
      setSelectedTermId(initialTermId);

      // Trigger load using teacher ID to detect if they are assigned as class teacher
      const attendanceRes = await fetch(
        `/api/attendance?schoolId=${schoolId}&termId=${initialTermId}&teacherId=${currentUser.id}&date=${initialDate}`
      );
      const attJson = await attendanceRes.json();
      if (!attendanceRes.ok) throw new Error(attJson.error || 'Failed to retrieve attendance logs.');

      if (attJson.data.assigned) {
        setAssigned(true);
        setDetectedClass(attJson.data.class);
        setDetectedArm(attJson.data.arm);
        setSelectedClassId(attJson.data.class.id);
        setSelectedArmId(attJson.data.arm.id);
        setStudents(attJson.data.students || []);
      } else {
        // Not a Class Teacher (could be Admin or Subject Teacher)
        setAssigned(false);
        if (setupJson.data.classes?.length > 0) {
          const firstClassId = setupJson.data.classes[0].id;
          setSelectedClassId(firstClassId);
          
          // filter first arm
          const firstArm = setupJson.data.arms?.find((a: Arm) => a.classId === firstClassId);
          if (firstArm) {
            setSelectedArmId(firstArm.id);
            await loadRosterData(schoolId, initialTermId, firstClassId, firstArm.id, initialDate);
          }
        }
      }

    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Load attendance roster for selected parameters (Fallback mode for non-teachers)
  const loadRosterData = async (schoolId: string, termId: string, classId: string, armId: string, date: string) => {
    if (!termId || !classId || !armId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/attendance?schoolId=${schoolId}&termId=${termId}&classId=${classId}&armId=${armId}&date=${date}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to retrieve class roster.');
      setStudents(json.data.students || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle toggling student status instantly
  const handleToggleStatus = (studentId: string) => {
    setStudents(prev => 
      prev.map(s => {
        if (s.id === studentId) {
          const newStatus: 'PRESENT' | 'ABSENT' = s.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
          
          // Recalculate local stats reactively for instant visual feedback
          let localPresent = s.totalPresent;
          let localAbsent = s.totalAbsent;
          
          // Adjust based on change
          if (newStatus === 'PRESENT') {
            localPresent += 1;
            if (localAbsent > 0) localAbsent -= 1;
          } else {
            localAbsent += 1;
            if (localPresent > 0) localPresent -= 1;
          }
          
          const totalDays = localPresent + localAbsent;
          const localRate = totalDays > 0 ? Math.round((localPresent / totalDays) * 100) : 100;
          const localAtRisk = totalDays > 5 && localRate < 70;

          return {
            ...s,
            status: newStatus,
            totalPresent: localPresent,
            totalAbsent: localAbsent,
            attendanceRate: localRate,
            atRisk: localAtRisk
          };
        }
        return s;
      })
    );
  };

  // 4. Force mark all active students to present
  const handleMarkAllPresent = () => {
    setStudents(prev => 
      prev.map(s => {
        if (s.status === 'ABSENT') {
          const localPresent = s.totalPresent + 1;
          const localAbsent = Math.max(0, s.totalAbsent - 1);
          const totalDays = localPresent + localAbsent;
          const localRate = totalDays > 0 ? Math.round((localPresent / totalDays) * 100) : 100;
          const localAtRisk = totalDays > 5 && localRate < 70;

          return {
            ...s,
            status: 'PRESENT',
            totalPresent: localPresent,
            totalAbsent: localAbsent,
            attendanceRate: localRate,
            atRisk: localAtRisk
          };
        }
        return s;
      })
    );
  };

  // 5. Save entire attendance sheet roster to DB
  const handleSaveAttendance = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const targetClass = assigned ? detectedClass.id : selectedClassId;
    const targetArm = assigned ? detectedArm.id : selectedArmId;

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: school.id,
          termId: selectedTermId,
          classId: targetClass,
          armId: targetArm,
          date: selectedDate,
          markedBy: user.id,
          records: students.map(s => ({
            studentId: s.id,
            status: s.status
          }))
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to commit attendance sheet.');

      setSuccessMsg(`Daily attendance successfully logged for ${selectedDate}! Terminal aggregates synchronized.`);
      
      // Refresh list to pull updated historical calculations securely
      if (assigned) {
        await loadRosterData(school.id, selectedTermId, detectedClass.id, detectedArm.id, selectedDate);
      } else {
        await loadRosterData(school.id, selectedTermId, selectedClassId, selectedArmId, selectedDate);
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error writing logs.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger loading when filter selections change (with automatic teacher room boundaries)
  const handleFilterChange = async (termId: string, classId: string, armId: string, date: string) => {
    setSelectedTermId(termId);
    setSelectedClassId(classId);
    setSelectedArmId(armId);
    setSelectedDate(date);
    if (!assigned) {
      await loadRosterData(school.id, termId, classId, armId, date);
    } else if (detectedClass && detectedArm) {
      await loadRosterData(school.id, termId, detectedClass.id, detectedArm.id, date);
    }
  };

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    const filteredArms = arms.filter(a => a.classId === classId);
    const nextArmId = filteredArms.length > 0 ? filteredArms[0].id : '';
    setSelectedArmId(nextArmId);
    if (!assigned) {
      await loadRosterData(school.id, selectedTermId, classId, nextArmId, selectedDate);
    }
  };

  // Multi-tenant styling parameters
  const isGreenwood = school?.slug === 'greenwood-secondary';
  const accentText = isGreenwood ? 'text-emerald-500' : 'text-indigo-500';
  const accentBg = isGreenwood ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100';
  const buttonPrimary = isGreenwood ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-200' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-200';
  const badgeColors = isGreenwood ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white';

  // Compute stats metrics on-the-fly
  const totalEnrollment = students.length;
  const dailyPresentCount = students.filter(s => s.status === 'PRESENT').length;
  const dailyAttendanceRate = totalEnrollment > 0 ? Math.round((dailyPresentCount / totalEnrollment) * 100) : 0;
  const poorAttendanceCount = students.filter(s => s.attendanceRate < 70 && (s.totalPresent + s.totalAbsent) > 0).length;
  const activeAtRiskCount = students.filter(s => s.atRisk).length;

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${accentBg}`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            Daily Student Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-xl">
            Select a date, mark attendance with fast one-click toggles, and save. The system automatically recalculates term statistics to synchronize report cards.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={loading || students.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            Mark All Present
          </button>
          
          <button
            type="button"
            onClick={handleSaveAttendance}
            disabled={saving || loading || students.length === 0}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 ${buttonPrimary}`}
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : 'Save Attendance'}
          </button>
        </div>
      </div>

      {/* 2. Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
      )}

      {/* 3. Class Parameters & Date Selector */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Calendar className={`w-4.5 h-4.5 ${accentText}`} />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Parameters & Date Coordinates</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end text-xs font-semibold">
          {/* Term selector */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Academic Term</label>
            <select
              value={selectedTermId}
              onChange={(e) => handleFilterChange(e.target.value, selectedClassId, selectedArmId, selectedDate)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-300 font-bold"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.session.name}) {t.isCurrent ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Attendance Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleFilterChange(selectedTermId, selectedClassId, selectedArmId, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-300 font-bold"
            />
          </div>

          {assigned ? (
            /* Auto-detected Class Teacher Room */
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Assigned Class</label>
                <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-500 font-extrabold select-none">
                  {detectedClass?.name || 'Class cohort'}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Assigned Arm</label>
                <div className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200/60 text-slate-500 font-extrabold select-none">
                  Arm {detectedArm?.name || 'Arm division'}
                </div>
              </div>
            </div>
          ) : (
            /* Admin/Dean Fallback selection panels */
            <>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Select Class (Admin View)</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-300 font-bold"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Select Arm (Admin View)</label>
                <select
                  value={selectedArmId}
                  onChange={(e) => handleFilterChange(selectedTermId, selectedClassId, e.target.value, selectedDate)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 focus:outline-none focus:border-slate-300 font-bold"
                >
                  {arms
                    .filter((a) => a.classId === selectedClassId)
                    .map((arm) => (
                      <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
                    ))
                  }
                </select>
              </div>
            </>
          )}
        </div>

        {!assigned && (
          <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-[10px] flex gap-2 font-medium leading-normal animate-fadeIn">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
            <span>Admin View Override active. You can browse and override attendance logs across all classrooms.</span>
          </div>
        )}
      </div>

      {/* 4. Classroom Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-150 flex items-center gap-4 hover:border-slate-250 transition-colors duration-300">
          <div className={`p-3 rounded-xl bg-slate-50 text-slate-500 border border-slate-200`}>
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Size</span>
            <span className="text-xl font-extrabold text-slate-900">{totalEnrollment} Enrolled</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-150 flex items-center gap-4 hover:border-slate-250 transition-colors duration-300">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Daily Presence Rate</span>
            <span className="text-xl font-extrabold text-emerald-600">{dailyAttendanceRate}% Present ({dailyPresentCount}/{totalEnrollment})</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-150 flex items-center gap-4 hover:border-slate-250 transition-colors duration-300">
          <div className={`p-3 rounded-xl ${activeAtRiskCount > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">At-Risk Students</span>
            <span className={`text-xl font-extrabold ${activeAtRiskCount > 0 ? 'text-red-500' : 'text-amber-600'}`}>
              {activeAtRiskCount} Alert{activeAtRiskCount !== 1 ? 's' : ''} (<span className="text-xs">&lt;70% Rate</span>)
            </span>
          </div>
        </div>
      </div>

      {/* 5. Dynamic Attendance Sheets Table */}
      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="w-8 h-8 border-3 border-t-slate-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-semibold">Pulling records and calculating terminal coefficients...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="p-16 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">No Students Registered</h4>
            <p className="text-xs text-slate-400 mt-1">There are no active students in this classroom subdivision arm.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden space-y-0">
          {/* Header metadata row */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className={`w-4 h-4 ${accentText}`} />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Daily Classroom Ledger</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Date: <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{selectedDate}</span>
            </span>
          </div>

          {/* Roster Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Admission Number</th>
                  <th className="p-4">Student Name</th>
                  <th className="p-4 text-center">Daily Status (Tap to Toggle)</th>
                  <th className="p-4 text-center">Term Cumulative counts</th>
                  <th className="p-4 text-center">Term Attendance Rate</th>
                  <th className="p-4 text-center">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {students.map((student) => {
                  const hasStats = (student.totalPresent + student.totalAbsent) > 0;
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                      {/* Admission */}
                      <td className="p-4 font-mono font-bold text-slate-400">
                        {student.admissionNumber}
                      </td>

                      {/* Name */}
                      <td className="p-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-xs shadow-inner`}>
                            {student.lastName[0]}{student.firstName[0]}
                          </div>
                          <div>
                            <span className="text-sm font-extrabold text-slate-800">{student.lastName} {student.firstName}</span>
                            {student.middleName && <span className="text-xs text-slate-400 block font-normal">{student.middleName}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Daily Status Toggles */}
                      <td className="p-4">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(student.id)}
                            className={`w-36 py-2 rounded-xl flex items-center justify-center gap-2 border font-extrabold text-[10px] tracking-wider uppercase transition-all relative overflow-hidden active:scale-95 shadow-sm ${
                              student.status === 'PRESENT'
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-750'
                                : 'bg-rose-50 border-rose-200 text-rose-600'
                            }`}
                          >
                            {student.status === 'PRESENT' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-650 stroke-[3px]" />
                                <span>PRESENT</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-rose-600 stroke-[3px]" />
                                <span>ABSENT</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Term Cumulative counts */}
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-200/40 px-3 py-1 rounded-xl font-mono text-[11px] font-bold text-slate-600 shadow-inner">
                          <span className="text-emerald-600">{student.totalPresent} Present</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-red-500">{student.totalAbsent} Absent</span>
                        </div>
                      </td>

                      {/* Term Attendance Rate */}
                      <td className="p-4 text-center font-mono font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-xs ${
                          student.attendanceRate >= 90 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : student.attendanceRate >= 70 
                            ? 'bg-sky-50 text-sky-600 border border-sky-100'
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {student.attendanceRate}%
                        </span>
                      </td>

                      {/* Warnings */}
                      <td className="p-4 text-center">
                        {student.atRisk ? (
                          <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl text-amber-800 text-[10px] font-extrabold uppercase tracking-wide animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>⚠️ At-Risk Student</span>
                          </div>
                        ) : hasStats && student.attendanceRate < 80 ? (
                          <span className="text-[10px] font-bold text-slate-400">Cautionary</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal">Optimal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Prompt Save Card */}
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 leading-normal flex items-center gap-1">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
              Change statuses instantly using the toggles. Remember to click "Save Attendance" to push updates.
            </span>
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={saving}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 ${buttonPrimary}`}
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Commiting changes...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';
