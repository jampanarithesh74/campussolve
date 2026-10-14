import React, { useState, useEffect } from 'react';
import {
  TimetableEntry,
  Subject,
  Batch,
  Faculty,
  Room,
  FacultyAvailability,
  DayOfWeek,
  DAYS_OF_WEEK,
  TIME_SLOTS,
  TimetableConflict,
  getSubjectFacultyIds
} from '../../types';
import { validateEntry } from '../../lib/scheduler';
import { X, AlertTriangle, CheckCircle2, Save, AlertCircle } from 'lucide-react';

interface TimetableEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entryToEdit: TimetableEntry | null;
  entries: TimetableEntry[];
  subjects: Subject[];
  batches: Batch[];
  rooms: Room[];
  faculty: Faculty[];
  availabilities: FacultyAvailability[];
  onSaveEntry: (entry: TimetableEntry) => Promise<void>;
}

export const TimetableEntryModal: React.FC<TimetableEntryModalProps> = ({
  isOpen,
  onClose,
  entryToEdit,
  entries,
  subjects,
  batches,
  rooms,
  faculty,
  availabilities,
  onSaveEntry
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [day, setDay] = useState<DayOfWeek>('Monday');
  const [timeSlotIndex, setTimeSlotIndex] = useState(0);
  const [sessionType, setSessionType] = useState<'lecture' | 'lab' | 'tutorial'>('lecture');
  const [conflicts, setConflicts] = useState<TimetableConflict[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form
  useEffect(() => {
    if (entryToEdit) {
      setSubjectId(entryToEdit.subjectId);
      setBatchId(entryToEdit.batchId);
      setFacultyId(entryToEdit.facultyId);
      setRoomId(entryToEdit.roomId);
      setDay(entryToEdit.day);
      const slotIdx = TIME_SLOTS.findIndex(
        (s) => s.start.substring(0, 5) === entryToEdit.startTime.substring(0, 5)
      );
      setTimeSlotIndex(slotIdx >= 0 ? slotIdx : 0);
      setSessionType(entryToEdit.sessionType);
    } else {
      // Defaults
      if (subjects.length > 0) {
        setSubjectId(subjects[0].id);
        setSessionType(subjects[0].isLab ? 'lab' : 'lecture');
        if (subjects[0].facultyId) setFacultyId(subjects[0].facultyId);
        if (subjects[0].batchId) setBatchId(subjects[0].batchId);
      }
      if (batches.length > 0 && !batchId) setBatchId(batches[0].id);
      if (faculty.length > 0 && !facultyId) setFacultyId(faculty[0].id);
      if (rooms.length > 0 && !roomId) setRoomId(rooms[0].id);
      setDay('Monday');
      setTimeSlotIndex(0);
    }
  }, [entryToEdit, isOpen, subjects, batches, rooms, faculty]);

  // Active subject and eligible faculty
  const currentSubject = subjects.find((s) => s.id === subjectId);
  const eligibleFacultyIds = currentSubject ? getSubjectFacultyIds(currentSubject) : [];

  // When subject changes, auto-select associated faculty, batch, and session type
  const handleSubjectChange = (id: string) => {
    setSubjectId(id);
    const sub = subjects.find((s) => s.id === id);
    if (sub) {
      const fids = getSubjectFacultyIds(sub);
      if (fids.length > 0 && !fids.includes(facultyId)) {
        setFacultyId(fids[0]);
      } else if (sub.facultyId && !fids.includes(facultyId)) {
        setFacultyId(sub.facultyId);
      }
      if (sub.batchId) setBatchId(sub.batchId);
      setSessionType(sub.isLab ? 'lab' : 'lecture');

      // Auto pick a lab room if lab
      if (sub.isLab) {
        const labRoom = rooms.find((r) => r.isLab);
        if (labRoom) setRoomId(labRoom.id);
      }
    }
  };

  // Run live constraint checking whenever parameters change
  useEffect(() => {
    if (!subjectId || !batchId || !facultyId || !roomId) return;

    const slot = TIME_SLOTS[timeSlotIndex] || TIME_SLOTS[0];
    const sub = subjects.find((s) => s.id === subjectId);
    const bat = batches.find((b) => b.id === batchId);
    const fac = faculty.find((f) => f.id === facultyId);
    const rom = rooms.find((r) => r.id === roomId);

    const tempEntry: TimetableEntry = {
      id: entryToEdit?.id || 'temp_id',
      subjectId,
      subjectName: sub?.name || '',
      batchId,
      batchName: bat?.name || '',
      facultyId,
      facultyName: fac?.name || '',
      roomId,
      roomName: rom?.name || '',
      day,
      startTime: slot.start,
      endTime: slot.end,
      sessionType
    };

    const detected = validateEntry(
      tempEntry,
      entries,
      faculty,
      batches,
      rooms,
      availabilities
    );
    setConflicts(detected);
  }, [subjectId, batchId, facultyId, roomId, day, timeSlotIndex, sessionType, entries]);

  if (!isOpen) return null;

  const hasBlockingErrors = conflicts.some((c) => c.severity === 'error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasBlockingErrors) return;

    const sub = subjects.find((s) => s.id === subjectId);
    const bat = batches.find((b) => b.id === batchId);
    const fac = faculty.find((f) => f.id === facultyId);
    const rom = rooms.find((r) => r.id === roomId);
    const slot = TIME_SLOTS[timeSlotIndex] || TIME_SLOTS[0];

    if (!sub || !bat || !fac || !rom) return;

    const entryToSave: TimetableEntry = {
      id: entryToEdit?.id || `entry_${Date.now()}`,
      subjectId,
      subjectName: sub.name,
      batchId,
      batchName: bat.name,
      facultyId,
      facultyName: fac.name,
      roomId,
      roomName: rom.name,
      day,
      startTime: slot.start,
      endTime: slot.end,
      sessionType
    };

    setIsSaving(true);
    try {
      await onSaveEntry(entryToSave);
      onClose();
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {entryToEdit ? 'Edit Timetable Session' : 'Schedule New Class Session'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Course Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} — {s.name} ({s.isLab ? 'Lab' : 'Lecture'})
                </option>
              ))}
            </select>
          </div>

          {/* Grid: Batch & Faculty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Batch *
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                required
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.studentCount} students)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Faculty Instructor *
                </label>
                {eligibleFacultyIds.length > 1 && (
                  <span className="text-[10px] text-blue-700 font-medium">
                    {eligibleFacultyIds.length} qualified
                  </span>
                )}
              </div>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                required
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                {faculty.map((f) => {
                  const isEligible = eligibleFacultyIds.includes(f.id);
                  return (
                    <option key={f.id} value={f.id}>
                      {isEligible ? '★ ' : ''}{f.name} ({f.department}){isEligible ? ' — Qualified' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Grid: Room & Session Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Classroom / Lab *
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.isLab ? 'Lab' : 'Classroom'}, Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Type *
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as any)}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                <option value="lecture">Standard Lecture</option>
                <option value="lab">Practical Laboratory</option>
                <option value="tutorial">Tutorial / Seminar</option>
              </select>
            </div>
          </div>

          {/* Day & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Day of Week *
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayOfWeek)}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Time Interval *
              </label>
              <select
                value={timeSlotIndex}
                onChange={(e) => setTimeSlotIndex(Number(e.target.value))}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs font-mono"
              >
                {TIME_SLOTS.map((s, idx) => (
                  <option key={s.label} value={idx}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Constraint Check Result */}
          <div className="pt-2">
            {conflicts.length > 0 ? (
              <div className="space-y-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
                  <span>Validation Invariants Violated ({conflicts.length}):</span>
                </div>
                <div className="space-y-1.5">
                  {conflicts.map((conf, i) => (
                    <div
                      key={i}
                      className={`text-[11px] p-2 rounded-lg flex items-start gap-2 ${
                        conf.severity === 'error'
                          ? 'bg-rose-100/70 border border-rose-300 text-rose-900'
                          : 'bg-amber-100/70 border border-amber-300 text-amber-900'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <span className="font-semibold">{conf.title}: </span>
                        {conf.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero conflicts detected. This slot satisfies all institutional constraints.</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={hasBlockingErrors || isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Validating & Saving...' : 'Save Timetable Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
