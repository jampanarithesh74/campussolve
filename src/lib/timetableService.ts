import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  UserProfile,
  UserRole,
  RoomBooking,
  BookingStatus,
  NotificationItem
} from '../types';

// Collections paths
export const USERS_COL = 'users';
export const FACULTY_COL = 'faculty';
export const BATCHES_COL = 'batches';
export const SUBJECTS_COL = 'subjects';
export const ROOMS_COL = 'rooms';
export const TIMETABLE_COL = 'timetableEntries';
export const AVAILABILITY_COL = 'facultyAvailability';
export const ADMINS_COL = 'admins';
export const ROOM_BOOKINGS_COL = 'roomBookings';
export const NOTIFICATIONS_COL = 'notifications';


/**
 * Recursively removes all undefined values from an object or array to prevent Firestore setDoc errors.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

/* =========================================================================
   USER PROFILE SERVICES
   ========================================================================= */

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `${USERS_COL}/${uid}`;
  try {
    const snap = await getDoc(doc(db, USERS_COL, uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function setUserProfile(profile: UserProfile): Promise<void> {
  const path = `${USERS_COL}/${profile.id}`;
  try {
    const sanitized = sanitizeForFirestore({
      ...profile,
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, USERS_COL, profile.id), sanitized, { merge: true });

    // If admin role, sync admin entry into /admins/{uid}
    if (profile.role === 'admin') {
      try {
        await setDoc(doc(db, ADMINS_COL, profile.id), {
          email: profile.email,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch {
        // Non-blocking
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/* =========================================================================
   BATCHES SERVICES
   ========================================================================= */

export async function getBatches(): Promise<Batch[]> {
  try {
    const snap = await getDocs(collection(db, BATCHES_COL));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Batch));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, BATCHES_COL);
  }
}

export async function saveBatch(batch: Batch): Promise<void> {
  const path = `${BATCHES_COL}/${batch.id}`;
  try {
    await setDoc(doc(db, BATCHES_COL, batch.id), sanitizeForFirestore({
      ...batch,
      createdAt: batch.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBatch(id: string): Promise<void> {
  const path = `${BATCHES_COL}/${id}`;
  try {
    await deleteDoc(doc(db, BATCHES_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
   FACULTY SERVICES
   ========================================================================= */

export async function getFaculty(): Promise<Faculty[]> {
  try {
    const snap = await getDocs(collection(db, FACULTY_COL));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Faculty));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, FACULTY_COL);
  }
}

export async function saveFaculty(facultyMember: Faculty): Promise<void> {
  const path = `${FACULTY_COL}/${facultyMember.id}`;
  try {
    await setDoc(doc(db, FACULTY_COL, facultyMember.id), sanitizeForFirestore({
      ...facultyMember,
      createdAt: facultyMember.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFaculty(id: string): Promise<void> {
  const path = `${FACULTY_COL}/${id}`;
  try {
    await deleteDoc(doc(db, FACULTY_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
   SUBJECTS SERVICES
   ========================================================================= */

export async function getSubjects(): Promise<Subject[]> {
  try {
    const snap = await getDocs(collection(db, SUBJECTS_COL));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Subject));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, SUBJECTS_COL);
  }
}

export async function saveSubject(subject: Subject): Promise<void> {
  const path = `${SUBJECTS_COL}/${subject.id}`;
  try {
    await setDoc(doc(db, SUBJECTS_COL, subject.id), sanitizeForFirestore({
      ...subject,
      createdAt: subject.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSubject(id: string): Promise<void> {
  const path = `${SUBJECTS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, SUBJECTS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
   ROOMS SERVICES
   ========================================================================= */

export async function getRooms(): Promise<Room[]> {
  try {
    const snap = await getDocs(collection(db, ROOMS_COL));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Room));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ROOMS_COL);
  }
}

export async function saveRoom(room: Room): Promise<void> {
  const path = `${ROOMS_COL}/${room.id}`;
  try {
    await setDoc(doc(db, ROOMS_COL, room.id), sanitizeForFirestore({
      ...room,
      createdAt: room.createdAt || new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRoom(id: string): Promise<void> {
  const path = `${ROOMS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, ROOMS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
   FACULTY AVAILABILITY SERVICES
   ========================================================================= */

export async function getFacultyAvailability(): Promise<FacultyAvailability[]> {
  try {
    const snap = await getDocs(collection(db, AVAILABILITY_COL));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as FacultyAvailability));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, AVAILABILITY_COL);
  }
}

export async function saveFacultyAvailability(avail: FacultyAvailability): Promise<void> {
  const path = `${AVAILABILITY_COL}/${avail.id}`;
  try {
    await setDoc(doc(db, AVAILABILITY_COL, avail.id), sanitizeForFirestore(avail));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/* =========================================================================
   TIMETABLE ENTRIES SERVICES (ROLE-AWARE)
   ========================================================================= */

export async function getTimetableEntries(userRole: UserRole, filterId?: string): Promise<TimetableEntry[]> {
  try {
    let q;
    if (userRole === 'admin') {
      q = collection(db, TIMETABLE_COL);
    } else if (userRole === 'student' && filterId) {
      q = query(collection(db, TIMETABLE_COL), where('batchId', '==', filterId));
    } else if ((userRole === 'teacher' || userRole === 'faculty') && filterId) {
      q = query(collection(db, TIMETABLE_COL), where('facultyId', '==', filterId));
    } else {
      q = collection(db, TIMETABLE_COL);
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as TimetableEntry));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, TIMETABLE_COL);
  }
}

export async function saveTimetableEntry(entry: TimetableEntry): Promise<void> {
  const path = `${TIMETABLE_COL}/${entry.id}`;
  try {
    await setDoc(doc(db, TIMETABLE_COL, entry.id), sanitizeForFirestore({
      ...entry,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTimetableEntry(id: string): Promise<void> {
  const path = `${TIMETABLE_COL}/${id}`;
  try {
    await deleteDoc(doc(db, TIMETABLE_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function replaceAllTimetableEntries(newEntries: TimetableEntry[]): Promise<void> {
  try {
    // 1. Get existing entries to delete
    const existingSnap = await getDocs(collection(db, TIMETABLE_COL));
    const batch = writeBatch(db);

    existingSnap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 2. Add new entries
    newEntries.forEach((entry) => {
      const entryRef = doc(db, TIMETABLE_COL, entry.id);
      batch.set(entryRef, sanitizeForFirestore({
        ...entry,
        createdAt: new Date().toISOString()
      }));
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, TIMETABLE_COL);
  }
}

/* =========================================================================
   DEMO DATA INITIALIZATION (ADMIN CONTROLLED)
   ========================================================================= */

export async function initializeDemoData(): Promise<{
  batches: number;
  faculty: number;
  subjects: number;
  rooms: number;
  entries: number;
}> {
  try {
    const batch = writeBatch(db);

    // 1. Batches (2 batches)
    const demoBatches: Batch[] = [
      {
        id: 'batch_cs_a',
        name: 'Computer Science - Year 3 (Batch A)',
        year: 'Year 3',
        semester: 'Semester 5',
        studentCount: 48,
        createdAt: new Date().toISOString()
      },
      {
        id: 'batch_cs_b',
        name: 'Computer Science - Year 3 (Batch B)',
        year: 'Year 3',
        semester: 'Semester 5',
        studentCount: 42,
        createdAt: new Date().toISOString()
      }
    ];

    demoBatches.forEach((b) => {
      batch.set(doc(db, BATCHES_COL, b.id), b);
    });

    // 2. Faculty (5 members)
    const demoFaculty: Faculty[] = [
      {
        id: 'fac_turing',
        name: 'Dr. Alan Turing',
        department: 'Computer Science & AI',
        email: 'turing@campus.edu',
        designation: 'Distinguished Professor',
        maxHoursPerWeek: 16,
        color: '#6366f1', // Indigo
        createdAt: new Date().toISOString()
      },
      {
        id: 'fac_hopper',
        name: 'Dr. Grace Hopper',
        department: 'Computer Science & Systems',
        email: 'hopper@campus.edu',
        designation: 'Professor',
        maxHoursPerWeek: 16,
        color: '#8b5cf6', // Violet
        createdAt: new Date().toISOString()
      },
      {
        id: 'fac_knuth',
        name: 'Dr. Donald Knuth',
        department: 'Theoretical Computer Science',
        email: 'knuth@campus.edu',
        designation: 'Professor Emeritus',
        maxHoursPerWeek: 14,
        color: '#10b981', // Emerald
        createdAt: new Date().toISOString()
      },
      {
        id: 'fac_lovelace',
        name: 'Dr. Ada Lovelace',
        department: 'Computational Sciences',
        email: 'lovelace@campus.edu',
        designation: 'Associate Professor',
        maxHoursPerWeek: 16,
        color: '#f59e0b', // Amber
        createdAt: new Date().toISOString()
      },
      {
        id: 'fac_liskov',
        name: 'Dr. Barbara Liskov',
        department: 'Software Architecture & Networks',
        email: 'liskov@campus.edu',
        designation: 'Chair Professor',
        maxHoursPerWeek: 14,
        color: '#06b6d4', // Cyan
        createdAt: new Date().toISOString()
      }
    ];

    demoFaculty.forEach((f) => {
      batch.set(doc(db, FACULTY_COL, f.id), f);
    });

    // 3. Rooms (4 rooms, including one dedicated laboratory)
    const demoRooms: Room[] = [
      {
        id: 'room_turing_301',
        name: 'Turing Lecture Hall 301',
        capacity: 65,
        isLab: false,
        building: 'Alan Turing Complex',
        createdAt: new Date().toISOString()
      },
      {
        id: 'room_hopper_302',
        name: 'Hopper Smart Classroom 302',
        capacity: 60,
        isLab: false,
        building: 'Alan Turing Complex',
        createdAt: new Date().toISOString()
      },
      {
        id: 'room_shannon_lab',
        name: 'Shannon Systems & Hardware Lab',
        capacity: 50,
        isLab: true,
        building: 'Innovation Research Wing',
        createdAt: new Date().toISOString()
      },
      {
        id: 'room_lovelace_104',
        name: 'Lovelace Seminar Hall 104',
        capacity: 50,
        isLab: false,
        building: 'Main Academic Quad',
        createdAt: new Date().toISOString()
      }
    ];

    demoRooms.forEach((r) => {
      batch.set(doc(db, ROOMS_COL, r.id), r);
    });

    // 4. Subjects (6 subjects, with lab and lecture classification)
    const demoSubjects: Subject[] = [
      {
        id: 'sub_os',
        code: 'CS301',
        name: 'Operating Systems Architecture',
        credits: 4,
        weeklyLectures: 3,
        isLab: false,
        batchId: 'batch_cs_a',
        facultyId: 'fac_turing',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sub_db_lab',
        code: 'CS302L',
        name: 'Distributed Database Lab',
        credits: 3,
        weeklyLectures: 2,
        isLab: true,
        batchId: 'batch_cs_a',
        facultyId: 'fac_hopper',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sub_networks',
        code: 'CS303',
        name: 'Computer Networks & Protocols',
        credits: 4,
        weeklyLectures: 3,
        isLab: false,
        batchId: 'batch_cs_a',
        facultyId: 'fac_liskov',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sub_algorithms',
        code: 'CS304',
        name: 'Advanced Algorithms & Complexity',
        credits: 4,
        weeklyLectures: 3,
        isLab: false,
        batchId: 'batch_cs_b',
        facultyId: 'fac_knuth',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sub_ai',
        code: 'CS305',
        name: 'Applied Machine Learning',
        credits: 4,
        weeklyLectures: 3,
        isLab: false,
        batchId: 'batch_cs_b',
        facultyId: 'fac_lovelace',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sub_sys_lab',
        code: 'CS306L',
        name: 'Cloud Infrastructure Practical',
        credits: 3,
        weeklyLectures: 2,
        isLab: true,
        batchId: 'batch_cs_b',
        facultyId: 'fac_hopper',
        createdAt: new Date().toISOString()
      }
    ];

    demoSubjects.forEach((s) => {
      batch.set(doc(db, SUBJECTS_COL, s.id), s);
    });

    // 5. Initial faculty availability preferences
    const demoAvail: FacultyAvailability[] = [
      {
        id: 'fac_turing_Wednesday',
        facultyId: 'fac_turing',
        day: 'Wednesday',
        availableSlots: [],
        unavailableSlots: ['14:00 - 15:00', '15:00 - 16:00'] // Dean duties
      },
      {
        id: 'fac_knuth_Friday',
        facultyId: 'fac_knuth',
        day: 'Friday',
        availableSlots: [],
        unavailableSlots: ['16:00 - 17:00'] // Research colloquium
      }
    ];

    demoAvail.forEach((a) => {
      batch.set(doc(db, AVAILABILITY_COL, a.id), a);
    });

    // 6. Pre-scheduled Conflict-Free Timetable Entries (Monday to Friday)
    const demoEntries: TimetableEntry[] = [
      // Monday
      {
        id: 'entry_mon_1',
        subjectId: 'sub_os',
        subjectName: 'Operating Systems Architecture',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_turing',
        facultyName: 'Dr. Alan Turing',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_mon_2',
        subjectId: 'sub_algorithms',
        subjectName: 'Advanced Algorithms & Complexity',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_knuth',
        facultyName: 'Dr. Donald Knuth',
        roomId: 'room_hopper_302',
        roomName: 'Hopper Smart Classroom 302',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_mon_3',
        subjectId: 'sub_db_lab',
        subjectName: 'Distributed Database Lab',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_hopper',
        facultyName: 'Dr. Grace Hopper',
        roomId: 'room_shannon_lab',
        roomName: 'Shannon Systems & Hardware Lab',
        day: 'Monday',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'lab'
      },
      {
        id: 'entry_mon_4',
        subjectId: 'sub_ai',
        subjectName: 'Applied Machine Learning',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_lovelace',
        facultyName: 'Dr. Ada Lovelace',
        roomId: 'room_lovelace_104',
        roomName: 'Lovelace Seminar Hall 104',
        day: 'Monday',
        startTime: '11:15',
        endTime: '12:15',
        sessionType: 'lecture'
      },

      // Tuesday
      {
        id: 'entry_tue_1',
        subjectId: 'sub_networks',
        subjectName: 'Computer Networks & Protocols',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_liskov',
        facultyName: 'Dr. Barbara Liskov',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Tuesday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_tue_2',
        subjectId: 'sub_sys_lab',
        subjectName: 'Cloud Infrastructure Practical',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_hopper',
        facultyName: 'Dr. Grace Hopper',
        roomId: 'room_shannon_lab',
        roomName: 'Shannon Systems & Hardware Lab',
        day: 'Tuesday',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'lab'
      },
      {
        id: 'entry_tue_3',
        subjectId: 'sub_os',
        subjectName: 'Operating Systems Architecture',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_turing',
        facultyName: 'Dr. Alan Turing',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Tuesday',
        startTime: '11:15',
        endTime: '12:15',
        sessionType: 'lecture'
      },
      {
        id: 'entry_tue_4',
        subjectId: 'sub_algorithms',
        subjectName: 'Advanced Algorithms & Complexity',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_knuth',
        facultyName: 'Dr. Donald Knuth',
        roomId: 'room_hopper_302',
        roomName: 'Hopper Smart Classroom 302',
        day: 'Tuesday',
        startTime: '14:00',
        endTime: '15:00',
        sessionType: 'lecture'
      },

      // Wednesday
      {
        id: 'entry_wed_1',
        subjectId: 'sub_db_lab',
        subjectName: 'Distributed Database Lab',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_hopper',
        facultyName: 'Dr. Grace Hopper',
        roomId: 'room_shannon_lab',
        roomName: 'Shannon Systems & Hardware Lab',
        day: 'Wednesday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lab'
      },
      {
        id: 'entry_wed_2',
        subjectId: 'sub_ai',
        subjectName: 'Applied Machine Learning',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_lovelace',
        facultyName: 'Dr. Ada Lovelace',
        roomId: 'room_lovelace_104',
        roomName: 'Lovelace Seminar Hall 104',
        day: 'Wednesday',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_wed_3',
        subjectId: 'sub_networks',
        subjectName: 'Computer Networks & Protocols',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_liskov',
        facultyName: 'Dr. Barbara Liskov',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Wednesday',
        startTime: '11:15',
        endTime: '12:15',
        sessionType: 'lecture'
      },

      // Thursday
      {
        id: 'entry_thu_1',
        subjectId: 'sub_os',
        subjectName: 'Operating Systems Architecture',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_turing',
        facultyName: 'Dr. Alan Turing',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Thursday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_thu_2',
        subjectId: 'sub_algorithms',
        subjectName: 'Advanced Algorithms & Complexity',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_knuth',
        facultyName: 'Dr. Donald Knuth',
        roomId: 'room_hopper_302',
        roomName: 'Hopper Smart Classroom 302',
        day: 'Thursday',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_thu_3',
        subjectId: 'sub_sys_lab',
        subjectName: 'Cloud Infrastructure Practical',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_hopper',
        facultyName: 'Dr. Grace Hopper',
        roomId: 'room_shannon_lab',
        roomName: 'Shannon Systems & Hardware Lab',
        day: 'Thursday',
        startTime: '14:00',
        endTime: '15:00',
        sessionType: 'lab'
      },

      // Friday
      {
        id: 'entry_fri_1',
        subjectId: 'sub_networks',
        subjectName: 'Computer Networks & Protocols',
        batchId: 'batch_cs_a',
        batchName: 'Computer Science - Year 3 (Batch A)',
        facultyId: 'fac_liskov',
        facultyName: 'Dr. Barbara Liskov',
        roomId: 'room_turing_301',
        roomName: 'Turing Lecture Hall 301',
        day: 'Friday',
        startTime: '09:00',
        endTime: '10:00',
        sessionType: 'lecture'
      },
      {
        id: 'entry_fri_2',
        subjectId: 'sub_ai',
        subjectName: 'Applied Machine Learning',
        batchId: 'batch_cs_b',
        batchName: 'Computer Science - Year 3 (Batch B)',
        facultyId: 'fac_lovelace',
        facultyName: 'Dr. Ada Lovelace',
        roomId: 'room_lovelace_104',
        roomName: 'Lovelace Seminar Hall 104',
        day: 'Friday',
        startTime: '10:00',
        endTime: '11:00',
        sessionType: 'lecture'
      }
    ];

    demoEntries.forEach((e) => {
      batch.set(doc(db, TIMETABLE_COL, e.id), {
        ...e,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();

    return {
      batches: demoBatches.length,
      faculty: demoFaculty.length,
      subjects: demoSubjects.length,
      rooms: demoRooms.length,
      entries: demoEntries.length
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'initializeDemoData');
  }
}

/* =========================================================================
   VENUE / ROOM BOOKINGS SERVICES
   ========================================================================= */

export async function getRoomBookings(): Promise<RoomBooking[]> {
  try {
    const snap = await getDocs(collection(db, ROOM_BOOKINGS_COL));
    return snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as RoomBooking))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ROOM_BOOKINGS_COL);
  }
}

export async function saveRoomBooking(booking: RoomBooking): Promise<void> {
  const path = `${ROOM_BOOKINGS_COL}/${booking.id}`;
  try {
    const cleanBooking = sanitizeForFirestore({
      ...booking,
      createdAt: booking.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await setDoc(doc(db, ROOM_BOOKINGS_COL, booking.id), cleanBooking);

    // Also dispatch notification to administrators
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const adminNotif: NotificationItem = {
      id: notifId,
      recipientRole: 'admin',
      title: 'New Venue Booking Request',
      message: `Student ${booking.studentName} requested room "${booking.roomName}" for event "${booking.eventTitle}" on ${booking.date} (${booking.startTime} - ${booking.endTime}).`,
      type: 'booking_request',
      relatedBookingId: booking.id,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, NOTIFICATIONS_COL, notifId), sanitizeForFirestore(adminNotif)).catch((err) => {
      console.warn('Failed to dispatch admin notification:', err);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateRoomBookingStatus(
  bookingId: string,
  status: BookingStatus,
  adminRemarks?: string,
  reviewedBy?: string,
  bookingDetails?: Partial<RoomBooking>
): Promise<void> {
  const path = `${ROOM_BOOKINGS_COL}/${bookingId}`;
  try {
    const updates = sanitizeForFirestore({
      status,
      adminRemarks: adminRemarks || '',
      reviewedBy: reviewedBy || 'Administrator',
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    await updateDoc(doc(db, ROOM_BOOKINGS_COL, bookingId), updates);

    // If student info is known, dispatch notification to student
    if (bookingDetails?.studentId || bookingDetails?.studentEmail) {
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const isApproved = status === 'approved';
      const studentNotif: NotificationItem = {
        id: notifId,
        recipientRole: 'student',
        recipientUserId: bookingDetails.studentId,
        title: isApproved ? 'Room Booking Allotted!' : 'Room Booking Request Rejected',
        message: isApproved
          ? `Your venue booking request for "${bookingDetails.eventTitle || 'Event'}" in "${bookingDetails.roomName || 'Venue'}" on ${bookingDetails.date || ''} (${bookingDetails.startTime || ''} - ${bookingDetails.endTime || ''}) has been ALLOTTED by admin.${adminRemarks ? ` Note: ${adminRemarks}` : ''}`
          : `Your venue booking request for "${bookingDetails.eventTitle || 'Event'}" in "${bookingDetails.roomName || 'Venue'}" was REJECTED by admin.${adminRemarks ? ` Reason: ${adminRemarks}` : ''}`,
        type: isApproved ? 'booking_approved' : 'booking_rejected',
        relatedBookingId: bookingId,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, NOTIFICATIONS_COL, notifId), sanitizeForFirestore(studentNotif)).catch((err) => {
        console.warn('Failed to dispatch student notification:', err);
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteRoomBooking(id: string): Promise<void> {
  const path = `${ROOM_BOOKINGS_COL}/${id}`;
  try {
    await deleteDoc(doc(db, ROOM_BOOKINGS_COL, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/* =========================================================================
   NOTIFICATIONS SERVICES
   ========================================================================= */

export async function getNotifications(role?: string, userId?: string): Promise<NotificationItem[]> {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COL));
    const allNotifs = snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as NotificationItem))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    if (!role && !userId) return allNotifs;

    return allNotifs.filter((n) => {
      if (role === 'admin') {
        return n.recipientRole === 'admin' || !n.recipientRole;
      }
      if (userId && n.recipientUserId) {
        return n.recipientUserId === userId;
      }
      if (role === 'student') {
        return n.recipientRole === 'student' && (!n.recipientUserId || n.recipientUserId === userId);
      }
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COL);
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const path = `${NOTIFICATIONS_COL}/${id}`;
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COL, id), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

