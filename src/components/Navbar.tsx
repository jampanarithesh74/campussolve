import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  LogOut,
  UserCheck,
  Shield,
  GraduationCap,
  WifiOff,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { UserRole } from '../types';

interface NavbarProps {
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onToggleAIAssistant?: () => void;
  isAIOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefreshData,
  isRefreshing,
  onToggleAIAssistant,
  isAIOpen
}) => {
  const { currentUser, userProfile, role, logout, setDemoPersona, demoModeActive, isFirebaseConnected } = useAuth();

  const getRoleBadge = (r: UserRole | null) => {
    switch (r) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Shield className="w-3 h-3 text-slate-700" />
            Administrator
          </span>
        );
      case 'faculty':
      case 'teacher':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <UserCheck className="w-3 h-3 text-blue-600" />
            Faculty
          </span>
        );
      case 'student':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <GraduationCap className="w-3 h-3 text-emerald-600" />
            Student
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs px-4 sm:px-6 py-3 no-print">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900">
                CampusSolve
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Timetable AI
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Course Scheduling &amp; Academic Resource Management
            </p>
          </div>
        </div>

        {/* Center: When in Demo Mode, show clear persona switcher */}
        {demoModeActive && (
          <div className="hidden lg:flex items-center gap-1 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider px-1">
              Demo Preview:
            </span>
            <button
              onClick={() => setDemoPersona('admin', undefined, undefined, 'CampusSolve Administrator')}
              className={`px-2 py-0.5 text-xs rounded-md transition-all cursor-pointer ${
                role === 'admin'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-100/60'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setDemoPersona('faculty', undefined, 'fac_demo_vance', 'Dr. Evelyn Vance')}
              className={`px-2 py-0.5 text-xs rounded-md transition-all cursor-pointer ${
                role === 'faculty' || role === 'teacher'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-100/60'
              }`}
            >
              Faculty (Dr. Vance)
            </button>
            <button
              onClick={() => setDemoPersona('student', 'batch_demo_alpha', undefined, 'Student [Batch Alpha]')}
              className={`px-2 py-0.5 text-xs rounded-md transition-all cursor-pointer ${
                role === 'student'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-amber-100/60'
              }`}
            >
              Student (Batch Alpha)
            </button>
          </div>
        )}

        {/* Right Section: AI Assistant, Status, Profile & Sign Out */}
        <div className="flex items-center gap-2">
          {onToggleAIAssistant && (
            <button
              onClick={onToggleAIAssistant}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer border ${
                isAIOpen
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
              title="Open CampusSolve Intelligent AI Assistant"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAIOpen ? 'text-white' : 'text-blue-600'}`} />
              <span className="hidden sm:inline">CampusSolve AI</span>
              <span className="sm:hidden">AI</span>
            </button>
          )}

          {onRefreshData && (
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              title="Refresh timetable from Firestore"
              aria-label="Refresh timetable from Firestore"
              className="p-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}

          {/* Connection status indicator */}
          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200"
            title={isFirebaseConnected ? 'Cloud Firestore Connected' : 'Connecting to Firestore'}
          >
            {isFirebaseConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-slate-700 hidden md:inline text-[11px] font-medium">Firestore Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 hidden md:inline text-[11px]">Connecting</span>
              </>
            )}
          </div>

          {/* User profile */}
          <div className="flex items-center gap-2 pl-1 border-l border-slate-200 ml-1">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight">
                {userProfile?.displayName || currentUser?.displayName || 'User'}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {getRoleBadge(role)}
                {demoModeActive && (
                  <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-1 rounded border border-amber-200">
                    Demo
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-rose-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
