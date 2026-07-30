import React, { useState } from 'react';
import { Test, TestFolder } from '../types';
import { safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { 
  Folder, 
  FolderPlus, 
  FolderOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  ChevronRight, 
  ArrowRightLeft, 
  FileCheck2,
  Clock,
  Sparkles,
  X,
  PlayCircle,
  ToggleLeft,
  ToggleRight,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';

interface TestFolderManagerProps {
  tests: Test[];
  testFolders: TestFolder[];
  onOpenQuizMaker: (testToEdit?: Test | null) => void;
  onRefreshData: () => void;
}

export const TestFolderManager: React.FC<TestFolderManagerProps> = ({
  tests,
  testFolders,
  onOpenQuizMaker,
  onRefreshData
}) => {
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderCategory, setNewFolderCategory] = useState<string>('⚡ ITI (NCVT) (Trade Theory CBT)');
  const [newFolderTrade, setNewFolderTrade] = useState<string>('Electrician');

  // Edit Folder Modal State
  const [showEditFolderModal, setShowEditFolderModal] = useState<boolean>(false);
  const [folderToEdit, setFolderToEdit] = useState<TestFolder | null>(null);
  const [editFolderName, setEditFolderName] = useState<string>('');
  const [editFolderCategory, setEditFolderCategory] = useState<string>('⚡ ITI (NCVT) (Trade Theory CBT)');
  const [editFolderTrade, setEditFolderTrade] = useState<string>('Electrician');

  // Move Test Modal State
  const [moveTestId, setMoveTestId] = useState<string | null>(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('root');

  // Delete Modal State
  const [deleteModalTarget, setDeleteModalTarget] = useState<{
    type: 'folder' | 'test';
    id: string;
    name: string;
  } | null>(null);
  const [deleteWithContents, setDeleteWithContents] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Bulk actions state
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState<boolean>(false);
  const [bulkMoveTargetFolderId, setBulkMoveTargetFolderId] = useState<string>('root');
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState<boolean>(false);

  // Breadcrumb Calculation
  const getBreadcrumbs = () => {
    const path: { id: string | null; name: string }[] = [{ id: null, name: 'Root (All Tests)' }];
    if (!currentFolderId) return path;

    let curr: TestFolder | undefined = testFolders.find((f) => f.folder_id === currentFolderId);
    const stack: { id: string; name: string }[] = [];

    while (curr) {
      stack.unshift({ id: curr.folder_id, name: curr.name });
      curr = testFolders.find((f) => f.folder_id === curr?.parent_id);
    }

    return [...path, ...stack];
  };

  const currentFolder = testFolders.find((f) => f.folder_id === currentFolderId);

  // Filter Subfolders in current folder
  const subfolders = testFolders.filter((f) => {
    if (currentFolderId === null) {
      return f.parent_id === null || f.parent_id === 'root';
    }
    return f.parent_id === currentFolderId;
  });

  // Filter Tests in current folder or search globally
  const currentTests = tests.filter((t) => {
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(qLower) ||
        (t.trade_class && t.trade_class.toLowerCase().includes(qLower)) ||
        (t.teacher_name && t.teacher_name.toLowerCase().includes(qLower))
      );
    }

    if (currentFolderId === null) {
      return !t.folder_id || t.folder_id === 'root';
    }
    return t.folder_id === currentFolderId;
  });

  // Create Test Folder
  const handleCreateTestFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newId = `tfolder_${Date.now()}`;
    const parentFolder = testFolders.find((f) => f.folder_id === currentFolderId);
    const parentPath = parentFolder ? parentFolder.path : '';
    const fullPath = `${parentPath}/${newFolderName.trim()}`;

    const newFolderObj: TestFolder = {
      folder_id: newId,
      name: newFolderName.trim(),
      parent_id: currentFolderId,
      path: fullPath,
      category: newFolderCategory,
      trade: newFolderTrade,
      createdAt: new Date().toISOString()
    };

    try {
      await safeSetDoc('test_folders', newId, 'folder_id', newFolderObj);
      setShowNewFolderModal(false);
      setNewFolderName('');
      onRefreshData();
    } catch (err) {
      console.error('Create test folder error:', err);
    }
  };

  // Edit Test Folder
  const handleOpenEditFolder = (f: TestFolder) => {
    setFolderToEdit(f);
    setEditFolderName(f.name);
    setEditFolderCategory(f.category || '⚡ ITI (NCVT) (Trade Theory CBT)');
    setEditFolderTrade(f.trade || 'Electrician');
    setShowEditFolderModal(true);
  };

  const handleSaveEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderToEdit || !editFolderName.trim()) return;

    const updatedFolder: TestFolder = {
      ...folderToEdit,
      name: editFolderName.trim(),
      category: editFolderCategory,
      trade: editFolderTrade
    };

    try {
      await safeSetDoc('test_folders', folderToEdit.folder_id, 'folder_id', updatedFolder);
      setShowEditFolderModal(false);
      setFolderToEdit(null);
      onRefreshData();
    } catch (err) {
      console.error('Edit test folder error:', err);
    }
  };

  // Helper to calculate all descendant test folder IDs recursively
  const getDescendantFolderIds = (startFolderId: string): string[] => {
    const result: string[] = [startFolderId];
    const queue = [startFolderId];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      const children = testFolders.filter((f) => f.parent_id === parent);
      for (const child of children) {
        result.push(child.folder_id);
        queue.push(child.folder_id);
      }
    }
    return result;
  };

  // Delete Test Folder
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    setDeleteWithContents(true);
    setDeleteModalTarget({ type: 'folder', id: folderId, name: folderName });
  };

  // Delete Test
  const handleDeleteTest = (testId: string, title?: string) => {
    setDeleteModalTarget({ type: 'test', id: testId, name: title || 'this test' });
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
          // Delete all tests in target folder tree
          const testsToDelete = tests.filter((t) => t.folder_id && targetFolderIds.includes(t.folder_id));
          for (const t of testsToDelete) {
            await safeDeleteDoc('tests', t.test_id, 'test_id');
          }
          // Delete all descendant folders and the folder itself
          for (const fId of targetFolderIds) {
            await safeDeleteDoc('test_folders', fId, 'folder_id');
          }
        } else {
          // Reassign tests in this folder to root
          const affectedTests = tests.filter((t) => t.folder_id === id);
          for (const t of affectedTests) {
            const { folder_id, ...rest } = t;
            await safeSetDoc('tests', t.test_id, 'test_id', rest);
          }
          await safeDeleteDoc('test_folders', id, 'folder_id');
        }
      } else if (type === 'test') {
        await safeDeleteDoc('tests', id, 'test_id');
      }
      setDeleteModalTarget(null);
      setSelectedTestIds([]);
      onRefreshData();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute Bulk Delete Selected Tests
  const handleBulkDeleteTests = async () => {
    if (selectedTestIds.length === 0) return;
    setIsDeleting(true);
    try {
      for (const tId of selectedTestIds) {
        await safeDeleteDoc('tests', tId, 'test_id');
      }
      setSelectedTestIds([]);
      setBulkDeleteModalOpen(false);
      onRefreshData();
    } catch (err) {
      console.error('Bulk delete tests error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Execute Bulk Move Selected Tests
  const handleBulkMoveTests = async () => {
    if (selectedTestIds.length === 0) return;
    setIsDeleting(true);
    try {
      const targetFolderVal = bulkMoveTargetFolderId === 'root' ? undefined : bulkMoveTargetFolderId;
      for (const tId of selectedTestIds) {
        const t = tests.find((item) => item.test_id === tId);
        if (t) {
          await safeSetDoc('tests', tId, 'test_id', { ...t, folder_id: targetFolderVal });
        }
      }
      setSelectedTestIds([]);
      setBulkMoveModalOpen(false);
      onRefreshData();
    } catch (err) {
      console.error('Bulk move tests error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection helpers
  const isAllSelected = currentTests.length > 0 && currentTests.every((t) => selectedTestIds.includes(t.test_id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTestIds([]);
    } else {
      setSelectedTestIds(currentTests.map((t) => t.test_id));
    }
  };

  const toggleSelectTest = (tId: string) => {
    setSelectedTestIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId]
    );
  };

  // Toggle Test Active/Inactive
  const handleToggleStatus = async (testItem: Test) => {
    const newStatus = testItem.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await safeSetDoc('tests', testItem.test_id, 'test_id', { ...testItem, status: newStatus });
      onRefreshData();
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // Move Test to another Folder
  const handleMoveTest = async () => {
    if (!moveTestId) return;
    const targetTest = tests.find((t) => t.test_id === moveTestId);
    if (!targetTest) return;

    const newFolderVal = moveTargetFolderId === 'root' ? undefined : moveTargetFolderId;
    const updatedTest = { ...targetTest, folder_id: newFolderVal };

    try {
      await safeSetDoc('tests', moveTestId, 'test_id', updatedTest);
      setMoveTestId(null);
      onRefreshData();
    } catch (err) {
      console.error('Move test error:', err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Test Folders &amp; Assessments</h2>
            <p className="text-xs text-slate-400">
              {tests.length} Total Tests organized across {testFolders.length} Folders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            <span>New Test Folder</span>
          </button>

          <button
            onClick={() => onOpenQuizMaker(null)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Test</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-xs overflow-x-auto custom-scrollbar">
        {getBreadcrumbs().map((b, idx, arr) => (
          <React.Fragment key={b.id || 'root'}>
            <button
              onClick={() => setCurrentFolderId(b.id)}
              className={`font-bold flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-pointer shrink-0 ${
                b.id === currentFolderId ? 'text-indigo-400' : 'text-slate-400'
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
          placeholder="Search test title, trade, or instructor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
      </div>

      {/* Subfolders Grid */}
      {!searchQuery && subfolders.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Test Folders ({subfolders.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subfolders.map((f) => {
              const testsInFolder = tests.filter((t) => t.folder_id === f.folder_id);
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
                    <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-110 transition-transform">
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
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors mt-0.5">
                        {f.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {testsInFolder.length} Tests
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditFolder(f);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer"
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

      {/* Tests Grid */}
      <div className="space-y-3">
        {/* Batch Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Select All ({currentTests.length})</span>
            </label>
            <span className="text-slate-700">|</span>
            <p className="text-xs font-medium text-slate-400">
              Tests in <span className="text-white font-bold">{currentFolder ? currentFolder.name : 'Root'}</span> ({currentTests.length})
            </p>
          </div>

          {selectedTestIds.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap animate-fade-in">
              <span className="text-xs font-extrabold text-indigo-400 bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-800/80">
                {selectedTestIds.length} Selected
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
                <span>Delete Selected ({selectedTestIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTestIds([])}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-xl transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {currentTests.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-400">No tests found in this folder.</p>
            <p className="text-[11px] text-slate-500">
              Click "Create New Test" above to generate a mock test or practice set.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentTests.map((testItem) => {
              const isSelected = selectedTestIds.includes(testItem.test_id);
              return (
                <div
                  key={testItem.test_id}
                  className={`bg-slate-900 border hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between ${
                    isSelected ? 'border-indigo-500/80 bg-slate-900/90 shadow-md ring-1 ring-indigo-500/30' : 'border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTest(testItem.test_id)}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                          {testItem.trade_class || 'Electrician'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(testItem)}
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 cursor-pointer ${
                          testItem.status === 'Active'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {testItem.status === 'Active' ? <ToggleRight className="w-3.5 h-3.5 text-emerald-400" /> : <ToggleLeft className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{testItem.status}</span>
                      </button>
                    </div>

                  <h3 className="text-sm font-bold text-white leading-snug">
                    {testItem.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{testItem.duration_minutes} Mins</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>{testItem.question_ids?.length || 0} Questions</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setMoveTestId(testItem.test_id);
                        setMoveTargetFolderId(testItem.folder_id || 'root');
                      }}
                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Move test to another folder"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onOpenQuizMaker(testItem)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Edit test parameters"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTest(testItem.test_id, testItem.title)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete test"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {testItem.test_id.slice(-6)}
                  </span>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Create Test Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleCreateTestFolder} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>Create New Test Folder</span>
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
                placeholder="e.g. Electrician Semester 1 Exams"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Create Test Folder
            </button>
          </form>
        </div>
      )}

      {/* Edit Test Folder Modal */}
      {showEditFolderModal && folderToEdit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSaveEditFolder} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Rename / Edit Test Folder</span>
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
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Save Folder Details
            </button>
          </form>
        </div>
      )}

      {/* Move Test Modal */}
      {moveTestId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>Move Test to Folder</span>
            </h3>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Select Destination Test Folder
              </label>
              <select
                value={moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="root">📁 Root Directory (Unassigned)</option>
                {testFolders.map((f) => (
                  <option key={f.folder_id} value={f.folder_id}>
                    📁 {f.path || f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMoveTestId(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMoveTest}
                className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Move Now
              </button>
            </div>
          </div>
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
                Delete {deleteModalTarget.type === 'folder' ? 'Test Folder' : 'Test'}?
              </h3>
              <p className="text-xs text-slate-300 font-bold mt-1 line-clamp-2">
                "{deleteModalTarget.name}"
              </p>

              {deleteModalTarget.type === 'folder' && (() => {
                const descendantIds = getDescendantFolderIds(deleteModalTarget.id);
                const containedTestsCount = tests.filter((t) => t.folder_id && descendantIds.includes(t.folder_id)).length;
                return (
                  <div className="space-y-3 text-left pt-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                      <p className="text-[11px] font-bold text-slate-300">
                        This folder contains <span className="text-amber-400 font-extrabold">{containedTestsCount} test(s)</span> and <span className="text-amber-400 font-extrabold">{descendantIds.length - 1} subfolder(s)</span>.
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
                            <p className="text-xs font-extrabold text-red-300">Delete Folder AND All {containedTestsCount} Tests</p>
                            <p className="text-[10px] text-red-400/80">Recommended. Permanently removes folder and all tests inside.</p>
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
                            <p className="text-xs font-bold text-slate-200">Delete Folder Only (Keep Tests in Root)</p>
                            <p className="text-[10px] text-slate-400">Tests will revert to Root directory.</p>
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

      {/* Bulk Delete Selected Tests Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[800] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-white">
                Delete {selectedTestIds.length} Selected Tests?
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Are you sure you want to permanently delete these {selectedTestIds.length} selected test(s)? This action cannot be undone.
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
                onClick={handleBulkDeleteTests}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedTestIds.length} Items`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Move Selected Tests Modal */}
      {bulkMoveModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[800] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Move {selectedTestIds.length} Tests
                </h3>
                <p className="text-xs text-slate-400">
                  Select destination test folder
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                Target Test Folder
              </label>
              <select
                value={bulkMoveTargetFolderId}
                onChange={(e) => setBulkMoveTargetFolderId(e.target.value)}
                className="w-full text-xs px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="root">📁 Root (All Tests)</option>
                {testFolders.map((f) => (
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
                onClick={handleBulkMoveTests}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Moving...' : 'Move Tests'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
