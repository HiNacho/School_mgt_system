'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Plus, Settings, ChevronRight, Users, Layers,
  CheckCircle, AlertCircle, X, Edit2, Trash2, ToggleLeft,
  ToggleRight, GraduationCap, BookMarked, FlaskConical,
  School, Loader2, RefreshCw, ArrowLeft, Grid3X3
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SchoolSection {
  id: string;
  schoolId: string;
  name: string;
  type: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  _count?: { classes: number };
  classes?: ClassRecord[];
}

interface ClassRecord {
  id: string;
  name: string;
  sectionId: string | null;
  levelOrder: number;
  isActive: boolean;
  _count?: { students: number };
  arms?: ArmRecord[];
}

interface ArmRecord {
  id: string;
  name: string;
  classId: string;
  classTeacherId: string | null;
  classTeacher?: { id: string; firstName: string; lastName: string } | null;
  _count?: { students: number };
}

// ─── Section type config ──────────────────────────────────────────────────────

const SECTION_META: Record<string, { icon: any; color: string; bg: string; border: string; badge: string }> = {
  NURSERY:           { icon: School,       color: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200',   badge: 'bg-pink-100 text-pink-700' },
  PRIMARY:           { icon: BookOpen,     color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-700' },
  JUNIOR_SECONDARY:  { icon: BookMarked,   color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700' },
  SENIOR_SECONDARY:  { icon: GraduationCap,color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200',badge: 'bg-emerald-100 text-emerald-700' },
  CUSTOM:            { icon: Grid3X3,      color: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200',  badge: 'bg-slate-100 text-slate-700' },
};

const ALL_SECTION_TYPES = [
  { type: 'NURSERY',          label: 'Nursery / Pre-school',       sub: 'Creche, Playgroup, Nursery 1–2, Kindergarten' },
  { type: 'PRIMARY',          label: 'Primary School',             sub: 'Primary 1 – Primary 6' },
  { type: 'JUNIOR_SECONDARY', label: 'Junior Secondary School',    sub: 'JSS 1 – JSS 3' },
  { type: 'SENIOR_SECONDARY', label: 'Senior Secondary School',    sub: 'SS 1 – SS 3' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AcademicStructurePage() {
  const [school, setSchool] = useState<any>(null);
  const [sections, setSections] = useState<SchoolSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Drill-down state
  const [selectedSection, setSelectedSection] = useState<SchoolSection | null>(null);
  const [sectionClasses, setSectionClasses] = useState<ClassRecord[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);

  // Modals
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddArm, setShowAddArm] = useState(false);
  const [showEditSection, setShowEditSection] = useState<SchoolSection | null>(null);
  const [showEditClass, setShowEditClass] = useState<ClassRecord | null>(null);

  // Form state
  const [newSelectedTypes, setNewSelectedTypes] = useState<string[]>([]);
  const [autoCreateLevels, setAutoCreateLevels] = useState(true);
  const [newClassName, setNewClassName] = useState('');
  const [newArmName, setNewArmName] = useState('');
  const [newArmClassId, setNewArmClassId] = useState('');

  // Notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 5000); };
  const showError   = (msg: string) => { setErrorMsg(msg);   setTimeout(() => setErrorMsg(''), 6000); };

  // ── Load school + sections ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    const raw = localStorage.getItem('report_user_session');
    if (!raw) return;
    const s = JSON.parse(raw);
    setSchool(s);
    setLoading(true);
    try {
      const res = await fetch(`/api/sections?schoolId=${s.school?.id}`);
      const data = await res.json();
      if (data.success) setSections(data.data);
    } catch { showError('Failed to load academic structure'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Load classes for selected section ──────────────────────────────────────
  const loadSection = useCallback(async (section: SchoolSection) => {
    setSelectedSection(section);
    setSectionLoading(true);
    try {
      const res = await fetch(`/api/sections?schoolId=${section.schoolId || school?.school?.id}&includeClasses=true`);
      const data = await res.json();
      if (data.success) {
        const found = data.data.find((s: SchoolSection) => s.id === section.id);
        setSectionClasses(found?.classes || []);
      }
    } catch { showError('Failed to load section classes'); }
    finally { setSectionLoading(false); }
  }, [school]);

  // ── Add Section(s) ──────────────────────────────────────────────────────────
  const handleAddSection = async () => {
    if (newSelectedTypes.length === 0) return showError('Please select at least one section type');
    setSaving(true);
    const errors: string[] = [];
    const created: string[] = [];
    try {
      for (const type of newSelectedTypes) {
        const res = await fetch('/api/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: school.school.id,
            type,
            autoCreateLevels,
          }),
        });
        const data = await res.json();
        if (!res.ok) errors.push(data.error || `Failed to add ${type}`);
        else created.push(data.data.name);
      }
      if (created.length > 0) showSuccess(`✅ Added: ${created.join(', ')}`);
      if (errors.length > 0) showError(errors.join(' | '));
      setShowAddSection(false);
      setNewSelectedTypes([]);
      setAutoCreateLevels(true);
      await load();
    } catch { showError('Failed to add sections'); }
    finally { setSaving(false); }
  };

  // ── Toggle Section Active ───────────────────────────────────────────────────
  const handleToggleSection = async (section: SchoolSection) => {
    try {
      const res = await fetch('/api/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: section.id, isActive: !section.isActive }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error);
      showSuccess(`Section ${section.isActive ? 'deactivated' : 'activated'}`);
      await load();
    } catch { showError('Failed to update section'); }
  };

  // ── Add Class to Section ────────────────────────────────────────────────────
  const handleAddClass = async () => {
    if (!newClassName.trim() || !selectedSection) return;
    setSaving(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CLASS',
          schoolId: school.school.id,
          name: newClassName.trim(),
          sectionId: selectedSection.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Failed to add class');
      showSuccess(`✅ ${newClassName} added to ${selectedSection.name}`);
      setShowAddClass(false);
      setNewClassName('');
      await loadSection(selectedSection);
      await load();
    } catch { showError('Failed to add class'); }
    finally { setSaving(false); }
  };

  // ── Add Arm to Class ────────────────────────────────────────────────────────
  const handleAddArm = async () => {
    if (!newArmName.trim() || !newArmClassId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ARM',
          schoolId: school.school.id,
          classId: newArmClassId,
          name: newArmName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) return showError(data.error || 'Failed to add arm');
      showSuccess(`✅ Arm "${newArmName}" added`);
      setShowAddArm(false);
      setNewArmName('');
      setNewArmClassId('');
      if (selectedSection) await loadSection(selectedSection);
    } catch { showError('Failed to add arm'); }
    finally { setSaving(false); }
  };

  // ── Existing sections types (to filter add section modal) ──────────────────
  const existingTypes = sections.map(s => s.type);
  const availableTypes = ALL_SECTION_TYPES.filter(t => !existingTypes.includes(t.type));

  // ─── Render ─────────────────────────────────────────────────────────────────

  const renderSectionIcon = (type: string, size = 'w-5 h-5') => {
    const meta = SECTION_META[type] || SECTION_META.CUSTOM;
    const Icon = meta.icon;
    return <Icon className={`${size} ${meta.color}`} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-blue-500" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading academic structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-[200] flex items-start gap-3 bg-emerald-600 text-white rounded-2xl px-5 py-4 max-w-sm shadow-2xl">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-bold flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')}><X className="w-4 h-4 opacity-70" /></button>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-[200] flex items-start gap-3 bg-red-600 text-white rounded-2xl px-5 py-4 max-w-sm shadow-2xl">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm font-bold flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')}><X className="w-4 h-4 opacity-70" /></button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Breadcrumb + Header ── */}
        <div className="mb-6">
          {selectedSection ? (
            <button onClick={() => { setSelectedSection(null); setSectionClasses([]); }}
              className="flex items-center gap-1.5 text-sm mb-3 hover:underline" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft className="w-4 h-4" /> Back to Academic Structure
            </button>
          ) : null}

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-6 h-6 text-blue-500" />
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedSection ? selectedSection.name : 'Academic Structure'}
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {selectedSection
                  ? `Manage class levels and arms in the ${selectedSection.name} section`
                  : 'Manage school sections, class levels, and arms'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={load} className="p-2 rounded-lg border hover:bg-gray-50" style={{ borderColor: 'var(--border)' }}>
                <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
              {!selectedSection && availableTypes.length > 0 && (
                <button onClick={() => setShowAddSection(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              )}
              {selectedSection && (
                <button onClick={() => setShowAddClass(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add Class Level
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VIEW A: Section list                                         */}
        {/* ════════════════════════════════════════════════════════════ */}
        {!selectedSection && (
          <>
            {sections.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
                <Layers className="w-12 h-12 mx-auto mb-3 text-blue-300" />
                <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>No sections yet</p>
                <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
                  Add your school's academic sections to get started
                </p>
                <button onClick={() => setShowAddSection(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  + Add First Section
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {sections.map(section => {
                  const meta = SECTION_META[section.type] || SECTION_META.CUSTOM;
                  const Icon = meta.icon;
                  return (
                    <div key={section.id}
                      className={`rounded-2xl border-2 p-5 transition-all ${meta.border} ${section.isActive ? 'opacity-100' : 'opacity-50'}`}
                      style={{ background: 'var(--bg-card)' }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                          <Icon className={`w-6 h-6 ${meta.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{section.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>{section.type.replace('_', ' ')}</span>
                            {!section.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                          </div>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {section._count?.classes || 0} class level{(section._count?.classes || 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleSection(section)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            title={section.isActive ? 'Deactivate section' : 'Activate section'}>
                            {section.isActive
                              ? <ToggleRight className="w-5 h-5 text-emerald-500" />
                              : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                          </button>
                          <button onClick={() => loadSection(section)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border hover:bg-gray-50 transition-colors"
                            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                            Manage <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* VIEW B: Section detail — class levels + arms                 */}
        {/* ════════════════════════════════════════════════════════════ */}
        {selectedSection && (
          <>
            {sectionLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : sectionClasses.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-blue-300" />
                <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No class levels yet</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Add the first class level to this section</p>
                <button onClick={() => setShowAddClass(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
                  + Add Class Level
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {sectionClasses.map(cls => {
                  const meta = SECTION_META[selectedSection.type] || SECTION_META.CUSTOM;
                  const totalStudents = (cls.arms || []).reduce((sum, a) => sum + (a._count?.students || 0), 0);
                  return (
                    <div key={cls.id} className="rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      {/* Class header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${meta.bg}`}>
                            <BookOpen className={`w-4 h-4 ${meta.color}`} />
                          </div>
                          <div>
                            <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{cls.name}</h4>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {(cls.arms || []).length} arm{(cls.arms || []).length !== 1 ? 's' : ''} · {totalStudents} student{totalStudents !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <button onClick={() => { setNewArmClassId(cls.id); setShowAddArm(true); }}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                          <Plus className="w-3 h-3" /> Add Arm
                        </button>
                      </div>

                      {/* Arms grid */}
                      {(cls.arms || []).length === 0 ? (
                        <p className="text-xs text-center py-3 rounded-lg" style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                          No arms yet — click "Add Arm" to create one
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {(cls.arms || []).map(arm => (
                            <div key={arm.id} className="rounded-xl p-3 border text-center" style={{ borderColor: 'var(--border)', background: 'var(--bg-hover)' }}>
                              <p className="font-bold text-lg mb-0.5" style={{ color: 'var(--text-primary)' }}>{cls.name} {arm.name}</p>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{arm._count?.students || 0} students</p>
                              {arm.classTeacher && (
                                <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                                  {arm.classTeacher.firstName} {arm.classTeacher.lastName}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: Add Section(s)                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Add Academic Section(s)</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Select one or more sections to add</p>
              </div>
              <button onClick={() => { setShowAddSection(false); setNewSelectedTypes([]); }}>
                <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {availableTypes.map(t => {
                const meta = SECTION_META[t.type] || SECTION_META.CUSTOM;
                const Icon = meta.icon;
                const isSelected = newSelectedTypes.includes(t.type);
                const toggle = () => setNewSelectedTypes(prev =>
                  isSelected ? prev.filter(x => x !== t.type) : [...prev, t.type]
                );
                return (
                  <button key={t.type} onClick={toggle}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      isSelected ? `${meta.border} ${meta.bg}` : 'border-transparent hover:border-gray-200'
                    }`}
                    style={{ background: isSelected ? undefined : 'var(--bg-hover)' }}>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                      <Icon className={`w-5 h-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.sub}</p>
                    </div>
                    {/* Checkbox indicator */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isSelected ? `${meta.color} border-current bg-white` : 'border-gray-300'
                    }`}>
                      {isSelected && <CheckCircle className={`w-4 h-4 ${meta.color}`} />}
                    </div>
                  </button>
                );
              })}

              {/* Auto-create levels toggle — shown when any non-CUSTOM type selected */}
              {newSelectedTypes.some(t => t !== 'CUSTOM') && (
                <div className="flex items-center justify-between p-3 rounded-xl mt-2" style={{ background: 'var(--bg-hover)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-create default class levels</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Each section will get its standard class levels pre-created
                    </p>
                  </div>
                  <button onClick={() => setAutoCreateLevels(!autoCreateLevels)}
                    className={`w-11 h-6 rounded-full transition-colors flex items-center flex-shrink-0 ${autoCreateLevels ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <span className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${autoCreateLevels ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {newSelectedTypes.length === 0 ? 'No sections selected' : `${newSelectedTypes.length} section${newSelectedTypes.length > 1 ? 's' : ''} selected`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowAddSection(false); setNewSelectedTypes([]); }}
                  className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                  Cancel
                </button>
                <button onClick={handleAddSection} disabled={saving || newSelectedTypes.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add {newSelectedTypes.length > 1 ? `${newSelectedTypes.length} Sections` : 'Section'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: Add Class Level                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAddClass && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>Add Class Level — {selectedSection.name}</h2>
              <button onClick={() => setShowAddClass(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Class Name *</label>
              <input value={newClassName} onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddClass()}
                className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                placeholder="e.g. Primary 7, JSS 4, Pre-K..." autoFocus />
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowAddClass(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={handleAddClass} disabled={saving || !newClassName.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Class Level
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL: Add Arm                                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {showAddArm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Add Arm to {sectionClasses.find(c => c.id === newArmClassId)?.name || 'Class'}
              </h2>
              <button onClick={() => setShowAddArm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Arm Name *</label>
              <input value={newArmName} onChange={e => setNewArmName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddArm()}
                className="w-full px-3 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                placeholder="e.g. A, B, Gold, Green..." autoFocus />
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                This will create class: <strong>{sectionClasses.find(c => c.id === newArmClassId)?.name} {newArmName || '?'}</strong>
              </p>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border)' }}>
              <button onClick={() => setShowAddArm(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Cancel</button>
              <button onClick={handleAddArm} disabled={saving || !newArmName.trim()}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Arm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
