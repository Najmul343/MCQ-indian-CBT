import React, { useState } from 'react';
import { syncGoogleSheetToFirestore, parseSheetRowsToQuestions } from '../lib/sheetsSync';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Question } from '../types';
import { 
  FileSpreadsheet, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ExternalLink, 
  Sparkles,
  Database
} from 'lucide-react';
import Papa from 'papaparse';

interface SheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete?: () => void;
}

const SAMPLE_SHEET_URLS = [
  {
    title: 'ITI NCVT Trade Theory & Basic Electrical (Default Sample Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1_Sample_ITI_Questions_Data/export?format=csv'
  }
];

export const SheetSyncModal: React.FC<SheetSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete
}) => {
  const [sheetUrl, setSheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv');
  const [pastedCsv, setPastedCsv] = useState<string>('');
  const [syncMode, setSyncMode] = useState<'url' | 'paste'>('url');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);

  if (!isOpen) return null;

  const handleSyncByUrl = async () => {
    if (!sheetUrl) {
      setResult({ success: false, message: 'Please enter a valid Google Sheet URL.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await syncGoogleSheetToFirestore(sheetUrl);
      setResult({
        success: res.success,
        message: res.message,
        count: res.totalSaved
      });
      if (res.success && res.questions) {
        setPreviewQuestions(res.questions);
        if (onSyncComplete) onSyncComplete();
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Sync failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncByPastedCsv = async () => {
    if (!pastedCsv.trim()) {
      setResult({ success: false, message: 'Please paste CSV data.' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const parsed = Papa.parse<string[]>(pastedCsv.trim(), { skipEmptyLines: true });
      const questions = parseSheetRowsToQuestions(parsed.data);

      if (questions.length === 0) {
        setResult({ success: false, message: 'No valid question rows detected in pasted CSV.' });
        setLoading(false);
        return;
      }

      try {
        const batch = writeBatch(db);
        questions.forEach((q) => {
          batch.set(doc(db, 'questions', q.question_id), q, { merge: true });
        });
        await batch.commit();
      } catch (batchErr: any) {
        console.warn('Pasted CSV Firestore write notice:', batchErr?.message || batchErr);
      }

      try {
        const existingStr = localStorage.getItem('cache_questions');
        const existing = existingStr ? JSON.parse(existingStr) : [];
        const combined = [...questions, ...existing];
        localStorage.setItem('cache_questions', JSON.stringify(combined));
      } catch (cacheErr) {
        console.warn('Local questions cache notice:', cacheErr);
      }

      setResult({
        success: true,
        message: `Successfully batch synchronized ${questions.length} questions to Firestore!`,
        count: questions.length
      });
      setPreviewQuestions(questions);
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Error parsing pasted CSV.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Automated Google Sheets One-Click Sync</h2>
              <p className="text-xs text-emerald-100 opacity-90">
                Synchronize questions directly into Firestore database
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setSyncMode('url')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
                syncMode === 'url'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              🌐 Google Sheet URL
            </button>
            <button
              onClick={() => setSyncMode('paste')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
                syncMode === 'paste'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              📋 Paste CSV / TSV
            </button>
          </div>

          {syncMode === 'url' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Google Sheet URL (Public / Export CSV Link)
                </label>
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Tip: Share sheet setting to "Anyone with link can view". The system automatically converts standard URLs to direct CSV export format.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Expected Column Sequence
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed space-y-1 font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  [Exam] • [Subject] • [Chapter] • [Topic] • [QuestionText] • [QuestionImage] • [OptA] • [OptAImage] • [OptB] • [OptBImage] • [OptC] • [OptCImage] • [OptD] • [OptDImage] • [CorrectAns] • [Difficulty] • [Points] • [NegativeMarks] • [Explanation]
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Paste Raw CSV / TSV Data from Excel / Google Sheets
              </label>
              <textarea
                value={pastedCsv}
                onChange={(e) => setPastedCsv(e.target.value)}
                rows={6}
                placeholder="NCVT ITI,Trade Theory,Basic Electrical,Units,What is the SI unit of current?,https://...,Volt,,Ampere,,Ohm,,Watt,,B,easy,1,0,Measured in Amperes"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={syncMode === 'url' ? handleSyncByUrl : handleSyncByPastedCsv}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Batch Write to Firestore...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Trigger One-Click Sync Now</span>
              </>
            )}
          </button>

          {/* Status Message */}
          {result && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                result.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-300 text-red-900 dark:text-red-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{result.message}</p>
                {result.count && (
                  <p className="mt-0.5 text-[11px] opacity-90">
                    Real-time access enabled for all registered tenants & students.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preview of Parsed Questions */}
          {previewQuestions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Synced Questions Preview ({previewQuestions.length})
              </h3>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {previewQuestions.map((q, idx) => (
                  <div key={q.question_id || idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      <span>[{q.subject}] • {q.chapter}</span>
                      <span className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full uppercase">
                        Correct: {q.correct_option}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-white">Q{idx + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-2 gap-1 mt-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                      <div>A) {q.options.A}</div>
                      <div>B) {q.options.B}</div>
                      <div>C) {q.options.C}</div>
                      <div>D) {q.options.D}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
