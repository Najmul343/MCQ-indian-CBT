import React, { useState, useEffect } from 'react';
import { Tenant, UserProfile } from '../types';
import { safeSetDoc, upsertUserByEmail } from '../lib/firebase';
import { X, School, Key, User, Mail, Check, AlertCircle, Building2, Layers } from 'lucide-react';

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  tenantToEdit?: Tenant | null;
}

const ALL_TRADES = [
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

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  tenantToEdit
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [status, setStatus] = useState<'Active' | 'Trial' | 'Suspended'>('Active');
  const [plan, setPlan] = useState<'Free Starter' | 'Pro College' | 'Enterprise'>('Pro College');
  const [maxStudents, setMaxStudents] = useState(500);
  const [maxTeachers, setMaxTeachers] = useState(25);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([
    'Electrician',
    'Fitter',
    'Employability Skills'
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantToEdit) {
      setName(tenantToEdit.name || '');
      setCode(tenantToEdit.code || '');
      setCity(tenantToEdit.city || '');
      setJoinCode(tenantToEdit.join_code || tenantToEdit.code || '');
      setPrincipalName(tenantToEdit.principal_name || '');
      setPrincipalEmail(tenantToEdit.principal_email || '');
      setStatus(tenantToEdit.status || 'Active');
      setPlan(tenantToEdit.subscription_plan || 'Pro College');
      setMaxStudents(tenantToEdit.max_students || 500);
      setMaxTeachers(tenantToEdit.max_teachers || 25);
      setSelectedTrades(tenantToEdit.trades_offered || ['Electrician', 'Fitter', 'Employability Skills']);
    } else {
      setName('');
      setCode(`ITI-${Math.floor(100 + Math.random() * 900)}`);
      setCity('New Delhi');
      setJoinCode(`JOIN-${Math.floor(1000 + Math.random() * 9000)}`);
      setPrincipalName('');
      setPrincipalEmail('');
      setStatus('Active');
      setPlan('Pro College');
      setMaxStudents(500);
      setMaxTeachers(25);
      setSelectedTrades(['Electrician', 'Fitter', 'Employability Skills']);
    }
    setError('');
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleTrade = (tr: string) => {
    if (selectedTrades.includes(tr)) {
      setSelectedTrades(selectedTrades.filter((t) => t !== tr));
    } else {
      setSelectedTrades([...selectedTrades, tr]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('College name is required.');
      return;
    }

    setSaving(true);
    setError('');

    const tenantId = tenantToEdit?.tenant_id || `tenant_${Date.now()}`;
    const updatedTenant: Tenant = {
      tenant_id: tenantId,
      name: name.trim(),
      code: code.trim().toUpperCase() || 'ITI-CAMPUS',
      city: city.trim() || 'New Delhi',
      join_code: joinCode.trim().toUpperCase() || code.trim().toUpperCase(),
      principal_name: principalName.trim() || undefined,
      principal_email: principalEmail.trim().toLowerCase() || undefined,
      status,
      subscription_plan: plan,
      trades_offered: selectedTrades,
      max_students: maxStudents,
      max_teachers: maxTeachers,
      createdAt: tenantToEdit?.createdAt || new Date().toISOString()
    };

    try {
      // Pre-register or update Principal in Firestore if Gmail ID is provided
      if (principalEmail.trim()) {
        const pEmail = principalEmail.trim().toLowerCase();
        const principalUid = tenantToEdit?.principal_id || `pr_${tenantId}`;
        const principalProfile: UserProfile = {
          uid: principalUid,
          email: pEmail,
          name: principalName.trim() || 'College Principal',
          role: 'principal',
          tenant_id: tenantId,
          tenant_name: name.trim(),
          status: 'active',
          createdAt: new Date().toISOString()
        };
        const savedPrincipal = await upsertUserByEmail(principalProfile);
        updatedTenant.principal_id = savedPrincipal.uid;
      }

      await safeSetDoc('tenants', tenantId, 'tenant_id', updatedTenant);

      setSaving(false);
      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Save tenant error:', err);
      setError('Failed to save institution tenant.');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">
                {tenantToEdit ? 'Edit College Tenant' : 'Onboard New College / Institution'}
              </h3>
              <p className="text-xs text-emerald-200">
                Configure SaaS subscription, self-join codes, and offered trade tracks
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

          {/* College Name & City */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College / Institution Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Govt ITI Delhi (Main Campus)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City / Region</label>
              <input
                type="text"
                placeholder="e.g. Delhi"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Code & Student Join Code */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Code
              </label>
              <input
                type="text"
                placeholder="e.g. GITI-DEL"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl uppercase font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Self-Join Code 🔑
              </label>
              <input
                type="text"
                placeholder="e.g. DEL-2026"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl uppercase font-mono font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Principal Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal / College Admin Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Rajesh Sharma"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Principal Gmail (Auto Auth)
              </label>
              <input
                type="email"
                placeholder="principal@govt-iti.edu.in"
                value={principalEmail}
                onChange={(e) => setPrincipalEmail(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Plan & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Free Starter">Free Starter</option>
                <option value="Pro College">Pro College</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Active">Active</option>
                <option value="Trial">Trial (14 Days)</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Limit</label>
              <input
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value) || 100)}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Trades Offered Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" />
              <span>Trades / Departments Supported at this College</span>
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              {ALL_TRADES.map((tr) => {
                const checked = selectedTrades.includes(tr);
                return (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => toggleTrade(tr)}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between ${
                      checked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="truncate">{tr}</span>
                    {checked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl transition shadow-md shadow-emerald-100 flex items-center gap-2"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{tenantToEdit ? 'Save Changes' : 'Onboard College Tenant'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
