import React, { useState } from 'react';
import { UserProfile, UserRole, Tenant } from '../types';
import { safeSetDoc, upsertUserByEmail } from '../lib/firebase';
import { X, Users, Upload, FileSpreadsheet, Check, AlertCircle, FileText } from 'lucide-react';

interface BulkUserOnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  tenants: Tenant[];
  defaultTenantId?: string;
  defaultRole?: UserRole;
}

export const BulkUserOnboardModal: React.FC<BulkUserOnboardModalProps> = ({
  isOpen,
  onClose,
  onImported,
  tenants,
  defaultTenantId = '',
  defaultRole = 'student'
}) => {
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [tenantId, setTenantId] = useState(defaultTenantId || (tenants[0]?.tenant_id || ''));
  const [trade, setTrade] = useState('Electrician');
  const [pastedData, setPastedData] = useState('');
  const [parsedRows, setParsedRows] = useState<Array<{ name: string; email: string; rollNo?: string; trade?: string }>>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ successCount: number } | null>(null);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleParse = () => {
    setError('');
    setImportResult(null);
    if (!pastedData.trim()) {
      setError('Please paste text lines or CSV data.');
      return;
    }

    const lines = pastedData.trim().split(/\r?\n/);
    const results: Array<{ name: string; email: string; rollNo?: string; trade?: string }> = [];

    lines.forEach((line) => {
      if (!line.trim()) return;
      // Skip CSV headers if present
      if (line.toLowerCase().includes('name') && line.toLowerCase().includes('email')) return;

      const parts = line.split(/,|\t|;/).map((s) => s.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const email = parts[1];
        const rollNo = parts[2] || '';
        const rowTrade = parts[3] || trade;

        if (email.includes('@')) {
          results.push({ name, email, rollNo, trade: rowTrade });
        }
      }
    });

    if (results.length === 0) {
      setError('Could not parse valid records. Ensure format is: Full Name, Email, Roll No (optional), Trade (optional)');
    } else {
      setParsedRows(results);
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setError('');

    const selectedTenant = tenants.find((t) => t.tenant_id === tenantId);
    let count = 0;

    for (const row of parsedRows) {
      const uid = `usr_bulk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const userDoc: UserProfile = {
        uid,
        name: row.name,
        email: row.email.toLowerCase(),
        role,
        tenant_id: tenantId || undefined,
        tenant_name: selectedTenant?.name,
        rollNo: role === 'student' ? (row.rollNo || `2026-${Math.floor(1000 + Math.random() * 9000)}`) : undefined,
        trade: row.trade || trade,
        className: 'Batch 2026',
        status: 'active',
        createdAt: new Date().toISOString()
      };

      try {
        await upsertUserByEmail(userDoc);
        count++;
      } catch (e) {
        console.warn('Bulk import record error:', e);
      }
    }

    setIsImporting(false);
    setImportResult({ successCount: count });
    setTimeout(() => {
      onImported();
      onClose();
    }, 1500);
  };

  const loadSampleTemplate = () => {
    setPastedData(
      `Full Name, Email Address, Roll Number, Trade\n` +
      `Suresh Verma, suresh.verma@gmail.com, 2026-ELE-001, Electrician\n` +
      `Kavita Sharma, kavita.sharma@gmail.com, 2026-ELE-002, Electrician\n` +
      `Deepak Patel, deepak.patel@gmail.com, 2026-FIT-003, Fitter\n` +
      `Anita Roy, anita.roy@gmail.com, 2026-WLD-004, Welder`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Bulk Onboard Users</h3>
              <p className="text-xs text-blue-200">
                Seamlessly import 10s or 100s of students/teachers at once
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

        {/* Content */}
        <div className="p-6 space-y-4">
          {importResult ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-lg">
                Successfully Onboarded {importResult.successCount} Users!
              </h4>
              <p className="text-sm text-slate-500">
                Users can now sign in directly with Google using their email addresses.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Onboard Config */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Institution</label>
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {tenants.map((t) => (
                      <option key={t.tenant_id} value={t.tenant_id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Default Trade</label>
                  <select
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Electrician">Electrician</option>
                    <option value="Fitter">Fitter</option>
                    <option value="Welder">Welder</option>
                    <option value="COPA">COPA</option>
                    <option value="Wireman">Wireman</option>
                  </select>
                </div>
              </div>

              {/* Input Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>Paste CSV / Excel List (Name, Email, RollNo, Trade)</span>
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleTemplate}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Load Sample Template
                  </button>
                </div>

                <textarea
                  rows={5}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder={`Full Name, Email Address, Roll Number, Trade\ne.g. Rahul Kumar, rahul@gmail.com, 2026-ELE-001, Electrician\ne.g. Priya Sharma, priya@gmail.com, 2026-FIT-002, Fitter`}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                  <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 flex justify-between">
                    <span>Parsed Candidates Preview ({parsedRows.length})</span>
                    <span className="text-emerald-600">Ready to Import</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-1">Name</th>
                        <th className="px-3 py-1">Email</th>
                        <th className="px-3 py-1">Roll No</th>
                        <th className="px-3 py-1">Trade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1 font-medium">{r.name}</td>
                          <td className="px-3 py-1 text-slate-600">{r.email}</td>
                          <td className="px-3 py-1 text-slate-500">{r.rollNo || '-'}</td>
                          <td className="px-3 py-1 text-indigo-600">{r.trade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleParse}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl hover:bg-slate-50"
                >
                  Verify & Parse Lines
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={parsedRows.length === 0 || isImporting}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isImporting ? 'Importing...' : `Import ${parsedRows.length} Users Now`}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
