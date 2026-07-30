import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS, safeGetDocs } from '../lib/firebase';
import { UserRole, UserProfile } from '../types';
import { 
  GraduationCap, 
  UserCheck, 
  RefreshCw, 
  PlusCircle, 
  FileSpreadsheet, 
  Shield, 
  School, 
  UserSquare2, 
  LogOut,
  ChevronDown,
  LogIn,
  LayoutDashboard,
  UserPlus
} from 'lucide-react';

interface NavbarProps {
  onOpenSyncModal: () => void;
  onOpenQuizMaker: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSyncModal,
  onOpenQuizMaker,
  activeTab,
  setActiveTab
}) => {
  const { profile, loginAsUser, loginAsDemoUser, logout, isGhostMode } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfile[]>(DEMO_USERS);

  useEffect(() => {
    if (showRoleMenu) {
      safeGetDocs<UserProfile>('users', DEMO_USERS).then((fetched) => {
        setAllUsers(fetched);
      }).catch(() => {});
    }
  }, [showRoleMenu]);

  if (!profile) return null;

  const roleColors: Record<UserRole, { bg: string; text: string; label: string; icon: any }> = {
    super_admin: {
      bg: 'bg-purple-100 dark:bg-purple-950/50 border-purple-300',
      text: 'text-purple-700 dark:text-purple-300',
      label: 'Super Admin',
      icon: Shield
    },
    principal: {
      bg: 'bg-blue-100 dark:bg-blue-950/50 border-blue-300',
      text: 'text-blue-700 dark:text-blue-300',
      label: 'Principal',
      icon: School
    },
    teacher: {
      bg: 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-300',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: 'Instructor / Teacher',
      icon: UserCheck
    },
    student: {
      bg: 'bg-amber-100 dark:bg-amber-950/50 border-amber-300',
      text: 'text-amber-800 dark:text-amber-300',
      label: 'Student',
      icon: GraduationCap
    }
  };

  const currentRoleConfig = roleColors[profile.role] || roleColors.student;
  const RoleIcon = currentRoleConfig.icon;

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 ring-2 ring-white/10">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">SaaS MockTest</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  NCVT ITI ERP
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden md:block">
                Multi-Tenant Assessment Engine
              </p>
            </div>
          </div>

          {/* Navigation Tabs for Staff / Admins */}
          {(profile.role === 'super_admin' || profile.role === 'principal' || profile.role === 'teacher') && (
            <nav className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('onboard-students')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'onboard-students'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Onboard Students</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/30 text-emerald-300 text-[9px] rounded-full uppercase font-extrabold border border-emerald-500/40">
                  Tab
                </span>
              </button>
            </nav>
          )}

          {/* Quick Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Super Admin Sync Sheet Button */}
            {profile.role === 'super_admin' && (
              <button
                onClick={onOpenSyncModal}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Automated Google Sheets One-Click Sync"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden md:inline">Google Sheets Sync</span>
              </button>
            )}

            {/* Teacher / Principal / Admin Quiz Maker Button */}
            {(profile.role === 'teacher' || profile.role === 'principal' || profile.role === 'super_admin') && (
              <button
                onClick={onOpenQuizMaker}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Create Mock Test</span>
              </button>
            )}

            {/* Quick Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${currentRoleConfig.bg} ${currentRoleConfig.text}`}
              >
                <RoleIcon className="w-4 h-4" />
                <div className="text-left hidden sm:block">
                  <div className="leading-none">{profile.name}</div>
                  <div className="text-[10px] opacity-80 uppercase tracking-wide mt-0.5">{currentRoleConfig.label}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
              </button>

              {/* Dropdown Menu */}
              {showRoleMenu && (
                <div 
                  className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 animate-fade-in"
                  onMouseLeave={() => setShowRoleMenu(false)}
                >
                  <div className="px-2 py-1.5 border-b border-slate-800 mb-2">
                    <p className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                      Current Active Account
                    </p>
                    <p className="text-xs font-bold text-white mt-0.5">{profile.name}</p>
                    <p className="text-[11px] text-slate-400">{profile.email}</p>
                  </div>

                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider px-2 mb-1.5">
                    Switch Account / Role ({allUsers.length} Users)
                  </p>

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {allUsers.map((usr) => {
                      const isSelected = profile.uid === usr.uid;
                      return (
                        <button
                          key={usr.uid}
                          onClick={() => {
                            loginAsUser(usr);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium text-left transition-all ${
                            isSelected 
                              ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' 
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white">{usr.name}</div>
                            <div className="text-[10px] text-slate-400 capitalize">
                              {usr.role.replace('_', ' ')} • {usr.email}
                            </div>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                    <button
                      onClick={() => {
                        logout();
                        setShowRoleMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-2 text-xs font-bold text-red-400 hover:bg-red-950/30 rounded-xl transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
