import React, { useState, useEffect } from 'react';
import { db, INITIAL_QUESTIONS, INITIAL_TESTS, safeGetDocs, safeSetDoc } from '../lib/firebase';
import { Question, Test, TestFolder } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  PlusCircle, 
  X, 
  Check, 
  Sliders, 
  Clock, 
  ShieldAlert, 
  Sparkles,
  BookOpen,
  FolderCheck,
  Edit3
} from 'lucide-react';

interface QuizMakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  testToEdit?: Test | null;
  testFolders?: TestFolder[];
  onTestCreated?: () => void;
}

export const QuizMakerModal: React.FC<QuizMakerModalProps> = ({
  isOpen,
  onClose,
  testToEdit,
  testFolders: propTestFolders = [],
  onTestCreated
}) => {
  const { profile } = useAuth();

  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [fetchedFolders, setFetchedFolders] = useState<TestFolder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const effectiveFolders = propTestFolders.length > 0 ? propTestFolders : fetchedFolders;

  // Form State
  const [title, setTitle] = useState<string>('');
  const [tradeClass, setTradeClass] = useState<string>('Electrician - Sem 1');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [mode, setMode] = useState<'exam' | 'practice'>('exam');
  const [duration, setDuration] = useState<number>(60);
  const [passingMarks, setPassingMarks] = useState<number>(40);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(true);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(true);
  const [forceFullscreen, setForceFullscreen] = useState<boolean>(true);
  const [instructions, setInstructions] = useState<string>(
    'Read all questions carefully.\nNo negative marking.\nFull screen mode is enforced.'
  );

  // Question Selection State
  const [selectionType, setSelectionType] = useState<'random' | 'custom'>('random');
  const [randomCount, setRandomCount] = useState<number>(10);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const fetchedQs = await safeGetDocs<Question>('questions', INITIAL_QUESTIONS);
        setQuestions(fetchedQs);

        const fetchedFolds = await safeGetDocs<TestFolder>('test_folders', []);
        setFetchedFolders(fetchedFolds);
      } catch (e) {
        console.warn('Fetch error in QuizMakerModal:', e);
      }
    };

    if (isOpen) {
      loadData();
      if (testToEdit) {
        setTitle(testToEdit.title);
        setTradeClass(testToEdit.trade_class || 'Electrician - Sem 1');
        setSelectedFolderId(testToEdit.folder_id || 'root');
        setMode(testToEdit.mode || 'exam');
        setDuration(testToEdit.duration_minutes || 60);
        setPassingMarks(testToEdit.passing_marks || 40);
        setShuffleQuestions(!!testToEdit.shuffle_questions);
        setShuffleOptions(!!testToEdit.shuffle_options);
        setForceFullscreen(!!testToEdit.force_fullscreen);
        setInstructions(testToEdit.instructions ? testToEdit.instructions.join('\n') : '');
        setSelectionType('custom');

        // Pre-select questions
        const selMap: Record<string, boolean> = {};
        if (testToEdit.question_ids) {
          testToEdit.question_ids.forEach((id) => {
            selMap[id] = true;
          });
        }
        setSelectedQuestionIds(selMap);
      } else {
        setTitle('');
        setTradeClass('Electrician - Sem 1');
        setSelectedFolderId('root');
        setMode('exam');
        setDuration(60);
        setPassingMarks(40);
        setShuffleQuestions(true);
        setShuffleOptions(true);
        setForceFullscreen(true);
        setInstructions('Read all questions carefully.\nNo negative marking.\nFull screen mode is enforced.');
        setSelectionType('random');
        setSelectedQuestionIds({});
      }
    }
  }, [isOpen, testToEdit]);

  if (!isOpen) return null;

  const uniqueSubjects = Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);

  const filteredQuestions = questions.filter((q) => {
    const matchSub = selectedSubject === 'all' || q.subject === selectedSubject;
    const matchDiff = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
    return matchSub && matchDiff;
  });

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectAll = () => {
    const selMap: Record<string, boolean> = {};
    filteredQuestions.forEach((q) => {
      selMap[q.question_id] = true;
    });
    setSelectedQuestionIds((prev) => ({ ...prev, ...selMap }));
  };

  const handleDeselectAll = () => {
    setSelectedQuestionIds({});
  };

  const handleCreateOrUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a test title.');
      return;
    }

    setLoading(true);

    let chosenQs: Question[] = [];

    if (selectionType === 'random') {
      let pool = filteredQuestions.length > 0 ? [...filteredQuestions] : [...questions];
      if (pool.length === 0) pool = [...INITIAL_QUESTIONS];

      if (shuffleQuestions) {
        pool = pool.sort(() => Math.random() - 0.5);
      }
      const countToPick = Math.max(1, Math.min(randomCount, pool.length));
      chosenQs = pool.slice(0, countToPick);
    } else {
      chosenQs = questions.filter((q) => selectedQuestionIds[q.question_id]);
    }

    if (chosenQs.length === 0) {
      chosenQs = INITIAL_QUESTIONS.slice(0, Math.min(5, INITIAL_QUESTIONS.length));
    }

    const testId = testToEdit ? testToEdit.test_id : `test_${Date.now()}`;
    const newTest: Test = {
      test_id: testId,
      folder_id: selectedFolderId === 'root' ? undefined : selectedFolderId,
      title: title.trim(),
      tenant_id: profile?.tenant_id || 'tenant_govt_iti',
      teacher_id: profile?.uid || 'demo_teacher_electrician',
      teacher_name: profile?.name || 'Er. Instructor',
      trade_class: tradeClass,
      institute_name: 'Government ITI',
      duration_minutes: duration,
      passing_marks: passingMarks,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      force_fullscreen: forceFullscreen,
      instructions: instructions.split('\n').filter(Boolean),
      question_ids: chosenQs.map((q) => q.question_id),
      questions: chosenQs,
      mode,
      status: testToEdit ? testToEdit.status : 'Active',
      createdAt: testToEdit ? testToEdit.createdAt : new Date().toISOString()
    };

    try {
      await safeSetDoc('tests', testId, 'test_id', newTest);
      window.dispatchEvent(new Event('tests_updated'));
      if (onTestCreated) onTestCreated();
      onClose();
    } catch (err) {
      console.error('Save test error:', err);
      alert('Failed to save test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
              {testToEdit ? <Edit3 className="w-6 h-6 text-white" /> : <PlusCircle className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {testToEdit ? 'Edit Mock Test / Practice Set' : 'Create New Mock Test / Practice'}
              </h2>
              <p className="text-xs text-blue-100 opacity-90">
                Configure test parameters, target folder, and question selection
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-blue-200 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreateOrUpdateTest} className="p-6 space-y-5 text-slate-800 dark:text-slate-100">
          
          {/* Title & Trade Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Test Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electrician Sem 1 - Midterm Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Trade / Class *
              </label>
              <select
                value={tradeClass}
                onChange={(e) => setTradeClass(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Electrician - Sem 1">Electrician - Sem 1</option>
                <option value="Electrician - Sem 2">Electrician - Sem 2</option>
                <option value="Fitter - Sem 1">Fitter - Sem 1</option>
                <option value="Welder - Sem 1">Welder - Sem 1</option>
                <option value="COPA - Sem 1">COPA - Sem 1</option>
                <option value="Employability Skills">Employability Skills</option>
                <option value="Engineering Drawing">Engineering Drawing</option>
              </select>
            </div>
          </div>

          {/* Test Folder Assignment & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                <FolderCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assign to Test Folder</span>
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="root">📁 Root Directory (Unassigned)</option>
                {effectiveFolders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    📁 {f.path || f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Mode
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMode('exam')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mode === 'exam'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Timed Exam Mode
                </button>
                <button
                  type="button"
                  onClick={() => setMode('practice')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    mode === 'practice'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-white'
                  }`}
                >
                  Practice Mode
                </button>
              </div>
            </div>
          </div>

          {/* Duration & Passing Marks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Passing Marks (%)
              </label>
              <input
                type="number"
                min={10}
                max={100}
                value={passingMarks}
                onChange={(e) => setPassingMarks(parseInt(e.target.value) || 40)}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">Shuffle Questions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">Shuffle Options</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceFullscreen}
                onChange={(e) => setForceFullscreen(e.target.checked)}
                className="rounded accent-blue-600"
              />
              <span className="font-bold text-slate-700 dark:text-slate-300">Force Fullscreen</span>
            </label>
          </div>

          {/* Question Selection Mode */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                Question Selection
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectionType('random')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectionType === 'random'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Auto Random
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionType('custom')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    selectionType === 'custom'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  Pick Manually
                </button>
              </div>
            </div>

            {selectionType === 'random' ? (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <span>Select</span>
                <input
                  type="number"
                  min={1}
                  max={questions.length || 50}
                  value={randomCount}
                  onChange={(e) => setRandomCount(parseInt(e.target.value) || 10)}
                  className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded font-bold text-center"
                />
                <span>random questions from question bank ({questions.length} total available).</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-bold">
                      Selected: {Object.values(selectedQuestionIds).filter(Boolean).length} / {filteredQuestions.length}
                    </span>
                    {uniqueSubjects.length > 0 && (
                      <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded font-bold text-[11px]"
                      >
                        <option value="all">All Subjects ({questions.length})</option>
                        {uniqueSubjects.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-bold hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-bold hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {filteredQuestions.map((q) => {
                    const isSel = !!selectedQuestionIds[q.question_id];
                    return (
                      <div
                        key={q.question_id}
                        onClick={() => handleToggleQuestion(q.question_id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                          isSel ? 'bg-blue-900/30 text-blue-300 font-bold' : 'hover:bg-slate-200/50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div className="pr-2 truncate">
                          <span className="block truncate">{q.question_text}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {q.subject} • {q.topic || 'General'}
                          </span>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSel ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-600'
                        }`}>
                          {isSel && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{testToEdit ? 'Save Changes' : 'Create Test Now'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
