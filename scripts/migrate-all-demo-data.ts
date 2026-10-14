import { db } from '../src/lib/firebase';
import { doc, writeBatch, collection, getDocs } from 'firebase/firestore';
import cfg from '../firebase-applet-config.json';
import {
  DEMO_FICTIONAL_BATCHES,
  DEMO_FICTIONAL_FACULTY,
  DEMO_FICTIONAL_ROOMS,
  DEMO_FICTIONAL_SUBJECTS,
  DEMO_FICTIONAL_AVAILABILITY,
  DEMO_FICTIONAL_TIMETABLE_ENTRIES
} from '../src/lib/demoData';
import { DEMO_ACCOUNTS } from '../src/lib/demoAccounts';
import { sanitizeForFirestore } from '../src/lib/timetableService';

async function migrateAll() {
  console.log(`[Migration] Starting full migration into Firestore DB: ${cfg.firestoreDatabaseId}`);

  // 1. Batches (6 cohorts)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_BATCHES.length} batches...`);
  const batch1 = writeBatch(db);
  for (const b of DEMO_FICTIONAL_BATCHES) {
    batch1.set(doc(db, 'batches', b.id), sanitizeForFirestore(b), { merge: true });
  }
  await batch1.commit();

  // 2. Faculty (10 members)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_FACULTY.length} faculty members...`);
  const batch2 = writeBatch(db);
  for (const f of DEMO_FICTIONAL_FACULTY) {
    batch2.set(doc(db, 'faculty', f.id), sanitizeForFirestore(f), { merge: true });
  }
  await batch2.commit();

  // 3. Rooms (6 rooms)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_ROOMS.length} rooms...`);
  const batch3 = writeBatch(db);
  for (const r of DEMO_FICTIONAL_ROOMS) {
    batch3.set(doc(db, 'rooms', r.id), sanitizeForFirestore(r), { merge: true });
  }
  await batch3.commit();

  // 4. Subjects (18 subjects)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_SUBJECTS.length} subjects...`);
  const batch4 = writeBatch(db);
  for (const s of DEMO_FICTIONAL_SUBJECTS) {
    batch4.set(doc(db, 'subjects', s.id), sanitizeForFirestore(s), { merge: true });
  }
  await batch4.commit();

  // 5. Faculty Availability (50 records)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_AVAILABILITY.length} faculty availability records...`);
  const batch5 = writeBatch(db);
  for (const a of DEMO_FICTIONAL_AVAILABILITY) {
    batch5.set(doc(db, 'facultyAvailability', a.id), sanitizeForFirestore(a), { merge: true });
  }
  await batch5.commit();

  // 6. Timetable Entries (76 conflict-free sessions)
  console.log(`[Migration] Migrating ${DEMO_FICTIONAL_TIMETABLE_ENTRIES.length} timetable entries...`);
  const batch6 = writeBatch(db);
  for (const e of DEMO_FICTIONAL_TIMETABLE_ENTRIES) {
    batch6.set(doc(db, 'timetableEntries', e.id), sanitizeForFirestore({
      ...e,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  }
  await batch6.commit();

  // 7. Users collection: all 21 demo accounts matching strict requirements
  console.log(`[Migration] Migrating ${DEMO_ACCOUNTS.length} user accounts into users/{uid}...`);
  const batch7 = writeBatch(db);
  for (const acc of DEMO_ACCOUNTS) {
    const roleUpper = acc.role.toUpperCase();
    const userDoc = {
      uid: acc.deterministicUid,
      id: acc.deterministicUid,
      email: acc.email.toLowerCase(),
      name: acc.displayName,
      displayName: acc.displayName,
      role: roleUpper,
      active: true,
      department: 'CSE',
      ...(acc.facultyId ? { facultyId: acc.facultyId } : {}),
      ...(acc.batchId ? { batchId: acc.batchId } : {}),
      createdAt: new Date().toISOString()
    };
    batch7.set(doc(db, 'users', acc.deterministicUid), userDoc, { merge: true });

    if (acc.role.toLowerCase() === 'admin') {
      batch7.set(doc(db, 'admins', acc.deterministicUid), {
        uid: acc.deterministicUid,
        email: acc.email.toLowerCase(),
        grantedAt: new Date().toISOString()
      }, { merge: true });
    }
  }
  await batch7.commit();

  console.log('[Migration] Migration committed! Verifying Firestore counts...');

  const collections = [
    'batches',
    'faculty',
    'rooms',
    'subjects',
    'facultyAvailability',
    'timetableEntries',
    'users',
    'admins'
  ];

  for (const col of collections) {
    const snap = await getDocs(collection(db, col));
    console.log(`[Firestore Count] ${col}: ${snap.size} documents in Cloud Firestore`);
  }

  console.log('[Migration] ALL DEMO DATA SUCCESSFULLY MIGRATED TO CLOUD FIRESTORE!');
  process.exit(0);
}

migrateAll().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
