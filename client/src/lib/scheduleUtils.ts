/**
 * Schedule Utilities - Rule-based scheduling logic (NO AI)
 * Auto-scheduling, conflict detection, and optimization
 */

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  label: string;
}

export interface Lesson {
  id: string;
  timeSlotId: string;
  day: number; // 0-4 (Mon-Fri)
  subject: string;
  teacher: string;
  room: string;
  group?: string;
  color: string;
}

export interface Conflict {
  type: 'teacher' | 'room' | 'student';
  message: string;
  lessons: Lesson[];
}

/**
 * Detect all conflicts in a schedule (rule-based)
 */
export function detectConflicts(lessons: Lesson[]): Conflict[] {
  const conflicts: Conflict[] = [];

  // Teacher conflicts - same teacher in two places at same time
  const teacherSlots = new Map<string, Lesson[]>();
  lessons.forEach(lesson => {
    if (!lesson.teacher) return;
    const key = `${lesson.teacher}-${lesson.timeSlotId}-${lesson.day}`;
    if (!teacherSlots.has(key)) teacherSlots.set(key, []);
    teacherSlots.get(key)!.push(lesson);
  });

  teacherSlots.forEach((lessonsInSlot, key) => {
    if (lessonsInSlot.length > 1) {
      const [teacher, timeSlotId, day] = key.split('-');
      conflicts.push({
        type: 'teacher',
        message: `${teacher} on kahdessa paikassa samaan aikaan`,
        lessons: lessonsInSlot
      });
    }
  });

  // Room conflicts - same room booked twice
  const roomSlots = new Map<string, Lesson[]>();
  lessons.forEach(lesson => {
    if (!lesson.room) return;
    const key = `${lesson.room}-${lesson.timeSlotId}-${lesson.day}`;
    if (!roomSlots.has(key)) roomSlots.set(key, []);
    roomSlots.get(key)!.push(lesson);
  });

  roomSlots.forEach((lessonsInSlot, key) => {
    if (lessonsInSlot.length > 1) {
      const [room, timeSlotId, day] = key.split('-');
      conflicts.push({
        type: 'room',
        message: `Luokka ${room} on varattu kahdesti`,
        lessons: lessonsInSlot
      });
    }
  });

  return conflicts;
}

/**
 * Check if a lesson can be placed at a specific time (rule-based)
 */
export function canPlaceLesson(
  lesson: Partial<Lesson>,
  day: number,
  timeSlotId: string,
  existingLessons: Lesson[]
): { canPlace: boolean; reason?: string } {
  // Check teacher availability
  if (lesson.teacher) {
    const teacherBusy = existingLessons.some(
      l => l.teacher === lesson.teacher && l.day === day && l.timeSlotId === timeSlotId
    );
    if (teacherBusy) {
      return { canPlace: false, reason: `Opettaja ${lesson.teacher} on jo varattu` };
    }
  }

  // Check room availability
  if (lesson.room) {
    const roomBusy = existingLessons.some(
      l => l.room === lesson.room && l.day === day && l.timeSlotId === timeSlotId
    );
    if (roomBusy) {
      return { canPlace: false, reason: `Luokka ${lesson.room} on jo varattu` };
    }
  }

  return { canPlace: true };
}

/**
 * Auto-schedule lessons based on constraints (rule-based algorithm)
 */
