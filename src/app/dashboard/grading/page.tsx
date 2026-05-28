'use client';

import React, { useEffect, useState } from 'react';
import { 
  Settings, Plus, Shield, CheckCircle, AlertCircle, 
  RefreshCw, Sparkles, X, Edit3, Trash2, Award, Info, Sliders
} from 'lucide-react';

interface GradingRule {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  interpretation: string;
}

export default function GradingScalesPage() {
  const [rules, setRules] = useState<GradingRule[]>([]);
  const [gradingType, setGradingType] = useState('SECONDARY');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Form States (Create / Edit Modal)
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<GradingRule | null>(null);
  
  const [grade, setGrade] = useState('');
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [interpretation, setInterpretation] = useState('');

  // Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Load local multi-tenant SaaS session context
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        loadGradingScales(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Invalid authentication credentials.');
      }
    }
  }, []);

  const loadGradingScales = async (schoolId: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/grading?schoolId=${schoolId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch grading scales');

      setRules(json.data.rules || []);
      setGradingType(json.data.gradingType || 'SECONDARY');
    } catch (e: any) {
      setErrorMsg(e.message || 'Error communicating with DB server.');
    } finally {
      setLoading(false);
    }
  };

  // Open modal in creation mode
  const handleOpenCreate = () => {
    setEditingRule(null);
    setGrade('');
    setMinScore('');
    setMaxScore('');
    setInterpretation('');
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Open modal in edit mode
  const handleOpenEdit = (rule: GradingRule) => {
    setEditingRule(rule);
    setGrade(rule.grade);
    setMinScore(rule.minScore.toString());
    setMaxScore(rule.maxScore.toString());
    setInterpretation(rule.interpretation);
    setErrorMsg('');
    setSuccessMsg('');
    setShowModal(true);
  };

  // Form submission (handles POST or PUT)
  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grade.trim() || minScore === '' || maxScore === '' || !interpretation.trim()) {
      setErrorMsg('All grading rule fields must be filled.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const min = parseFloat(minScore);
    const max = parseFloat(maxScore);

    try {
      let res;
      if (editingRule) {
        // PUT: Update existing rule
        res = await fetch('/api/grading', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRule.id,
            schoolId: school.id,
            minScore: min,
            maxScore: max,
            interpretation: interpretation.trim()
          })
        });
      } else {
        // POST: Create new rule
        res = await fetch('/api/grading', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: school.id,
            grade: grade.trim().toUpperCase(),
            minScore: min,
            maxScore: max,
            interpretation: interpretation.trim()
          })
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save grading rule.');

      setSuccessMsg(`Grading rule for Grade "${grade.trim().toUpperCase()}" successfully saved!`);
      setShowModal(false);
      await loadGradingScales(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with database.');
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE: Remove grading rule
  const handleDeleteRule = async (ruleId: string, ruleGrade: string) => {
    if (!confirm(`Are you sure you want to delete the grading rule for Grade "${ruleGrade}"? Any students with final aggregates landing in this range may not compile correctly without a fallback scale.`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/grading?id=${ruleId}&schoolId=${school.id}`, {
        method: 'DELETE'
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete grading rule.');

      setSuccessMsg(`Grading rule for Grade "${ruleGrade}" deleted successfully.`);
      await loadGradingScales(school.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing request.');
    }
  };

  // Multi-tenant styling parameters
  const isGreenwood = school?.slug === 'greenwood-secondary';
  const accentText = isGreenwood ? 'text-emerald-400' : 'text-indigo-400';
  const accentBg = isGreenwood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15';
  const buttonPrimary = isGreenwood ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/20' : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-950/20';

  if (!school) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Sliders className={`w-6 h-6 ${accentText}`} /> Academic Grading Scales & Rules
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Principal console to view and adjust custom score boundaries, assign grade letters, and define terminal performance interpretations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${buttonPrimary}`}
        >
          <Plus className="w-4 h-4" /> Add Grading Band
        </button>
      </div>

      {/* 2. Status Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg('')} className="text-slate-400">✕</button>
        </div>
      )}

      {/* 3. Operational Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/80 backdrop-blur-sm flex items-center gap-4 font-semibold">
          <div className={`p-3 rounded-xl ${accentBg}`}>
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Scales</span>
            <span className="text-xl font-extrabold text-white">{rules.length} Grade Bands</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/80 backdrop-blur-sm flex items-center gap-4 font-semibold">
          <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/15">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Curriculum Standard</span>
            <span className="text-xl font-extrabold text-sky-400">{gradingType} Grading</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-850/80 backdrop-blur-sm flex items-center gap-4 font-semibold">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/15">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pass Baseline</span>
            <span className="text-xl font-extrabold text-amber-400">
              {rules.find(r => r.interpretation.toLowerCase() === 'pass' || r.interpretation.toLowerCase() === 'credit')?.minScore || 40}% Score
            </span>
          </div>
        </div>
      </div>

      {/* 4. Grading Scales Grid */}
      {loading ? (
        <div className="h-60 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-6 h-6 border-2 border-t-slate-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 text-xs font-semibold">Loading curriculum grading definitions...</p>
          </div>
        </div>
      ) : rules.length === 0 ? (
        <div className="p-12 rounded-2xl bg-slate-900/10 border border-slate-850/80 text-center space-y-3">
          <Award className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-400 text-xs font-semibold">No grading scales defined in active registry.</p>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-slate-900/20 border border-slate-850/80 backdrop-blur-sm overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-semibold">
              <Shield className={`w-4 h-4 ${accentText}`} /> Active Grading Rules & Interpretations
            </h3>
            <span className="text-[9px] text-slate-500 font-mono">Boundaries determine final aggregate remarks automatically</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-850 font-semibold">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Grade Key</th>
                  <th className="p-4">Minimum score threshold</th>
                  <th className="p-4">Maximum score threshold</th>
                  <th className="p-4">Interpretation Remark</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 font-medium">
                {rules.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-900/10 transition-colors">
                    {/* Grade Key */}
                    <td className="p-4">
                      <span className="font-extrabold text-sm text-white bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-xl block w-fit font-mono">
                        {row.grade}
                      </span>
                    </td>

                    {/* Min Score */}
                    <td className="p-4 text-slate-200 font-mono font-bold text-sm">
                      {row.minScore}%
                    </td>

                    {/* Max Score */}
                    <td className="p-4 text-slate-200 font-mono font-bold text-sm">
                      {row.maxScore}%
                    </td>

                    {/* Interpretation */}
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${
                        row.interpretation.toLowerCase() === 'excellent' || row.interpretation.toLowerCase() === 'very good'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : row.interpretation.toLowerCase() === 'good' || row.interpretation.toLowerCase() === 'credit'
                          ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                          : row.interpretation.toLowerCase() === 'pass'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {row.interpretation}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex justify-center items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(row)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white transition-all inline-block"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(row.id, row.grade)}
                          className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-red-500/20 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all inline-block"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. MODAL FORM: CREATE / EDIT GRADING RULE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> 
                {editingRule ? `Modify Grading Scale Rule: ${editingRule.grade}` : 'Create Academic Grading Band'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRule} className="p-6 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Grade Key Code</label>
                <input
                  type="text"
                  required
                  disabled={editingRule !== null}
                  placeholder="e.g. A1, C6, F9, A, B"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600 transition-colors font-mono disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Minimum Score (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 75"
                    value={minScore}
                    onChange={(e) => setMinScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600 transition-colors font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Maximum Score (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    placeholder="e.g. 100"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Performance Interpretation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Excellent, Very Good, Pass, Fail"
                  value={interpretation}
                  onChange={(e) => setInterpretation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600 transition-colors"
                />
              </div>

              <div className="pt-4 border-t border-slate-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${buttonPrimary}`}
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Saving band...' : 'Save Grading Band'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
export const dynamic = 'force-dynamic';
