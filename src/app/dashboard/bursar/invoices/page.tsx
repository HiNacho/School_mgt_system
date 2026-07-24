'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileText, Search, Printer, X, User, Clock, AlertCircle
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  netAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  items: any;
  student: {
    firstName: string;
    lastName: string;
    admissionNumber: string;
    class: { name: string };
  };
}

export default function InvoicesRegistryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [school, setSchool] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        fetchInvoices();
      } catch (e) {
        setErrorMsg('Failed to parse session.');
      }
    }
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bursar/invoices');
      const json = await res.json();
      if (res.ok && json.success) {
        setInvoices(json.data || []);
      } else {
        setErrorMsg(json.error || 'Failed to fetch invoices.');
      }
    } catch (e) {
      setErrorMsg('Network error fetching invoices.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(i => {
    const studentName = `${i.student.firstName} ${i.student.lastName} ${i.invoiceNumber}`.toLowerCase();
    const matchesSearch = studentName.includes(search.toLowerCase());
    const matchesStatus = !statusFilter || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Page Welcome Header */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">OPERON FINANCIAL CENTER</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Global <span className="text-emerald-500 serif-italic font-normal">Invoices Registry</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Overview of all issued term invoices, installment schedules, and billing status metrics.
          </p>
        </div>
      </div>

      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm space-y-4">
        
        {/* Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search invoice number, student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f8f9fa] border border-[#e9ecef] rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 bg-[#f8f9fa] border border-[#e9ecef] rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 focus:outline-none"
            >
              <option value="">All Invoice Statuses</option>
              <option value="PAID">Paid Fully</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="OUTSTANDING">Outstanding</option>
            </select>
          </div>
        </div>

        {/* List of Invoices */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3" />
              <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading Invoices...</span>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold italic text-center py-12">No invoices found matching query filters.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[#94a3b8] font-bold uppercase text-[9px] tracking-wider">
                  <th className="py-3 px-4">Invoice</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Net Bill</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.map(i => (
                  <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{i.invoiceNumber}</td>
                    <td className="py-3.5 px-4">{i.student.firstName} {i.student.lastName}</td>
                    <td className="py-3.5 px-4 text-[10px] uppercase font-bold text-slate-400">{i.student.class.name}</td>
                    <td className="py-3.5 px-4 font-bold">₦{i.netAmount.toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-emerald-600 font-bold">₦{i.paidAmount.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        i.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        i.status === 'PARTIALLY_PAID' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                        'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-medium">{new Date(i.dueDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveInvoice(i)}
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

      {/* INVOICE VIEW MODAL */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-150 animate-scaleUp">
            
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center rounded-t-3xl">
              <span className="text-xs font-bold text-slate-600">Issued Invoice View</span>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-white border rounded-lg text-xs font-bold text-slate-600 flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /><span>Print</span></button>
                <button onClick={() => setActiveInvoice(null)} className="p-1.5 bg-white rounded-lg text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-8 space-y-6 text-slate-800" id="printable-invoice">
              <div className="text-center space-y-1">
                {school?.logoUrl && <img src={school.logoUrl} alt="Logo" className="w-12 h-12 object-contain mx-auto mb-2" />}
                <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-950">{school?.name || 'Operon Academy'}</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase">{school?.address || 'Campus Address'}</p>
                <p className="text-xs font-bold uppercase tracking-wider pt-2 text-slate-600">Academic Fee Bill Invoice</p>
              </div>

              <div className="h-px bg-slate-200" />

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
                  <span className="font-bold text-slate-800">{activeInvoice.student.firstName} {activeInvoice.student.lastName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase block">Admission No / Class</span>
                  <span className="font-semibold text-slate-800">{activeInvoice.student.admissionNumber} ({activeInvoice.student.class.name})</span>
                </div>
              </div>

              <div className="h-px bg-slate-200" />

              <div className="space-y-2 text-xs">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Itemized Levy Breakdown</span>
                {activeInvoice.items && (
                  <div className="space-y-1 bg-slate-50 p-4 border border-slate-100 rounded-2xl">
                    {activeInvoice.items.tuition > 0 && <div className="flex justify-between"><span>Tuition:</span><span className="font-semibold">₦{activeInvoice.items.tuition.toLocaleString()}</span></div>}
                    {activeInvoice.items.developmentLevy > 0 && <div className="flex justify-between"><span>Development Levy:</span><span className="font-semibold">₦{activeInvoice.items.developmentLevy.toLocaleString()}</span></div>}
                    {activeInvoice.items.ict > 0 && <div className="flex justify-between"><span>ICT Fee:</span><span className="font-semibold">₦{activeInvoice.items.ict.toLocaleString()}</span></div>}
                    {activeInvoice.items.books > 0 && <div className="flex justify-between"><span>Books Bundle:</span><span className="font-semibold">₦{activeInvoice.items.books.toLocaleString()}</span></div>}
                    {activeInvoice.items.uniform > 0 && <div className="flex justify-between"><span>Uniforms:</span><span className="font-semibold">₦{activeInvoice.items.uniform.toLocaleString()}</span></div>}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm font-black border-t border-dashed border-slate-200 pt-2 text-slate-900">
                <span>Net Amount Due:</span>
                <span>₦{activeInvoice.netAmount.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