export function autoScheduleLessons(
  lessonsToSchedule: Partial<Lesson>[],
  existingLessons: Lesson[],
  timeSlots: TimeSlot[],
  preferences?: {
    preferMornings?: boolean;
    avoidFridays?: boolean;
    maxLessonsPerDay?: number;
  }
): { scheduled: Lesson[]; unscheduled: Partial<Lesson>[] } {
  const scheduled: Lesson[] = [];
  const unscheduled: Partial<Lesson>[] = [];
  const allLessons = [...existingLessons];

  // Sort time slots by preference
  const sortedTimeSlots = [...timeSlots].sort((a, b) => {
    if (preferences?.preferMornings) {
      return a.startTime.localeCompare(b.startTime);
    }
    return 0;
  });

  // Try to schedule each lesson
  for (const lesson of lessonsToSchedule) {
    let placed = false;

    // Try each day
    for (let day = 0; day < 5; day++) {
      // Skip Fridays if preferred
      if (preferences?.avoidFridays && day === 4) continue;

      // Check max lessons per day
      if (preferences?.maxLessonsPerDay) {
        const lessonsOnDay = allLessons.filter(l => l.day === day).length;
        if (lessonsOnDay >= preferences.maxLessonsPerDay) continue;
      }

      // Try each time slot
      for (const timeSlot of sortedTimeSlots) {
        const check = canPlaceLesson(lesson, day, timeSlot.id, allLessons);
        
        if (check.canPlace) {
          const newLesson: Lesson = {
            id: `auto-${Date.now()}-${Math.random()}`,
            timeSlotId: timeSlot.id,
            day,
            subject: lesson.subject || '',
            teacher: lesson.teacher || '',
            room: lesson.room || '',
            group: lesson.group,
            color: lesson.color || '#003d82'
          };
          
          scheduled.push(newLesson);
          allLessons.push(newLesson);
          placed = true;
          break;
        }
      }

      if (placed) break;
    }

    if (!placed) {
      unscheduled.push(lesson);
    }
  }

  return { scheduled, unscheduled };
}

/**
 * Calculate teacher workload (rule-based)
 */
export function calculateTeacherWorkload(lessons: Lesson[]): Map<string, number> {
  const workload = new Map<string, number>();

  lessons.forEach(lesson => {
    if (!lesson.teacher) return;
    const current = workload.get(lesson.teacher) || 0;
    workload.set(lesson.teacher, current + 1);
  });

  return workload;
}

/**
 * Find available time slots for a teacher (rule-based)
 */
export function findAvailableSlots(
  teacher: string,
  lessons: Lesson[],
  timeSlots: TimeSlot[]
): Array<{ day: number; timeSlotId: string }> {
  const available: Array<{ day: number; timeSlotId: string }> = [];

  for (let day = 0; day < 5; day++) {
    for (const timeSlot of timeSlots) {
      const isBusy = lessons.some(
        l => l.teacher === teacher && l.day === day && l.timeSlotId === timeSlot.id
      );
      
      if (!isBusy) {
        available.push({ day, timeSlotId: timeSlot.id });
      }
    }
  }

  return available;
}

/**
 * Optimize schedule by balancing workload (rule-based)
 */
export function optimizeSchedule(lessons: Lesson[]): Lesson[] {
  // Create a copy to work with
  const optimized = [...lessons];

  // Sort by day and time to ensure consistent ordering
  optimized.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.timeSlotId.localeCompare(b.timeSlotId);
  });

  // Additional optimization rules can be added here
  // For example: minimize gaps, balance days, etc.

  return optimized;
}

/**
 * Export schedule to CSV format
 */
export function exportToCSV(lessons: Lesson[], timeSlots: TimeSlot[]): string {
  const days = ['Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai'];
  let csv = 'Aika,' + days.join(',') + '\n';

  timeSlots.forEach(slot => {
    const row = [slot.label + ' (' + slot.startTime + '-' + slot.endTime + ')'];
    
    for (let day = 0; day < 5; day++) {
      const lesson = lessons.find(l => l.day === day && l.timeSlotId === slot.id);
      if (lesson) {
        row.push(`${lesson.subject} (${lesson.teacher}, ${lesson.room})`);
      } else {
        row.push('');
      }
    }
    
    csv += row.join(',') + '\n';
  });

  return csv;
}

/**
 * Keyboard shortcuts configuration
 */
export const KEYBOARD_SHORTCUTS = {
  SAVE: 'Ctrl+S',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  DELETE: 'Delete',
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  NEW_LESSON: 'Ctrl+N',
  EXPORT: 'Ctrl+E',
  PRINT: 'Ctrl+P'
};
