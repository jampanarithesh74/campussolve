import React, { useState, useMemo } from 'react';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  ValidationReport
} from '../../types';
import { TimetableGrid } from '../common/TimetableGrid';
import { AutomatedSchedulerModal } from './AutomatedSchedulerModal';
import { TimetableEntryModal } from './TimetableEntryModal';
import { FacultyModal, BatchModal, SubjectModal, RoomModal } from './ResourceModals';
import { DemoDataReportModal } from './DemoDataReportModal';
import { PrintExportModal } from '../common/PrintExportModal';
import { ConflictMap } from './ConflictMap';
import { validateFullSchedule } from '../../lib/scheduler';
import { loadFictionalDemoData, LoadDemoDataResult } from '../../lib/demoData';
import {
  saveBatch,
  deleteBatch,
  saveFaculty,
  deleteFaculty,
  saveSubject,
  deleteSubject,
  saveRoom,
  deleteRoom,
  saveTimetableEntry,
  deleteTimetableEntry,
  replaceAllTimetableEntries
} from '../../lib/timetableService';
import {
  Calendar,
  Users,
  UserCheck,
  BookOpen,
  MapPin,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Play,
  RotateCcw,
  Download,
  Printer,
  Database,
  Trash2,
  Edit2,
  ShieldCheck,
  Check,
  Search,
  Filter,
  Flame
} from 'lucide-react';

interface AdminDashboardProps {
  entries: TimetableEntry[];
  batches: Batch[];
  faculty: Faculty[];
  subjects: Subject[];
  rooms: Room[];
  availabilities: FacultyAvailability[];
  onRefreshData: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  entries,
  batches,
  faculty,
  subjects,
  rooms,
  availabilities,
  onRefreshData
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'grid' | 'batches' | 'faculty' | 'subjects' | 'rooms' | 'conflicts' | 'conflict-map'>('grid');

  // Filter for the Timetable Grid
  const [gridFilterType, setGridFilterType] = useState<'batch' | 'faculty' | 'room'>('batch');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('ALL');

  // Modals state
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<TimetableEntry | null>(null);

