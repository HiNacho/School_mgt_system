'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Sliders,
  Award,
  ShieldCheck,
  Zap,
  AlertTriangle
} from 'lucide-react';

export default function SuperAdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Policy Form State
  const [feeType, setFeeType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [feeValue, setFeeValue] = useState<number>(1.5); // Default 1.5%
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');

  useEffect(() => {
    fetchPlatformMetrics();
  }, []);

  const fetchPlatformMetrics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/superadmin/payments');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        setErrorMsg(json.error || 'Failed to fetch platform payment metrics');
      }
    } catch (err: any) {
      setErrorMsg('Connection error loading platform financial dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCommissionPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/superadmin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: selectedSchoolId || undefined,
          feeType,
          feeValue: Number(feeValue),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.message || 'Platform commission policy updated!');
        fetchPlatformMetrics();
      } else {
        setErrorMsg(json.error || 'Failed to update platform commission policy');
      }
    } catch (err: any) {
      setErrorMsg('Server connection error saving fee policy.');
    } finally {
      setSavingPolicy(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Loading SaaS platform financial dashboard...
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const schools = data?.schools || [];
  const disputes = data?.disputes || [];
  const transactions = data?.recentTransactions || [];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> SaaS Platform Finance Center
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Platform Payment & Subaccount Visibility</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Monitor total SaaS gross payment volume, platform commission revenue, subaccount statuses, and per-school volume rankings.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchPlatformMetrics}
          className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center gap-2 text-xs font-bold w-fit"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Financial Metrics
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total SaaS Payment Volume</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.totalVolume || 0).toLocaleString()}</p>
          <p className="text-xs text-emerald-600 font-bold">{summary.successfulTransactions || 0} Successful Transactions</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Platform Commission Earned</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-indigo-900">₦{(summary.totalPlatformCommission || 0).toLocaleString()}</p>
          <p className="text-xs text-indigo-600 font-bold">Platform Split Revenue</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Active School Subaccounts</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{summary.activeSubaccounts || 0} / {summary.totalSchools || 0}</p>
          <p className="text-xs text-blue-600 font-bold">Schools Onboarded</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Refunded Volume</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.totalRefunds || 0).toLocaleString()}</p>
          <p className="text-xs text-purple-600 font-bold">Processed Refunds</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: School Performance Ranking Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                <Award className="w-4 h-4 text-indigo-600" /> School Payment Volume Rankings
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">School</th>
                    <th className="p-4">Subaccount</th>
                    <th className="p-4 text-right">Processed Volume</th>
                    <th className="p-4 text-right">Platform Fee</th>
                    <th className="p-4 text-center">Commission Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {schools.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition">
                      <td className="p-4">
                        <p className="font-extrabold text-slate-900">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.slug}</p>
                      </td>
                      <td className="p-4">
                        {s.flutterwaveSubaccountId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {s.flutterwaveSubaccountId}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Not Set</span>
                        )}
                      </td>
                      <td className="p-4 text-right font-mono font-extrabold text-slate-900">
                        ₦{(s.totalVolume || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono font-extrabold text-indigo-700">
                        ₦{(s.platformCommission || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-extrabold text-[11px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {s.platformFeeType === 'FIXED' ? `Fixed: ₦${s.platformFeeValue}` : `${s.platformFeeValue || s.operonPlatformFeePercent || 0}%`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Platform Commission Rules Form */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Commission Rules Configuration</h3>
                <p className="text-xs text-slate-500 font-medium">Set global or per-school commission rates</p>
              </div>
            </div>

            <form onSubmit={handleUpdateCommissionPolicy} className="space-y-5">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Target School</label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  <option value="">Apply Globally (All Schools Without Custom Rate)</option>
                  {schools.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Commission Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeType('PERCENTAGE')}
                    className={`py-2.5 rounded-xl font-extrabold text-xs transition border ${feeType === 'PERCENTAGE' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeType('FIXED')}
                    className={`py-2.5 rounded-xl font-extrabold text-xs transition border ${feeType === 'FIXED' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                  >
                    Fixed Fee (₦)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  {feeType === 'PERCENTAGE' ? 'Commission Percentage (%)' : 'Fixed Fee Amount (₦)'}
                </label>
                <input
                  type="number"
                  step={feeType === 'PERCENTAGE' ? '0.1' : '1'}
                  value={feeValue}
                  onChange={(e) => setFeeValue(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono font-extrabold text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={savingPolicy}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                {savingPolicy ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Commission Policy'}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
