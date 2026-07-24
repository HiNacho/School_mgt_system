'use client';

import React, { useEffect, useState } from 'react';
import { Layers, Plus, Save, Edit2, Trash2, CheckCircle2, AlertCircle, X, Coins } from 'lucide-react';

interface ClassItem {
  id: string;
  name: string;
}

interface FeeStructure {
  id: string;
  name: string;
  section: 'NURSERY' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY';
  tuition: number;
  developmentLevy: number;
  ict: number;
  sports: number;
  books: number;
  laboratory: number;
  examination: number;
  ptaLevy: number;
  transport: number;
  boarding: number;
  hostel: number;
  uniform: number;
  miscellaneous: number;
  customFees: { name: string; amount: number }[];
  classes: ClassItem[];
}

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Status message alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal forms state
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState('');

  // Fields state
  const [name, setName] = useState('');
  const [section, setSection] = useState<'NURSERY' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY'>('JUNIOR_SECONDARY');
  const [tuition, setTuition] = useState('0');
  const [developmentLevy, setDevelopmentLevy] = useState('0');
  const [ict, setIct] = useState('0');
  const [sports, setSports] = useState('0');
  const [books, setBooks] = useState('0');
  const [laboratory, setLaboratory] = useState('0');
  const [examination, setExamination] = useState('0');
  const [ptaLevy, setPtaLevy] = useState('0');
  const [transport, setTransport] = useState('0');
  const [boarding, setBoarding] = useState('0');
  const [hostel, setHostel] = useState('0');
  const [uniform, setUniform] = useState('0');
  const [miscellaneous, setMiscellaneous] = useState('0');
  
  // Custom fees (unlimited categories)
  const [customFees, setCustomFees] = useState<{ name: string; amount: number }[]>([]);
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  
  // Selected classes mapping state
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);

  // 1. Initial Load
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        fetchFeeStructures(sessionObj.school.id);
        fetchClassesMetadata(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Failed to parse active user session.');
      }
    }
  }, []);

  const fetchFeeStructures = async (schoolId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bursar/fees`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStructures(json.data || []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch school fee structures.');
      }
    } catch (e) {
      setErrorMsg('Network error fetching fee registry.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesMetadata = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setClassesList(json.data.classes || []);
      }
    } catch (e) {
      console.error('Error fetching classes list metadata:', e);
    }
  };

  // Helper calculation of base sum
  const calculateTotalStructureAmount = (struct: Partial<FeeStructure> | any) => {
    const base = 
      (parseFloat(struct.tuition) || 0) +
      (parseFloat(struct.developmentLevy) || 0) +
      (parseFloat(struct.ict) || 0) +
      (parseFloat(struct.sports) || 0) +
      (parseFloat(struct.books) || 0) +
      (parseFloat(struct.laboratory) || 0) +
      (parseFloat(struct.examination) || 0) +
      (parseFloat(struct.ptaLevy) || 0) +
      (parseFloat(struct.transport) || 0) +
      (parseFloat(struct.boarding) || 0) +
      (parseFloat(struct.hostel) || 0) +
      (parseFloat(struct.uniform) || 0) +
      (parseFloat(struct.miscellaneous) || 0);

    let custom = 0;
    if (struct.customFees && Array.isArray(struct.customFees)) {
      struct.customFees.forEach((cf: any) => {
        custom += parseFloat(cf.amount) || 0;
      });
    }

    return base + custom;
  };

  // 2. Actions Handlers
  const handleOpenCreateModal = () => {
    setIsEdit(false);
    setEditId('');
    setName('');
    setSection('JUNIOR_SECONDARY');
    setTuition('0');
    setDevelopmentLevy('0');
    setIct('0');
    setSports('0');
    setBooks('0');
    setLaboratory('0');
    setExamination('0');
    setPtaLevy('0');
    setTransport('0');
    setBoarding('0');
    setHostel('0');
    setUniform('0');
    setMiscellaneous('0');
    setCustomFees([]);
    setSelectedClassIds([]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (struct: FeeStructure) => {
    setIsEdit(true);
    setEditId(struct.id);
    setName(struct.name);
    setSection(struct.section);
    setTuition(struct.tuition.toString());
    setDevelopmentLevy(struct.developmentLevy.toString());
    setIct(struct.ict.toString());
    setSports(struct.sports.toString());
    setBooks(struct.books.toString());
    setLaboratory(struct.laboratory.toString());
    setExamination(struct.examination.toString());
    setPtaLevy(struct.ptaLevy.toString());
    setTransport(struct.transport.toString());
    setBoarding(struct.boarding.toString());
    setHostel(struct.hostel.toString());
    setUniform(struct.uniform.toString());
    setMiscellaneous(struct.miscellaneous.toString());
    setCustomFees(struct.customFees || []);
    setSelectedClassIds(struct.classes.map(c => c.id));
    setModalOpen(true);
  };

  const handleAddCustomFee = () => {
    if (!customName.trim() || !customAmount) return;
    setCustomFees([
      ...customFees,
      { name: customName.trim(), amount: parseFloat(customAmount) || 0 }
    ]);
    setCustomName('');
    setCustomAmount('');
  };

  const handleRemoveCustomFee = (index: number) => {
    setCustomFees(customFees.filter((_, idx) => idx !== index));
  };

  const handleToggleClassSelection = (classId: string) => {
    if (selectedClassIds.includes(classId)) {
      setSelectedClassIds(selectedClassIds.filter(id => id !== classId));
    } else {
      setSelectedClassIds([...selectedClassIds, classId]);
    }
  };

  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      id: editId,
      name,
      section,
      tuition: parseFloat(tuition) || 0,
      developmentLevy: parseFloat(developmentLevy) || 0,
      ict: parseFloat(ict) || 0,
      sports: parseFloat(sports) || 0,
      books: parseFloat(books) || 0,
      laboratory: parseFloat(laboratory) || 0,
      examination: parseFloat(examination) || 0,
      ptaLevy: parseFloat(ptaLevy) || 0,
      transport: parseFloat(transport) || 0,
      boarding: parseFloat(boarding) || 0,
      hostel: parseFloat(hostel) || 0,
      uniform: parseFloat(uniform) || 0,
      miscellaneous: parseFloat(miscellaneous) || 0,
      customFees,
      classIds: selectedClassIds
    };

    try {
      const endpoint = `/api/bursar/fees`;
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(isEdit ? 'Fee structure updated successfully!' : 'Fee structure created successfully!');
        setModalOpen(false);
        if (school) fetchFeeStructures(school.id);
      } else {
        setErrorMsg(json.error || 'Failed to save fee structure configuration.');
      }
    } catch (e) {
      setErrorMsg('Network error saving fee structure.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this fee structure? This action will unlink all classes associated with it.')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/bursar/fees?id=${id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg('Fee structure deleted successfully.');
        if (school) fetchFeeStructures(school.id);
      } else {
        setErrorMsg(json.error || 'Failed to delete fee structure.');
      }
    } catch (e) {
      setErrorMsg('Network error deleting fee structure.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Welcome & Info */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">OPERON FINANCIAL CENTER</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            School <span className="text-emerald-500 serif-italic font-normal">Fee Structures</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Configure, manage, and assign tuition, levies, and custom payments across Nursery, Primary, and Secondary classrooms.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-emerald-100 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Fee Structure</span>
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid of structures */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9ecef] text-center">
          <div className="w-8 h-8 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Fee Configurations...</span>
        </div>
      ) : structures.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9ecef] text-center space-y-3">
          <Coins className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No Fee Structures Created Yet</p>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">Create a structure to define tuition, uniform, examination, and developmental fees for Nursery or Secondary classes.</p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Create Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {structures.map(struct => (
            <div key={struct.id} className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 text-[9px] font-bold uppercase rounded">
                    {struct.section.replace('_', ' ')}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(struct)}
                      className="p-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStructure(struct.id)}
                      className="p-1.5 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-800 tracking-tight mb-2">{struct.name}</h3>

                {/* Amount Summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Fee Base</span>
                  <span className="text-lg font-black text-[#1e293b] tracking-tight">
                    ₦{calculateTotalStructureAmount(struct).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Breakdown summary */}
                <div className="space-y-1.5 text-xs text-slate-600 mb-6">
                  {struct.tuition > 0 && <div className="flex justify-between"><span>Tuition:</span><span className="font-bold">₦{struct.tuition.toLocaleString()}</span></div>}
                  {struct.developmentLevy > 0 && <div className="flex justify-between"><span>Development Levy:</span><span className="font-bold">₦{struct.developmentLevy.toLocaleString()}</span></div>}
                  {struct.ict > 0 && <div className="flex justify-between"><span>ICT Fee:</span><span className="font-bold">₦{struct.ict.toLocaleString()}</span></div>}
                  {struct.books > 0 && <div className="flex justify-between"><span>Books:</span><span className="font-bold">₦{struct.books.toLocaleString()}</span></div>}
                  {struct.uniform > 0 && <div className="flex justify-between"><span>Uniforms:</span><span className="font-bold">₦{struct.uniform.toLocaleString()}</span></div>}
                  {struct.customFees && struct.customFees.length > 0 && (
                    <div className="pt-1 border-t border-dashed border-slate-200 mt-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Custom Additions</span>
                      {struct.customFees.map((cf, idx) => (
                        <div key={idx} className="flex justify-between text-slate-500 text-[11px]">
                          <span>{cf.name}:</span>
                          <span className="font-semibold">₦{cf.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Class mapping indicator */}
              <div className="border-t border-slate-100 pt-4 mt-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Assigned Classrooms</span>
                {struct.classes.length === 0 ? (
                  <span className="text-xs text-slate-400 italic font-medium">Unassigned to any class</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {struct.classes.map(c => (
                      <span key={c.id} className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-bold uppercase rounded">
                        {c.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-slate-150 animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-[#1e293b]">{isEdit ? 'Edit Fee Structure' : 'Create New Fee Structure'}</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="p-6 space-y-6">
              
              {/* Core Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                    Structure Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. SSS 1 boarding fee package"
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">
                    School Section
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value as any)}
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    <option value="NURSERY">Nursery</option>
                    <option value="PRIMARY">Primary</option>
                    <option value="JUNIOR_SECONDARY">Junior Secondary</option>
                    <option value="SENIOR_SECONDARY">Senior Secondary</option>
                  </select>
                </div>
              </div>

              {/* Fee Breakdown ( Levies Matrix ) */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-4">Levies breakdown (₦)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Tuition</label>
                    <input type="number" min="0" value={tuition} onChange={(e) => setTuition(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Development Levy</label>
                    <input type="number" min="0" value={developmentLevy} onChange={(e) => setDevelopmentLevy(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">ICT Fees</label>
                    <input type="number" min="0" value={ict} onChange={(e) => setIct(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Sports Levy</label>
                    <input type="number" min="0" value={sports} onChange={(e) => setSports(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Books Bundle</label>
                    <input type="number" min="0" value={books} onChange={(e) => setBooks(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Laboratory Fee</label>
                    <input type="number" min="0" value={laboratory} onChange={(e) => setLaboratory(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Examinations</label>
                    <input type="number" min="0" value={examination} onChange={(e) => setExamination(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">PTA Levy</label>
                    <input type="number" min="0" value={ptaLevy} onChange={(e) => setPtaLevy(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Transport Shuttle</label>
                    <input type="number" min="0" value={transport} onChange={(e) => setTransport(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Boarding Fee</label>
                    <input type="number" min="0" value={boarding} onChange={(e) => setBoarding(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Hostel Accomm.</label>
                    <input type="number" min="0" value={hostel} onChange={(e) => setHostel(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Uniforms</label>
                    <input type="number" min="0" value={uniform} onChange={(e) => setUniform(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 mb-1">Miscellaneous</label>
                    <input type="number" min="0" value={miscellaneous} onChange={(e) => setMiscellaneous(e.target.value)} className="w-full p-2 text-xs font-semibold" />
                  </div>
                </div>
              </div>

              {/* Custom Additions (Unlimited Categories) */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">Custom items (Optional)</h3>
                
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="E.g., Graduation gown fee"
                    className="flex-1 p-2 text-xs font-semibold"
                  />
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Amount (₦)"
                    className="w-32 p-2 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomFee}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                {customFees.length > 0 && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 divide-y divide-slate-200/50">
                    {customFees.map((cf, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs font-semibold text-slate-700">
                        <span>{cf.name}</span>
                        <div className="flex items-center gap-3">
                          <span>₦{cf.amount.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomFee(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Classroom mapping */}
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">Assign to classrooms</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classesList.map(c => {
                    const isSelected = selectedClassIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleClassSelection(c.id)}
                        className={`p-2.5 text-left text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Package'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
