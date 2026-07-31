import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeGetDocs, DEFAULT_SUPER_ADMIN } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  GraduationCap, 
  Mail, 
  LogIn, 
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Zap,
  BookMarked,
  Sparkles
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, loginAsUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Optional Advanced Staff Login Toggle
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [emailOrRoll, setEmailOrRoll] = useState('');

  // Expandable Join Code mode
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentTrade, setStudentTrade] = useState('Electrician');

  // Handle Primary Google Sign In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        setError(
          '🌐 Google Auth popup domain restriction detected on this external URL. No problem! Enter your Gmail ID below to sign in directly with 1 click.'
        );
      } else if (errCode === 'auth/popup-blocked' || errCode === 'auth/popup-closed-by-user') {
        setError('⚡ Google popup was closed or blocked by browser. Simply type your Gmail address below to sign in directly!');
      } else {
        setError('💡 Popup login was restricted on this domain/iframe. Type your Gmail address below to sign in instantly!');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Gmail / Roll No / Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrRoll.trim()) {
      setError('Please enter your Gmail address or roll number.');
      return;
    }

    setLoading(true);
    setError('');
    const inputClean = emailOrRoll.trim().toLowerCase();

    // Check if Super Admin email
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
        // Register/Login new Gmail candidate if not pre-registered
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
        setError(
          `No existing account found for "${emailOrRoll}". Please enter a full Gmail ID (e.g. user@gmail.com) to sign in directly.`
        );
      }
    } catch (err) {
      console.error('Sign in query error:', err);
      setError('Error signing in. Please check network connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle College Join Code Registration
  const handleCollegeJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !studentName.trim() || !studentEmail.trim()) {
      setError('Please fill in College Join Code, Full Name, and Email.');
      return;
    }

    setLoading(true);
    setError('');

    try {

      const newUid = `student_${Date.now()}`;
      const newStudent: UserProfile = {
        uid: newUid,
        name: studentName.trim(),
        email: studentEmail.trim().toLowerCase(),
        role: 'student',
        rollNo: studentRoll.trim() || `2026-${Math.floor(100 + Math.random() * 900)}`,
        trade: studentTrade,
        className: 'Sem 1',
        target_exam: 'ITI (NCVT)',
        is_limited_version: false,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await loginAsUser(newStudent);
    } catch (err) {
      console.error('Join error:', err);
      setError('Could not join college. Please verify the join code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl ring-4 ring-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">CBT Mock Test Portal</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Online Computer Based Examination Platform
            </p>
          </div>

          {/* Exam Badges */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-blue-400" /> NEET
            </span>
            <span className="px-2.5 py-1 bg-amber-950 border border-amber-800 text-amber-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> ITI (NCVT)
            </span>
            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg text-[10px] font-extrabold flex items-center gap-1">
              <BookMarked className="w-3 h-3 text-emerald-400" /> CTET
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Primary Call to Action: Clean Google Sign-In */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-sm rounded-2xl transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <span>Sign in with Google Popup</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500">OR Direct Gmail Sign-In</span>
            </div>
          </div>

          {/* Direct Email Form */}
          <form onSubmit={handleEmailSignIn} className="space-y-2.5">
            <div>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Enter your Gmail ID or Roll No"
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
              <span>Sign In Directly</span>
            </button>
          </form>

          {/* Quick One-Click Demo / Admin Access for Vercel */}
          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
              ⚡ Quick Instant Login (For Testing / Vercel Deploy):
            </div>
            <div className="grid grid-cols-2 gap-1.5">
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
                className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-200 text-[11px] font-bold rounded-xl text-center transition-all cursor-pointer"
              >
                👑 Super Admin
              </button>
              <button
                type="button"
                onClick={() =>
                  loginAsUser({
                    uid: 'usr_principal_demo',
                    email: 'principal@iti.edu',
                    name: 'Dr. Ramesh Sharma',
                    role: 'principal',
                    tenant_id: 'tenant_govt_iti',
                    tenant_name: 'Government ITI Central',
                    status: 'active'
                  })
                }
                className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-[11px] font-bold rounded-xl text-center transition-all cursor-pointer"
              >
                🏫 Principal
              </button>
              <button
                type="button"
                onClick={() =>
                  loginAsUser({
                    uid: 'usr_teacher_demo',
                    email: 'teacher@iti.edu',
                    name: 'Prof. Anita Verma',
                    role: 'teacher',
                    tenant_id: 'tenant_govt_iti',
                    tenant_name: 'Government ITI Central',
                    status: 'active'
                  })
                }
                className="px-2.5 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-200 text-[11px] font-bold rounded-xl text-center transition-all cursor-pointer"
              >
                👨‍🏫 Teacher
              </button>
              <button
                type="button"
                onClick={() =>
                  loginAsUser({
                    uid: 'usr_student_demo',
                    email: 'student@iti.edu',
                    name: 'Rahul Kumar',
                    role: 'student',
                    tenant_id: 'tenant_govt_iti',
                    tenant_name: 'Government ITI Central',
                    rollNo: '2026001',
                    trade: 'Electrician',
                    className: 'Sem 1',
                    status: 'active'
                  })
                }
                className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-[11px] font-bold rounded-xl text-center transition-all cursor-pointer"
              >
                🎓 Student
              </button>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-400 leading-relaxed px-2">
            ✨ Logging in via Gmail grants instant access to your account & practice tests.
          </p>
        </div>

        {/* Collapsible Secondary Section for College Join Code */}
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <button
            type="button"
            onClick={() => setShowJoinCode(!showJoinCode)}
            className="w-full text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center justify-between py-1 cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Have a College Join Code (e.g. GITI-DEL)?</span>
            </span>
            <ChevronRight className={`w-4 h-4 transition-transform ${showJoinCode ? 'rotate-90' : ''}`} />
          </button>

          {showJoinCode && (
            <form onSubmit={handleCollegeJoin} className="space-y-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 animate-fade-in">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  College Join Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GITI-DEL"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono uppercase font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none"
                />
                <input
                  type="email"
                  required
                  placeholder="Gmail ID"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Join College</span>
              </button>
            </form>
          )}
        </div>

        {/* SuperAdmin Footer note */}
        <div className="text-center text-[10px] text-slate-500 pt-1 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-slate-400" />
          <span>Super Admin: <strong className="text-slate-300">thenajmulhuda@gmail.com</strong></span>
        </div>

      </div>
    </div>
  );
};
