import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Tenant, TestFolder, Test } from '../types';
import { safeSetDoc, upsertUserByEmail } from '../lib/firebase';
import { X, User, Mail, Shield, School, BookOpen, Hash, CheckCircle, AlertCircle, UserCheck, Folder } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  userToEdit?: UserProfile | null;
  defaultRole?: UserRole;
  tenants: Tenant[];
  teachers?: UserProfile[];
  testFolders?: TestFolder[];
  tests?: Test[];
  currentUserId?: string;
}

const COMMON_TRADES = [
  'Electrician',
  'Fitter',
  'Welder',
  'COPA (Computer Operator)',
  'Wireman',
  'Mechanic Motor Vehicle',
  'Electronic Mechanic',
  'Turner / Machinist',
  'Employability Skills',
  'Workshop Calculation & Science'
];

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  userToEdit,
  defaultRole = 'student',
  tenants,
  teachers = [],
  testFolders = [],
  tests = [],
  currentUserId
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [tenantId, setTenantId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [trade, setTrade] = useState('Electrician');
  const [className, setClassName] = useState('Batch 2026');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [phone, setPhone] = useState('');
  const [assignedFolders, setAssignedFolders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name || '');
      setEmail(userToEdit.email || '');
      setRole(userToEdit.role || defaultRole);
      setTenantId(userToEdit.tenant_id || '');
      setTeacherId(userToEdit.teacher_id || '');
      setRollNo(userToEdit.rollNo || '');
      setTrade(userToEdit.trade || 'Electrician');
      setClassName(userToEdit.className || 'Batch 2026');
      setStatus(userToEdit.status || 'active');
      setPhone(userToEdit.phone || '');
      setAssignedFolders(userToEdit.assigned_folders || []);
    } else {
      setName('');
      setEmail('');
      setRole(defaultRole);
      setTenantId(tenants.length > 0 ? tenants[0].tenant_id : '');
      setTeacherId('');
      setRollNo('');
      setTrade('Electrician');
      setClassName('Batch 2026');
      setStatus('active');
      setPhone('');
      setAssignedFolders([]);
    }
    setError('');
  }, [userToEdit, defaultRole, tenants, isOpen]);

  if (!isOpen) return null;

  const availableTeachers = teachers.filter((t) => !tenantId || t.tenant_id === tenantId || !t.tenant_id);

  const toggleFolderAssignment = (fId: string) => {
    setAssignedFolders((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Please provide full name and email address.');
      return;
    }

    setSaving(true);
    setError('');

    const uid = userToEdit?.uid || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const selectedTenant = tenants.find((t) => t.tenant_id === tenantId);
    const selectedTeacher = teachers.find((t) => t.uid === teacherId);

    const updatedUser: UserProfile = {
      uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      tenant_id: tenantId || undefined,
      tenant_name: selectedTenant?.name,
      teacher_id: role === 'student' ? (teacherId || undefined) : undefined,
      teacher_name: role === 'student' ? selectedTeacher?.name : undefined,
      rollNo: role === 'student' ? rollNo.trim() : undefined,
      trade: role === 'student' || role === 'teacher' ? trade : undefined,
      className: role === 'student' ? className : undefined,
      status,
      phone: phone.trim() || undefined,
      assigned_folders: assignedFolders,
      createdAt: userToEdit?.createdAt || new Date().toISOString()
    };

    try {
      await upsertUserByEmail(updatedUser);
      setSaving(false);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save user error:', err);
      setError('Failed to save user profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {userToEdit ? 'Edit User Profile' : 'Onboard New User'}
              </h3>
              <p className="text-xs text-indigo-200">
                {userToEdit ? 'Update account details and permissions' : 'Seamless single-user account setup'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role & Status Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Instructor</option>
                <option value="principal">College Admin / Principal</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </div>
          </div>

          {/* Name & Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address (Google Sign-In) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="e.g. ramesh.kumar@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              User will sign in seamlessly with Google using this exact Gmail ID.
            </p>
          </div>

          {/* College / Tenant Picker */}
          {role !== 'super_admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Institution / College
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Institution --</option>
                  {tenants.map((t) => (
                    <option key={t.tenant_id} value={t.tenant_id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Student Specific Fields */}
          {role === 'student' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Roll / Registration No.
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. 2026-ELE-042"
                    value={rollNo}
                    onChange={(e) => setRollNo(e.target.value)}
                    className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batch / Semester
                </label>
                <input
                  type="text"
                  placeholder="e.g. Batch 2026 / Sem 1"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>
          )}

          {/* Trade / Subject Interest */}
          {(role === 'student' || role === 'teacher') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trade / Specialization Interest
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="w-full text-sm pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {COMMON_TRADES.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Assigned Teacher for Student */}
          {role === 'student' && availableTeachers.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned Teacher / Instructor</span>
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- No Assigned Teacher --</option>
                {availableTeachers.map((t) => (
                  <option key={t.uid} value={t.uid}>
                    👨‍🏫 {t.name} ({t.email}) - {t.trade || 'All Trades'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Assigned Test Folders / QB Access */}
          {(role === 'teacher' || role === 'student') && testFolders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assigned Test Folders / QB Access</span>
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                {testFolders.map((tf) => {
                  const isChecked = assignedFolders.includes(tf.folder_id);
                  return (
                    <label
                      key={tf.folder_id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs cursor-pointer border transition ${
                        isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFolderAssignment(tf.folder_id)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>📁 {tf.name} ({tf.trade || tf.category || 'General'})</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition shadow-md shadow-indigo-100 flex items-center gap-2"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>{userToEdit ? 'Update Profile' : 'Complete Onboarding'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
