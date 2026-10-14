import { TimetableEntry, DayOfWeek } from '../types';

/**
 * Clean strings for safe CSV export
 */
function escapeCSV(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export timetable entries to formatted CSV spreadsheet
 */
export function exportTimetableToCSV(
  entries: TimetableEntry[],
  contextTitle: string = 'Master Timetable'
): void {
  const timestamp = new Date().toLocaleString();
  const sanitizedTitle = contextTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  const rows: string[] = [
    `"SYNCHRONIQ SMART TIMETABLE SYSTEM - OFFICIAL EXPORT"`,
    `"Schedule Context:","${contextTitle.replace(/"/g, '""')}"`,
    `"Export Timestamp:","${timestamp}"`,
    `"Total Sessions:","${entries.length}"`,
    '',
    [
      '"Day"',
      '"Start Time"',
      '"End Time"',
      '"Course Subject"',
      '"Session Type"',
      '"Faculty Instructor"',
      '"Classroom / Laboratory"',
      '"Student Cohort"'
    ].join(',')
  ];

  // Sort entries chronologically by weekday and startTime
  const dayOrder: Record<DayOfWeek, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5
  };

  const sorted = [...entries].sort((a, b) => {
    const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  sorted.forEach((e) => {
    rows.push(
      [
        escapeCSV(e.day),
        escapeCSV(e.startTime),
        escapeCSV(e.endTime),
        escapeCSV(e.subjectName),
        escapeCSV(e.sessionType === 'lab' ? 'Laboratory Practical' : 'Lecture'),
        escapeCSV(e.facultyName),
        escapeCSV(e.roomName),
        escapeCSV(e.batchName)
      ].join(',')
    );
  });

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SYNCHRONIQ_Schedule_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Helper to get the next date corresponding to a given weekday
 */
function getNextWeekdayDate(day: DayOfWeek): Date {
  const dayIndexMap: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  } as any;

  const targetDay = dayIndexMap[day] ?? 1;
  const now = new Date();
  const currentDay = now.getDay();
  let diff = targetDay - currentDay;
  if (diff <= 0) {
    diff += 7; // schedule for upcoming week
  }
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  return targetDate;
}

/**
 * Format Date to iCalendar compact datetime (YYYYMMDDTHHMMSS)
 */
function formatICSDate(date: Date, timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(date);
  d.setHours(hours || 9, minutes || 0, 0, 0);

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/**
 * Export timetable entries to standard iCalendar (.ics) format
 * Compatible with Google Calendar, Apple Calendar, Microsoft Outlook
 */
export function exportTimetableToICS(
  entries: TimetableEntry[],
  contextTitle: string = 'SYNCHRONIQ Timetable'
): void {
  const sanitizedTitle = contextTitle.replace(/[^a-zA-Z0-9_-]/g, '_');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SYNCHRONIQ//Academic Timetable Management System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:SYNCHRONIQ - ${contextTitle}`,
    'X-WR-TIMEZONE:UTC'
  ];

  const untilDate = new Date();
  untilDate.setMonth(untilDate.getMonth() + 4); // 4-month semester recurrence
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const untilStr = `${untilDate.getFullYear()}${pad(untilDate.getMonth() + 1)}${pad(untilDate.getDate())}T235959Z`;

  const icsDayMap: Record<DayOfWeek, string> = {
    Monday: 'MO',
    Tuesday: 'TU',
    Wednesday: 'WE',
    Thursday: 'TH',
    Friday: 'FR'
  };

  entries.forEach((entry) => {
    const nextDate = getNextWeekdayDate(entry.day);
    const dtStart = formatICSDate(nextDate, entry.startTime);
    const dtEnd = formatICSDate(nextDate, entry.endTime);
    const uid = `${entry.id}-${dtStart}@synchroniq.campus`;
    const byDay = icsDayMap[entry.day] || 'MO';

    const summary = `${entry.subjectName} (${entry.sessionType === 'lab' ? 'Lab' : 'Lecture'})`;
    const description = `Course: ${entry.subjectName}\\nInstructor: ${entry.facultyName}\\nCohort: ${entry.batchName}\\nFacility: ${entry.roomName}\\nSession Type: ${entry.sessionType.toUpperCase()}`;
    const location = entry.roomName;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatICSDate(new Date(), '00:00')}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay};UNTIL=${untilStr}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT15M',
      'ACTION:DISPLAY',
      `DESCRIPTION:Upcoming Class: ${summary}`,
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const icsContent = lines.join('\r\n');
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `SYNCHRONIQ_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Trigger browser print dialog for current view
 */
export function printTimetableWindow(): void {
  window.print();
}
