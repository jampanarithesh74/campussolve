import React, { useState, useEffect, useMemo } from 'react';
import {
  Room,
  TimetableEntry,
  RoomBooking,
  NotificationItem,
  DayOfWeek,
  DAYS_OF_WEEK,
  TIME_SLOTS
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getRoomBookings,
  saveRoomBooking,
  deleteRoomBooking,
  getNotifications,
  markNotificationAsRead
} from '../../lib/timetableService';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tv,
  Mic,
  Zap,
  Monitor,
  Search,
  Filter,
  Send,
  Bell,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Info,
  CalendarCheck,
  Building,
  CheckCheck,
  Trash2
} from 'lucide-react';

interface VenueBookingSectionProps {
  rooms: Room[];
  entries: TimetableEntry[];
  onRefreshTimetable?: () => void;
}

export const VenueBookingSection: React.FC<VenueBookingSectionProps> = ({
  rooms,
  entries,
  onRefreshTimetable
}) => {
  const { currentUser, userProfile } = useAuth();

  const currentStudentId = userProfile?.id || currentUser?.uid || '';
  const currentStudentEmail = (userProfile?.email || currentUser?.email || '').toLowerCase();
  const currentStudentName = userProfile?.displayName || currentUser?.displayName || 'Student';

  // State
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'my-requests' | 'notifications'>('browse');
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'lab' | 'classroom'>('ALL');
  const [equipmentFilter, setEquipmentFilter] = useState<'ALL' | 'projector' | 'mic' | 'extension' | 'computers'>('ALL');

  // Selected date & timeslot for availability checking
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to tomorrow's date or today
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState<string>('14:00');
  const [endTime, setEndTime] = useState<string>('16:00');

  // Booking Modal State
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [expectedAttendees, setExpectedAttendees] = useState(30);
  const [requestProjector, setRequestProjector] = useState(true);
  const [requestMicSet, setRequestMicSet] = useState(false);
  const [requestExtensionBoxes, setRequestExtensionBoxes] = useState(false);
  const [requestComputers, setRequestComputers] = useState(false);
  const [otherEquipmentNotes, setOtherEquipmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Bookings & Notifications
  const loadData = async () => {
    setLoading(true);
    try {
      const [allBookings, notifs] = await Promise.all([
        getRoomBookings().catch(() => []),
        getNotifications('student', currentStudentId).catch(() => [])
      ]);
      setBookings(allBookings || []);
      setNotifications(notifs || []);
    } catch (err) {
      console.error('Failed to load venue bookings or notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentStudentId]);

  // Determine Day of week from selectedDate
  const selectedDayOfWeek = useMemo<DayOfWeek | null>(() => {
    if (!selectedDate) return null;
    const [year, month, day] = selectedDate.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as any;
    const dayName = days[d.getDay()];
    if (DAYS_OF_WEEK.includes(dayName)) {
      return dayName;
    }
    return null;
  }, [selectedDate]);

  // Helper to check if two time ranges overlap
  const isTimeOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
    return startA < endB && endA > startB;
  };

  // Availability function for a room
  const checkRoomAvailability = (room: Room) => {
    // 1. Check academic timetable entries if the date falls on a weekday
    if (selectedDayOfWeek) {
      const conflictingEntry = entries.find(
        (e) =>
          e.roomId === room.id &&
          e.day === selectedDayOfWeek &&
          isTimeOverlapping(e.startTime, e.endTime, startTime, endTime)
      );
      if (conflictingEntry) {
        return {
          isAvailable: false,
          reason: `Occupied by academic lecture: "${conflictingEntry.subjectName}" (${conflictingEntry.startTime} - ${conflictingEntry.endTime}) taught by ${conflictingEntry.facultyName}.`
        };
      }
    }

    // 2. Check other room bookings on that exact calendar date
    const conflictingBooking = bookings.find(
      (b) =>
        b.roomId === room.id &&
        b.date === selectedDate &&
        (b.status === 'approved' || b.status === 'pending') &&
        isTimeOverlapping(b.startTime, b.endTime, startTime, endTime)
    );
    if (conflictingBooking) {
      const isApproved = conflictingBooking.status === 'approved';
      return {
        isAvailable: false,
        reason: isApproved
          ? `Allotted for event: "${conflictingBooking.eventTitle}" (${conflictingBooking.startTime} - ${conflictingBooking.endTime}).`
          : `Pending request by ${conflictingBooking.studentName} for: "${conflictingBooking.eventTitle}" (${conflictingBooking.startTime} - ${conflictingBooking.endTime}).`
      };
    }

    return {
      isAvailable: true,
      reason: 'Room is completely free for event booking during this slot.'
    };
  };

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Type filter
      if (typeFilter === 'lab' && !r.isLab) return false;
      if (typeFilter === 'classroom' && r.isLab) return false;

      // Equipment filter
      if (equipmentFilter === 'projector' && !r.hasProjector) return false;
      if (equipmentFilter === 'mic' && !r.hasMicSet) return false;
      if (equipmentFilter === 'extension' && !r.hasExtensionBoxes) return false;
      if (equipmentFilter === 'computers' && !r.isLab && !r.hasComputers) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.name.toLowerCase().includes(q);
        const matchBuilding = r.building.toLowerCase().includes(q);
        const matchDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchName && !matchBuilding && !matchDesc) return false;
      }

      return true;
    });
  }, [rooms, typeFilter, equipmentFilter, searchQuery]);

  // Filtered student bookings
  const myBookings = useMemo(() => {
    return bookings.filter(
      (b) =>
        (currentStudentId && b.studentId === currentStudentId) ||
        (currentStudentEmail && (b.studentEmail || '').toLowerCase() === currentStudentEmail)
    );
  }, [bookings, currentStudentId, currentStudentEmail]);

  const unreadNotifsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Handle open booking modal
  const handleOpenBookingModal = (room: Room) => {
    setSelectedRoomForBooking(room);
    setEventTitle('');
    setEventDescription('');
    setExpectedAttendees(Math.min(30, room.capacity));
    setRequestProjector(Boolean(room.hasProjector));
    setRequestMicSet(Boolean(room.hasMicSet));
    setRequestExtensionBoxes(Boolean(room.hasExtensionBoxes));
    setRequestComputers(Boolean(room.isLab || room.hasComputers));
    setOtherEquipmentNotes('');
    setSubmitFeedback(null);
  };

  // Submit Room Booking Request
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomForBooking) return;

    if (!eventTitle.trim()) {
      setSubmitFeedback({ type: 'error', message: 'Please enter a title for your event.' });
      return;
    }

    if (startTime >= endTime) {
      setSubmitFeedback({ type: 'error', message: 'Event Start Time must be before End Time.' });
      return;
    }

    // Verify availability again before submitting
    const avail = checkRoomAvailability(selectedRoomForBooking);
    if (!avail.isAvailable) {
      setSubmitFeedback({
        type: 'error',
        message: `Facility is not available: ${avail.reason}`
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitFeedback(null);

    const bookingId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newBooking: RoomBooking = {
      id: bookingId,
      roomId: selectedRoomForBooking.id,
      roomName: selectedRoomForBooking.name,
      building: selectedRoomForBooking.building,
      studentId: currentStudentId || `student_${Date.now()}`,
      studentName: currentStudentName,
      studentEmail: currentStudentEmail || 'student@campus.edu',
      batchId: userProfile?.batchId,
      eventTitle: eventTitle.trim(),
      eventDescription: eventDescription.trim(),
      expectedAttendees: Number(expectedAttendees),
      date: selectedDate,
      day: selectedDayOfWeek || undefined,
      startTime,
      endTime,
      equipmentRequested: {
        projector: requestProjector,
        micSet: requestMicSet,
        extensionBoxes: requestExtensionBoxes,
        computers: requestComputers,
        otherNotes: otherEquipmentNotes.trim()
      },
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    try {
      await saveRoomBooking(newBooking);
      setSubmitFeedback({
        type: 'success',
        message: 'Permission request successfully submitted! An automated notification has been sent to campus administration for allotment review.'
      });
      await loadData();
      if (onRefreshTimetable) onRefreshTimetable();
      setTimeout(() => {
        setSelectedRoomForBooking(null);
        setActiveSubTab('my-requests');
      }, 1800);
    } catch (err: any) {
      console.error('Error submitting booking request:', err);
      setSubmitFeedback({
        type: 'error',
        message: err?.message || 'Failed to submit room booking request. Please check your network and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (b: RoomBooking) => {
    if (window.confirm(`Are you sure you want to cancel the booking request for "${b.eventTitle}"?`)) {
      try {
        await deleteRoomBooking(b.id);
        await loadData();
      } catch (err) {
        console.error('Failed to cancel booking:', err);
      }
    }
  };

  // Handle Mark Notif Read
  const handleMarkNotifRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                Venue &amp; Lab Booking
              </span>
              <span className="text-xs text-slate-500">Student Facility Reservation Portal</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Book a Campus Venue or Laboratory
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Conduct club events, hackathons, seminars, or workshops. View lab equipments configured by administration, check real-time availability, and request allotment permissions.
            </p>
          </div>

          {/* Quick Sub-Navigation Pills */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setActiveSubTab('browse')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'browse'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Browse Venues</span>
            </button>
            <button
              onClick={() => setActiveSubTab('my-requests')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'my-requests'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>My Requests</span>
              {myBookings.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                  {myBookings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab('notifications')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'notifications'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Notifications</span>
              {unreadNotifsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-TAB 1: BROWSE VENUES & CHECK EQUIPMENT / AVAILABILITY
          ========================================================================= */}
      {activeSubTab === 'browse' && (
        <div className="space-y-5">
          {/* Availability & Date/Time Filter Control Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                Select Event Date &amp; Time Slot for Live Availability Checking:
              </span>
              <button
                onClick={loadData}
                disabled={loading}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                <span>Refresh Bookings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Event Date {selectedDayOfWeek && <span className="text-blue-600 font-bold">({selectedDayOfWeek})</span>}
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                />
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.start} value={s.start}>
                      {s.start} ({s.label})
                    </option>
                  ))}
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                </select>
              </div>

              {/* End Time */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.end} value={s.end}>
                      {s.end}
                    </option>
                  ))}
                  <option value="17:00">17:00</option>
                  <option value="18:00">18:00</option>
                  <option value="19:00">19:00</option>
                </select>
              </div>

              {/* Preset Quick Buttons */}
              <div className="flex flex-col justify-end">
                <span className="text-[10px] text-slate-400 mb-1">Slot Presets</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setStartTime('14:00');
                      setEndTime('16:00');
                    }}
                    className="flex-1 py-1 px-2 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    Afternoon (2-4 PM)
                  </button>
                  <button
                    onClick={() => {
                      setStartTime('16:00');
                      setEndTime('18:00');
                    }}
                    className="flex-1 py-1 px-2 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                  >
                    Evening (4-6 PM)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Equipment Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by venue name, building, or apparatus..."
                className="w-full bg-slate-50 text-xs text-slate-900 pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white transition-all shadow-xs"
              />
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-white text-xs text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs font-medium"
              >
                <option value="ALL">All Facility Types</option>
                <option value="lab">Computer Labs Only</option>
                <option value="classroom">Lecture Halls Only</option>
              </select>

              <select
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value as any)}
                className="bg-white text-xs text-slate-800 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs font-medium"
              >
                <option value="ALL">All Equipments</option>
                <option value="projector">With Digital Projector</option>
                <option value="mic">With Sound &amp; Mic Sets</option>
                <option value="extension">With Extension Boxes</option>
                <option value="computers">With PC Workstations</option>
              </select>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const availability = checkRoomAvailability(room);

              return (
                <div
                  key={room.id}
                  className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    availability.isAvailable
                      ? 'bg-white border-slate-200 hover:border-blue-300 shadow-xs hover:shadow-md'
                      : 'bg-slate-50/70 border-slate-200 opacity-90'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                              room.isLab
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {room.isLab ? 'COMPUTER LAB' : 'LECTURE HALL'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">{room.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {room.building}
                        </p>
                      </div>

                      {/* Capacity badge */}
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200 flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3 text-slate-500" />
                        {room.capacity} seats
                      </span>
                    </div>

                    {/* Equipment Configured by Admin */}
                    <div className="pt-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Equipments Configured by Admin:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {/* Projector */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
                            room.hasProjector
                              ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-medium'
                              : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          <Tv className={`w-3.5 h-3.5 shrink-0 ${room.hasProjector ? 'text-indigo-600' : 'text-slate-400'}`} />
                          <span className="truncate">{room.hasProjector ? 'HD Projector' : 'No Projector'}</span>
                        </div>

                        {/* Mic Sets */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
                            room.hasMicSet
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
                              : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          <Mic className={`w-3.5 h-3.5 shrink-0 ${room.hasMicSet ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="truncate">{room.hasMicSet ? 'Mic Sets Avail' : 'No Mic Sets'}</span>
                        </div>

                        {/* Extension Boxes */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
                            room.hasExtensionBoxes
                              ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-medium'
                              : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          <Zap className={`w-3.5 h-3.5 shrink-0 ${room.hasExtensionBoxes ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span className="truncate">{room.hasExtensionBoxes ? 'Power Ext Boxes' : 'No Ext Boxes'}</span>
                        </div>

                        {/* Computers */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
                            room.isLab || room.hasComputers
                              ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-medium'
                              : 'bg-slate-100/60 border-slate-200 text-slate-400 line-through'
                          }`}
                        >
                          <Monitor className={`w-3.5 h-3.5 shrink-0 ${room.isLab || room.hasComputers ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="truncate">{room.isLab || room.hasComputers ? 'PC Workstations' : 'No PCs'}</span>
                        </div>
                      </div>

                      {/* Admin Description / Notes */}
                      {room.description && (
                        <p className="text-[11px] text-slate-500 italic mt-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                          Note: "{room.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Live Availability Status & Action */}
                  <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col gap-2.5">
                    {/* Status Badge */}
                    <div className="flex items-start gap-2">
                      {availability.isAvailable ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 w-full">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>AVAILABLE FOR BOOKING</span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-xs font-semibold text-rose-800 bg-rose-50 px-2.5 py-1.5 rounded-md border border-rose-200 w-full">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-bold block uppercase text-rose-700 mb-0.5">NOT AVAILABLE / OCCUPIED</span>
                            <span className="text-slate-600">{availability.reason}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Book Room Button */}
                    <button
                      onClick={() => handleOpenBookingModal(room)}
                      disabled={!availability.isAvailable}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                        availability.isAvailable
                          ? 'bg-slate-900 hover:bg-blue-600 text-white hover:shadow-md'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      }`}
                    >
                      <CalendarCheck className="w-4 h-4" />
                      <span>{availability.isAvailable ? 'Book This Room' : 'Unavailable at Chosen Time'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRooms.length === 0 && (
            <div className="py-16 text-center rounded-2xl bg-white border border-dashed border-slate-300">
              <Building className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No matching campus venues found</h4>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search query or loosening the equipment filters.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: MY BOOKING REQUESTS
          ========================================================================= */}
      {activeSubTab === 'my-requests' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">My Venue Booking Requests</h3>
              <p className="text-xs text-slate-500">Track status, administrator allotment approvals, and rejection remarks.</p>
            </div>
            <button
              onClick={() => setActiveSubTab('browse')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Book Another Venue
            </button>
          </div>

          {myBookings.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
              <CalendarCheck className="w-8 h-8 text-slate-400 mx-auto" />
              <div>
                <p className="text-xs font-semibold text-slate-700">You haven't requested any room bookings yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Browse campus facilities and submit a permission request for your event.
                </p>
              </div>
              <button
                onClick={() => setActiveSubTab('browse')}
                className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
              >
                Browse Venues Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((b) => {
                const isPending = b.status === 'pending';
                const isApproved = b.status === 'approved';
                const isRejected = b.status === 'rejected';

                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApproved
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                        : isRejected
                        ? 'bg-rose-50/40 border-rose-300'
                        : 'bg-amber-50/40 border-amber-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Event Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{b.eventTitle}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isApproved ? 'Room Allotted' : isRejected ? 'Request Rejected' : 'Pending Admin Allotment'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {b.eventDescription || 'No description provided.'}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-semibold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {b.roomName} ({b.building})
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Date: <strong className="text-slate-800">{b.date}</strong> ({b.day || 'Day'}) from <strong>{b.startTime} - {b.endTime}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            Expected: <strong>{b.expectedAttendees}</strong> attendees
                          </span>
                        </div>

                        {/* Requested Equipments */}
                        {b.equipmentRequested && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Equipments:</span>
                            {b.equipmentRequested.projector && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Projector
                              </span>
                            )}
                            {b.equipmentRequested.micSet && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Mic Sets
                              </span>
                            )}
                            {b.equipmentRequested.extensionBoxes && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Extension Boxes
                              </span>
                            )}
                            {b.equipmentRequested.computers && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Workstations
                              </span>
                            )}
                            {b.equipmentRequested.otherNotes && (
                              <span className="text-[10px] text-slate-500 italic">
                                "{b.equipmentRequested.otherNotes}"
                              </span>
                            )}
                          </div>
                        )}

                        {/* Admin Remarks Feedback */}
                        {b.adminRemarks && (
                          <div
                            className={`p-2 rounded-lg text-xs font-medium mt-2 border ${
                              isApproved
                                ? 'bg-emerald-100/60 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100/60 text-rose-900 border-rose-300'
                            }`}
                          >
                            <span className="font-bold">Administrator Feedback: </span>
                            {b.adminRemarks}
                            {b.reviewedAt && (
                              <span className="text-[10px] opacity-75 ml-2 block sm:inline">
                                (Reviewed on {new Date(b.reviewedAt).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {isPending && (
                          <button
                            onClick={() => handleCancelBooking(b)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer text-xs flex items-center gap-1"
                            title="Cancel booking request"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Withdraw</span>
                          </button>
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

      {/* =========================================================================
          SUB-TAB 3: NOTIFICATIONS CENTER
          ========================================================================= */}
      {activeSubTab === 'notifications' && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Student Notifications</h3>
              <p className="text-xs text-slate-500">Live alerts for venue allotments, administrative reviews, and institutional messages.</p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="py-16 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
              <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No notifications at this time</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                When an administrator allots or rejects your venue request, you will receive an instant alert here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const isAllotment = n.type === 'booking_approved';
                const isRejection = n.type === 'booking_rejected';

                return (
                  <div
                    key={n.id}
                    className={`py-3.5 px-3 rounded-xl transition-colors flex items-start justify-between gap-3 ${
                      !n.isRead ? 'bg-blue-50/40 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isAllotment
                            ? 'bg-emerald-100 text-emerald-700'
                            : isRejection
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {isAllotment ? (
                          <CheckCheck className="w-4 h-4" />
                        ) : isRejection ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <span className="text-[10px] text-slate-400 block">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkNotifRead(n.id)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer p-1"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: BOOK A ROOM & REQUEST PERMISSION
          ========================================================================= */}
      {selectedRoomForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                    Venue Reservation
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedRoomForBooking.name}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Request Permission to Book Room
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoomForBooking(null)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBooking} className="p-5 space-y-4 overflow-y-auto">
              {/* Selected Room Spec Summary */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{selectedRoomForBooking.name}</span>
                  <span className="font-semibold text-slate-600">{selectedRoomForBooking.building}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-600">
                  <span>Capacity: <strong>{selectedRoomForBooking.capacity} seats</strong></span>
                  <span>Type: <strong>{selectedRoomForBooking.isLab ? 'Computer Lab' : 'Lecture Hall'}</strong></span>
                </div>
                {/* Configured Hardware Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Hardware Configured:</span>
                  {selectedRoomForBooking.hasProjector && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Projector
                    </span>
                  )}
                  {selectedRoomForBooking.hasMicSet && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Mic Sets
                    </span>
                  )}
                  {selectedRoomForBooking.hasExtensionBoxes && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                      Extension Boxes
                    </span>
                  )}
                  {(selectedRoomForBooking.isLab || selectedRoomForBooking.hasComputers) && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      PC Lab
                    </span>
                  )}
                </div>
              </div>

              {/* Event Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g. AI Club Hackathon / Robotics Orientation"
                  className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                />
              </div>

              {/* Event Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Details &amp; Purpose *
                </label>
                <textarea
                  required
                  rows={2}
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Describe the nature of the event, organizing club/batch, and target student audience..."
                  className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs resize-none"
                />
              </div>

              {/* Date & Timings Confirmation */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-white text-xs text-slate-900 px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white text-xs text-slate-900 px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white text-xs text-slate-900 px-2.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                </div>
              </div>

              {/* Expected Attendees */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Attendees Count * (Max: {selectedRoomForBooking.capacity})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedRoomForBooking.capacity}
                  required
                  value={expectedAttendees}
                  onChange={(e) => setExpectedAttendees(Number(e.target.value))}
                  className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              {/* Equipment Requirements Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-900">
                  Equipment Requested for This Event:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={requestProjector}
                      onChange={(e) => setRequestProjector(e.target.checked)}
                      disabled={!selectedRoomForBooking.hasProjector}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <Tv className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className={!selectedRoomForBooking.hasProjector ? 'line-through text-slate-400' : ''}>
                      Digital Projector
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={requestMicSet}
                      onChange={(e) => setRequestMicSet(e.target.checked)}
                      disabled={!selectedRoomForBooking.hasMicSet}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <Mic className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className={!selectedRoomForBooking.hasMicSet ? 'line-through text-slate-400' : ''}>
                      Mic Sets / Podium
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={requestExtensionBoxes}
                      onChange={(e) => setRequestExtensionBoxes(e.target.checked)}
                      disabled={!selectedRoomForBooking.hasExtensionBoxes}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className={!selectedRoomForBooking.hasExtensionBoxes ? 'line-through text-slate-400' : ''}>
                      Extension Boxes
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={requestComputers}
                      onChange={(e) => setRequestComputers(e.target.checked)}
                      disabled={!selectedRoomForBooking.isLab && !selectedRoomForBooking.hasComputers}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <Monitor className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className={!selectedRoomForBooking.isLab && !selectedRoomForBooking.hasComputers ? 'line-through text-slate-400' : ''}>
                      PC Workstations
                    </span>
                  </label>
                </div>
              </div>

              {/* Special Requirements */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Equipment Requirements / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={otherEquipmentNotes}
                  onChange={(e) => setOtherEquipmentNotes(e.target.value)}
                  placeholder="e.g. Need 4 whiteboards markers, HDMI adapter, extra podium"
                  className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 shadow-xs"
                />
              </div>

              {/* Requester Identity Confirmation */}
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs text-blue-900 space-y-0.5">
                <span className="font-bold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  Requester: {currentStudentName}
                </span>
                <p className="text-[11px] text-blue-700">
                  Notification will be dispatched to campus administrators stating student <strong>{currentStudentName}</strong> requested <strong>{selectedRoomForBooking.name}</strong>.
                </p>
              </div>

              {/* Feedback messages */}
              {submitFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium flex items-start gap-2 border ${
                    submitFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {submitFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{submitFeedback.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRoomForBooking(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
                  <span>{isSubmitting ? 'Sending Request...' : 'Request Permission'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
