import React, { useState, useEffect } from 'react';
import { Faculty, Batch, Subject, Room, getSubjectFacultyIds } from '../../types';
import { X, Save } from 'lucide-react';

/* =========================================================================
   FACULTY MODAL
   ========================================================================= */
interface FacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
  facultyToEdit?: Faculty | null;
  onSave: (faculty: Faculty) => Promise<void>;
}

export const FacultyModal: React.FC<FacultyModalProps> = ({
  isOpen,
  onClose,
  facultyToEdit,
  onSave
}) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Science & AI');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Professor');
  const [maxHoursPerWeek, setMaxHoursPerWeek] = useState(16);
  const [color, setColor] = useState('#2563eb');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (facultyToEdit) {
      setName(facultyToEdit.name);
      setDepartment(facultyToEdit.department);
      setEmail(facultyToEdit.email);
      setDesignation(facultyToEdit.designation);
      setMaxHoursPerWeek(facultyToEdit.maxHoursPerWeek);
      setColor(facultyToEdit.color || '#2563eb');
    } else {
      setName('');
      setDepartment('Computer Science & AI');
      setEmail('');
      setDesignation('Professor');
      setMaxHoursPerWeek(16);
      setColor('#2563eb');
    }
  }, [facultyToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: facultyToEdit?.id || `fac_${Date.now()}`,
        name,
        department,
        email,
        designation,
        maxHoursPerWeek: Number(maxHoursPerWeek),
        color
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {facultyToEdit ? 'Edit Faculty Record' : 'Add New Faculty Member'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Alan Turing"
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
            <input
              type="text"
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Hours/Week</label>
              <input
                type="number"
                min="2"
                max="40"
                value={maxHoursPerWeek}
                onChange={(e) => setMaxHoursPerWeek(Number(e.target.value))}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="turing@campus.edu"
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Timetable Tag Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-8 h-8 rounded-md border border-slate-300 bg-white cursor-pointer"
              />
              <span className="text-xs font-mono text-slate-600">{color}</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Faculty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   BATCH MODAL
   ========================================================================= */
interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchToEdit?: Batch | null;
  onSave: (batch: Batch) => Promise<void>;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  batchToEdit,
  onSave
}) => {
  const [name, setName] = useState('');
  const [year, setYear] = useState('Year 3');
  const [semester, setSemester] = useState('Semester 5');
  const [studentCount, setStudentCount] = useState(45);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (batchToEdit) {
      setName(batchToEdit.name);
      setYear(batchToEdit.year);
      setSemester(batchToEdit.semester);
      setStudentCount(batchToEdit.studentCount);
    } else {
      setName('');
      setYear('Year 3');
      setSemester('Semester 5');
      setStudentCount(45);
    }
  }, [batchToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: batchToEdit?.id || `batch_${Date.now()}`,
        name,
        year,
        semester,
        studentCount: Number(studentCount)
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {batchToEdit ? 'Edit Student Batch' : 'Create Student Batch'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science - Year 3 (Batch A)"
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Year 3"
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="Semester 5"
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Enrolled Student Count *</label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used by scheduler to guarantee classroom capacity constraints.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   SUBJECT MODAL
   ========================================================================= */
interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectToEdit?: Subject | null;
  batches: Batch[];
  faculty: Faculty[];
  onSave: (subject: Subject) => Promise<void>;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  subjectToEdit,
  batches,
  faculty,
  onSave
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState(4);
  const [weeklyLectures, setWeeklyLectures] = useState(3);
  const [isLab, setIsLab] = useState(false);
  const [batchId, setBatchId] = useState('');
  const [facultyIds, setFacultyIds] = useState<string[]>([]);
  const [facultyId, setFacultyId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subjectToEdit) {
      setCode(subjectToEdit.code);
      setName(subjectToEdit.name);
      setCredits(subjectToEdit.credits);
      setWeeklyLectures(subjectToEdit.weeklyLectures);
      setIsLab(subjectToEdit.isLab);
      setBatchId(subjectToEdit.batchId);
      const fids = getSubjectFacultyIds(subjectToEdit);
      setFacultyIds(fids);
      setFacultyId(fids[0] || subjectToEdit.facultyId || faculty[0]?.id || '');
    } else {
      setCode('');
      setName('');
      setCredits(4);
      setWeeklyLectures(3);
      setIsLab(false);
      setBatchId(batches[0]?.id || '');
      const defaultFid = faculty[0]?.id || '';
      setFacultyIds(defaultFid ? [defaultFid] : []);
      setFacultyId(defaultFid);
    }
  }, [subjectToEdit, isOpen, batches, faculty]);

  const handleToggleFaculty = (id: string) => {
    setFacultyIds((prev) => {
      let updated: string[];
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // keep at least one
        updated = prev.filter((item) => item !== id);
      } else {
        updated = [...prev, id];
      }
      if (!updated.includes(facultyId) && updated.length > 0) {
        setFacultyId(updated[0]);
      }
      return updated;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: subjectToEdit?.id || `sub_${Date.now()}`,
        code,
        name,
        credits: Number(credits),
        weeklyLectures: Number(weeklyLectures),
        isLab,
        batchId,
        facultyId: facultyId || facultyIds[0] || '',
        facultyIds: facultyIds.length > 0 ? facultyIds : (facultyId ? [facultyId] : [])
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {subjectToEdit ? 'Edit Curriculum Subject' : 'Add Curriculum Subject'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CS301"
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Operating Systems"
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Credits</label>
              <input
                type="number"
                min="1"
                max="10"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Slots *</label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={weeklyLectures}
                onChange={(e) => setWeeklyLectures(Number(e.target.value))}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Batch *</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              required
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Qualified Faculty ({facultyIds.length} eligible) *
              </label>
              <span className="text-[10px] text-slate-500">Multiple faculty eligible</span>
            </div>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-300 p-1.5 space-y-1 bg-white shadow-xs">
              {faculty.map((f) => {
                const checked = facultyIds.includes(f.id);
                return (
                  <label
                    key={f.id}
                    className={`flex items-center justify-between p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                      checked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleFaculty(f.id)}
                        className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
                      />
                      <span>{f.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{f.department}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {facultyIds.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Course Coordinator
              </label>
              <select
                value={facultyId}
                onChange={(e) => setFacultyId(e.target.value)}
                className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
              >
                {faculty
                  .filter((f) => facultyIds.includes(f.id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLab}
                onChange={(e) => setIsLab(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-0"
              />
              <span className="text-xs text-slate-700 font-medium">
                Requires Specialized Laboratory Facility (isLab = true)
              </span>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================================
   ROOM MODAL
   ========================================================================= */
interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomToEdit?: Room | null;
  onSave: (room: Room) => Promise<void>;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  roomToEdit,
  onSave
}) => {
  const [name, setName] = useState('');
  const [building, setBuilding] = useState('Alan Turing Complex');
  const [capacity, setCapacity] = useState(60);
  const [isLab, setIsLab] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (roomToEdit) {
      setName(roomToEdit.name);
      setBuilding(roomToEdit.building);
      setCapacity(roomToEdit.capacity);
      setIsLab(roomToEdit.isLab);
    } else {
      setName('');
      setBuilding('Alan Turing Complex');
      setCapacity(60);
      setIsLab(false);
    }
  }, [roomToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        id: roomToEdit?.id || `room_${Date.now()}`,
        name,
        building,
        capacity: Number(capacity),
        isLab
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {roomToEdit ? 'Edit Campus Facility' : 'Add Campus Facility'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Room Designation *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Turing Lecture Hall 301"
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Building / Wing</label>
            <input
              type="text"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Seating Capacity *</label>
            <input
              type="number"
              min="1"
              max="1000"
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              className="w-full bg-white text-xs text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
            />
          </div>
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isLab}
                onChange={(e) => setIsLab(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-0"
              />
              <span className="text-xs text-slate-700 font-medium">
                Equipped as Laboratory (Computers / Apparatus)
              </span>
            </label>
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
