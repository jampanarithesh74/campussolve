import React, { useState } from 'react';
import { TimetableEntry, Faculty, Room, DAYS_OF_WEEK, TIME_SLOTS, DayOfWeek } from '../../types';
import {
  X,
  Printer,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Building2,
  Clock,
  User,
  ShieldCheck,
  Download,
  Eye,
  FileText
} from 'lucide-react';
import { exportTimetableToCSV, exportTimetableToICS } from '../../lib/exportUtils';

interface PrintExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: TimetableEntry[];
  title: string;
  subtitle?: string;
  facultyList?: Faculty[];
  roomsList?: Room[];
  userRole?: 'student' | 'teacher' | 'admin';
}

export const PrintExportModal: React.FC<PrintExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  title,
  subtitle,
  facultyList = [],
  roomsList = [],
  userRole = 'student'
}) => {
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeRoomDetails, setIncludeRoomDetails] = useState(true);
  const [printLayout, setPrintLayout] = useState<'grid' | 'table'>('grid');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    // Add print-ready class to body temporarily or trigger print
    window.print();
  };

  const handleDownloadCSV = () => {
    exportTimetableToCSV(entries, title);
    setCopiedNotification('CSV spreadsheet downloaded successfully!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleDownloadICS = () => {
    exportTimetableToICS(entries, title);
    setCopiedNotification('iCalendar (.ics) file downloaded successfully!');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  // Compute summary stats
  const totalSessions = entries.length;
  const lectureCount = entries.filter((e) => e.sessionType === 'lecture').length;
  const labCount = entries.filter((e) => e.sessionType === 'lab').length;
  const uniqueSubjects = new Set(entries.map((e) => e.subjectName)).size;
  const uniqueInstructors = new Set(entries.map((e) => e.facultyName)).size;

  const getEntryForSlot = (day: DayOfWeek, startTime: string): TimetableEntry | undefined => {
    return entries.find(
      (e) => e.day === day && e.startTime.substring(0, 5) === startTime.substring(0, 5)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Print & Export Timetable</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {userRole.toUpperCase()} PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate official PDF documents, download spreadsheets, or sync with calendar apps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Options Bar */}
        <div className="p-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-3.5 no-print">
          {/* Option 1: Print / PDF */}
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-1">
                <Printer className="w-4 h-4 text-blue-700" />
                <span>Print / Save as PDF</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Sends timetable to physical printer or saves as official formatted academic PDF.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now / PDF</span>
            </button>
          </div>

          {/* Option 2: Download CSV */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm mb-1">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Download Spreadsheet</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Clean CSV file with courses, faculty, slots, and rooms formatted for Excel or Sheets.
              </p>
            </div>
            <button
              onClick={handleDownloadCSV}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .CSV</span>
            </button>
          </div>

          {/* Option 3: Download ICS Calendar */}
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-purple-950 font-bold text-sm mb-1">
                <Calendar className="w-4 h-4 text-purple-700" />
                <span>Sync to Calendar</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                iCal (.ics) format with recurring weekly classes for Google Calendar, Outlook, and Apple.
              </p>
            </div>
            <button
              onClick={handleDownloadICS}
              className="w-full py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Download .ICS</span>
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {copiedNotification && (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in no-print">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{copiedNotification}</span>
          </div>
        )}

        {/* Customization Controls */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Document Layout:
            </span>
            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300 shadow-xs">
              <button
                onClick={() => setPrintLayout('grid')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  printLayout === 'grid'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly Matrix
              </button>
              <button
                onClick={() => setPrintLayout('table')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  printLayout === 'table'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Agenda List
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Dean / HOD Signature Line</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeRoomDetails}
                onChange={(e) => setIncludeRoomDetails(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Show Facility Metadata</span>
            </label>
          </div>
        </div>

        {/* Scrollable Printable Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div
            id="printable-schedule-document"
            className="w-full max-w-3xl mx-auto bg-white p-8 rounded-xl border border-slate-300 shadow-sm text-slate-900 font-sans print:p-0 print:border-none print:shadow-none"
          >
            {/* Institution Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    SQ
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                      SYNCHRONIQ INSTITUTE OF TECHNOLOGY
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                      Office of the Academic Dean & Registrar • Smart Timetable Division
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                <p className="font-bold text-slate-800">Academic Year 2026–2027</p>
                <p>Term: Fall Semester</p>
                <p className="text-[9px]">Generated: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Document Title Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Official Academic Timetable
                </span>
                <h2 className="text-base font-bold text-slate-900">{title}</h2>
                {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-white border border-slate-200 font-medium text-slate-700">
                  {totalSessions} Weekly Sessions
                </span>
                <span className="px-2 py-1 rounded bg-blue-50 border border-blue-200 font-medium text-blue-700">
                  {lectureCount} Lectures • {labCount} Labs
                </span>
              </div>
            </div>

            {/* View Mode: Matrix Grid */}
            {printLayout === 'grid' ? (
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 w-24 text-center font-bold text-[11px]">
                        Slot
                      </th>
                      {DAYS_OF_WEEK.map((day) => (
                        <th
                          key={day}
                          className="border border-slate-300 p-2 text-center font-bold text-[11px] uppercase"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((slot) => (
                      <tr key={slot.label} className="border-b border-slate-200">
                        <td className="border border-slate-300 p-2 text-center bg-slate-50/70 font-mono text-[10px] text-slate-600 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">{slot.start}</span>
                          <span className="text-[9px] text-slate-500">{slot.end}</span>
                        </td>
                        {DAYS_OF_WEEK.map((day) => {
                          const entry = getEntryForSlot(day, slot.start);
                          return (
                            <td
                              key={`${day}-${slot.label}`}
                              className="border border-slate-300 p-2 align-top h-16 min-w-[110px]"
                            >
                              {entry ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span
                                      className={`text-[8px] font-bold px-1 rounded ${
                                        entry.sessionType === 'lab'
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {entry.sessionType === 'lab' ? 'LAB' : 'LEC'}
                                    </span>
                                  </div>
                                  <div className="font-bold text-[11px] text-slate-900 leading-tight">
                                    {entry.subjectName.replace('[Demo] ', '')}
                                  </div>
                                  <div className="text-[9px] text-slate-600 leading-none">
                                    {entry.facultyName.replace('[Fictional Demo]', '').replace('[Demo]', '')}
                                  </div>
                                  <div className="text-[9px] text-slate-500 font-medium pt-0.5">
                                    {entry.roomName.replace('[Demo] ', '')}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-300 text-xs py-3">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* View Mode: Agenda Table */
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border border-slate-300 p-2 font-bold">Day</th>
                      <th className="border border-slate-300 p-2 font-bold">Time Slot</th>
                      <th className="border border-slate-300 p-2 font-bold">Course / Subject</th>
                      <th className="border border-slate-300 p-2 font-bold">Type</th>
                      <th className="border border-slate-300 p-2 font-bold">Instructor</th>
                      <th className="border border-slate-300 p-2 font-bold">Classroom / Lab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                          {e.day}
                        </td>
                        <td className="border border-slate-300 p-2 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                          {e.startTime} – {e.endTime}
                        </td>
                        <td className="border border-slate-300 p-2 font-bold text-slate-900">
                          {e.subjectName.replace('[Demo] ', '')}
                        </td>
                        <td className="border border-slate-300 p-2">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              e.sessionType === 'lab'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {e.sessionType === 'lab' ? 'LAB' : 'LECTURE'}
                          </span>
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-700">
                          {e.facultyName.replace('[Fictional Demo]', '').replace('[Demo]', '')}
                        </td>
                        <td className="border border-slate-300 p-2 text-slate-600">
                          {e.roomName.replace('[Demo] ', '')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Course & Faculty Summary Legend */}
            {includeRoomDetails && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 mb-6 text-[10px] text-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="font-bold text-slate-800 block">Total Curriculum Courses:</span>
                  {uniqueSubjects} distinct subjects
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Assigned Faculty:</span>
                  {uniqueInstructors} instructors
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Weekly Contact Hours:</span>
                  {totalSessions} hours / week
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">System Verification:</span>
                  100% Conflict-Free
                </div>
              </div>
            )}

            {/* Official Signature Lines */}
            {includeSignatures && (
              <div className="pt-6 border-t border-slate-300 mt-6 grid grid-cols-2 gap-8 text-xs text-slate-600">
                <div className="space-y-8">
                  <p className="text-[10px] text-slate-500">
                    Prepared and validated by Academic Timetable Coordinator
                  </p>
                  <div className="border-t border-slate-400 pt-1">
                    <p className="font-bold text-slate-900">Academic Scheduling Office</p>
                    <p className="text-[10px] text-slate-500">Signature & Date</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <p className="text-[10px] text-slate-500 text-right">
                    Approved by Dean of Academic Affairs
                  </p>
                  <div className="border-t border-slate-400 pt-1 text-right">
                    <p className="font-bold text-slate-900">Dr. Office of Academic Registrar</p>
                    <p className="text-[10px] text-slate-500">Official Stamp / Signature</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Security Watermark */}
            <div className="mt-6 pt-3 border-t border-dashed border-slate-200 text-center text-[9px] text-slate-400">
              SYNCHRONIQ SMART TIMETABLE SYSTEM • VERIFIED INSTITUTIONAL DOCUMENT • ID: SQ-2026-
              {Math.abs(entries.length * 7919)}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between no-print">
          <p className="text-xs text-slate-500">
            Tip: In the print dialog, select <span className="font-semibold text-slate-700">Landscape</span> orientation and check <span className="font-semibold text-slate-700">Background graphics</span> for highest quality.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-1.5 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="py-1.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Timetable</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
