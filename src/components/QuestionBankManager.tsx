import React, { useState } from 'react';
import { Question, QuestionFolder } from '../types';
import { safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { ExcelQuestionUploaderModal } from './ExcelQuestionUploaderModal';
import { convertGoogleDriveUrl } from '../lib/driveUtils';
import { useAuth } from '../context/AuthContext';
import { 
  Folder, 
  FolderPlus, 
  FolderOpen, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  ChevronRight, 
  HelpCircle, 
  ArrowRightLeft, 
  FolderCheck,
  BookOpen,
  X,
  CheckCircle2,
  FileText,
  Globe,
  Image as ImageIcon
} from 'lucide-react';

interface QuestionBankManagerProps {
  questions: Question[];
  folders: QuestionFolder[];
  onRefreshData: () => void;
}

export const QuestionBankManager: React.FC<QuestionBankManagerProps> = ({
  questions,
  folders,
  onRefreshData
}) => {
  const { profile } = useAuth();
  // Navigation State (Current Folder ID, null for Root)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderCategory, setNewFolderCategory] = useState<string>('⚡ ITI (NCVT) (Trade Theory CBT)');
  const [newFolderTrade, setNewFolderTrade] = useState<string>('Electrician');

  // Edit Folder Modal
  const [showEditFolderModal, setShowEditFolderModal] = useState<boolean>(false);
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'folder' | 'question';
    id: string;
    name: string;
  } | null>(null);
  const [deleteWithContents, setDeleteWithContents] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Bulk actions state
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState<boolean>(false);
  const [bulkMoveTargetFolderId, setBulkMoveTargetFolderId] = useState<string>('root');
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState<boolean>(false);

  const [folderToEdit, setFolderToEdit] = useState<QuestionFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState<string>('');
  const [editFolderCategory, setEditFolderCategory] = useState<string>('⚡ ITI (NCVT) (Trade Theory CBT)');
  const [editFolderTrade, setEditFolderTrade] = useState<string>('Electrician');

  // Single Question Add/Edit Modal
  const [showQuestionModal, setShowQuestionModal] = useState<boolean>(false);
  const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

  // Question Form State
  const [qText, setQText] = useState<string>('');
  const [qSubject, setQSubject] = useState<string>('Trade Theory');
  const [qChapter, setQChapter] = useState<string>('General Theory');
  const [qTopic, setQTopic] = useState<string>('Core Concepts');
  const [optA, setOptA] = useState<string>('');
  const [optB, setOptB] = useState<string>('');
  const [optC, setOptC] = useState<string>('');
  const [optD, setOptD] = useState<string>('');
  const [correctOpt, setCorrectOpt] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [qExplanation, setQExplanation] = useState<string>('');

  // Move Question Modal
  const [moveQuestionId, setMoveQuestionId] = useState<string | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('root');

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Root (Question Bank)' }];
    if (!currentFolderId) return path;

    let curr: QuestionFolder | undefined = folders.find((f) => f.folder_id === currentFolderId);
    const stack: { id: string; name: string }[] = [];

    while (curr) {
      stack.unshift({ id: curr.folder_id, name: curr.name });
      curr = folders.find((f) => f.folder_id === curr?.parent_id);
    }

    return [...path, ...stack];
  };

  const currentFolder = folders.find((f) => f.folder_id === currentFolderId);

  // Filter Subfolders in current folder
  const subfolders = folders.filter((f) => {
    if (currentFolderId === null) {
      return f.parent_id === null || f.parent_id === 'root';
    }
    return f.parent_id === currentFolderId;
  });

  // Filter Questions in current folder
  const currentQuestions = questions.filter((q) => {
    // If searching, search globally
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      return (
        q.question_text.toLowerCase().includes(qLower) ||
        q.subject.toLowerCase().includes(qLower) ||
        (q.chapter && q.chapter.toLowerCase().includes(qLower)) ||
        (q.topic && q.topic.toLowerCase().includes(qLower))
      );
    }

    if (currentFolderId === null) {
      return !q.folder_id || q.folder_id === 'root';
    }
    return q.folder_id === currentFolderId;
  });

  // Handle Create Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newId = `qfolder_${Date.now()}`;
    const parentFolder = folders.find((f) => f.folder_id === currentFolderId);
    const parentPath = parentFolder ? parentFolder.path : '';
    const fullPath = `${parentPath}/${newFolderName.trim()}`;

    const newFolderObj: QuestionFolder = {
      folder_id: newId,
      name: newFolderName.trim(),
      parent_id: currentFolderId,
      path: fullPath,
      category: newFolderCategory,
      trade: newFolderTrade,
      createdAt: new Date().toISOString()
    };

    try {
      await safeSetDoc('question_folders', newId, 'folder_id', newFolderObj);
      setShowNewFolderModal(false);
      setNewFolderName('');
      onRefreshData();
    } catch (err) {
      console.error('Create folder error:', err);
    }
  };

  // Handle Edit Folder
  const handleOpenEditFolder = (f: QuestionFolder) => {
    setFolderToEdit(f);
    setEditFolderName(f.name);
    setEditFolderCategory(f.category || '⚡ ITI (NCVT) (Trade Theory CBT)');
    setEditFolderTrade(f.trade || 'Electrician');
    setShowEditFolderModal(true);
  };

  const handleSaveEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !editFolderName.trim()) return;

    const updatedFolder: QuestionFolder = {
      ...folderToEdit,
      name: editFolderName.trim(),
      category: editFolderCategory,
      trade: editFolderTrade
    };

    try {
      await safeSetDoc('question_folders', folderToEdit.folder_id, 'folder_id', updatedFolder);
      setShowEditFolderModal(false);
      setFolderToEdit(null);
      onRefreshData();
    } catch (err) {
      console.error('Edit folder error:', err);
    }
  };

  // Helper to calculate all descendant folder IDs recursively
  const getDescendantFolderIds = (startFolderId: string): string[] => {
    const result: string[] = [startFolderId];
    const queue = [startFolderId];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      const children = folders.filter((f) => f.parent_id === parent);
      for (const child of children) {
        result.push(child.folder_id);
        queue.push(child.folder_id);
      }
    }
    return result;
  };

  // Handle Delete Folder
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteWithContents(true);
    setDeleteModalTarget({ type: 'folder', id: folderId, name: folderName });
  };

  // Handle Delete Question
  const handleDeleteQuestion = (qId: string, qText?: string) => {
    setDeleteModalTarget({
      type: 'question',
      id: qId,
      name: qText ? (qText.length > 60 ? qText.substring(0, 60) + '...' : qText) : 'this question'
    });
  };

  // Execute Confirmed Delete Action
  const confirmDeleteAction = async () => {
    if (!deleteModalTarget) return;
    setIsDeleting(true);
    const { type, id } = deleteModalTarget;

    try {
      if (type === 'folder') {
        const targetFolderIds = getDescendantFolderIds(id);

        if (deleteWithContents) {
          // Cascade delete all questions in this folder and any descendant subfolders
          const questionsToDelete = questions.filter((q) => q.folder_id && targetFolderIds.includes(q.folder_id));
          for (const q of questionsToDelete) {
            await safeDeleteDoc('questions', q.question_id, 'question_id');
          }
          // Delete all descendant folders and the folder itself
          for (const fId of targetFolderIds) {
            await safeDeleteDoc('question_folders', fId, 'folder_id');
          }
        } else {
          // Reassign questions in this folder to root directory
          const affectedQs = questions.filter((q) => q.folder_id === id);
          for (const q of affectedQs) {
            const { folder_id, ...rest } = q;
            await safeSetDoc('questions', q.question_id, 'question_id', rest);
          }
          await safeDeleteDoc('question_folders', id, 'folder_id');
        }
      } else if (type === 'question') {
        await safeDeleteDoc('questions', id, 'question_id');
      }
      setDeleteModalTarget(null);
      setSelectedQuestionIds([]);
      onRefreshData();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute Bulk Delete Selected Questions
  const handleBulkDeleteQuestions = async () => {
    if (selectedQuestionIds.length === 0) return;
    setIsDeleting(true);
    try {
      for (const qId of selectedQuestionIds) {
        await safeDeleteDoc('questions', qId, 'question_id');
      }
      setSelectedQuestionIds([]);
      setBulkDeleteModalOpen(false);
      onRefreshData();
    } catch (err) {
      console.error('Bulk delete questions error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute Bulk Move Selected Questions
  const handleBulkMoveQuestions = async () => {
    if (selectedQuestionIds.length === 0) return;
    setIsDeleting(true);
    try {
      const targetFolderVal = bulkMoveTargetFolderId === 'root' ? undefined : bulkMoveTargetFolderId;
      for (const qId of selectedQuestionIds) {
        const q = questions.find((item) => item.question_id === qId);
        if (q) {
          await safeSetDoc('questions', qId, 'question_id', { ...q, folder_id: targetFolderVal });
        }
      }
      setSelectedQuestionIds([]);
      setBulkMoveModalOpen(false);
      onRefreshData();
    } catch (err) {
      console.error('Bulk move questions error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection helpers
  const isAllSelected = currentQuestions.length > 0 && currentQuestions.every((q) => selectedQuestionIds.includes(q.question_id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedQuestionIds([]);
    } else {
      setSelectedQuestionIds(currentQuestions.map((q) => q.question_id));
    }
  };

  const toggleSelectQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  // Open Question Add/Edit Modal
  const handleOpenQuestionModal = (q?: Question) => {
    if (q) {
      setQuestionToEdit(q);
      setQText(q.question_text);
      setQSubject(q.subject || 'Trade Theory');
      setQChapter(q.chapter || 'General Theory');
      setQTopic(q.topic || 'Core Concepts');
      setOptA(q.options.A || '');
      setOptB(q.options.B || '');
      setOptC(q.options.C || '');
      setOptD(q.options.D || '');
      setCorrectOpt(q.correct_option || 'A');
      setQDifficulty(q.difficulty || 'easy');
      setQExplanation(q.explanation || '');
    } else {
      setQuestionToEdit(null);
      setQText('');
      setQSubject('Trade Theory');
      setQChapter('General Theory');
      setQTopic('Core Concepts');
      setOptA('');
      setOptB('');
      setOptC('');
      setOptD('');
      setCorrectOpt('A');
      setQDifficulty('easy');
      setQExplanation('');
    }
    setShowQuestionModal(true);
  };

  // Handle Save Question
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText.trim() || !optA.trim() || !optB.trim()) {
      alert('Please fill in Question Text, Option A, and Option B.');
      return;
    }

    const qId = questionToEdit ? questionToEdit.question_id : `q_${Date.now()}`;
    const userRole = profile?.role;
    const defaultVisibility: 'private' | 'tenant' | 'global' = 
      userRole === 'super_admin' ? 'global' : 'tenant';
    const defaultTenantId = userRole === 'super_admin' ? 'global' : (profile?.tenant_id || 'tenant_govt_iti');

    const questionObj: Question = {
      question_id: qId,
      folder_id: questionToEdit ? questionToEdit.folder_id : (currentFolderId || undefined),
      tenant_id: questionToEdit ? (questionToEdit.tenant_id || defaultTenantId) : defaultTenantId,
      owner_id: questionToEdit ? (questionToEdit.owner_id || profile?.uid || 'user') : (profile?.uid || 'user'),
      visibility: questionToEdit ? (questionToEdit.visibility || defaultVisibility) : defaultVisibility,
      exam_type: 'NCVT ITI',
      subject: qSubject.trim(),
      chapter: qChapter.trim(),
      topic: qTopic.trim(),
      question_text: qText.trim(),
      options: {
        A: optA.trim(),
        B: optB.trim(),
        C: optC.trim() || 'N/A',
        D: optD.trim() || 'N/A'
      },
      correct_option: correctOpt,
      difficulty: qDifficulty,
      points: 1,
      negative_marks: 0,
      explanation: qExplanation.trim() || undefined,
      usage_count: questionToEdit ? (questionToEdit.usage_count || 0) : 0,
      createdAt: questionToEdit ? questionToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await safeSetDoc('questions', qId, 'question_id', questionObj);
      setShowQuestionModal(false);
      onRefreshData();
    } catch (err) {
      console.error('Save question error:', err);
    }
  };

  // Handle Move Question to another Folder
  const handleMoveQuestion = async () => {
    if (!moveQuestionId) return;
    const targetQ = questions.find((q) => q.question_id === moveQuestionId);
    if (!targetQ) return;

    const newFolderVal = moveTargetFolderId === 'root' ? undefined : moveTargetFolderId;
    const updatedQ = { ...targetQ, folder_id: newFolderVal };

    try {
      await safeSetDoc('questions', moveQuestionId, 'question_id', updatedQ);
      setMoveQuestionId(null);
      onRefreshData();
    } catch (err) {
      console.error('Move question error:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Question Bank Directory</h2>
            <p className="text-xs text-slate-400">
              {questions.length} Total Questions across {folders.length} Folders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-emerald-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Excel / CSV</span>
          </button>

          <button
            onClick={() => handleOpenQuestionModal()}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-xs overflow-x-auto custom-scrollbar">
        {getBreadcrumbs().map((b, idx, arr) => (
          <React.Fragment key={b.id || 'root'}>
            <button
              onClick={() => setCurrentFolderId(b.id)}
              className={`font-bold flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer shrink-0 ${
                b.id === currentFolderId ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>{b.name}</span>
            </button>
            {idx < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          placeholder="Search question text, subject, or chapter across directory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        />
      </div>

      {/* Subfolders Grid (Like My Computer) */}
      {!searchQuery && subfolders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Folders ({subfolders.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subfolders.map((f) => {
              const qsInFolder = questions.filter((q) => q.folder_id === f.folder_id);
              const isNeet = f.category?.includes('NEET');
              const isCtet = f.category?.includes('CTET');
              const categoryBadge = isNeet ? '🩺 NEET' : isCtet ? '📚 CTET' : '⚡ ITI';
              const categoryColor = isNeet ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800' : isCtet ? 'text-blue-400 bg-blue-950/80 border-blue-800' : 'text-amber-400 bg-amber-950/80 border-amber-800';

              return (
                <div
                  key={f.folder_id}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 p-3.5 rounded-2xl transition-all flex items-center justify-between group cursor-pointer"
                  onClick={() => setCurrentFolderId(f.folder_id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${categoryColor}`}>
                          {categoryBadge}
                        </span>
                        {f.trade && (
                          <span className="text-[9px] font-mono text-slate-400 truncate max-w-[100px]">
                            {f.trade}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors mt-0.5">
                        {f.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {qsInFolder.length} Questions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditFolder(f);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-400 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Rename / Edit Folder"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(f.folder_id, f.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions List inside Current Folder */}
      <div className="space-y-3">
        {/* Batch Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
              <span>Select All ({currentQuestions.length})</span>
            </label>
            <span className="text-slate-700">|</span>
            <p className="text-xs font-medium text-slate-400">
              Questions in <span className="text-white font-bold">{currentFolder ? currentFolder.name : 'Root'}</span> ({currentQuestions.length})
            </p>
          </div>

          {selectedQuestionIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-in">
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800/80">
                {selectedQuestionIds.length} Selected
              </span>
              <button
                type="button"
                onClick={() => setBulkMoveModalOpen(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Move Selected</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedQuestionIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedQuestionIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {currentQuestions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-400">No questions found in this directory.</p>
            <p className="text-[11px] text-slate-500">
              Click "Upload Excel / CSV" or "Add Question" to populate this folder.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {currentQuestions.map((q, idx) => {
              const isSelected = selectedQuestionIds.includes(q.question_id);
              return (
                <div
                  key={q.question_id}
                  className={`bg-slate-900 border p-4 rounded-2xl space-y-2 transition-all ${
                    isSelected ? 'border-emerald-500/80 bg-slate-900/90 shadow-md ring-1 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectQuestion(q.question_id)}
                        className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0"
                      />
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-blue-950 text-blue-300 rounded-full border border-blue-800">
                            {q.subject}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                            {q.chapter || 'Theory'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            q.difficulty === 'easy' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            q.difficulty === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-red-950 text-red-300 border border-red-800'
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white mt-1 leading-relaxed">
                          {idx + 1}. {q.question_text}
                        </h4>
                    {q.question_tr && (
                      <p className="text-[11px] text-blue-300 font-medium italic bg-blue-950/40 p-2 rounded-lg border border-blue-900/30">
                        🌐 {q.question_tr}
                      </p>
                    )}

                    {/* Question Diagram / Image */}
                    {q.image_url && (
                      <div className="pt-1 pb-1">
                        <img 
                          src={q.image_url} 
                          alt="Question Diagram" 
                          className="max-h-48 max-w-full rounded-xl object-contain border border-slate-700 bg-slate-950/80 p-1"
                          referrerPolicy="no-referrer"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setMoveQuestionId(q.question_id);
                        setMoveTargetFolderId(q.folder_id || 'root');
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Move to another folder"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenQuestionModal(q)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit question"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.question_id, q.question_text)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const isCorrect = q.correct_option === optKey;
                    const optText = q.options[optKey];
                    const optTr = q.options_tr?.[optKey];
                    const optImg = q.options_image?.[optKey];

                    if (!optText || optText === 'N/A') return null;

                    return (
                      <div
                        key={optKey}
                        className={`p-2.5 rounded-xl border font-medium space-y-1 ${
                          isCorrect
                            ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold mr-1">{optKey}.</span> {optText}
                        </div>
                        {optTr && (
                          <div className="text-[10px] text-blue-300 italic font-normal">
                            {optTr}
                          </div>
                        )}
                        {optImg && (
                          <img
                            src={optImg}
                            alt={`Option ${optKey}`}
                            className="max-h-24 rounded-lg object-contain border border-slate-700 bg-slate-900 p-1"
                            referrerPolicy="no-referrer"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {(q.explanation || q.explanation_tr || q.explanation_image) && (
                  <div className="text-[10px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                    <p>💡 <strong className="text-amber-400">Explanation:</strong> {q.explanation}</p>
                    {q.explanation_tr && (
                      <p className="text-blue-300 italic">🌐 {q.explanation_tr}</p>
                    )}
                    {q.explanation_image && (
                      <img
                        src={q.explanation_image}
                        alt="Explanation Diagram"
                        className="max-h-36 rounded-lg object-contain border border-slate-700 bg-slate-900 p-1"
                        referrerPolicy="no-referrer"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Excel Upload Modal */}
      <ExcelQuestionUploaderModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        targetFolderId={currentFolderId}
        targetFolderName={currentFolder ? currentFolder.name : 'Root'}
        folders={folders}
        onUploadSuccess={onRefreshData}
      />

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleCreateFolder} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                <span>Create New Question Folder</span>
              </h3>
              <button type="button" onClick={() => setShowNewFolderModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Folder Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Electrician Semester 1"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Target Exam Category *
              </label>
              <select
                value={newFolderCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewFolderCategory(val);
                  if (val.includes('NEET')) setNewFolderTrade('NEET Medical (PCB)');
                  else if (val.includes('CTET')) setNewFolderTrade('CTET Paper 1 (Primary 1-5)');
                  else setNewFolderTrade('Electrician');
                }}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                <option value="⚡ ITI (NCVT) (Trade Theory CBT)">⚡ ITI (NCVT) (Trade Theory CBT)</option>
                <option value="🩺 NEET (UG) (Medical Entrance CBT)">🩺 NEET (UG) (Medical Entrance CBT)</option>
                <option value="📚 CTET (Teaching Eligibility CBT)">📚 CTET (Teaching Eligibility CBT)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Associated Trade / Stream / Level
              </label>
              <select
                value={newFolderTrade}
                onChange={(e) => setNewFolderTrade(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                {newFolderCategory.includes('NEET') ? (
                  <>
                    <option value="NEET Medical (PCB)">NEET Medical (PCB)</option>
                    <option value="NEET Dropper Batch">NEET Dropper / Repeater Batch</option>
                    <option value="NEET Class 11 Foundation">NEET Class 11 Foundation</option>
                    <option value="NEET Class 12 Target">NEET Class 12 Target</option>
                  </>
                ) : newFolderCategory.includes('CTET') ? (
                  <>
                    <option value="CTET Paper 1 (Primary 1-5)">CTET Paper 1 (Primary 1-5)</option>
                    <option value="CTET Paper 2 (Maths & Science)">CTET Paper 2 (Maths & Science)</option>
                    <option value="CTET Paper 2 (Social Studies)">CTET Paper 2 (Social Studies)</option>
                    <option value="CTET Both Papers (Paper 1 & 2)">CTET Both Papers (Paper 1 & 2)</option>
                  </>
                ) : (
                  <>
                    <option value="Electrician">Electrician</option>
                    <option value="Fitter">Fitter</option>
                    <option value="Welder">Welder</option>
                    <option value="COPA">COPA (Computer Operator)</option>
                    <option value="Wireman">Wireman</option>
                    <option value="Electronic Mechanic">Electronic Mechanic</option>
                    <option value="Mechanic Motor Vehicle">Mechanic Motor Vehicle (MMV)</option>
                    <option value="Turner">Turner</option>
                    <option value="Machinist">Machinist</option>
                    <option value="Draughtsman Civil">Draughtsman Civil</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Refrigeration & AC">Refrigeration & AC (RAC)</option>
                    <option value="General">General / All Trades</option>
                  </>
                )}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Create Question Folder
            </button>
          </form>
        </div>
      )}

      {/* Edit Folder Modal */}
      {showEditFolderModal && folderToEdit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSaveEditFolder} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Rename / Edit Question Folder</span>
              </h3>
              <button type="button" onClick={() => setShowEditFolderModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Folder Name *
              </label>
              <input
                type="text"
                required
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Target Exam Category *
              </label>
              <select
                value={editFolderCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditFolderCategory(val);
                  if (val.includes('NEET')) setEditFolderTrade('NEET Medical (PCB)');
                  else if (val.includes('CTET')) setEditFolderTrade('CTET Paper 1 (Primary 1-5)');
                  else setEditFolderTrade('Electrician');
                }}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                <option value="⚡ ITI (NCVT) (Trade Theory CBT)">⚡ ITI (NCVT) (Trade Theory CBT)</option>
                <option value="🩺 NEET (UG) (Medical Entrance CBT)">🩺 NEET (UG) (Medical Entrance CBT)</option>
                <option value="📚 CTET (Teaching Eligibility CBT)">📚 CTET (Teaching Eligibility CBT)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Associated Trade / Stream / Level
              </label>
              <select
                value={editFolderTrade}
                onChange={(e) => setEditFolderTrade(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium"
              >
                {editFolderCategory.includes('NEET') ? (
                  <>
                    <option value="NEET Medical (PCB)">NEET Medical (PCB)</option>
                    <option value="NEET Dropper Batch">NEET Dropper / Repeater Batch</option>
                    <option value="NEET Class 11 Foundation">NEET Class 11 Foundation</option>
                    <option value="NEET Class 12 Target">NEET Class 12 Target</option>
                  </>
                ) : editFolderCategory.includes('CTET') ? (
                  <>
                    <option value="CTET Paper 1 (Primary 1-5)">CTET Paper 1 (Primary 1-5)</option>
                    <option value="CTET Paper 2 (Maths & Science)">CTET Paper 2 (Maths & Science)</option>
                    <option value="CTET Paper 2 (Social Studies)">CTET Paper 2 (Social Studies)</option>
                    <option value="CTET Both Papers (Paper 1 & 2)">CTET Both Papers (Paper 1 & 2)</option>
                  </>
                ) : (
                  <>
                    <option value="Electrician">Electrician</option>
                    <option value="Fitter">Fitter</option>
                    <option value="Welder">Welder</option>
                    <option value="COPA">COPA (Computer Operator)</option>
                    <option value="Wireman">Wireman</option>
                    <option value="Electronic Mechanic">Electronic Mechanic</option>
                    <option value="Mechanic Motor Vehicle">Mechanic Motor Vehicle (MMV)</option>
                    <option value="Turner">Turner</option>
                    <option value="Machinist">Machinist</option>
                    <option value="Draughtsman Civil">Draughtsman Civil</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Refrigeration & AC">Refrigeration & AC (RAC)</option>
                    <option value="General">General / All Trades</option>
                  </>
                )}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Folder Details
            </button>
          </form>
        </div>
      )}

      {/* Move Question Modal */}
      {moveQuestionId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Move Question to Folder</span>
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Select Destination Folder
              </label>
              <select
                value={moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="root">📁 Root Directory (Unassigned)</option>
                {folders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    📁 {f.path || f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoveQuestionId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveQuestion}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Move Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <form onSubmit={handleSaveQuestion} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {questionToEdit ? 'Edit Question' : 'Add Question to Question Bank'}
              </h3>
              <button type="button" onClick={() => setShowQuestionModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Question Text *
              </label>
              <textarea
                required
                rows={2}
                placeholder="Enter question text..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="w-full text-xs p-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Chapter</label>
                <input
                  type="text"
                  value={qChapter}
                  onChange={(e) => setQChapter(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Difficulty</label>
                <select
                  value={qDifficulty}
                  onChange={(e) => setQDifficulty(e.target.value as any)}
                  className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase text-slate-400">
                Options &amp; Correct Answer
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Option A *"
                  value={optA}
                  onChange={(e) => setOptA(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
                <input
                  type="text"
                  required
                  placeholder="Option B *"
                  value={optB}
                  onChange={(e) => setOptB(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
                <input
                  type="text"
                  placeholder="Option C"
                  value={optC}
                  onChange={(e) => setOptC(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
                <input
                  type="text"
                  placeholder="Option D"
                  value={optD}
                  onChange={(e) => setOptD(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Correct Option *
              </label>
              <select
                value={correctOpt}
                onChange={(e) => setCorrectOpt(e.target.value as any)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold"
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Explanation / Solution
              </label>
              <input
                type="text"
                placeholder="Optional explanation for students..."
                value={qExplanation}
                onChange={(e) => setQExplanation(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Question
            </button>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTarget && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[800] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-white">
                Delete {deleteModalTarget.type === 'folder' ? 'Folder' : 'Question'}?
              </h3>
              <p className="text-xs text-slate-300 font-bold mt-1 line-clamp-2">
                "{deleteModalTarget.name}"
              </p>

              {deleteModalTarget.type === 'folder' && (() => {
                const descendantIds = getDescendantFolderIds(deleteModalTarget.id);
                const containedQsCount = questions.filter((q) => q.folder_id && descendantIds.includes(q.folder_id)).length;
                return (
                  <div className="space-y-3 text-left pt-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                      <p className="text-[11px] font-bold text-slate-300">
                        This folder contains <span className="text-amber-400 font-extrabold">{containedQsCount} question(s)</span> and <span className="text-amber-400 font-extrabold">{descendantIds.length - 1} subfolder(s)</span>.
                      </p>
                      
                      <div className="space-y-2 pt-1">
                        <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-red-900/50 bg-red-950/30 cursor-pointer hover:bg-red-950/50 transition">
                          <input
                            type="radio"
                            name="deleteOption"
                            checked={deleteWithContents}
                            onChange={() => setDeleteWithContents(true)}
                            className="mt-0.5 text-red-500 focus:ring-red-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-red-300">Delete Folder AND All {containedQsCount} Questions</p>
                            <p className="text-[10px] text-red-400/80">Recommended. Permanently removes folder and all questions inside.</p>
                          </div>
                        </label>

                        <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 cursor-pointer hover:bg-slate-800 transition">
                          <input
                            type="radio"
                            name="deleteOption"
                            checked={!deleteWithContents}
                            onChange={() => setDeleteWithContents(false)}
                            className="mt-0.5 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-200">Delete Folder Only (Keep Questions in Root)</p>
                            <p className="text-[10px] text-slate-400">Questions will revert to Root directory.</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAction}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Questions Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[800] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-white">
                Delete {selectedQuestionIds.length} Selected Questions?
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Are you sure you want to permanently delete these {selectedQuestionIds.length} selected question(s)? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteQuestions}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedQuestionIds.length} Items`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Selected Questions Modal */}
      {bulkMoveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[800] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Move {selectedQuestionIds.length} Questions
                </h3>
                <p className="text-xs text-slate-400">
                  Select destination folder
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Target Folder
              </label>
              <select
                value={bulkMoveTargetFolderId}
                onChange={(e) => setBulkMoveTargetFolderId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="root">📁 Root (All Questions)</option>
                {folders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    📁 {f.name} ({f.trade || f.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkMoveModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkMoveQuestions}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Moving...' : 'Move Questions'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
