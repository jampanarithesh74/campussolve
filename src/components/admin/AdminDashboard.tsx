import React, { useState, useMemo } from 'react';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  ValidationReport,
  RoomBooking,
  NotificationItem,
  BookingStatus
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
  replaceAllTimetableEntries,
  getRoomBookings,
  updateRoomBookingStatus,
  deleteRoomBooking,
  getNotifications,
  markNotificationAsRead
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
  Flame,
  Tv,
  Mic,
  Zap,
  Monitor,
  Clock,
  CheckCheck,
  XCircle,
  X,
  Bell,
  BellRing,
  CalendarCheck,
  MessageSquare
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
  const [activeTab, setActiveTab] = useState<'grid' | 'batches' | 'faculty' | 'subjects' | 'rooms' | 'bookings' | 'conflicts' | 'conflict-map'>('grid');

  // Venue Bookings & Notifications state
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [rejectingBooking, setRejectingBooking] = useState<RoomBooking | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Load bookings and notifications
  const loadBookingsAndNotifs = async () => {
    setBookingsLoading(true);
    try {
      const [bList, nList] = await Promise.all([
        getRoomBookings().catch(() => []),
        getNotifications('admin').catch(() => [])
      ]);
      setBookings(bList || []);
      setNotifications(nList || []);
    } catch (err) {
      console.error('Error fetching room bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  React.useEffect(() => {
    loadBookingsAndNotifs();
  }, []);

  const pendingBookingsCount = useMemo(() => {
    return bookings.filter((b) => b.status === 'pending').length;
  }, [bookings]);

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Handle Approve (Allot Room)
  const handleApproveBooking = async (b: RoomBooking) => {
    setActionInProgress(b.id);
    try {
      await updateRoomBookingStatus(b.id, 'approved', 'Allotted by Academic Administration', 'Administrator', b);
      await loadBookingsAndNotifs();
      onRefreshData();
    } catch (err) {
      console.error('Failed to approve room booking:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Reject
  const handleConfirmReject = async () => {
    if (!rejectingBooking) return;
    setActionInProgress(rejectingBooking.id);
    try {
      await updateRoomBookingStatus(
        rejectingBooking.id,
        'rejected',
        rejectRemarks.trim() || 'Facility unavailable during requested slot',
        'Administrator',
        rejectingBooking
      );
      setRejectingBooking(null);
      setRejectRemarks('');
      await loadBookingsAndNotifs();
      onRefreshData();
    } catch (err) {
      console.error('Failed to reject room booking:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchFilter =
        bookingFilter === 'ALL' ? true : b.status === bookingFilter;
      const q = bookingSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (b.eventTitle || '').toLowerCase().includes(q) ||
        (b.studentName || '').toLowerCase().includes(q) ||
        (b.studentEmail || '').toLowerCase().includes(q) ||
        (b.roomName || '').toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [bookings, bookingFilter, bookingSearch]);

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
          onClick={() => setActiveTab('bookings')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'bookings'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Venue Bookings</span>
          {pendingBookingsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none">
              {pendingBookingsCount}
            </span>
          )}
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
              <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
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
                  <p className="text-xs text-slate-500">
                    Building: <span className="text-slate-700 font-medium">{r.building}</span> • Seating Capacity: <span className="text-slate-800 font-semibold">{r.capacity} seats</span>
                  </p>

                  {/* Configured Equipment Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {r.hasProjector && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <Tv className="w-3 h-3 text-indigo-600" />
                        Projector
                      </span>
                    )}
                    {r.hasMicSet && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Mic className="w-3 h-3 text-emerald-600" />
                        Mic Sets
                      </span>
                    )}
                    {r.hasExtensionBoxes && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        <Zap className="w-3 h-3 text-amber-600" />
                        Extension Boxes
                      </span>
                    )}
                    {(r.isLab || r.hasComputers) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        <Monitor className="w-3 h-3 text-blue-600" />
                        Workstations Lab
                      </span>
                    )}
                    {r.description && (
                      <span className="text-[11px] text-slate-400 italic">
                        • "{r.description}"
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setRoomToEdit(r);
                      setIsRoomModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                    title="Edit Room & Equipment"
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
                    title="Delete Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Venue Bookings Requests */}
      {activeTab === 'bookings' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Student Venue & Lab Booking Requests</h3>
                {pendingBookingsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    {pendingBookingsCount} Action Required
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Review, allot, or decline student event reservations for campus facilities and laboratories.
              </p>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <button
                onClick={() => setBookingFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({bookings.length})
              </button>
              <button
                onClick={() => setBookingFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingFilter === 'pending'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                Pending ({bookings.filter((b) => b.status === 'pending').length})
              </button>
              <button
                onClick={() => setBookingFilter('approved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingFilter === 'approved'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Allotted ({bookings.filter((b) => b.status === 'approved').length})
              </button>
              <button
                onClick={() => setBookingFilter('rejected')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bookingFilter === 'rejected'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                }`}
              >
                Rejected ({bookings.filter((b) => b.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={bookingSearch}
                onChange={(e) => setBookingSearch(e.target.value)}
                placeholder="Search by event title, student name, email, or room designation..."
                className="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
              />
            </div>
            <button
              onClick={loadBookingsAndNotifs}
              disabled={bookingsLoading}
              className="px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${bookingsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Bookings List */}
          {bookingsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Clock className="w-6 h-6 animate-spin mb-2 text-blue-600" />
              <span>Loading venue booking records...</span>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <CalendarCheck className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No booking requests found</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {bookingFilter === 'pending'
                  ? 'All student requests have been processed.'
                  : 'Students can request room bookings from their Student Portal.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => {
                const roomInfo = rooms.find((r) => r.id === b.roomId);
                const isPending = b.status === 'pending';
                const isApproved = b.status === 'approved';

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isPending
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : isApproved
                        ? 'bg-white border-emerald-300 shadow-xs'
                        : 'bg-white border-slate-200 opacity-80'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left: Event & Student Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{b.eventTitle}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {isPending ? 'Pending Approval' : isApproved ? 'Room Allotted' : 'Request Rejected'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {b.eventDescription || 'No description provided.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            Requested by: <span className="font-semibold text-slate-900">{b.studentName}</span> ({b.studentEmail})
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Date: <strong className="text-slate-800">{b.date}</strong> ({b.day || 'Day'}) from <strong>{b.startTime} - {b.endTime}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Expected: <strong>{b.expectedAttendees} attendees</strong>
                          </span>
                        </div>

                        {/* Room & Equipment info */}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                              {b.roomName} • {b.building || roomInfo?.building || 'Campus Wing'} (Capacity: {roomInfo?.capacity || 60} seats)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Facility Equipment:
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {roomInfo?.hasProjector && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-white text-indigo-700 border border-indigo-200">
                                <Tv className="w-3 h-3 text-indigo-600" /> Projector
                              </span>
                            )}
                            {roomInfo?.hasMicSet && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200">
                                <Mic className="w-3 h-3 text-emerald-600" /> Mic Sets
                              </span>
                            )}
                            {roomInfo?.hasExtensionBoxes && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-white text-amber-700 border border-amber-200">
                                <Zap className="w-3 h-3 text-amber-600" /> Extension Boxes
                              </span>
                            )}
                            {(roomInfo?.isLab || roomInfo?.hasComputers) && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-white text-blue-700 border border-blue-200">
                                <Monitor className="w-3 h-3 text-blue-600" /> Lab Workstations
                              </span>
                            )}
                            {b.equipmentRequested?.otherNotes && (
                              <span className="text-[11px] text-slate-600 italic">
                                Note: "{b.equipmentRequested.otherNotes}"
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Admin Remarks if reviewed */}
                        {b.adminRemarks && (
                          <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-100 p-2 rounded-lg mt-2">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                            <span>
                              <strong>Admin Remarks:</strong> {b.adminRemarks} (by {b.reviewedBy || 'Admin'} on {b.reviewedAt ? new Date(b.reviewedAt).toLocaleDateString() : ''})
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex lg:flex-col items-center gap-2 shrink-0">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleApproveBooking(b)}
                              disabled={actionInProgress === b.id}
                              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              <CheckCheck className="w-4 h-4" />
                              <span>{actionInProgress === b.id ? 'Allotting...' : 'Allot Room'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setRejectingBooking(b);
                                setRejectRemarks('');
                              }}
                              disabled={actionInProgress === b.id}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-300 shadow-xs transition-all cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                if (window.confirm('Delete this booking record?')) {
                                  await deleteRoomBooking(b.id);
                                  await loadBookingsAndNotifs();
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer shadow-xs"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Reject Booking Remarks Modal */}
      {rejectingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Decline Venue Request</h3>
              </div>
              <button
                onClick={() => setRejectingBooking(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-600 mb-1">
                  You are declining the booking request for:
                </p>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <p className="font-bold text-slate-900">{rejectingBooking.eventTitle}</p>
                  <p className="text-slate-600">
                    {rejectingBooking.roomName} • {rejectingBooking.date} ({rejectingBooking.startTime} - {rejectingBooking.endTime})
                  </p>
                  <p className="text-slate-500 mt-1">Requested by: {rejectingBooking.studentName}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Remarks for Student (Required)
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  placeholder="e.g. Facility is undergoing scheduled maintenance; Please request Gauss Hall instead; Lab required for academic examinations."
                  className="w-full bg-white text-xs text-slate-900 p-3 rounded-lg border border-slate-300 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingBooking(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionInProgress === rejectingBooking.id}
                  className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionInProgress === rejectingBooking.id ? 'Submitting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

  );
};
