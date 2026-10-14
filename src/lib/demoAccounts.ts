import { UserProfile, UserRole } from '../types';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { USERS_COL, ADMINS_COL, sanitizeForFirestore } from './timetableService';

export const DEFAULT_DEMO_PASSWORD = '1234567890';

export interface DemoAccountDef {
  email: string;
  role: UserRole;
  displayName: string;
  deterministicUid: string;
  batchId?: string;
  facultyId?: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccountDef[] = [
  // 1. Admin
  {
    email: 'admin@campussolve.demo',
    role: 'admin',
    displayName: 'CampusSolve Administrator',
    deterministicUid: 'uid_admin_campussolve_demo',
    description: 'Full timetable, faculty, room, and scheduling management'
  },

  // 2. Faculty (10 members)
  {
    email: 'faculty1@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Evelyn Vance',
    deterministicUid: 'uid_faculty1_campussolve_demo',
    facultyId: 'fac_demo_vance',
    description: 'Software Systems & Architecture • Assigned DSA & OS'
  },
  {
    email: 'faculty2@campussolve.demo',
    role: 'faculty',
    displayName: 'Prof. Julian Zhao',
    deterministicUid: 'uid_faculty2_campussolve_demo',
    facultyId: 'fac_demo_zhao',
    description: 'Theoretical Computing & AI • Assigned DSA & ML'
  },
  {
    email: 'faculty3@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Marcus Thorne',
    deterministicUid: 'uid_faculty3_campussolve_demo',
    facultyId: 'fac_demo_thorne',
    description: 'Information Systems & Databases • Assigned DBMS & CN'
  },
  {
    email: 'faculty4@campussolve.demo',
    role: 'faculty',
    displayName: 'Prof. Clara Vance-Sterling',
    deterministicUid: 'uid_faculty4_campussolve_demo',
    facultyId: 'fac_demo_sterling',
    description: 'Artificial Intelligence & ML • Assigned ML & AI Lab'
  },
  {
    email: 'faculty5@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Arthur Pendelton',
    deterministicUid: 'uid_faculty5_campussolve_demo',
    facultyId: 'fac_demo_pendelton',
    description: 'Computer Networks & Cybersecurity • Assigned OS & CN'
  },
  {
    email: 'faculty6@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Elena Alvarez',
    deterministicUid: 'uid_faculty6_campussolve_demo',
    facultyId: 'fac_demo_alvarez',
    description: 'Data Analytics & Cloud • Assigned Big Data & Cloud Lab'
  },
  {
    email: 'faculty7@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Raymond Moriarty',
    deterministicUid: 'uid_faculty7_campussolve_demo',
    facultyId: 'fac_demo_moriarty',
    description: 'Hardware Architectures & IoT • Assigned Embedded Systems & IoT'
  },
  {
    email: 'faculty8@campussolve.demo',
    role: 'faculty',
    displayName: 'Prof. Ananya Kapoor',
    deterministicUid: 'uid_faculty8_campussolve_demo',
    facultyId: 'fac_demo_kapoor',
    description: 'Software Engineering & Web Tech • Assigned Web Architectures'
  },
  {
    email: 'faculty9@campussolve.demo',
    role: 'faculty',
    displayName: 'Dr. Lin Chen',
    deterministicUid: 'uid_faculty9_campussolve_demo',
    facultyId: 'fac_demo_chen',
    description: 'Robotics & Autonomous Systems'
  },
  {
    email: 'faculty10@campussolve.demo',
    role: 'faculty',
    displayName: 'Prof. Rajesh Patel',
    deterministicUid: 'uid_faculty10_campussolve_demo',
    facultyId: 'fac_demo_patel',
    description: 'Cyber-Physical Systems & Sensor Networks'
  },

  // 3. Students (10 students across batches)
  {
    email: 'student1@campussolve.demo',
    role: 'student',
    displayName: 'Alex Rivera (Student 1)',
    deterministicUid: 'uid_student1_campussolve_demo',
    batchId: 'batch_demo_alpha',
    description: 'Batch Alpha • CSE Year 2 (Semester 3)'
  },
  {
    email: 'student2@campussolve.demo',
    role: 'student',
    displayName: 'Samantha Wu (Student 2)',
    deterministicUid: 'uid_student2_campussolve_demo',
    batchId: 'batch_demo_alpha',
    description: 'Batch Alpha • CSE Year 2 (Semester 3)'
  },
  {
    email: 'student3@campussolve.demo',
    role: 'student',
    displayName: 'Jordan Miller (Student 3)',
    deterministicUid: 'uid_student3_campussolve_demo',
    batchId: 'batch_demo_beta',
    description: 'Batch Beta • CSE Year 2 (Semester 3)'
  },
  {
    email: 'student4@campussolve.demo',
    role: 'student',
    displayName: 'Liam Johnson (Student 4)',
    deterministicUid: 'uid_student4_campussolve_demo',
    batchId: 'batch_demo_beta',
    description: 'Batch Beta • CSE Year 2 (Semester 3)'
  },
  {
    email: 'student5@campussolve.demo',
    role: 'student',
    displayName: 'Maya Patel (Student 5)',
    deterministicUid: 'uid_student5_campussolve_demo',
    batchId: 'batch_demo_gamma',
    description: 'Batch Gamma • AI & Data Science Year 2 (Semester 3)'
  },
  {
    email: 'student6@campussolve.demo',
    role: 'student',
    displayName: 'Ethan Davis (Student 6)',
    deterministicUid: 'uid_student6_campussolve_demo',
    batchId: 'batch_demo_gamma',
    description: 'Batch Gamma • AI & Data Science Year 2 (Semester 3)'
  },
  {
    email: 'student7@campussolve.demo',
    role: 'student',
    displayName: 'Noah Martinez (Student 7)',
    deterministicUid: 'uid_student7_campussolve_demo',
    batchId: 'batch_demo_delta',
    description: 'Batch Delta • AI & Data Science Year 3 (Semester 5)'
  },
  {
    email: 'student8@campussolve.demo',
    role: 'student',
    displayName: 'Sophia Taylor (Student 8)',
    deterministicUid: 'uid_student8_campussolve_demo',
    batchId: 'batch_demo_delta',
    description: 'Batch Delta • AI & Data Science Year 3 (Semester 5)'
  },
  {
    email: 'student9@campussolve.demo',
    role: 'student',
    displayName: 'Lucas Anderson (Student 9)',
    deterministicUid: 'uid_student9_campussolve_demo',
    batchId: 'batch_demo_epsilon',
    description: 'Batch Epsilon • Information Technology Year 2 (Semester 3)'
  },
  {
    email: 'student10@campussolve.demo',
    role: 'student',
    displayName: 'Chloe Thomas (Student 10)',
    deterministicUid: 'uid_student10_campussolve_demo',
    batchId: 'batch_demo_zeta',
    description: 'Batch Zeta • Electronics & Computer Eng Year 3 (Semester 5)'
  }
];

export function findDemoAccount(email: string): DemoAccountDef | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((acc) => acc.email.toLowerCase() === normalized);
}

