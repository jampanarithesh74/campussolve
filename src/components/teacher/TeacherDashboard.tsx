import React, { useState, useMemo } from 'react';
import {
  Faculty,
  FacultyAvailability,
  TimetableEntry,
  DayOfWeek,
  DAYS_OF_WEEK,
  TIME_SLOTS
} from '../../types';
import { TimetableGrid } from '../common/TimetableGrid';
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  CalendarCheck,
  Sparkles,
  Sliders,
  Save,
  Check,
  Printer
} from 'lucide-react';
import { saveFacultyAvailability } from '../../lib/timetableService';
import { PrintExportModal } from '../common/PrintExportModal';

interface TeacherDashboardProps {
  entries: TimetableEntry[];
  facultyList: Faculty[];
  currentFacultyId: string;
  availabilityList: FacultyAvailability[];
  onSelectFaculty?: (id: string) => void;
  onRefresh?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  entries,
  facultyList,
  currentFacultyId,
  availabilityList,
  onSelectFaculty,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'availability'>('schedule');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Active faculty record
  const currentFaculty =
    facultyList.find((f) => f.id === currentFacultyId) || facultyList[0];

  // Timetable entries taught by this faculty member
  const facultyEntries = useMemo(() => {
    return entries.filter((e) => e.facultyId === currentFacultyId);
  }, [entries, currentFacultyId]);

  // Today calculation
  const todayName = useMemo(() => {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as any;
    const current = days[new Date().getDay()];
    return DAYS_OF_WEEK.includes(current as DayOfWeek) ? (current as DayOfWeek) : 'Monday';
  }, []);

