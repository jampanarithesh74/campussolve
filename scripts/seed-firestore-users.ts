import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import cfg from '../firebase-applet-config.json';
import { DEMO_ACCOUNTS } from '../src/lib/demoAccounts';

const app = !getApps().length ? initializeApp(cfg) : getApp();
const db = cfg.firestoreDatabaseId && cfg.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, cfg.firestoreDatabaseId)
  : getFirestore(app);


async function seedUsers() {
  console.log('Seeding demo users into Firestore users/{uid} collection...');
  const batch = writeBatch(db);

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

    const userRef = doc(db, 'users', acc.deterministicUid);
    batch.set(userRef, userDoc, { merge: true });

    if (acc.role === 'admin') {
      const adminRef = doc(db, 'admins', acc.deterministicUid);
      batch.set(adminRef, {
        uid: acc.deterministicUid,
        email: acc.email.toLowerCase(),
        grantedAt: new Date().toISOString()
      }, { merge: true });
    }
  }

  await batch.commit();
  console.log(`Successfully seeded ${DEMO_ACCOUNTS.length} demo user profiles into Firestore.`);
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('Failed to seed users into Firestore:', err);
  process.exit(1);
});
