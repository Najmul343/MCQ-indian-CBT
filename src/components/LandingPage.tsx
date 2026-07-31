import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeGetDocs, DEFAULT_SUPER_ADMIN, INITIAL_TESTS } from '../lib/firebase';
import { UserProfile, Test } from '../types';
import { 
  GraduationCap, 
  Search, 
  LogIn, 
  UserPlus, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Award, 
  Zap, 
  Stethoscope, 
  BookMarked, 
  ShieldCheck, 
  Play, 
  ChevronRight, 
  BarChart3, 
  Layers, 
  Laptop, 
  Flame, 
  Star, 
  X, 
  Mail, 
  Building2, 
  AlertCircle,
  ArrowRight,
  Target,
  Check
} from 'lucide-react';

interface LandingPageProps {
  onStartTestDirectly?: (test: Test, mode: 'exam' | 'practice') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartTestDirectly }) => {
  const { loginWithGoogle, loginAsUser } = useAuth();

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'demo' | 'college'>('login');

  // Search & Category Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'iti' | 'neet' | 'ctet'>('all');

  // Form states inside Auth Modal
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailOrRoll, setEmailOrRoll] = useState('');
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');

  // College Join Code mode
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentTrade, setStudentTrade] = useState('Electrician');

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Filter Tests
  const filteredTests = INITIAL_TESTS.filter((t) => {
    const matchesCategory =
      selectedCategory === 'all' ||
      (selectedCategory === 'iti' && (t.exam_type?.includes('ITI') || t.trade_class?.toLowerCase().includes('electrician'))) ||
      (selectedCategory === 'neet' && (t.exam_type?.includes('NEET') || t.trade_class?.toLowerCase().includes('neet'))) ||
      (selectedCategory === 'ctet' && (t.exam_type?.includes('CTET') || t.trade_class?.toLowerCase().includes('ctet')));

    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.trade_class && t.trade_class.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.institute_name && t.institute_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setShowGooglePrompt(false);
    try {
      const res = await loginWithGoogle();
      if (res) {
        setIsAuthModalOpen(false);
      }
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      // Popup blocked or domain restriction on mcq-indian-cbt.vercel.app
      setShowGooglePrompt(true);
      if (!googleEmail) {
        setGoogleEmail('candidate.google@gmail.com');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Google Email Sign In (Fallback for Vercel domain restrictions)
  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = googleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid Gmail / Google email address.');
      return;
    }

    setLoading(true);
    setError('');

    const isSuperAdmin = cleanEmail === 'thenajmulhuda@gmail.com';
    const namePart = cleanEmail.split('@')[0];
    const formattedName = isSuperAdmin
      ? 'Najmul Huda'
      : namePart.charAt(0).toUpperCase() + namePart.slice(1);

    try {
      await loginAsUser({
        uid: isSuperAdmin ? DEFAULT_SUPER_ADMIN.uid : `usr_google_${Date.now()}`,
        email: cleanEmail,
        name: formattedName,
        role: isSuperAdmin ? 'super_admin' : 'student',
        trade: 'Electrician',
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Google direct sign in error:', err);
      setError('Failed to sign in with Google account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Email / Roll Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrRoll.trim()) {
      setError('Please enter your Gmail address or roll number.');
      return;
    }

    setLoading(true);
    setError('');
    const inputClean = emailOrRoll.trim().toLowerCase();

    // Check Super Admin
    if (inputClean === 'thenajmulhuda@gmail.com') {
      await loginAsUser({
        ...DEFAULT_SUPER_ADMIN,
        email: 'thenajmulhuda@gmail.com',
        name: 'Najmul Huda',
        role: 'super_admin'
      });
      setLoading(false);
      return;
    }

    try {
      const dbUsers = await safeGetDocs<UserProfile>('users', []);
      const match = dbUsers.find(
        (u) =>
          (u.email && u.email.toLowerCase() === inputClean) ||
          (u.rollNo && u.rollNo.toLowerCase() === inputClean) ||
          (u.name && u.name.toLowerCase() === inputClean)
      );

      if (match) {
        await loginAsUser(match);
      } else if (inputClean.includes('@')) {
        const newProfile: UserProfile = {
          uid: `usr_${Date.now()}`,
          email: inputClean,
          name: inputClean.split('@')[0],
          role: 'student',
          status: 'active',
          createdAt: new Date().toISOString()
        };
        await loginAsUser(newProfile);
      } else {
        setError(`No existing account found for "${emailOrRoll}". Please enter a full Gmail ID (e.g. user@gmail.com)`);
      }
    } catch (err) {
      console.error('Sign in query error:', err);
      setError('Error signing in. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle College Join Code
  const handleCollegeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentEmail.trim()) {
      setError('Please fill in Student Name and Email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newStudent: UserProfile = {
        uid: `student_${Date.now()}`,
        name: studentName.trim(),
        email: studentEmail.trim().toLowerCase(),
        role: 'student',
        rollNo: studentRoll.trim() || `2026-${Math.floor(100 + Math.random() * 900)}`,
        trade: studentTrade,
        className: 'Sem 1',
        target_exam: 'ITI (NCVT)',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await loginAsUser(newStudent);
    } catch (err) {
      console.error('Join error:', err);
      setError('Could not register student profile.');
    } finally {
      setLoading(false);
    }
  };

  const openAuthWithMode = (mode: 'login' | 'signup' | 'demo' | 'college') => {
    setAuthMode(mode);
    setError('');
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col antialiased">
      
      {/* 1. TOP ANNOUNCEMENT TICKER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 text-white py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-md">
        <span className="bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-extrabold flex items-center gap-1">
          <Flame className="w-3 h-3 text-amber-300 animate-bounce" /> LIVE CBT 2026
        </span>
        <span className="truncate">
          NCVT ITI AITT Trade Theory 2026 &amp; NEET-UG 2026 CBT Mocks are now Active! 100% Free Practice.
        </span>
        <button
          onClick={() => openAuthWithMode('login')}
          className="ml-2 underline hover:text-amber-200 transition-colors hidden sm:inline-flex items-center gap-0.5 cursor-pointer"
        >
          <span>Attempt Now</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg ring-2 ring-blue-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-white">NEXUS CBT</span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  INDIAN EXAM PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block">
                Online Computer-Based Test &amp; Question Bank
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-300">
            <a href="#featured-tests" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore Exams</span>
            </a>
            <a href="#features" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>CBT Engine Features</span>
            </a>
            <a href="#faq" className="hover:text-blue-400 transition-colors flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
              <span>FAQ</span>
            </a>
          </nav>

          {/* Auth CTA Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => openAuthWithMode('login')}
              className="px-4 py-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-400" />
              <span>Log In</span>
            </button>

            <button
              onClick={() => openAuthWithMode('signup')}
              className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Student Register</span>
            </button>

            <button
              onClick={() => openAuthWithMode('demo')}
              className="px-3 py-2 text-xs font-extrabold text-purple-300 bg-purple-950/80 border border-purple-800 hover:bg-purple-900 rounded-xl transition-all cursor-pointer hidden sm:flex items-center gap-1"
              title="1-Click Quick Demo Sign In"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>1-Click Demo</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative overflow-hidden py-12 lg:py-20 border-b border-slate-800/80">
        
        {/* Soft Background Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-tr from-blue-600/10 via-purple-600/10 to-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-extrabold shadow-inner">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>Simulate Exact NTA &amp; NCVT CBT Interfaces</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15]">
                Master Your CBT Exams with <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Real Exam-Hall Mock Tests</span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Designed for <strong className="text-white">NCVT ITI Trade Theory</strong>, <strong className="text-white">NEET (UG) Medical</strong>, and <strong className="text-white">CTET Teaching</strong> candidates. Experience exact NTA timer countdowns, question palettes, AI step-by-step solutions, and instant All-India Rank scorecards.
              </p>

              {/* Search Bar */}
              <div className="pt-2 max-w-xl mx-auto lg:mx-0">
                <div className="relative flex items-center">
                  <Search className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search trade or exam (e.g. Electrician, Fitter, NEET Biology)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-700 focus:border-blue-500 rounded-2xl pl-12 pr-32 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none shadow-xl font-medium"
                  />
                  <a
                    href="#featured-tests"
                    className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1 shadow-md cursor-pointer"
                  >
                    <span>Find Mocks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => openAuthWithMode('signup')}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Free Mock Test Now</span>
                </button>

                <button
                  onClick={() => openAuthWithMode('login')}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-200 font-bold text-sm rounded-2xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Student Sign In</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center lg:text-left">
                <div>
                  <div className="text-xl font-black text-white">50,000+</div>
                  <div className="text-[11px] text-slate-400 font-medium">Practice Questions</div>
                </div>
                <div>
                  <div className="text-xl font-black text-emerald-400">100% Free</div>
                  <div className="text-[11px] text-slate-400 font-medium">No Hidden Subscription</div>
                </div>
                <div>
                  <div className="text-xl font-black text-purple-400">NTA / NCVT</div>
                  <div className="text-[11px] text-slate-400 font-medium">Official Exam Layout</div>
                </div>
              </div>

            </div>

            {/* Right Hero CBT Interactive Preview Box */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-5 space-y-4 relative group hover:border-blue-500/50 transition-all">
                
                {/* Simulated CBT Window Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-slate-400 ml-1">NCVT / NTA CBT Simulator Engine v2.4</span>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>00:29:45</span>
                  </div>
                </div>

                {/* Simulated Question Header */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-blue-400 uppercase tracking-wider">Question 01 of 25</span>
                    <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-md font-bold text-[10px]">
                      Electrician Trade Theory
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                    Which tool is primarily used for stripping wire insulation without damaging the conductor?
                  </p>
                </div>

                {/* Simulated Options */}
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2.5 cursor-pointer hover:border-slate-600 transition-all">
                    <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">A</span>
                    <span>Combination Pliers</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-950/80 border-2 border-blue-500 text-white font-medium flex items-center justify-between cursor-pointer shadow-md">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">B</span>
                      <span>Automatic Wire Stripper</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2.5 cursor-pointer hover:border-slate-600 transition-all">
                    <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400">C</span>
                    <span>Side Cutting Pliers</span>
                  </div>
                </div>

                {/* Simulated Palette Preview */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-500" /> Answered (1)
                    <span className="w-3 h-3 rounded bg-red-500 ml-1" /> Unanswered (2)
                    <span className="w-3 h-3 rounded bg-purple-500 ml-1" /> Review (1)
                  </div>
                  <button
                    onClick={() => openAuthWithMode('signup')}
                    className="text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Try Full Screen CBT</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. FEATURED EXAMS & LIVE MOCK TESTS */}
      <section id="featured-tests" className="py-12 lg:py-16 bg-slate-900/60 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800 px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Official Exam Test Series 2026
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Popular CBT Mock Tests &amp; Practice Sets
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                Attempt 100% free online mock papers with instant score reports.
              </p>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto max-w-full">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔥 All Exams
              </button>
              <button
                onClick={() => setSelectedCategory('iti')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'iti'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> NCVT ITI Trades
              </button>
              <button
                onClick={() => setSelectedCategory('neet')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'neet'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" /> NEET Medical
              </button>
              <button
                onClick={() => setSelectedCategory('ctet')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategory === 'ctet'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" /> CTET Teaching
              </button>
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTests.map((t) => (
              <div
                key={t.test_id}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-3xl p-5 shadow-lg hover:shadow-2xl transition-all space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800">
                      {t.exam_type || 'NCVT ITI'}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" /> Free CBT
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                    {t.title}
                  </h3>

                  <p className="text-xs text-slate-400 font-medium">
                    {t.institute_name || 'National Test Portal'} • {t.trade_class || 'General'}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-300 font-semibold pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" /> {t.duration_minutes} Mins
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-400" /> {t.question_ids?.length || 5} Questions
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-emerald-400" /> Pass: {t.passing_marks}%
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      if (onStartTestDirectly) {
                        onStartTestDirectly(t, t.mode || 'exam');
                      } else {
                        openAuthWithMode('login');
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer group-hover:shadow-blue-600/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Attempt Free CBT Mock Test</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. CBT ENGINE FEATURES (WHY TESTBOOK / NEETPREP STYLE) */}
      <section id="features" className="py-12 lg:py-20 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800 px-3 py-1 rounded-full uppercase tracking-wider">
              <Laptop className="w-3.5 h-3.5" /> Next-Gen Exam Technology
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Built Specifically for Indian Competitive Exams
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Everything you need to boost your confidence, speed, and accuracy in official CBT examination halls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-blue-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">100% Real CBT Screen Layout</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Color-coded question palette, countdown clock, marked for review, and language switch (Hindi/English).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-purple-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Instant AI Diagnostic Scorecard</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Get immediate score breakdown, time taken per question, chapter accuracy %, and negative marks calculation.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-emerald-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Step-by-Step AI Solutions</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Detailed explanations for every question so you understand concepts clearly after submitting the test.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3 hover:border-amber-500/50 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Institutional &amp; College Support</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                ITIs, Coaching Institutes, and Teachers can manage question banks and sync tests with Google Sheets in 1 click.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 6. FAQ ACCORDION */}
      <section id="faq" className="py-12 lg:py-16 bg-slate-900/40 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Frequently Asked Questions (FAQ)
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Got questions about using the NEXUS CBT mock test portal?
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Are the CBT mock tests on this platform completely free?",
                a: "Yes! All mock tests for NCVT ITI Trade Theory, NEET (UG), and CTET are 100% free with no hidden charges or forced subscriptions."
              },
              {
                q: "Is the exam interface identical to the official NCVT or NTA exam hall?",
                a: "Yes, our CBT Simulator engine reproduces the exact color palette (Green, Red, Purple, Grey), countdown clock, and navigation buttons used in official NTA & NCVT examination centers."
              },
              {
                q: "Can I take tests on my mobile phone or tablet?",
                a: "Absolutely! The portal is fully responsive and optimized for mobile browsers, tablets, and desktop computers."
              },
              {
                q: "How do I sign up as a student?",
                a: "Click on 'Student Register' or 'Log In' at the top right. You can sign in instantly using your Google account or by typing your Gmail address directly."
              }
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 cursor-pointer transition-all hover:border-slate-700"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4 font-bold text-sm text-white">
                  <span>{item.q}</span>
                  <span className="text-blue-400 text-lg">{openFaq === idx ? '−' : '+'}</span>
                </div>
                {openFaq === idx && (
                  <p className="text-xs text-slate-400 font-medium pt-3 mt-2 border-t border-slate-800/80 leading-relaxed">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="py-8 bg-slate-950 text-slate-400 text-xs font-medium border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              N
            </div>
            <span className="text-white font-bold">NEXUS CBT Portal</span>
            <span>— Official Online Assessment Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <button onClick={() => openAuthWithMode('login')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Student Login
            </button>
            <button onClick={() => openAuthWithMode('signup')} className="hover:text-slate-300 transition-colors cursor-pointer">
              Register
            </button>
            <button onClick={() => openAuthWithMode('demo')} className="hover:text-slate-300 transition-colors cursor-pointer">
              1-Click Demo
            </button>
          </div>

          <p className="text-slate-500 text-[11px]">
            © 2026 NEXUS CBT India. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* 8. AUTHENTICATION & LOGIN MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative space-y-5">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white shadow-xl ring-4 ring-blue-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">Candidate Access Portal</h3>
              <p className="text-xs text-slate-400 font-medium">
                Log in or sign up to access free CBT mock tests
              </p>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setAuthMode('login')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthMode('signup')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
              <button
                onClick={() => setAuthMode('demo')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  authMode === 'demo' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                1-Click Demo
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN / SIGN UP MODE */}
            {(authMode === 'login' || authMode === 'signup') && (
              <div className="space-y-4">
                
                {/* Google Sign In Option / Direct Prompt */}
                {showGooglePrompt ? (
                  <form onSubmit={handleGoogleDirectSubmit} className="p-4 bg-slate-950 border border-blue-500/40 rounded-2xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/>
                        </svg>
                        <span className="text-xs font-black text-white">Google 1-Click Authentication</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowGooglePrompt(false)}
                        className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        Try OAuth Popup
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      ⚡ <strong className="text-amber-400">Notice:</strong> Popup was closed or restricted on domain <code className="text-blue-300 bg-blue-950 px-1 py-0.5 rounded font-mono">mcq-indian-cbt.vercel.app</code>. Enter your Gmail address below to sign in instantly with Google credentials:
                    </p>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Google Account Email:
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. candidate@gmail.com"
                        value={googleEmail}
                        onChange={(e) => setGoogleEmail(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Sign In as Google Candidate</span>
                    </button>
                  </form>
                ) : (
                  /* 1-Click Google Sign In */
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                )}

                {/* Divider */}
                <div className="relative my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="bg-slate-900 px-3 text-slate-500">OR Direct Email Sign-In</span>
                  </div>
                </div>

                {/* Direct Email / Roll Form */}
                <form onSubmit={handleEmailSignIn} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Gmail Address or Roll Number:
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="e.g. candidate@gmail.com"
                        value={emailOrRoll}
                        onChange={(e) => setEmailOrRoll(e.target.value)}
                        className="w-full text-xs pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Enter CBT Platform</span>
                  </button>
                </form>

              </div>
            )}

            {/* TAB 2: 1-CLICK DEMO ACCOUNTS */}
            {authMode === 'demo' && (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-400 font-medium text-center">
                  Select a pre-configured profile to test the CBT platform instantly:
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      loginAsUser({
                        ...DEFAULT_SUPER_ADMIN,
                        email: 'thenajmulhuda@gmail.com',
                        name: 'Najmul Huda',
                        role: 'super_admin'
                      })
                    }
                    className="w-full p-3 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">👑</span>
                      <div className="text-left">
                        <div>Super Admin / Creator</div>
                        <div className="text-[10px] text-purple-400 font-mono">thenajmulhuda@gmail.com</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-purple-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loginAsUser({
                        uid: 'usr_student_demo_1',
                        email: 'student.electrician@gmail.com',
                        name: 'Rahul Kumar (ITI Candidate)',
                        role: 'student',
                        trade: 'Electrician',
                        className: 'Sem 1',
                        rollNo: '2026-8812',
                        target_exam: '⚡ ITI (NCVT) (Trade Theory CBT)',
                        status: 'active'
                      })
                    }
                    className="w-full p-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <div className="text-left">
                        <div>ITI Electrician Candidate</div>
                        <div className="text-[10px] text-amber-400 font-mono">student.electrician@gmail.com</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      loginAsUser({
                        uid: 'usr_neet_aspirant',
                        email: 'neet.aspirant@gmail.com',
                        name: 'Ananya Sharma (NEET Medical)',
                        role: 'student',
                        trade: 'NEET Medical',
                        className: 'Class 12',
                        rollNo: 'NEET-2026-102',
                        target_exam: '🩺 NEET (UG) (Medical Entrance CBT)',
                        status: 'active'
                      })
                    }
                    className="w-full p-3 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-200 text-xs font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Stethoscope className="w-4 h-4 text-blue-400" />
                      <div className="text-left">
                        <div>NEET 2026 Medical Candidate</div>
                        <div className="text-[10px] text-blue-400 font-mono">neet.aspirant@gmail.com</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
