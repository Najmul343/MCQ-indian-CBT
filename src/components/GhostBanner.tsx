import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, UserCheck } from 'lucide-react';

export const GhostBanner: React.FC = () => {
  const { isGhostMode, ghostTargetUser, originalAdminProfile, exitGhostMode } = useAuth();

  if (!isGhostMode || !ghostTargetUser) return null;

  return (
    <div className="bg-amber-400 text-amber-950 px-4 py-2.5 shadow-md border-b-2 border-amber-500 sticky top-0 z-[500] flex flex-wrap items-center justify-between gap-3 animate-fade-in font-sans">
      <div className="flex items-center gap-2.5">
        <div className="bg-amber-900/15 p-1.5 rounded-lg animate-pulse">
          <ShieldAlert className="w-5 h-5 text-amber-950" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-900">
            <span>⚠️ GHOST MODE ACTIVE</span>
            <span className="bg-amber-900 text-amber-100 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">
              {ghostTargetUser.role.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs font-semibold text-amber-950">
            Viewing session as <span className="underline decoration-amber-700 underline-offset-2 font-bold">{ghostTargetUser.name}</span> ({ghostTargetUser.email})
            {originalAdminProfile && (
              <span className="text-amber-800 ml-1.5 opacity-90">
                • Authenticated by Super Admin <span className="font-bold">{originalAdminProfile.name}</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <button
        onClick={exitGhostMode}
        className="flex items-center gap-2 bg-amber-950 hover:bg-black text-amber-100 text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer ml-auto"
      >
        <LogOut className="w-4 h-4" />
        <span>Exit Ghost Mode</span>
      </button>
    </div>
  );
};
