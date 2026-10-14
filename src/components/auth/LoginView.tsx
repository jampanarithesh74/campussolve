import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Lock,
  Mail,
  KeyRound,
  LogIn,
  AlertCircle,
  CheckCircle2,
  WifiOff,
  Shield,
  UserCheck,
  GraduationCap,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { DEMO_ACCOUNTS, DEFAULT_DEMO_PASSWORD, DemoAccountDef } from '../../lib/demoAccounts';

export const LoginView: React.FC = () => {
  const { loginWithEmail, registerWithEmail, isFirebaseConnected } = useAuth();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [demoFilter, setDemoFilter] = useState<'ALL' | 'admin' | 'faculty' | 'student'>('ALL');
  const [isDemoHelperOpen, setIsDemoHelperOpen] = useState(true);

  const handleSelectDemoAccount = (account: DemoAccountDef) => {
    setEmail(account.email);
    setPassword(DEFAULT_DEMO_PASSWORD);
    setAuthMode('login');
    setAuthError(null);
    setAuthSuccess(`Selected demo account: ${account.email} (${account.displayName})`);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setAuthError('Please enter a valid email address.');
      setLoading(false);
      return;
    }
    if (!password) {
      setAuthError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      if (authMode === 'login') {
        const profile = await loginWithEmail(cleanEmail, password);
        setAuthSuccess(`Signed in successfully as ${profile.displayName} (${profile.role.toUpperCase()})`);
      } else {
        await registerWithEmail(cleanEmail, password, displayName);
        setAuthSuccess('Account registered successfully! Accessing student portal...');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      const code = err?.code || '';
      const msg = err?.message || '';

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-login-credentials'
      ) {
        setAuthError('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/user-not-found') {
        setAuthError('Account not found for this email. Please check your spelling or register a new student account.');
      } else if (code === 'auth/email-already-in-use') {
        setAuthError('This email is already registered. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setAuthError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address format.');
      } else if (code === 'auth/operation-not-allowed') {
        setAuthError(
          'Email/Password provider is not yet enabled in your Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method -> Email/Password and enable it.'
        );
      } else {
        setAuthError(msg || 'Authentication failure. Please check your credentials or network connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredDemoAccounts = DEMO_ACCOUNTS.filter((acc) => {
    if (demoFilter === 'ALL') return true;
    return acc.role === demoFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                CampusSolve
              </span>
              <span className="ml-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline">
                Academic Administration & Timetables
              </span>
            </div>
          </div>

          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700">
              {isFirebaseConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="text-slate-700 font-medium text-xs">Firestore Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-amber-700 text-xs">Connecting Database...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Institutional Value & Role Information */}
          <div className="lg:col-span-5 space-y-6 text-left">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Firebase-Backed Academic Scheduling
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                CampusSolve Portal <br />
                <span className="text-blue-700">Strict Role-Based Access</span>
              </h1>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Automated conflict-free course timetabling and facility management. Authenticated with Firebase Email &amp; Password and role validation.
              </p>
            </div>

            {/* Role Pillars */}
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-slate-800" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Administrator Role (ADMIN)</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Generate automated schedules, orchestrate faculty, manage rooms, validate constraints, and publish institutional timetables.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Faculty Role (FACULTY)</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    View assigned teaching sessions, classroom allocations, verify workload hours, and configure weekly time availability.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Student Role (STUDENT)</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Read-only access to cohort-specific timetables, lecture halls, laboratory locations, and export/print schedules.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card & Demo Credentials Helper */}
          <div className="lg:col-span-7 space-y-6">
            {/* Primary Login Card */}
            <div className="p-7 rounded-2xl bg-white border border-slate-200 shadow-sm relative">
              <div className="text-center mb-5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto mb-2 border border-slate-200">
                  <Lock className="w-5 h-5 text-slate-700" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {authMode === 'login' ? 'Institutional Sign In' : 'Register Student Account'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in with Firebase Email &amp; Password credentials
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`flex-1 py-1.5 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                    setAuthSuccess(null);
                  }}
                  className={`flex-1 py-1.5 text-xs rounded-md font-semibold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Student
                </button>
              </div>

              {/* Error Message Alert */}
              {authError && (
                <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{authError}</span>
                </div>
              )}

              {/* Success Message Alert */}
              {authSuccess && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span className="leading-relaxed">{authSuccess}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Jordan Smith"
                      className="w-full bg-white text-xs text-slate-900 px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@campussolve.demo, faculty1@..., or student1@..."
                      className="w-full bg-white text-xs text-slate-900 pl-10 pr-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white text-xs text-slate-900 pl-10 pr-10 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Authenticating...
                    </span>
                  ) : authMode === 'login' ? (
                    'Sign In with Email'
                  ) : (
                    'Create Student Account'
                  )}
                </button>
              </form>
            </div>

            {/* Development / Hackathon Demo Account Helper */}
            <div className="rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
              <div
                onClick={() => setIsDemoHelperOpen((prev) => !prev)}
                className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    Development &amp; Demo Helper
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    21 Preconfigured Campus Accounts
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                    isDemoHelperOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {isDemoHelperOpen && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-500">
                      Click any account to automatically fill email &amp; demo password into the login form:
                    </p>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setDemoFilter('ALL')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          demoFilter === 'ALL'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All (21)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoFilter('admin')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          demoFilter === 'admin'
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoFilter('faculty')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          demoFilter === 'faculty'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Faculty (10)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoFilter('student')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                          demoFilter === 'student'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Students (10)
                      </button>
                    </div>
                  </div>

                  {/* Account Grid / Scroll Area */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {filteredDemoAccounts.map((account) => {
                      const isSelected = email === account.email;
                      const roleBadge =
                        account.role === 'admin' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                            ADMIN
                          </span>
                        ) : account.role === 'faculty' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                            FACULTY
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            STUDENT
                          </span>
                        );

                      return (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => handleSelectDemoAccount(account)}
                          className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between gap-3 transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {roleBadge}
                              <span className="font-semibold text-slate-900 truncate">
                                {account.email}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {account.displayName} • {account.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 shrink-0">
                            <span>Fill</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        CampusSolve • Academic Timetable Management System
      </footer>
    </div>
  );
};
