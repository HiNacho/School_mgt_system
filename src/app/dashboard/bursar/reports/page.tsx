'use client';

import React, { useEffect, useState } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Calendar, Users, 
  Award, Shield, FileText, CheckCircle2, AlertCircle, 
  ArrowRight, Download, Filter, RefreshCw
} from 'lucide-react';

interface FinancialReport {
  kpis: {
    revenueToday: number;
    revenueWeek: number;
    revenueMonth: number;
    revenueSession: number;
    outstandingFees: number;
    studentsOwing: number;
    pendingVerifications: number;
    scholarshipsAwarded: number;
    totalReceipts: number;
  };
  charts: {
    paymentMethods: Record<string, number>;
    paymentStatus: {
      paid: number;
      partiallyPaid: number;
      outstanding: number;
      scholarship: number;
      exempted: number;
    };
    classOutstanding: { className: string; outstanding: number }[];
  };
}

export default function BursarReportsPage() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  // Alerts
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const sessionObj = JSON.parse(sessionStr);
        setSchool(sessionObj.school);
        setUser(sessionObj.user);
        fetchReportData();
      } catch (e) {
        setErrorMsg('Failed to parse user session.');
      }
    }
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/bursar/reports`);
      const json = await res.json();
      if (res.ok && json.success) {
        setReport(json.data);
      } else {
        setErrorMsg(json.error || 'Failed to fetch financial reports metadata.');
      }
    } catch (e) {
      setErrorMsg('Network error compiling reports database.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (typeof window !== 'undefined') {
      window.open(`/api/bursar/reports?export=csv`, '_blank');
    }
  };

  // Helper helper calculation for charts height/width percentages
  const getMaxOutstanding = () => {
    if (!report || report.charts.classOutstanding.length === 0) return 1;
    return Math.max(...report.charts.classOutstanding.map(c => c.outstanding)) || 1;
  };

  const getMaxMethodVal = () => {
    if (!report) return 1;
    return Math.max(...Object.values(report.charts.paymentMethods)) || 1;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-slate-800">
      
      {/* Page Header welcome greetings */}
      <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-bold tracking-widest text-[#94a3b8] uppercase">OPERON FINANCIAL CENTER</span>
          <h1 className="text-xl font-normal text-[#1e293b] tracking-tight mt-1">
            Financial <span className="text-emerald-500 serif-italic font-normal">Analytics & Reports</span>
          </h1>
          <p className="text-xs text-[#64748b] font-semibold mt-0.5">
            Good Morning, {user ? `${user.title || 'Mrs.'} ${user.lastName}` : 'School Bursar'} • School Bursar • {school?.name || 'Bright Future Academy'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReportData}
            className="p-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4 animate-hoverSpin" />
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Financial CSV</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading || !report ? (
        <div className="bg-white rounded-3xl p-12 border border-[#e9ecef] text-center">
          <div className="w-8 h-8 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Compiling Collections Matrix...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* KPI Dashboard Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Total Revenue Today */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total Revenue Today</span>
                <span className="text-xl font-black text-slate-800">₦{report.kpis.revenueToday.toLocaleString()}</span>
                <p className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+12.4% vs yesterday</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            {/* Revenue This Week */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Revenue This Week</span>
                <span className="text-xl font-black text-slate-800">₦{report.kpis.revenueWeek.toLocaleString()}</span>
                <p className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+5.8% vs last week</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            {/* Revenue This Month */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Revenue This Month</span>
                <span className="text-xl font-black text-slate-800">₦{report.kpis.revenueMonth.toLocaleString()}</span>
                <p className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>+18.2% vs last month</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>

            {/* Outstanding Fees */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Outstanding Fees</span>
                <span className="text-xl font-black text-red-500">₦{report.kpis.outstandingFees.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Pending student balances</span>
              </div>
              <div className="w-10 h-10 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            {/* Students Owing */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Students Owing</span>
                <span className="text-xl font-black text-slate-800">{report.kpis.studentsOwing} Students</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Requires follow-up calls</span>
              </div>
              <div className="w-10 h-10 bg-orange-50 border border-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Scholarships & Exemptions */}
            <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Scholarships Awarded</span>
                <span className="text-xl font-black text-purple-600">₦{report.kpis.scholarshipsAwarded.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-semibold block mt-1">Tuition exemptions applied</span>
              </div>
              <div className="w-10 h-10 bg-purple-50 border border-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Graphical Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Class Outstanding Debt - Horizontal Bar Chart (Tailwind pure CSS) */}
            <div className="lg:col-span-8 bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Outstanding Fees by Class</h3>
              <div className="space-y-4">
                {report.charts.classOutstanding.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-12">No outstanding fees log records found.</p>
                ) : (
                  report.charts.classOutstanding.map((c, idx) => {
                    const pct = (c.outstanding / getMaxOutstanding()) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-700">{c.className}</span>
                          <span className="text-slate-800 font-bold">₦{c.outstanding.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.max(3, pct)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Payment Methods & Collection Stats - Right Panel */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Payment Methods */}
              <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">Payment Methods Analysis</h3>
                <div className="space-y-3">
                  {Object.entries(report.charts.paymentMethods).map(([method, val], idx) => {
                    const pct = (val / getMaxMethodVal()) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold">
                          <span className="text-slate-500 uppercase">{method.replace('_', ' ')}</span>
                          <span className="text-slate-700 font-bold">₦{val.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden border border-slate-100">
                          <div 
                            className="bg-blue-500 h-full rounded-full" 
                            style={{ width: `${Math.max(1, pct)}%` }} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Pie Summary */}
              <div className="bg-white border border-[#e9ecef] rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#94a3b8]">Invoices Settlement</h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-emerald-50/50 p-3 border border-emerald-100 rounded-2xl">
                    <span className="text-[18px] font-black text-emerald-700">{report.charts.paymentStatus.paid}</span>
                    <span className="text-[9px] font-bold text-emerald-600 block uppercase mt-0.5">Paid Fully</span>
                  </div>
                  <div className="bg-red-50/50 p-3 border border-red-100 rounded-2xl">
                    <span className="text-[18px] font-black text-red-600">{report.charts.paymentStatus.outstanding}</span>
                    <span className="text-[9px] font-bold text-red-500 block uppercase mt-0.5">Owes Balance</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
