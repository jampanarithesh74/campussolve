import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableConflict,
  TimetableEntry,
  ValidationReport,
  ScheduleGenerationResult,
  DAYS_OF_WEEK,
  TIME_SLOTS,
  DayOfWeek,
  getSubjectFacultyIds
} from '../types';

/**
 * Convert time string "HH:mm" to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Check if two time intervals on the same day overlap
 */
export function isOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Format slot label
 */
export function getSlotLabel(start: string, end: string): string {
  return `${start} - ${end}`;
}

/**
 * Validate a proposed or updated entry against all institutional constraints
 */
export function validateEntry(
  entry: TimetableEntry,
  allEntries: TimetableEntry[],
  facultyList: Faculty[],
  batchList: Batch[],
  roomList: Room[],
  availabilityList: FacultyAvailability[]
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];

  // Exclude current entry if updating
  const otherEntries = allEntries.filter((e) => e.id !== entry.id);

  const faculty = facultyList.find((f) => f.id === entry.facultyId);
  const batch = batchList.find((b) => b.id === entry.batchId);
  const room = roomList.find((r) => r.id === entry.roomId);

  // 1. Faculty Double-Booking Check
  const facultyCollisions = otherEntries.filter(
    (e) =>
      e.facultyId === entry.facultyId &&
      e.day === entry.day &&
      isOverlapping(entry.startTime, entry.endTime, e.startTime, e.endTime)
  );

  if (facultyCollisions.length > 0) {
    const fNames = facultyCollisions.map((c) => `"${c.subjectName}" (${c.batchName} in ${c.roomName})`).join(', ');
    conflicts.push({
      type: 'FACULTY_DOUBLE_BOOKED',
      severity: 'error',
      title: 'Faculty Conflict (Double-Booking)',
      description: `Faculty member ${faculty?.name || entry.facultyName} is already teaching ${fNames} at ${entry.day} ${entry.startTime}-${entry.endTime}.`,
      conflictingEntries: facultyCollisions,
      affectedEntityId: entry.facultyId
    });
  }

  // 2. Batch Double-Booking Check
  const batchCollisions = otherEntries.filter(
    (e) =>
      e.batchId === entry.batchId &&
      e.day === entry.day &&
      isOverlapping(entry.startTime, entry.endTime, e.startTime, e.endTime)
  );

  if (batchCollisions.length > 0) {
    const bDetails = batchCollisions.map((c) => `"${c.subjectName}" with ${c.facultyName}`).join(', ');
    conflicts.push({
      type: 'BATCH_DOUBLE_BOOKED',
      severity: 'error',
      title: 'Batch Conflict (Double-Booking)',
      description: `Batch ${batch?.name || entry.batchName} already has another session scheduled (${bDetails}) at ${entry.day} ${entry.startTime}-${entry.endTime}.`,
      conflictingEntries: batchCollisions,
      affectedEntityId: entry.batchId
    });
  }

  // 3. Room Double-Booking Check
  const roomCollisions = otherEntries.filter(
    (e) =>
      e.roomId === entry.roomId &&
      e.day === entry.day &&
      isOverlapping(entry.startTime, entry.endTime, e.startTime, e.endTime)
  );

  if (roomCollisions.length > 0) {
    const rDetails = roomCollisions.map((c) => `"${c.subjectName}" (${c.batchName})`).join(', ');
    conflicts.push({
      type: 'ROOM_DOUBLE_BOOKED',
      severity: 'error',
      title: 'Room Conflict (Double-Booking)',
      description: `Room ${room?.name || entry.roomName} is already occupied by ${rDetails} at ${entry.day} ${entry.startTime}-${entry.endTime}.`,
      conflictingEntries: roomCollisions,
      affectedEntityId: entry.roomId
    });
  }

  // 4. Room Capacity Constraint
  if (room && batch) {
    if (batch.studentCount > room.capacity) {
      conflicts.push({
        type: 'ROOM_CAPACITY_EXCEEDED',
        severity: 'error',
        title: 'Room Capacity Exceeded',
        description: `Room "${room.name}" capacity (${room.capacity} seats) is insufficient for batch "${batch.name}" (${batch.studentCount} students). Deficit: ${batch.studentCount - room.capacity} seats.`,
        affectedEntityId: room.id
      });
    }
  }

  // 5. Laboratory Equipment Requirement
  if (entry.sessionType === 'lab') {
    if (room && !room.isLab) {
      conflicts.push({
        type: 'LAB_REQUIREMENT_UNMET',
        severity: 'error',
        title: 'Laboratory Facility Required',
        description: `Session "${entry.subjectName}" is classified as a Laboratory practical, but "${room.name}" is designated as a standard classroom without lab apparatus.`,
        affectedEntityId: room.id
      });
    }
  }

  // 6. Faculty Availability Check
  const entrySlotLabel = getSlotLabel(entry.startTime, entry.endTime);
  const facultyDayAvail = availabilityList.find(
    (a) => a.facultyId === entry.facultyId && a.day === entry.day
  );

  if (facultyDayAvail) {
    // If marked unavailable or not in availableSlots when availableSlots is specified
    const isExplicitlyUnavailable = facultyDayAvail.unavailableSlots?.includes(entrySlotLabel);
    const hasAvailableList = facultyDayAvail.availableSlots && facultyDayAvail.availableSlots.length > 0;
    const isNotInAvailableList = hasAvailableList && !facultyDayAvail.availableSlots.includes(entrySlotLabel);

    if (isExplicitlyUnavailable || isNotInAvailableList) {
      conflicts.push({
        type: 'FACULTY_UNAVAILABLE',
        severity: 'warning',
        title: 'Faculty Unavailability Notice',
        description: `Faculty ${faculty?.name || entry.facultyName} has marked ${entry.day} slot ${entrySlotLabel} as unavailable or outside their preferred teaching hours.`,
        affectedEntityId: entry.facultyId
      });
    }
  }

  return conflicts;
}

