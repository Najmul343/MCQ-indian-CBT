import React, { useState, useEffect } from 'react';
import { Test, Question, TestAttempt } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, safeSetDoc, resolveQuestionsForTest } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Printer, 
  AlertTriangle,
  Lock,
  Maximize2,
  HelpCircle
} from 'lucide-react';

interface ExamScreenProps {
  test: Test;
  onClose: () => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({ test, onClose }) => {
  const { profile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>(test.questions || []);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(!test.questions || test.questions.length === 0);

  useEffect(() => {
    let isMounted = true;
    if (!test.questions || test.questions.length === 0) {
      resolveQuestionsForTest(test).then((qs) => {
        if (isMounted) {
          setQuestions(qs);
          setLoadingQuestions(false);
        }
      });
    }
    return () => { isMounted = false; };
  }, [test]);

  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [currentQ, setCurrentQ] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({ 0: true });
  const [markedReview, setMarkedReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(test.duration_minutes * 60);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [langMode, setLangMode] = useState<'both' | 'en' | 'tr'>('both');

  // Anti-cheat Invigilation Security Flags
  const [fsViolations, setFsViolations] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [showFsWarning, setShowFsWarning] = useState<boolean>(false);

  // Enter Fullscreen Helper
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    setShowFsWarning(false);
  };

  // Fullscreen Guard & Tab Switch Listeners
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    if (test.force_fullscreen) {
      enterFullscreen();

      const handleFsChange = () => {
        const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
        if (!isFs && !isFinished) {
          setFsViolations((prev) => prev + 1);
          setShowFsWarning(true);
        }
      };

      document.addEventListener('fullscreenchange', handleFsChange);
      return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }
  }, [hasStarted, isFinished, test.force_fullscreen]);

  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasStarted, isFinished]);

  // Screen Wake Lock
  useEffect(() => {
    if (!hasStarted || isFinished) return;
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (e) {
        console.log('Wake Lock notice:', e);
      }
    };

    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, [hasStarted, isFinished]);

  // Timer Countdown
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, isFinished]);

  const handleStartExam = () => {
    setHasStarted(true);
    if (test.force_fullscreen) {
      enterFullscreen();
    }
  };

  const handleSelectAnswer = (letter: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({ ...prev, [currentQ]: letter }));
    setVisited((prev) => ({ ...prev, [currentQ]: true }));
  };

  const handleClearAnswer = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ];
      return next;
    });
  };

  const handleToggleReview = () => {
    setMarkedReview((prev) => ({ ...prev, [currentQ]: !prev[currentQ] }));
  };

  const handleNavigate = (dir: number) => {
    const nextIdx = currentQ + dir;
    if (nextIdx >= 0 && nextIdx < questions.length) {
      setCurrentQ(nextIdx);
      setVisited((prev) => ({ ...prev, [nextIdx]: true }));
    }
  };

  const handleFinishExam = async () => {
    setIsFinished(true);
    setShowConfirmModal(false);

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const timeTaken = (test.duration_minutes * 60) - timeLeft;

    // Build question responses map
    const responsesByQId: Record<string, string> = {};
    questions.forEach((q, idx) => {
      if (answers[idx]) {
        const qKey = q.question_id || q.id || `q_${idx}`;
        responsesByQId[qKey] = answers[idx];
      }
    });

    let submittedViaFunction = false;

    // Attempt server-side scoring submission via Cloud Function
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('../lib/firebase');
      const functions = getFunctions(app);
      const submitFn = httpsCallable(functions, 'submitTestAttempt');

      const res: any = await submitFn({
        test_id: test.test_id,
        responses: responsesByQId,
        time_taken_seconds: timeTaken
      });

      if (res.data?.success) {
        submittedViaFunction = true;
        console.log('✅ Exam attempt scored and saved server-side via Cloud Function:', res.data);
      }
    } catch (fnErr) {
      console.warn('Notice calling submitTestAttempt Cloud Function (falling back to client save):', fnErr);
    }

    // Fallback: Local client-side calculation if Cloud Function unavailable or preview mode
    if (!submittedViaFunction) {
      let score = 0;
      let totalMarks = 0;

      questions.forEach((q, idx) => {
        const pts = q.points || 1;
        const neg = q.negative_marks || 0;
        totalMarks += pts;

        const userAns = answers[idx];
        if (userAns) {
          if (userAns === q.correct_option) {
            score += pts;
          } else {
            score -= neg;
          }
        }
      });

      if (score < 0) score = 0;
      const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const status = pct >= test.passing_marks ? 'PASS' : 'FAIL';

      try {
        const attemptId = `attempt_exam_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const attemptDoc: TestAttempt = {
          attempt_id: attemptId,
          tenant_id: test.tenant_id,
          teacher_id: test.teacher_id,
          student_id: profile?.uid || 'guest_student',
          student_email: profile?.email || 'student@gmail.com',
          student_name: profile?.name || 'Student',
          roll_no: profile?.rollNo || '2026001',
          trade: profile?.trade || 'Electrician',
          test_id: test.test_id,
          test_title: test.title,
          status,
          responses: answers as any,
          score,
          total_marks: totalMarks,
          percentage: pct,
          time_taken_seconds: timeTaken,
          fs_violations: fsViolations,
          tab_switches: tabSwitches,
          submitted_at: new Date().toISOString(),
          mode: 'exam'
        };

        await safeSetDoc('test_attempts', attemptId, 'attempt_id', attemptDoc);
      } catch (e) {
        console.warn('Exam attempt save notice:', e);
      }
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // WELCOME EXAM START SCREEN
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 flex items-center justify-center font-sans">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full">
              🔒 Official Invigilated Mock Exam
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{test.title}</h1>
            <p className="text-xs text-slate-400">{test.institute_name || 'Government ITI'}</p>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 text-xs space-y-2">
            <div className="font-bold uppercase text-slate-400 text-[10px]">Examination Instructions</div>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li>Duration: <strong>{test.duration_minutes} Minutes</strong> | Total Questions: <strong>{questions.length}</strong></li>
              <li>Passing Criteria: <strong>{test.passing_marks}%</strong></li>
              {test.force_fullscreen && <li className="text-amber-400 font-bold">Full Screen Mode is enforced. Exiting full screen logs a cheating violation.</li>}
              <li>Switching browser tabs or minimizing windows is tracked and logged.</li>
            </ul>
          </div>

          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 space-y-2 text-xs">
            <div className="font-bold text-slate-300 uppercase text-[10px]">Candidate Details</div>
            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div>Name: <strong className="text-white">{profile?.name}</strong></div>
              <div>Roll No: <strong className="text-white">{profile?.rollNo || '2026001'}</strong></div>
            </div>
          </div>

          <button
            onClick={handleStartExam}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-xl text-sm shadow-xl transition-all cursor-pointer active:scale-98"
          >
            ▶ Begin Invigilated Exam Now
          </button>
        </div>
      </div>
    );
  }

  // EXAM RESULTS SCREEN
  if (isFinished) {
    let score = 0;
    let totalMarks = 0;
    let correctCount = 0;
    let wrongCount = 0;

    questions.forEach((q, idx) => {
      const pts = q.points || 1;
      const neg = q.negative_marks || 0;
      totalMarks += pts;

      const userAns = answers[idx];
      if (userAns) {
        if (userAns === q.correct_option) {
          score += pts;
          correctCount++;
        } else {
          score -= neg;
          wrongCount++;
        }
      }
    });

    if (score < 0) score = 0;
    const pct = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    const passed = pct >= test.passing_marks;

    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 flex flex-col items-center justify-start font-sans animate-fade-in">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-3xl w-full overflow-hidden">
          
          <div className="bg-gradient-to-r from-amber-700 via-orange-800 to-slate-900 text-white p-6 sm:p-8 text-center relative">
            <span className="bg-white/20 text-white border border-white/30 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full inline-block mb-2">
              🏆 Mock Exam Scorecard
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{test.title}</h1>
            <p className="text-xs text-amber-100 opacity-90 mt-1">
              Candidate: {profile?.name} • Roll: {profile?.rollNo || '2026001'}
            </p>

            <div className="my-6 flex justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-white/30 flex flex-col items-center justify-center bg-white/10 shadow-inner">
                <span className="text-3xl font-black">{pct.toFixed(1)}%</span>
                <span className="text-[10px] uppercase font-bold text-amber-100">Score</span>
              </div>
            </div>

            <div className={`inline-block px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
              passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {passed ? '✓ PASS' : '✗ FAIL'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-4">
              <div className="text-lg font-black text-amber-600">{score.toFixed(1)}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Score</div>
            </div>
            <div className="p-4">
              <div className="text-lg font-black text-slate-800 dark:text-slate-200">{totalMarks}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Total Marks</div>
            </div>
            <div className="p-4">
              <div className="text-lg font-black text-emerald-600">{correctCount}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Correct</div>
            </div>
            <div className="p-4">
              <div className="text-lg font-black text-red-600">{wrongCount}</div>
              <div className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">Wrong</div>
            </div>
          </div>

          {/* Invigilation Flags Summary */}
          {(fsViolations > 0 || tabSwitches > 0) && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <strong>Invigilation Security Log:</strong> Fullscreen Exits: {fsViolations} | Tab Switches: {tabSwitches}
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Scorecard</span>
              </button>
            </div>

            {/* Detailed Question & Solution Breakdown */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600" />
                <span>Detailed Question Solutions &amp; Explanations ({questions.length})</span>
              </h3>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {questions.map((q, idx) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns === q.correct_option;
                  const isUnanswered = !userAns;

                  return (
                    <div
                      key={q.question_id || idx}
                      className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-3 ${
                        isCorrect
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                          : isUnanswered
                          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                          : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs shrink-0 font-bold">
                            {idx + 1}
                          </span>
                          <span>{q.question_text}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : isUnanswered
                            ? 'bg-slate-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}>
                          {isCorrect ? '✓ Correct' : isUnanswered ? 'Skipped' : '✗ Incorrect'}
                        </span>
                      </div>

                      {q.question_tr && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 italic font-normal pl-8">
                          🌐 {q.question_tr}
                        </p>
                      )}

                      {q.image_url && (
                        <div className="pl-8 pt-1">
                          <img
                            src={q.image_url}
                            alt="Question Diagram"
                            className="max-h-40 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1"
                            referrerPolicy="no-referrer"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-8 text-xs">
                        {(['A', 'B', 'C', 'D'] as const).map((letKey) => {
                          const optText = q.options[letKey];
                          if (!optText || optText === 'N/A') return null;

                          const isSelectedOpt = userAns === letKey;
                          const isCorrectOpt = letKey === q.correct_option;

                          let style = 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                          if (isCorrectOpt) {
                            style = 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold';
                          } else if (isSelectedOpt && !isCorrectOpt) {
                            style = 'bg-red-100 dark:bg-red-950 border-red-500 text-red-900 dark:text-red-200 font-bold';
                          }

                          return (
                            <div key={letKey} className={`p-2 rounded-xl border flex items-center gap-2 ${style}`}>
                              <span className="font-extrabold">{letKey}.</span>
                              <span className="flex-1">{optText}</span>
                              {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {isSelectedOpt && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation Text & Image (Column X) */}
                      {(q.explanation || q.explanation_tr || q.explanation_image) && (
                        <div className="ml-8 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs space-y-2 text-amber-950 dark:text-amber-200">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                            <span>💡 Explanation &amp; Key Concept</span>
                          </div>
                          {q.explanation && <p>{q.explanation}</p>}
                          {q.explanation_tr && <p className="text-blue-600 dark:text-blue-400 italic">🌐 {q.explanation_tr}</p>}
                          {q.explanation_image && (
                            <div className="pt-1">
                              <img
                                src={q.explanation_image}
                                alt="Explanation Diagram"
                                className="max-h-48 rounded-xl object-contain border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-950 p-1"
                                referrerPolicy="no-referrer"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  const activeQuestion = questions[currentQ];
  const activeAnswer = answers[currentQ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none relative">
      
      {/* FULLSCREEN WARNING MODAL OVERLAY */}
      {showFsWarning && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-red-400 mb-2">FULLSCREEN REQUIRED!</h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-2 leading-relaxed">
            You have exited fullscreen mode. Official invigilation guidelines require maintaining full screen during the exam.
          </p>
          <div className="bg-red-950/80 border border-red-500/40 px-4 py-2 rounded-xl text-xs text-red-300 font-bold mb-6">
            Violation Count: #{fsViolations} | Tab Switches: {tabSwitches}
          </div>
          <button
            onClick={enterFullscreen}
            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Maximize2 className="w-4 h-4" />
            Return to Fullscreen Mode
          </button>
        </div>
      )}

      {/* Top Exam Header Bar */}
      <div className="bg-amber-600 text-slate-950 h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="font-extrabold text-xs sm:text-sm">{test.title}</h1>
          <p className="text-[10px] opacity-80">{profile?.name} • Roll: {profile?.rollNo || '2026001'}</p>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border font-mono font-extrabold text-sm sm:text-base ${
          timeLeft <= 180 ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-slate-950 text-amber-400 border-amber-500/30'
        }`}>
          <Clock className="w-4 h-4" />
          <span>{formatTimer(timeLeft)}</span>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="bg-slate-950 hover:bg-black text-amber-300 font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
        >
          Submit Exam ✓
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-28 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold gap-2 flex-wrap">
            <span>Question {currentQ + 1} of {questions.length}</span>

            <div className="flex items-center gap-2">
              {activeQuestion.question_tr && (
                <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                  <button
                    type="button"
                    onClick={() => setLangMode('both')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      langMode === 'both' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangMode('en')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      langMode === 'en' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangMode('tr')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      langMode === 'tr' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400'
                    }`}
                  >
                    Hindi/Lang 2
                  </button>
                </div>
              )}

              <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full uppercase text-[10px]">
                {activeQuestion.difficulty} • {activeQuestion.points} Pt
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            {(langMode === 'both' || langMode === 'en') && (
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {activeQuestion.question_text}
              </h2>
            )}

            {activeQuestion.question_tr && (langMode === 'both' || langMode === 'tr') && (
              <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 italic font-medium bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-200 dark:border-blue-900/30">
                🌐 {activeQuestion.question_tr}
              </p>
            )}

            {/* Question Diagram / Drive Image */}
            {activeQuestion.image_url && (
              <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-center">
                <img
                  src={activeQuestion.image_url}
                  alt="Question Diagram"
                  className="max-h-64 max-w-full rounded-xl object-contain shadow-sm"
                  referrerPolicy="no-referrer"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              </div>
            )}

            {/* Options List */}
            <div className="space-y-2.5 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const text = activeQuestion.options[letter];
                const textTr = activeQuestion.options_tr?.[letter];
                const optImg = activeQuestion.options_image?.[letter];

                if (!text || text === 'N/A') return null;

                const isSelected = activeAnswer === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectAnswer(letter)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-400'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-amber-500 border-amber-500 text-slate-950'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {letter}
                    </div>

                    <div className="flex-1 space-y-1">
                      {(langMode === 'both' || langMode === 'en') && (
                        <div>{text}</div>
                      )}
                      {textTr && (langMode === 'both' || langMode === 'tr') && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 italic font-normal">
                          {textTr}
                        </div>
                      )}
                      {optImg && (
                        <div className="pt-1">
                          <img
                            src={optImg}
                            alt={`Option ${letter}`}
                            className="max-h-28 rounded-lg object-contain border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1"
                            referrerPolicy="no-referrer"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              📊 Question Palette
            </h3>

            <div className="grid grid-cols-5 gap-2 max-h-64 lg:max-h-96 overflow-y-auto p-1">
              {questions.map((q, i) => {
                const isAns = !!answers[i];
                const isMark = !!markedReview[i];
                const isVis = !!visited[i];
                const isCur = i === currentQ;

                let bg = 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                if (isAns && isMark) bg = 'bg-purple-600 text-white rounded-full';
                else if (isAns) bg = 'bg-emerald-500 text-white';
                else if (isMark) bg = 'bg-purple-500 text-white rounded-full';
                else if (isVis) bg = 'bg-red-400 text-white';

                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentQ(i);
                      setVisited((prev) => ({ ...prev, [i]: true }));
                    }}
                    className={`h-9 font-bold text-xs rounded-lg transition-all flex items-center justify-center cursor-pointer ${bg} ${
                      isCur ? 'ring-2 ring-amber-500 ring-offset-2 font-black scale-105' : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 text-center text-[10px] font-bold text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-emerald-600 font-extrabold text-sm">{Object.keys(answers).length}</div>
              <div>Answered</div>
            </div>
            <div>
              <div className="text-red-500 font-extrabold text-sm">
                {questions.filter((_, i) => visited[i] && !answers[i]).length}
              </div>
              <div>Not Answered</div>
            </div>
            <div>
              <div className="text-purple-600 font-extrabold text-sm">{Object.keys(markedReview).length}</div>
              <div>Review</div>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-3 px-4 sm:px-6 flex items-center justify-between z-40 shadow-lg">
        <button
          onClick={() => handleNavigate(-1)}
          disabled={currentQ === 0}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {activeAnswer && (
            <button
              onClick={handleClearAnswer}
              className="px-3 py-2 bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Clear Answer
            </button>
          )}

          <button
            onClick={handleToggleReview}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              markedReview[currentQ]
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{markedReview[currentQ] ? 'Marked' : 'Mark Review'}</span>
          </button>
        </div>

        <button
          onClick={() => handleNavigate(1)}
          disabled={currentQ === questions.length - 1}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Submit Exam?</h3>
            <p className="text-xs text-slate-500">
              You answered {Object.keys(answers).length} out of {questions.length} questions. You cannot edit answers after submission.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Go Back
              </button>
              <button
                onClick={handleFinishExam}
                className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold"
              >
                Submit Now ✓
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
