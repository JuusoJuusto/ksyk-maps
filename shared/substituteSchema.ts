// Database schema for substitute teacher system

export interface SubstituteRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: 'pending' | 'assigned' | 'accepted' | 'declined' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  classes: string[];
  subjects: string[];
  notes?: string;
  lessonPlans?: LessonPlan[];
  createdAt: string;
  updatedAt: string;
}

export interface SubstituteAssignment {
  id: string;
  requestId: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  assignedBy: string;
  assignedAt: string;
  acceptedAt?: string;
  status: 'assigned' | 'accepted' | 'declined' | 'completed';
  feedback?: string;
  rating?: number;
}

export interface LessonPlan {
  id: string;
  lessonId: string;
  class: string;
  subject: string;
  time: string;
  room: string;
  topic: string;
  objectives: string[];
  materials: string[];
  activities: Activity[];
  homework?: string;
  notes?: string;
  studentRoster: StudentInfo[];
  specialNeeds: SpecialNeed[];
}

export interface Activity {
  duration: number; // minutes
  description: string;
  type: 'lecture' | 'discussion' | 'exercise' | 'group_work' | 'test' | 'other';
}

export interface StudentInfo {
  id: string;
  name: string;
  photo?: string;
  allergies?: string[];
  medications?: string[];
  emergencyContact?: string;
  notes?: string;
}

export interface SpecialNeed {
  studentId: string;
  studentName: string;
  type: 'learning' | 'physical' | 'behavioral' | 'medical';
  description: string;
  accommodations: string[];
  urgent: boolean;
}

export interface SubstituteAvailability {
  teacherId: string;
  date: string;
  available: boolean;
  timeSlots?: { start: string; end: string }[];
  notes?: string;
}

export interface SubstituteNotification {
  id: string;
  recipientId: string;
  type: 'new_request' | 'assignment' | 'acceptance' | 'reminder' | 'cancellation';
  title: string;
  message: string;
  requestId?: string;
  read: boolean;
  sentAt: string;
}
