'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, Search, Filter, Printer, Download, X, User, DollarSign
} from 'lucide-react';

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
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    class: { name: string };
  };
}

export default function GlobalPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        fetchPayments();
      } catch (e) {
        setErrorMsg('Failed to parse user session.');
      }
    }
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bursar/payments');
      const json = await res.json();
      if (res.ok && json.success) {
        setPayments(json.data || []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch payments.');
      }
    } catch (e) {
      setErrorMsg('Network error fetching payment records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(p => {
    const studentName = `${p.student.firstName} ${p.student.lastName} ${p.receiptNumber} ${p.referenceNumber || ''}`.toLowerCase();
    const matchesSearch = studentName.includes(search.toLowerCase());
    const matchesMethod = !methodFilter || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Welcome Header */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">OPERON FINANCIAL CENTER</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Global <span className="text-emerald-500 serif-italic font-normal">Payments Registry</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Audit school fees payments, check bank references, verify transactions, and issue printed receipts.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm space-y-4">
        
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search receipt, student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700"
            />
          </div>
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full md:w-48 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 animate-fadeIn"
            >
              <option value="">All Payment Methods</option>
              <option value="FLUTTERWAVE">Flutterwave</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="POS">POS</option>
              <option value="CHEQUE">Cheque</option>
            </select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Payments Log...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold italic text-center py-12">No payment entries found matching the query.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[#94a3b8] font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.receiptNumber}</td>
                    <td className="py-3.5 px-4">{p.student.firstName} {p.student.lastName}</td>
                    <td className="py-3.5 px-4 text-[10px] uppercase font-bold text-slate-400">{p.student.class.name}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">₦{p.amount.toLocaleString()}</td>
                    <td className="py-3.5 px-4"><span className="px-2 py-0.5 bg-slate-100 text-[10px] rounded text-slate-600">{p.paymentMethod}</span></td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">{p.referenceNumber || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-medium">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveReceipt(p)}
                        className="px-2.5 py-1.5 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 flex items-center gap-1.5 inline-flex cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* RECEIPT VIEW MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-150 animate-scaleUp">
            
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
                <button onClick={() => setActiveReceipt(null)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800" id="printable-receipt">
              <div className="text-center space-y-1">
                {school?.logoUrl && (
                  <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />
                )}
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">{school?.name || 'Operon Academy'}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{school?.address || 'Campus Address'}</p>
                <p className="text-xs font-bold uppercase tracking-wider pt-2 text-emerald-700">Official Payment Receipt</p>
              </div>

              <div className="h-px bg-slate-200" />

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
                  <span className="font-bold text-slate-800">{activeReceipt.student.firstName} {activeReceipt.student.lastName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Admission / Class</span>
                  <span className="font-semibold text-slate-800">{activeReceipt.student.admissionNumber} ({activeReceipt.student.class.name})</span>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Amount Received</span>
                  <span className="text-xs text-slate-500 font-medium capitalize">Payment via {activeReceipt.paymentMethod}</span>
                </div>
                <span className="text-xl font-black text-slate-950">₦{activeReceipt.amount.toLocaleString()}.00</span>
              </div>

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

    </div>
  );
}
