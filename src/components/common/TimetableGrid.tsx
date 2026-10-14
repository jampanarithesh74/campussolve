import React from 'react';
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  DayOfWeek,
  TimetableEntry,
  Faculty
} from '../../types';
import { Clock, MapPin, User, Beaker, BookOpen, Trash2, Edit2 } from 'lucide-react';

interface TimetableGridProps {
  entries: TimetableEntry[];
  facultyList?: Faculty[];
  onEditEntry?: (entry: TimetableEntry) => void;
  onDeleteEntry?: (id: string) => void;
  isAdmin?: boolean;
  highlightFacultyId?: string;
  highlightBatchId?: string;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  entries,
  facultyList = [],
  onEditEntry,
  onDeleteEntry,
  isAdmin = false,
  highlightFacultyId,
  highlightBatchId
}) => {
  // Map entries by day and time slot
  const getEntryForSlot = (day: DayOfWeek, startTime: string): TimetableEntry | undefined => {
    return entries.find(
      (e) => e.day === day && e.startTime.substring(0, 5) === startTime.substring(0, 5)
    );
  };

  const getFacultyColor = (facultyId: string): string => {
    const f = facultyList.find((item) => item.id === facultyId);
    return f?.color || '#2563eb';
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[840px] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {/* Official Header for Direct Page Print */}
        <div className="hidden print:block p-4 border-b border-slate-300 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                SYNCHRONIQ Academic Management System • Official Timetable
              </h2>
              <p className="text-[10px] text-slate-600">
                Weekly Academic Schedule ({entries.length} Sessions)
              </p>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <p>Generated: {new Date().toLocaleDateString()}</p>
              <p className="font-semibold text-slate-800">Academic Year 2026–2027</p>
            </div>
          </div>
        </div>

        {/* Table Header: Days of the week */}
        <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
          <div className="p-3 text-center border-r border-slate-200 uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Time Slot</span>
          </div>
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day}
              className="p-3 text-center border-r border-slate-200 last:border-r-0 uppercase tracking-wider font-bold text-slate-800"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Table Body: Slots x Days */}
        <div className="divide-y divide-slate-200">
          {TIME_SLOTS.map((slot) => (
            <div key={slot.label} className="grid grid-cols-6 min-h-[110px]">
              {/* Time Label Column */}
              <div className="p-3 border-r border-slate-200 bg-slate-50/60 flex flex-col justify-center items-center text-center">
                <span className="text-xs font-bold text-slate-800">{slot.start}</span>
                <span className="text-[10px] text-slate-400 font-medium">to</span>
                <span className="text-xs font-medium text-slate-600">{slot.end}</span>
              </div>

              {/* Day Columns */}
              {DAYS_OF_WEEK.map((day) => {
                const entry = getEntryForSlot(day, slot.start);
                const facultyColor = entry ? getFacultyColor(entry.facultyId) : '#2563eb';
                const isHighlighted =
                  entry &&
                  ((highlightFacultyId && entry.facultyId === highlightFacultyId) ||
                    (highlightBatchId && entry.batchId === highlightBatchId));

                return (
                  <div
                    key={`${day}-${slot.label}`}
                    className={`p-2 border-r border-slate-200 last:border-r-0 flex flex-col justify-center transition-colors relative ${
                      isHighlighted ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {entry ? (
                      <div
                        className="group relative rounded-lg p-2.5 transition-all text-left flex flex-col justify-between h-full bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm"
                        style={{ borderLeftColor: facultyColor, borderLeftWidth: '3px' }}
                      >
                        {/* Top: Session Type + Actions */}
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              entry.sessionType === 'lab'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {entry.sessionType === 'lab' ? (
                              <>
                                <Beaker className="w-2.5 h-2.5" /> LAB
                              </>
                            ) : (
                              <>
                                <BookOpen className="w-2.5 h-2.5" /> LEC
                              </>
                            )}
                          </span>

                          {isAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 print:hidden">
                              {onEditEntry && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEntry(entry);
                                  }}
                                  title="Edit entry"
                                  className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                              {onDeleteEntry && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteEntry(entry.id);
                                  }}
                                  title="Delete entry"
                                  className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 cursor-pointer shadow-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Subject Title */}
                        <div className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight mb-1.5">
                          {entry.subjectName}
                        </div>

                        {/* Meta details */}
                        <div className="space-y-1 text-[11px] text-slate-600 mt-auto">
                          <div className="flex items-center gap-1 truncate text-slate-700 font-medium">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{entry.facultyName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="flex items-center gap-1 text-slate-500 truncate">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{entry.roomName}</span>
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 shrink-0 font-medium">
                              {entry.batchName.replace('[Demo] ', '').replace('Computer Science - Year 3 ', '')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[11px] text-slate-300 font-mono">
                        —
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
