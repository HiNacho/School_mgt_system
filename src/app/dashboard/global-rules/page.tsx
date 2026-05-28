'use client';

import React, { useState } from 'react';
import { 
  Settings, Shield, Sparkles, CheckCircle, Save, Lock, 
  Database, AlertTriangle, Cpu, Scale, FileText, Globe
} from 'lucide-react';

export default function GlobalRulesPage() {
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Academic Configuration Rules State
  const [allowSchoolSessionOverride, setAllowSchoolSessionOverride] = useState(true);
  const [defaultSession, setDefaultSession] = useState('2025/2026');
  const [defaultTerm, setDefaultTerm] = useState('First Term');

  // 2. CA Assessments Structure Rules State
  const [strictCABoundaries, setStrictCABoundaries] = useState(true);
  const [maxCA1, setMaxCA1] = useState(15);
  const [maxCA2, setMaxCA2] = useState(15);
  const [maxAssignment, setMaxAssignment] = useState(10);
  const [maxExam, setMaxExam] = useState(60);

  // 3. AI Commentary Configuration Rules State
  const [enableAICommentary, setEnableAICommentary] = useState(true);
  const [defaultAITone, setDefaultAITone] = useState('ENCOURAGING');
  const [aiCustomRules, setAiCustomRules] = useState(
    'Include clear subject recommendations. Format remarks using formal, professional tone suitable for Nigerian parents. Encourage improvement on weaknesses without sounding overly negative.'
  );

  // 4. Subscription & Platform Tiers State
  const [freeTrialDuration, setFreeTrialDuration] = useState(30);
  const [pricePerStudentYear, setPricePerStudentYear] = useState(2500); // ₦2500 per student per academic year
  const [enableCustomDomains, setEnableCustomDomains] = useState(false);

  const handleSaveRules = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    setTimeout(() => {
      setSaving(false);
      setSuccessMsg('Global system policy rules successfully compiled and committed to database! All SaaS tenant configurations synced.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" /> Global System Rules & Policies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Super Administrator cockpit to govern core academic standards, AI scoring parameters, SaaS billing structures, and security isolations system-wide.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveRules}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
        >
          {saving ? (
            <Cpu className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Committing System Rules...' : 'Save Global Policies'}
        </button>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Grid Policies Config */}
      <form onSubmit={handleSaveRules} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Academic & CA Boundaries (2 cols on large screen) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Core Academic Session Master */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Globe className="w-5 h-5 text-sky-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Academic Calendar Master Policy</h3>
                <p className="text-[10px] text-slate-400 font-medium">Dictate the default platform session limits and overrides</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <span className="block text-slate-700 font-semibold">Allow School Overrides</span>
                  <span className="block text-[10px] text-slate-450 font-sans mt-0.5 font-normal">Allow individual schools to deviate from the system academic session.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={allowSchoolSessionOverride}
                    onChange={(e) => setAllowSchoolSessionOverride(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Master Global Session</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2025/2026"
                    value={defaultSession}
                    onChange={(e) => setDefaultSession(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-slate-350 hover:border-slate-250 transition-colors font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Master Active Term</label>
                  <select
                    value={defaultTerm}
                    onChange={(e) => setDefaultTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold hover:border-slate-250 transition-colors"
                  >
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: CA Assessment Scoring Boundaries */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Scale className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Score Entry assessment Split Framework</h3>
                <p className="text-[10px] text-slate-400 font-medium">Govern limits and assessment percentages system-wide</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <span className="block text-slate-700 font-semibold">Strict Boundary Limits Enforcement</span>
                  <span className="block text-[10px] text-slate-450 font-sans mt-0.5 font-normal">Enforce CA ranges strictly during manual uploader inputs (prevents scores above maximums).</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={strictCABoundaries}
                    onChange={(e) => setStrictCABoundaries(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                  <span>Assessment Type</span>
                  <span>System Default Max Points</span>
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-slate-600 font-semibold">Continuous Assessment 1 (CA1)</span>
                  <input
                    type="number"
                    max={30}
                    min={5}
                    value={maxCA1}
                    onChange={(e) => setMaxCA1(parseInt(e.target.value) || 0)}
                    className="w-24 ml-auto bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600 focus:outline-none focus:border-slate-350 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-slate-600 font-semibold">Continuous Assessment 2 (CA2)</span>
                  <input
                    type="number"
                    max={30}
                    min={5}
                    value={maxCA2}
                    onChange={(e) => setMaxCA2(parseInt(e.target.value) || 0)}
                    className="w-24 ml-auto bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600 focus:outline-none focus:border-slate-350 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-slate-600 font-semibold">Home Assignment / Project</span>
                  <input
                    type="number"
                    max={20}
                    min={0}
                    value={maxAssignment}
                    onChange={(e) => setMaxAssignment(parseInt(e.target.value) || 0)}
                    className="w-24 ml-auto bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600 focus:outline-none focus:border-slate-350 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <span className="text-slate-600 font-semibold">Terminal Examination</span>
                  <input
                    type="number"
                    max={80}
                    min={30}
                    value={maxExam}
                    onChange={(e) => setMaxExam(parseInt(e.target.value) || 0)}
                    className="w-24 ml-auto bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-center font-mono font-bold text-emerald-600 focus:outline-none focus:border-slate-350 transition-colors"
                  />
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Cumulative Total Assessment Scale</span>
                  <span className={`px-2.5 py-1 rounded-lg ${
                    maxCA1 + maxCA2 + maxAssignment + maxExam === 100 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                      : 'bg-red-50 text-red-700 border border-red-200/60'
                  } font-mono`}>
                    {maxCA1 + maxCA2 + maxAssignment + maxExam} / 100 points
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Engine & SaaS Limits (1 col on large screens) */}
        <div className="space-y-6">
          
          {/* Card 3: AI Commentary Policies */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">AI Commentary Policy Engine</h3>
                <p className="text-[10px] text-slate-400 font-medium">Fine-tune automated remark models and styles</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <span className="block text-slate-700 font-semibold">Heuristic AI Recommendations</span>
                  <span className="block text-[10px] text-slate-450 mt-0.5 font-normal">Enable the automated strengths/weaknesses commentary engine for all school classes.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={enableAICommentary}
                    onChange={(e) => setEnableAICommentary(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-355 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Default Tone Scale</label>
                <select
                  value={defaultAITone}
                  onChange={(e) => setDefaultAITone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 text-slate-700 font-bold hover:border-slate-250 transition-colors"
                >
                  <option value="ENCOURAGING">Encouraging & Academic Focus</option>
                  <option value="STRICT">Strict Performance Metrics</option>
                  <option value="NEUTRAL">Factual & Descriptive</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Global System AI Instructions Guidelines</label>
                <textarea
                  rows={4}
                  value={aiCustomRules}
                  onChange={(e) => setAiCustomRules(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-750 focus:outline-none focus:border-slate-350 font-sans leading-relaxed resize-none hover:border-slate-250 transition-colors"
                  placeholder="Insert systemic constraints here..."
                />
              </div>
            </div>
          </div>

          {/* Card 4: Platform & SaaS Tiers Limits */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Database className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">SaaS Platform Billing & Limits</h3>
                <p className="text-[10px] text-slate-400 font-medium">Configure global limits, domains, and prices</p>
              </div>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Standard Trial Period (Days)</label>
                <input
                  type="number"
                  value={freeTrialDuration}
                  onChange={(e) => setFreeTrialDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-emerald-600 font-mono font-bold focus:outline-none focus:border-slate-350 hover:border-slate-250 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Student SaaS Subscription Cost (₦/Year)</label>
                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                  <span className="bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-slate-400 font-bold select-none">₦</span>
                  <input
                    type="number"
                    value={pricePerStudentYear}
                    onChange={(e) => setPricePerStudentYear(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-white text-slate-700 font-mono font-bold focus:outline-none px-3 focus:border-slate-350 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div>
                  <span className="block text-slate-700 font-semibold">Enable Custom Domains</span>
                  <span className="block text-[10px] text-slate-450 font-sans mt-0.5 font-normal">Allow premium tier schools to bind their own domains (e.g. portal.greenwood.edu).</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={enableCustomDomains}
                    onChange={(e) => setEnableCustomDomains(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-355 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security Banner Card */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex gap-3 font-medium leading-normal font-sans shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600 animate-pulse" />
            <div>
              <span className="font-extrabold uppercase tracking-wide block mb-0.5 text-amber-900">Critical Isolation Enforcement</span>
              Editing continuous assessment weights will automatically trigger alerts on tenant sheets that violate these bounds. Commit carefully to prevent disruption to existing teacher score entries.
            </div>
          </div>

        </div>

      </form>

    </div>
  );
}
