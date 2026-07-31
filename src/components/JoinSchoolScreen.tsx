import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  GraduationCap, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  LogOut, 
  ShieldCheck,
  BookOpen
} from 'lucide-react';

export const JoinSchoolScreen: React.FC = () => {
  const { profile, redeemSchoolJoinCode, setIndividualCandidateMode, logout } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter a valid join code.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await redeemSchoolJoinCode(joinCode);
      if (res.success) {
        setSuccessMsg(res.message);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to redeem join code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsIndividual = async () => {
    setLoading(true);
    setError('');
    try {
      await setIndividualCandidateMode();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize individual mode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 space-y-6 animate-fade-in">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-xl ring-4 ring-blue-500/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Welcome to CBT Mock Test Portal</h1>
          <p className="text-xs text-slate-400 font-medium">
            Signed in as <strong className="text-blue-300 font-semibold">{profile?.email || 'User'}</strong>
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-3.5 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-2xl flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-2xl flex items-start gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Main Options Grid */}
        <div className="space-y-4">
          
          {/* Option 1: School Join Code */}
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-950/80 border border-amber-800 flex items-center justify-center text-amber-400 shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Join ITI / College / School</h2>
                <p className="text-[11px] text-slate-400">Enter the join code provided by your principal or instructor</p>
              </div>
            </div>

            <form onSubmit={handleRedeem} className="space-y-2.5 pt-1">
              <div>
                <input
                  type="text"
                  placeholder="Enter Join Code (e.g. GITI-DEL, GITI-2026)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono uppercase font-bold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !joinCode.trim()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Redeem Join Code & Link Institution</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
              <span className="bg-slate-900 px-3 text-slate-500">OR</span>
            </div>
          </div>

          {/* Option 2: Continue as Individual Candidate */}
          <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white">Individual Candidate (B2C Self-Study)</h2>
                <p className="text-[11px] text-slate-400">Practicing for NEET, CTET, or ITI exams independently</p>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Gain immediate access to all public mock tests, chapter practice modules, and instant AI analytics without joining a specific institution.
            </p>

            <button
              type="button"
              onClick={handleContinueAsIndividual}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Continue as Individual Candidate</span>
            </button>
          </div>

        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure Role-Based Access Control</span>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1 text-slate-400 hover:text-red-400 font-semibold cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
};
