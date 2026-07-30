import React, { useState } from 'react';
import { TestAttempt, Test, Question } from '../types';
import { 
  X, 
  Award, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Printer, 
  ShieldAlert, 
  FileText, 
  BarChart3, 
  Sparkles,
  BookOpen,
  ChevronRight,
  Globe
} from 'lucide-react';

interface DetailedTestAnalysisModalProps {
  isOpen: boolean;
  attempt: TestAttempt | null;
  test?: Test | null;
  questions?: Question[];
  onClose: () => void;
}

export const DetailedTestAnalysisModal: React.FC<DetailedTestAnalysisModalProps> = ({
  isOpen,
  attempt,
  test,
  questions = [],
  onClose
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect' | 'unattempted'>('all');
  const [showBilingual, setShowBilingual] = useState<boolean>(true);

  if (!isOpen || !attempt) return null;

  // Resolve questions array
  const allQuestions = (test?.questions && test.questions.length > 0) 
    ? test.questions 
    : questions;

  const totalQuestions = allQuestions.length > 0 ? allQuestions.length : Object.keys(attempt.responses || {}).length;

  let correctCount = 0;
  let incorrectCount = 0;
  let unattemptedCount = 0;

  allQuestions.forEach((q) => {
    const userAns = attempt.responses?.[q.question_id];
    if (!userAns) {
      unattemptedCount++;
    } else if (userAns === q.correct_option) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  const accuracyPct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Format time taken
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}m ${s}s`;
  };

  // Filtered Questions for Review
  const filteredQuestions = allQuestions.filter((q) => {
    const userAns = attempt.responses?.[q.question_id];
    if (filterMode === 'correct') return userAns === q.correct_option;
    if (filterMode === 'incorrect') return userAns && userAns !== q.correct_option;
    if (filterMode === 'unattempted') return !userAns;
    return true;
  });

  // Subject Performance Breakdown
  const subjectStats: Record<string, { total: number; correct: number }> = {};
  allQuestions.forEach((q) => {
    const subj = q.subject || q.exam_type || 'General';
    if (!subjectStats[subj]) {
      subjectStats[subj] = { total: 0, correct: 0 };
    }
    subjectStats[subj].total++;
    if (attempt.responses?.[q.question_id] === q.correct_option) {
      subjectStats[subj].correct++;
    }
  });

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[700] flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
              <Award className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase bg-blue-500/30 text-blue-300 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                  CBT Scorecard &amp; Detailed Analysis
                </span>
                <span className="text-xs text-slate-300">{attempt.submitted_at}</span>
              </div>
              <h2 className="text-xl font-black text-white mt-0.5">{attempt.test_title}</h2>
              <p className="text-xs text-slate-300">
                Candidate: <strong className="text-white">{attempt.student_name}</strong> • Roll No: <span className="font-mono">{attempt.roll_no}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Print Official Scorecard"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Scorecard</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto text-xs">
          
          {/* Main Score Metrics Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
            
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Score</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {attempt.score} <span className="text-xs text-slate-400 font-normal">/ {attempt.total_marks}</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Percentage</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {attempt.percentage.toFixed(1)}%
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">CBT Result</div>
              <div>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase inline-block ${
                  attempt.status === 'PASS' 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300'
                }`}>
                  {attempt.status}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Accuracy Rate</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {accuracyPct}%
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Time Taken</div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 mt-1">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{formatTime(attempt.time_taken_seconds || 0)}</span>
              </div>
            </div>

          </div>

          {/* Violations Warning if any */}
          {((attempt.fs_violations && attempt.fs_violations > 0) || (attempt.tab_switches && attempt.tab_switches > 0)) && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Invigilation Log: <strong>{attempt.fs_violations || 0}</strong> Fullscreen Exits • <strong>{attempt.tab_switches || 0}</strong> Tab Switches Recorded</span>
              </div>
            </div>
          )}

          {/* Subject Performance Breakdown */}
          {Object.keys(subjectStats).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>Subject &amp; Topic Wise Performance</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(subjectStats).map(([subjName, stat]) => {
                  const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                  return (
                    <div key={subjName} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900 dark:text-white">{subjName}</span>
                        <span className="text-blue-600 dark:text-blue-400 font-extrabold">{stat.correct} / {stat.total} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question-by-Question Review Section Header */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Question-by-Question Detailed Review</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Review options, your answers, correct answers, and full step-by-step solutions
                </p>
              </div>

              {/* Filters & Bilingual Toggle */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowBilingual(!showBilingual)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    showBilingual 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  <span>Bilingual (Hindi/English)</span>
                </button>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {[
                    { id: 'all', label: `All (${allQuestions.length})` },
                    { id: 'correct', label: `Correct (${correctCount})` },
                    { id: 'incorrect', label: `Incorrect (${incorrectCount})` },
                    { id: 'unattempted', label: `Skipped (${unattemptedCount})` }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterMode(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        filterMode === f.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Questions List */}
            {filteredQuestions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                No questions match the filter "{filterMode}".
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((q, idx) => {
                  const userAns = attempt.responses?.[q.question_id];
                  const isCorrect = userAns === q.correct_option;
                  const isUnattempted = !userAns;

                  return (
                    <div 
                      key={q.question_id || idx}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isCorrect 
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' 
                          : isUnattempted
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                          : 'bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                      }`}
                    >
                      {/* Top Question Tag Bar */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                            Question #{idx + 1}
                          </span>
                          <span className="text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full text-slate-700 dark:text-slate-300">
                            {q.subject || q.exam_type || 'General'}
                          </span>
                        </div>

                        <div>
                          {isCorrect && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Correct (+{q.points || 1} Marks)
                            </span>
                          )}
                          {!isCorrect && !isUnattempted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-500" /> Incorrect ({q.negative_marks ? `-${q.negative_marks}` : '0'} Marks)
                            </span>
                          )}
                          {isUnattempted && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                              <HelpCircle className="w-3 h-3 text-slate-500" /> Unattempted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
                          {q.question_text}
                        </p>
                        {showBilingual && q.question_tr && (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
                            {q.question_tr}
                          </p>
                        )}
                      </div>

                      {/* Diagram if available */}
                      {q.image_url && (
                        <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 max-w-xs">
                          <img src={q.image_url} alt="Question diagram" className="max-h-40 rounded-lg object-contain mx-auto" />
                        </div>
                      )}

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                          const optionText = q.options?.[optKey] || '';
                          const optionTrText = q.options_tr?.[optKey];
                          const isSelectedByUser = userAns === optKey;
                          const isCorrectOpt = q.correct_option === optKey;

                          let optionStyle = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          if (isCorrectOpt) {
                            optionStyle = 'bg-emerald-100/90 dark:bg-emerald-950 border-emerald-400 text-emerald-950 dark:text-emerald-100 font-bold ring-1 ring-emerald-500';
                          } else if (isSelectedByUser && !isCorrectOpt) {
                            optionStyle = 'bg-red-100/90 dark:bg-red-950 border-red-400 text-red-950 dark:text-red-100 font-bold';
                          }

                          return (
                            <div 
                              key={optKey}
                              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optionStyle}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                  isCorrectOpt ? 'bg-emerald-600 text-white' : isSelectedByUser ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {optKey}
                                </span>
                                <div className="truncate">
                                  <div>{optionText}</div>
                                  {showBilingual && optionTrText && (
                                    <div className="text-[10px] opacity-80">{optionTrText}</div>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 text-[10px] font-bold">
                                {isCorrectOpt && <span className="text-emerald-600 dark:text-emerald-400">✓ Correct Answer</span>}
                                {isSelectedByUser && !isCorrectOpt && <span className="text-red-600 dark:text-red-400">✕ Your Choice</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Box */}
                      {(q.explanation || q.explanation_tr) && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-1 text-[11px] text-blue-950 dark:text-blue-200">
                          <div className="font-bold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                            <span>Detailed Explanation &amp; Solution:</span>
                          </div>
                          {q.explanation && <p className="leading-relaxed">{q.explanation}</p>}
                          {showBilingual && q.explanation_tr && (
                            <p className="leading-relaxed text-indigo-700 dark:text-indigo-300">{q.explanation_tr}</p>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            CBT Mock Test Assessment System • Multi-Tenant Platform
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Close Scorecard
          </button>
        </div>

      </div>
    </div>
  );
};
