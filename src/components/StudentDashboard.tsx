import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_TESTS, safeGetDocs } from '../lib/firebase';
import { Test, TestAttempt, TestFolder } from '../types';
import { GoalSelectionModal } from './GoalSelectionModal';
import { DetailedTestAnalysisModal } from './DetailedTestAnalysisModal';
import { 
  Play, 
  Award, 
  Clock, 
  BookOpen, 
  Sparkles,
  Stethoscope,
  Zap,
  BookMarked,
  SlidersHorizontal,
  CheckCircle2,
  Lock,
  Gift,
  FolderCheck,
  BarChart2,
  FileSpreadsheet
} from 'lucide-react';

interface StudentDashboardProps {
  onStartTest: (test: Test, mode: 'exam' | 'practice') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onStartTest }) => {
  const { profile } = useAuth();

  const [tests, setTests] = useState<Test[]>([]);
  const [testFolders, setTestFolders] = useState<TestFolder[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [activeGoalFilter, setActiveGoalFilter] = useState<string>(
    profile?.target_exam || 'ITI (NCVT)'
  );

  // Detailed Analysis Modal State
  const [selectedAttemptForAnalysis, setSelectedAttemptForAnalysis] = useState<TestAttempt | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedTests = await safeGetDocs<Test>('tests', INITIAL_TESTS);
      setTests(fetchedTests);

      const fetchedFolders = await safeGetDocs<TestFolder>('test_folders', []);
      setTestFolders(fetchedFolders);

      const allAttempts = await safeGetDocs<TestAttempt>('test_attempts', []);
      const myAttempts = allAttempts.filter(
        (a) => a.student_email === profile?.email || a.roll_no === profile?.rollNo || a.student_name === profile?.name
      );
      setAttempts(myAttempts);
    } catch (err) {
      console.warn('Student fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (profile && !profile.target_exam) {
      setIsGoalModalOpen(true);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.target_exam) {
      setActiveGoalFilter(profile.target_exam);
    }
  }, [profile?.target_exam]);

  // Determine if student has explicit folder/test assignments
  const studentAssignedFolderIds = profile?.assigned_folders || [];
  const studentAssignedTestIds = profile?.assigned_tests || [];

  // Filter tests matching active goal OR assigned explicitly to student
  const matchingTests = tests.filter((t) => {
    // 1. Explicit test assignment
    if (studentAssignedTestIds.includes(t.test_id)) return true;

    // 2. Belong to assigned folder
    if (t.folder_id && studentAssignedFolderIds.includes(t.folder_id)) return true;

    // 3. Goal filter match
    if (!activeGoalFilter || activeGoalFilter === 'ALL') return true;
    if (t.exam_type) {
      return t.exam_type.toLowerCase().includes(activeGoalFilter.toLowerCase()) ||
             activeGoalFilter.toLowerCase().includes(t.exam_type.toLowerCase());
    }
    // Fallback match for legacy ITI tests
    if (activeGoalFilter.includes('ITI') && (t.trade_class || t.title.toLowerCase().includes('electrician'))) {
      return true;
    }
    return true;
  });

  const handleOpenAnalysis = (attempt: TestAttempt) => {
    setSelectedAttemptForAnalysis(attempt);
    setIsAnalysisModalOpen(true);
  };

  const getExamIcon = (goalStr?: string) => {
    if (!goalStr) return Zap;
    if (goalStr.includes('NEET')) return Stethoscope;
    if (goalStr.includes('CTET')) return BookMarked;
    return Zap;
  };

  const GoalIcon = getExamIcon(activeGoalFilter);

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      
      {/* Goal Selection Modal */}
      <GoalSelectionModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onGoalSaved={(newGoal) => setActiveGoalFilter(newGoal)}
      />

      {/* Detailed Scorecard / Analysis Modal */}
      <DetailedTestAnalysisModal
        isOpen={isAnalysisModalOpen}
        attempt={selectedAttemptForAnalysis}
        test={tests.find((t) => t.test_id === selectedAttemptForAnalysis?.test_id)}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          setSelectedAttemptForAnalysis(null);
        }}
      />

      {/* Welcome Banner with Active Goal Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5">
                <GoalIcon className="w-3.5 h-3.5 text-blue-400" />
                Target Exam: {activeGoalFilter}
              </span>

              {studentAssignedFolderIds.length > 0 && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                  {studentAssignedFolderIds.length} Assigned Folders
                </span>
              )}

              {profile?.is_limited_version && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1">
                  <Gift className="w-3 h-3 text-amber-400" />
                  Free Limited Version
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {profile?.name || 'Student'} 👋
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm">
              Preparing for <strong className="text-white font-bold">{activeGoalFilter}</strong> CBT Online Mock Examinations.
            </p>

            <div className="pt-2">
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="px-3.5 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 hover:text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Switch Exam Goal (NEET / ITI / CTET)</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-bold text-slate-400">Completed Tests</div>
              <div className="text-3xl font-black text-white mt-0.5">{attempts.length}</div>
            </div>

            <div className="bg-emerald-950/60 p-4 rounded-2xl border border-emerald-800/80 text-center min-w-[130px]">
              <div className="text-[10px] uppercase font-bold text-emerald-400">Assigned CBT Tests</div>
              <div className="text-2xl font-black text-emerald-300 mt-0.5">
                {matchingTests.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Goal Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {[
            { id: 'NEET', label: '🩺 NEET (UG)', icon: Stethoscope },
            { id: 'ITI (NCVT)', label: '⚡ ITI (NCVT)', icon: Zap },
            { id: 'CTET', label: '📚 CTET Exam', icon: BookMarked },
            { id: 'ALL', label: '🌐 All Tests', icon: BookOpen }
          ].map((tab) => {
            const isAct = activeGoalFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveGoalFilter(tab.id)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isAct 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <span className="text-xs font-bold text-slate-500">
          Showing {matchingTests.length} Available Tests
        </span>
      </div>

      {/* Available Tests List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span>My Assigned Active CBT Mock Examinations ({matchingTests.length})</span>
        </h2>

        {matchingTests.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No active tests published yet for {activeGoalFilter}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your instructor will assign new tests to your account shortly. You can click another exam tab above to try general practice tests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchingTests.map((t) => {
              const isExplicitlyAssigned = studentAssignedTestIds.includes(t.test_id) || (t.folder_id && studentAssignedFolderIds.includes(t.folder_id));

              return (
                <div 
                  key={t.test_id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          t.mode === 'exam' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}>
                          {t.mode === 'exam' ? '🔒 CBT Mock Exam' : '💡 Practice Session'}
                        </span>

                        {isExplicitlyAssigned && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300">
                            ★ Assigned To You
                          </span>
                        )}

                        {t.exam_type && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                            {t.exam_type}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-bold flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5" /> {t.duration_minutes} min
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{t.title}</h3>
                    <p className="text-xs text-slate-500">
                      {t.institute_name || 'Free Assessment Portal'} • {t.question_ids ? t.question_ids.length : (t.questions?.length || 0)} Questions • Passing: {t.passing_marks}%
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onStartTest(t, 'practice')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Practice Mode</span>
                    </button>

                    <button
                      onClick={() => onStartTest(t, 'exam')}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Give Test</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Attempts */}
      {attempts.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              <span>My Test Attempt History &amp; Detailed Analysis ({attempts.length})</span>
            </h2>
            <span className="text-xs text-slate-400">
              Click "Detailed Analysis" on any test to review step-by-step solutions
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Test Name</th>
                    <th className="p-3.5">Score</th>
                    <th className="p-3.5">Percentage</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Detailed Analysis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attempts.map((a) => (
                    <tr key={a.attempt_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.test_title}</td>
                      <td className="p-3.5 font-medium">{a.score} / {a.total_marks}</td>
                      <td className="p-3.5 font-black text-blue-600">{a.percentage.toFixed(1)}%</td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          a.status === 'PASS' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                        }`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{a.submitted_at}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenAnalysis(a)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs cursor-pointer inline-flex items-center gap-1 shadow-sm transition-all"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          <span>Detailed Analysis</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

