import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, DEMO_USERS, INITIAL_TESTS, safeGetDocs, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, Test, TestAttempt } from '../types';
import { 
  UserCheck, 
  Users, 
  PlusCircle, 
  Trash2, 
  FileCheck2, 
  BarChart2, 
  UserPlus, 
  CheckCircle2, 
  XCircle,
  FileText,
  Search
} from 'lucide-react';

interface TeacherDashboardProps {
  onOpenQuizMaker: () => void;
  onOpenStudentAnalytics: (studentName: string, rollNo: string) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  onOpenQuizMaker,
  onOpenStudentAnalytics
}) => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'students' | 'tests' | 'results'>('students');
  const [loading, setLoading] = useState<boolean>(true);

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);

  // Add Student Form
  const [showAddStudent, setShowAddStudent] = useState<boolean>(false);
  const [stuName, setStuName] = useState<string>('');
  const [stuEmail, setStuEmail] = useState<string>('');
  const [stuRoll, setStuRoll] = useState<string>('');
  const [stuTrade, setStuTrade] = useState<string>(profile?.trade || 'Electrician');
  const [stuClass, setStuClass] = useState<string>('Sem 1');

  const [studentSearch, setStudentSearch] = useState<string>('');

  const teacherId = profile?.uid || 'demo_teacher_electrician';
  const tenantId = profile?.tenant_id || 'tenant_govt_iti';

  const fetchData = async () => {
    setLoading(true);
    try {
      const allUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
      setStudents(allUsers.filter((u) => u.role === 'student'));

      const allTests = await safeGetDocs<Test>('tests', INITIAL_TESTS);
      setTests(allTests);

      const allAttempts = await safeGetDocs<TestAttempt>('test_attempts', []);
      setAttempts(allAttempts);
    } catch (err) {
      console.warn('Teacher fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [teacherId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stuName || !stuEmail || !stuRoll) return;

    const studentUid = `student_${Date.now()}`;
    const newStudent: UserProfile = {
      uid: studentUid,
      email: stuEmail,
      name: stuName,
      role: 'student',
      tenant_id: tenantId,
      teacher_id: teacherId,
      principal_id: profile?.principal_id,
      rollNo: stuRoll,
      trade: stuTrade,
      className: stuClass,
      createdAt: new Date().toISOString()
    };

    try {
      await safeSetDoc('users', studentUid, 'uid', newStudent);
      setStudents([...students, newStudent]);
      setShowAddStudent(false);
      setStuName('');
      setStuEmail('');
      setStuRoll('');
    } catch (err) {
      console.error('Add student error:', err);
    }
  };

  const handleDeleteStudent = async (uid: string) => {
    try {
      await safeDeleteDoc('users', uid, 'uid');
      setStudents(students.filter((s) => s.uid !== uid));
    } catch (err) {
      console.error('Delete student error:', err);
    }
  };

  const myStudents = students.filter((s) => {
    // 1. Explicit teacher assignment
    if (s.teacher_id && s.teacher_id === teacherId) return true;
    if (s.teacher_name && profile?.name && s.teacher_name.toLowerCase() === profile.name.toLowerCase()) return true;

    // 2. Same tenant and trade
    if (tenantId && s.tenant_id === tenantId) {
      if (!profile?.trade || s.trade === profile.trade) return true;
    }

    // Fallback if no explicit filters set
    return true;
  });

  const filteredStudents = myStudents.filter((s) => {
    return (
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Teacher Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
              👨‍🏫 Instructor / Teacher Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile?.name || 'Er. Anil Kumar'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Discipline: <span className="font-bold text-emerald-300">{profile?.trade || 'Electrician Trade'}</span> • Managing Student Batches &amp; Tests
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenQuizMaker}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Mock Test</span>
            </button>
            <button
              onClick={() => setShowAddStudent(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-white/10 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'students' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          🎓 Batch Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'tests' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          📝 My Mock Tests ({tests.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'results' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          📊 Results &amp; Analytics ({attempts.length})
        </button>
      </div>

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students in assigned batch..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              />
            </div>

            <button
              onClick={() => setShowAddStudent(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Student Gmail ID</span>
            </button>
          </div>

          {showAddStudent && (
            <form onSubmit={handleAddStudent} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg animate-fade-in">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Student to Batch</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Student Full Name</label>
                  <input
                    type="text"
                    required
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    placeholder="Rahul Verma"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Student Gmail ID</label>
                  <input
                    type="email"
                    required
                    value={stuEmail}
                    onChange={(e) => setStuEmail(e.target.value)}
                    placeholder="student.rahul@gmail.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={stuRoll}
                    onChange={(e) => setStuRoll(e.target.value)}
                    placeholder="2026001"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudent(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Add Student
                </button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Roll No</th>
                  <th className="p-3.5">Trade / Class</th>
                  <th className="p-3.5">Gmail ID</th>
                  <th className="p-3.5 text-right">Analytics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((s) => (
                  <tr key={s.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                    <td className="p-3.5 font-mono text-emerald-600">{s.rollNo || '2026001'}</td>
                    <td className="p-3.5">{s.trade || 'Electrician'} - {s.className || 'Sem 1'}</td>
                    <td className="p-3.5 text-slate-500">{s.email}</td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => onOpenStudentAnalytics(s.name, s.rollNo || '2026001')}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(s.uid)}
                        className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TESTS TAB */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Mock &amp; Practice Tests ({tests.length})</h2>
            <button
              onClick={onOpenQuizMaker}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Test</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((t) => (
              <div key={t.test_id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <span className="text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full">
                  {t.mode === 'exam' ? 'Mock Exam' : 'Practice Mode'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</h3>
                <p className="text-xs text-slate-500">{t.duration_minutes} min • {t.question_ids ? t.question_ids.length : 0} Questions • Pass {t.passing_marks}%</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Student Submissions &amp; Attempts ({attempts.length})</h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Roll No</th>
                  <th className="p-3.5">Test</th>
                  <th className="p-3.5">Score</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map((a) => (
                  <tr key={a.attempt_id}>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{a.student_name}</td>
                    <td className="p-3.5 font-mono">{a.roll_no}</td>
                    <td className="p-3.5">{a.test_title}</td>
                    <td className="p-3.5 font-bold text-blue-600">{a.percentage.toFixed(1)}%</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${a.status === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{a.submitted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
