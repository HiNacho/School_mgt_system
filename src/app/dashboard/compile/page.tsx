'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileBarChart, CheckSquare, Sparkles, Printer, RefreshCw, 
  AlertCircle, CheckCircle, Award, Percent, Users, TrendingUp,
  Search, Eye, HelpCircle, X, Check
} from 'lucide-react';

interface StudentReport {
  student: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    middleName: string;
    gender: 'MALE' | 'FEMALE';
    passportPhoto: string | null;
    className: string;
    armName: string;
  };
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    ca1: number | null;
    ca2: number | null;
    assignment: number | null;
    exam: number | null;
    total: number;
    grade: string;
    remarks: string;
    subjectRank: number;
    rankFormatted: string;
  }>;
  summary: {
    aggregateScore: number;
    averageScore: number;
    classPosition: number;
    classPositionFormatted: string;
    totalStudents: number;
    passStatus: 'PASS' | 'FAIL';
  };
  attendance: {
    present: number;
    absent: number;
    total: number;
  };
  comments: {
    teacher: string;
    headTeacher: string;
    isAIGenerated: boolean;
  };
  traits: {
    punctuality: number;
    neatness: number;
    honesty: number;
    politeness: number;
    selfControl: number;
    attentiveness: number;
    reliability: number;
    sportsmanship: number;
  };
}

