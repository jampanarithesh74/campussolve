import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  auth,
  testConnectionAndReadWrite,
  ConnectionVerificationResult
} from '../lib/firebase';
import { getUserProfile, setUserProfile } from '../lib/timetableService';
import { UserProfile, UserRole, normalizeRole } from '../types';
import {
  findDemoAccount,
  DEFAULT_DEMO_PASSWORD,
  seedDemoUserProfilesInFirestore
} from '../lib/demoAccounts';

// Admin email bootstrapped from environment
export const BOOTSTRAP_ADMIN_EMAIL = 'admin@campussolve.demo';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  isFirebaseConnected: boolean;
  connectionResult: ConnectionVerificationResult | null;
  demoModeActive: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (email: string, password: string, displayName: string, role?: UserRole) => Promise<UserProfile>;
  logout: () => Promise<void>;
  verifyLiveReadWrite: () => Promise<ConnectionVerificationResult>;
  setDemoPersona: (role: UserRole, batchId?: string, facultyId?: string, name?: string) => void;
  clearDemoPersona: () => void;
  updateCurrentUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);
  const [connectionResult, setConnectionResult] = useState<ConnectionVerificationResult | null>(null);
  const [demoPersona, setDemoPersonaState] = useState<UserProfile | null>(null);

  // Check connection and seed initial demo profiles on boot
  useEffect(() => {
    testConnectionAndReadWrite().then((res) => {
      setConnectionResult(res);
      setIsFirebaseConnected(res.connected);
    });
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          testConnectionAndReadWrite().then((res) => {
            setConnectionResult(res);
            setIsFirebaseConnected(res.connected);
          });

          // 1. Always read user profile directly from Cloud Firestore users/{uid}
          let profile = await getUserProfile(user.uid);
          const emailLower = (user.email || '').toLowerCase();
          const demoMatch = findDemoAccount(emailLower);
          const isAdminEmail =
            emailLower === 'admin@campussolve.demo' ||
            emailLower === 'agastya752@gmail.com';

          if (!profile) {
            // New user registration or first sign-in without existing doc
            const assignedRole: UserRole = demoMatch
              ? (demoMatch.role.toUpperCase() as UserRole)
              : isAdminEmail
              ? 'ADMIN'
              : 'STUDENT';

            const newProf: UserProfile = {
              id: user.uid,
              uid: user.uid,
              email: emailLower,
              name:
                demoMatch?.displayName ||
                user.displayName ||
                emailLower.split('@')[0] ||
                'User',
              displayName:
                demoMatch?.displayName ||
                user.displayName ||
                emailLower.split('@')[0] ||
                'User',
              role: assignedRole,
              active: true,
              department: 'CSE',
              batchId: demoMatch?.batchId || (normalizeRole(assignedRole) === 'student' ? 'batch_demo_alpha' : undefined),
              facultyId: demoMatch?.facultyId,
              createdAt: new Date().toISOString()
            };
            await setUserProfile(newProf);
            profile = newProf;
          } else if (isAdminEmail && normalizeRole(profile.role) !== 'admin') {
            profile = {
              ...profile,
              role: 'ADMIN'
            };
            await setUserProfile(profile);
          }
          setUserProfileState(profile);
        } catch (err) {
          console.error('Error fetching/setting user profile in Firestore:', err);
        }
      } else {
        if (!demoPersona) {
          setUserProfileState(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [demoPersona]);

  const loginWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // 1. Attempt standard Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // 2. Read corresponding Firestore users/{uid} document
      let profile = await getUserProfile(user.uid);

      if (!profile) {
        const demoMatch = findDemoAccount(cleanEmail);
        const isAdmin =
          cleanEmail === 'admin@campussolve.demo' ||
          cleanEmail === 'agastya752@gmail.com';

        const assignedRole: UserRole = demoMatch
          ? (demoMatch.role.toUpperCase() as UserRole)
          : isAdmin
          ? 'ADMIN'
          : 'STUDENT';

        const newProf: UserProfile = {
          id: user.uid,
          uid: user.uid,
          email: cleanEmail,
          name:
            demoMatch?.displayName ||
            user.displayName ||
            cleanEmail.split('@')[0] ||
            'Campus Member',
          displayName:
            demoMatch?.displayName ||
            user.displayName ||
            cleanEmail.split('@')[0] ||
            'Campus Member',
          role: assignedRole,
          active: true,
          department: 'CSE',
          batchId: demoMatch?.batchId || (!isAdmin && !demoMatch?.facultyId ? 'batch_demo_alpha' : undefined),
          facultyId: demoMatch?.facultyId,
          createdAt: new Date().toISOString()
        };
        await setUserProfile(newProf);
        profile = newProf;
      }

      // Sync demo profiles in background if admin
      if (normalizeRole(profile.role) === 'admin') {
        seedDemoUserProfilesInFirestore(user.uid, cleanEmail).catch(() => {});
      }

      setUserProfileState(profile);
      setDemoPersonaState(null);
      return profile;
    } catch (err: any) {
      const code = err?.code || '';

      // Graceful fallback for demo accounts when Email/Password provider is awaiting console enable
      if (code === 'auth/operation-not-allowed') {
        const demoMatch = findDemoAccount(cleanEmail);
        if (demoMatch && password === DEFAULT_DEMO_PASSWORD) {
          // Read actual profile directly from Cloud Firestore users/{uid}
          let profile = await getUserProfile(demoMatch.deterministicUid);
          if (!profile) {
            profile = {
              id: demoMatch.deterministicUid,
              uid: demoMatch.deterministicUid,
              email: demoMatch.email.toLowerCase(),
              name: demoMatch.displayName,
              displayName: demoMatch.displayName,
              role: demoMatch.role.toUpperCase() as UserRole,
              active: true,
              department: 'CSE',
              batchId: demoMatch.batchId,
              facultyId: demoMatch.facultyId,
              createdAt: new Date().toISOString()
            };
            await setUserProfile(profile).catch(() => {});
          }

          setUserProfileState(profile);
          setDemoPersonaState(profile);
          return profile;
        }
      }

      console.error('Email sign in error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string,
    requestedRole?: UserRole
  ): Promise<UserProfile> => {
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);

    try {
      // 1. Create authentication credentials with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      if (displayName) {
        await updateProfile(user, { displayName });
      }

      const isAdminEmail =
        cleanEmail === 'admin@campussolve.demo' ||
        cleanEmail === 'agastya752@gmail.com';
      const assignedRole: UserRole = isAdminEmail
        ? 'ADMIN'
        : requestedRole === 'faculty' || requestedRole === 'teacher' || requestedRole === 'FACULTY' || requestedRole === 'TEACHER'
        ? 'FACULTY'
        : 'STUDENT';

      // 2. Create corresponding user profile in Firestore 'users' collection (users/{uid})
      const newProfile: UserProfile = {
        id: user.uid,
        uid: user.uid,
        email: cleanEmail,
        name: displayName || cleanEmail.split('@')[0],
        displayName: displayName || cleanEmail.split('@')[0],
        role: assignedRole,
        active: true,
        department: 'CSE',
        createdAt: new Date().toISOString()
      };

      if (assignedRole === 'STUDENT') {
        newProfile.batchId = 'batch_demo_alpha';
      }

      await setUserProfile(newProfile);
      setUserProfileState(newProfile);
      setDemoPersonaState(null);
      return newProfile;
    } catch (err: unknown) {
      console.error('Email Registration Error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setDemoPersonaState(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
    setUserProfileState(null);
  };

  const verifyLiveReadWrite = async (): Promise<ConnectionVerificationResult> => {
    const res = await testConnectionAndReadWrite();
    setConnectionResult(res);
    setIsFirebaseConnected(res.connected);
    return res;
  };

  const setDemoPersona = (role: UserRole, batchId?: string, facultyId?: string, name?: string) => {
    const simulatedProfile: UserProfile = {
      id: `demo_${role}_${Date.now()}`,
      email: `${role}.demo@campussolve.demo`,
      displayName:
        name ||
        (role === 'admin'
          ? 'CampusSolve Administrator'
          : role === 'faculty' || role === 'teacher'
          ? 'Dr. Evelyn Vance'
          : 'Student [Batch Alpha]'),
      role,
      createdAt: new Date().toISOString()
    };
    if (role === 'student') {
      simulatedProfile.batchId = batchId || 'batch_demo_alpha';
    } else if (role === 'faculty' || role === 'teacher') {
      simulatedProfile.facultyId = facultyId || 'fac_demo_vance';
    }
    setDemoPersonaState(simulatedProfile);
  };

  const clearDemoPersona = () => {
    setDemoPersonaState(null);
  };

  const updateCurrentUserProfile = async (data: Partial<UserProfile>) => {
    if (!effectiveProfile) return;
    const updated = { ...effectiveProfile, ...data, updatedAt: new Date().toISOString() };
    if (demoPersona) {
      setDemoPersonaState(updated);
    } else {
      await setUserProfile(updated);
      setUserProfileState(updated);
    }
  };

  const effectiveProfile = demoPersona || userProfile;
  const effectiveRole = effectiveProfile?.role || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile: effectiveProfile,
        role: effectiveRole,
        loading,
        isFirebaseConnected,
        connectionResult,
        demoModeActive: !!demoPersona,
        loginWithEmail,
        registerWithEmail,
        logout,
        verifyLiveReadWrite,
        setDemoPersona,
        clearDemoPersona,
        updateCurrentUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