  const todayClasses = useMemo(() => {
    return facultyEntries
      .filter((e) => e.day === todayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [facultyEntries, todayName]);

  const upcomingLecture = todayClasses.length > 0 ? todayClasses[0] : null;

  // Local state for availability editing
  const [localUnavailableSlots, setLocalUnavailableSlots] = useState<Record<DayOfWeek, string[]>>(() => {
    const initial: Record<DayOfWeek, string[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: []
    };
    for (const d of DAYS_OF_WEEK) {
      const rec = availabilityList.find(
        (a) => a.facultyId === currentFacultyId && a.day === d
      );
      if (rec && rec.unavailableSlots) {
        initial[d] = rec.unavailableSlots;
      }
    }
    return initial;
  });

  // Check for conflicts affecting this faculty
  const facultyConflicts = useMemo(() => {
    const warnings: string[] = [];

    // Check for double bookings within faculty entries
    for (let i = 0; i < facultyEntries.length; i++) {
      for (let j = i + 1; j < facultyEntries.length; j++) {
        const e1 = facultyEntries[i];
        const e2 = facultyEntries[j];
        if (e1.day === e2.day && e1.startTime === e2.startTime) {
          warnings.push(
            `Double-booking detected on ${e1.day} at ${e1.startTime}: "${e1.subjectName}" and "${e2.subjectName}".`
          );
        }
      }
    }

    // Check for sessions in unavailable slots
    facultyEntries.forEach((e) => {
      const slotLabel = `${e.startTime} - ${e.endTime}`;
      const unavail = localUnavailableSlots[e.day] || [];
      if (unavail.includes(slotLabel)) {
        warnings.push(
          `Schedule conflict on ${e.day} (${slotLabel}): Session "${e.subjectName}" scheduled during your declared unavailable slot.`
        );
      }
    });

    return warnings;
  }, [facultyEntries, localUnavailableSlots]);

  // Toggle slot unavailability
  const handleToggleSlot = (day: DayOfWeek, slotLabel: string) => {
    setLocalUnavailableSlots((prev) => {
      const current = prev[day] || [];
      const updated = current.includes(slotLabel)
        ? current.filter((s) => s !== slotLabel)
        : [...current, slotLabel];
      return { ...prev, [day]: updated };
    });
  };

  // Save updated availability to Firestore
  const handleSaveAvailability = async () => {
    if (!currentFaculty) return;
    setSavingAvailability(true);
    setSaveSuccess(false);

    try {
      for (const day of DAYS_OF_WEEK) {
        const rec: FacultyAvailability = {
          id: `${currentFaculty.id}_${day}`,
          facultyId: currentFaculty.id,
          day,
          availableSlots: [],
          unavailableSlots: localUnavailableSlots[day] || []
        };
        await saveFacultyAvailability(rec);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to save availability:', err);
    } finally {
      setSavingAvailability(false);
    }
  };

  const teachingHours = facultyEntries.length;
  const maxHours = currentFaculty?.maxHoursPerWeek || 16;
  const loadPercentage = Math.min(100, Math.round((teachingHours / maxHours) * 100));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-500">
                {currentFaculty?.department || 'Department'} • {currentFaculty?.designation}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {currentFaculty ? currentFaculty.name : 'Faculty Dashboard'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Teaching schedule assignments, weekly workload, and office hours availability.
            </p>
          </div>

          {/* Actions: Faculty Selector & Print Button */}
          <div className="flex flex-wrap items-center gap-2">
            {facultyList.length > 0 && onSelectFaculty && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-600 pl-1 font-medium">Instructor:</span>
                <select
                  value={currentFacultyId}
                  onChange={(e) => onSelectFaculty(e.target.value)}
                  className="bg-white text-xs text-slate-900 font-semibold px-2.5 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                >
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer no-print"
              title="Print official teaching schedule or export spreadsheet/calendar"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Conflict Alert Banner if any */}
      {facultyConflicts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-900">
              Schedule Warnings ({facultyConflicts.length})
            </h4>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
              {facultyConflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Weekly Sessions */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>Weekly Sessions</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{facultyEntries.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Teaching hours assigned</p>
        </div>

        {/* Workload Meter */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>Teaching Capacity</span>
            <span className="text-[11px] font-mono text-slate-700 font-medium">
              {teachingHours} / {maxHours} hrs
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-2 border border-slate-200">
            <div
              className={`h-2 rounded-full transition-all ${
                loadPercentage > 90 ? 'bg-rose-600' : 'bg-blue-600'
              }`}
              style={{ width: `${loadPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">{loadPercentage}% of target</p>
        </div>

        {/* Batches Handled */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>Cohorts Handled</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {new Set(facultyEntries.map((e) => e.batchId)).size}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Student cohorts</p>
        </div>

        {/* Conflicts Status */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1.5">
            <span>Audit Status</span>
            {facultyConflicts.length === 0 ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
          </div>
          <div
            className={`text-lg font-bold ${
              facultyConflicts.length === 0 ? 'text-emerald-700' : 'text-amber-800'
            }`}
          >
            {facultyConflicts.length === 0 ? 'Zero Conflicts' : `${facultyConflicts.length} Notices`}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Institutional verification</p>
        </div>
      </div>

      {/* Tabs & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Teaching Timetable
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'availability'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Office Hours & Availability
          </button>
        </div>

        <button
          onClick={() => setIsPrintModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 shadow-xs transition-all cursor-pointer no-print self-start sm:self-center"
          title="Print official teaching schedule or export spreadsheet/calendar"
        >
          <Printer className="w-3.5 h-3.5 text-slate-700" />
          <span>Print / Export Timetable</span>
        </button>
      </div>

      {/* Tab 1: Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          {/* Today's Teaching Highlights */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Today's Teaching Schedule ({todayName})
              </div>
              <p className="text-sm text-slate-800">
                You have <span className="font-bold text-slate-900">{todayClasses.length} sessions</span>{' '}
                scheduled for today.
              </p>
            </div>

            {upcomingLecture && (
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
                <div className="w-7 h-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  Next
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{upcomingLecture.subjectName}</h4>
                  <p className="text-[11px] text-slate-500">
                    {upcomingLecture.startTime} - {upcomingLecture.endTime} • {upcomingLecture.roomName} (
                    {upcomingLecture.batchName})
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Timetable Grid */}
          {facultyEntries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 text-slate-500 space-y-3">
              <CalendarCheck className="w-10 h-10 mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-900">No Teaching Sessions Assigned</h3>
              <p className="text-xs max-w-md mx-auto">
                No active timetable entries are mapped to your faculty profile ({currentFaculty?.name}).
              </p>
            </div>
          ) : (
            <TimetableGrid
              entries={facultyEntries}
              facultyList={facultyList}
              highlightFacultyId={currentFacultyId}
            />
          )}
        </div>
      )}

      {/* Tab 2: Availability Editor */}
      {activeTab === 'availability' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Weekly Availability Matrix</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click time slots to toggle your availability. Marked busy slots will be strictly respected by the automated scheduler.
              </p>
            </div>

            <button
              onClick={handleSaveAvailability}
              disabled={savingAvailability}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all self-start sm:self-center cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />{' '}
                  {savingAvailability ? 'Saving...' : 'Save Availability'}
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {DAYS_OF_WEEK.map((day) => {
              const unavail = localUnavailableSlots[day] || [];

              return (
                <div
                  key={day}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800">{day}</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {TIME_SLOTS.length - unavail.length} open
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {TIME_SLOTS.map((slot) => {
                      const isUnavailable = unavail.includes(slot.label);
                      return (
                        <button
                          key={slot.label}
                          onClick={() => handleToggleSlot(day, slot.label)}
                          className={`w-full p-2 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between border cursor-pointer ${
                            isUnavailable
                              ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          <span className="text-[11px] font-mono">{slot.label}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              isUnavailable
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isUnavailable ? 'BUSY' : 'OPEN'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Print & Export Modal */}
      <PrintExportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        entries={facultyEntries}
        title={currentFaculty ? currentFaculty.name : 'Faculty Teaching Schedule'}
        subtitle={`${currentFaculty?.department || 'Department'} • ${currentFaculty?.designation || 'Instructor'} • Target Teaching Hours: ${currentFaculty?.maxHoursPerWeek || 16} hrs/week`}
        facultyList={facultyList}
        userRole="teacher"
      />
    </div>
  );
};