/**
 * Validate the entire timetable dataset
 */
export function validateFullSchedule(
  entries: TimetableEntry[],
  facultyList: Faculty[],
  batchList: Batch[],
  roomList: Room[],
  availabilityList: FacultyAvailability[]
): ValidationReport {
  const allConflicts: TimetableConflict[] = [];

  for (let i = 0; i < entries.length; i++) {
    const current = entries[i];
    const itemConflicts = validateEntry(current, entries, facultyList, batchList, roomList, availabilityList);
    for (const conf of itemConflicts) {
      // Avoid duplicate pairs for symmetric double bookings
      const alreadyReported = allConflicts.some(
        (c) =>
          c.type === conf.type &&
          c.affectedEntityId === conf.affectedEntityId &&
          c.description === conf.description
      );
      if (!alreadyReported) {
        allConflicts.push(conf);
      }
    }
  }

  return {
    isValid: allConflicts.filter((c) => c.severity === 'error').length === 0,
    conflicts: allConflicts
  };
}

/**
 * Automated Rule-Based Scheduling Engine
 * Generates conflict-free timetable entries using prioritized constraint satisfaction
 */
export function generateAutomatedSchedule(
  subjects: Subject[],
  batches: Batch[],
  rooms: Room[],
  faculty: Faculty[],
  availabilities: FacultyAvailability[],
  timeSlots: typeof TIME_SLOTS = TIME_SLOTS,
  days: DayOfWeek[] = DAYS_OF_WEEK
): ScheduleGenerationResult {
  const logs: string[] = [];
  logs.push(`[Scheduler] Initializing automated rule-based constraint engine.`);
  logs.push(`[Scheduler] Scope: ${subjects.length} subjects, ${batches.length} batches, ${rooms.length} rooms, ${faculty.length} faculty.`);

  const scheduledEntries: TimetableEntry[] = [];
  const unallocatedSubjects: { subject: Subject; reason: string }[] = [];

  let totalSlotsNeeded = 0;
  for (const sub of subjects) {
    totalSlotsNeeded += sub.weeklyLectures;
  }

  // Pre-sort subjects: Labs first (most constrained room requirements), then higher weekly sessions
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.isLab !== b.isLab) return a.isLab ? -1 : 1;
    return b.weeklyLectures - a.weeklyLectures;
  });

  // Track daily count per subject to prevent scheduling 3 times on the same day
  const subjectDayCount: Record<string, Record<string, number>> = {};
  for (const s of sortedSubjects) {
    subjectDayCount[s.id] = {};
    for (const d of days) {
      subjectDayCount[s.id][d] = 0;
    }
  }

  for (const subject of sortedSubjects) {
    const batch = batches.find((b) => b.id === subject.batchId);
    const eligibleFacultyIds = getSubjectFacultyIds(subject);
    const eligibleFaculty = faculty.filter((f) => eligibleFacultyIds.includes(f.id));

    if (!batch) {
      unallocatedSubjects.push({
        subject,
        reason: `Target batch (ID: ${subject.batchId}) not found in database.`
      });
      logs.push(`[Error] Subject "${subject.name}" failed: Target batch not found.`);
      continue;
    }

    if (eligibleFaculty.length === 0) {
      unallocatedSubjects.push({
        subject,
        reason: `Assigned faculty (ID: ${eligibleFacultyIds.join(', ') || 'none'}) not found in database.`
      });
      logs.push(`[Error] Subject "${subject.name}" failed: No eligible faculty available.`);
      continue;
    }

    // Filter compatible rooms by capacity and lab requirements
    const compatibleRooms = rooms.filter((room) => {
      // Must hold batch capacity
      if (room.capacity < batch.studentCount) return false;
      // If lab subject, room MUST be a lab
      if (subject.isLab && !room.isLab) return false;
      return true;
    });

    if (compatibleRooms.length === 0) {
      const reason = subject.isLab
        ? `No lab room available with capacity >= ${batch.studentCount} students.`
        : `No classroom available with capacity >= ${batch.studentCount} students.`;
      unallocatedSubjects.push({ subject, reason });
      logs.push(`[Constraint] Subject "${subject.name}" unallocated: ${reason}`);
      continue;
    }

    // Sort rooms: non-lab subjects should prefer non-lab rooms to preserve lab capacity
    compatibleRooms.sort((a, b) => {
      if (!subject.isLab) {
        if (a.isLab && !b.isLab) return 1;
        if (!a.isLab && b.isLab) return -1;
      }
      return a.capacity - b.capacity; // tightest fit first
    });

    let scheduledForThisSubject = 0;
    const requiredSessions = subject.weeklyLectures;

    // Outer loop over required sessions
    for (let sessionIndex = 0; sessionIndex < requiredSessions; sessionIndex++) {
      let allocatedThisSession = false;

      // Try each day, prioritizing days with fewer sessions for this subject
      const daysSorted = [...days].sort((d1, d2) => {
        return (subjectDayCount[subject.id][d1] || 0) - (subjectDayCount[subject.id][d2] || 0);
      });

      for (const day of daysSorted) {
        if (allocatedThisSession) break;

        // Limit regular lectures to max 1 per day per subject if possible (or max 2 for labs)
        const maxPerDay = subject.isLab ? 2 : 1;
        if ((subjectDayCount[subject.id][day] || 0) >= maxPerDay) {
          continue;
        }

        // Try time slots
        for (const slot of timeSlots) {
          if (allocatedThisSession) break;

          const slotLabel = slot.label;

          // Check if batch already booked in another class in this slot
          const batchBusy = scheduledEntries.some(
            (e) =>
              e.batchId === batch.id &&
              e.day === day &&
              isOverlapping(slot.start, slot.end, e.startTime, e.endTime)
          );
          if (batchBusy) continue;

          // Sort eligible faculty candidates by current teaching assignments to distribute workload evenly
          const facultyCandidates = [...eligibleFaculty].sort((f1, f2) => {
            const count1 = scheduledEntries.filter((e) => e.facultyId === f1.id).length;
            const count2 = scheduledEntries.filter((e) => e.facultyId === f2.id).length;
            return count1 - count2;
          });

          for (const facultyMember of facultyCandidates) {
            if (allocatedThisSession) break;

            // Check faculty availability
            const facultyDayAvail = availabilities.find(
              (a) => a.facultyId === facultyMember.id && a.day === day
            );
            if (facultyDayAvail) {
              if (facultyDayAvail.unavailableSlots?.includes(slotLabel)) {
                continue; // skip slot marked unavailable
              }
              if (
                facultyDayAvail.availableSlots &&
                facultyDayAvail.availableSlots.length > 0 &&
                !facultyDayAvail.availableSlots.includes(slotLabel)
              ) {
                continue;
              }
            }

            // Check if faculty already booked in another class in this slot
            const facultyBusy = scheduledEntries.some(
              (e) =>
                e.facultyId === facultyMember.id &&
                e.day === day &&
                isOverlapping(slot.start, slot.end, e.startTime, e.endTime)
            );
            if (facultyBusy) continue;

            // Find an unoccupied compatible room
            for (const room of compatibleRooms) {
              const roomBusy = scheduledEntries.some(
                (e) =>
                  e.roomId === room.id &&
                  e.day === day &&
                  isOverlapping(slot.start, slot.end, e.startTime, e.endTime)
              );
              if (roomBusy) continue;

              // Found valid slot, eligible faculty member, and room!
              const newEntry: TimetableEntry = {
                id: `sched_${subject.id}_${day}_${slot.start.replace(':', '')}`,
                subjectId: subject.id,
                subjectName: subject.name,
                batchId: batch.id,
                batchName: batch.name,
                facultyId: facultyMember.id,
                facultyName: facultyMember.name,
                roomId: room.id,
                roomName: room.name,
                day,
                startTime: slot.start,
                endTime: slot.end,
                sessionType: subject.isLab ? 'lab' : 'lecture',
                createdAt: new Date().toISOString()
              };

              scheduledEntries.push(newEntry);
              subjectDayCount[subject.id][day] = (subjectDayCount[subject.id][day] || 0) + 1;
              scheduledForThisSubject++;
              allocatedThisSession = true;
              logs.push(
                `[Allocated] ${subject.name} (${subject.isLab ? 'Lab' : 'Lec'}) -> ${day} ${slot.start}-${slot.end} in ${room.name} (${facultyMember.name})`
              );
              break;
            }
          }
        }
      }

      if (!allocatedThisSession) {
        logs.push(
          `[Warning] Could not schedule session ${sessionIndex + 1}/${requiredSessions} for "${subject.name}" due to slot/room contention.`
        );
      }
    }

    if (scheduledForThisSubject < requiredSessions) {
      unallocatedSubjects.push({
        subject,
        reason: `Only scheduled ${scheduledForThisSubject}/${requiredSessions} sessions due to timetable congestion or room capacity constraints.`
      });
    }
  }

  const success = unallocatedSubjects.length === 0 && scheduledEntries.length === totalSlotsNeeded;
  logs.push(
    `[Scheduler Completed] Result: ${scheduledEntries.length}/${totalSlotsNeeded} sessions assigned. Status: ${
      success ? 'Optimal & Conflict-Free' : 'Partial (Review Unallocated)'
    }`
  );

  return {
    success,
    scheduledEntries,
    unallocatedSubjects,
    totalSlotsNeeded,
    totalSlotsScheduled: scheduledEntries.length,
    logs
  };
}
