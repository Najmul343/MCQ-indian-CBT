import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, DEMO_USERS, DEMO_TENANTS, INITIAL_TESTS, safeGetDocs, safeSetDoc, safeDeleteDoc } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserProfile, Tenant, Test, TestAttempt } from '../types';
import { EditUserModal } from './EditUserModal';
import { BulkUserOnboardModal } from './BulkUserOnboardModal';
import { StudentAnalyticsModal } from './StudentAnalyticsModal';
import { 
  School, 
  Users, 
  Award, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  Trash2, 
  Search,
  ShieldAlert,
  FileText,
  Upload,
  Edit3,
  Copy,
  Check,
  Plus,
  BookOpen,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

export const PrincipalDashboard: React.FC = () => {
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'students' | 'tests' | 'integrity'>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  const [teachers, setTeachers] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>(DEMO_TENANTS);

  // Student Analytics Modal State
  const [selectedStudentForAnalytics, setSelectedStudentForAnalytics] = useState<{ name: string; rollNo: string } | null>(null);

  // Modals for seamless CRUD & Bulk Onboarding
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);
  const [defaultRoleForModal, setDefaultRoleForModal] = useState<'teacher' | 'student'>('teacher');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [copiedJoinCode, setCopiedJoinCode] = useState(false);

  // Quick add teacher state
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherTrade, setTeacherTrade] = useState('Electrician');

  const tenantId = profile?.tenant_id || 'tenant_govt_iti';
  const currentTenant = tenants.find((t) => t.tenant_id === tenantId) || tenants[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedTenants = await safeGetDocs<Tenant>('tenants', DEMO_TENANTS);
      setTenants(fetchedTenants);

      const allUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
      setTeachers(allUsers.filter((u) => u.role === 'teacher' && (u.tenant_id === tenantId || !u.tenant_id)));
      setStudents(allUsers.filter((u) => u.role === 'student' && (u.tenant_id === tenantId || !u.tenant_id)));

      const allAttempts = await safeGetDocs<TestAttempt>('test_attempts', []);
      setAttempts(allAttempts);

      const allTests = await safeGetDocs<Test>('tests', INITIAL_TESTS);
      setTests(allTests);
    } catch (err) {
      console.warn('Principal fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const copyCode = () => {
    const code = currentTenant?.join_code || currentTenant?.code || 'GITI-DEL';
    navigator.clipboard.writeText(code);
    setCopiedJoinCode(true);
    setTimeout(() => setCopiedJoinCode(false), 2000);
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !teacherEmail) return;

    const teacherUid = `teacher_${Date.now()}`;
    const newTeacher: UserProfile = {
      uid: teacherUid,
      email: teacherEmail,
      name: teacherName,
      role: 'teacher',
      tenant_id: tenantId,
      principal_id: profile?.uid,
      trade: teacherTrade,
      createdAt: new Date().toISOString()
    };

    try {
      await safeSetDoc('users', teacherUid, 'uid', newTeacher);
      setTeachers([...teachers, newTeacher]);
      setShowAddTeacher(false);
      setTeacherName('');
      setTeacherEmail('');
    } catch (err) {
      console.error('Add teacher error:', err);
    }
  };

  const handleDeleteTeacher = async (uid: string) => {
    try {
      await safeDeleteDoc('users', uid, 'uid');
      setTeachers(teachers.filter((t) => t.uid !== uid));
    } catch (err) {
      console.error('Delete teacher error:', err);
    }
  };

  const totalAttempts = attempts.length;
  const passedCount = attempts.filter((a) => a.status === 'PASS').length;
  const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
  const avgScore = totalAttempts > 0 ? Math.round(attempts.reduce((s, a) => s + a.percentage, 0) / totalAttempts) : 0;

  const integrityViolations = attempts.filter((a) => a.fs_violations > 0 || a.tab_switches > 1);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Principal Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-blue-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-blue-500/30 text-blue-300 border border-blue-400/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
              🏫 Principal ERP Dashboard
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {profile?.name || 'Dr. Rajesh Sharma'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Institution Command &amp; Faculty Management Center • Tenant ID: <span className="font-mono text-blue-300">{tenantId}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Student Self-Join Code Display Banner */}
            <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20 flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase font-bold text-blue-200">Student Self-Join Code</div>
                <div className="text-sm font-black font-mono tracking-wider text-amber-300">
                  {currentTenant?.join_code || currentTenant?.code || 'GITI-DEL'}
                </div>
              </div>
              <button
                onClick={copyCode}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition text-white"
                title="Copy Join Code for Students"
              >
                {copiedJoinCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => {
                setUserToEdit(null);
                setDefaultRoleForModal('teacher');
                setIsUserModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Instructor</span>
            </button>

            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Bulk CSV Onboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          📊 Institution Overview
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'teachers' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          👨‍🏫 Faculty Instructors ({teachers.length})
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'students' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          🎓 Enrolled Students ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'integrity' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          🛡 Invigilation &amp; Integrity ({integrityViolations.length})
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Faculty Teachers</div>
              <div className="text-2xl font-black text-blue-600 mt-1">{teachers.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Assigned</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Students</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{students.length}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Enrolled</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Pass Rate</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">{passRate}%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Institution Average</div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Average Score</div>
              <div className="text-2xl font-black text-amber-600 mt-1">{avgScore}%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mock Test Avg</div>
            </div>
          </div>

          {/* Trade-wise & Department LMS Performance Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Trade &amp; Department Performance Analytics</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Principal view of class-wise student engagement, average test scores, and assigned faculty
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Trade / Discipline</th>
                    <th className="p-3">Assigned Faculty</th>
                    <th className="p-3 text-center">Students</th>
                    <th className="p-3 text-center">Test Attempts</th>
                    <th className="p-3 text-center">Avg Marks</th>
                    <th className="p-3 text-right">Pass Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(currentTenant?.trades_offered || ['Electrician', 'Fitter', 'Welder', 'COPA', 'Wireman']).map((tr) => {
                    const tradeStudents = students.filter((s) => s.trade === tr || (!s.trade && tr === 'Electrician'));
                    const tradeTeachers = teachers.filter((t) => t.trade === tr);
                    const tradeAttempts = attempts.filter((a) => a.trade === tr || tradeStudents.some((s) => s.email === a.student_email));
                    const tradePassed = tradeAttempts.filter((a) => a.status === 'PASS').length;
                    const tradePassRate = tradeAttempts.length > 0 ? Math.round((tradePassed / tradeAttempts.length) * 100) : 0;
                    const tradeAvgScore = tradeAttempts.length > 0 ? Math.round(tradeAttempts.reduce((acc, a) => acc + a.percentage, 0) / tradeAttempts.length) : 0;

                    return (
                      <tr key={tr} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                          <span>{tr}</span>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {tradeTeachers.length > 0
                            ? tradeTeachers.map((t) => t.name).join(', ')
                            : 'Unassigned'}
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-600">{tradeStudents.length}</td>
                        <td className="p-3 text-center font-mono">{tradeAttempts.length}</td>
                        <td className="p-3 text-center font-bold text-amber-600">{tradeAvgScore}%</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tradePassRate >= 70 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tradePassRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHERS TAB */}
      {activeTab === 'teachers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Assigned Instructors ({teachers.length})</h2>
            <button
              onClick={() => setShowAddTeacher(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Instructor</span>
            </button>
          </div>

          {showAddTeacher && (
            <form onSubmit={handleAddTeacher} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <h3 className="text-sm font-bold">Register New Instructor</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Er. Ramesh Chand"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="ramesh@govt-iti.edu.in"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Trade / Discipline</label>
                  <input
                    type="text"
                    value={teacherTrade}
                    onChange={(e) => setTeacherTrade(e.target.value)}
                    placeholder="Electrician / Fitter"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  Save Teacher
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teachers.map((t) => (
              <div key={t.uid} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>{t.name}</span>
                      {t.status === 'inactive' && (
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">{t.email}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-1">Trade: {t.trade || 'General'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setUserToEdit(t);
                        setDefaultRoleForModal('teacher');
                        setIsUserModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                      title="Edit Instructor"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(t.uid)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                      title="Delete Instructor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Enrolled Students ({students.length})</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setUserToEdit(null);
                  setDefaultRoleForModal('student');
                  setIsUserModalOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard Student</span>
              </button>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import CSV</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Roll No</th>
                  <th className="p-3.5">Trade / Class</th>
                  <th className="p-3.5">Assigned Teacher</th>
                  <th className="p-3.5">Gmail ID</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((s) => {
                  const assignedTeacher = teachers.find((t) => t.uid === s.teacher_id || t.name === s.teacher_name);

                  return (
                    <tr key={s.uid}>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                      <td className="p-3.5 font-mono">{s.rollNo || '2026001'}</td>
                      <td className="p-3.5">{s.trade || 'Electrician'} - {s.className || 'Sem 1'}</td>
                      <td className="p-3.5 font-medium text-blue-600 dark:text-blue-400">
                        {assignedTeacher ? assignedTeacher.name : (s.teacher_name || 'Unassigned')}
                      </td>
                      <td className="p-3.5 text-slate-500">{s.email}</td>
                      <td className="p-3.5 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedStudentForAnalytics({ name: s.name, rollNo: s.rollNo || '2026001' })}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                        >
                          Analytics
                        </button>
                        <button
                          onClick={() => {
                            setUserToEdit(s);
                            setDefaultRoleForModal('student');
                            setIsUserModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                          title="Edit Student Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Remove student ${s.name}?`)) {
                              await safeDeleteDoc('users', s.uid, 'uid');
                              setStudents(students.filter((st) => st.uid !== s.uid));
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INTEGRITY TAB */}
      {activeTab === 'integrity' && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Invigilation Security Flags ({integrityViolations.length})</h2>
          {integrityViolations.length === 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 text-center text-emerald-800 dark:text-emerald-200 text-xs font-bold">
              ✅ Zero cheating violations reported across all attempts!
            </div>
          ) : (
            <div className="space-y-3">
              {integrityViolations.map((a) => (
                <div key={a.attempt_id} className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-4 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-red-900 dark:text-red-200">
                    <span>{a.student_name} ({a.roll_no})</span>
                    <span>Test: {a.test_title}</span>
                  </div>
                  <div className="text-red-700 dark:text-red-300">
                    Fullscreen Violations: <strong>{a.fs_violations}</strong> • Tab Switches: <strong>{a.tab_switches}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EditUserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSaved={fetchData}
        userToEdit={userToEdit}
        defaultRole={defaultRoleForModal}
        tenants={tenants}
        teachers={teachers}
      />

      <BulkUserOnboardModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImported={fetchData}
        tenants={tenants}
        defaultRole={defaultRoleForModal}
      />

      {selectedStudentForAnalytics && (
        <StudentAnalyticsModal
          isOpen={!!selectedStudentForAnalytics}
          studentName={selectedStudentForAnalytics.name}
          rollNo={selectedStudentForAnalytics.rollNo}
          onClose={() => setSelectedStudentForAnalytics(null)}
        />
      )}

    </div>
  );
};
