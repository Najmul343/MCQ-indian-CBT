import React, { useState, useEffect } from 'react';
import { Test, Question, TestAttempt } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db, safeSetDoc } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Bookmark, 
  Sparkles, 
  Printer, 
  Check, 
  X, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface PracticeScreenProps {
  test: Test;
  onClose: () => void;
}

export const PracticeScreen: React.FC<PracticeScreenProps> = ({ test, onClose }) => {
  const { profile } = useAuth();

  const questions: Question[] = test.questions && test.questions.length > 0 
    ? test.questions 
    : [];

  const storageKey = `practice_session_${test.test_id}`;

  const [currentQ, setCurrentQ] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({ 0: true });
  const [markedReview, setMarkedReview] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(test.duration_minutes * 60);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [langMode, setLangMode] = useState<'both' | 'en' | 'tr'>('both');

  // Restore saved practice progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.visited) setVisited(parsed.visited);
        if (parsed.markedReview) setMarkedReview(parsed.markedReview);
        if (typeof parsed.currentQ === 'number') setCurrentQ(parsed.currentQ);
        if (typeof parsed.timeLeft === 'number') setTimeLeft(parsed.timeLeft);
      } catch (e) {
        console.warn('Practice restore error:', e);
      }
    }
  }, [storageKey]);

  // Save progress to localStorage
  useEffect(() => {
    if (!isFinished && questions.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({
        answers,
        visited,
        markedReview,
        currentQ,
        timeLeft
      }));
    }
  }, [answers, visited, markedReview, currentQ, timeLeft, isFinished, storageKey]);

  // Countdown timer
  useEffect(() => {
    if (isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishPractice();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinished]);

  const handleSelectAnswer = (letter: 'A' | 'B' | 'C' | 'D') => {
    if (answers[currentQ]) return; // locked once answered in Practice Mode
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

  const handleFinishPractice = async () => {
    setIsFinished(true);
    setShowConfirmModal(false);
    localStorage.removeItem(storageKey);

    // Calculate score
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
    const status = pct >= test.passing_marks ? 'PASS' : 'FAIL';

    // Save attempt in Firestore
    try {
      const attemptId = `attempt_practice_${Date.now()}`;
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
        test_title: `${test.title} (Practice)`,
        status,
        responses: answers as any,
        score,
        total_marks: totalMarks,
        percentage: pct,
        time_taken_seconds: (test.duration_minutes * 60) - timeLeft,
        fs_violations: 0,
        tab_switches: 0,
        submitted_at: new Date().toISOString(),
        mode: 'practice'
      };

      await safeSetDoc('test_attempts', attemptId, 'attempt_id', attemptDoc);
    } catch (e) {
      console.warn('Practice attempt save notice:', e);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (questions.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 space-y-4">
        <HelpCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <p className="font-bold">No questions configured for this test.</p>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold">
          Close Practice
        </button>
      </div>
    );
  }

  const activeQuestion = questions[currentQ];
  const activeAnswer = answers[currentQ];

  // PRACTICE RESULTS SCREEN
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
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 text-center relative">
            <span className="bg-white/20 text-white border border-white/30 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full inline-block mb-2">
              💡 Practice Session Summary
            </span>
            <h1 className="text-xl sm:text-2xl font-black">{test.title}</h1>
            <p className="text-xs text-blue-100 opacity-90 mt-1">
              {profile?.name} • Roll No: {profile?.rollNo || '2026001'}
            </p>

            {/* Score Circle Wheel */}
            <div className="my-6 flex justify-center">
              <div className="w-32 h-32 rounded-full border-8 border-white/30 flex flex-col items-center justify-center bg-white/10 shadow-inner">
                <span className="text-3xl font-black">{pct.toFixed(1)}%</span>
                <span className="text-[10px] uppercase font-bold text-blue-100">Score</span>
              </div>
            </div>

            <div className={`inline-block px-6 py-2 rounded-full text-xs font-black uppercase tracking-wider ${
              passed ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {passed ? '✓ PASS' : '✗ FAIL'}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-4">
              <div className="text-lg font-black text-blue-600">{score.toFixed(1)}</div>
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

          {/* Actions & Question Review */}
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Close &amp; Return to Dashboard
              </button>
              <button
                onClick={() => window.print()}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </div>

            {/* Answer Key Review */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                📝 Answer Review &amp; Explanations
              </h3>

              <div className="space-y-3">
                {questions.map((q, idx) => {
                  const userAns = answers[idx];
                  const isCorrect = userAns === q.correct_option;
                  const isSkipped = !userAns;

                  return (
                    <div key={q.question_id || idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold">
                        <span>Q{idx + 1}. {q.chapter}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                          isSkipped ? 'bg-slate-200 text-slate-700' : isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isSkipped ? 'Skipped' : isCorrect ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">{q.question_text}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                          const optionText = q.options[letter];
                          if (!optionText) return null;

                          let style = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                          if (letter === q.correct_option) {
                            style = 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200';
                          } else if (letter === userAns && !isCorrect) {
                            style = 'bg-red-100 dark:bg-red-950/80 border-red-400 font-bold text-red-900 dark:text-red-200';
                          }

                          return (
                            <div key={letter} className={`p-2 rounded-xl border text-xs flex items-center gap-2 ${style}`}>
                              <span className="font-bold">{letter}.</span>
                              <span>{optionText}</span>
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-900 dark:text-amber-300 text-[11px] leading-relaxed">
                          💡 <strong>Explanation:</strong> {q.explanation}
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

  // ACTIVE PRACTICE SCREEN
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col font-sans select-none">
      
      {/* Top Bar */}
      <div className="bg-blue-700 text-white h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div>
          <h1 className="font-bold text-xs sm:text-sm">{test.title} (Practice)</h1>
          <p className="text-[10px] opacity-80">{profile?.name} • Roll: {profile?.rollNo || '2026001'}</p>
        </div>

        <div className="flex items-center gap-2 bg-white/15 px-3 py-1 rounded-lg border border-white/20 font-mono font-extrabold text-sm sm:text-base">
          <Clock className="w-4 h-4 text-amber-300" />
          <span>{formatTimer(timeLeft)}</span>
        </div>

        <button
          onClick={() => setShowConfirmModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow cursor-pointer"
        >
          Finish Practice ✓
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Question Content Area */}
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
                      langMode === 'both' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangMode('en')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      langMode === 'en' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLangMode('tr')}
                    className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                      langMode === 'tr' ? 'bg-blue-600 text-white shadow' : 'text-slate-400'
                    }`}
                  >
                    Hindi/Lang 2
                  </button>
                </div>
              )}

              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full uppercase text-[10px]">
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

            {/* Options List with Instant Feedback */}
            <div className="space-y-2.5 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                const text = activeQuestion.options[letter];
                const textTr = activeQuestion.options_tr?.[letter];
                const optImg = activeQuestion.options_image?.[letter];

                if (!text || text === 'N/A') return null;

                const isSelected = activeAnswer === letter;
                const isCorrectOption = letter === activeQuestion.correct_option;

                let optionStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30';

                // Instant Practice Feedback styling when answered
                if (activeAnswer) {
                  if (isCorrectOption) {
                    optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20';
                  } else if (isSelected && !isCorrectOption) {
                    optionStyle = 'border-red-500 bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 font-bold';
                  } else {
                    optionStyle = 'opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900';
                  }
                }

                return (
                  <button
                    key={letter}
                    onClick={() => handleSelectAnswer(letter)}
                    disabled={!!activeAnswer}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-start gap-3 cursor-pointer ${optionStyle}`}
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 ${
                      activeAnswer && isCorrectOption 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : activeAnswer && isSelected && !isCorrectOption 
                        ? 'bg-red-500 border-red-500 text-white' 
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

                    {activeAnswer && isCorrectOption && <Check className="w-5 h-5 text-emerald-600 ml-auto shrink-0 mt-0.5" />}
                    {activeAnswer && isSelected && !isCorrectOption && <X className="w-5 h-5 text-red-600 ml-auto shrink-0 mt-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Instant Explanation Box */}
            {activeAnswer && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 rounded-2xl text-amber-950 dark:text-amber-200 text-xs sm:text-sm leading-relaxed space-y-2 animate-fade-in">
                <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-4 h-4" />
                  <span>💡 Explanation &amp; Key Concept</span>
                </div>

                <p>{activeQuestion.explanation || 'No detailed explanation provided for this question.'}</p>

                {activeQuestion.explanation_tr && (
                  <p className="text-blue-600 dark:text-blue-400 italic">
                    🌐 {activeQuestion.explanation_tr}
                  </p>
                )}

                {activeQuestion.explanation_image && (
                  <div className="pt-1">
                    <img
                      src={activeQuestion.explanation_image}
                      alt="Solution Diagram"
                      className="max-h-48 rounded-xl object-contain border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-950 p-1"
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                  </div>
                )}
              </div>
            )}
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
                      isCur ? 'ring-2 ring-blue-600 ring-offset-2 font-black scale-105' : ''
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

      {/* Bottom Floating Navigation Bar */}
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Submit Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Finish Practice Session?</h3>
            <p className="text-xs text-slate-500">
              You answered {Object.keys(answers).length} out of {questions.length} questions.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold"
              >
                Continue Practice
              </button>
              <button
                onClick={handleFinishPractice}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                Finish &amp; Score
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
