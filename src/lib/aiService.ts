import {
  Batch,
  Faculty,
  FacultyAvailability,
  Room,
  Subject,
  TimetableConflict,
  TimetableEntry,
  UserRole,
  DAYS_OF_WEEK,
  TIME_SLOTS,
  DayOfWeek
} from '../types';
import {
  AIIntent,
  AIMessage,
  AIProcessRequest,
  AIProcessResponse,
  StructuredAction,
  TimetableQualityScore
} from '../types/ai';
import {
  validateFullSchedule,
  validateEntry,
  generateAutomatedSchedule,
  isOverlapping
} from './scheduler';

/**
 * Calculate comprehensive timetable quality score and diagnostics
 */
export function calculateTimetableQuality(
  entries: TimetableEntry[],
  facultyList: Faculty[],
  batchList: Batch[],
  roomList: Room[],
  availabilityList: FacultyAvailability[]
): TimetableQualityScore {
  const report = validateFullSchedule(entries, facultyList, batchList, roomList, availabilityList);
  const errorConflicts = report.conflicts.filter((c) => c.severity === 'error');
  const warningConflicts = report.conflicts.filter((c) => c.severity === 'warning');

  const totalPossibleRoomSlots = roomList.length * DAYS_OF_WEEK.length * TIME_SLOTS.length;
  const roomUtilizationRate = totalPossibleRoomSlots > 0
    ? Math.min(100, Math.round((entries.length / totalPossibleRoomSlots) * 100))
    : 0;

  // Faculty workload balance
  const facultyLoads = facultyList.map((f) => {
    const assignedHours = entries.filter((e) => e.facultyId === f.id).length;
    const max = f.maxHoursPerWeek || 18;
    const ratio = assignedHours / max;
    return { faculty: f, assignedHours, max, ratio };
  });

  const overcommittedFaculty = facultyLoads.filter((l) => l.assignedHours > l.max);
  const facultyLoadBalanceScore = facultyLoads.length > 0
    ? Math.max(0, Math.round(100 - overcommittedFaculty.length * 15))
    : 100;

  // Student fatigue score (detect >3 consecutive classes in any batch on any day)
  let fatiguePenalties = 0;
  batchList.forEach((b) => {
    const batchEntries = entries.filter((e) => e.batchId === b.id);
    DAYS_OF_WEEK.forEach((day) => {
      const dayEntries = batchEntries
        .filter((e) => e.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      let consecutive = 0;
      for (let i = 0; i < dayEntries.length - 1; i++) {
        if (dayEntries[i].endTime === dayEntries[i + 1].startTime) {
          consecutive++;
          if (consecutive >= 3) {
            fatiguePenalties += 5;
          }
        } else {
          consecutive = 0;
        }
      }
    });
  });

  const studentFatigueScore = Math.max(0, Math.min(100, 100 - fatiguePenalties));

  // Overall Score Calculation (Hard constraints weigh 60%, soft constraints weigh 40%)
  const hardScore = errorConflicts.length === 0 ? 60 : Math.max(0, 60 - errorConflicts.length * 20);
  const softScore = Math.round(
    (facultyLoadBalanceScore * 0.15) +
    (studentFatigueScore * 0.15) +
    (Math.min(100, roomUtilizationRate * 2) * 0.10) -
    (warningConflicts.length * 2)
  );
  const overallScore = Math.max(0, Math.min(100, hardScore + softScore));

  const metrics = [
    {
      label: 'Hard Constraints',
      value: errorConflicts.length === 0 ? '100% Satisfied' : `${errorConflicts.length} Collisions`,
      status: (errorConflicts.length === 0 ? 'good' : 'alert') as 'good' | 'alert',
      detail: errorConflicts.length === 0
        ? 'No faculty, batch, or room double-bookings detected.'
        : `${errorConflicts.length} hard violations require immediate administrative resolution.`
    },
    {
      label: 'Faculty Availability',
      value: warningConflicts.length === 0 ? 'Optimal' : `${warningConflicts.length} Warnings`,
      status: (warningConflicts.length === 0 ? 'good' : 'warning') as 'good' | 'warning',
      detail: `${warningConflicts.length} sessions overlap with faculty unavailable slots.`
    },
    {
      label: 'Room Utilization',
      value: `${roomUtilizationRate}%`,
      status: (roomUtilizationRate >= 30 && roomUtilizationRate <= 85 ? 'good' : 'warning') as 'good' | 'warning',
      detail: `${entries.length} scheduled out of ${totalPossibleRoomSlots} available room-periods.`
    },
    {
      label: 'Student Cognitive Load',
      value: `${studentFatigueScore}/100`,
      status: (studentFatigueScore >= 80 ? 'good' : 'warning') as 'good' | 'warning',
      detail: fatiguePenalties === 0
        ? 'Balanced dispersion without excessive back-to-back lecture fatigue.'
        : 'Some cohorts have 3+ continuous hours without break periods.'
    }
  ];

  return {
    overallScore,
    hardConstraintsSatisfied: errorConflicts.length === 0,
    errorConflictCount: errorConflicts.length,
    warningConflictCount: warningConflicts.length,
    roomUtilizationRate,
    facultyLoadBalanceScore,
    studentFatigueScore,
    metrics
  };
}

/**
 * Find available rooms deterministically for a given day and time slot
 */
export function findFreeRooms(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  entries: TimetableEntry[],
  rooms: Room[],
  isLabRequired = false
): Room[] {
  return rooms.filter((r) => {
    if (isLabRequired && !r.isLab) return false;
    const isOccupied = entries.some(
      (e) =>
        e.roomId === r.id &&
        e.day === day &&
        isOverlapping(startTime, endTime, e.startTime, e.endTime)
    );
    return !isOccupied;
  });
}

/**
 * Find available faculty deterministically for a given day and time slot
 */
export function findFreeFaculty(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  entries: TimetableEntry[],
  facultyList: Faculty[],
  availabilityList: FacultyAvailability[]
): Faculty[] {
  const slotLabel = `${startTime} - ${endTime}`;
  return facultyList.filter((f) => {
    // 1. Not already teaching
    const isBusy = entries.some(
      (e) =>
        e.facultyId === f.id &&
        e.day === day &&
        isOverlapping(startTime, endTime, e.startTime, e.endTime)
    );
    if (isBusy) return false;

    // 2. Not marked unavailable
    const dayAvail = availabilityList.find((a) => a.facultyId === f.id && a.day === day);
    if (dayAvail && dayAvail.unavailableSlots?.includes(slotLabel)) {
      return false;
    }
    return true;
  });
}

/**
 * Rule-based heuristic intent classification
 */
export function classifyIntentLocally(message: string): AIIntent {
  const m = message.toLowerCase();

  if (m.includes('generate') || m.includes('auto-schedule') || m.includes('create schedule') || m.includes('build timetable')) {
    return 'GENERATE_TIMETABLE';
  }
  if (m.includes('conflict') || m.includes('clash') || m.includes('double book') || m.includes('overlap') || m.includes('issue')) {
    return 'EXPLAIN_CONFLICT';
  }
  if (m.includes('available room') || m.includes('free room') || m.includes('empty room') || m.includes('find room') || m.includes('vacant room')) {
    return 'FIND_AVAILABLE_ROOM';
  }
  if (m.includes('available faculty') || m.includes('free teacher') || m.includes('free faculty') || m.includes('find faculty') || m.includes('who is free')) {
    return 'FIND_AVAILABLE_FACULTY';
  }
  if (m.includes('workload') || m.includes('hours teaching') || m.includes('load balance') || m.includes('teaching hours')) {
    return 'SHOW_FACULTY_WORKLOAD';
  }
  if (m.includes('score') || m.includes('rating') || m.includes('quality') || m.includes('grade')) {
    return 'EXPLAIN_QUALITY_SCORE';
  }
  if (m.includes('analyze') || m.includes('analysis') || m.includes('health check') || m.includes('audit')) {
    return 'ANALYZE_TIMETABLE';
  }
  if (m.includes('optimize') || m.includes('improve') || m.includes('recommend') || m.includes('suggestion')) {
    return 'OPTIMIZE_TIMETABLE';
  }
  if (m.includes('free period') || m.includes('free time') || m.includes('break') || m.includes('leisure') || m.includes('when am i free')) {
    return 'SHOW_FREE_PERIODS';
  }
  if (m.includes('reschedule') || m.includes('move class') || m.includes('shift') || m.includes('postpone')) {
    return 'REQUEST_RESCHEDULE';
  }
  if (m.includes('change timetable') || m.includes('swap') || m.includes('edit session')) {
    return 'REQUEST_TIMETABLE_CHANGE';
  }
  if (m.includes('export') || m.includes('print') || m.includes('download') || m.includes('pdf') || m.includes('csv') || m.includes('ical')) {
    return 'EXPORT_TIMETABLE';
  }
  if (m.includes('publish') || m.includes('release') || m.includes('deploy timetable')) {
    return 'PUBLISH_TIMETABLE';
  }
  if (m.includes('candidate') || m.includes('compare') || m.includes('drafts')) {
    return 'COMPARE_CANDIDATES';
  }
  if (m.includes('schedule') || m.includes('timetable') || m.includes('class') || m.includes('lecture') || m.includes('when is')) {
    return 'SHOW_TIMETABLE';
  }
  return 'GENERAL_QUERY';
}

/**
 * Extract entities (day, slot, subject, faculty name, room) from natural query
 */
export function extractEntitiesLocally(
  message: string,
  days: DayOfWeek[],
  facultyList: Faculty[],
  rooms: Room[],
  batches: Batch[],
  subjects: Subject[]
): Record<string, any> {
  const m = message.toLowerCase();
  const entities: Record<string, any> = {};

  // Match Day
  for (const day of days) {
    if (m.includes(day.toLowerCase())) {
      entities.day = day;
      break;
    }
  }

  // Match Slot / Hour
  if (m.includes('9') || m.includes('09:00')) entities.timeSlot = '09:00 - 10:00';
  else if (m.includes('10') || m.includes('10:00')) entities.timeSlot = '10:00 - 11:00';
  else if (m.includes('11') || m.includes('11:15')) entities.timeSlot = '11:15 - 12:15';
  else if (m.includes('12') || m.includes('12:15')) entities.timeSlot = '12:15 - 13:15';
  else if (m.includes('2 pm') || m.includes('14:00')) entities.timeSlot = '14:00 - 15:00';
  else if (m.includes('3 pm') || m.includes('15:00')) entities.timeSlot = '15:00 - 16:00';
  else if (m.includes('4 pm') || m.includes('16:00')) entities.timeSlot = '16:00 - 17:00';

  // Match Faculty
  for (const f of facultyList) {
    const lastName = f.name.split(' ').pop()?.toLowerCase() || '';
    if (m.includes(f.name.toLowerCase()) || (lastName.length > 3 && m.includes(lastName))) {
      entities.faculty = f.name;
      entities.facultyId = f.id;
      break;
    }
  }

  // Match Room
  for (const r of rooms) {
    if (m.includes(r.name.toLowerCase())) {
      entities.room = r.name;
      entities.roomId = r.id;
      break;
    }
  }

  // Match Batch
  for (const b of batches) {
    const bShort = b.name.toLowerCase();
    if (m.includes(bShort) || (bShort.includes('alpha') && m.includes('alpha')) || (bShort.includes('beta') && m.includes('beta'))) {
      entities.batch = b.name;
      entities.batchId = b.id;
      break;
    }
  }

  // Match Subject
  for (const s of subjects) {
    if (m.includes(s.name.toLowerCase()) || m.includes(s.code.toLowerCase())) {
      entities.subject = s.name;
      entities.subjectId = s.id;
      break;
    }
  }

  return entities;
}

/**
 * Execute Intent locally against the deterministic state engine
 * Guarantees zero hallucinations and complete adherence to hard constraints!
 */
export function executeIntentLocally(
  intent: AIIntent,
  entities: Record<string, any>,
  userMessage: string,
  role: UserRole,
  userInfo: { id: string; email: string; displayName: string; batchId?: string; facultyId?: string },
  dataset: {
    entries: TimetableEntry[];
    faculty: Faculty[];
    batches: Batch[];
    rooms: Room[];
    subjects: Subject[];
    availabilities: FacultyAvailability[];
  }
): AIProcessResponse {
  const { entries, faculty, batches, rooms, subjects, availabilities } = dataset;
  const quality = calculateTimetableQuality(entries, faculty, batches, rooms, availabilities);

  // Security & RBAC Enforcement
  const adminOnlyIntents: AIIntent[] = [
    'GENERATE_TIMETABLE',
    'REQUEST_TIMETABLE_CHANGE',
    'REQUEST_RESCHEDULE',
    'PUBLISH_TIMETABLE',
    'COMPARE_CANDIDATES'
  ];

  if (role !== 'admin' && adminOnlyIntents.includes(intent)) {
    return {
      intent,
      entities,
      explanation: `🔒 **Administrative Access Required**\n\nYour account role is **${role.toUpperCase()}**. Modifying timetable allocations, rescheduling sessions, and generating schedules are restricted to Academic Administrators to maintain institutional integrity.\n\nYou can still query your timetable, view workload hours, check room availability, and search for class timings.`,
      recommendations: [
        'When is my next class?',
        'Show my schedule for today',
        'Check room availability'
      ]
    };
  }

  switch (intent) {
    case 'EXPLAIN_CONFLICT': {
      const report = validateFullSchedule(entries, faculty, batches, rooms, availabilities);
      if (report.isValid && report.conflicts.length === 0) {
        return {
          intent,
          entities,
          explanation: `✅ **Timetable is 100% Conflict-Free**\n\nThe deterministic constraint engine verified all **${entries.length} scheduled sessions** against:\n- Faculty double-booking\n- Student batch collisions\n- Room occupation conflicts\n- Room capacity limits\n- Laboratory equipment criteria\n- Faculty availability declarations\n\nZero hard errors or soft warnings were detected.`,
          qualityMetrics: quality,
          recommendations: ['Show timetable quality score', 'Analyze room utilization', 'View faculty workloads']
        };
      }

      const errorText = report.conflicts
        .map(
          (c, idx) =>
            `${idx + 1}. **[${c.severity.toUpperCase()}] ${c.title}**\n   ${c.description}`
        )
        .join('\n\n');

      return {
        intent,
        entities,
        explanation: `⚠️ **Detected ${report.conflicts.length} Constraint Violations:**\n\n${errorText}\n\n*Recommendation:* Use the Admin Conflict Resolution Map or Automated Scheduler to reconcile these overlapping slots.`,
        qualityMetrics: quality,
        recommendations: ['Find available rooms', 'Show faculty availability', 'Run automated scheduler']
      };
    }

    case 'FIND_AVAILABLE_ROOM':
    case 'CHECK_ROOM_AVAILABILITY': {
      const day: DayOfWeek = entities.day || 'Monday';
      const slot = entities.timeSlot || '10:00 - 11:00';
      const [start, end] = slot.split(' - ');
      const isLab = userMessage.toLowerCase().includes('lab');

      const freeRooms = findFreeRooms(day, start, end, entries, rooms, isLab);

      if (freeRooms.length === 0) {
        return {
          intent,
          entities: { ...entities, day, timeSlot: slot },
          explanation: `🏢 **No vacant ${isLab ? 'laboratories' : 'rooms'} found on ${day} during ${slot}.**\n\nAll ${rooms.filter((r) => !isLab || r.isLab).length} matching spaces are currently occupied by scheduled lectures.`,
          recommendations: ['Check another time slot', 'Check another day', 'Find available faculty']
        };
      }

      const roomList = freeRooms
        .map((r) => `- **${r.name}** (${r.isLab ? '🔬 Lab' : '📖 Classroom'}, ${r.capacity} seats, ${r.building})`)
        .join('\n');

      return {
        intent,
        entities: { ...entities, day, timeSlot: slot },
        explanation: `🏢 **Available ${isLab ? 'Laboratories' : 'Rooms'} on ${day} (${slot}):**\n\n${roomList}\n\n*Total Vacant:* **${freeRooms.length} / ${rooms.length}** facilities free.`,
        recommendations: [
          `Find available rooms on ${day} at 14:00 - 15:00`,
          'Check faculty availability',
          'Show timetable'
        ]
      };
    }

    case 'FIND_AVAILABLE_FACULTY':
    case 'CHECK_FACULTY_AVAILABILITY': {
      const day: DayOfWeek = entities.day || 'Monday';
      const slot = entities.timeSlot || '10:00 - 11:00';
      const [start, end] = slot.split(' - ');

      const freeFaculty = findFreeFaculty(day, start, end, entries, faculty, availabilities);

      if (freeFaculty.length === 0) {
        return {
          intent,
          entities: { ...entities, day, timeSlot: slot },
          explanation: `👨‍🏫 **All faculty members are currently booked or declared unavailable on ${day} (${slot}).**`,
          recommendations: ['Check afternoon slots', 'Check Tuesday faculty availability']
        };
      }

      const facultyListStr = freeFaculty
        .slice(0, 8)
        .map((f) => `- **${f.name}** (${f.department}) • Max ${f.maxHoursPerWeek} hrs/wk`)
        .join('\n');

      return {
        intent,
        entities: { ...entities, day, timeSlot: slot },
        explanation: `👨‍🏫 **Available Faculty on ${day} (${slot}):**\n\n${facultyListStr}\n\n*Total Free:* **${freeFaculty.length}** instructors ready for class assignment without conflict.`,
        recommendations: [
          'Find available rooms for this slot',
          'Show faculty workload breakdown',
          'Run automated scheduler'
        ]
      };
    }

    case 'SHOW_FACULTY_WORKLOAD': {
      if (role === 'teacher' && userInfo.facultyId) {
        const myFaculty = faculty.find((f) => f.id === userInfo.facultyId);
        const myEntries = entries.filter((e) => e.facultyId === userInfo.facultyId);
        const max = myFaculty?.maxHoursPerWeek || 18;
        const pct = Math.round((myEntries.length / max) * 100);

        const dayBreakdown = DAYS_OF_WEEK.map((d) => {
          const count = myEntries.filter((e) => e.day === d).length;
          return `- **${d}**: ${count} session${count === 1 ? '' : 's'}`;
        }).join('\n');

        return {
          intent,
          entities,
          explanation: `📊 **Your Personal Teaching Workload**\n\n- **Instructor:** ${myFaculty?.name || userInfo.displayName}\n- **Assigned Teaching Hours:** **${myEntries.length}** / ${max} hrs (${pct}% capacity)\n- **Department:** ${myFaculty?.department || 'Computer Science'}\n\n**Weekly Distribution:**\n${dayBreakdown}`,
          recommendations: ['When is my next class?', 'Show my free periods', 'Print my schedule']
        };
      }

      // Admin view of all faculty workloads
      const loadSummary = faculty
        .map((f) => {
          const count = entries.filter((e) => e.facultyId === f.id).length;
          const max = f.maxHoursPerWeek || 18;
          const status = count > max ? '🔴 Overloaded' : count < 8 ? '🟡 Underutilized' : '🟢 Balanced';
          return `- **${f.name}** (${f.department}): **${count}** / ${max} hrs — ${status}`;
        })
        .join('\n');

      return {
        intent,
        entities,
        explanation: `📊 **Institutional Faculty Workload Distribution:**\n\n${loadSummary}\n\n*Overall Load Balance Score:* **${quality.facultyLoadBalanceScore} / 100**.`,
        qualityMetrics: quality,
        recommendations: ['Explain quality score', 'Analyze room utilization', 'Run automated scheduler']
      };
    }

    case 'EXPLAIN_QUALITY_SCORE':
    case 'ANALYZE_TIMETABLE': {
      const breakdown = quality.metrics
        .map((m) => `- **${m.label}**: **${m.value}**\n  *${m.detail}*`)
        .join('\n');

      return {
        intent,
        entities,
        explanation: `🏆 **CampusSolve Timetable Quality Audit: ${quality.overallScore} / 100**\n\n${breakdown}\n\n**Overall Verdict:** ${
          quality.overallScore >= 90
            ? '🌟 **Excellent**: Timetable satisfies all institutional hard rules with optimal resource spreading and zero room collisions.'
            : quality.overallScore >= 75
            ? '👍 **Good**: Feasible and robust timetable with minor room congestion.'
            : '⚠️ **Needs Attention**: Review conflicts or unallocated periods to ensure curriculum completion.'
        }`,
        qualityMetrics: quality,
        recommendations: ['Explain conflicts', 'Show faculty workload', 'Find available rooms']
      };
    }

    case 'SHOW_FREE_PERIODS': {
      let targetDay: DayOfWeek = entities.day || 'Monday';
      let freeSlots: string[] = [];

      if (role === 'student') {
        const myBatchId = userInfo.batchId || 'batch_demo_alpha';
        const batchName = batches.find((b) => b.id === myBatchId)?.name || 'Your Batch';
        const dayEntries = entries.filter((e) => e.batchId === myBatchId && e.day === targetDay);

        freeSlots = TIME_SLOTS.filter(
          (ts) => !dayEntries.some((e) => isOverlapping(ts.start, ts.end, e.startTime, e.endTime))
        ).map((ts) => ts.label);

        return {
          intent,
          entities: { day: targetDay },
          explanation: `⏱️ **Free Periods for ${batchName} on ${targetDay}:**\n\n${
            freeSlots.length > 0
              ? freeSlots.map((s) => `- **${s}** (No class scheduled)`).join('\n')
              : 'You have a packed schedule with classes in all periods!'
          }`,
          recommendations: ['Show my timetable for today', 'When is my next lecture?', 'Print schedule']
        };
      }

      if (role === 'teacher') {
        const myFacultyId = userInfo.facultyId || 'fac_demo_vance';
        const dayEntries = entries.filter((e) => e.facultyId === myFacultyId && e.day === targetDay);

        freeSlots = TIME_SLOTS.filter(
          (ts) => !dayEntries.some((e) => isOverlapping(ts.start, ts.end, e.startTime, e.endTime))
        ).map((ts) => ts.label);

        return {
          intent,
          entities: { day: targetDay },
          explanation: `⏱️ **Free Teaching Periods on ${targetDay}:**\n\n${
            freeSlots.length > 0
              ? freeSlots.map((s) => `- **${s}** (Free for research/office hours)`).join('\n')
              : 'You are scheduled to teach during all class periods today.'
          }`,
          recommendations: ['Show my weekly workload', 'Print my schedule', 'Check student cohorts']
        };
      }

      return {
        intent,
        entities,
        explanation: `Please specify which faculty member or student cohort you want to view free periods for on ${targetDay}.`,
        recommendations: ['Show free periods for Batch Alpha', 'Show free periods for Dr. Vance']
      };
    }

    case 'SHOW_TIMETABLE': {
      if (role === 'student') {
        const myBatchId = userInfo.batchId || 'batch_demo_alpha';
        const myBatch = batches.find((b) => b.id === myBatchId);
        const myEntries = entries.filter((e) => e.batchId === myBatchId);

        const grouped = DAYS_OF_WEEK.map((d) => {
          const dayList = myEntries.filter((e) => e.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (dayList.length === 0) return `**${d}**: *No classes scheduled*`;
          const details = dayList
            .map((e) => `  - **${e.startTime}-${e.endTime}**: ${e.subjectName} in **${e.roomName}** (${e.facultyName})`)
            .join('\n');
          return `**${d}** (${dayList.length} classes):\n${details}`;
        }).join('\n\n');

        return {
          intent,
          entities,
          explanation: `📅 **Personal Timetable — ${myBatch?.name || 'Your Batch'}**\n\nTotal weekly sessions: **${myEntries.length}**\n\n${grouped}`,
          recommendations: ['Show free periods', 'When is my next lab?', 'Print timetable']
        };
      }

      if (role === 'teacher') {
        const myFacultyId = userInfo.facultyId || 'fac_demo_vance';
        const myFaculty = faculty.find((f) => f.id === myFacultyId);
        const myEntries = entries.filter((e) => e.facultyId === myFacultyId);

        const grouped = DAYS_OF_WEEK.map((d) => {
          const dayList = myEntries.filter((e) => e.day === d).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (dayList.length === 0) return `**${d}**: *No teaching sessions*`;
          const details = dayList
            .map((e) => `  - **${e.startTime}-${e.endTime}**: ${e.subjectName} for **${e.batchName}** in **${e.roomName}**`)
            .join('\n');
          return `**${d}** (${dayList.length} sessions):\n${details}`;
        }).join('\n\n');

        return {
          intent,
          entities,
          explanation: `📅 **Faculty Teaching Schedule — ${myFaculty?.name || userInfo.displayName}**\n\nTotal assigned sessions: **${myEntries.length}**\n\n${grouped}`,
          recommendations: ['Show my teaching workload', 'Show my free periods', 'Print schedule']
        };
      }

      // Admin
      const batchAlphaEntries = entries.filter((e) => e.batchId === 'batch_demo_alpha');
      return {
        intent,
        entities,
        explanation: `📅 **Campus Timetable Overview**\n\nCurrently managing **${entries.length} scheduled sessions** across **${batches.length} student cohorts** and **${faculty.length} faculty members**.\n\nFilter in the main grid or ask me about any specific batch, room, or instructor!`,
        recommendations: [
          'Show schedule for Batch Alpha',
          'Show schedule for Dr. Evelyn Vance',
          'Check conflicts in timetable'
        ]
      };
    }

    case 'GENERATE_TIMETABLE': {
      if (role !== 'admin') {
        return {
          intent,
          entities,
          explanation: '🔒 Timetable generation is restricted to administrators.',
          recommendations: ['Show my schedule']
        };
      }

      // Deterministic generation run
      const genResult = generateAutomatedSchedule(
        subjects,
        batches,
        rooms,
        faculty,
        availabilities
      );

      const action: StructuredAction = {
        id: `act_gen_${Date.now()}`,
        type: 'GENERATE_SCHEDULE',
        title: 'Run Automated Constraint Scheduler',
        summary: `Generate an automated timetable covering ${subjects.length} curriculum subjects across ${batches.length} batches.`,
        impact: `Will create ${genResult.scheduledEntries.length} conflict-free class allocations and replace current draft entries.`,
        requiresConfirmation: true,
        payload: {
          scheduledEntries: genResult.scheduledEntries,
          totalSlotsScheduled: genResult.totalSlotsScheduled,
          totalSlotsNeeded: genResult.totalSlotsNeeded
        }
      };

      return {
        intent,
        entities,
        explanation: `⚙️ **Automated Scheduler Diagnostic:**\n\nThe deterministic MRV backtracking engine evaluated **${subjects.length} subjects** and computed **${genResult.scheduledEntries.length} valid session slots** with **0 hard conflicts**.\n\n- Total Sessions Required: **${genResult.totalSlotsNeeded}**\n- Successfully Placed: **${genResult.totalSlotsScheduled}**\n- Status: ${genResult.success ? '✅ 100% Feasible' : '⚠️ Minor unallocated subjects due to constraints'}\n\nPlease review and confirm below to apply these generated entries to the master timetable.`,
        action,
        recommendations: ['Explain quality score', 'Analyze timetable', 'Show faculty workload']
      };
    }

    case 'EXPORT_TIMETABLE': {
      const action: StructuredAction = {
        id: `act_exp_${Date.now()}`,
        type: 'TRIGGER_EXPORT',
        title: 'Open Print & Export Dialog',
        summary: 'Download high-resolution PDF printout, CSV spreadsheet, or iCalendar (.ics) sync.',
        requiresConfirmation: false,
        payload: {}
      };

      return {
        intent,
        entities,
        explanation: `🖨️ **Print & Export Ready**\n\nYou can print the official institutional timetable with semester letterhead, export CSV data for spreadsheets, or sync class periods to Google Calendar / Apple Calendar via iCal (.ics).`,
        action,
        recommendations: ['Print current timetable', 'Analyze timetable quality']
      };
    }

    case 'REQUEST_RESCHEDULE':
    case 'REQUEST_TIMETABLE_CHANGE': {
      if (role !== 'admin') {
        return {
          intent,
          entities,
          explanation: '🔒 Only administrators are authorized to reschedule sessions.',
          recommendations: ['Show my schedule']
        };
      }

      return {
        intent,
        entities,
        explanation: `🔄 **Rescheduling Assistant**\n\nTo move or swap a session safely, please specify:\n1. The subject or instructor name\n2. The target day (e.g. Tuesday)\n3. The target time slot (e.g. 11:15 - 12:15)\n\nI will run the deterministic constraint validator to verify that neither the faculty member, the student cohort, nor the room has a collision before applying the change.`,
        recommendations: [
          'Find available rooms on Tuesday 11:15',
          'Find available faculty on Tuesday 11:15',
          'Explain existing conflicts'
        ]
      };
    }

    default: {
      return {
        intent: 'GENERAL_QUERY',
        entities,
        explanation: `👋 **Welcome to CampusSolve AI Assistant!**\n\nI am your intelligent assistant for SYNCHRONIQ Timetable Management. I work directly on top of our deterministic scheduling engine and Firestore database.\n\nHere are some things you can ask me:\n- *"Check for any timetable conflicts"*\n- *"What is our overall timetable quality score?"*\n- *"Find free classrooms on Wednesday at 10:00"*\n- *"Who is available to teach on Friday afternoon?"*\n- *"Show workload breakdown across all faculty"*\n- *"When is my next class?"*`,
        recommendations: [
          role === 'admin' ? 'Check timetable conflicts' : 'When is my next class?',
          role === 'admin' ? 'Explain quality score' : 'Show my free periods',
          'Find available rooms'
        ]
      };
    }
  }
}

/**
 * Centralized AI Assistant Client Service
 * Calls server API endpoint `/api/ai/chat` (OpenAI API on server), with fallback to local engine
 */
export async function sendAIMessage(
  userMessage: string,
  history: AIMessage[],
  role: UserRole,
  userInfo: { id: string; email: string; displayName: string; batchId?: string; facultyId?: string },
  dataset: {
    entries: TimetableEntry[];
    faculty: Faculty[];
    batches: Batch[];
    rooms: Room[];
    subjects: Subject[];
    availabilities: FacultyAvailability[];
  }
): Promise<AIMessage> {
  const localIntent = classifyIntentLocally(userMessage);
  const localEntities = extractEntitiesLocally(
    userMessage,
    DAYS_OF_WEEK,
    dataset.faculty,
    dataset.rooms,
    dataset.batches,
    dataset.subjects
  );

  // Prepare payload for secure server-side endpoint
  const requestPayload: AIProcessRequest = {
    message: userMessage,
    history: history.slice(-6).map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    userRole: role,
    userInfo,
    contextSummary: {
      totalEntries: dataset.entries.length,
      totalFaculty: dataset.faculty.length,
      totalBatches: dataset.batches.length,
      totalRooms: dataset.rooms.length,
      totalSubjects: dataset.subjects.length,
      activeBatchName: dataset.batches.find((b) => b.id === userInfo.batchId)?.name,
      activeFacultyName: dataset.faculty.find((f) => f.id === userInfo.facultyId)?.name,
      sampleEntries: dataset.entries.slice(0, 15).map((e) => ({
        subjectName: e.subjectName,
        batchName: e.batchName,
        facultyName: e.facultyName,
        roomName: e.roomName,
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime
      })),
      existingConflicts: validateFullSchedule(
        dataset.entries,
        dataset.faculty,
        dataset.batches,
        dataset.rooms,
        dataset.availabilities
      ).conflicts.length
    }
  };

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    if (res.ok) {
      const data: AIProcessResponse = await res.json();
      const activeIntent =
        data.intent && data.intent !== 'GENERAL_QUERY' ? data.intent : localIntent;
      
      const deterministicRes = executeIntentLocally(
        activeIntent,
        data.entities && Object.keys(data.entities).length > 0 ? data.entities : localEntities,
        userMessage,
        role,
        userInfo,
        dataset
      );

      const shouldUseServerExplanation =
        data.intent &&
        data.intent !== 'GENERAL_QUERY' &&
        data.explanation &&
        !data.explanation.includes('analyzed your request regarding');

      return {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: shouldUseServerExplanation ? data.explanation : deterministicRes.explanation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: activeIntent,
        entities: data.entities || localEntities,
        action: data.action || deterministicRes.action,
        qualityMetrics: data.qualityMetrics || deterministicRes.qualityMetrics,
        suggestedFollowUps: data.recommendations || deterministicRes.recommendations
      };
    }
  } catch (err) {
    console.warn('Server AI endpoint unavailable, using deterministic local intelligence:', err);
  }

  // Graceful deterministic fallback
  const localRes = executeIntentLocally(
    localIntent,
    localEntities,
    userMessage,
    role,
    userInfo,
    dataset
  );

  return {
    id: `ai_${Date.now()}`,
    role: 'assistant',
    content: localRes.explanation,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    intent: localRes.intent,
    entities: localRes.entities,
    action: localRes.action,
    qualityMetrics: localRes.qualityMetrics,
    suggestedFollowUps: localRes.recommendations
  };
}
