'use client';

import React, { useEffect, useState } from 'react';
import { 
  Users, Search, Filter, FileText, CheckSquare, 
  Plus, AlertCircle, CheckCircle2, User, CreditCard, 
  Download, Printer, Bell, FileWarning, Award, Percent,
  Activity, X, DollarSign, Camera, Clock
} from 'lucide-react';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  admissionNumber: string;
  class: { name: string };
  arm: { name: string };
  status: string;
  feesPaid: boolean;
  scholarshipType: string;
  scholarshipValue: number;
  discountType: string;
  discountValue: number;
  parent: { firstName: string; lastName: string; phone: string; email: string } | null;
  invoices: Invoice[];
  studentPayments: Payment[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  netAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  items: any;
  installments: any[];
}

interface Payment {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  bankName: string | null;
  paymentDate: string;
  notes: string | null;
  status: string;
}

export default function StudentFeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  
  // Filtering & Search
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classesList, setClassesList] = useState<any[]>([]);

  // Metadata dropdowns
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  // Selected Student Profile
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Status Alerts
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [scholarshipModalOpen, setScholarshipModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  // Form states
  const [invSessionId, setInvSessionId] = useState('');
  const [invTermId, setInvTermId] = useState('');
  const [invInstallments, setInvInstallments] = useState(1);
  const [invDueDate, setInvDueDate] = useState('');

  const [payAmount, setPayAmount] = useState('');
  const [payInvoiceId, setPayInvoiceId] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');
  const [payRef, setPayRef] = useState('');
  const [payBank, setPayBank] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payTeller, setPayTeller] = useState(''); // base64 representation

  const [schType, setSchType] = useState('NONE');
  const [schValue, setSchValue] = useState('0');
  const [discType, setDiscType] = useState('NONE');
  const [discValue, setDiscValue] = useState('0');

  const [actionLoading, setActionLoading] = useState(false);

  // 1. Initial Data Fetch
  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        fetchStudentsList(sessionObj.school.id);
        fetchSchoolMetadata(sessionObj.school.id);
      } catch (e) {
        setErrorMsg('Failed to parse active user session.');
      }
    }
  }, []);

  const fetchStudentsList = async (schoolId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setStudents(json.data || []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch students.');
      }
    } catch (e) {
      setErrorMsg('Network error fetching students.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolMetadata = async (schoolId: string) => {
    try {
      const res = await fetch(`/api/setup?schoolId=${schoolId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setClassesList(json.data.classes || []);
        setSessions(json.data.sessions || []);
        setTerms(json.data.terms || []);
        if (json.data.sessions?.length > 0) setInvSessionId(json.data.sessions[0].id);
        if (json.data.terms?.length > 0) setInvTermId(json.data.terms[0].id);
      }
    } catch (e) {
      console.error('Error fetching metadata setup:', e);
    }
  };

  const fetchStudentFinancialProfile = async (studentId: string) => {
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/students?studentId=${studentId}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSelectedStudent(json.data);
      }
    } catch (e) {
      console.error('Error fetching student financial profile:', e);
    } finally {
      setProfileLoading(false);
    }
  };

  // 2. Invoice Generation
  const handleOpenInvoiceModal = () => {
    if (!selectedStudent) return;
    const today = new Date();
    today.setDate(today.getDate() + 30);
    setInvDueDate(today.toISOString().split('T')[0]);
    setInvInstallments(1);
    setInvoiceModalOpen(true);
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/bursar/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          sessionId: invSessionId,
          termId: invTermId,
          dueDate: invDueDate,
          installmentsCount: invInstallments
        })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(`Invoice compiled successfully!`);
        setInvoiceModalOpen(false);
        fetchStudentFinancialProfile(selectedStudent.id);
        if (school) fetchStudentsList(school.id);
      } else {
        setErrorMsg(json.error || 'Failed to compile invoice.');
      }
    } catch (e) {
      setErrorMsg('Network error compiling invoice.');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Manual Payment Recording
  const handleOpenPaymentModal = () => {
    if (!selectedStudent) return;
    setPayAmount('');
    setPayRef('');
    setPayBank('');
    setPayNotes('');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayTeller('');
    
    // Default select first unpaid invoice if available
    const unpaid = selectedStudent.invoices.find(i => i.status !== 'PAID');
    setPayInvoiceId(unpaid ? unpaid.id : '');
    setPaymentModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPayTeller(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/bursar/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          invoiceId: payInvoiceId || null,
          amount: parseFloat(payAmount),
          paymentMethod: payMethod,
          referenceNumber: payRef || null,
          bankName: payBank || null,
          notes: payNotes || null,
          paymentDate: payDate,
          tellerImage: payTeller || null,
          status: 'VERIFIED'
        })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(`Manual payment recorded and receipt generated!`);
        setPaymentModalOpen(false);
        fetchStudentFinancialProfile(selectedStudent.id);
        if (school) fetchStudentsList(school.id);
      } else {
        setErrorMsg(json.error || 'Failed to record transaction.');
      }
    } catch (e) {
      setErrorMsg('Network error recording transaction.');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Send Reminders
  const handleSendReminder = async (invoiceId: string) => {
    if (!selectedStudent) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/bursar/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          invoiceId,
          reminderType: 'OVERDUE'
        })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Payment reminder sent to parent.');
      } else {
        setErrorMsg(json.error || 'Failed to dispatch payment reminder.');
      }
    } catch (e) {
      setErrorMsg('Network error dispatching reminder.');
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Configure Scholarships & Discounts
  const handleOpenScholarshipModal = () => {
    if (!selectedStudent) return;
    setSchType(selectedStudent.scholarshipType || 'NONE');
    setSchValue(selectedStudent.scholarshipValue?.toString() || '0');
    setDiscType(selectedStudent.discountType || 'NONE');
    setDiscValue(selectedStudent.discountValue?.toString() || '0');
    setScholarshipModalOpen(true);
  };

  const handleSaveScholarshipSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedStudent.id,
          scholarshipType: schType,
          scholarshipValue: parseFloat(schValue) || 0,
          discountType: discType,
          discountValue: parseFloat(discValue) || 0
        })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMsg('Student financial exemptions and discounts saved successfully!');
        setScholarshipModalOpen(false);
        fetchStudentFinancialProfile(selectedStudent.id);
        if (school) fetchStudentsList(school.id);
      } else {
        setErrorMsg(json.error || 'Failed to save scholarship exemptions.');
      }
    } catch (e) {
      setErrorMsg('Network error saving details.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Students List
  const filteredStudents = students.filter(s => {
    const fullName = `${s.firstName} ${s.lastName} ${s.admissionNumber}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesClass = !classFilter || s.class.name === classFilter;
    
    // Status owes/paid filter
    let matchesStatus = true;
    if (statusFilter === 'PAID') matchesStatus = s.feesPaid;
    if (statusFilter === 'OWING') matchesStatus = !s.feesPaid;

    return matchesSearch && matchesClass && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Welcome Header */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">OPERON FINANCIAL CENTER</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Student <span className="text-emerald-500 serif-italic font-normal">Fees & Profiles</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Query student profiles, check parent contact details, review term invoice schedules, adjust discounts, and verify manual collections.
          </p>
        </div>
      </div>

      {/* Action Alerts */}
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

      {/* Main double column: Left list of students, Right student financial profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Student Registry */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-[#e9ecef] rounded-3xl p-5 shadow-sm space-y-4">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, admission no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  <option value="">All Classrooms</option>
                  {classesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-3 py-2 text-xs font-semibold text-slate-600"
                >
                  <option value="">All Statuses</option>
                  <option value="PAID">Paid Fully</option>
                  <option value="OWING">Owes Balances</option>
                </select>
              </div>
            </div>

            {/* Students List */}
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Loading Registry...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-medium italic">
                  No matching student records found.
                </div>
              ) : (
                filteredStudents.map(student => (
                  <button
                    key={student.id}
                    onClick={() => fetchStudentFinancialProfile(student.id)}
                    className={`w-full text-left py-3 flex items-center justify-between transition-colors hover:bg-slate-50 px-2 rounded-xl border border-transparent ${
                      selectedStudent?.id === student.id ? 'bg-[#f1f3f5] border-slate-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs overflow-hidden">
                        {student.passportPhoto ? (
                          <img src={student.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{student.firstName} {student.lastName}</h4>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {student.class.name} {student.arm.name} • {student.admissionNumber}
                        </span>
                      </div>
                    </div>
                    
                    {/* Status Dot */}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                      student.feesPaid
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-red-50 border-red-100 text-red-700'
                    }`}>
                      {student.feesPaid ? 'Paid' : 'Owes'}
                    </span>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>

        {/* Right Side: Financial Profile (Details) */}
        <div className="lg:col-span-7">
          {profileLoading ? (
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-12 text-center shadow-sm">
              <div className="w-8 h-8 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Compiling Financial Ledger...</span>
            </div>
          ) : !selectedStudent ? (
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-12 text-center text-slate-400 font-medium italic shadow-sm">
              Click a student from the registry list to display their financial profile, ledger, installments, and billing options.
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Profile Card Summary */}
              <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-50/50 blur-3xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                  <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm flex-shrink-0">
                    {selectedStudent.passportPhoto ? (
                      <img src={selectedStudent.passportPhoto} alt="Passport" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Admission Number: <strong className="text-slate-800">{selectedStudent.admissionNumber}</strong> • Class: <strong className="text-slate-800">{selectedStudent.class.name} {selectedStudent.arm.name}</strong>
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      Parent Name: {selectedStudent.parent ? `${selectedStudent.parent.firstName} ${selectedStudent.parent.lastName}` : 'No Linked Parent'} • Phone: {selectedStudent.parent?.phone || 'N/A'}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold">
                      Parent Email: {selectedStudent.parent?.email || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Grid of Balances */}
                <div className="grid grid-cols-3 gap-4 mt-6 border-t border-slate-100 pt-6">
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Invoiced</span>
                    <span className="text-base font-black text-slate-800">
                      ₦{selectedStudent.invoices.reduce((sum, inv) => sum + inv.netAmount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Paid</span>
                    <span className="text-base font-black text-emerald-600">
                      ₦{selectedStudent.invoices.reduce((sum, inv) => sum + inv.paidAmount, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outstanding</span>
                    <span className="text-base font-black text-red-500">
                      ₦{Math.max(0, selectedStudent.invoices.reduce((sum, inv) => sum + inv.netAmount - inv.paidAmount, 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Scholarships and Discounts Badge Display */}
                {(selectedStudent.scholarshipType !== 'NONE' || selectedStudent.discountType !== 'NONE') && (
                  <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-dashed border-slate-100">
                    {selectedStudent.scholarshipType !== 'NONE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold uppercase rounded-lg">
                        <Award className="w-3.5 h-3.5" />
                        Scholarship: {selectedStudent.scholarshipType.replace('_', ' ')} {selectedStudent.scholarshipValue > 0 ? `(₦${selectedStudent.scholarshipValue})` : ''}
                      </span>
                    )}
                    {selectedStudent.discountType !== 'NONE' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded-lg">
                        <Percent className="w-3.5 h-3.5" />
                        Discount: {selectedStudent.discountType.replace('_', ' ')} {selectedStudent.discountValue > 0 ? `(₦${selectedStudent.discountValue})` : ''}
                      </span>
                    )}
                  </div>
                )}

                {/* Operations Buttons */}
                <div className="flex flex-wrap gap-2.5 mt-6 pt-6 border-t border-slate-100">
                  <button
                    onClick={handleOpenInvoiceModal}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Invoice</span>
                  </button>
                  <button
                    onClick={handleOpenPaymentModal}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                  <button
                    onClick={handleOpenScholarshipModal}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Exemptions</span>
                  </button>
                </div>
              </div>

              {/* Invoices List */}
              <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">Invoices & Installments</h3>
                {selectedStudent.invoices.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic text-center py-6">No invoices compiled for this student.</p>
                ) : (
                  <div className="space-y-4">
                    {selectedStudent.invoices.map(inv => {
                      const owes = inv.netAmount - inv.paidAmount;
                      return (
                        <div key={inv.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-xs font-bold text-slate-800">{inv.invoiceNumber}</span>
                              <p className="text-[10px] text-slate-400 font-semibold">Due Date: {new Date(inv.dueDate).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                inv.status === 'PAID' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' :
                                inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-50 border border-yellow-100 text-yellow-700' :
                                'bg-red-50 border border-red-100 text-red-700'
                              }`}>
                                {inv.status}
                              </span>
                              {owes > 0 && (
                                <button
                                  onClick={() => handleSendReminder(inv.id)}
                                  className="p-1 hover:bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                  title="Send Parent Reminder"
                                >
                                  <Bell className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => setActiveInvoice(inv)}
                                className="p-1 hover:bg-white rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                title="View PDF / Print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Amounts */}
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Base: ₦{inv.amount.toLocaleString()}</span>
                            <span>Net Bill: ₦{inv.netAmount.toLocaleString()}</span>
                            <span className="text-emerald-600 font-bold">Paid: ₦{inv.paidAmount.toLocaleString()}</span>
                          </div>

                          {/* Installments schedules */}
                          {inv.installments && inv.installments.length > 0 && (
                            <div className="border-t border-dashed border-slate-200 pt-2 mt-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Installment Schedules
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                {inv.installments.map((inst, idx) => (
                                  <div key={inst.id} className="p-2 bg-white border border-slate-200/50 rounded-xl flex flex-col justify-between">
                                    <span className="text-[10px] font-bold text-slate-700">Part {idx + 1}: ₦{inst.amount.toLocaleString()}</span>
                                    <span className="text-[9px] text-slate-400 font-medium">Due: {new Date(inst.dueDate).toLocaleDateString()}</span>
                                    <span className={`text-[8px] font-bold uppercase tracking-wide mt-1 self-start ${
                                      inst.status === 'PAID' ? 'text-emerald-600' : 'text-red-500'
                                    }`}>{inst.status}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payments History List */}
              <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-4">Payment Receipts Log</h3>
                {selectedStudent.studentPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 font-semibold italic text-center py-6">No payments registered for this student.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedStudent.studentPayments.map(p => (
                      <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-slate-800">{p.receiptNumber}</span>
                          <p className="text-[10px] text-slate-400 font-semibold">
                            ₦{p.amount.toLocaleString()} via <span className="uppercase text-slate-500">{p.paymentMethod}</span> • {new Date(p.paymentDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => setActiveReceipt(p)}
                          className="px-2.5 py-1 hover:bg-white rounded-lg border border-slate-200 text-xs font-bold text-slate-500 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* GENERATE INVOICE MODAL */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-150 animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-800" />
                <h2 className="text-base font-bold text-[#1e293b]">Generate Term Invoice</h2>
              </div>
              <button onClick={() => setInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Academic Session</label>
                <select value={invSessionId} onChange={(e) => setInvSessionId(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Academic Term</label>
                <select value={invTermId} onChange={(e) => setInvTermId(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Invoice Due Date</label>
                <input type="date" required value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Installment Split Count</label>
                <select value={invInstallments} onChange={(e) => setInvInstallments(parseInt(e.target.value))} className="w-full p-2.5 text-xs font-semibold">
                  <option value="1">1 (Single Full Payment)</option>
                  <option value="2">2 Installments</option>
                  <option value="3">3 Installments</option>
                  <option value="4">4 Installments</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setInvoiceModalOpen(false)} className="px-4 py-2 border text-slate-500 rounded-xl text-xs font-bold uppercase cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">
                  {actionLoading ? 'Compiling...' : 'Issue Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-150 animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-bold text-[#1e293b]">Record Manual Payment</h2>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Link Invoice</label>
                <select value={payInvoiceId} onChange={(e) => setPayInvoiceId(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                  <option value="">(Unlinked manual general payment)</option>
                  {selectedStudent?.invoices.map(i => (
                    <option key={i.id} value={i.id}>{i.invoiceNumber} (Owes ₦{(i.netAmount - i.paidAmount).toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Amount Paid (₦)</label>
                  <input type="number" required min="1" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Payment Method</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="POS">POS</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Reference Number</label>
                  <input type="text" placeholder="e.g. Bank session ref" value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Bank Name</label>
                  <input type="text" placeholder="e.g. GTBank" value={payBank} onChange={(e) => setPayBank(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Payment Date</label>
                  <input type="date" required value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span>Upload Teller/Receipt</span>
                  </label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-xs" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Payment Notes</label>
                <textarea rows={2} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="px-4 py-2 border text-slate-500 rounded-xl text-xs font-bold uppercase cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">
                  {actionLoading ? 'Recording...' : 'Register Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHOLARSHIP/EXEMPTIONS MODAL */}
      {scholarshipModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md border border-slate-150 animate-scaleUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-[#1e293b]">Exemptions & Scholarships</h2>
              </div>
              <button onClick={() => setScholarshipModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveScholarshipSettings} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Scholarship Category</label>
                  <select value={schType} onChange={(e) => setSchType(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                    <option value="NONE">None</option>
                    <option value="PERCENTAGE_100">100% Scholarship (Full Exemption)</option>
                    <option value="PERCENTAGE_75">75% Scholarship</option>
                    <option value="PERCENTAGE_50">50% Scholarship</option>
                    <option value="PERCENTAGE_25">25% Scholarship</option>
                    <option value="CUSTOM">Custom Deducted Value</option>
                  </select>
                </div>
                {schType === 'CUSTOM' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Scholarship Custom Value (₦)</label>
                    <input type="number" required min="1" value={schValue} onChange={(e) => setSchValue(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                  </div>
                )}

                <div className="border-t border-slate-100 pt-4 mt-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Discount Category</label>
                  <select value={discType} onChange={(e) => setDiscType(e.target.value)} className="w-full p-2.5 text-xs font-semibold">
                    <option value="NONE">None</option>
                    <option value="SIBLING">Sibling Discount (10% Off)</option>
                    <option value="STAFF_CHILD">Staff Child Discount (50% Off)</option>
                    <option value="EARLY_PAYMENT">Early Payment Discount (5% Off)</option>
                    <option value="MANUAL">Manual Deducted Value</option>
                  </select>
                </div>
                {discType === 'MANUAL' && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#94a3b8] mb-1.5">Discount Custom Value (₦)</label>
                    <input type="number" required min="1" value={discValue} onChange={(e) => setDiscValue(e.target.value)} className="w-full p-2.5 text-xs font-semibold" />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setScholarshipModalOpen(false)} className="px-4 py-2 border text-slate-500 rounded-xl text-xs font-bold uppercase cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold uppercase cursor-pointer">
                  {actionLoading ? 'Saving...' : 'Apply Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT RENDER MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-150 animate-scaleUp">
            
            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-3xl">
              <span className="text-xs font-bold text-slate-600">Issued Receipt View</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveReceipt(null)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Area */}
            <div className="p-8 space-y-6 text-slate-800" id="printable-receipt">
              <div className="text-center space-y-1">
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                ) : (
                  <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                )}
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">{school?.name || 'Operon Academy'}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{school?.address || 'Campus Site Address'}</p>
                <p className="text-xs font-bold uppercase tracking-wider pt-2 text-emerald-700">Official Payment Receipt</p>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Receipt info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Receipt Number</span>
                  <span className="font-bold text-slate-800">{activeReceipt.receiptNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Date Issued</span>
                  <span className="font-semibold text-slate-800">{new Date(activeReceipt.paymentDate).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Student Name</span>
                  <span className="font-bold text-slate-800">{selectedStudent?.firstName} {selectedStudent?.lastName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Admission No / Class</span>
                  <span className="font-semibold text-slate-800">{selectedStudent?.admissionNumber} ({selectedStudent?.class.name})</span>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Amount */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Amount Received</span>
                  <span className="text-xs text-slate-500 font-medium capitalize">Payment via {activeReceipt.paymentMethod.replace('_', ' ')}</span>
                </div>
                <span className="text-xl font-black text-slate-950">₦{activeReceipt.amount.toLocaleString()}.00</span>
              </div>

              {activeReceipt.referenceNumber && (
                <div className="text-xs">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Transaction Reference</span>
                  <span className="font-semibold text-slate-700">{activeReceipt.referenceNumber} {activeReceipt.bankName ? `(${activeReceipt.bankName})` : ''}</span>
                </div>
              )}

              {/* Verification watermark */}
              <div className="pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                <span>Verified System Record</span>
                <div className="text-right">
                  <span className="block border-t border-slate-300 w-24 pt-1 mt-6 text-slate-500 font-bold">Authorized Sign</span>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* INVOICE VIEW MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-150 animate-scaleUp">
            
            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-3xl">
              <span className="text-xs font-bold text-slate-600">Issued Invoice View</span>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setActiveInvoice(null)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Print Area */}
            <div className="p-8 space-y-6 text-slate-800" id="printable-invoice">
              <div className="text-center space-y-1">
                {school?.logoUrl ? (
                  <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                ) : (
                  <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                )}
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">{school?.name || 'Operon Academy'}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{school?.address || 'Campus Site Address'}</p>
                <p className="text-xs font-bold uppercase tracking-wider pt-2 text-slate-600">Academic Fee Bill Invoice</p>
              </div>

              <div className="h-px bg-slate-200" />

              {/* Invoice details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Invoice Number</span>
                  <span className="font-bold text-slate-800">{activeInvoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Due Date</span>
                  <span className="font-semibold text-red-500">{new Date(activeInvoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Student Name</span>
                  <span className="font-bold text-slate-800">{selectedStudent?.firstName} {selectedStudent?.lastName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Admission No / Class</span>
                  <span className="font-semibold text-slate-800">{selectedStudent?.admissionNumber} ({selectedStudent?.class.name})</span>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              {/* breakdown */}
              <div className="space-y-2 text-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Itemized Levy Breakdown</span>
                {activeInvoice.items && (
                  <div className="space-y-1 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    {activeInvoice.items.tuition > 0 && <div className="flex justify-between"><span>Tuition:</span><span className="font-semibold">₦{activeInvoice.items.tuition.toLocaleString()}</span></div>}
                    {activeInvoice.items.developmentLevy > 0 && <div className="flex justify-between"><span>Development Levy:</span><span className="font-semibold">₦{activeInvoice.items.developmentLevy.toLocaleString()}</span></div>}
                    {activeInvoice.items.ict > 0 && <div className="flex justify-between"><span>ICT Fee:</span><span className="font-semibold">₦{activeInvoice.items.ict.toLocaleString()}</span></div>}
                    {activeInvoice.items.books > 0 && <div className="flex justify-between"><span>Books Bundle:</span><span className="font-semibold">₦{activeInvoice.items.books.toLocaleString()}</span></div>}
                    {activeInvoice.items.uniform > 0 && <div className="flex justify-between"><span>Uniforms:</span><span className="font-semibold">₦{activeInvoice.items.uniform.toLocaleString()}</span></div>}
                    {activeInvoice.items.ptaLevy > 0 && <div className="flex justify-between"><span>PTA Levy:</span><span className="font-semibold">₦{activeInvoice.items.ptaLevy.toLocaleString()}</span></div>}
                    {activeInvoice.items.customFees && activeInvoice.items.customFees.map((cf: any, idx: number) => (
                      <div key={idx} className="flex justify-between"><span>{cf.name}:</span><span className="font-semibold">₦{parseFloat(cf.amount).toLocaleString()}</span></div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deductions & Total */}
              <div className="space-y-1.5 text-xs border-t border-slate-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase font-medium">Subtotal:</span>
                  <span className="font-bold">₦{activeInvoice.amount.toLocaleString()}</span>
                </div>
                {activeInvoice.scholarship > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Scholarship Exemption:</span>
                    <span>-₦{activeInvoice.scholarship.toLocaleString()}</span>
                  </div>
                )}
                {activeInvoice.discount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Discount Reduction:</span>
                    <span>-₦{activeInvoice.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black border-t border-dashed border-slate-200 pt-2 text-slate-900">
                  <span>Net Amount Due:</span>
                  <span>₦{activeInvoice.netAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Instructions */}
              <div className="bg-slate-900 text-slate-100 p-4 border border-slate-950 rounded-2xl text-xs space-y-2">
                <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-widest block">Bank Payment Instructions</span>
                <p className="font-medium">Bank: GTBank • Account Name: {school?.name || 'School Account'} • Account Number: 0123456789</p>
                <p className="text-[10px] text-slate-400">Please reference the invoice number <strong className="text-white">{activeInvoice.invoiceNumber}</strong> in your transfer slip notes.</p>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
