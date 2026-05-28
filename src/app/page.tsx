'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Sparkles, BookOpen, Layers, BarChart3, ArrowRight, CheckCircle, Smartphone, WifiOff } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Radiant glow spots */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-950/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-950/20 blur-[130px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              RESULT AUTOMATION
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline-block bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              Nigerian Primary & Secondary Edition
            </span>
            <Link
              href="/login"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
            >
              Demo Access <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-28 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Automate weeks of result compilation into seconds.</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white leading-tight tracking-tight max-w-4xl mx-auto mb-6">
          The Modern Operating System for <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">School Academic Analytics</span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          A high-performance, multi-tenant SaaS result processor optimized for Nigerian schools. Seamlessly manages student registers, calculates competition rankings, mutes CA boundaries, drafts AI comments, and prints pristine A4 report cards.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm tracking-wide transition-all shadow-xl shadow-emerald-500/20 flex justify-center items-center gap-2"
          >
            Launch Platform Demo
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-300 font-semibold text-sm hover:border-slate-700 transition-all flex justify-center items-center"
          >
            Explore Capabilities
          </a>
        </div>

        {/* Mini stats badges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-900 pt-10">
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900/60">
            <span className="block text-2xl font-bold text-white mb-1">100%</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Ties-Correct Ranking</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900/60">
            <span className="block text-2xl font-bold text-white mb-1">Instant</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Heuristic AI Comments</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900/60">
            <span className="block text-2xl font-bold text-white mb-1">A4 Size</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Printable Report Cards</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-900/60">
            <span className="block text-2xl font-bold text-white mb-1">Offline</span>
            <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-500">Spreadsheet Auto-Save</span>
          </div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-16 relative z-10 border-t border-slate-900">
        <h2 className="text-center text-xs uppercase font-extrabold tracking-widest text-slate-500 mb-2">
          Engineered Features
        </h2>
        <p className="text-center text-2xl font-bold text-white mb-12">
          Built for Teachers, Trusted by Principals.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div>
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Dual score entry systems</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Import standard pre-formatted Excel sheets with instant student column fuzzy matching, or type scores directly into an interactive keyboard-navigable scoresheet uploader with autosaves.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span>Fuzzy Column Mapping</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div>
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 w-fit mb-6">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Multi-Tenant Isolation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Maintain isolated databases per school tenant. Support completely customized grading definitions: secondary sections map A1-F9 rules, while primary sections use A-D matrices.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
              <span>Data Segregation Guaranteed</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-900 hover:border-slate-800 transition-all flex flex-col justify-between">
            <div>
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit mb-6">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Integrated Recharts Analytics</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Equip administrative teams with interactive charts showing school-wide distributions, class leaderboards, subject difficulty indexes, and term-by-term performance trends.
              </p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-purple-400">
              <span>Visual Trend Tracking</span>
            </div>
          </div>
        </div>
      </section>

      {/* PWA & Offline Banner */}
      <section className="max-w-7xl mx-auto px-6 py-12 relative z-10">
        <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-900 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hidden sm:inline-block">
              <WifiOff className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" /> Progressive Web App & Offline First
              </h4>
              <p className="text-slate-400 text-xs mt-1 max-w-xl">
                Unstable internet connection? The scoresheet spreadsheet saves inputs in the browser's IndexedDB when the network drops, and automatically syncs back with PostgreSQL once the connection returns.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 transition-all"
          >
            Launch PWA Mode
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <span>© 2026 Academic Result Automation SaaS. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Secure Sessions Enabled</span>
            <span>GDPR/NDPR Isolated Data</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