/**
 * Ensures all 21 demo accounts have profiles in Firestore users/{uid}.
 * Idempotent: checks/sets documents using deterministic IDs and actual auth UIDs.
 */
export async function seedDemoUserProfilesInFirestore(activeUid?: string, activeEmail?: string): Promise<void> {
  try {
    const batch = writeBatch(db);

    // If an authenticated user is logging in with a demo email, associate their real Firebase UID
    if (activeUid && activeEmail) {
      const match = findDemoAccount(activeEmail);
      if (match) {
        const userRef = doc(db, USERS_COL, activeUid);
        const userProf: UserProfile = {
          id: activeUid,
          uid: activeUid,
          email: match.email.toLowerCase(),
          name: match.displayName,
          displayName: match.displayName,
          role: match.role.toUpperCase() as UserRole,
          active: true,
          department: 'CSE',
          batchId: match.batchId,
          facultyId: match.facultyId,
          createdAt: new Date().toISOString()
        };
        batch.set(userRef, sanitizeForFirestore(userProf), { merge: true });

        if (match.role.toLowerCase() === 'admin') {
          const adminRef = doc(db, ADMINS_COL, activeUid);
          batch.set(adminRef, {
            uid: activeUid,
            email: match.email.toLowerCase(),
            grantedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    }

    // Also populate deterministic entries for all 21 demo accounts
    DEMO_ACCOUNTS.forEach((account) => {
      const userRef = doc(db, USERS_COL, account.deterministicUid);
      const userProf: UserProfile = {
        id: account.deterministicUid,
        uid: account.deterministicUid,
        email: account.email.toLowerCase(),
        name: account.displayName,
        displayName: account.displayName,
        role: account.role.toUpperCase() as UserRole,
        active: true,
        department: 'CSE',
        batchId: account.batchId,
        facultyId: account.facultyId,
        createdAt: new Date().toISOString()
      };
      batch.set(userRef, sanitizeForFirestore(userProf), { merge: true });

      if (account.role.toLowerCase() === 'admin') {
        const adminRef = doc(db, ADMINS_COL, account.deterministicUid);
        batch.set(adminRef, {
          uid: account.deterministicUid,
          email: account.email.toLowerCase(),
          grantedAt: new Date().toISOString()
        }, { merge: true });
      }
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedDemoUserProfilesInFirestore');
  }
}
