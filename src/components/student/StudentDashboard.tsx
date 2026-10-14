import React, { useState, useMemo } from 'react';
import { Batch, Faculty, TimetableEntry, DayOfWeek, DAYS_OF_WEEK } from '../../types';
import { TimetableGrid } from '../common/TimetableGrid';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Filter,
  Layers,
  Sparkles,
  Info,
  CalendarDays,
  Printer,
  Download
} from 'lucide-react';
import { PrintExportModal } from '../common/PrintExportModal';

interface StudentDashboardProps {
  entries: TimetableEntry[];
  batches: Batch[];
  faculty: Faculty[];
  currentBatchId: string;
  onSelectBatch?: (batchId: string) => void;
  onRefresh?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  entries,
  batches,
  faculty,
  currentBatchId,
  onSelectBatch
}) => {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'ALL'>('ALL');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'lecture' | 'lab'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const activeBatch = batches.find((b) => b.id === currentBatchId) || batches[0];

  // Filter entries belonging to this student's batch
  const batchEntries = useMemo(() => {
    return entries.filter((e) => e.batchId === currentBatchId);
  }, [entries, currentBatchId]);

  // Apply Day and Session Type filters
  const filteredEntries = useMemo(() => {
    return batchEntries.filter((e) => {
      const matchDay = selectedDay === 'ALL' || e.day === selectedDay;
      const matchType = sessionFilter === 'ALL' || e.sessionType === sessionFilter;
      return matchDay && matchType;
    });
  }, [batchEntries, selectedDay, sessionFilter]);

  // Determine today's day of week
  const todayName = useMemo(() => {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as any;
    const current = days[new Date().getDay()];
    return DAYS_OF_WEEK.includes(current as DayOfWeek) ? (current as DayOfWeek) : 'Monday';
  }, []);

  // Today's classes
  const todayClasses = useMemo(() => {
    return batchEntries
      .filter((e) => e.day === todayName)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [batchEntries, todayName]);

  // Next upcoming lecture
  const upcomingLecture = todayClasses.length > 0 ? todayClasses[0] : null;

  return (
    <div className="space-y-6">
      {/* Top Banner / Batch Info */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Student Portal
              </span>
              <span className="text-xs text-slate-500">
                {activeBatch?.year || 'Academic Year'} • {activeBatch?.semester || 'Semester'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {activeBatch ? activeBatch.name : 'Computer Science - Year 3 (Batch A)'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Personalized weekly course schedule, lecture classrooms, and faculty contacts.
            </p>
          </div>

          {/* Actions: Batch Selector & Print Button */}
          <div className="flex flex-wrap items-center gap-2">
            {batches.length > 0 && onSelectBatch && (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-600 pl-1 font-medium">Cohort:</span>
                <select
                  value={currentBatchId}
                  onChange={(e) => onSelectBatch(e.target.value)}
                  className="bg-white text-xs text-slate-900 font-semibold px-2.5 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer no-print"
              title="Print official timetable or export spreadsheet/calendar"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Today's Schedule & Upcoming Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upcoming class hero card */}
        <div className="md:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Next Scheduled Class</h3>
                <p className="text-xs text-slate-500">Today ({todayName})</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              {todayClasses.length} sessions today
            </span>
          </div>

          {upcomingLecture ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      upcomingLecture.sessionType === 'lab'
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {upcomingLecture.sessionType.toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {upcomingLecture.startTime} - {upcomingLecture.endTime}
                  </span>
                </div>
                <h4 className="text-base font-bold text-slate-900">
                  {upcomingLecture.subjectName}
                </h4>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {upcomingLecture.facultyName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {upcomingLecture.roomName}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center justify-center gap-0.5 bg-white px-3 py-2 rounded-lg border border-slate-200 text-center shadow-xs">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">{upcomingLecture.startTime}</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center py-6 text-slate-500 text-xs">
              No further sessions scheduled for today ({todayName}).
            </div>
          )}
        </div>

        {/* Quick batch statistics */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            Batch Workload
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Weekly Lectures</span>
              <span className="font-bold text-slate-900">
                {batchEntries.filter((e) => e.sessionType === 'lecture').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Laboratory Practicals</span>
              <span className="font-bold text-indigo-700">
                {batchEntries.filter((e) => e.sessionType === 'lab').length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
              <span className="text-slate-500">Total Weekly Slots</span>
              <span className="font-bold text-blue-700">{batchEntries.length} slots</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-500">Enrolled Students</span>
              <span className="font-bold text-slate-800">{activeBatch?.studentCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
        {/* Day Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-medium text-slate-500 mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Day:
          </span>
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
              selectedDay === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Week
          </button>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                selectedDay === day
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Session Type & View Switcher */}
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value as any)}
            className="bg-white text-xs text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs font-medium"
          >
            <option value="ALL">All Session Types</option>
            <option value="lecture">Lectures Only</option>
            <option value="lab">Labs Only</option>
          </select>

          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 text-xs rounded font-medium transition-all cursor-pointer ${
                viewMode === 'agenda' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              List
            </button>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold shadow-xs transition-all cursor-pointer no-print"
            title="Print or download schedule"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {batchEntries.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Timetable Assigned Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your academic department has not yet published the schedule for{' '}
              <span className="text-slate-800 font-semibold">{activeBatch?.name || 'this batch'}</span>.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Tip: Administrators can initialize demo data or generate schedules in the Admin view.
          </div>
        </div>
      ) : viewMode === 'grid' && selectedDay === 'ALL' && sessionFilter === 'ALL' ? (
        <TimetableGrid entries={batchEntries} facultyList={faculty} highlightBatchId={currentBatchId} />
      ) : (
        /* Agenda / Filtered List View */
        <div className="space-y-4">
          {DAYS_OF_WEEK.filter((d) => selectedDay === 'ALL' || d === selectedDay).map((day) => {
            const dayList = filteredEntries
              .filter((e) => e.day === day)
              .sort((a, b) => a.startTime.localeCompare(b.startTime));

            if (dayList.length === 0 && selectedDay !== 'ALL') {
              return (
                <div
                  key={day}
                  className="p-8 text-center rounded-xl bg-white border border-slate-200 text-slate-500 text-xs"
                >
                  No classes matching filters on {day}.
                </div>
              );
            }

            if (dayList.length === 0) return null;

            return (
              <div key={day} className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{day}</span>
                  <span className="text-xs text-slate-500 font-medium">{dayList.length} sessions</span>
                </div>
                <div className="divide-y divide-slate-100 p-2 space-y-1.5">
                  {dayList.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-slate-50/70 hover:bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              entry.sessionType === 'lab'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {entry.sessionType.toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-slate-700">
                            {entry.startTime} - {entry.endTime}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{entry.subjectName}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {entry.facultyName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {entry.roomName}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-xs font-medium">
                          {entry.batchName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Print & Export Modal */}
      <PrintExportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        entries={batchEntries}
        title={activeBatch ? activeBatch.name : 'Cohort Timetable'}
        subtitle={`${activeBatch?.year || ''} • ${activeBatch?.semester || ''} • Enrollment: ${activeBatch?.studentCount || 0} students`}
        facultyList={faculty}
        userRole="student"
      />
    </div>
  );
};
