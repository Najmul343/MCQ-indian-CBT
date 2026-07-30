import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeSetDoc } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  Stethoscope, 
  Zap, 
  BookMarked, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface GoalSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalSaved?: (selectedGoal: string) => void;
}

export const GoalSelectionModal: React.FC<GoalSelectionModalProps> = ({
  isOpen,
  onClose,
  onGoalSaved
}) => {
  const { profile, loginAsUser } = useAuth();
  const [selectedGoal, setSelectedGoal] = useState<'NEET' | 'ITI (NCVT)' | 'CTET'>(
    (profile?.target_exam as any) || 'ITI (NCVT)'
  );
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen || !profile) return null;

  const goals = [
    {
      id: 'NEET' as const,
      title: 'NEET (UG) Medical',
      subtitle: 'National Eligibility cum Entrance Test',
      icon: Stethoscope,
      color: 'from-blue-600 to-cyan-500',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
      activeRing: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30 dark:bg-blue-950/40',
      description: 'Physics, Chemistry, Botany & Zoology CBT Mock Tests formatted to NTA NTA NEET standards.'
    },
    {
      id: 'ITI (NCVT)' as const,
      title: 'ITI (NCVT) Trades',
      subtitle: 'National Council for Vocational Training',
      icon: Zap,
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
      activeRing: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/30 dark:bg-amber-950/40',
      description: 'Electrician, Fitter, COPA, Welder Trade Theory & Employability Skills CBT Mocks.'
    },
    {
      id: 'CTET' as const,
      title: 'CTET Teaching Exam',
      subtitle: 'Central Teacher Eligibility Test (Paper I & II)',
      icon: BookMarked,
      color: 'from-emerald-600 to-teal-500',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
      activeRing: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/40',
      description: 'Child Development & Pedagogy, EVS, Mathematics & Language Pedagogy Practice.'
    }
  ];

  const handleSaveGoal = async () => {
    setLoading(true);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        target_exam: selectedGoal,
        is_limited_version: profile.is_limited_version ?? true
      };

      await safeSetDoc('users', profile.uid, 'uid', updatedProfile);
      await loginAsUser(updatedProfile);

      if (onGoalSaved) {
        onGoalSaved(selectedGoal);
      }
      onClose();
    } catch (e) {
      console.error('Save goal error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-amber-500 to-emerald-500" />

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Select Your CBT Preparation Goal</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Which exam are you preparing for?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Choose your target stream below. You will get instant access to free CBT mock tests &amp; practice papers for your chosen exam.
          </p>
        </div>

        {/* Goal Cards Grid */}
        <div className="space-y-3">
          {goals.map((g) => {
            const isSelected = selectedGoal === g.id;
            const IconComp = g.icon;

            return (
              <div
                key={g.id}
                onClick={() => setSelectedGoal(g.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                  isSelected 
                    ? g.activeRing 
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50'
                }`}
              >
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${g.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                  <IconComp className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {g.title}
                    </h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 fill-current" />
                        <span>Selected</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {g.subtitle}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 pt-0.5 leading-relaxed">
                    {g.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Free Limited Version Banner */}
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="leading-tight">
            Independent Gmail sign-ups are registered under the <strong>Free Limited Version</strong> with access to free mock tests.
          </span>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleSaveGoal}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Saving Preference...</span>
            ) : (
              <>
                <span>Access Free {selectedGoal} Tests</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
