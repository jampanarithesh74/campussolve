/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/auth/LoginView';
import { StudentDashboard } from './components/student/StudentDashboard';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import {
  getBatches,
  getFaculty,
  getSubjects,
  getRooms,
  getTimetableEntries,
  getFacultyAvailability,
  saveTimetableEntry
} from './lib/timetableService';
import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableEntry,
  normalizeRole
} from './types';
import { Calendar, Loader2, Sparkles } from 'lucide-react';
import { CampusSolveAIAssistant } from './components/common/CampusSolveAIAssistant';

import {
  DEMO_FICTIONAL_BATCHES,
  DEMO_FICTIONAL_FACULTY,
  DEMO_FICTIONAL_SUBJECTS,
  DEMO_FICTIONAL_ROOMS,
  DEMO_FICTIONAL_AVAILABILITY,
  DEMO_FICTIONAL_TIMETABLE_ENTRIES,
  loadFictionalDemoData
} from './lib/demoData';

function DashboardRouter() {
  const { currentUser, userProfile, role, loading, demoModeActive } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [availabilities, setAvailabilities] = useState<FacultyAvailability[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Student active batch selection
  const [studentBatchId, setStudentBatchId] = useState<string>('batch_demo_alpha');
  // Teacher active faculty selection
  const [teacherFacultyId, setTeacherFacultyId] = useState<string>('fac_demo_vance');

  // Handle applying AI-generated automated schedule
  const handleApplyAISchedule = async (newEntries: TimetableEntry[]) => {
    setEntries(newEntries);
    const normRole = normalizeRole(role);
    if (currentUser && !demoModeActive && normRole === 'admin') {
      try {
        await Promise.all(newEntries.map((e) => saveTimetableEntry(e)));
      } catch (err) {
        console.error('Error persisting AI schedule entries to Firestore:', err);
      }
    }
  };

  // Load dataset from Firestore
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setDataLoading(true);
    }

    try {
      const normRole = normalizeRole(role);

      // Always fetch institutional dataset from Cloud Firestore

      // Load resources from Cloud Firestore
      let [bList, fList, sList, rList, aList] = await Promise.all([
        getBatches().catch(() => []),
        getFaculty().catch(() => []),
        getSubjects().catch(() => []),
        getRooms().catch(() => []),
        getFacultyAvailability().catch(() => [])
      ]);

      // If Firestore database is initially empty, perform initial demo data migration
      if (bList.length === 0 && fList.length === 0) {
        try {
          await loadFictionalDemoData();
          [bList, fList, sList, rList, aList] = await Promise.all([
            getBatches().catch(() => []),
            getFaculty().catch(() => []),
            getSubjects().catch(() => []),
            getRooms().catch(() => []),
            getFacultyAvailability().catch(() => [])
          ]);
        } catch (seedErr) {
          console.warn('Initial Firestore seed attempt completed or skipped:', seedErr);
        }
      }

      // Fallback to demo objects if Firestore returns empty set to guarantee interface stability
      setBatches(bList.length > 0 ? bList : DEMO_FICTIONAL_BATCHES);
      setFaculty(fList.length > 0 ? fList : DEMO_FICTIONAL_FACULTY);
      setSubjects(sList.length > 0 ? sList : DEMO_FICTIONAL_SUBJECTS);
      setRooms(rList.length > 0 ? rList : DEMO_FICTIONAL_ROOMS);
      setAvailabilities(aList.length > 0 ? aList : DEMO_FICTIONAL_AVAILABILITY);

      if (bList.length > 0 && !bList.some((b) => b.id === studentBatchId)) {
        setStudentBatchId(bList[0].id);
      }
      if (fList.length > 0 && !fList.some((f) => f.id === teacherFacultyId)) {
        setTeacherFacultyId(fList[0].id);
      }

      // Timetable entries query
      const filterId =
        normRole === 'student'
          ? userProfile?.batchId || studentBatchId
          : normRole === 'faculty'
          ? userProfile?.facultyId || teacherFacultyId
          : undefined;

      const tEntries = await getTimetableEntries(normRole, filterId).catch(() => []);
      if (tEntries.length > 0) {
        setEntries(tEntries);
      } else {
        // Fallback filter on fictional entries if collection is empty
        let fallbackEntries = DEMO_FICTIONAL_TIMETABLE_ENTRIES;
        if (normRole === 'student' && filterId) {
          fallbackEntries = DEMO_FICTIONAL_TIMETABLE_ENTRIES.filter((e) => e.batchId === filterId);
        } else if (normRole === 'faculty' && filterId) {
          fallbackEntries = DEMO_FICTIONAL_TIMETABLE_ENTRIES.filter((e) => e.facultyId === filterId);
        }
        setEntries(fallbackEntries);
      }
    } catch (err) {
      console.error('Error fetching timetable dataset from Firestore:', err);
    } finally {
      setDataLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser, demoModeActive, role, userProfile, studentBatchId, teacherFacultyId]);

  // Initial load when user or role changes
  useEffect(() => {
    if (currentUser || userProfile) {
      loadData();
    }
  }, [currentUser, userProfile, role, loadData]);

  // Sync default batchId/facultyId from user profile
  useEffect(() => {
    if (userProfile?.batchId) {
      setStudentBatchId(userProfile.batchId);
    }
    if (userProfile?.facultyId) {
      setTeacherFacultyId(userProfile.facultyId);
    }
  }, [userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-200">
          <Calendar className="w-6 h-6" />
        </div>
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
        <p className="text-xs text-slate-500 font-medium">Loading CampusSolve...</p>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser && !userProfile) {
    return <LoginView />;
  }

  const normRole = normalizeRole(role);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar
        onRefreshData={() => loadData(true)}
        isRefreshing={isRefreshing}
        onToggleAIAssistant={() => setIsAIOpen((prev) => !prev)}
        isAIOpen={isAIOpen}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {dataLoading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500">Synchronizing timetable records from Cloud Firestore...</p>
          </div>
        ) : normRole === 'admin' ? (
          <AdminDashboard
            entries={entries}
            batches={batches}
            faculty={faculty}
            subjects={subjects}
            rooms={rooms}
            availabilities={availabilities}
            onRefreshData={() => loadData(true)}
          />
        ) : normRole === 'faculty' ? (
          <TeacherDashboard
            entries={entries}
            facultyList={faculty}
            currentFacultyId={teacherFacultyId}
            availabilityList={availabilities}
            onSelectFaculty={(id) => {
              setTeacherFacultyId(id);
              loadData(true);
            }}
            onRefresh={() => loadData(true)}
          />
        ) : (
          <StudentDashboard
            entries={entries}
            batches={batches}
            faculty={faculty}
            currentBatchId={studentBatchId}
            onSelectBatch={(id) => {
              setStudentBatchId(id);
              loadData(true);
            }}
            onRefresh={() => loadData(true)}
          />
        )}
      </main>

      {/* Floating CampusSolve AI Trigger Button */}
      {!isAIOpen && (
        <button
          onClick={() => setIsAIOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-full bg-slate-900 hover:bg-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer border border-slate-700/50 hover:border-blue-400 group no-print"
          title="Open CampusSolve Intelligent AI Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-blue-500/20 group-hover:bg-white/20 flex items-center justify-center transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:text-white animate-pulse" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold tracking-tight leading-none flex items-center gap-1.5">
              <span>CampusSolve AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            </div>
            <span className="text-[10px] text-slate-300 group-hover:text-blue-100 font-medium">
              {normRole === 'admin'
                ? 'Scheduling Co-Pilot'
                : normRole === 'faculty'
                ? 'Faculty Assistant'
                : 'Student Guide'}
            </span>
          </div>
        </button>
      )}

      {/* CampusSolve Intelligent AI Assistant Drawer */}
      <CampusSolveAIAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        role={normRole}
        userInfo={{
          id: userProfile?.id || currentUser?.uid || 'user_demo',
          email: userProfile?.email || currentUser?.email || 'user@campussolve.demo',
          displayName: userProfile?.displayName || currentUser?.displayName || 'Campus Member',
          batchId: normRole === 'student' ? studentBatchId : undefined,
          facultyId: normRole === 'faculty' ? teacherFacultyId : undefined
        }}
        dataset={{
          entries,
          faculty,
          batches,
          rooms,
          subjects,
          availabilities
        }}
        onApplyGeneratedSchedule={handleApplyAISchedule}
        onTriggerPrintExport={() => window.print()}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        CampusSolve • Academic Timetable Management System
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}
