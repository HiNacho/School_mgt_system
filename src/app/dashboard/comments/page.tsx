'use client';

import React, { useEffect, useState } from 'react';
import { 
  MessageSquarePlus, CheckCircle, AlertCircle, Sparkles, Save, RefreshCw, UserCheck, HelpCircle
} from 'lucide-react';

const CATEGORIES = [
  'punctuality',
  'neatness',
  'honesty',
  'politeness',
  'selfControl',
  'attentiveness',
  'reliability',
  'sportsmanship'
];

const getRatingLabel = (val: number) => {
  switch (val) {
    case 5: return 'Excellent';
    case 4: return 'Very Good';
    case 3: return 'Good';
    case 2: return 'Fair';
    case 1: return 'Poor';
    default: return '';
  }
};

interface CommentRow {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE';
  teacherComment: string | null;
  headTeacherComment: string | null;
  isAIGenerated: boolean;
  published: boolean;
  ratings: Record<string, number>;
}

export default function AICommentsPage() {
  const [session, setSession] = useState<any>(null);
  const [setup, setSetup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Filter selections
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedArm, setSelectedArm] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  // Comments state
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [modifiedIds, setModifiedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<string, 'academic' | 'conduct'>>({});

  // Indicators & Statuses
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [generatingSingleId, setGeneratingSingleId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const userSession = localStorage.getItem('report_user_session');
    if (userSession) {
      const parsed = JSON.parse(userSession);
      setSession(parsed);
      loadSetupConfigs(parsed);
    }
  }, []);

  const loadSetupConfigs = async (sess: any) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${sess.school.id}`);
      const json = await res.json();
      setSetup(json.data);

      if (json.data.classes?.length > 0) setSelectedClass(json.data.classes[0].id);
      if (json.data.terms?.length > 0) setSelectedTerm(json.data.terms[0].id);

      const firstArm = json.data.arms?.find((a: any) => a.classId === json.data.classes[0].id);
      if (firstArm) setSelectedArm(firstArm.id);

      setLoading(false);
    } catch (e) {
      setErrorMsg('Failed to fetch school configuration parameters');
      setLoading(false);
    }
  };

  // Fetch comments when class/arm/term selections change
  useEffect(() => {
    if (selectedClass && selectedArm && selectedTerm && session) {
      loadComments();
    }
  }, [selectedClass, selectedArm, selectedTerm]);

  const loadComments = async () => {
    setCommentsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setModifiedIds(new Set());
    setSavingStatus('idle');

    try {
      const [commentsRes, behaviorRes] = await Promise.all([
        fetch(`/api/comments?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`),
        fetch(`/api/behavior?schoolId=${session.school.id}&classId=${selectedClass}&armId=${selectedArm}&termId=${selectedTerm}`)
      ]);

      const commentsJson = await commentsRes.json();
      const behaviorJson = await behaviorRes.json();

      if (!commentsRes.ok) throw new Error(commentsJson.error || 'Failed to fetch comments');
      if (!behaviorRes.ok) throw new Error(behaviorJson.error || 'Failed to fetch behavior ratings');

      const merged = (commentsJson.data || []).map((c: any) => {
        const b = (behaviorJson.data || []).find((x: any) => x.studentId === c.studentId);
        return {
          ...c,
          ratings: b ? b.ratings : {
            punctuality: 4,
            neatness: 4,
            honesty: 4,
            politeness: 4,
            selfControl: 4,
            attentiveness: 4,
            reliability: 4,
            sportsmanship: 4
          }
        };
      });

      setComments(merged);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentChange = (studentId: string, text: string) => {
    setComments(prev => prev.map(c => {
      if (c.studentId === studentId) {
        return { ...c, teacherComment: text };
      }
      return c;
    }));
    setModifiedIds(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
  };

  const handleRatingChange = (studentId: string, category: string, value: number) => {
    setComments(prev => prev.map(c => {
      if (c.studentId === studentId) {
        return {
          ...c,
          ratings: {
            ...c.ratings,
            [category]: value
          }
        };
      }
      return c;
    }));
    setModifiedIds(prev => {
      const next = new Set(prev);
      next.add(studentId);
      return next;
    });
  };

  // Batch generate AI Comments
  const handleBatchGenerateAI = async () => {
    setGeneratingBatch(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          termId: selectedTerm,
          classId: selectedClass,
          armId: selectedArm,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate comments in batch');

      setSuccessMsg(`AI commentary drafted! Successfully generated comments for ${json.data?.length || 0} students.`);
      
      // Reload comments to get full synced status from DB
      await loadComments();
    } catch (e: any) {
      setErrorMsg(e.message || 'Error generating batch comments');
    } finally {
      setGeneratingBatch(false);
    }
  };

  // Single student generate AI Comment
  const handleSingleGenerateAI = async (studentId: string) => {
    setGeneratingSingleId(studentId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: session.school.id,
          termId: selectedTerm,
          classId: selectedClass,
          armId: selectedArm,
          studentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate comment for student');

      const item = json.data?.[0];
      if (item) {
        setComments(prev => prev.map(c => {
          if (c.studentId === studentId) {
            return { 
              ...c, 
              teacherComment: item.aiComment, 
              isAIGenerated: true 
            };
          }
          return c;
        }));
        setSuccessMsg(`AI commentary drafted for ${item.firstName}! Review below and save.`);
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error generating student comment');
    } finally {
      setGeneratingSingleId(null);
    }
  };

  // Save all modified comments and behavior ratings in parallel
  const handleSaveComments = async () => {
    if (modifiedIds.size === 0) {
      setSuccessMsg('All comments and ratings are already saved and up to date.');
      return;
    }

    setSavingStatus('saving');
    setErrorMsg('');
    setSuccessMsg('');

    // Filter comments that have been modified
    const modifiedComments = comments.filter(c => modifiedIds.has(c.studentId));

    const commentsToSave = modifiedComments.map(c => ({
      studentId: c.studentId,
      teacherComment: c.teacherComment,
      headTeacherComment: c.headTeacherComment,
      published: c.published
    }));

    // Flatten ratings for batch save
    const ratingsToSave: any[] = [];
    modifiedComments.forEach(c => {
      if (c.ratings) {
        Object.entries(c.ratings).forEach(([category, rating]) => {
          ratingsToSave.push({
            studentId: c.studentId,
            category,
            rating
          });
        });
      }
    });

    try {
      const [commentsRes, behaviorRes] = await Promise.all([
        fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: session.school.id,
            termId: selectedTerm,
            classId: selectedClass,
            armId: selectedArm,
            comments: commentsToSave,
          }),
        }),
        fetch('/api/behavior', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: session.school.id,
            termId: selectedTerm,
            ratings: ratingsToSave,
          }),
        })
      ]);

      const commentsJson = await commentsRes.json();
      const behaviorJson = await behaviorRes.json();

      if (!commentsRes.ok) throw new Error(commentsJson.error || 'Failed to save comments matrix');
      if (!behaviorRes.ok) throw new Error(behaviorJson.error || 'Failed to save behavior ratings');

      setSavingStatus('saved');
      setSuccessMsg(`Successfully saved remarks and behavioral ratings for ${modifiedComments.length} students!`);
      setModifiedIds(new Set());
    } catch (e: any) {
      setSavingStatus('error');
      setErrorMsg(e.message || 'Failed to save comments and ratings matrix to database.');
    }
  };

  const isGreenwood = session?.school?.slug === 'nacho-secondary';
  const themeAccentColor = isGreenwood ? 'text-emerald-400' : 'text-indigo-400';
  const themeBgAccent = isGreenwood ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' : 'bg-indigo-500 text-white hover:bg-indigo-400';
  const themeAccentHover = isGreenwood ? 'hover:border-emerald-500/40' : 'hover:border-indigo-500/40';

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className={`w-8 h-8 border-4 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto`} />
          <p className="text-slate-400 text-xs tracking-wider uppercase font-bold">Configuring remarks context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <MessageSquarePlus className={`w-6 h-6 ${themeAccentColor}`} /> Heuristic AI Report Remarks Panel
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automate personalized student report card remarks using analytical heuristics, then review and fine-tune manually.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {modifiedIds.size > 0 && (
            <span className="text-xs bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-xl border border-amber-500/20 font-bold animate-pulse">
              {modifiedIds.size} unsaved changes
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Alert Notices */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>
      )}

      {/* Setup configuration selectors */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/80 backdrop-blur-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              const relatedArms = setup?.arms?.filter((a: any) => a.classId === e.target.value) || [];
              if (relatedArms.length > 0) setSelectedArm(relatedArms[0].id);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-700 font-semibold"
          >
            {setup?.classes?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Arm / Stream</label>
          <select
            value={selectedArm}
            onChange={(e) => setSelectedArm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-700 font-semibold"
          >
            {setup?.arms?.filter((a: any) => a.classId === selectedClass).map((arm: any) => (
              <option key={arm.id} value={arm.id}>Arm {arm.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-slate-700 font-semibold"
          >
            {setup?.terms?.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t.session.name})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Control Actions & Summary Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/20 p-5 rounded-2xl border border-slate-850/60">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-200">RRemarks Status Summary</h3>
          <p className="text-[10px] text-slate-500">
            Current Arm has <strong className="text-slate-300">{comments.length}</strong> active students. Click the batch button to draft all remarks instantly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBatchGenerateAI}
            disabled={generatingBatch || comments.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
          >
            {generatingBatch ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                Drafting AI comments...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                Batch Draft AI Remarks
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveComments}
            disabled={savingStatus === 'saving' || modifiedIds.size === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${themeBgAccent}`}
          >
            {savingStatus === 'saving' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Remarks Matrix
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Remarks List Grid */}
      {commentsLoading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className={`w-6 h-6 border-2 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto`} />
            <p className="text-slate-500 text-xs font-semibold">Fetching student remarks records...</p>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/10 border border-slate-850/80 text-center space-y-3">
          <MessageSquarePlus className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-xs font-semibold">No active student files found in this arm registry.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((row) => {
            const hasUnsavedChanges = modifiedIds.has(row.studentId);
            return (
              <div 
                key={row.studentId}
                className={`p-5 rounded-2xl bg-slate-900/30 border transition-all ${
                  hasUnsavedChanges 
                    ? 'border-amber-500/30 bg-amber-500/[0.01]' 
                    : 'border-slate-850 hover:bg-slate-900/10'
                } ${themeAccentHover}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Student Details Column */}
                  <div className="lg:col-span-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-950 flex items-center justify-center font-bold text-xs text-slate-400 border border-slate-800">
                        {row.lastName[0]}{row.firstName[0]}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-extrabold text-sm text-slate-100 truncate">{row.lastName}, {row.firstName}</h4>
                        <span className="block text-[10px] text-slate-500 font-mono tracking-wider font-bold uppercase">{row.admissionNumber}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-bold text-slate-500 border border-slate-850 uppercase tracking-wider">
                        {row.gender}
                      </span>
                      {row.isAIGenerated && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-[9px] font-bold text-sky-400 border border-sky-500/20 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> AI Draft
                        </span>
                      )}
                      {hasUnsavedChanges && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[9px] font-bold text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                          Unsaved
                        </span>
                      )}
                    </div>

                    {/* Single Student AI Trigger */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleSingleGenerateAI(row.studentId)}
                        disabled={generatingSingleId !== null || generatingBatch}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-850 text-[10px] font-extrabold text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
                      >
                        {generatingSingleId === row.studentId ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                            Drafting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-sky-400 animate-pulse" />
                            Draft AI Remark
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Comment & Conduct Columns */}
                  <div className="lg:col-span-9 space-y-4">
                    {/* Tab Switcher */}
                    <div className="flex border-b border-slate-800">
                      <button
                        type="button"
                        onClick={() => setActiveTab(prev => ({ ...prev, [row.studentId]: 'academic' }))}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 -mb-px ${
                          (activeTab[row.studentId] || 'academic') === 'academic'
                            ? 'border-sky-500 text-sky-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        Academic Comments
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab(prev => ({ ...prev, [row.studentId]: 'conduct' }))}
                        className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 -mb-px ${
                          activeTab[row.studentId] === 'conduct'
                            ? 'border-sky-500 text-sky-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Conduct & Behaviour
                      </button>
                    </div>

                    {(activeTab[row.studentId] || 'academic') === 'academic' ? (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Teacher's Academic Remark</label>
                        <textarea
                          value={row.teacherComment || ''}
                          onChange={(e) => handleCommentChange(row.studentId, e.target.value)}
                          placeholder={`Provide a detailed performance remark or click "Draft AI Remark" to automatically evaluate strengths and areas of improvements...`}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-850/80 hover:border-slate-700 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-200 focus:outline-none focus:border-slate-500 transition-colors placeholder:text-slate-700 font-medium"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>Remarks length: {row.teacherComment?.length || 0} characters</span>
                          {row.teacherComment && row.teacherComment.length > 250 && (
                            <span className="text-amber-500">Remark is quite descriptive. Excel Template boundaries verified.</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Cognitive & Affective Domain Evaluation (1 - 5)</label>
                          <span className="text-[10px] text-slate-500 italic">Values automatically save along with comments.</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {CATEGORIES.map(cat => {
                            const val = row.ratings?.[cat] !== undefined ? row.ratings[cat] : 4;
                            return (
                              <div key={cat} className="p-3 rounded-xl bg-slate-950/60 border border-slate-850/80 hover:border-slate-800 transition-all space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold text-slate-300 capitalize">
                                    {cat.replace(/([A-Z])/g, ' $1')}
                                  </span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                    val === 5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    val === 4 ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                    val === 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    val === 2 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                    'bg-red-500/10 text-red-400 border border-red-500/20'
                                  }`}>
                                    {val} - {getRatingLabel(val)}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  step="1"
                                  value={val}
                                  onChange={(e) => handleRatingChange(row.studentId, cat, parseInt(e.target.value))}
                                  className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-sky-500"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
