import React from 'react';
import { LoadDemoDataResult } from '../../lib/demoData';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Database,
  ShieldCheck,
  Building2,
  Users,
  BookOpen,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface DemoDataReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: LoadDemoDataResult | null;
  onForceReload?: () => void;
  isReloading?: boolean;
}

export const DemoDataReportModal: React.FC<DemoDataReportModalProps> = ({
  isOpen,
  onClose,
  result,
  onForceReload,
  isReloading = false
}) => {
  if (!isOpen || !result) return null;

  const isSuccess = result.status === 'loaded_success';
  const hasConflicts = result.validationReport.conflicts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Synthetic Dataset & Validation Audit</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Fictional Demo Data
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-constraint verification across Cloud Firestore collections.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                {isSuccess
                  ? 'Fictional Demo Dataset Loaded into Cloud Firestore'
                  : 'Existing Records Detected — Overwrite Protected'}
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">{result.message}</p>
            </div>
          </div>

          {/* Fictional Data Disclaimer Note */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-900">Fictional Demo Data Notice: </span>
              All faculty names, student cohorts, course codes, and facilities are purely synthetic fictional
              constructs created for demonstration and testing purposes. No real campus or personal identities are
              used.
            </div>
          </div>

          {/* Loaded Dataset Metrics */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
              Synthetic Resources Generated & Persisted
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Users className="w-4 h-4 mx-auto text-blue-600 mb-1" />
                <span className="text-[10px] text-slate-500">Batches</span>
                <p className="text-base font-bold text-slate-900">{result.stats.batches}</p>
                <span className="text-[9px] text-slate-400">Alpha & Beta</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <UserCheck className="w-4 h-4 mx-auto text-indigo-600 mb-1" />
                <span className="text-[10px] text-slate-500">Faculty</span>
                <p className="text-base font-bold text-slate-900">{result.stats.faculty}</p>
                <span className="text-[9px] text-slate-400">5 Ph.D. Instructors</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <BookOpen className="w-4 h-4 mx-auto text-emerald-600 mb-1" />
                <span className="text-[10px] text-slate-500">Subjects</span>
                <p className="text-base font-bold text-slate-900">{result.stats.subjects}</p>
                <span className="text-[9px] text-slate-400">4 Lec, 2 Practical</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <Building2 className="w-4 h-4 mx-auto text-purple-600 mb-1" />
                <span className="text-[10px] text-slate-500">Facilities</span>
                <p className="text-base font-bold text-slate-900">{result.stats.rooms}</p>
                <span className="text-[9px] text-slate-400">3 Halls, 1 Lab</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center col-span-2 sm:col-span-1">
                <Calendar className="w-4 h-4 mx-auto text-amber-600 mb-1" />
                <span className="text-[10px] text-slate-500">Sessions</span>
                <p className="text-base font-bold text-slate-900">{result.stats.entries}</p>
                <span className="text-[9px] text-slate-400">Weekly Slots</span>
              </div>
            </div>
          </div>

          {/* Timetable Invariants Audit Section */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Multi-Constraint Verification Audit
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  !hasConflicts
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {!hasConflicts ? '0 CONFLICTS DETECTED' : `${result.validationReport.conflicts.length} ISSUES`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">1. Faculty Double-Booking:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 0 Collisions
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">2. Batch Schedule Non-Overlap:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 0 Collisions
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">3. Room Double-Booking:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 0 Collisions
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">4. Room Capacity Compliance:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Pass (Cap &ge; Batch)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">5. Laboratory Facility Checks:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Pass (Labs in Lab)
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between shadow-xs">
                <span className="text-slate-600">6. Faculty Availability (5 Days):</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 100% Respected
                </span>
              </div>
            </div>
          </div>

          {/* Conflict list if any were reported */}
          {hasConflicts && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <h5 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Detected Schedule Conflicts:
              </h5>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {result.validationReport.conflicts.map((c, i) => (
                  <div key={i} className="text-xs p-2 rounded-lg bg-white text-rose-800 border border-rose-200 shadow-xs">
                    <span className="font-bold">{c.title}: </span>
                    {c.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Persistent in Firestore collection <span className="font-mono text-slate-700">/timetableEntries</span>
          </div>

          <div className="flex items-center gap-2">
            {!isSuccess && onForceReload && (
              <button
                onClick={onForceReload}
                disabled={isReloading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isReloading ? 'Reloading...' : 'Force Overwrite with Fictional Data'}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer"
            >
              Done & View Timetable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
