import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeGetDocs, safeSetDoc, safeDeleteDoc, INITIAL_TESTS, DEMO_USERS } from '../lib/firebase';
import { UserProfile, Test, TestFolder } from '../types';
import { 
  UserPlus, 
  Users, 
  Search, 
  CheckCircle2, 
  FolderCheck, 
  FolderPlus, 
  BookOpen, 
  Trash2, 
  Edit3, 
  Stethoscope, 
  Zap, 
  BookMarked, 
  BarChart2, 
  Eye, 
  Sparkles, 
  X, 
  Mail, 
  GraduationCap,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';

interface StudentOnboardingTabProps {
  onOpenStudentAnalytics?: (studentName: string, rollNo: string) => void;
}

export const EXAM_INTERESTS = [
  {
    id: '⚡ ITI (NCVT) (Trade Theory CBT)',
    label: '⚡ ITI (NCVT) (Trade Theory CBT)',
    badge: 'ITI (NCVT)',
    shortName: 'ITI',
    icon: Zap,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300'
  },
  {
    id: '🩺 NEET (UG) (Medical Entrance CBT)',
    label: '🩺 NEET (UG) (Medical Entrance CBT)',
    badge: 'NEET (UG)',
    shortName: 'NEET',
    icon: Stethoscope,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300'
  },
  {
    id: '📚 CTET (Teaching Eligibility CBT)',
    label: '📚 CTET (Teaching Eligibility CBT)',
    badge: 'CTET',
    shortName: 'CTET',
    icon: BookMarked,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300'
  }
];

export const ITI_TRADES = [
  { id: 'Electrician', label: 'Electrician', code: 'ELE', duration: '2 Years', icon: '⚡' },
  { id: 'Fitter', label: 'Fitter', code: 'FIT', duration: '2 Years', icon: '🔧' },
  { id: 'Welder', label: 'Welder', code: 'WEL', duration: '1 Year', icon: '🔥' },
  { id: 'COPA', label: 'COPA (Computer Operator)', code: 'COP', duration: '1 Year', icon: '💻' },
  { id: 'Wireman', label: 'Wireman', code: 'WIR', duration: '2 Years', icon: '🔌' },
  { id: 'Electronic Mechanic', label: 'Electronic Mechanic', code: 'EM', duration: '2 Years', icon: '📻' },
  { id: 'Mechanic Motor Vehicle', label: 'Mechanic Motor Vehicle (MMV)', code: 'MMV', duration: '2 Years', icon: '🚗' },
  { id: 'Turner', label: 'Turner', code: 'TUR', duration: '2 Years', icon: '⚙️' },
  { id: 'Machinist', label: 'Machinist', code: 'MAC', duration: '2 Years', icon: '🛠️' },
  { id: 'Draughtsman Civil', label: 'Draughtsman (Civil)', code: 'DMC', duration: '2 Years', icon: '📐' },
  { id: 'Plumber', label: 'Plumber', code: 'PLU', duration: '1 Year', icon: '🚰' },
  { id: 'Refrigeration & AC', label: 'Refrigeration & AC (RAC)', code: 'RAC', duration: '2 Years', icon: '❄️' }
];

export const NEET_STREAMS = [
  { id: 'NEET Medical (PCB)', label: 'NEET UG Medical (Physics, Chemistry, Biology)', icon: '🩺' },
  { id: 'NEET Dropper Batch', label: 'NEET Dropper / Repeater Batch', icon: '🎯' },
  { id: 'NEET Class 11 Foundation', label: 'NEET Class 11 Foundation', icon: '📘' },
  { id: 'NEET Class 12 Target', label: 'NEET Class 12 Target', icon: '📗' }
];

export const CTET_PAPERS = [
  { id: 'CTET Paper 1 (Primary 1-5)', label: 'CTET Paper 1 (Primary Stage - Class I to V)', icon: '📚' },
  { id: 'CTET Paper 2 (Maths & Science)', label: 'CTET Paper 2 (Elementary - Maths & Science)', icon: '📐' },
  { id: 'CTET Paper 2 (Social Studies)', label: 'CTET Paper 2 (Elementary - Social Studies)', icon: '🌍' },
  { id: 'CTET Both Papers (Paper 1 & 2)', label: 'CTET Both Papers (Paper 1 & Paper 2)', icon: '🎓' }
];

export const StudentOnboardingTab: React.FC<StudentOnboardingTabProps> = ({
  onOpenStudentAnalytics
}) => {
  const { enterGhostMode } = useAuth();

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [testFolders, setTestFolders] = useState<TestFolder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [interestFilter, setInterestFilter] = useState<string>('ALL');

  // Modal State for Onboarding
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);

  // Onboard Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [selectedInterest, setSelectedInterest] = useState<string>(EXAM_INTERESTS[1].id); // ITI default
  const [assignedFolders, setAssignedFolders] = useState<string[]>([]);
  const [assignedTests, setAssignedTests] = useState<string[]>([]);
  const [rollNo, setRollNo] = useState<string>('');
  const [trade, setTrade] = useState<string>('Electrician');
  const [phone, setPhone] = useState<string>('');

  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const allUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
      setStudents(allUsers.filter((u) => u.role === 'student'));

      const allTests = await safeGetDocs<Test>('tests', INITIAL_TESTS);
      setTests(allTests);

      const allFolders = await safeGetDocs<TestFolder>('test_folders', []);
      setTestFolders(allFolders);
    } catch (err) {
      console.warn('Onboarding tab fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setSelectedInterest(EXAM_INTERESTS[0].id); // ITI default
    setAssignedFolders([]);
    setAssignedTests([]);
    setRollNo('');
    setTrade('Electrician');
    setPhone('');
    setEditingStudent(null);
  };

  const handleSelectCategory = (interestId: string) => {
    setSelectedInterest(interestId);
    if (interestId.includes('NEET')) {
      if (!trade.toLowerCase().includes('neet')) {
        setTrade('NEET Medical (PCB)');
      }
    } else if (interestId.includes('CTET')) {
      if (!trade.toLowerCase().includes('ctet')) {
        setTrade('CTET Paper 1 (Primary 1-5)');
      }
    } else {
      const isItiTrade = ITI_TRADES.some((t) => t.id === trade);
      if (!isItiTrade) {
        setTrade('Electrician');
      }
    }
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (stu: UserProfile) => {
    setEditingStudent(stu);
    setName(stu.name || '');
    setEmail(stu.email || '');
    setSelectedInterest(stu.target_exam || EXAM_INTERESTS[1].id);
    setAssignedFolders(stu.assigned_folders || []);
    setAssignedTests(stu.assigned_tests || []);
    setRollNo(stu.rollNo || '');
    setTrade(stu.trade || 'Electrician');
    setPhone(stu.phone || '');
    setIsModalOpen(true);
  };

  // Auto Select Tests when interest changes or on button click
  const handleSelectAllForInterest = (interestStr: string) => {
    // find matching folders & tests for this exam
    let matchingFolderIds: string[] = [];
    let matchingTestIds: string[] = [];

    if (interestStr.includes('NEET')) {
      matchingTestIds = tests.filter((t) => t.exam_type?.includes('NEET') || t.title.toLowerCase().includes('neet')).map((t) => t.test_id);
      matchingFolderIds = testFolders.filter((f) => f.name.toLowerCase().includes('neet')).map((f) => f.folder_id);
    } else if (interestStr.includes('CTET')) {
      matchingTestIds = tests.filter((t) => t.exam_type?.includes('CTET') || t.title.toLowerCase().includes('ctet')).map((t) => t.test_id);
      matchingFolderIds = testFolders.filter((f) => f.name.toLowerCase().includes('ctet')).map((f) => f.folder_id);
    } else {
      // ITI or General
      matchingTestIds = tests.filter((t) => !t.exam_type || t.exam_type.includes('ITI') || t.title.toLowerCase().includes('electrician') || t.title.toLowerCase().includes('iti')).map((t) => t.test_id);
      matchingFolderIds = testFolders.filter((f) => !f.name.toLowerCase().includes('neet') && !f.name.toLowerCase().includes('ctet')).map((f) => f.folder_id);
    }

    setAssignedFolders(Array.from(new Set([...assignedFolders, ...matchingFolderIds])));
    setAssignedTests(Array.from(new Set([...assignedTests, ...matchingTestIds])));
  };

  const handleToggleFolder = (folderId: string) => {
    setAssignedFolders((prev) => 
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const handleToggleTest = (testId: string) => {
    setAssignedTests((prev) => 
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  };

  const handleSubmitOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Please fill in Student Name and Gmail ID.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const studentUid = editingStudent ? editingStudent.uid : `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const updatedStudent: UserProfile = {
      uid: studentUid,
      email: cleanEmail,
      name: name.trim(),
      role: 'student',
      target_exam: selectedInterest,
      assigned_folders: assignedFolders,
      assigned_tests: assignedTests,
      rollNo: rollNo.trim() || `2026-${Math.floor(1000 + Math.random() * 9000)}`,
      trade,
      className: 'Batch 2026',
      phone: phone.trim(),
      status: 'active',
      createdAt: editingStudent?.createdAt || new Date().toISOString()
    };

    try {
      await safeSetDoc('users', studentUid, 'uid', updatedStudent);

      if (editingStudent) {
        setStudents(students.map((s) => (s.uid === studentUid ? updatedStudent : s)));
        setSuccessMsg(`Updated student profile for ${updatedStudent.name}`);
      } else {
        setStudents([updatedStudent, ...students]);
        setSuccessMsg(`Onboarded ${updatedStudent.name}! Registered with Gmail ${updatedStudent.email}`);
      }

      setIsModalOpen(false);
      resetForm();

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Onboard student error:', err);
      alert('Error saving student. Please try again.');
    }
  };

  const handleDeleteStudent = async (uid: string, stuName: string) => {
    if (!confirm(`Are you sure you want to remove onboarded student "${stuName}"?`)) return;

    try {
      await safeDeleteDoc('users', uid, 'uid');
      setStudents(students.filter((s) => s.uid !== uid));
    } catch (err) {
      console.error('Delete student error:', err);
    }
  };

  // Filter students by search query and interest
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.rollNo && s.rollNo.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (interestFilter === 'ALL') return true;
    if (!s.target_exam) return false;

    return s.target_exam.toLowerCase().includes(interestFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full inline-flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
              Student Onboarding &amp; Exam Allocation Hub
            </span>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Onboard Students &amp; Assign Active Tests
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Register students with their <strong className="text-white">Gmail ID</strong> (used during Google OAuth login), set their exam interest (<strong className="text-blue-300">NEET / ITI / CTET</strong>), and assign active test folders. When students log in, they automatically get their assigned CBT examinations ready to take.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={handleOpenAddModal}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg shadow-blue-600/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard Student</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs rounded-2xl flex items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-bold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Onboarded</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{students.length}</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">NEET Candidates</div>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {students.filter((s) => s.target_exam?.includes('NEET')).length}
            </div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">ITI Candidates</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              {students.filter((s) => !s.target_exam || s.target_exam.includes('ITI')).length}
            </div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">CTET Candidates</div>
            <div className="text-2xl font-black text-indigo-600 mt-0.5">
              {students.filter((s) => s.target_exam?.includes('CTET')).length}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600">
            <BookMarked className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar & Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search onboarded students by Name, Gmail ID, or Roll No..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {[
              { id: 'ALL', label: 'All Students' },
              { id: 'NEET', label: '🩺 NEET' },
              { id: 'ITI', label: '⚡ ITI (NCVT)' },
              { id: 'CTET', label: '📚 CTET' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setInterestFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  interestFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Onboard Student</span>
          </button>
        </div>
      </div>

      {/* Onboarded Students Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span>Registered Onboarded Students ({filteredStudents.length})</span>
          </h2>

          <span className="text-xs text-slate-400 font-medium">
            Registered for Google OAuth Sign-In
          </span>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              No onboarded students match the search criteria.
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click the "Onboard Student" button above to register a new student with their Gmail ID and assign test folders.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>Onboard Student Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 uppercase text-[10px] font-extrabold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Student Details</th>
                  <th className="p-4">Registered Gmail ID</th>
                  <th className="p-4">CBT Exam Interest</th>
                  <th className="p-4">Assigned Test Folders &amp; Tests</th>
                  <th className="p-4">Google OAuth Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((stu) => {
                  const assignedFolderCount = stu.assigned_folders?.length || 0;
                  const assignedTestCount = stu.assigned_tests?.length || 0;

                  const interestConfig = EXAM_INTERESTS.find(
                    (i) => stu.target_exam && i.id.toLowerCase().includes(i.shortName.toLowerCase())
                  ) || EXAM_INTERESTS[1];

                  const InterestIcon = interestConfig.icon;

                  return (
                    <tr key={stu.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Roll */}
                      <td className="p-4">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                          <span>{stu.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Roll: <strong className="font-mono text-blue-600">{stu.rollNo || '2026-001'}</strong></span>
                          <span>• {stu.trade || 'Electrician'}</span>
                        </div>
                      </td>

                      {/* Gmail ID */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                          <Mail className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="font-mono">{stu.email}</span>
                        </div>
                      </td>

                      {/* Exam Interest */}
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border inline-flex items-center gap-1 ${interestConfig.color}`}>
                          <InterestIcon className="w-3 h-3" />
                          <span>{stu.target_exam || interestConfig.label}</span>
                        </span>
                      </td>

                      {/* Assigned Folders & Tests */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-[11px] font-bold flex items-center gap-1">
                            <FolderCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{assignedFolderCount} Folders</span>
                          </span>

                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-bold flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{assignedTestCount} Tests</span>
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Ready for Google Login</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(stu)}
                          className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 hover:bg-blue-100 rounded-xl font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                          title="Edit Assigned Test Folders"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {onOpenStudentAnalytics && (
                          <button
                            onClick={() => onOpenStudentAnalytics(stu.name, stu.rollNo || '2026-001')}
                            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                            title="View Detailed Student Analytics & Test Results"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                            <span>Analytics</span>
                          </button>
                        )}

                        <button
                          onClick={() => enterGhostMode(stu)}
                          className="p-1.5 text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg cursor-pointer"
                          title="Ghost Mode: View App as this Student"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteStudent(stu.uid, stu.name)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer"
                          title="Remove Student Profile"
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
        )}
      </div>

      {/* ONBOARD STUDENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[700] flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold">
                    {editingStudent ? `Edit Onboarded Student: ${editingStudent.name}` : 'Onboard New Student'}
                  </h2>
                  <p className="text-xs text-blue-100 opacity-90">
                    Register student Gmail ID &amp; assign active test folders
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-blue-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitOnboard} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
              
              {/* STEP 1: Select Student Exam Category (NEET / CTET / ITI) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-blue-600" />
                    <span>1. Select Student Exam Category *</span>
                  </h3>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Step 1
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {EXAM_INTERESTS.map((item) => {
                    const isSel = selectedInterest === item.id;
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectCategory(item.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSel 
                            ? 'bg-blue-500/10 dark:bg-blue-950/80 border-blue-500 ring-2 ring-blue-500/30 shadow-md' 
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <ItemIcon className={`w-5 h-5 ${isSel ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                          {isSel ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                          )}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900 dark:text-white text-xs">{item.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Target CBT Examination</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* STEP 1.1: If ITI is selected, list ITI NCVT trades to select! */}
                {selectedInterest.includes('ITI') && (
                  <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Select ITI NCVT Trade *</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        12 NCVT Approved Trades
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                      {ITI_TRADES.map((t) => {
                        const isSelected = trade === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => setTrade(t.id)}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200 font-extrabold ring-2 ring-amber-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-base">{t.icon}</span>
                              {isSelected && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                            </div>
                            <div className="mt-1">
                              <div className="text-xs font-bold leading-tight">{t.label}</div>
                              <div className="text-[9px] opacity-75 font-mono mt-0.5">{t.code} • {t.duration}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Trade Input Option */}
                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Selected Trade:</span>
                      <input
                        type="text"
                        placeholder="e.g. Electrician, Fitter, Welder..."
                        value={trade}
                        onChange={(e) => setTrade(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 1.1: If NEET is selected */}
                {selectedInterest.includes('NEET') && (
                  <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 animate-fade-in">
                    <label className="text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <Stethoscope className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Select NEET Medical Batch / Stream *</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {NEET_STREAMS.map((s) => {
                        const isSelected = trade === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => setTrade(s.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{s.icon}</span>
                              <span>{s.label}</span>
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 1.1: If CTET is selected */}
                {selectedInterest.includes('CTET') && (
                  <div className="space-y-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 animate-fade-in">
                    <label className="text-xs font-extrabold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <BookMarked className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>Select CTET Exam Paper / Level *</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CTET_PAPERS.map((p) => {
                        const isSelected = trade === p.id;
                        return (
                          <div
                            key={p.id}
                            onClick={() => setTrade(p.id)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-blue-500/15 border-blue-500 text-blue-900 dark:text-blue-200 font-bold ring-2 ring-blue-500/30'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span>{p.icon}</span>
                              <span>{p.label}</span>
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2: Student Identity & Login Details */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>2. Student Identity &amp; Gmail Login Details</span>
                  </h3>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Step 2
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Gmail ID (Google OAuth) *</span>
                      <span className="text-[9px] text-red-500 font-mono font-bold">Required for login</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="student.rahul@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-medium focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Roll Number</label>
                    <input
                      type="text"
                      placeholder="2026-001"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Assign Folder & Active Tests Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Assign Folders &amp; Active Tests
                  </h3>

                  <button
                    type="button"
                    onClick={() => handleSelectAllForInterest(selectedInterest)}
                    className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer hover:bg-blue-200"
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                    <span>Auto-Assign All Active Tests for {selectedInterest.split(' ')[1] || 'Selected Interest'}</span>
                  </button>
                </div>

                {/* Active Test Folders Checklist */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Active Test Folders ({testFolders.length})
                  </p>

                  {testFolders.length === 0 ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-400 text-center text-xs">
                      No custom test folders created yet. Individual active tests will be assigned directly.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar p-1">
                      {testFolders.map((f) => {
                        const isAssigned = assignedFolders.includes(f.folder_id);
                        return (
                          <div
                            key={f.folder_id}
                            onClick={() => handleToggleFolder(f.folder_id)}
                            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                              isAssigned
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FolderCheck className={`w-4 h-4 shrink-0 ${isAssigned ? 'text-indigo-600' : 'text-slate-400'}`} />
                              <span className="truncate font-bold">{f.name}</span>
                            </div>

                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => {}}
                              className="w-4 h-4 text-indigo-600 rounded"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Individual Active Tests Checklist */}
                <div className="space-y-2 pt-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Individual Active Mock Tests ({tests.length})
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto custom-scrollbar p-1">
                    {tests.map((t) => {
                      const isAssigned = assignedTests.includes(t.test_id);
                      return (
                        <div
                          key={t.test_id}
                          onClick={() => handleToggleTest(t.test_id)}
                          className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                            isAssigned
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold truncate">{t.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {t.exam_type || 'NCVT ITI'} • {t.duration_minutes} min
                            </div>
                          </div>

                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => {}}
                            className="w-4 h-4 text-emerald-600 rounded shrink-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Submit Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingStudent ? 'Save Student Profile' : 'Complete Onboarding'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