  const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
  const [facultyToEdit, setFacultyToEdit] = useState<Faculty | null>(null);

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<Batch | null>(null);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);

  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Demo seeding action feedback & audit report
  const [seeding, setSeeding] = useState(false);
  const [demoReport, setDemoReport] = useState<LoadDemoDataResult | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isForceReloading, setIsForceReloading] = useState(false);

  // Validation report
  const validationReport: ValidationReport = useMemo(() => {
    return validateFullSchedule(entries, faculty, batches, rooms, availabilities);
  }, [entries, faculty, batches, rooms, availabilities]);

  // Filtered timetable entries for the grid
  const displayedEntries = useMemo(() => {
    if (selectedFilterId === 'ALL') return entries;
    if (gridFilterType === 'batch') {
      return entries.filter((e) => e.batchId === selectedFilterId);
    }
    if (gridFilterType === 'faculty') {
      return entries.filter((e) => e.facultyId === selectedFilterId);
    }
    if (gridFilterType === 'room') {
      return entries.filter((e) => e.roomId === selectedFilterId);
    }
    return entries;
  }, [entries, gridFilterType, selectedFilterId]);

  // Dynamic document title for print/export
  const printTitle = useMemo(() => {
    if (gridFilterType === 'batch' && selectedFilterId !== 'ALL') {
      const b = batches.find((item) => item.id === selectedFilterId);
      return b ? b.name : 'Cohort Timetable';
    }
    if (gridFilterType === 'faculty' && selectedFilterId !== 'ALL') {
      const f = faculty.find((item) => item.id === selectedFilterId);
      return f ? `Faculty Schedule: ${f.name}` : 'Faculty Timetable';
    }
    if (gridFilterType === 'room' && selectedFilterId !== 'ALL') {
      const r = rooms.find((item) => item.id === selectedFilterId);
      return r ? `Facility Schedule: ${r.name}` : 'Facility Timetable';
    }
    return 'Institutional Master Timetable';
  }, [gridFilterType, selectedFilterId, batches, faculty, rooms]);

  const printSubtitle = useMemo(() => {
    if (selectedFilterId === 'ALL') {
      return `Master institutional timetable spanning ${batches.length} cohorts, ${faculty.length} faculty, and ${rooms.length} facilities`;
    }
    return `Filtered by ${gridFilterType.toUpperCase()} • ${displayedEntries.length} scheduled sessions`;
  }, [selectedFilterId, gridFilterType, batches.length, faculty.length, rooms.length, displayedEntries.length]);

  // Handle Loading Synthetic Demo Data (Protects existing records by default)
  const handleLoadDemoData = async () => {
    setSeeding(true);
    try {
      const res = await loadFictionalDemoData(false);
      setDemoReport(res);
      setIsReportModalOpen(true);
      onRefreshData();
    } catch (err) {
      console.error('Demo data loading error:', err);
    } finally {
      setSeeding(false);
    }
  };

  // Handle Force Reload if requested by admin
  const handleForceReloadDemoData = async () => {
    setIsForceReloading(true);
    try {
      const res = await loadFictionalDemoData(true);
      setDemoReport(res);
      onRefreshData();
    } catch (err) {
      console.error('Demo data force reload error:', err);
    } finally {
      setIsForceReloading(false);
    }
  };

  // Export & Print actions
  const handleExportCSV = () => {
    setIsPrintModalOpen(true);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Deck */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                Administrative Center
              </span>
              <span className="text-xs text-slate-500">Course Scheduling & Operations</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Academic Timetable Controller
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Constraint-verified scheduling, automated conflict resolution, and campus resource orchestration.
            </p>
          </div>

          {/* Quick Actions Deck */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsSchedulerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-200" />
              Generate Schedule
            </button>

            <button
              onClick={() => setActiveTab('conflict-map')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                activeTab === 'conflict-map'
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-rose-700'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-600" />
              Conflict Map (D3)
            </button>

            <button
              onClick={() => {
                setEntryToEdit(null);
                setIsEntryModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Session
            </button>

            <button
              onClick={handleLoadDemoData}
              disabled={seeding}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Database className="w-4 h-4 text-slate-500" />
              {seeding ? 'Loading Data...' : 'Load Demo Data'}
            </button>

            <button
              onClick={handleExportCSV}
              title="Export schedule as CSV"
              className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handlePrint}
              title="Print timetable view"
              className="p-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Batches */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Batches</span>
            <Users className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{batches.length}</div>
          <span className="text-[11px] text-slate-400">Student cohorts</span>
        </div>

        {/* Faculty */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Faculty</span>
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{faculty.length}</div>
          <span className="text-[11px] text-slate-400">Instructors</span>
        </div>

        {/* Subjects */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Subjects</span>
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{subjects.length}</div>
          <span className="text-[11px] text-slate-400">Course modules</span>
        </div>

        {/* Classrooms */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Rooms</span>
            <MapPin className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{rooms.length}</div>
          <span className="text-[11px] text-slate-400">
            {rooms.filter((r) => r.isLab).length} Labs, {rooms.filter((r) => !r.isLab).length} Classrooms
          </span>
        </div>

        {/* Total Scheduled */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Sessions</span>
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{entries.length}</div>
          <span className="text-[11px] text-slate-400">Active slots</span>
        </div>

        {/* Conflict Status Indicator */}
        <div
          onClick={() => setActiveTab('conflict-map')}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition-all ${
            validationReport.isValid
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 hover:bg-emerald-50'
              : 'bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-50'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-slate-700">Audit Status</span>
            {validationReport.isValid ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="text-base font-bold">
            {validationReport.isValid ? 'Clean (0 Conflicts)' : `${validationReport.conflicts.length} Violations`}
          </div>
          <span className="text-[11px] opacity-75">
            {validationReport.isValid ? 'Zero overlap' : 'Inspect collisions'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('grid')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'grid'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Timetable Grid
        </button>

        <button
          onClick={() => setActiveTab('batches')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Batches ({batches.length})
        </button>

        <button
          onClick={() => setActiveTab('faculty')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'faculty'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Faculty ({faculty.length})
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'subjects'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Subjects ({subjects.length})
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Rooms & Labs ({rooms.length})
        </button>

        <button
          onClick={() => setActiveTab('conflict-map')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'conflict-map'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          Conflict Map (D3)
        </button>

        <button
          onClick={() => setActiveTab('conflicts')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'conflicts'
              ? 'bg-slate-900 text-white shadow-xs'
              : validationReport.conflicts.length > 0
              ? 'text-rose-600 hover:bg-rose-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Conflict Audit ({validationReport.conflicts.length})
        </button>
      </div>

      {/* Tab 1: Master Timetable Grid */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          {/* Grid Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Grid By:
              </span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => {
                    setGridFilterType('batch');
                    setSelectedFilterId('ALL');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    gridFilterType === 'batch' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Batch
                </button>
                <button
                  onClick={() => {
                    setGridFilterType('faculty');
                    setSelectedFilterId('ALL');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    gridFilterType === 'faculty' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Faculty
                </button>
                <button
                  onClick={() => {
                    setGridFilterType('room');
                    setSelectedFilterId('ALL');
                  }}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                    gridFilterType === 'room' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Room
                </button>
              </div>
            </div>

            {/* Target Select */}
            <div className="flex items-center gap-2">
              <select
                value={selectedFilterId}
                onChange={(e) => setSelectedFilterId(e.target.value)}
                className="bg-white text-xs text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs font-medium"
              >
                <option value="ALL">All {gridFilterType === 'batch' ? 'Batches' : gridFilterType === 'faculty' ? 'Faculty' : 'Rooms'}</option>
                {gridFilterType === 'batch' &&
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                {gridFilterType === 'faculty' &&
                  faculty.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                {gridFilterType === 'room' &&
                  rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.isLab ? 'Lab' : 'Class'})
                    </option>
                  ))}
              </select>

              <span className="text-xs text-slate-500 font-mono">
                {displayedEntries.length} entries shown
              </span>

              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer no-print ml-2"
                title="Print or export current timetable view"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Export</span>
              </button>
            </div>
          </div>

          {/* Timetable Grid View */}
          {displayedEntries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto border border-slate-200">
                <Database className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {batches.length === 0 ? 'Cloud Firestore Database is Empty' : 'No Scheduled Sessions Found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {batches.length === 0
                    ? 'No faculty, batches, or timetable entries were found in your Firestore collections yet. Click "Load Demo Data" below to populate the synthetic campus dataset.'
                    : 'No class sessions match the current filter selection. Select another batch/faculty or add a new session.'}
                </p>
              </div>

              {batches.length === 0 && (
                <div className="pt-2">
                  <button
                    onClick={handleLoadDemoData}
                    disabled={seeding}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Database className="w-4 h-4" />
                    {seeding ? 'Loading Synthetic Data...' : 'Load Fictional Demo Data'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <TimetableGrid
              entries={displayedEntries}
              facultyList={faculty}
              isAdmin={true}
              onEditEntry={(entry) => {
                setEntryToEdit(entry);
                setIsEntryModalOpen(true);
              }}
              onDeleteEntry={async (id) => {
                if (window.confirm('Are you sure you want to delete this scheduled session?')) {
                  await deleteTimetableEntry(id);
                  onRefreshData();
                }
              }}
            />
          )}
        </div>
      )}

      {/* Tab 2: Batches Management */}
      {activeTab === 'batches' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Batches</h3>
              <p className="text-xs text-slate-500">Manage cohorts and enrollment sizes for capacity enforcement.</p>
            </div>
            <button
              onClick={() => {
                setBatchToEdit(null);
                setIsBatchModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Batch
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {batches.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{b.name}</h4>
                  <p className="text-xs text-slate-500">
                    {b.year} • {b.semester} • <span className="text-blue-700 font-medium">{b.studentCount} students</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setBatchToEdit(b);
                      setIsBatchModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete batch "${b.name}"?`)) {
                        await deleteBatch(b.id);
                        onRefreshData();
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Faculty Management */}
      {activeTab === 'faculty' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Faculty Directory</h3>
              <p className="text-xs text-slate-500">Instructor designations, maximum teaching hours, and departments.</p>
            </div>
            <button
              onClick={() => {
                setFacultyToEdit(null);
                setIsFacultyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Faculty
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {faculty.map((f) => (
              <div key={f.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white"
                    style={{ backgroundColor: f.color || '#2563eb' }}
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{f.name}</h4>
                    <p className="text-xs text-slate-500">
                      {f.designation} • {f.department} • <span className="font-mono text-slate-700">{f.email}</span> • Max {f.maxHoursPerWeek}h/wk
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFacultyToEdit(f);
                      setIsFacultyModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete faculty record "${f.name}"?`)) {
                        await deleteFaculty(f.id);
                        onRefreshData();
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Subjects Management */}
      {activeTab === 'subjects' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Course Curriculum & Subjects</h3>
              <p className="text-xs text-slate-500">Lecture counts, laboratory classification, and cohort assignments.</p>
            </div>
            <button
              onClick={() => {
                setSubjectToEdit(null);
                setIsSubjectModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {subjects.map((s) => {
              const b = batches.find((item) => item.id === s.batchId);
              const fids = s.facultyIds && s.facultyIds.length > 0 ? s.facultyIds : (s.facultyId ? [s.facultyId] : []);
              const assignedFacultyNames = fids.map((id) => faculty.find((item) => item.id === id)?.name || id).join(', ') || 'Unassigned';
              return (
                <div key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {s.code}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900">{s.name}</h4>
                      {s.isLab && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          LAB PRACTICAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {s.credits} Credits • {s.weeklyLectures} sessions/wk • Batch: {b?.name || s.batchId} • <span className="font-medium text-slate-700">Faculty:</span> {assignedFacultyNames}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSubjectToEdit(s);
                        setIsSubjectModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Delete subject "${s.name}"?`)) {
                          await deleteSubject(s.id);
                          onRefreshData();
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer shadow-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 5: Rooms Management */}
      {activeTab === 'rooms' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Classrooms & Laboratories</h3>
              <p className="text-xs text-slate-500">Campus facilities, physical capacity, and equipment status.</p>
            </div>
            <button
              onClick={() => {
                setRoomToEdit(null);
                setIsRoomModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Facility
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {rooms.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900">{r.name}</h4>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        r.isLab
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {r.isLab ? 'LABORATORY' : 'LECTURE HALL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Building: {r.building} • Seating Capacity: <span className="text-slate-800 font-semibold">{r.capacity} seats</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRoomToEdit(r);
                      setIsRoomModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Delete room "${r.name}"?`)) {
                        await deleteRoom(r.id);
                        onRefreshData();
                      }
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Conflict Audit Center */}
      {activeTab === 'conflicts' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Institutional Conflict Audit Center
              </h3>
              <p className="text-xs text-slate-500">
                Evaluates institutional scheduling constraints across live timetable entries.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('conflict-map')}
              className="px-3.5 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Flame className="w-3.5 h-3.5 text-rose-200" />
              Open Visual Conflict Map (D3)
            </button>
          </div>

          {validationReport.conflicts.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Zero Avoidable Conflicts Detected</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                All scheduled class sessions strictly satisfy faculty non-overlap, cohort availability, room capacities,
                and laboratory equipment requirements.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {validationReport.conflicts.map((conf, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border flex items-start justify-between gap-4 ${
                    conf.severity === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          conf.severity === 'error'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {conf.type.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900">{conf.title}</h4>
                    </div>
                    <p className="text-xs text-slate-700">{conf.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Visual Conflict Map (D3) */}
      {activeTab === 'conflict-map' && (
        <ConflictMap
          entries={entries}
          rooms={rooms}
          faculty={faculty}
          batches={batches}
          subjects={subjects}
          availabilities={availabilities}
          onEditEntry={(entry) => {
            setEntryToEdit(entry);
            setIsEntryModalOpen(true);
          }}
        />
      )}

      {/* Automated Scheduler Modal */}
      <AutomatedSchedulerModal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        subjects={subjects}
        batches={batches}
        rooms={rooms}
        faculty={faculty}
        availabilities={availabilities}
        onCommitSchedule={async (newEntries) => {
          await replaceAllTimetableEntries(newEntries);
          onRefreshData();
        }}
      />

      {/* Timetable Entry Modal */}
      <TimetableEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => {
          setIsEntryModalOpen(false);
          setEntryToEdit(null);
        }}
        entryToEdit={entryToEdit}
        entries={entries}
        subjects={subjects}
        batches={batches}
        rooms={rooms}
        faculty={faculty}
        availabilities={availabilities}
        onSaveEntry={async (entry) => {
          await saveTimetableEntry(entry);
          onRefreshData();
        }}
      />

      {/* Resource Modals */}
      <FacultyModal
        isOpen={isFacultyModalOpen}
        onClose={() => {
          setIsFacultyModalOpen(false);
          setFacultyToEdit(null);
        }}
        facultyToEdit={facultyToEdit}
        onSave={async (f) => {
          await saveFaculty(f);
          onRefreshData();
        }}
      />

      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setBatchToEdit(null);
        }}
        batchToEdit={batchToEdit}
        onSave={async (b) => {
          await saveBatch(b);
          onRefreshData();
        }}
      />

      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => {
          setIsSubjectModalOpen(false);
          setSubjectToEdit(null);
        }}
        subjectToEdit={subjectToEdit}
        batches={batches}
        faculty={faculty}
        onSave={async (s) => {
          await saveSubject(s);
          onRefreshData();
        }}
      />

      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => {
          setIsRoomModalOpen(false);
          setRoomToEdit(null);
        }}
        roomToEdit={roomToEdit}
        onSave={async (r) => {
          await saveRoom(r);
          onRefreshData();
        }}
      />

      {/* Synthetic Demo Data Audit Report Modal */}
      <DemoDataReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        result={demoReport}
        onForceReload={handleForceReloadDemoData}
        isReloading={isForceReloading}
      />

      {/* Official Print & Export Modal */}
      <PrintExportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        entries={displayedEntries}
        title={printTitle}
        subtitle={printSubtitle}
        facultyList={faculty}
        roomsList={rooms}
        userRole="admin"
      />
    </div>
  );
};
