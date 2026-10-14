import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  ValidationReport,
  DayOfWeek,
  DAYS_OF_WEEK
} from '../types';
import { validateFullSchedule } from './scheduler';
import {
  db,
  handleFirestoreError,
  OperationType
} from './firebase';
import {
  collection,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';
import {
  BATCHES_COL,
  FACULTY_COL,
  SUBJECTS_COL,
  ROOMS_COL,
  TIMETABLE_COL,
  AVAILABILITY_COL,
  sanitizeForFirestore
} from './timetableService';
import { seedDemoUserProfilesInFirestore } from './demoAccounts';

/**
 * ============================================================================
 * 1. Fictional Student Batches (6 Batches)
 * Exactly matches the requested cohorts, semesters, and student enrollment counts.
 * ============================================================================
 */
export const DEMO_FICTIONAL_BATCHES: Batch[] = [
  {
    id: 'batch_demo_alpha',
    name: '[Demo] Batch Alpha — CSE Year 2',
    year: 'Year 2',
    semester: 'Semester 3',
    studentCount: 60,
    createdAt: new Date().toISOString()
  },
  {
    id: 'batch_demo_beta',
    name: '[Demo] Batch Beta — CSE Year 2',
    year: 'Year 2',
    semester: 'Semester 3',
    studentCount: 55,
    createdAt: new Date().toISOString()
  },
  {
    id: 'batch_demo_gamma',
    name: '[Demo] Batch Gamma — AI & Data Science Year 2',
    year: 'Year 2',
    semester: 'Semester 3',
    studentCount: 50,
    createdAt: new Date().toISOString()
  },
  {
    id: 'batch_demo_delta',
    name: '[Demo] Batch Delta — AI & Data Science Year 3',
    year: 'Year 3',
    semester: 'Semester 5',
    studentCount: 45,
    createdAt: new Date().toISOString()
  },
  {
    id: 'batch_demo_epsilon',
    name: '[Demo] Batch Epsilon — Information Technology Year 2',
    year: 'Year 2',
    semester: 'Semester 3',
    studentCount: 50,
    createdAt: new Date().toISOString()
  },
  {
    id: 'batch_demo_zeta',
    name: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    year: 'Year 3',
    semester: 'Semester 5',
    studentCount: 40,
    createdAt: new Date().toISOString()
  }
];

/**
 * ============================================================================
 * 2. Fictional Faculty Members (8 Instructors)
 * Distinct qualifications, departments, teaching hours, and timetable colors.
 * ============================================================================
 */
export const DEMO_FICTIONAL_FACULTY: (Faculty & { qualifications: string })[] = [
  {
    id: 'fac_demo_vance',
    name: 'Dr. Evelyn Vance [Fictional Demo]',
    department: 'Software Systems & Architecture [Demo]',
    email: 'evelyn.vance.demo@synchroniq.campus',
    designation: 'Professor',
    maxHoursPerWeek: 16,
    color: '#2563eb', // Blue
    qualifications: 'Ph.D. in Operating Systems & Concurrent Architectures',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_zhao',
    name: 'Prof. Julian Zhao [Fictional Demo]',
    department: 'Theoretical Computing & AI [Demo]',
    email: 'julian.zhao.demo@synchroniq.campus',
    designation: 'Chair Professor',
    maxHoursPerWeek: 16,
    color: '#10b981', // Emerald
    qualifications: 'Ph.D. in Combinatorial Optimization & Graph Algorithms',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_thorne',
    name: 'Dr. Marcus Thorne [Fictional Demo]',
    department: 'Information Systems & Databases [Demo]',
    email: 'marcus.thorne.demo@synchroniq.campus',
    designation: 'Professor',
    maxHoursPerWeek: 16,
    color: '#7c3aed', // Purple
    qualifications: 'Ph.D. in Distributed Storage & Database Internals',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_sterling',
    name: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    department: 'Artificial Intelligence & Machine Learning [Demo]',
    email: 'clara.sterling.demo@synchroniq.campus',
    designation: 'Associate Professor',
    maxHoursPerWeek: 16,
    color: '#db2777', // Pink
    qualifications: 'Ph.D. in Autonomous Systems & Deep Representation',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_pendelton',
    name: 'Dr. Arthur Pendelton [Fictional Demo]',
    department: 'Computer Networks & Cybersecurity [Demo]',
    email: 'arthur.pendelton.demo@synchroniq.campus',
    designation: 'Senior Lecturer',
    maxHoursPerWeek: 16,
    color: '#0891b2', // Cyan
    qualifications: 'Ph.D. in Wireless Protocols & Network Defense',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_alvarez',
    name: 'Dr. Elena Alvarez [Fictional Demo]',
    department: 'Data Analytics & Cloud Infrastructure [Demo]',
    email: 'elena.alvarez.demo@synchroniq.campus',
    designation: 'Assistant Professor',
    maxHoursPerWeek: 14,
    color: '#d97706', // Amber
    qualifications: 'Ph.D. in Scalable Data Analytics & Cloud Systems',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_moriarty',
    name: 'Dr. Raymond Moriarty [Fictional Demo]',
    department: 'Hardware Architectures & Embedded IoT [Demo]',
    email: 'raymond.moriarty.demo@synchroniq.campus',
    designation: 'Associate Professor',
    maxHoursPerWeek: 16,
    color: '#ea580c', // Orange
    qualifications: 'Ph.D. in Microprocessor Design & Signal Processing',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_kapoor',
    name: 'Prof. Ananya Kapoor [Fictional Demo]',
    department: 'Software Engineering & Web Tech [Demo]',
    email: 'ananya.kapoor.demo@synchroniq.campus',
    designation: 'Professor',
    maxHoursPerWeek: 14,
    color: '#0284c7', // Sky
    qualifications: 'Ph.D. in Distributed Web Systems & Microservices',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_chen',
    name: 'Dr. Lin Chen [Fictional Demo]',
    department: 'Artificial Intelligence & Robotics [Demo]',
    email: 'faculty9@campussolve.demo',
    designation: 'Associate Professor',
    maxHoursPerWeek: 16,
    color: '#14b8a6', // Teal
    qualifications: 'Ph.D. in Autonomous Robotics & Perceptual AI',
    createdAt: new Date().toISOString()
  },
  {
    id: 'fac_demo_patel',
    name: 'Prof. Rajesh Patel [Fictional Demo]',
    department: 'Cyber-Physical Systems & IoT [Demo]',
    email: 'faculty10@campussolve.demo',
    designation: 'Professor',
    maxHoursPerWeek: 14,
    color: '#84cc16', // Lime
    qualifications: 'Ph.D. in Sensor Networks & Real-Time Embedded Systems',
    createdAt: new Date().toISOString()
  }
];

/**
 * ============================================================================
 * 3. Fictional Campus Facilities (6 Rooms, including 2 Dedicated Labs)
 * All capacities are >= 65 to safely accommodate the largest batch (Batch Alpha: 60 students).
 * ============================================================================
 */
export const DEMO_FICTIONAL_ROOMS: (Room & { equipment: string })[] = [
  {
    id: 'room_demo_gauss_101',
    name: '[Demo] Gauss Lecture Hall 101',
    building: 'North Science Block',
    capacity: 75,
    isLab: false,
    equipment: 'Dual 4K Projectors, Interactive Smart Podium, Tiered Acoustic Seating',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room_demo_euler_102',
    name: '[Demo] Euler Lecture Hall 102',
    building: 'North Science Block',
    capacity: 70,
    isLab: false,
    equipment: '85" Touch Interactive Display, Document Visualizer, Lecture Capture Array',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room_demo_turing_201',
    name: '[Demo] Turing Auditorium 201',
    building: 'Central Academic Block',
    capacity: 80,
    isLab: false,
    equipment: 'Surround Mic Matrix, Dual Digital Chalkboards, Assistive Audio Induction Loop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room_demo_shannon_202',
    name: '[Demo] Shannon Seminar Hall 202',
    building: 'Central Academic Block',
    capacity: 65,
    isLab: false,
    equipment: 'Modular Collaborative Desks, Multi-Screen Projection, Conference Audio',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room_demo_apex_lab',
    name: '[Demo] Apex Systems & Computing Laboratory',
    building: 'Innovation Research Wing B',
    capacity: 65,
    isLab: true,
    equipment: '65 Linux Workstations, Gigabit Managed Switches, FPGA Hardware Kits, Logic Analyzers',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room_demo_ai_robotics_lab',
    name: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    building: 'Innovation Research Wing B',
    capacity: 65,
    isLab: true,
    equipment: '65 GPU-Accelerated Workstations, Embedded Development Boards, Edge TPU Modules',
    createdAt: new Date().toISOString()
  }
];

/**
 * ============================================================================
 * 4. Fictional Curriculum Subjects (14 Subjects across all 6 batches)
 * Features subjects taught by multiple qualified faculty members:
 * - Data Structures: Dr. Evelyn Vance & Prof. Julian Zhao
 * - Database Management Systems: Dr. Marcus Thorne & Prof. Clara Vance-Sterling
 * - Operating Systems: Dr. Evelyn Vance & Dr. Arthur Pendelton
 * - Machine Learning: Prof. Clara Vance-Sterling & Prof. Julian Zhao
 * - Computer Networks: Dr. Arthur Pendelton & Dr. Marcus Thorne
 * ============================================================================
 */
export const DEMO_FICTIONAL_SUBJECTS: Subject[] = [
  // Batch Alpha (CSE Year 2, 60 students)
  {
    id: 'sub_demo_dsa_alpha',
    code: 'CS201-A',
    name: '[Demo] Data Structures & Algorithms',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_alpha',
    facultyId: 'fac_demo_vance',
    facultyIds: ['fac_demo_vance', 'fac_demo_zhao'], // Dr. Vance & Prof. Zhao
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_dbms_alpha',
    code: 'CS202-A',
    name: '[Demo] Database Management Systems',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_alpha',
    facultyId: 'fac_demo_thorne',
    facultyIds: ['fac_demo_thorne', 'fac_demo_sterling'], // Dr. Thorne & Prof. Sterling
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_dsa_lab_alpha',
    code: 'CS201L-A',
    name: '[Demo] Data Structures Practical Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_alpha',
    facultyId: 'fac_demo_zhao',
    facultyIds: ['fac_demo_zhao', 'fac_demo_vance'], // Prof. Zhao & Dr. Vance
    createdAt: new Date().toISOString()
  },

  // Batch Beta (CSE Year 2, 55 students)
  {
    id: 'sub_demo_os_beta',
    code: 'CS203-B',
    name: '[Demo] Operating Systems Architecture',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_beta',
    facultyId: 'fac_demo_vance',
    facultyIds: ['fac_demo_vance', 'fac_demo_pendelton'], // Dr. Vance & Dr. Pendelton
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_cn_beta',
    code: 'CS204-B',
    name: '[Demo] Computer Networks & Internet Protocols',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_beta',
    facultyId: 'fac_demo_pendelton',
    facultyIds: ['fac_demo_pendelton', 'fac_demo_thorne'], // Dr. Pendelton & Dr. Thorne
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_os_lab_beta',
    code: 'CS203L-B',
    name: '[Demo] Operating Systems Kernel Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_beta',
    facultyId: 'fac_demo_pendelton',
    facultyIds: ['fac_demo_pendelton', 'fac_demo_vance'], // Dr. Pendelton & Dr. Vance
    createdAt: new Date().toISOString()
  },

  // Batch Gamma (AI & Data Science Year 2, 50 students)
  {
    id: 'sub_demo_ml_gamma',
    code: 'AI201-G',
    name: '[Demo] Machine Learning & Pattern Analysis',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_gamma',
    facultyId: 'fac_demo_sterling',
    facultyIds: ['fac_demo_sterling', 'fac_demo_zhao'], // Prof. Sterling & Prof. Zhao
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_dsa_lab_gamma',
    code: 'AI202L-G',
    name: '[Demo] Advanced Algorithms & Graph Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_gamma',
    facultyId: 'fac_demo_zhao',
    facultyIds: ['fac_demo_zhao', 'fac_demo_vance'], // Prof. Zhao & Dr. Vance
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_cloud_lab_gamma',
    code: 'AI203L-G',
    name: '[Demo] Big Data & Cloud Computing Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_gamma',
    facultyId: 'fac_demo_alvarez',
    facultyIds: ['fac_demo_alvarez', 'fac_demo_thorne'], // Dr. Alvarez & Dr. Thorne
    createdAt: new Date().toISOString()
  },

  // Batch Delta (AI & Data Science Year 3, 45 students)
  {
    id: 'sub_demo_ml_delta',
    code: 'AI301-D',
    name: '[Demo] Applied Machine Learning Systems',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_delta',
    facultyId: 'fac_demo_zhao',
    facultyIds: ['fac_demo_zhao', 'fac_demo_sterling'], // Prof. Zhao & Prof. Sterling
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_ai_lab_delta',
    code: 'AI302L-D',
    name: '[Demo] Advanced AI Systems & Robotics Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_delta',
    facultyId: 'fac_demo_sterling',
    facultyIds: ['fac_demo_sterling', 'fac_demo_alvarez'], // Prof. Sterling & Dr. Alvarez
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_os_lab_delta',
    code: 'AI303L-D',
    name: '[Demo] Real-Time Systems Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_delta',
    facultyId: 'fac_demo_vance',
    facultyIds: ['fac_demo_vance', 'fac_demo_pendelton'], // Dr. Vance & Dr. Pendelton
    createdAt: new Date().toISOString()
  },

  // Batch Epsilon (Information Technology Year 2, 50 students)
  {
    id: 'sub_demo_cn_epsilon',
    code: 'IT201-E',
    name: '[Demo] Computer Networks Infrastructure',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_epsilon',
    facultyId: 'fac_demo_thorne',
    facultyIds: ['fac_demo_thorne', 'fac_demo_pendelton'], // Dr. Thorne & Dr. Pendelton
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_web_epsilon',
    code: 'IT202-E',
    name: '[Demo] Web Architectures & Cloud Services',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_epsilon',
    facultyId: 'fac_demo_kapoor',
    facultyIds: ['fac_demo_kapoor', 'fac_demo_alvarez'], // Prof. Kapoor & Dr. Alvarez
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_db_lab_epsilon',
    code: 'IT203L-E',
    name: '[Demo] Database Management Systems Practical',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_epsilon',
    facultyId: 'fac_demo_sterling',
    facultyIds: ['fac_demo_sterling', 'fac_demo_thorne'], // Prof. Sterling & Dr. Thorne
    createdAt: new Date().toISOString()
  },

  // Batch Zeta (Electronics & Computer Engineering Year 3, 40 students)
  {
    id: 'sub_demo_embed_zeta',
    code: 'ECE301-Z',
    name: '[Demo] Embedded Systems & Microcontrollers',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_zeta',
    facultyId: 'fac_demo_moriarty',
    facultyIds: ['fac_demo_moriarty', 'fac_demo_pendelton'], // Dr. Moriarty & Dr. Pendelton
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_iot_lab_zeta',
    code: 'ECE302L-Z',
    name: '[Demo] IoT Hardware & Sensor Interfaces Lab',
    credits: 3,
    weeklyLectures: 2,
    isLab: true,
    batchId: 'batch_demo_zeta',
    facultyId: 'fac_demo_moriarty',
    facultyIds: ['fac_demo_moriarty', 'fac_demo_pendelton'], // Dr. Moriarty & Dr. Pendelton
    createdAt: new Date().toISOString()
  },
  {
    id: 'sub_demo_dsp_zeta',
    code: 'ECE303-Z',
    name: '[Demo] Digital Signal Processing & Logic',
    credits: 4,
    weeklyLectures: 3,
    isLab: false,
    batchId: 'batch_demo_zeta',
    facultyId: 'fac_demo_moriarty',
    facultyIds: ['fac_demo_moriarty', 'fac_demo_zhao'], // Dr. Moriarty & Prof. Zhao
    createdAt: new Date().toISOString()
  }
];

/**
 * ============================================================================
 * 5. Weekday Faculty Availability (Monday - Friday)
 * Defines availability records for all 8 faculty members across all 5 weekdays.
 * Minor unavailable slots are marked for departmental research and committees.
 * ============================================================================
 */
export const DEMO_FICTIONAL_AVAILABILITY: FacultyAvailability[] = [
  // 1. Dr. Evelyn Vance (Unavailable Wednesday 14:00 - 15:00 for curriculum committee)
  { id: 'fac_demo_vance_Monday', facultyId: 'fac_demo_vance', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_vance_Tuesday', facultyId: 'fac_demo_vance', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_vance_Wednesday', facultyId: 'fac_demo_vance', day: 'Wednesday', availableSlots: [], unavailableSlots: ['14:00 - 15:00'] },
  { id: 'fac_demo_vance_Thursday', facultyId: 'fac_demo_vance', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_vance_Friday', facultyId: 'fac_demo_vance', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 2. Prof. Julian Zhao (Unavailable Friday 15:00 - 16:00 for seminar)
  { id: 'fac_demo_zhao_Monday', facultyId: 'fac_demo_zhao', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_zhao_Tuesday', facultyId: 'fac_demo_zhao', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_zhao_Wednesday', facultyId: 'fac_demo_zhao', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_zhao_Thursday', facultyId: 'fac_demo_zhao', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_zhao_Friday', facultyId: 'fac_demo_zhao', day: 'Friday', availableSlots: [], unavailableSlots: ['15:00 - 16:00'] },

  // 3. Dr. Marcus Thorne (Unavailable Tuesday 11:15 - 12:15 for storage research)
  { id: 'fac_demo_thorne_Monday', facultyId: 'fac_demo_thorne', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_thorne_Tuesday', facultyId: 'fac_demo_thorne', day: 'Tuesday', availableSlots: [], unavailableSlots: ['11:15 - 12:15'] },
  { id: 'fac_demo_thorne_Wednesday', facultyId: 'fac_demo_thorne', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_thorne_Thursday', facultyId: 'fac_demo_thorne', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_thorne_Friday', facultyId: 'fac_demo_thorne', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 4. Prof. Clara Vance-Sterling (Unavailable Thursday 14:00 - 15:00 for AI lab meeting)
  { id: 'fac_demo_sterling_Monday', facultyId: 'fac_demo_sterling', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_sterling_Tuesday', facultyId: 'fac_demo_sterling', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_sterling_Wednesday', facultyId: 'fac_demo_sterling', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_sterling_Thursday', facultyId: 'fac_demo_sterling', day: 'Thursday', availableSlots: [], unavailableSlots: ['14:00 - 15:00'] },
  { id: 'fac_demo_sterling_Friday', facultyId: 'fac_demo_sterling', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 5. Dr. Arthur Pendelton (Unavailable Monday 14:00 - 15:00 for security review)
  { id: 'fac_demo_pendelton_Monday', facultyId: 'fac_demo_pendelton', day: 'Monday', availableSlots: [], unavailableSlots: ['14:00 - 15:00'] },
  { id: 'fac_demo_pendelton_Tuesday', facultyId: 'fac_demo_pendelton', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_pendelton_Wednesday', facultyId: 'fac_demo_pendelton', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_pendelton_Thursday', facultyId: 'fac_demo_pendelton', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_pendelton_Friday', facultyId: 'fac_demo_pendelton', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 6. Dr. Elena Alvarez (Unavailable Wednesday 09:00 - 10:00 for cloud symposium)
  { id: 'fac_demo_alvarez_Monday', facultyId: 'fac_demo_alvarez', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_alvarez_Tuesday', facultyId: 'fac_demo_alvarez', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_alvarez_Wednesday', facultyId: 'fac_demo_alvarez', day: 'Wednesday', availableSlots: [], unavailableSlots: ['09:00 - 10:00'] },
  { id: 'fac_demo_alvarez_Thursday', facultyId: 'fac_demo_alvarez', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_alvarez_Friday', facultyId: 'fac_demo_alvarez', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 7. Dr. Raymond Moriarty (Unavailable Thursday 10:00 - 11:00 for hardware maintenance)
  { id: 'fac_demo_moriarty_Monday', facultyId: 'fac_demo_moriarty', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_moriarty_Tuesday', facultyId: 'fac_demo_moriarty', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_moriarty_Wednesday', facultyId: 'fac_demo_moriarty', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_moriarty_Thursday', facultyId: 'fac_demo_moriarty', day: 'Thursday', availableSlots: [], unavailableSlots: ['10:00 - 11:00'] },
  { id: 'fac_demo_moriarty_Friday', facultyId: 'fac_demo_moriarty', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 8. Prof. Ananya Kapoor (Unavailable Tuesday 14:00 - 15:00 for software engineering council)
  { id: 'fac_demo_kapoor_Monday', facultyId: 'fac_demo_kapoor', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_kapoor_Tuesday', facultyId: 'fac_demo_kapoor', day: 'Tuesday', availableSlots: [], unavailableSlots: ['14:00 - 15:00'] },
  { id: 'fac_demo_kapoor_Wednesday', facultyId: 'fac_demo_kapoor', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_kapoor_Thursday', facultyId: 'fac_demo_kapoor', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_kapoor_Friday', facultyId: 'fac_demo_kapoor', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 9. Dr. Lin Chen
  { id: 'fac_demo_chen_Monday', facultyId: 'fac_demo_chen', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_chen_Tuesday', facultyId: 'fac_demo_chen', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_chen_Wednesday', facultyId: 'fac_demo_chen', day: 'Wednesday', availableSlots: [], unavailableSlots: ['11:15 - 12:15'] },
  { id: 'fac_demo_chen_Thursday', facultyId: 'fac_demo_chen', day: 'Thursday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_chen_Friday', facultyId: 'fac_demo_chen', day: 'Friday', availableSlots: [], unavailableSlots: [] },

  // 10. Prof. Rajesh Patel
  { id: 'fac_demo_patel_Monday', facultyId: 'fac_demo_patel', day: 'Monday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_patel_Tuesday', facultyId: 'fac_demo_patel', day: 'Tuesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_patel_Wednesday', facultyId: 'fac_demo_patel', day: 'Wednesday', availableSlots: [], unavailableSlots: [] },
  { id: 'fac_demo_patel_Thursday', facultyId: 'fac_demo_patel', day: 'Thursday', availableSlots: [], unavailableSlots: ['15:00 - 16:00'] },
  { id: 'fac_demo_patel_Friday', facultyId: 'fac_demo_patel', day: 'Friday', availableSlots: [], unavailableSlots: [] }
];

/**
 * ============================================================================
 * 6. Fictional Timetable Entries
 * Fully conflict-free weekly schedule providing sessions for all 6 batches.
 * Satisfies all 6 institutional scheduling constraints:
 * - Zero faculty double-booking
 * - Zero batch schedule overlaps
 * - Zero classroom double-booking
 * - Room capacity >= batch enrollment (all rooms are 65-80 seats >= 60 batch max)
 * - Lab practicals mapped strictly to dedicated laboratory rooms
 * - Faculty availability windows strictly respected
 * - Features multiple faculty teaching different sessions of the same subjects!
 * ============================================================================
 */
export const DEMO_FICTIONAL_TIMETABLE_ENTRIES: TimetableEntry[] = [
  // --------------------------------------------------------------------------
  // MONDAY SESSIONS
  // --------------------------------------------------------------------------
  // 09:00 - 10:00
  {
    id: 'entry_demo_dsa_alpha_mon9',
    subjectId: 'sub_demo_dsa_alpha',
    subjectName: '[Demo] Data Structures & Algorithms',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_beta_mon9',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton [Qualified for OS]
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_gamma_mon9',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_embed_zeta_mon9',
    subjectId: 'sub_demo_embed_zeta',
    subjectName: '[Demo] Embedded Systems & Microcontrollers',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },

  // 10:00 - 11:00
  {
    id: 'entry_demo_dbms_alpha_mon10',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_beta_mon10',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsa_lab_gamma_mon10',
    subjectId: 'sub_demo_dsa_lab_gamma',
    subjectName: '[Demo] Advanced Algorithms & Graph Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao [Qualified for DSA]
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_ai_lab_delta_mon10',
    subjectId: 'sub_demo_ai_lab_delta',
    subjectName: '[Demo] Advanced AI Systems & Robotics Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez [Qualified for AI Lab]
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_web_epsilon_mon10',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_kapoor', // Prof. Kapoor
    facultyName: 'Prof. Ananya Kapoor [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Monday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },

  // 11:15 - 12:15
  {
    id: 'entry_demo_dsa_lab_alpha_mon11',
    subjectId: 'sub_demo_dsa_lab_alpha',
    subjectName: '[Demo] Data Structures Practical Lab',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao [Qualified for DSA Lab]
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_os_lab_beta_mon11',
    subjectId: 'sub_demo_os_lab_beta',
    subjectName: '[Demo] Operating Systems Kernel Lab',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance [Qualified for OS Lab]
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_cn_epsilon_mon11',
    subjectId: 'sub_demo_cn_epsilon',
    subjectName: '[Demo] Computer Networks Infrastructure',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne [Qualified for CN]
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsp_zeta_mon11',
    subjectId: 'sub_demo_dsp_zeta',
    subjectName: '[Demo] Digital Signal Processing & Logic',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Monday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },

  // 14:00 - 15:00
  {
    id: 'entry_demo_ml_gamma_mon14',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao [Qualified for ML]
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Monday',
    startTime: '14:00',
    endTime: '15:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_db_lab_epsilon_mon14',
    subjectId: 'sub_demo_db_lab_epsilon',
    subjectName: '[Demo] Database Management Systems Practical',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling [Qualified for DBMS Lab]
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Monday',
    startTime: '14:00',
    endTime: '15:00',
    sessionType: 'lab'
  },

  // --------------------------------------------------------------------------
  // TUESDAY SESSIONS
  // --------------------------------------------------------------------------
  // 09:00 - 10:00
  {
    id: 'entry_demo_dbms_alpha_tue9',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling [Qualified for DBMS]
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_beta_tue9',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne [Qualified for CN]
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cloud_lab_gamma_tue9',
    subjectId: 'sub_demo_cloud_lab_gamma',
    subjectName: '[Demo] Big Data & Cloud Computing Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_os_lab_delta_tue9',
    subjectId: 'sub_demo_os_lab_delta',
    subjectName: '[Demo] Real-Time Systems Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_embed_zeta_tue9',
    subjectId: 'sub_demo_embed_zeta',
    subjectName: '[Demo] Embedded Systems & Microcontrollers',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton [Qualified for Embedded]
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Tuesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },

  // 10:00 - 11:00
  {
    id: 'entry_demo_dsa_alpha_tue10',
    subjectId: 'sub_demo_dsa_alpha',
    subjectName: '[Demo] Data Structures & Algorithms',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao [Qualified for DSA]
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_beta_tue10',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_web_epsilon_tue10',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez [Qualified for Web/Cloud]
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_iot_lab_zeta_tue10',
    subjectId: 'sub_demo_iot_lab_zeta',
    subjectName: '[Demo] IoT Hardware & Sensor Interfaces Lab',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Tuesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },

  // 11:15 - 12:15
  {
    id: 'entry_demo_dsa_lab_alpha_tue11',
    subjectId: 'sub_demo_dsa_lab_alpha',
    subjectName: '[Demo] Data Structures Practical Lab',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_cn_beta_tue11',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_gamma_tue11',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_delta_tue11',
    subjectId: 'sub_demo_ml_delta',
    subjectName: '[Demo] Applied Machine Learning Systems',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsp_zeta_tue11',
    subjectId: 'sub_demo_dsp_zeta',
    subjectName: '[Demo] Digital Signal Processing & Logic',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Tuesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },

  // 14:00 - 15:00
  {
    id: 'entry_demo_os_lab_beta_tue14',
    subjectId: 'sub_demo_os_lab_beta',
    subjectName: '[Demo] Operating Systems Kernel Lab',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Tuesday',
    startTime: '14:00',
    endTime: '15:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_cloud_lab_gamma_tue14',
    subjectId: 'sub_demo_cloud_lab_gamma',
    subjectName: '[Demo] Big Data & Cloud Computing Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Tuesday',
    startTime: '14:00',
    endTime: '15:00',
    sessionType: 'lab'
  },

  // --------------------------------------------------------------------------
  // WEDNESDAY SESSIONS
  // --------------------------------------------------------------------------
  // 09:00 - 10:00
  {
    id: 'entry_demo_dbms_alpha_wed9',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_beta_wed9',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsa_lab_gamma_wed9',
    subjectId: 'sub_demo_dsa_lab_gamma',
    subjectName: '[Demo] Advanced Algorithms & Graph Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_ml_delta_wed9',
    subjectId: 'sub_demo_ml_delta',
    subjectName: '[Demo] Applied Machine Learning Systems',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_web_epsilon_wed9',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_kapoor', // Prof. Kapoor
    facultyName: 'Prof. Ananya Kapoor [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Wednesday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },

  // 10:00 - 11:00
  {
    id: 'entry_demo_dsa_alpha_wed10',
    subjectId: 'sub_demo_dsa_alpha',
    subjectName: '[Demo] Data Structures & Algorithms',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_beta_wed10',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_gamma_wed10',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ai_lab_delta_wed10',
    subjectId: 'sub_demo_ai_lab_delta',
    subjectName: '[Demo] Advanced AI Systems & Robotics Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_db_lab_epsilon_wed10',
    subjectId: 'sub_demo_db_lab_epsilon',
    subjectName: '[Demo] Database Management Systems Practical',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_dsp_zeta_wed10',
    subjectId: 'sub_demo_dsp_zeta',
    subjectName: '[Demo] Digital Signal Processing & Logic',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Wednesday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },

  // 11:15 - 12:15
  {
    id: 'entry_demo_os_beta_wed11',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Wednesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_epsilon_wed11',
    subjectId: 'sub_demo_cn_epsilon',
    subjectName: '[Demo] Computer Networks Infrastructure',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Wednesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_iot_lab_zeta_wed11',
    subjectId: 'sub_demo_iot_lab_zeta',
    subjectName: '[Demo] IoT Hardware & Sensor Interfaces Lab',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Wednesday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },

  // --------------------------------------------------------------------------
  // THURSDAY SESSIONS
  // --------------------------------------------------------------------------
  // 09:00 - 10:00
  {
    id: 'entry_demo_dbms_alpha_thu9',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_beta_thu9',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_gamma_thu9',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_web_epsilon_thu9',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_kapoor', // Prof. Kapoor
    facultyName: 'Prof. Ananya Kapoor [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_embed_zeta_thu9',
    subjectId: 'sub_demo_embed_zeta',
    subjectName: '[Demo] Embedded Systems & Microcontrollers',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Thursday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },

  // 10:00 - 11:00
  {
    id: 'entry_demo_dsa_lab_alpha_thu10',
    subjectId: 'sub_demo_dsa_lab_alpha',
    subjectName: '[Demo] Data Structures Practical Lab',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_cn_beta_thu10',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_lab_delta_thu10',
    subjectId: 'sub_demo_os_lab_delta',
    subjectName: '[Demo] Real-Time Systems Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_ml_gamma_thu10',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_web_epsilon_thu10',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsp_zeta_thu10',
    subjectId: 'sub_demo_dsp_zeta',
    subjectName: '[Demo] Digital Signal Processing & Logic',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_zhao', // Prof. Zhao [Qualified for DSP]
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Thursday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },

  // 11:15 - 12:15
  {
    id: 'entry_demo_dbms_alpha_thu11',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_lab_beta_thu11',
    subjectId: 'sub_demo_os_lab_beta',
    subjectName: '[Demo] Operating Systems Kernel Lab',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_ml_delta_thu11',
    subjectId: 'sub_demo_ml_delta',
    subjectName: '[Demo] Applied Machine Learning Systems',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_db_lab_epsilon_thu11',
    subjectId: 'sub_demo_db_lab_epsilon',
    subjectName: '[Demo] Database Management Systems Practical',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_embed_zeta_thu11',
    subjectId: 'sub_demo_embed_zeta',
    subjectName: '[Demo] Embedded Systems & Microcontrollers',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Thursday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },

  // --------------------------------------------------------------------------
  // FRIDAY SESSIONS
  // --------------------------------------------------------------------------
  // 09:00 - 10:00
  {
    id: 'entry_demo_dsa_alpha_fri9',
    subjectId: 'sub_demo_dsa_alpha',
    subjectName: '[Demo] Data Structures & Algorithms',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_beta_fri9',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsa_lab_gamma_fri9',
    subjectId: 'sub_demo_dsa_lab_gamma',
    subjectName: '[Demo] Advanced Algorithms & Graph Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_ai_lab_delta_fri9',
    subjectId: 'sub_demo_ai_lab_delta',
    subjectName: '[Demo] Advanced AI Systems & Robotics Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_sterling', // Prof. Sterling
    facultyName: 'Prof. Clara Vance-Sterling [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_cn_epsilon_fri9',
    subjectId: 'sub_demo_cn_epsilon',
    subjectName: '[Demo] Computer Networks Infrastructure',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_embed_zeta_fri9',
    subjectId: 'sub_demo_embed_zeta',
    subjectName: '[Demo] Embedded Systems & Microcontrollers',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Friday',
    startTime: '09:00',
    endTime: '10:00',
    sessionType: 'lecture'
  },

  // 10:00 - 11:00
  {
    id: 'entry_demo_os_beta_fri10',
    subjectId: 'sub_demo_os_beta',
    subjectName: '[Demo] Operating Systems Architecture',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_ml_gamma_fri10',
    subjectId: 'sub_demo_ml_gamma',
    subjectName: '[Demo] Machine Learning & Pattern Analysis',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_zhao', // Prof. Zhao
    facultyName: 'Prof. Julian Zhao [Fictional Demo]',
    roomId: 'room_demo_turing_201',
    roomName: '[Demo] Turing Auditorium 201',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_os_lab_delta_fri10',
    subjectId: 'sub_demo_os_lab_delta',
    subjectName: '[Demo] Real-Time Systems Lab',
    batchId: 'batch_demo_delta',
    batchName: '[Demo] Batch Delta — AI & Data Science Year 3',
    facultyId: 'fac_demo_vance', // Dr. Vance
    facultyName: 'Dr. Evelyn Vance [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_web_epsilon_fri10',
    subjectId: 'sub_demo_web_epsilon',
    subjectName: '[Demo] Web Architectures & Cloud Services',
    batchId: 'batch_demo_epsilon',
    batchName: '[Demo] Batch Epsilon — Information Technology Year 2',
    facultyId: 'fac_demo_kapoor', // Prof. Kapoor
    facultyName: 'Prof. Ananya Kapoor [Fictional Demo]',
    roomId: 'room_demo_shannon_202',
    roomName: '[Demo] Shannon Seminar Hall 202',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_dsp_zeta_fri10',
    subjectId: 'sub_demo_dsp_zeta',
    subjectName: '[Demo] Digital Signal Processing & Logic',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Friday',
    startTime: '10:00',
    endTime: '11:00',
    sessionType: 'lecture'
  },

  // 11:15 - 12:15
  {
    id: 'entry_demo_dbms_alpha_fri11',
    subjectId: 'sub_demo_dbms_alpha',
    subjectName: '[Demo] Database Management Systems',
    batchId: 'batch_demo_alpha',
    batchName: '[Demo] Batch Alpha — CSE Year 2',
    facultyId: 'fac_demo_thorne', // Dr. Thorne
    facultyName: 'Dr. Marcus Thorne [Fictional Demo]',
    roomId: 'room_demo_gauss_101',
    roomName: '[Demo] Gauss Lecture Hall 101',
    day: 'Friday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cn_beta_fri11',
    subjectId: 'sub_demo_cn_beta',
    subjectName: '[Demo] Computer Networks & Internet Protocols',
    batchId: 'batch_demo_beta',
    batchName: '[Demo] Batch Beta — CSE Year 2',
    facultyId: 'fac_demo_pendelton', // Dr. Pendelton
    facultyName: 'Dr. Arthur Pendelton [Fictional Demo]',
    roomId: 'room_demo_euler_102',
    roomName: '[Demo] Euler Lecture Hall 102',
    day: 'Friday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lecture'
  },
  {
    id: 'entry_demo_cloud_lab_gamma_fri11',
    subjectId: 'sub_demo_cloud_lab_gamma',
    subjectName: '[Demo] Big Data & Cloud Computing Lab',
    batchId: 'batch_demo_gamma',
    batchName: '[Demo] Batch Gamma — AI & Data Science Year 2',
    facultyId: 'fac_demo_alvarez', // Dr. Alvarez
    facultyName: 'Dr. Elena Alvarez [Fictional Demo]',
    roomId: 'room_demo_ai_robotics_lab',
    roomName: '[Demo] Ada Lovelace AI & Hardware Laboratory',
    day: 'Friday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  },
  {
    id: 'entry_demo_iot_lab_zeta_fri11',
    subjectId: 'sub_demo_iot_lab_zeta',
    subjectName: '[Demo] IoT Hardware & Sensor Interfaces Lab',
    batchId: 'batch_demo_zeta',
    batchName: '[Demo] Batch Zeta — Electronics & Computer Engineering Year 3',
    facultyId: 'fac_demo_moriarty', // Dr. Moriarty
    facultyName: 'Dr. Raymond Moriarty [Fictional Demo]',
    roomId: 'room_demo_apex_lab',
    roomName: '[Demo] Apex Systems & Computing Laboratory',
    day: 'Friday',
    startTime: '11:15',
    endTime: '12:15',
    sessionType: 'lab'
  }
];

export interface LoadDemoDataResult {
  status: 'loaded_success' | 'existing_preserved';
  message: string;
  stats: {
    batches: number;
    faculty: number;
    subjects: number;
    rooms: number;
    entries: number;
  };
  validationReport: ValidationReport;
}

/**
 * Loads the synthetic demo dataset into Cloud Firestore.
 * - Idempotent: Uses deterministic IDs so repeated executions update records without duplicates.
 * - Non-destructive: Never overwrites or purges real institutional records.
 */
export async function loadFictionalDemoData(forceOverwrite: boolean = false): Promise<LoadDemoDataResult> {
  try {
    // 1. Check existing records in Firestore
    const [existingBatchesSnap, existingEntriesSnap] = await Promise.all([
      getDocs(collection(db, BATCHES_COL)),
      getDocs(collection(db, TIMETABLE_COL))
    ]);

    // Check if there are real institutional records (non-demo records)
    const nonDemoBatches = existingBatchesSnap.docs.filter((d) => !d.id.startsWith('batch_demo_'));
    const nonDemoEntries = existingEntriesSnap.docs.filter(
      (d) => !d.id.startsWith('entry_demo_') && !d.id.startsWith('sched_')
    );
    const hasRealInstitutionalData = nonDemoBatches.length > 0 || nonDemoEntries.length > 0;

    // Check if demo data was already loaded previously
    const hasExistingDemoData =
      existingBatchesSnap.docs.some((d) => d.id.startsWith('batch_demo_')) &&
      existingEntriesSnap.docs.some((d) => d.id.startsWith('entry_demo_'));

    if (hasExistingDemoData && !forceOverwrite && hasRealInstitutionalData) {
      // Preserve existing records without overwriting
      const existingEntries = existingEntriesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as TimetableEntry));
      const existingBatches = existingBatchesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Batch));

      const validationReport = validateFullSchedule(
        existingEntries,
        DEMO_FICTIONAL_FACULTY,
        existingBatches,
        DEMO_FICTIONAL_ROOMS,
        DEMO_FICTIONAL_AVAILABILITY
      );

      return {
        status: 'existing_preserved',
        message: 'Existing institutional timetable records detected in Firestore. Real data was preserved without overwriting.',
        stats: {
          batches: existingBatchesSnap.size,
          faculty: DEMO_FICTIONAL_FACULTY.length,
          subjects: DEMO_FICTIONAL_SUBJECTS.length,
          rooms: DEMO_FICTIONAL_ROOMS.length,
          entries: existingEntriesSnap.size
        },
        validationReport
      };
    }

    // 2. Commit synthetic dataset to Firestore in atomic batch
    const batch = writeBatch(db);

    // Batches (6 cohorts)
    DEMO_FICTIONAL_BATCHES.forEach((b) => {
      batch.set(doc(db, BATCHES_COL, b.id), sanitizeForFirestore(b));
    });

    // Faculty (8 instructors)
    DEMO_FICTIONAL_FACULTY.forEach((f) => {
      batch.set(doc(db, FACULTY_COL, f.id), sanitizeForFirestore(f));
    });

    // Rooms (6 rooms including 2 labs)
    DEMO_FICTIONAL_ROOMS.forEach((r) => {
      batch.set(doc(db, ROOMS_COL, r.id), sanitizeForFirestore(r));
    });

    // Subjects (14 subjects with multi-faculty qualifications)
    DEMO_FICTIONAL_SUBJECTS.forEach((s) => {
      batch.set(doc(db, SUBJECTS_COL, s.id), sanitizeForFirestore(s));
    });

    // Availability (Monday - Friday for all 8 faculty)
    DEMO_FICTIONAL_AVAILABILITY.forEach((a) => {
      batch.set(doc(db, AVAILABILITY_COL, a.id), sanitizeForFirestore(a));
    });

    // Timetable Entries (Comprehensive conflict-free schedule across all 6 batches)
    DEMO_FICTIONAL_TIMETABLE_ENTRIES.forEach((e) => {
      batch.set(
        doc(db, TIMETABLE_COL, e.id),
        sanitizeForFirestore({
          ...e,
          createdAt: new Date().toISOString()
        })
      );
    });

    await batch.commit();

    // 3. Seed demo user profiles in Firestore
    await seedDemoUserProfilesInFirestore().catch((err) => {
      console.warn('Note: Could not batch write demo user profiles:', err);
    });

    // 4. Immediately run full multi-constraint validation
    const validationReport = validateFullSchedule(
      DEMO_FICTIONAL_TIMETABLE_ENTRIES,
      DEMO_FICTIONAL_FACULTY,
      DEMO_FICTIONAL_BATCHES,
      DEMO_FICTIONAL_ROOMS,
      DEMO_FICTIONAL_AVAILABILITY
    );

    return {
      status: 'loaded_success',
      message: 'Fictional demo dataset successfully loaded and synchronized with Cloud Firestore.',
      stats: {
        batches: DEMO_FICTIONAL_BATCHES.length,
        faculty: DEMO_FICTIONAL_FACULTY.length,
        subjects: DEMO_FICTIONAL_SUBJECTS.length,
        rooms: DEMO_FICTIONAL_ROOMS.length,
        entries: DEMO_FICTIONAL_TIMETABLE_ENTRIES.length
      },
      validationReport
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'loadFictionalDemoData');
  }
}
