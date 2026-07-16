'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Shield, Sparkles, BookOpen, Layers, BarChart3, ArrowRight, 
  CheckCircle, Smartphone, HelpCircle, MessageSquare, Phone, 
  Mail, MapPin, Menu, X, Compass, Target, Award, Users, Heart, Loader2, GraduationCap, Key
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Registration Modal State
  const [regModalOpen, setRegModalOpen] = useState(false);
  const [tryModalOpen, setTryModalOpen] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSchoolName, setRegSchoolName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPosition, setRegPosition] = useState('');
  const [regSchoolType, setRegSchoolType] = useState('');
  const [regOwnership, setRegOwnership] = useState('');
  const [regStudentCount, setRegStudentCount] = useState('');
  const [regTeacherCount, setRegTeacherCount] = useState('');
  const [regClassCount, setRegClassCount] = useState('');
  const [regResultMethod, setRegResultMethod] = useState('');
  const [regAttendanceMethod, setRegAttendanceMethod] = useState('');
  const [regChallenge, setRegChallenge] = useState('');
  const [regFeatures, setRegFeatures] = useState<string[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [registeredCredentials, setRegisteredCredentials] = useState<any>(null);

  // School selection states for dynamic demo portals
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState<string>('nacho-secondary');

  useEffect(() => {
    fetch('/api/schools')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          setSchools(json.data);
        }
      })
      .catch(err => console.error('Failed to load school tenants:', err));
  }, []);

  // Helper to reset registration form
  const resetRegForm = () => {
    setRegStep(1);
    setRegName('');
    setRegEmail('');
    setRegSchoolName('');
    setRegPhone('');
    setRegPosition('');
    setRegSchoolType('');
    setRegOwnership('');
    setRegStudentCount('');
    setRegTeacherCount('');
    setRegClassCount('');
    setRegResultMethod('');
    setRegAttendanceMethod('');
    setRegChallenge('');
    setRegFeatures([]);
    setRegSuccess(false);
    setRegError('');
    setRegisteredCredentials(null);
  };

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactSchool, setContactSchool] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Auto-open Try App modal if URL contains ?try=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('try') === 'true') {
      setTryModalOpen(true);
      // Clean up the URL parameter immediately so refreshes don't reopen the modal
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Registration Modal Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we are at the final step. If not, don't submit yet.
    if (regStep < 4) {
      setRegStep(prev => prev + 1);
      return;
    }

    setRegLoading(true);
    setRegError('');
    setRegSuccess(false);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName: regSchoolName,
          schoolType: regSchoolType || null,
          ownershipType: regOwnership || null,
          contactName: regName,
          position: regPosition || null,
          email: regEmail,
          phone: regPhone || null,
          studentCount: regStudentCount ? parseInt(regStudentCount, 10) : null,
          teacherCount: regTeacherCount ? parseInt(regTeacherCount, 10) : null,
          classCount: regClassCount ? parseInt(regClassCount, 10) : null,
          currentResultMethod: regResultMethod || null,
          currentAttendanceMethod: regAttendanceMethod || null,
          biggestChallenge: regChallenge || null,
          interestedFeatures: regFeatures,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit registration.');
      }

      if (data.credentials) {
        setRegisteredCredentials(data.credentials);
      }
      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message || 'Connection error. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Contact Form Submit (stores contact inquiry as a Lead in the database)
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactError('');
    setContactSubmitted(false);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          schoolName: contactSchool,
          message: contactMsg
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send inquiry.');
      }

      setContactSubmitted(true);
      // Reset form
      setContactName('');
      setContactSchool('');
      setContactEmail('');
      setContactMsg('');
    } catch (err: any) {
      setContactError(err.message || 'Connection error. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#2d3748] relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900 font-sans-custom">
      
      {/* Import custom fonts & inject animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@1,400;1,600&display=swap');
        
        :root {
          --font-sans: 'Plus Jakarta Sans', sans-serif;
          --font-serif: 'Playfair Display', serif;
        }

        body {
          font-family: var(--font-sans);
          background-color: #f8f9fa;
        }

        .serif-italic {
          font-family: var(--font-serif);
        }

        /* Floating background shapes */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(-6px); }
          50% { transform: translateY(6px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-pulse-ring {
          animation: pulse-ring 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        /* Snake plant leaf sways */
        @keyframes sway-slow-anim {
          0%, 100% { transform: rotate(0deg) skewX(0deg); }
          50% { transform: rotate(-2deg) skewX(-1.5deg); }
        }
        @keyframes sway-medium-anim {
          0%, 100% { transform: rotate(0deg) skewX(0deg); }
          50% { transform: rotate(2.5deg) skewX(2deg); }
        }
        @keyframes sway-fast-anim {
          0%, 100% { transform: rotate(0deg) skewX(0deg); }
          50% { transform: rotate(-1.5deg) skewX(-1deg); }
        }

        .sway-slow {
          transform-origin: 150px 200px;
          animation: sway-slow-anim 8s ease-in-out infinite;
        }
        .sway-medium {
          transform-origin: 150px 200px;
          animation: sway-medium-anim 6s ease-in-out infinite;
        }
        .sway-fast {
          transform-origin: 150px 200px;
          animation: sway-fast-anim 5s ease-in-out infinite;
        }

        /* SVG logo & illustrations classes */
        .icon-hover-rotate:hover {
          transform: rotate(5deg) scale(1.03);
          transition: all 0.3s ease;
        }
      `}</style>

      {/* Floating subtle background accents (Minimalist) */}
      <div className="absolute top-[15%] left-[5%] w-64 h-64 rounded-full bg-emerald-100/30 blur-3xl pointer-events-none z-0" />
      <div className="absolute top-[35%] right-[8%] w-80 h-80 rounded-full bg-blue-100/20 blur-3xl pointer-events-none z-0" />

      {/* Navigation Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-md border-b border-[#e9ecef] shadow-[0_2px_20px_rgba(0,0,0,0.02)]' 
          : 'bg-transparent border-b border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            {/* Custom SVG logo in academic theme */}
            <svg viewBox="0 0 100 100" className="w-8 h-8 flex-shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15 C25 25 25 60 50 85 C75 60 75 25 50 15 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
              <path d="M36 45 C42 48 48 51 50 54 C52 51 58 48 64 45 V65 C58 68 52 71 50 74 C48 71 42 68 36 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
              <path d="M50 54 V74" stroke="#1d4ed8" strokeWidth="1.5" />
              <path d="M50 22 L62 27 L50 32 L38 27 Z" fill="#1e293b" />
              <path d="M44 29.5 V33 C44 36 56 36 56 33 V29.5" fill="#1e293b" />
              <path d="M62 27 V35" stroke="#db2777" strokeWidth="1.5" />
              <circle cx="62" cy="35" r="1.5" fill="#db2777" />
            </svg>
            <span className="font-semibold text-lg tracking-wider text-[#1e293b] uppercase">
              NachoEd
            </span>
          </div>
          
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-10 text-xs font-bold text-[#64748b] uppercase tracking-widest">
            <a href="#about" className="hover:text-[#10b981] transition-colors duration-200">About</a>
            <a href="#solutions" className="hover:text-[#10b981] transition-colors duration-200">Solutions</a>
            <a href="#contact" className="hover:text-[#10b981] transition-colors duration-200">Contact Us</a>
          </nav>

          {/* Auth Controls */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-xs font-bold text-[#64748b] hover:text-[#1e293b] uppercase tracking-widest transition-colors duration-200"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => setTryModalOpen(true)}
              className="px-6 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold tracking-widest uppercase transition-all duration-200 shadow-sm"
            >
              Try App
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#475569] hover:bg-slate-100 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[68px] bg-white border-b border-[#e9ecef] shadow-lg z-40 p-6 flex flex-col gap-5 animate-in slide-in-from-top duration-250">
          <nav className="flex flex-col gap-4 text-xs font-bold text-[#64748b] uppercase tracking-widest">
            <a 
              href="#about" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#10b981] py-1 transition-colors"
            >
              About
            </a>
            <a 
              href="#solutions" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#10b981] py-1 transition-colors"
            >
              Solutions
            </a>
            <a 
              href="#contact" 
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#10b981] py-1 transition-colors"
            >
              Contact Us
            </a>
          </nav>
          <div className="h-px bg-slate-100 my-1" />
          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 text-center border border-[#cbd5e1] text-[#475569] font-bold text-xs uppercase tracking-widest transition-all"
            >
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); setTryModalOpen(true); }}
              className="w-full py-2.5 text-center bg-[#1e293b] text-white font-bold text-xs uppercase tracking-widest transition-all"
            >
              Try App
            </button>
            <button
              type="button"
              onClick={() => { setMobileMenuOpen(false); setRegModalOpen(true); }}
              className="w-full py-2.5 text-center border border-[#cbd5e1] text-[#475569] font-bold text-xs uppercase tracking-widest transition-all"
            >
              Register Interest
            </button>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ecfdf5] border border-[#d1fae5] text-[#047857] text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Redefining School Administration</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[#1e293b] leading-tight tracking-tight">
            Make your school <br className="hidden sm:block" />
            workflow <span className="text-[#10b981] serif-italic font-normal">more natural</span>.
          </h1>

          <p className="text-[#64748b] text-sm sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
            NachoEd delivers a beautiful, minimalist approach to academic operations. 
            Automate score spreadsheets, resolve class average tied standings, compile report cards 
            seamlessly, and experience a natural synergy connecting administrators, teachers, and parents.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-4">
            <button
              type="button"
              onClick={() => setTryModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold tracking-widest uppercase transition-all duration-200 shadow-md text-center cursor-pointer"
            >
              Try App Now
            </button>
            <button
              type="button"
              onClick={() => setRegModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 border border-[#cbd5e1] bg-white hover:bg-slate-50 text-[#475569] text-xs font-bold tracking-widest uppercase transition-all duration-200 text-center cursor-pointer"
            >
              Register Interest
            </button>
          </div>
        </div>

        {/* Minimalist Swaying Tripod Academic Textbooks (Image 1 style adapted) */}
        <div className="lg:col-span-5 flex justify-center items-center relative h-[380px] lg:h-[450px]">
          
          {/* Custom SVG Textbooks & Graduation Cap on Tripod Stand */}
          <div className="relative z-10 w-full max-w-[280px] sm:max-w-[320px] transition-transform hover:scale-102 duration-300">
            <svg viewBox="0 0 300 400" className="w-full h-auto drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Stand Legs */}
              <line x1="150" y1="200" x2="95" y2="390" stroke="#78350f" strokeWidth="5.5" strokeLinecap="round" />
              <line x1="150" y1="200" x2="205" y2="390" stroke="#78350f" strokeWidth="5.5" strokeLinecap="round" />
              <line x1="150" y1="200" x2="150" y2="395" stroke="#451a03" strokeWidth="5" strokeLinecap="round" />
              
              {/* Stand Top Circular Tray */}
              <ellipse cx="150" cy="198" rx="50" ry="12" fill="#d97706" stroke="#b45309" strokeWidth="2" />
              <ellipse cx="150" cy="201" rx="46" ry="9" fill="#78350f" opacity="0.3" />
              
              {/* Stack of Academic Textbooks */}
              {/* Book 1 (Bottom, Royal Blue) */}
              <path d="M110 175 L190 158 L200 172 L120 189 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
              <path d="M190 158 L200 172 V178 L190 164 Z" fill="#1d4ed8" />
              <path d="M120 189 L200 172 V178 L120 195 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M110 175 L120 189 V195 L110 181 Z" fill="#1e40af" />
              
              {/* Book 2 (Middle, Coral Pink) */}
              <path d="M115 150 L185 140 L193 154 L123 164 Z" fill="#f43f5e" stroke="#e11d48" strokeWidth="1.5" />
              <path d="M185 140 L193 154 V160 L185 146 Z" fill="#e11d48" />
              <path d="M123 164 L193 154 V160 L123 170 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M115 150 L123 164 V170 L115 156 Z" fill="#be123c" />
              
              {/* Book 3 (Top, Emerald Green) */}
              <path d="M110 132 H190 L198 146 H118 Z" fill="#10b981" stroke="#059669" strokeWidth="1.5" />
              <path d="M190 132 L198 146 V152 L190 138 Z" fill="#059669" />
              <path d="M118 146 H198 V152 H118 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M110 132 V138 L118 152 V146 Z" fill="#047857" />
              
              {/* Graduation Cap resting on top */}
              <path d="M132 122 C132 130 168 130 168 122 V132 C168 140 132 140 132 132 Z" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
              <path d="M150 102 L185 114 L150 126 L115 114 Z" fill="#0f172a" stroke="#1e293b" strokeWidth="1.5" />
              <path d="M150 105 L182 116 L150 127 L118 116 Z" fill="#1e293b" />
              
              {/* Cap Tassel */}
              <path d="M150 114 L128 129 V149" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <circle cx="128" cy="149" r="2.5" fill="#d97706" />
              
              {/* Floating Academic Accent Node Elements */}
              <g transform="translate(200, 30)" className="animate-float-delayed">
                <circle cx="20" cy="20" r="16" fill="#fef3c7" stroke="#fcd34d" strokeWidth="1" />
                <path d="M16 26 H24 M15 23 H25 M17 29 H23" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
                <path d="M20 9 C15 9 13 13 13 17 C13 21 16 23 17 25 H23 C24 23 27 21 27 17 C27 13 25 9 20 9 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                <path d="M18 17 H22 M20 15 V19" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              
              <g transform="translate(140, 30)" className="animate-float">
                <path d="M10 2 L12 8 L18 10 L12 12 L10 18 L8 12 L2 10 L8 8 Z" fill="#fbbf24" />
              </g>
              <g transform="translate(90, 110)" className="animate-float-delayed">
                <path d="M5 1 L6 4 L9 5 L6 6 L5 9 L4 6 L1 5 L4 4 Z" fill="#3b82f6" />
              </g>
            </svg>
          </div>

          {/* Decorative rings backdrop */}
          <div className="absolute w-72 h-72 rounded-full border border-slate-200/50 pointer-events-none z-0" />
          <div className="absolute w-[350px] h-[350px] rounded-full border border-dashed border-slate-200/30 pointer-events-none z-0" />
        </div>
      </section>

      {/* Overlapping Launch Offer Card (Image 1 style) */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 -mt-4 mb-24">
        <div className="bg-[#f1f3f5] border border-[#e9ecef] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            {/* Custom SVG Diploma & Cap (Image 1 reference adapted) */}
            <div className="flex-shrink-0 animate-float">
              <svg viewBox="0 0 160 160" className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="25" y="45" width="110" height="90" rx="6" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M25 65 H135" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="35" y="90" width="90" height="24" rx="4" fill="#fffbeb" stroke="#fcd34d" strokeWidth="2" transform="rotate(-12, 80, 102)" />
                <rect x="73" y="86" width="14" height="25" fill="#ef4444" stroke="#dc2626" strokeWidth="1" transform="rotate(-12, 80, 102)" />
                <path d="M80 102 L70 122 L80 115 L90 122 Z" fill="#ef4444" stroke="#dc2626" strokeWidth="1" />
                <path d="M80 50 L115 60 L80 70 L45 60 Z" fill="#1e293b" />
                <path d="M57 63 C57 69 103 69 103 63 V71 C103 77 57 77 57 71 Z" fill="#0f172a" />
                <path d="M80 60 L62 72 V82" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                <circle cx="62" cy="82" r="2.5" fill="#d97706" />
                <path d="M125 50 L127 54 L131 55 L127 56 L125 60 L123 56 L119 55 L123 54 Z" fill="#fbbf24" />
                <path d="M38 72 L39 74 L41 75 L39 76 L38 78 L37 76 L35 75 L37 74 Z" fill="#3b82f6" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#10b981] tracking-widest block mb-1">
                Special launch offer!
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#1e293b]">
                Deploy NachoEd to your school for free this term
              </h3>
              <p className="text-xs text-[#64748b] mt-1 max-w-xl">
                Experience instant score sheet calculations, student position compiling, offline auto-saves, and secure parent dashboard delivery. No commitment required.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setRegModalOpen(true)}
              className="block w-full md:w-auto px-7 py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold tracking-widest uppercase transition-all duration-200 text-center"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Solutions Grid Section ("Best Seller Features") */}
      <section id="solutions" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-[#e9ecef]">
        <div className="text-center max-w-2xl mx-auto mb-20 space-y-4">
          <h2 className="text-[10px] uppercase font-bold tracking-widest text-[#10b981]">
            Best Seller Solutions
          </h2>
          <p className="text-3xl font-normal text-[#1e293b] tracking-tight">
            Designed to wow. Engineered to perform.
          </p>
          <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-widest leading-relaxed">
            Four core administration components styled with elegant simplicity
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-[#f8f9fa] border border-[#e9ecef] p-8 text-center flex flex-col items-center justify-between min-h-[380px] hover:border-slate-350 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-350 group">
            <div className="space-y-6 flex flex-col items-center">
              {/* Result Compiler SVG */}
              <div className="w-16 h-16 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 70 C30 65 45 68 50 72 C55 68 70 65 85 70 V30 C70 25 55 28 50 32 C45 28 30 25 15 30 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="2" />
                  <path d="M50 32 V72" stroke="#3b82f6" strokeWidth="2" />
                  <rect x="25" y="44" width="6" height="18" fill="#10b981" rx="1" />
                  <rect x="34" y="38" width="6" height="24" fill="#3b82f6" rx="1" />
                  <rect x="43" y="32" width="6" height="30" fill="#f59e0b" rx="1" />
                  <circle cx="68" cy="46" r="10" fill="#fef2f2" stroke="#fee2e2" strokeWidth="1" />
                  <text x="64" y="50" fill="#ef4444" fontSize="10" fontWeight="bold">A+</text>
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">Result Compiler</h3>
              <p className="text-[#64748b] text-[11px] font-semibold leading-relaxed">
                Aggregates subject scores in real-time, compiles ranks, solves average ties, and renders pixel-perfect PDF cards.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegModalOpen(true)} 
              className="mt-6 border-b border-[#1e293b] pb-1 text-[10px] font-bold text-[#1e293b] uppercase tracking-wider hover:text-[#10b981] hover:border-[#10b981] transition-colors"
            >
              Explore Compiler &rarr;
            </button>
          </div>

          {/* Card 2 */}
          <div className="bg-[#f8f9fa] border border-[#e9ecef] p-8 text-center flex flex-col items-center justify-between min-h-[380px] hover:border-slate-350 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-350 group">
            <div className="space-y-6 flex flex-col items-center">
              {/* Tenant Isolation SVG */}
              <div className="w-16 h-16 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 15 C30 22 25 45 25 58 C25 74 42 84 50 87 C58 84 75 74 75 58 C75 45 70 22 50 15 Z" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" />
                  <rect x="36" y="48" width="28" height="22" rx="4" fill="#ffffff" stroke="#047857" strokeWidth="2" />
                  <circle cx="50" cy="58" r="3" fill="#047857" />
                  <path d="M42 48 V38 C42 33 46 30 50 30 C54 30 58 33 58 38 V48" stroke="#047857" strokeWidth="2.5" fill="none" />
                  <path d="M50 54 L56 56 L50 58 L44 56 Z" fill="#10b981" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">Tenant Isolation</h3>
              <p className="text-[#64748b] text-[11px] font-semibold leading-relaxed">
                Ensures absolute database segregation per school. Customize grading systems from primary to secondary scales.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegModalOpen(true)} 
              className="mt-6 border-b border-[#1e293b] pb-1 text-[10px] font-bold text-[#1e293b] uppercase tracking-wider hover:text-[#10b981] hover:border-[#10b981] transition-colors"
            >
              Verify Security &rarr;
            </button>
          </div>

          {/* Card 3 */}
          <div className="bg-[#f8f9fa] border border-[#e9ecef] p-8 text-center flex flex-col items-center justify-between min-h-[380px] hover:border-slate-350 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-350 group">
            <div className="space-y-6 flex flex-col items-center">
              {/* Offline Sync SVG */}
              <div className="w-16 h-16 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M25 65 C20 65 15 60 15 54 C15 48 20 44 26 44 C29 35 38 30 48 30 C58 30 67 36 69 46 C75 47 80 52 80 58 C80 65 74 70 67 70 H25 Z" fill="#fffbeb" stroke="#fcd34d" strokeWidth="2" />
                  <path d="M38 52 H62 V58 H38 Z" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
                  <path d="M50 38 C58 38 64 42 64 48 L68 46" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <path d="M50 62 C42 62 36 58 36 52 L32 54" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">Offline Sync</h3>
              <p className="text-[#64748b] text-[11px] font-semibold leading-relaxed">
                Allows teachers to enter scores offline into IndexedDB, and auto-syncs with PostgreSQL once internet returns.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegModalOpen(true)} 
              className="mt-6 border-b border-[#1e293b] pb-1 text-[10px] font-bold text-[#1e293b] uppercase tracking-wider hover:text-[#10b981] hover:border-[#10b981] transition-colors"
            >
              Check Syncing &rarr;
            </button>
          </div>

          {/* Card 4 */}
          <div className="bg-[#f8f9fa] border border-[#e9ecef] p-8 text-center flex flex-col items-center justify-between min-h-[380px] hover:border-slate-350 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all duration-350 group">
            <div className="space-y-6 flex flex-col items-center">
              {/* Parent Portal SVG */}
              <div className="w-16 h-16 group-hover:scale-105 transition-transform duration-300">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="40" cy="55" r="22" stroke="#bfdbfe" strokeWidth="2" fill="#eff6ff" fillOpacity="0.6" />
                  <circle cx="60" cy="55" r="22" stroke="#fbcfe8" strokeWidth="2" fill="#fdf2f8" fillOpacity="0.6" />
                  <path d="M28 65 H46 V46 H28 Z" fill="#3b82f6" opacity="0.3" />
                  <path d="M37 38 L26 46 H48 Z" fill="#1d4ed8" />
                  <rect x="30" y="46" width="14" height="19" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1" />
                  <rect x="35" y="55" width="4" height="10" fill="#1d4ed8" />
                  <path d="M54 65 H72 V48 H54 Z" fill="#db2777" opacity="0.3" />
                  <path d="M63 40 L52 48 H74 Z" fill="#be123c" />
                  <rect x="56" y="48" width="14" height="17" fill="#ffffff" stroke="#be123c" strokeWidth="1" />
                  <rect x="61" y="57" width="4" height="8" fill="#be123c" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider">Parent Portal</h3>
              <p className="text-[#64748b] text-[11px] font-semibold leading-relaxed">
                Allows parents to securely log in, verify term attendance, see student averages, and download released reports.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRegModalOpen(true)} 
              className="mt-6 border-b border-[#1e293b] pb-1 text-[10px] font-bold text-[#1e293b] uppercase tracking-wider hover:text-[#10b981] hover:border-[#10b981] transition-colors"
            >
              Open Portal &rarr;
            </button>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section (Image 3 layout) */}
      <section id="about" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-[#e9ecef]">
        
        {/* Centered Heading with dots */}
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#10b981] block">
            NachoEd values
          </span>
          <h2 className="text-3xl sm:text-4xl font-normal text-[#1e293b]">
            Vision & Mission
          </h2>
          <p className="text-xs text-[#94a3b8] font-bold uppercase tracking-widest">
            The Goal, Vision and Mission of NachoEd
          </p>
          <div className="flex justify-center gap-1.5 pt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#db2777]"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Vector Illustration (Image 3 style) */}
          <div className="lg:col-span-7 flex justify-center items-center">
            <svg className="w-full max-w-[340px] md:max-w-[420px] h-auto drop-shadow-xl animate-float" viewBox="0 0 400 360" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Gradient background circle */}
              <circle cx="200" cy="180" r="130" fill="url(#illustBlob)" />
              
              {/* Desk */}
              <path d="M50 260 L280 185 L360 265 L130 340 Z" fill="#1c2837" />
              
              {/* Laptop screen & base */}
              <path d="M160 260 L220 238 L250 263 L190 285 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
              <path d="M220 238 L225 185 L180 201 L175 254 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
              <rect x="183" y="202" width="37" height="32" transform="skewY(-15)" fill="#eff6ff" />
              <rect x="190" y="211" width="22" height="4.5" transform="skewY(-15)" fill="#3b82f6" rx="1" />
              
              {/* Sheets of paper */}
              <path d="M90 285 L135 268 L150 295 L105 312 Z" fill="#ffffff" />
              <path d="M98 288 L125 278" stroke="#94a3b8" strokeWidth="1" />
              <path d="M102 296 L129 286" stroke="#94a3b8" strokeWidth="1" />
              
              {/* Coffee Mug */}
              <rect x="135" y="248" width="10" height="15" rx="2.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
              <path d="M135 252 H131 V258 H135" stroke="#cbd5e1" strokeWidth="1" />
              
              {/* White Chair seat & backrest */}
              <path d="M228 305 L240 350 M250 305 L262 350" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
              <path d="M195 325 L265 298" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
              <path d="M255 298 L270 215" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
              
              {/* Torso (Orange Shirt) */}
              <path d="M220 258 C215 278 230 308 240 318 C250 318 265 308 265 282 Z" fill="#f97316" />
              
              {/* Legs (Blue pants) */}
              <path d="M235 318 L225 358" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" />
              <path d="M250 318 L255 358" stroke="#2563eb" strokeWidth="12" strokeLinecap="round" />
              
              {/* Head */}
              <circle cx="245" cy="205" r="14" fill="#fed7aa" />
              {/* Hair */}
              <path d="M233 205 C233 190 257 190 257 205 C257 201 250 198 245 198 Z" fill="#1e293b" />
              
              {/* Arms */}
              <path d="M228 258 L202 254 L192 258" stroke="#fed7aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M231 258 L207 261 L197 265" stroke="#fed7aa" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              
              {/* Floating nodes */}
              {/* Node 1: Secure Shield (Green) */}
              <g transform="translate(290, 85)" className="animate-float">
                <circle cx="16" cy="16" r="16" fill="#ecfdf5" stroke="#a7f3d0" strokeWidth="1" />
                <path d="M11 11 L16 9 L21 11 V16 C21 20 16 23 16 23 C16 23 11 20 11 16 V11 Z" fill="#10b981" />
              </g>
              
              {/* Node 2: Checkmark (Pink) */}
              <g transform="translate(80, 120)" className="animate-float-delayed">
                <circle cx="14" cy="14" r="14" fill="#fdf2f8" stroke="#fbcfe8" strokeWidth="1" />
                <path d="M9 14 L12 17 L19 10" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </g>
              
              {/* Node 3: Document (Blue) */}
              <g transform="translate(240, 50)" className="animate-float">
                <circle cx="14" cy="14" r="14" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
                <path d="M9 8 H17 L20 11 V20 H9 V8 Z" fill="#3b82f6" />
                <path d="M12 12 H17 M12 16 H15" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              <defs>
                <linearGradient id="illustBlob" x1="60" y1="40" x2="340" y2="320" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" stopOpacity="0.12" />
                  <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.08" />
                  <stop offset="1" stopColor="#6366f1" stopOpacity="0.12" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Right Column: 3 Features pillars (Image 3 format) */}
          <div className="lg:col-span-5 space-y-10">
            
            {/* Pillar 1: Better Administration (representing Mission) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider flex items-center gap-2">
                <Award className="w-5 h-5 text-[#10b981]" />
                Better Administration
              </h3>
              <p className="text-[#64748b] text-xs font-semibold leading-relaxed">
                Schools can now be administered with ease. Our mission is to eliminate academic bottlenecks by automating compilation, checking scores, and handling rankings in one place. Yes! it's that incredible.
              </p>
            </div>

            {/* Pillar 2: Better Parenting (representing Vision) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider flex items-center gap-2">
                <Users className="w-5 h-5 text-[#3b82f6]" />
                Better Parenting
              </h3>
              <p className="text-[#64748b] text-xs font-semibold leading-relaxed">
                Parents can now follow up on their wards. Our vision is to foster complete academic transparency, enabling parents to receive instantaneous notifications and view results securely on their dashboard.
              </p>
            </div>

            {/* Pillar 3: The First Class Student (representing Target) */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-[#1e293b] uppercase tracking-wider flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#db2777]" />
                The First Class Student
              </h3>
              <p className="text-[#64748b] text-xs font-semibold leading-relaxed">
                Students have access to clear performance tracking. Displaying class statistics, positions, and average distributions empowers learners with a first-class motivation edge.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="max-w-7xl mx-auto px-6 py-16 lg:py-24 relative z-10 border-t border-[#e9ecef]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left column details */}
          <div className="lg:col-span-5 bg-white border border-[#e9ecef] p-8 flex flex-col justify-between space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Get In Touch</span>
              <h3 className="text-2xl font-normal text-[#1e293b] tracking-tight">Contact NachoEd Hub</h3>
              <p className="text-xs text-[#64748b] font-semibold leading-relaxed">
                Have questions about custom grading systems, offline operations, or setup requirements? Send us a message or contact our help desk.
              </p>
            </div>

            <div className="space-y-4 text-xs font-semibold text-[#475569]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-[#cbd5e1] text-[#64748b]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span>+23490 373 970 84 (WhatsApp)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-[#cbd5e1] text-[#64748b]">
                  <Mail className="w-4 h-4" />
                </div>
                <span>hellotonachoai@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 border border-[#cbd5e1] text-[#64748b]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span>Lagos, Nigeria</span>
              </div>
            </div>

            <div className="border-t border-[#e9ecef] pt-4 text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest italic">
              * Support operations active Monday - Friday (8am - 5pm).
            </div>
          </div>

          {/* Right column form */}
          <div className="lg:col-span-7 bg-white border border-[#e9ecef] p-8">
            {contactSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-5 py-12">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner animate-pulse">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-lg font-bold text-slate-800">Inquiry Received Successfully</h4>
                <p className="text-xs text-[#64748b] max-w-sm">
                  Thank you! Our technical onboarding team will reach out to your school coordinator within 24 hours.
                </p>
                
                <div className="bg-[#f8f9fa] border border-[#e2e8f0] p-5 rounded-2xl text-left space-y-3 max-w-md mx-auto shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Mail className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Check Your Email</span>
                  </div>
                  <p className="text-xs text-[#475569] leading-relaxed font-semibold">
                    We have also sent your **demo login credentials** (email and password) to your registered email address. Please check your inbox (and spam folder) to log in immediately!
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setContactSubmitted(false)}
                  className="px-6 py-2.5 bg-[#1e293b] text-white hover:bg-[#0f172a] text-xs font-bold uppercase tracking-widest transition-colors rounded-xl shadow-md"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleContactSubmit}>
                {contactError && (
                  <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs font-bold flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>{contactError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Full Name</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="e.g. Zainab Abubakar"
                      className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">School Name</label>
                    <input
                      type="text"
                      required
                      value={contactSchool}
                      onChange={(e) => setContactSchool(e.target.value)}
                      placeholder="e.g. Greenwood Secondary"
                      className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="e.g. principal@greenwood.com"
                    className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Message Inquiry</label>
                  <textarea
                    required
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                    placeholder="How can our technical team help your school today?"
                    className="w-full h-32 bg-[#f8f9fa] border border-[#e9ecef] px-4 py-3 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="w-full py-3.5 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs uppercase tracking-widest transition-all duration-200 shadow-md flex justify-center items-center gap-2"
                >
                  {contactLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Inquiry...</span>
                    </>
                  ) : (
                    <span>Send Inquiry Message</span>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e9ecef] bg-white py-10 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest">
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 100 100" className="w-5 h-5 opacity-60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 15 C25 25 25 60 50 85 C75 60 75 25 50 15 Z" fill="#eff6ff" stroke="#3b82f6" strokeWidth="4" />
              <path d="M36 45 C42 48 48 51 50 54 C52 51 58 48 64 45 V65 C58 68 52 71 50 74 C48 71 42 68 36 65 Z" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1.5" />
            </svg>
            <span>© 2026 NachoEd Academic Analytics. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Secure SSL Enforced</span>
            <span>GDPR/NDPR Compliant</span>
          </div>
        </div>
      </footer>

      {/* Register Interest Modal */}
      {regModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#cbd5e1] max-w-lg w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => { setRegModalOpen(false); resetRegForm(); }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {regSuccess ? (
              <div className="text-center space-y-5 py-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <CheckCircle className="w-7 h-7" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-[#1e293b] uppercase tracking-wider">Free Trial Activated!</h3>
                  <p className="text-xs text-slate-400 font-semibold">Your 1-Month Free Trial school portal is ready for use.</p>
                </div>

                <div className="bg-[#f8f9fa] border border-[#e2e8f0] p-4.5 rounded-2xl text-left space-y-3.5 max-w-md mx-auto shadow-sm">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Your School Portal Credentials</span>
                  </div>
                  
                  {registeredCredentials ? (
                    <div className="space-y-3">
                      <div className="bg-white border border-[#e2e8f0] p-3.5 rounded-xl space-y-2">
                        <div className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-slate-400">School Name</span>
                          <span className="font-bold text-[#1e293b]">{registeredCredentials.schoolName}</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-slate-400">Portal ID (Slug)</span>
                          <span className="font-mono font-bold text-[#1e293b]">{registeredCredentials.schoolSlug}</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-slate-400">Login Email</span>
                          <span className="font-mono font-bold text-[#1e293b]">{registeredCredentials.email}</span>
                        </div>
                        <div className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
                          <span className="font-semibold text-slate-400">Admin Username</span>
                          <span className="font-mono font-bold text-[#1e293b]">{registeredCredentials.username}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-400">Default Password</span>
                          <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{registeredCredentials.password}</span>
                        </div>
                      </div>
                      
                      <div className="p-2.5 bg-amber-50/50 border border-amber-150 rounded-xl">
                        <p className="text-[10px] text-amber-700 font-semibold leading-relaxed">
                          ⚠️ For security, you will be prompted to update this temporary password upon your first login.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[#475569] leading-relaxed font-semibold">
                        Our onboarding team is spinning up your dedicated school workspace. Your custom administrator access credentials and portal links will be emailed to you within 24 hours at:
                      </p>
                      
                      <div className="bg-white border border-[#e2e8f0] px-3.5 py-2.5 rounded-xl text-center">
                        <strong className="text-[#1e293b] font-bold text-xs">{regEmail}</strong>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                  <a
                    href="/login"
                    onClick={() => {
                      setRegModalOpen(false);
                      resetRegForm();
                    }}
                    className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xl shadow-md text-center flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Go to Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setRegModalOpen(false); resetRegForm(); }}
                    className="flex-1 px-5 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-xl shadow-md"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600">
                      Step {regStep} of 4
                    </span>
                    <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">
                      {regStep === 1 && "Contact Profile"}
                      {regStep === 2 && "School Identity"}
                      {regStep === 3 && "Scale & Volume"}
                      {regStep === 4 && "Operations & Focus"}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-1 mt-2 flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div 
                        key={step} 
                        className={`h-full flex-1 transition-all duration-300 ${
                          step <= regStep ? 'bg-[#1e293b]' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {regError && (
                    <div className="p-3 bg-red-50 border border-red-150 text-red-700 text-xs font-semibold">
                      {regError}
                    </div>
                  )}

                  {/* STEP 1: Contact Details */}
                  {regStep === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Your Name</label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Zainab Abubakar"
                          className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Your Position / Role</label>
                        <select
                          required
                          value={regPosition}
                          onChange={(e) => setRegPosition(e.target.value)}
                          className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                        >
                          <option value="">Select your position...</option>
                          <option value="PROPRIETOR">Proprietor / Owner</option>
                          <option value="PRINCIPAL">Principal / Head of School</option>
                          <option value="VICE_PRINCIPAL">Vice Principal / Deputy Head</option>
                          <option value="TEACHER">Teacher</option>
                          <option value="ADMINISTRATOR">School IT / Administrator</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Email Address</label>
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="e.g. principal@school.com"
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Phone Number</label>
                          <input
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="e.g. +234 803 123 4567"
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: School Profile */}
                  {regStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">School Name</label>
                        <input
                          type="text"
                          required
                          value={regSchoolName}
                          onChange={(e) => setRegSchoolName(e.target.value)}
                          placeholder="e.g. Greenwood Secondary School"
                          className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">School Level</label>
                          <select
                            required
                            value={regSchoolType}
                            onChange={(e) => setRegSchoolType(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          >
                            <option value="">Select...</option>
                            <option value="PRIMARY">Primary / Elementary</option>
                            <option value="SECONDARY">Secondary / High School</option>
                            <option value="COMBINED">Combined (Primary & Secondary)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Ownership Type</label>
                          <select
                            required
                            value={regOwnership}
                            onChange={(e) => setRegOwnership(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          >
                            <option value="">Select...</option>
                            <option value="PRIVATE">Private School</option>
                            <option value="PUBLIC">Public / Government</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: School Scale */}
                  {regStep === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <p className="text-[11px] text-[#64748b] leading-normal italic">
                        Providing estimated student and teacher counts helps us optimize the grading engines and resource allocation for your sandbox tenant.
                      </p>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Students</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 350"
                            value={regStudentCount}
                            onChange={(e) => setRegStudentCount(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Teachers</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 24"
                            value={regTeacherCount}
                            onChange={(e) => setRegTeacherCount(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Classes / Arms</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="e.g. 12"
                            value={regClassCount}
                            onChange={(e) => setRegClassCount(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Operational Profile */}
                  {regStep === 4 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Current Grading Method</label>
                          <select
                            value={regResultMethod}
                            onChange={(e) => setRegResultMethod(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          >
                            <option value="">Select method...</option>
                            <option value="EXCEL">Microsoft Excel sheets</option>
                            <option value="MANUAL">Manual paper calculation</option>
                            <option value="SOFTWARE">Another software platform</option>
                            <option value="OTHER">Other method</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Attendance Compilation</label>
                          <select
                            value={regAttendanceMethod}
                            onChange={(e) => setRegAttendanceMethod(e.target.value)}
                            className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] transition-colors"
                          >
                            <option value="">Select method...</option>
                            <option value="PAPER">Paper register books</option>
                            <option value="SOFTWARE">Digital attendance software</option>
                            <option value="NONE">Not compiled centrally</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">What is your biggest operational challenge?</label>
                        <textarea
                          rows={2}
                          value={regChallenge}
                          onChange={(e) => setRegChallenge(e.target.value)}
                          placeholder="e.g. Teachers take too long to submit scores; compiling reports takes over 2 weeks after exams."
                          className="w-full bg-[#f8f9fa] border border-[#e9ecef] px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#cbd5e1] font-semibold text-slate-700 hover:border-[#cbd5e1] resize-none transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold uppercase tracking-widest text-[#94a3b8]">Features of Interest (Optional)</label>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          {[
                            { key: 'reports', label: 'Report Cards' },
                            { key: 'attendance', label: 'Attendance' },
                            { key: 'scores', label: 'Teacher Grading' },
                            { key: 'portals', label: 'Parent Portal' }
                          ].map((feat) => {
                            const isSelected = regFeatures.includes(feat.key);
                            return (
                              <button
                                key={feat.key}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setRegFeatures(regFeatures.filter(f => f !== feat.key));
                                  } else {
                                    setRegFeatures([...regFeatures, feat.key]);
                                  }
                                }}
                                className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider transition-all duration-150 ${
                                  isSelected 
                                    ? 'bg-[#1e293b] text-white border-[#1e293b]' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {feat.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Modal Navigation Buttons */}
                  <div className="flex items-center gap-3 mt-6 pt-2 border-t border-slate-100">
                    {regStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setRegStep(prev => prev - 1)}
                        className="flex-1 py-3 border border-slate-350 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-widest transition-all"
                      >
                        Back
                      </button>
                    )}
                    
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="flex-[2] py-3 bg-[#1e293b] hover:bg-[#0f172a] text-white font-bold text-xs uppercase tracking-widest transition-all shadow-md flex justify-center items-center gap-2"
                    >
                      {regLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting...</span>
                        </>
                      ) : (
                        <span>
                          {regStep < 4 ? 'Continue' : 'Complete Onboarding'}
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Chat Floating Widget (Image 3 layout) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        {whatsappOpen && (
          <div className="bg-white border border-[#cbd5e1] rounded-2xl shadow-2xl p-5 w-72 flex flex-col gap-4 animate-in slide-in-from-bottom duration-250">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm relative">
                N
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1e293b] uppercase tracking-wider">NachoEd Support</h4>
                <span className="text-[9px] text-[#94a3b8] font-bold uppercase">Online • Responds Instantly</span>
              </div>
            </div>
            
            <p className="text-[10px] text-[#64748b] font-semibold leading-relaxed">
              Hello! 👋 Have any questions about implementing NachoEd report compilation in your school? Let's chat!
            </p>

            <a
              href="https://wa.me/2349037397084"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
            >
              <MessageSquare className="w-4 h-4" /> WhatsApp Chat
            </a>
          </div>
        )}
        
        {/* Pulsing Widget Trigger Button */}
        <button
          type="button"
          onClick={() => setWhatsappOpen(!whatsappOpen)}
          className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 cursor-pointer relative"
        >
          {/* Pulsing green ring */}
          <span className="absolute inset-0 rounded-full border-4 border-emerald-500/30 animate-pulse-ring pointer-events-none" />
          
          {whatsappOpen ? <X className="w-6 h-6 relative z-10" /> : (
            <svg className="w-6 h-6 relative z-10 fill-current" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          )}
        </button>
      </div>

      {/* Try App Demo Personas Modal */}
      {tryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#cbd5e1] max-w-2xl w-full p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setTryModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Interactive Evaluation</span>
                </div>
                <h3 className="text-xl font-normal text-[#1e293b] tracking-tight">Try NachoEd Immediately</h3>
                <p className="text-[#64748b] text-xs font-semibold leading-relaxed">
                  Select a pre-populated role below to explore the dashboard. 
                  Each demo environment has a limited sandbox database workspace ready to try out.
                </p>
              </div>

              {/* Active School Selector for Demo Bypass */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-100/70 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block">Active School Workspace</span>
                  <span className="text-[11px] text-slate-500 font-semibold leading-relaxed block mt-0.5">Select school to log in with direct bypass:</span>
                </div>
                <select
                  value={selectedSchoolSlug}
                  onChange={(e) => setSelectedSchoolSlug(e.target.value)}
                  className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm min-w-[220px]"
                >
                  <option value="nacho-secondary">Nacho Secondary Academy (Default)</option>
                  {schools.map((s: any) => (
                    <option key={s.id} value={s.slug}>{s.name} ({s.slug})</option>
                  ))}
                </select>
              </div>

              {/* Roles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    role: 'SCHOOL_ADMIN',
                    name: 'School Admin',
                    desc: 'Manage classrooms, teachers, schedules, and ranking configurations.',
                    email: 'admin@nacho.com',
                    icon: Award,
                    color: 'text-blue-600 border-blue-150 bg-blue-50/10'
                  },
                  {
                    role: 'CLASS_TEACHER',
                    name: 'Class Teacher',
                    desc: 'Evaluate classroom gradesheets, compile reports, and record registers.',
                    email: 'classteacher@nacho.com',
                    icon: Users,
                    color: 'text-indigo-600 border-indigo-150 bg-indigo-50/10'
                  },
                  {
                    role: 'PARENT',
                    name: 'Parent Portal',
                    desc: 'Access terminal score sheets, download PDF report cards, and track attendance.',
                    email: 'parent@nacho.com',
                    icon: Heart,
                    color: 'text-pink-600 border-pink-150 bg-pink-50/10'
                  },
                  {
                    role: 'STUDENT',
                    name: 'Student View',
                    desc: 'Track score metrics, view academic grades, and check school events.',
                    email: 'student@nacho.com',
                    icon: GraduationCap,
                    color: 'text-violet-600 border-violet-150 bg-violet-50/10'
                  }
                ].map((persona) => {
                  const Icon = persona.icon;
                  return (
                    <div 
                      key={persona.role} 
                      className="p-5 rounded-2xl border border-slate-150 bg-[#f8f9fa] flex flex-col justify-between hover:border-slate-300 hover:bg-white transition-all duration-200 group"
                    >
                      <div>
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center mb-3 bg-white ${persona.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-[#1e293b]">{persona.name}</h4>
                        <p className="text-[#64748b] text-[10px] leading-relaxed mt-1 font-semibold">
                          {persona.desc}
                        </p>
                        <div className="mt-4 p-2.5 rounded-xl bg-slate-100/50 border border-slate-200/50 font-mono text-[9px] text-slate-600 space-y-1">
                          <div><strong>Email:</strong> {persona.email}</div>
                          <div><strong>Password:</strong> password</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          setRegLoading(true);
                          try {
                            const res = await fetch('/api/auth', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ bypassRole: persona.role, schoolSlug: selectedSchoolSlug }),
                            });
                            const resData = await res.json();
                            if (res.ok) {
                              localStorage.setItem('report_auth_token', resData.token);
                              localStorage.setItem('report_user_session', JSON.stringify({
                                user: resData.user,
                                school: resData.school
                              }));
                              document.cookie = `report_auth_token=${resData.token}; path=/; max-age=3600; SameSite=Lax`;
                              window.location.href = '/dashboard';
                            } else {
                              alert(resData.error || 'Failed to authenticate demo user.');
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Connection failed. Please check if your server is running.');
                          } finally {
                            setRegLoading(false);
                          }
                        }}
                        disabled={regLoading}
                        className="w-full mt-4 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {regLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Launching...</span>
                          </>
                        ) : (
                          <>
                            <span>Quick Login</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const dynamic = 'force-dynamic';
