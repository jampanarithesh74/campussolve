import React, { useState } from 'react';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  ScheduleGenerationResult
} from '../../types';
import { generateAutomatedSchedule } from '../../lib/scheduler';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Save,
  X,
  Cpu,
  FileText
} from 'lucide-react';

interface AutomatedSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  batches: Batch[];
  rooms: Room[];
  faculty: Faculty[];
  availabilities: FacultyAvailability[];
  onCommitSchedule: (newEntries: TimetableEntry[]) => Promise<void>;
}

export const AutomatedSchedulerModal: React.FC<AutomatedSchedulerModalProps> = ({
  isOpen,
  onClose,
  subjects,
  batches,
  rooms,
  faculty,
  availabilities,
  onCommitSchedule
}) => {
  const [result, setResult] = useState<ScheduleGenerationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  if (!isOpen) return null;

  const handleRunScheduler = () => {
    setIsRunning(true);
    // Slight timeout so UI can display solver spinning
    setTimeout(() => {
      const res = generateAutomatedSchedule(subjects, batches, rooms, faculty, availabilities);
      setResult(res);
      setIsRunning(false);
    }, 400);
  };

  const handleSaveToFirestore = async () => {
    if (!result || result.scheduledEntries.length === 0) return;
    setIsCommitting(true);
    try {
      await onCommitSchedule(result.scheduledEntries);
      onClose();
    } catch (err) {
      console.error('Failed to commit schedule:', err);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Automated Constraint Scheduler
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Rule-Based Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Solves multi-batch assignments with zero room, faculty, or cohort collisions.
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Input scope summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Subjects
              </span>
              <p className="text-lg font-bold text-slate-900">{subjects.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Batches
              </span>
              <p className="text-lg font-bold text-slate-900">{batches.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Classrooms
              </span>
              <p className="text-lg font-bold text-slate-900">{rooms.length}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Faculty
              </span>
              <p className="text-lg font-bold text-slate-900">{faculty.length}</p>
            </div>
          </div>

          {/* Rules & Invariants Handled */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
            <div className="font-semibold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-700" /> Enforced Constraints:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-600">
              <div>✓ Zero faculty double-booking</div>
              <div>✓ Zero batch schedule overlaps</div>
              <div>✓ Room capacity &ge; batch enrollment</div>
              <div>✓ Laboratory requirements mapped to labs</div>
              <div>✓ Faculty availability windows respected</div>
              <div>✓ Balanced daily lecture distribution</div>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="space-y-4">
              {/* Status Header */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {result.success
                      ? 'Optimal Schedule Generated — 100% Conflict-Free'
                      : `Partially Generated (${result.totalSlotsScheduled}/${result.totalSlotsNeeded} sessions allocated)`}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {result.success
                      ? `Successfully allocated all ${result.totalSlotsScheduled} required lectures & practicals across campus facilities.`
                      : `${result.unallocatedSubjects.length} subjects could not be fully placed due to room capacity or slot congestion.`}
                  </p>
                </div>
              </div>

              {/* Unallocated warnings if any */}
              {result.unallocatedSubjects.length > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                  <h5 className="text-xs font-bold text-rose-900">Unallocated Subject Details:</h5>
                  <div className="space-y-1.5">
                    {result.unallocatedSubjects.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs p-2.5 rounded-lg bg-white border border-rose-200 text-slate-700 shadow-xs"
                      >
                        <span className="font-semibold text-slate-900">{item.subject.name}</span>: {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Engine Log Details */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> Solver Execution Trace:
                </span>
                <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 space-y-1">
                  {result.logs.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('[Allocated]')
                          ? 'text-emerald-700 font-medium'
                          : log.includes('[Warning]') || log.includes('[Constraint]')
                          ? 'text-amber-800 font-medium'
                          : log.includes('[Error]')
                          ? 'text-rose-700 font-medium'
                          : 'text-slate-600'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunScheduler}
              disabled={isRunning || subjects.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  Running Solver...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                  {result ? 'Re-Run Solver' : 'Run Intelligent Generation'}
                </>
              )}
            </button>

            {result && result.scheduledEntries.length > 0 && (
              <button
                onClick={handleSaveToFirestore}
                disabled={isCommitting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {isCommitting ? 'Persisting to Firestore...' : 'Commit to Firestore'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
