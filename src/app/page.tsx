'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, Sparkles, BookOpen, Layers, BarChart3, ArrowRight, 
  CheckCircle, Smartphone, HelpCircle, MessageSquare, Phone, 
  Mail, MapPin, Menu, X, Compass, Target, Award, Users, Heart
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'mission' | 'vision'>('mission');
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Custom styling for minimalistic floating animations
  const customStyles = `
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }
    @keyframes float-delayed {
      0%, 100% { transform: translateY(-5px); }
      50% { transform: translateY(5px); }
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.5; }
      50% { transform: scale(1.1); opacity: 0.3; }
      100% { transform: scale(0.95); opacity: 0.5; }
    }
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }
    .animate-float-delayed {
      animation: float-delayed 8s ease-in-out infinite;
    }
    .animate-pulse-ring {
      animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    .text-gradient {
      background: linear-gradient(135deg, #059669 0%, #4f46e5 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .bg-gradient-premium {
      background: linear-gradient(135deg, rgba(244, 244, 245, 0.6) 0%, rgba(255, 255, 255, 0.9) 100%);
    }
  `;

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      <style>{customStyles}</style>

      {/* Background soft gradients */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-emerald-50/40 via-indigo-50/20 to-transparent pointer-events-none z-0" />

      {/* Floating subtle geometric accents */}
      <div className="absolute top-[20%] left-[10%] w-32 h-32 rounded-full bg-indigo-200/20 blur-2xl pointer-events-none animate-float" />
      <div className="absolute top-[40%] right-[15%] w-48 h-48 rounded-full bg-emerald-200/20 blur-3xl pointer-events-none animate-float-delayed" />

      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-lg border-b border-slate-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)]' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-600 text-white shadow-md shadow-emerald-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-600 to-indigo-600 bg-clip-text text-transparent">
              NachoEd
            </span>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <a href="#about" className="hover:text-emerald-600 transition-colors">About</a>
            <a href="#solutions" className="hover:text-emerald-600 transition-colors">Solutions</a>
            <a href="#contact" className="hover:text-emerald-600 transition-colors">Contact Us</a>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
            >
              Register <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[60px] bg-white border-b border-slate-100 shadow-xl z-40 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col gap-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <a 
              href="#about" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-emerald-600 py-1 transition-colors"
            >
              About
            </a>
            <a 
              href="#solutions" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-emerald-600 py-1 transition-colors"
            >
              Solutions
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-emerald-600 py-1 transition-colors"
            >
              Contact Us
            </a>
          </nav>
          <div className="h-px bg-slate-100 my-2" />
          <div className="flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full py-2.5 text-center rounded-xl text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-wider border border-slate-200"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="w-full py-2.5 text-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Register Now
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Simplify School Administration</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight tracking-tight">
            Make school life <br className="hidden lg:block"/>
            <span className="text-gradient">more natural.</span>
          </h1>

          <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            NachoEd brings a clean, minimalistic design to academic operations. Seamlessly manage student registries, compile rankings, calculate grades, draft reports, and strengthen connection boundaries between parents, teachers, and school administrators.
          </p>

          <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3">
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex justify-center items-center gap-2"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#about"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider transition-all flex justify-center items-center"
            >
              Explore Vision
            </a>
          </div>
        </div>

        {/* Minimalistic Interactive Floating Graphic */}
        <div className="lg:col-span-6 flex justify-center items-center relative h-[350px] lg:h-[450px]">
          {/* Main central container */}
          <div className="w-72 h-72 rounded-3xl bg-white border border-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.04)] p-6 relative flex flex-col justify-between z-20 animate-float">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  JS
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800">JSS 1A Report</h4>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Compiled</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[8px] font-black text-emerald-600">APPROVED</span>
            </div>

            <div className="space-y-2.5 py-4">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>Class Average</span>
                <span className="text-slate-700">76.4%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[76.4%] h-full bg-emerald-500 rounded-full" />
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-2">
                <span>Release Status</span>
                <span className="text-indigo-600">Released to Parents</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-full h-full bg-indigo-500 rounded-full" />
              </div>
            </div>

            <div className="border-t border-slate-50 pt-3 flex justify-between items-center">
              <span className="text-[9px] text-slate-400 font-bold uppercase">Academic Session 2025/2026</span>
              <div className="flex -space-x-1.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-[8px] font-black text-emerald-700">A</div>
                <div className="w-5 h-5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[8px] font-black text-indigo-700">B</div>
                <div className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[8px] font-black text-slate-700">+8</div>
              </div>
            </div>
          </div>

          {/* Background floating badges */}
          <div className="absolute top-[10%] left-[10%] p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.03)] flex items-center gap-2.5 z-30 animate-float-delayed">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Class Position</span>
              <strong className="block text-xs font-black text-slate-800">1st of 32</strong>
            </div>
          </div>

          <div className="absolute bottom-[10%] right-[10%] p-3.5 rounded-2xl bg-white border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.03)] flex items-center gap-2.5 z-30 animate-float-delayed">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="block text-[8px] font-bold text-slate-400 uppercase">Verification</span>
              <strong className="block text-xs font-black text-slate-800">Correct Standings</strong>
            </div>
          </div>

          {/* Decorative ring */}
          <div className="absolute w-80 h-80 rounded-full border border-slate-200/60 pointer-events-none z-0" />
          <div className="absolute w-[360px] h-[360px] rounded-full border border-dashed border-slate-200/40 pointer-events-none z-0" />
        </div>
      </section>

      {/* About Section: Mission & Vision */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-emerald-600">
            About NachoEd
          </h2>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            Our Core Vision & Mission
          </p>
          <p className="text-sm text-slate-400 font-semibold leading-relaxed">
            Strengthening education systems by fostering seamless synergy between administrators, parents, and students.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Mission & Vision Switcher (Col Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('mission')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'mission' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-450 hover:text-slate-750'
                }`}
              >
                <Compass className="w-4 h-4 inline-block mr-1.5" /> Our Mission
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vision')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'vision' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-450 hover:text-slate-750'
                }`}
              >
                <Target className="w-4 h-4 inline-block mr-1.5" /> Our Vision
              </button>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-[0_10px_30px_rgba(0,0,0,0.02)] min-h-[200px] flex flex-col justify-center animate-in fade-in duration-300">
              {activeTab === 'mission' ? (
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Simplify School Operations & Connect Communities</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Our mission is to eliminate administrative gridlock in schools. We build simple, high-fidelity digital platforms that automate calculations, verify standings, and facilitate transparent, direct communication channels between class teachers and parents.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Build the Future of Transparent Education Analytics</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Our vision is to empower every school with cloud-native academic intelligence. We envision an ecosystem where student statistics are analyzed accurately, parents are active partners in educational development, and students receive optimized pathways to success.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vision & Mission Vector scene (Col Span 7) */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            {/* Custom SVG Vector graphic representing Person sitting at desk working (Image 3) */}
            <div className="flex justify-center md:col-span-1">
              <svg className="w-full max-w-[260px] h-auto drop-shadow-lg animate-float" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background circle decorative */}
                <circle cx="100" cy="100" r="70" fill="url(#circleGrad)" opacity="0.1" />
                
                {/* Computer desk */}
                <path d="M40 140 H160" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                <path d="M50 140 L45 170" stroke="#475569" strokeWidth="3" />
                <path d="M150 140 L155 170" stroke="#475569" strokeWidth="3" />
                
                {/* Computer screen */}
                <rect x="75" y="90" width="50" height="35" rx="3" fill="#1e293b" />
                <rect x="79" y="94" width="42" height="27" rx="1" fill="#f8fafc" />
                <rect x="94" y="125" width="12" height="15" fill="#475569" />
                <path d="M85 140 H115" stroke="#475569" strokeWidth="2" />
                
                {/* Person */}
                {/* Chair back */}
                <path d="M65 110 L68 150" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                {/* Body / Torso */}
                <path d="M92 110 C92 120 85 145 85 150 C85 150 105 150 108 140" fill="#4f46e5" />
                {/* Head */}
                <circle cx="95" cy="95" r="8" fill="#fbcfe8" />
                {/* Hair */}
                <path d="M90 92 C90 86 100 86 100 92 Z" fill="#1e293b" />
                {/* Arm / Hand typing */}
                <path d="M90 120 L82 128 L95 128" stroke="#fbcfe8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                
                {/* Floating metrics icons representing NachoEd */}
                {/* Shield Icon Bubble */}
                <circle cx="140" cy="65" r="14" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <path d="M136 61 L140 59 L144 61 V65 C144 68 140 71 140 71 C140 71 136 68 136 65 V61 Z" fill="#059669" />
                
                {/* Document Icon Bubble */}
                <circle cx="60" cy="70" r="12" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                <path d="M57 65 H63 V75 H57 V65 Z" fill="#3b82f6" />
                
                {/* Checkmark bubble */}
                <circle cx="115" cy="45" r="10" fill="#fdf2f8" stroke="#fbcfe8" strokeWidth="1" />
                <path d="M112 45 L114 47 L118 43" stroke="#db2777" strokeWidth="1.5" strokeLinecap="round" />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="circleGrad" x1="30" y1="30" x2="170" y2="170" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#059669" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Pillar text blocks (Col Span 1) */}
            <div className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Award className="w-4 h-4 text-emerald-600" /> Better Administration
                </h4>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Schools can now be administered with ease. Manage your staff, students, parents, school activities, account - all in one place - Yes! it's that incredible.
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-indigo-600" /> Better Parenting
                </h4>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Parents can now follow up on their wards, get attendance, check report card release states, and communicate with the school with ease - Amazing!
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Heart className="w-4 h-4 text-rose-500" /> The First Class Student
                </h4>
                <p className="text-[10px] text-slate-400 font-bold leading-normal">
                  Students have access to transparent grade analytics, dynamic standings feedback, and verified report indicators to give the student a first-class edge.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Solutions Showcase (Minimalistic Grid) */}
      <section id="solutions" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <h2 className="text-xs uppercase font-extrabold tracking-widest text-indigo-600">
            Solutions Suite
          </h2>
          <p className="text-3xl font-black text-slate-900 tracking-tight">
            Designed to wow. Engineered to perform.
          </p>
          <p className="text-sm text-slate-400 font-semibold leading-relaxed">
            A curated suite of modern academic operating features built with smooth responsive layouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 w-fit group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Result Compilation Engine</h3>
              <p className="text-slate-450 text-[11px] font-semibold leading-relaxed">
                Aggregates subject scores in real-time, calculates overall positions correctly resolving student standing ties, computes term averages, and formats A4 PDF report cards.
              </p>
            </div>
            <div className="mt-6 border-t border-slate-50 pt-4 flex items-center justify-between text-[10px] font-bold text-emerald-600 uppercase">
              <span>Automatic Rankings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 w-fit group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800">SaaS Multi-Tenant Isolation</h3>
              <p className="text-slate-450 text-[11px] font-semibold leading-relaxed">
                Maintains absolute schema isolation boundary per school. Allows customized grading rules (A1-F9 scales for secondary and A-D matrices for primary tenants).
              </p>
            </div>
            <div className="mt-6 border-t border-slate-50 pt-4 flex items-center justify-between text-[10px] font-bold text-indigo-600 uppercase">
              <span>Data Segregation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-3xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-500 w-fit group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-slate-800">Offline-First Auto-Save</h3>
              <p className="text-slate-450 text-[11px] font-semibold leading-relaxed">
                Keeps teachers productive regardless of connectivity. Saves spreadsheet grades locally in IndexedDB when offline, and auto-syncs with PostgreSQL once connection returns.
              </p>
            </div>
            <div className="mt-6 border-t border-slate-50 pt-4 flex items-center justify-between text-[10px] font-bold text-rose-600 uppercase">
              <span>IndexedDB Sync</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Contact Details Card (Col Span 5) */}
          <div className="lg:col-span-5 bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Get In Touch</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Contact NachoEd Operating Hub</h3>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Have questions about custom features, setups, or pricing plans? Drop us a line or visit our Lagos offices.
              </p>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <span>+234 818 333 4455</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <span>support@nachoed.com</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>King Street, No 25567, Lekki, Lagos, Nigeria</span>
              </div>
            </div>

            <div className="h-px bg-slate-50 my-2" />
            
            <div className="text-[10px] text-slate-400 font-medium italic">
              * Dedicated support lines are open Monday - Friday, 8:00 AM - 5:00 PM.
            </div>
          </div>

          {/* Simple Contact Form (Col Span 7) */}
          <div className="lg:col-span-7 bg-white border border-slate-100 p-8 rounded-3xl shadow-[0_10px_35px_rgba(0,0,0,0.02)]">
            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Zainab Abubakar"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-200 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">School Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Greenwood Secondary"
                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-200 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. principal@greenwood.com"
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-200 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Message Inquiry</label>
                <textarea
                  placeholder="How can our technical team help your school today?"
                  className="w-full h-32 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-slate-350 font-semibold text-slate-700 hover:border-slate-200 transition-colors resize-none"
                />
              </div>

              <button
                type="button"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-650 hover:opacity-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
              >
                Send Inquiry Message
              </button>
            </form>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-10 mt-16 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-450 text-[11px] font-bold">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <span>© 2026 NachoEd Academic Analytics. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Secure Sessions Enabled</span>
            <span>GDPR/NDPR Isolated Data</span>
          </div>
        </div>
      </footer>

      {/* WhatsApp Chat Floating Widget (Image 3) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3.5">
        {whatsappOpen && (
          <div className="bg-white border border-slate-150 rounded-2xl shadow-2xl p-4 w-72 flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs relative">
                N
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border border-white rounded-full" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800">NachoEd Support</h4>
                <span className="text-[9px] text-slate-400 font-bold uppercase">Online • Responds Instantly</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
              Hello there! 👋 Let us know how we can help configure your school's report card automation setup.
            </p>

            <a
              href="https://wa.me/2348183334455"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" /> Start WhatsApp Chat
            </a>
          </div>
        )}
        
        {/* Pulsing trigger button */}
        <button
          type="button"
          onClick={() => setWhatsappOpen(!whatsappOpen)}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer relative"
        >
          {/* Pulse ring indicator */}
          <span className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-pulse-ring" />
          
          {whatsappOpen ? <X className="w-6 h-6 relative z-10" /> : (
            <svg className="w-6 h-6 relative z-10 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          )}
        </button>
      </div>

    </div>
  );
}

export const dynamic = 'force-dynamic';
