import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, DEMO_USERS, INITIAL_QUESTIONS, INITIAL_TESTS, safeGetDocs, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { UserProfile, Question, Test, TestAttempt, QuestionFolder, TestFolder } from '../types';
import { EditUserModal } from './EditUserModal';
import { BulkUserOnboardModal } from './BulkUserOnboardModal';
import { QuestionBankManager } from './QuestionBankManager';
import { TestFolderManager } from './TestFolderManager';
import { QuizMakerModal } from './QuizMakerModal';
import { 
  ShieldAlert, 
  Building2, 
  Users, 
  FileSpreadsheet, 
  BookOpen, 
  FileCheck2, 
  Activity, 
  Plus, 
  Trash2, 
  Edit3, 
  UserCheck, 
  Eye, 
  Search, 
  RefreshCw,
  School,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Upload,
  UserPlus
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onOpenSyncModal: () => void;
  onOpenQuizMaker: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onOpenSyncModal,
  onOpenQuizMaker
}) => {
  const { enterGhostMode, isGhostMode } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'questions' | 'tests' | 'attempts'>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // Firestore Data State
  const [users, setUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [questionFolders, setQuestionFolders] = useState<QuestionFolder[]>([]);
  const [testFolders, setTestFolders] = useState<TestFolder[]>([]);

  // Quiz Maker Modal & Edit State
  const [isQuizMakerModalOpen, setIsQuizMakerModalOpen] = useState<boolean>(false);
  const [testToEdit, setTestToEdit] = useState<Test | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const [isBulkUserModalOpen, setIsBulkUserModalOpen] = useState(false);

  // Search & Filter State
  const [userSearch, setUserSearch] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // Fetch Firestore Real Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
      setUsers(fetchedUsers);

      const fetchedQs = await safeGetDocs<Question>('questions', INITIAL_QUESTIONS);
      setQuestions(fetchedQs);

      const fetchedTests = await safeGetDocs<Test>('tests', INITIAL_TESTS);
      setTests(fetchedTests);

      const fetchedAtts = await safeGetDocs<TestAttempt>('test_attempts', []);
      setAttempts(fetchedAtts);

      const fetchedQFolders = await safeGetDocs<QuestionFolder>('question_folders', []);
      setQuestionFolders(fetchedQFolders);

      const fetchedTFolders = await safeGetDocs<TestFolder>('test_folders', []);
      setTestFolders(fetchedTFolders);
    } catch (err) {
      console.warn('Super Admin fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  // Delete Question
  const handleDeleteQuestion = async (qId: string) => {
    try {
      await safeDeleteDoc('questions', qId, 'question_id');
      setQuestions(questions.filter((q) => q.question_id !== qId));
    } catch (err) {
      console.error('Delete question error:', err);
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.rollNo && u.rollNo.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = 
      q.question_text.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.subject.toLowerCase().includes(questionSearch.toLowerCase()) ||
      q.chapter.toLowerCase().includes(questionSearch.toLowerCase());
    const matchesSubject = subjectFilter === 'all' || q.subject === subjectFilter;
    return matchesSearch && matchesSubject;
  });

  const uniqueSubjects = Array.from(new Set(questions.map((q) => q.subject))).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Super Admin Top Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-purple-500/20 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/30 text-purple-300 border border-purple-400/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Omnipotent Super Admin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Global Platform Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Cross-tenant administration, automated Google Sheets synchronization, global question bank management, and Ghost Mode master impersonation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenSyncModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>One-Click Sheets Sync</span>
            </button>
            <button
              onClick={fetchData}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-white/10 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Global Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Users &amp; Ghost Mode ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Question Bank ({questions.length})
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'tests'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" /> Active Tests ({tests.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Users</div>
              <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">{users.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Total Accounts</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</div>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                {users.filter((u) => u.role === 'student').length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Active Candidates</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Question Bank</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{questions.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Global Questions</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Tests</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{tests.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Published Mock Tests</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {users.filter((u) => u.role === 'student').length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Registered Learners</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{questions.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Firestore Bank</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attempts</div>
              <div className="text-2xl font-black text-pink-600 dark:text-pink-400 mt-1">{attempts.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Total Submissions</div>
            </div>
          </div>

          {/* Quick Actions & Ghost Mode Quick Impersonate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Quick Impersonation Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-xl text-amber-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Ghost Mode Quick Impersonate
                    </h3>
                    <p className="text-xs text-slate-500">
                      Log into any profile instantly without password verification
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {users.slice(0, 5).map((usr) => (
                  <div 
                    key={usr.uid}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{usr.name}</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full uppercase">
                          {usr.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{usr.email}</div>
                    </div>

                    <button
                      onClick={() => enterGhostMode(usr)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Impersonate ⚠️</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sheets Sync Control Box */}
            <div className="bg-gradient-to-br from-emerald-900/10 to-teal-900/10 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Google Sheets Real-time Synchronizer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automated one-click sync from published Google Sheets into Firestore
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Connect your Google Sheets standard headers or extended columns. One click trigger executes optimized batch writes to Firestore questions collection.
              </p>

              <button
                onClick={onOpenSyncModal}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Google Sheets Sync Dialog</span>
              </button>
            </div>

          </div>
        </div>
      )}



      {/* TAB 3: USERS & GHOST MODE */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, email, roll number..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
              >
                <option value="all">All Roles ({users.length})</option>
                <option value="super_admin">Super Admins</option>
                <option value="principal">Principals</option>
                <option value="teacher">Teachers</option>
                <option value="student">Students</option>
              </select>

              <button
                onClick={() => {
                  setUserToEdit(null);
                  setIsUserModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard User</span>
              </button>

              <button
                onClick={() => setIsBulkUserModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">User</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Institution / Tenant</th>
                    <th className="p-3.5">Roll / Trade</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((usr) => (
                    <tr key={usr.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{usr.name}</span>
                          {usr.status === 'inactive' && (
                            <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{usr.email}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">
                          {usr.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-600 dark:text-slate-300">
                        {usr.tenant_name || (usr.tenant_id ? usr.tenant_id.replace('tenant_', '').toUpperCase() : 'Global Platform')}
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-300">
                        {usr.rollNo ? `${usr.rollNo} • ${usr.trade || ''}` : usr.trade || '—'}
                      </td>
                      <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setUserToEdit(usr);
                            setIsUserModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Edit User Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            await safeDeleteDoc('users', usr.uid, 'uid');
                            setUsers(users.filter((u) => u.uid !== usr.uid));
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => enterGhostMode(usr)}
                          className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Enter Ghost Mode Impersonation Session"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ghost ⚠️</span>
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

      {/* TAB 4: QUESTION BANK */}
      {activeTab === 'questions' && (
        <QuestionBankManager
          questions={questions}
          folders={questionFolders}
          onRefreshData={fetchData}
        />
      )}

      {/* TAB 5: ACTIVE TESTS */}
      {activeTab === 'tests' && (
        <TestFolderManager
          tests={tests}
          testFolders={testFolders}
          onOpenQuizMaker={(t) => {
            setTestToEdit(t || null);
            setIsQuizMakerModalOpen(true);
          }}
          onRefreshData={fetchData}
        />
      )}

      {/* Modals for User Onboarding & Quiz Maker */}
      <EditUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSaved={fetchData}
        userToEdit={userToEdit}
        defaultRole={userToEdit?.role || "student"}
        teachers={[]}
        testFolders={testFolders}
      />

      <BulkUserOnboardModal
        isOpen={isBulkUserModalOpen}
        onClose={() => setIsBulkUserModalOpen(false)}
        onImported={fetchData}
        defaultRole="student"
      />

      <QuizMakerModal
        isOpen={isQuizMakerModalOpen}
        onClose={() => {
          setIsQuizMakerModalOpen(false);
          setTestToEdit(null);
        }}
        testToEdit={testToEdit}
        testFolders={testFolders}
        onTestCreated={fetchData}
      />

    </div>
  );
};