export default function ReportCardCompilerPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compiling, setCompiling] = useState(false);

  // Filter selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedArm, setSelectedArm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Compiled reports
  const [compiledSchool, setCompiledSchool] = useState<any>(null);
  const [compiledTerm, setCompiledTerm] = useState<any>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [autoPreviewStudentId, setAutoPreviewStudentId] = useState<string | null>(null);
  
  // Modals & previews
  const [previewReport, setPreviewReport] = useState<StudentReport | null>(null);
  
  // Status feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      setSession(parsed);

      const params = new URLSearchParams(window.location.search);
      const queryClassId = params.get('classId');
      const queryArmId = params.get('armId');
      const queryTermId = params.get('termId');
      const queryStudentId = params.get('studentId');

      if (queryStudentId) {
        setAutoPreviewStudentId(queryStudentId);
      }

      loadSetupConfigs(parsed, queryClassId, queryArmId, queryTermId);
    }
  }, []);

  const loadSetupConfigs = async (
    sess: any,
    queryClassId: string | null,
    queryArmId: string | null,
    queryTermId: string | null
  ) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${sess.school.id}`);
      const json = await res.json();
      setSetup(json.data);

      const defaultClassId = queryClassId && json.data.classes?.some((c: any) => c.id === queryClassId)
        ? queryClassId
        : (json.data.classes?.[0]?.id || '');
      setSelectedClass(defaultClassId);

      const defaultTermId = queryTermId && json.data.terms?.some((t: any) => t.id === queryTermId)
        ? queryTermId
        : (json.data.terms?.find((t: any) => t.isCurrent)?.id || json.data.terms?.[0]?.id || '');
      setSelectedTerm(defaultTermId);

      const relatedArms = json.data.arms?.filter((a: any) => a.classId === defaultClassId) || [];
      const defaultArmId = queryArmId && relatedArms.some((a: any) => a.id === queryArmId)
        ? queryArmId
        : (relatedArms[0]?.id || '');
      setSelectedArm(defaultArmId);

      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to fetch school configuration parameters');
      setLoading(false);
    }
  };

  // Auto preview triggered once compile completes
  useEffect(() => {
    if (autoPreviewStudentId && reports.length > 0) {
      const matched = reports.find(r => r.student.id === autoPreviewStudentId);
      if (matched) {
        setPreviewReport(matched);
        setAutoPreviewStudentId(null);
      }
    }
  }, [reports, autoPreviewStudentId]);

  // Auto compile when selections are populated to show immediate results
  useEffect(() => {
    if (selectedClass && selectedArm && selectedTerm && session) {
      handleCompile();
    }
  }, [selectedClass, selectedArm, selectedTerm]);

  const handleCompile = async () => {
    setCompiling(true);
    setErrorMsg('');
    setSuccessMsg('');
    setReports([]);
    setSelectedStudentIds(new Set());

    try {
      const res = await fetch(
        `/api/reports?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`
      );
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to compile reports');

      setReports(json.data || []);
      setCompiledSchool(json.school);
      setCompiledTerm(json.term);

      // Select all by default for bulk printing
      if (json.data?.length > 0) {
        const ids = json.data.map((r: any) => r.student.id);
        setSelectedStudentIds(new Set(ids));
      }

      setSuccessMsg(`Class Roster compiled! Calculated totals, grades, and positional ranks for ${json.data?.length || 0} students.`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error compiling reports. Ensure scores have been uploaded/saved first.');
    } finally {
      setCompiling(false);
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === reports.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(reports.map(r => r.student.id)));
    }
  };

  const handlePrintSelected = () => {
    if (selectedStudentIds.size === 0) {
      setErrorMsg('Please select at least one student report card to print.');
      return;
    }
    // Simple window.print() is fully bound to @media print rules in print.css, which
    // automatically hides everything except our .report-card-container containers!
    window.print();
  };

  const handlePrintSingle = (studentId: string) => {
    // Select only this student, print, then restore selection
    const prevSelection = new Set(selectedStudentIds);
    setSelectedStudentIds(new Set([studentId]));
    setTimeout(() => {
      window.print();
      setSelectedStudentIds(prevSelection);
    }, 100);
  };

  // Analytics Helpers
  const getClassAverage = () => {
    if (reports.length === 0) return 0;
    const sum = reports.reduce((acc, r) => acc + r.summary.averageScore, 0);
    return Number((sum / reports.length).toFixed(1));
  };

  const getClassPassRate = () => {
    if (reports.length === 0) return 0;
    const passes = reports.filter(r => r.summary.passStatus === 'PASS').length;
    return Math.round((passes / reports.length) * 100);
  };

  const getLowestSubject = () => {
    if (reports.length === 0) return 'None';
    // Map all subjects and calculate averages
    const subjectTotals: Record<string, { sum: number; count: number; code: string }> = {};
    reports.forEach(r => {
      r.subjects.forEach(s => {
        if (!subjectTotals[s.subjectName]) {
          subjectTotals[s.subjectName] = { sum: 0, count: 0, code: s.subjectCode };
        }
        if (s.total !== null) {
          subjectTotals[s.subjectName].sum += s.total;
          subjectTotals[s.subjectName].count += 1;
        }
      });
    });

    let lowestAvg = 100;
    let lowestName = 'None';
    Object.entries(subjectTotals).forEach(([name, data]) => {
      if (data.count > 0) {
        const avg = data.sum / data.count;
        if (avg < lowestAvg) {
          lowestAvg = avg;
          lowestName = `${name} (${data.code}) - ${avg.toFixed(1)}%`;
        }
      }
    });

    return lowestName;
  };

  const isGreenwood = session?.school?.slug === 'greenwood-secondary';
  const themeAccentColor = isGreenwood ? 'text-emerald-600' : 'text-indigo-600';
  const themeBgAccent = isGreenwood ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700';
  const themeAccentBorder = isGreenwood ? 'border-emerald-250' : 'border-indigo-250';
  const themeBgSubtle = isGreenwood ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600';

  // Crest SVG for premium display
  const SchoolCrestSVG = () => (
    <svg className="w-16 h-16 text-amber-500 drop-shadow-md mx-auto" viewBox="0 0 100 100" fill="currentColor">
      <path d="M50 5 L85 20 C85 60 50 90 50 90 C50 90 15 60 15 20 Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M50 7 L82 21 C82 58 50 86 50 86 C50 86 18 58 18 21 Z" fill="#1e293b" />
      {/* Crown/Star */}
      <circle cx="50" cy="32" r="6" fill="currentColor" />
      <polygon points="50,15 54,23 63,24 56,30 58,39 50,34 42,39 44,30 37,24 46,23" fill="currentColor" />
      {/* Book */}
      <path d="M30 55 C35 50 48 50 50 55 C52 50 65 50 70 55 L70 70 C65 65 52 65 50 70 C48 65 35 65 30 70 Z" fill="currentColor" />
      <line x1="50" y1="55" x2="50" y2="70" stroke="#1e293b" strokeWidth="2" />
    </svg>
  );

  const getTraitLabel = (rating: number) => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Very Good';
      case 3: return 'Good';
      case 2: return 'Fair';
      default: return 'Needs Improvement';
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`w-8 h-8 border-4 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto`} />
          <p className="text-slate-400 text-xs tracking-wider uppercase font-bold">Initializing printable compiler...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. Header controls (no-print) */}
      <div className="no-print space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
              <FileBarChart className={`w-6 h-6 ${themeAccentColor}`} /> Printable Report Card Hub
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Process session standings, review grade ranking leaderboards, and print high-fidelity A4 academic reports.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintSelected}
              disabled={selectedStudentIds.size === 0 || reports.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${themeBgAccent}`}
            >
              <Printer className="w-4 h-4" />
              Print Selected Cards ({selectedStudentIds.size})
            </button>
          </div>
        </div>

        {/* Notices */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-250 text-red-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button type="button" onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Filters */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                const relatedArms = setup?.arms?.filter((a: any) => a.classId === e.target.value) || [];
                if (relatedArms.length > 0) setSelectedArm(relatedArms[0].id);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors"
            >
              {setup?.classes?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Arm / Stream</label>
            <select
              value={selectedArm}
              onChange={(e) => setSelectedArm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors"
            >
              {setup?.arms?.filter((a: any) => a.classId === selectedClass).map((arm: any) => (
                <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Term</label>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-250 transition-colors"
            >
              {setup?.terms?.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.session.name})</option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="button"
              onClick={handleCompile}
              disabled={compiling}
              className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all disabled:opacity-50 h-9 flex justify-center items-center gap-2 ${themeBgAccent}`}
            >
              {compiling ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Compiling...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Compile Class Roster
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Statistical overview blocks */}
        {reports.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-xl ${themeBgSubtle}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Evaluated</span>
                <span className="text-xl font-extrabold text-slate-800">{reports.length} Students</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
                <Percent className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Class Avg Score</span>
                <span className="text-xl font-extrabold text-slate-800">{getClassAverage()}%</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pass Rate</span>
                <span className="text-xl font-extrabold text-slate-800">{getClassPassRate()}%</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lowest Avg Subject</span>
                <span className="text-xs font-extrabold text-amber-700 truncate max-w-[150px] block" title={getLowestSubject()}>
                  {getLowestSubject()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. Class compilation table */}
        {reports.length > 0 && (
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CheckSquare className={`w-4 h-4 ${themeAccentColor}`} /> Academic Roster & rankings matrix
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Select reports to include in compilation print.</span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.size === reports.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 bg-white focus:ring-0 w-4 h-4 cursor-pointer accent-emerald-600"
                      />
                    </th>
                    <th className="p-4 w-16 text-center">Rank</th>
                    <th className="p-4">Admission No</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 w-24 text-center">Term Avg</th>
                    <th className="p-4 w-24 text-center">Status</th>
                    <th className="p-4 w-40 text-center">Print Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {reports.map((row) => {
                    const isSelected = selectedStudentIds.has(row.student.id);
                    return (
                      <tr key={row.student.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-slate-50/20' : ''}`}>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(row.student.id)}
                            className="rounded border-slate-300 bg-white focus:ring-0 w-4 h-4 cursor-pointer accent-emerald-600"
                          />
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 font-mono">
                          {row.summary.classPositionFormatted}
                        </td>
                        <td className="p-4 font-mono text-slate-500 font-bold uppercase">{row.student.admissionNumber}</td>
                        <td className="p-4 text-slate-800 font-semibold">{row.student.lastName}, {row.student.firstName} {row.student.middleName}</td>
                        <td className="p-4 text-center font-bold text-slate-700 font-mono">{row.summary.averageScore}%</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                            row.summary.passStatus === 'PASS' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' 
                              : 'bg-red-50 text-red-700 border border-red-200/80'
                          }`}>
                            {row.summary.passStatus}
                          </span>
                        </td>
                        <td className="p-4 flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewReport(row)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> Preview
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(row.student.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 hover:text-slate-850 transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm"
                          >
                            <Printer className={`w-3.5 h-3.5 ${themeAccentColor}`} /> Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reports.length === 0 && !compiling && (
          <div className="p-16 rounded-3xl bg-white border border-dashed border-slate-250 text-center space-y-4 shadow-sm">
            <FileBarChart className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-700">Ready to Process report cards?</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Choose the desired Class-Arm and Term parameters above, and click "Compile Class Roster" to compute final scores and print cards.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 4. HIGH-FIDELITY PREVIEW MODAL (no-print) */}
      {previewReport && (
        <div className="no-print fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-extrabold text-slate-850 text-sm flex items-center gap-2">
                  <Eye className={`w-4 h-4 ${themeAccentColor}`} /> High-Fidelity Printable Card Preview
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Showing exact A4 layout structure for {previewReport.student.lastName}, {previewReport.student.firstName}.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintSingle(previewReport.student.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${themeBgAccent}`}
                >
                  <Printer className="w-3.5 h-3.5" /> Print This Card
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setPreviewReport(null)} 
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Content Scroll Area (Force A4 rendering styles visually!) */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 flex justify-center">
              
              {/* VISUAL A4 EMBED CONTAINER */}
              <div className="bg-white text-slate-950 p-8 rounded shadow-lg w-[210mm] min-h-[297mm] scale-[0.8] origin-top border border-slate-300 font-serif flex flex-col justify-between">
                
                {/* Visual Card Header */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div className="flex items-center gap-4">
                      {/* Logo shield */}
                      {compiledSchool?.logo ? (
                        <img src={compiledSchool.logo} alt="School Logo" className="w-14 h-14 rounded-full object-cover border-2 border-slate-800 bg-white" />
                      ) : (
                        <div className="text-slate-800 border-2 border-slate-800 p-1 rounded-full w-14 h-14 flex items-center justify-center bg-slate-100 font-extrabold">
                          {isGreenwood ? 'G.S' : 'L.E.P'}
                        </div>
                      )}
                      <div>
                        <h1 className="font-extrabold text-lg uppercase tracking-tight text-slate-900">{compiledSchool?.name}</h1>
                        <p className="text-[10px] text-slate-600 font-sans italic">{compiledSchool?.address || 'Lagos, Nigeria'}</p>
                        <p className="text-[9px] text-slate-500 font-sans">Contact: {compiledSchool?.phone || '+234 803 000 0000'} | {compiledSchool?.email}</p>
                      </div>
                    </div>

                    <div className="text-right font-sans">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white font-extrabold text-[10px] rounded uppercase tracking-wider">
                        Official Academic Report
                      </span>
                      <p className="text-[10px] font-bold text-slate-600 mt-2 font-mono">{compiledTerm?.name} ({compiledTerm?.session})</p>
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="grid grid-cols-12 gap-4 border border-slate-900 p-3 rounded font-sans text-[11px] bg-slate-50/50">
                    <div className="col-span-8 grid grid-cols-2 gap-y-1.5">
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Student Name</span>
                        <strong className="text-slate-900 text-xs font-serif">{previewReport.student.lastName}, {previewReport.student.firstName} {previewReport.student.middleName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Admission ID</span>
                        <strong className="text-slate-900 text-xs font-mono font-bold">{previewReport.student.admissionNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Class Level</span>
                        <strong className="text-slate-900 text-xs">{previewReport.student.className} - Arm {previewReport.student.armName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Student Gender</span>
                        <strong className="text-slate-900 text-xs uppercase">{previewReport.student.gender}</strong>
                      </div>
                    </div>

                    <div className="col-span-4 border-l border-slate-200 pl-4 grid grid-cols-2 gap-y-1.5">
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Class Position</span>
                        <strong className="text-slate-900 text-sm font-serif font-extrabold">{previewReport.summary.classPositionFormatted} <span className="text-[10px] text-slate-500 font-normal">of {previewReport.summary.totalStudents}</span></strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Term Average</span>
                        <strong className="text-slate-900 text-sm font-serif font-extrabold">{previewReport.summary.averageScore}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Attendance</span>
                        <strong className="text-slate-900 text-xs">{previewReport.attendance.present} / {previewReport.attendance.total} days</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[8px] block">Result Status</span>
                        <strong className={`text-xs ${previewReport.summary.passStatus === 'PASS' ? 'text-emerald-700' : 'text-red-700'} font-extrabold`}>{previewReport.summary.passStatus}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Subject Matrix */}
                  <table className="w-full border-collapse border border-slate-900 text-slate-900 text-left font-sans text-[10px] leading-tight">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                        <th className="p-1.5 border border-slate-900">Subject Name</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">CA1 (15)</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">CA2 (15)</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">Asg (10)</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">Exam (60)</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">Total</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">Grade</th>
                        <th className="p-1.5 border border-slate-900 text-center w-12">Rank</th>
                        <th className="p-1.5 border border-slate-900">Teacher's Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {previewReport.subjects.map((sub) => (
                        <tr key={sub.subjectId} className="hover:bg-slate-50">
                          <td className="p-1 border border-slate-300 font-serif font-bold text-slate-900">{sub.subjectName}</td>
                          <td className="p-1 border border-slate-300 text-center font-mono">{sub.ca1 ?? '-'}</td>
                          <td className="p-1 border border-slate-300 text-center font-mono">{sub.ca2 ?? '-'}</td>
                          <td className="p-1 border border-slate-300 text-center font-mono">{sub.assignment ?? '-'}</td>
                          <td className="p-1 border border-slate-300 text-center font-mono">{sub.exam ?? '-'}</td>
                          <td className="p-1 border border-slate-300 text-center font-bold font-mono bg-slate-50/60">{sub.total}</td>
                          <td className="p-1 border border-slate-300 text-center">
                            <span className="font-extrabold">{sub.grade}</span>
                          </td>
                          <td className="p-1 border border-slate-300 text-center font-mono">{sub.rankFormatted}</td>
                          <td className="p-1 border border-slate-300 italic text-slate-600">{sub.remarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Section: Traits & Remarks */}
                <div className="space-y-4 mt-4 border-t-2 border-slate-900 pt-4">
                  <div className="grid grid-cols-12 gap-4">
                    
                    {/* Left: Traits and Behavior ratings (compact) */}
                    <div className="col-span-5 border border-slate-900 rounded p-2 text-[9px] font-sans">
                      <h4 className="font-extrabold text-[10px] uppercase border-b border-slate-800 pb-1 mb-1.5 text-center bg-slate-50">
                        Behavior & Affective Ratings
                      </h4>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                        {Object.entries(previewReport.traits).map(([trait, rating]) => (
                          <div key={trait} className="flex justify-between items-center border-b border-slate-100 py-0.5">
                            <span className="capitalize text-slate-600">{trait.replace(/([A-Z])/g, ' $1')}</span>
                            <strong className="text-slate-950 font-bold font-mono text-[9px]">{rating} / 5</strong>
                          </div>
                        ))}
                      </div>
                      <div className="text-[7.5px] text-slate-500 font-bold text-center mt-2 font-mono uppercase">
                        Key: 5=Excellent, 4=Very Good, 3=Good, 2=Fair, 1=Poor
                      </div>
                    </div>

                    {/* Right: Comments and Signatures */}
                    <div className="col-span-7 space-y-3 font-sans">
                      
                      {/* Teacher remark */}
                      <div className="border border-slate-900 rounded p-2 text-[9px] relative bg-slate-50/20">
                        <strong className="block text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">
                          Class Teacher's Remarks & Counsel
                        </strong>
                        <p className="font-serif italic text-slate-800 leading-normal">
                          "{previewReport.comments.teacher}"
                        </p>
                      </div>

                      {/* Principal remark */}
                      <div className="border border-slate-900 rounded p-2 text-[9px] relative bg-slate-50/20">
                        <strong className="block text-[8px] uppercase tracking-wider text-slate-500 font-extrabold mb-1">
                          Principal's Official Remarks
                        </strong>
                        <p className="font-serif italic text-slate-800 leading-normal">
                          "{previewReport.comments.headTeacher}"
                        </p>
                      </div>
                    </div>

                  </div>

                  {/* Stamp & Signatures Graphic Blocks */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center font-sans text-[9px]">
                    <div className="space-y-1">
                      <div className="h-6 flex items-end justify-center font-serif text-[10px] text-indigo-700 italic font-bold">
                        {previewReport.student.className.startsWith('JS') ? 'Mrs. T. Adegoke' : 'Mr. K. Okon'}
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                        Class Teacher Signature
                      </div>
                    </div>

                    {/* Stamp illustration in CSS */}
                    <div className="relative flex justify-center items-center">
                      <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/40 text-red-500/40 text-[7px] font-bold flex flex-col items-center justify-center transform -rotate-12 scale-90">
                        <span>APPROVED</span>
                        <span className="text-[5px] uppercase truncate max-w-[42px]" title={compiledSchool?.name || 'GREENWOOD ACAD.'}>
                          {compiledSchool?.name || 'GREENWOOD ACAD.'}
                        </span>
                        <span className="text-[5px]">LAGOS</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="h-6 flex items-end justify-center font-serif text-[10px] text-indigo-700 italic font-bold">
                        Dr. A. B. Olumide
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-slate-500 font-bold uppercase tracking-wider text-[8px]">
                        Principal's Signature & Stamp
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* 5. DYNAMIC PRINT-ONLY MULTI-PAGE CONTAINER (Only active during browser print pipeline) */}
      <div className="print-only">
        {reports.filter(r => selectedStudentIds.has(r.student.id)).map((report) => (
          <div key={report.student.id} className="report-card-container font-serif p-4" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}>
            
            {/* Header Block */}
            <div className="space-y-3">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Crest emblem in black & white high contrast */}
                  {compiledSchool?.logo ? (
                    <img src={compiledSchool.logo} alt="School Logo" style={{ borderRadius: '50%', width: '56px', height: '56px', objectFit: 'cover', border: '2px solid #000000', backgroundColor: '#ffffff' }} />
                  ) : (
                    <div style={{ border: '2px solid #000000', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', backgroundColor: '#f8fafc', padding: '10px' }}>
                      {isGreenwood ? 'G.S' : 'L.E.P'}
                    </div>
                  )}
                  <div>
                    <h1 style={{ fontWeight: 800, fontSize: '18px', margin: 0, textTransform: 'uppercase', color: '#000' }}>{compiledSchool?.name}</h1>
                    <p style={{ fontSize: '9px', color: '#334155', margin: '2px 0 0 0', fontFamily: 'sans-serif' }}>{compiledSchool?.address || 'Lagos, Nigeria'}</p>
                    <p style={{ fontSize: '8px', color: '#475569', margin: '1px 0 0 0', fontFamily: 'sans-serif' }}>Phone: {compiledSchool?.phone || '+234 803 000 0000'} | {compiledSchool?.email}</p>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
                  <span style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: '#000000', color: '#ffffff', fontWeight: 'bold', fontSize: '9px', borderRadius: '2px', textTransform: 'uppercase' }}>
                    Official Academic Report
                  </span>
                  <p style={{ fontSize: '9px', fontWeight: 'bold', margin: '6px 0 0 0' }}>{compiledTerm?.name} ({compiledTerm?.session})</p>
                </div>
              </div>

              {/* Student details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px', border: '1px solid #000000', padding: '10px', borderRadius: '4px', backgroundColor: '#f8fafc', fontSize: '10px', fontFamily: 'sans-serif' }}>
                <div style={{ gridColumn: 'span 8', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Student Name</span>
                    <strong style={{ fontSize: '11px', color: '#000', fontFamily: 'serif' }}>{report.student.lastName}, {report.student.firstName} {report.student.middleName}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Admission ID</span>
                    <strong style={{ fontSize: '11px', color: '#000', fontFamily: 'monospace' }}>{report.student.admissionNumber}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Class Level</span>
                    <strong style={{ fontSize: '11px', color: '#000' }}>{report.student.className} - Arm {report.student.armName}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Student Gender</span>
                    <strong style={{ fontSize: '11px', color: '#000', textTransform: 'uppercase' }}>{report.student.gender}</strong>
                  </div>
                </div>

                <div style={{ gridColumn: 'span 4', borderLeft: '1px solid #cbd5e1', paddingLeft: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Class Position</span>
                    <strong style={{ fontSize: '12px', color: '#000', fontFamily: 'serif', fontWeight: 800 }}>{report.summary.classPositionFormatted} <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 'normal' }}>of {report.summary.totalStudents}</span></strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Term Average</span>
                    <strong style={{ fontSize: '12px', color: '#000', fontFamily: 'serif', fontWeight: 800 }}>{report.summary.averageScore}%</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Attendance</span>
                    <strong style={{ fontSize: '11px', color: '#000' }}>{report.attendance.present} / {report.attendance.total} days</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '7px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', display: 'block' }}>Result Status</span>
                    <strong style={{ fontSize: '11px', fontWeight: 800 }} className={report.summary.passStatus === 'PASS' ? 'badge-excellent' : 'badge-fail'}>{report.summary.passStatus}</strong>
                  </div>
                </div>
              </div>

              {/* Subject Matrix */}
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000000', fontSize: '9px', fontFamily: 'sans-serif' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'left', fontWeight: 'bold' }}>Subject Name</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>CA1 (15)</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>CA2 (15)</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>Asg (10)</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>Exam (60)</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>Total</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>Grade</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', width: '40px', fontWeight: 'bold' }}>Rank</th>
                    <th style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'left', fontWeight: 'bold' }}>Teacher's Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  {report.subjects.map((sub) => (
                    <tr key={sub.subjectId}>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', fontWeight: 'bold', fontFamily: 'serif' }}>{sub.subjectName}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontFamily: 'monospace' }}>{sub.ca1 ?? '-'}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontFamily: 'monospace' }}>{sub.ca2 ?? '-'}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontFamily: 'monospace' }}>{sub.assignment ?? '-'}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontFamily: 'monospace' }}>{sub.exam ?? '-'}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold', fontFamily: 'monospace', backgroundColor: '#f8fafc' }}>{sub.total}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontWeight: 'bold' }}>{sub.grade}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', textAlign: 'center', fontFamily: 'monospace' }}>{sub.rankFormatted}</td>
                      <td style={{ padding: '4px 6px', border: '1px solid #000000', fontStyle: 'italic', color: '#334155' }}>{sub.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Traits & Remarks Column */}
            <div style={{ marginTop: '16px', borderTop: '2px solid #000000', paddingTop: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
                
                {/* Behavioral traits */}
                <div style={{ gridColumn: 'span 5', border: '1px solid #000000', padding: '6px', borderRadius: '2px', fontSize: '8.5px', fontFamily: 'sans-serif' }}>
                  <h4 style={{ fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px', margin: '0 0 6px 0', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                    Behavior & Affective Ratings
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '2px', columnGap: '8px' }}>
                    {Object.entries(report.traits).map(([trait, rating]) => (
                      <div key={trait} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '1px 0' }}>
                        <span style={{ textTransform: 'capitalize', color: '#475569' }}>{trait.replace(/([A-Z])/g, ' $1')}</span>
                        <strong style={{ color: '#000', fontFamily: 'monospace' }}>{rating} / 5</strong>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '7px', color: '#64748b', textAlign: 'center', marginTop: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Key: 5=Excellent, 4=Very Good, 3=Good, 2=Fair, 1=Poor
                  </div>
                </div>

                {/* Teacher remarks & principal comments */}
                <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'sans-serif', fontSize: '8.5px' }}>
                  <div style={{ border: '1px solid #000000', padding: '6px', borderRadius: '2px' }}>
                    <strong style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', color: '#475569', fontWeight: 'bold', marginBottom: '2px' }}>
                      Class Teacher's Remarks & Counsel
                    </strong>
                    <p style={{ fontFamily: 'serif', fontStyle: 'italic', margin: 0, color: '#000', lineHeight: 1.2 }}>
                      "{report.comments.teacher}"
                    </p>
                  </div>

                  <div style={{ border: '1px solid #000000', padding: '6px', borderRadius: '2px' }}>
                    <strong style={{ display: 'block', fontSize: '8px', textTransform: 'uppercase', color: '#475569', fontWeight: 'bold', marginBottom: '2px' }}>
                      Principal's Official Remarks
                    </strong>
                    <p style={{ fontFamily: 'serif', fontStyle: 'italic', margin: 0, color: '#000', lineHeight: 1.2 }}>
                      "{report.comments.headTeacher}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Stamp & signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', textAlign: 'center', fontSize: '9px', fontFamily: 'sans-serif' }}>
                <div>
                  <div style={{ height: '14px', fontFamily: 'serif', fontSize: '10px', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 'bold' }}>
                    {report.student.className.startsWith('JS') ? 'Mrs. T. Adegoke' : 'Mr. K. Okon'}
                  </div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '2px', fontSize: '8px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Class Teacher Signature
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px dashed rgba(239, 68, 68, 0.4)', color: 'rgba(239, 68, 68, 0.4)', fontSize: '6px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-12deg)' }}>
                    <span>APPROVED</span>
                    <span style={{ fontSize: '4px', textTransform: 'uppercase', display: 'inline-block', maxWidth: '34px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={compiledSchool?.name || 'GREENWOOD ACAD.'}>
                      {compiledSchool?.name || 'GREENWOOD ACAD.'}
                    </span>
                  </div>
                </div>

                <div>
                  <div style={{ height: '14px', fontFamily: 'serif', fontSize: '10px', color: '#1e3a8a', fontStyle: 'italic', fontWeight: 'bold' }}>
                    Dr. A. B. Olumide
                  </div>
                  <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '2px', fontSize: '8px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    Principal's Signature & Stamp
                  </div>
                </div>
              </div>

            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
export const dynamic = 'force-dynamic';
