import React, { useState, useEffect } from 'react';
import { db, safeGetDocs } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { TestAttempt } from '../types';
import { 
  BarChart3, 
  X, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Printer, 
  FileText, 
  GraduationCap,
  Calendar
} from 'lucide-react';

interface StudentAnalyticsModalProps {
  isOpen: boolean;
  studentName: string;
  rollNo: string;
  onClose: () => void;
}

export const StudentAnalyticsModal: React.FC<StudentAnalyticsModalProps> = ({
  isOpen,
  studentName,
  rollNo,
  onClose
}) => {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStudentAttempts = async () => {
      setLoading(true);
      try {
        const all = await safeGetDocs<TestAttempt>('test_attempts', []);
        const studentAtts = all.filter(
          (a) => a.student_name === studentName || a.roll_no === rollNo
        );
        setAttempts(studentAtts);
      } catch (e) {
        console.warn('Fetch student analytics error:', e);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && studentName) {
      fetchStudentAttempts();
    }
  }, [isOpen, studentName, rollNo]);

  if (!isOpen) return null;

  const totalTests = attempts.length;
  const passes = attempts.filter((a) => a.status === 'PASS').length;
  const fails = totalTests - passes;

  const avgPct = totalTests > 0 
    ? Math.round((attempts.reduce((s, a) => s + a.percentage, 0) / totalTests) * 10) / 10 
    : 0;

  const bestPct = totalTests > 0 
    ? Math.round(Math.max(...attempts.map((a) => a.percentage)) * 10) / 10 
    : 0;

  const getGrade = (pct: number) => {
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };

  const finalGrade = getGrade(avgPct);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{studentName}</h2>
              <p className="text-xs text-blue-100 opacity-90">
                Roll No: <span className="font-mono font-bold">{rollNo}</span> • Detailed Performance Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="p-2 hover:bg-white/10 rounded-lg text-blue-100 hover:text-white transition-colors cursor-pointer"
              title="Print Student Analytics Report"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg text-blue-100 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Average Score</div>
              <div className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-0.5">{avgPct}%</div>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Best Score</div>
              <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{bestPct}%</div>
            </div>

            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">Total Tests</div>
              <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-0.5">{totalTests}</div>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-center">
              <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Final Grade</div>
              <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{finalGrade}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-center">
              <div className="text-xl font-black text-emerald-600">{passes}</div>
              <div className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300 mt-0.5">Tests Passed</div>
            </div>

            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-2xl text-center">
              <div className="text-xl font-black text-red-600">{fails}</div>
              <div className="text-[10px] font-bold uppercase text-red-800 dark:text-red-300 mt-0.5">Tests Failed</div>
            </div>
          </div>

          {/* Detailed Test History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              📝 Test Assessment History ({attempts.length})
            </h3>

            {attempts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                No attempt records found for this student.
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.map((a, idx) => (
                  <div key={a.attempt_id ? `${a.attempt_id}_${idx}` : `attempt_${idx}`} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{a.test_title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{a.submitted_at}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-blue-600 dark:text-blue-400">{a.percentage.toFixed(1)}%</div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        a.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Analytics
          </button>
        </div>

      </div>
    </div>
  );
};
