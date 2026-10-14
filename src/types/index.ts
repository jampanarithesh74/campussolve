export type UserRole =
  | 'student'
  | 'teacher'
  | 'faculty'
  | 'admin'
  | 'STUDENT'
  | 'FACULTY'
  | 'ADMIN'
  | 'TEACHER';

export function normalizeRole(role?: string | null): 'admin' | 'faculty' | 'student' {
  if (!role) return 'student';
  const lower = role.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'faculty' || lower === 'teacher') return 'faculty';
  return 'student';
}

export interface UserProfile {
  id: string;
  uid?: string;
  email: string;
  name?: string;
  displayName: string;
  role: UserRole;
  active?: boolean;
  department?: string;
  batchId?: string;
  facultyId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  email: string;
  designation: string;
  maxHoursPerWeek: number;
  color?: string;
  createdAt?: string;
}

export interface Batch {
  id: string;
  name: string;
  year: string;
  semester: string;
  studentCount: number;
  createdAt?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  weeklyLectures: number;
  isLab: boolean;
  batchId: string;
  facultyId?: string; // Primary / legacy assigned faculty member
  facultyIds?: string[]; // Multiple qualified/assigned faculty members eligible to teach this subject
  createdAt?: string;
}

/**
 * Returns all eligible faculty IDs for a subject (supports both facultyIds array and legacy facultyId).
 */
export function getSubjectFacultyIds(subject: Subject): string[] {
  if (Array.isArray(subject.facultyIds) && subject.facultyIds.length > 0) {
    return subject.facultyIds;
  }
  return subject.facultyId ? [subject.facultyId] : [];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  isLab: boolean;
  building: string;
  hasProjector?: boolean;
  hasMicSet?: boolean;
  hasExtensionBoxes?: boolean;
  hasComputers?: boolean;
  description?: string;
  createdAt?: string;
}

export type BookingStatus = 'pending' | 'approved' | 'rejected';

export interface RoomBooking {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  batchId?: string;
  eventTitle: string;
  eventDescription: string;
  expectedAttendees: number;
  date: string; // YYYY-MM-DD
  day?: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  equipmentRequested?: {
    projector?: boolean;
    micSet?: boolean;
    extensionBoxes?: boolean;
    computers?: boolean;
    otherNotes?: string;
  };
  status: BookingStatus;
  adminRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  recipientRole?: 'admin' | 'faculty' | 'student';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'booking_request' | 'booking_approved' | 'booking_rejected' | 'general';
  relatedBookingId?: string;
  isRead: boolean;
  createdAt: string;
}


export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const TIME_SLOTS: { start: string; end: string; label: string }[] = [
  { start: '09:00', end: '10:00', label: '09:00 - 10:00' },
  { start: '10:00', end: '11:00', label: '10:00 - 11:00' },
  { start: '11:15', end: '12:15', label: '11:15 - 12:15' },
  { start: '12:15', end: '13:15', label: '12:15 - 13:15' },
  { start: '14:00', end: '15:00', label: '14:00 - 15:00' },
  { start: '15:00', end: '16:00', label: '15:00 - 16:00' },
  { start: '16:00', end: '17:00', label: '16:00 - 17:00' },
];

export type SessionType = 'lecture' | 'lab' | 'tutorial';

export interface TimetableEntry {
  id: string;
  subjectId: string;
  subjectName: string;
  batchId: string;
  batchName: string;
  facultyId: string;
  facultyName: string;
  roomId: string;
  roomName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  sessionType: SessionType;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacultyAvailability {
  id: string; // `${facultyId}_${day}`
  facultyId: string;
  day: DayOfWeek;
  availableSlots: string[]; // e.g. ["09:00 - 10:00", "10:00 - 11:00"]
  unavailableSlots: string[];
}

export type ConflictType =
  | 'FACULTY_DOUBLE_BOOKED'
  | 'BATCH_DOUBLE_BOOKED'
  | 'ROOM_DOUBLE_BOOKED'
  | 'FACULTY_UNAVAILABLE'
  | 'ROOM_CAPACITY_EXCEEDED'
  | 'LAB_REQUIREMENT_UNMET';

export interface TimetableConflict {
  type: ConflictType;
  severity: 'error' | 'warning';
  title: string;
  description: string;
  conflictingEntries?: TimetableEntry[];
  affectedEntityId?: string;
}

export interface ValidationReport {
  isValid: boolean;
  conflicts: TimetableConflict[];
}

export interface ScheduleGenerationResult {
  success: boolean;
  scheduledEntries: TimetableEntry[];
  unallocatedSubjects: {
    subject: Subject;
    reason: string;
  }[];
  totalSlotsNeeded: number;
  totalSlotsScheduled: number;
  logs: string[];
}
