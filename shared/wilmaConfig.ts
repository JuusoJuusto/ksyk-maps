// Wilma System Configuration

export const ATTENDANCE_TYPES = [
  { value: 'present', label: 'Läsnä', labelEn: 'Present', color: 'bg-green-100 text-green-800', icon: '✓' },
  { value: 'absent', label: 'Poissa', labelEn: 'Absent', color: 'bg-red-100 text-red-800', icon: '✗' },
  { value: 'late', label: 'Myöhässä', labelEn: 'Late', color: 'bg-yellow-100 text-yellow-800', icon: '⏰' },
  { value: 'sick', label: 'Sairas', labelEn: 'Sick', color: 'bg-blue-100 text-blue-800', icon: '🤒' },
  { value: 'vacation', label: 'Loma', labelEn: 'Vacation', color: 'bg-purple-100 text-purple-800', icon: '🏖️' },
  { value: 'excused', label: 'Hyväksytty poissaolo', labelEn: 'Excused Absence', color: 'bg-cyan-100 text-cyan-800', icon: '📝' },
  { value: 'unexcused', label: 'Hyväksymätön poissaolo', labelEn: 'Unexcused Absence', color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
  { value: 'medical', label: 'Lääkäri', labelEn: 'Medical', color: 'bg-indigo-100 text-indigo-800', icon: '🏥' },
  { value: 'family', label: 'Perhesyy', labelEn: 'Family Reason', color: 'bg-pink-100 text-pink-800', icon: '👨‍👩‍👧' },
  { value: 'school_event', label: 'Koulutapahtuma', labelEn: 'School Event', color: 'bg-teal-100 text-teal-800', icon: '🎓' },
  { value: 'other', label: 'Muu syy', labelEn: 'Other', color: 'bg-gray-100 text-gray-800', icon: '📋' },
];

export const GRADE_MARKS = [
  { value: '10', label: '10 - Erinomainen', labelEn: '10 - Excellent', color: 'bg-green-600 text-white' },
  { value: '9', label: '9 - Kiitettävä', labelEn: '9 - Commendable', color: 'bg-green-500 text-white' },
  { value: '8', label: '8 - Hyvä', labelEn: '8 - Good', color: 'bg-blue-500 text-white' },
  { value: '7', label: '7 - Tyydyttävä', labelEn: '7 - Satisfactory', color: 'bg-blue-400 text-white' },
  { value: '6', label: '6 - Kohtalainen', labelEn: '6 - Fair', color: 'bg-yellow-500 text-white' },
  { value: '5', label: '5 - Välttävä', labelEn: '5 - Passable', color: 'bg-orange-500 text-white' },
  { value: '4', label: '4 - Hylätty', labelEn: '4 - Failed', color: 'bg-red-500 text-white' },
  { value: 'S', label: 'S - Suoritettu', labelEn: 'S - Completed', color: 'bg-green-600 text-white' },
  { value: 'H', label: 'H - Hylätty', labelEn: 'H - Failed', color: 'bg-red-600 text-white' },
  { value: 'K', label: 'K - Kesken', labelEn: 'K - In Progress', color: 'bg-gray-400 text-white' },
  { value: '-', label: '- Ei arvosanaa', labelEn: '- No Grade', color: 'bg-gray-300 text-gray-700' },
];

export const WILMA_ROLES = [
  { value: 'student', label: 'Oppilas', labelEn: 'Student', icon: '👨‍🎓', color: 'bg-green-100 text-green-800' },
  { value: 'teacher', label: 'Opettaja', labelEn: 'Teacher', icon: '👨‍🏫', color: 'bg-blue-100 text-blue-800' },
  { value: 'parent', label: 'Huoltaja', labelEn: 'Parent', icon: '👨‍👩‍👧', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Ylläpitäjä', labelEn: 'Admin', icon: '👨‍💼', color: 'bg-orange-100 text-orange-800' },
  { value: 'principal', label: 'Rehtori', labelEn: 'Principal', icon: '🎓', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'vice_principal', label: 'Apulaisrehtori', labelEn: 'Vice Principal', icon: '📚', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'counselor', label: 'Opinto-ohjaaja', labelEn: 'Counselor', icon: '🧭', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'social_worker', label: 'Kuraattori', labelEn: 'Social Worker', icon: '❤️', color: 'bg-pink-100 text-pink-800' },
  { value: 'psychologist', label: 'Psykologi', labelEn: 'Psychologist', icon: '🧠', color: 'bg-purple-100 text-purple-800' },
  { value: 'nurse', label: 'Terveydenhoitaja', labelEn: 'School Nurse', icon: '🏥', color: 'bg-red-100 text-red-800' },
  { value: 'special_ed_teacher', label: 'Erityisopettaja', labelEn: 'Special Ed Teacher', icon: '🌟', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'assistant', label: 'Koulunkäyntiavustaja', labelEn: 'School Assistant', icon: '🤝', color: 'bg-teal-100 text-teal-800' },
  { value: 'librarian', label: 'Kirjastonhoitaja', labelEn: 'Librarian', icon: '📚', color: 'bg-amber-100 text-amber-800' },
  { value: 'it_support', label: 'IT-tuki', labelEn: 'IT Support', icon: '💻', color: 'bg-slate-100 text-slate-800' },
  { value: 'secretary', label: 'Sihteeri', labelEn: 'Secretary', icon: '📋', color: 'bg-gray-100 text-gray-800' },
  { value: 'janitor', label: 'Vahtimestari', labelEn: 'Janitor', icon: '🔧', color: 'bg-stone-100 text-stone-800' },
  { value: 'cafeteria_staff', label: 'Ruokapalveluhenkilökunta', labelEn: 'Cafeteria Staff', icon: '🍽️', color: 'bg-lime-100 text-lime-800' },
  { value: 'substitute_teacher', label: 'Sijaisopettaja', labelEn: 'Substitute Teacher', icon: '📝', color: 'bg-sky-100 text-sky-800' },
  { value: 'student_teacher', label: 'Harjoittelija', labelEn: 'Student Teacher', icon: '🎒', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'custom', label: 'Mukautettu rooli', labelEn: 'Custom Role', icon: '⚙️', color: 'bg-violet-100 text-violet-800' },
];

export const MESSAGE_PRIORITIES = [
  { value: 'low', label: 'Matala', labelEn: 'Low', color: 'bg-gray-100 text-gray-800', icon: '📝' },
  { value: 'normal', label: 'Normaali', labelEn: 'Normal', color: 'bg-blue-100 text-blue-800', icon: '📧' },
  { value: 'high', label: 'Korkea', labelEn: 'High', color: 'bg-orange-100 text-orange-800', icon: '⚠️' },
  { value: 'urgent', label: 'Kiireellinen', labelEn: 'Urgent', color: 'bg-red-100 text-red-800', icon: '🚨' },
];

export const ASSIGNMENT_TYPES = [
  { value: 'homework', label: 'Kotitehtävä', labelEn: 'Homework', icon: '📝' },
  { value: 'project', label: 'Projekti', labelEn: 'Project', icon: '📊' },
  { value: 'essay', label: 'Essee', labelEn: 'Essay', icon: '✍️' },
  { value: 'presentation', label: 'Esitys', labelEn: 'Presentation', icon: '🎤' },
  { value: 'exam', label: 'Koe', labelEn: 'Exam', icon: '📋' },
  { value: 'quiz', label: 'Testi', labelEn: 'Quiz', icon: '❓' },
  { value: 'lab', label: 'Laboratoriotyö', labelEn: 'Lab Work', icon: '🔬' },
  { value: 'reading', label: 'Lukutehtävä', labelEn: 'Reading', icon: '📖' },
  { value: 'group_work', label: 'Ryhmätyö', labelEn: 'Group Work', icon: '👥' },
  { value: 'other', label: 'Muu', labelEn: 'Other', icon: '📌' },
];

export const EXAM_TYPES = [
  { value: 'written', label: 'Kirjallinen koe', labelEn: 'Written Exam', icon: '✍️' },
  { value: 'oral', label: 'Suullinen koe', labelEn: 'Oral Exam', icon: '🗣️' },
  { value: 'practical', label: 'Käytännön koe', labelEn: 'Practical Exam', icon: '🔧' },
  { value: 'online', label: 'Verkkokoe', labelEn: 'Online Exam', icon: '💻' },
  { value: 'midterm', label: 'Välikoe', labelEn: 'Midterm', icon: '📊' },
  { value: 'final', label: 'Loppukoe', labelEn: 'Final Exam', icon: '🎓' },
  { value: 'makeup', label: 'Uusintakoe', labelEn: 'Makeup Exam', icon: '🔄' },
];

export const NOTIFICATION_TYPES = [
  { value: 'grade', label: 'Arvosana', labelEn: 'Grade', icon: '📊', color: 'bg-blue-100' },
  { value: 'assignment', label: 'Tehtävä', labelEn: 'Assignment', icon: '📝', color: 'bg-green-100' },
  { value: 'message', label: 'Viesti', labelEn: 'Message', icon: '💬', color: 'bg-purple-100' },
  { value: 'attendance', label: 'Poissaolo', labelEn: 'Attendance', icon: '📅', color: 'bg-orange-100' },
  { value: 'exam', label: 'Koe', labelEn: 'Exam', icon: '📋', color: 'bg-red-100' },
  { value: 'announcement', label: 'Tiedote', labelEn: 'Announcement', icon: '📢', color: 'bg-yellow-100' },
  { value: 'schedule', label: 'Lukujärjestys', labelEn: 'Schedule', icon: '📆', color: 'bg-cyan-100' },
  { value: 'system', label: 'Järjestelmä', labelEn: 'System', icon: '⚙️', color: 'bg-gray-100' },
];

export const DEFAULT_WILMA_SETTINGS = {
  schoolName: 'Kulosaaren yhteiskoulu',
  schoolNameEn: 'Kulosaari Comprehensive School',
  academicYear: '2025-2026',
  currentTerm: 'Syksy 2025',
  
  // Security settings
  require2FA: false,
  requireEmailVerification: false,
  allowParentAccess: true,
  allowStudentMessaging: true,
  sessionTimeout: 30, // minutes
  
  // Feature toggles
  enableGrades: true,
  enableAttendance: true,
  enableMessages: true,
  enableAssignments: true,
  enableExams: true,
  enableSchedule: true,
  enableAnnouncements: true,
  enableStudyMaterials: true,
  
  // Notification settings
  emailNotifications: true,
  pushNotifications: false,
  smsNotifications: false,
  
  // Grade settings
  gradeScale: '4-10',
  passingGrade: '5',
  showGradeStatistics: true,
  allowGradeAppeals: true,
  
  // Attendance settings
  attendanceTrackingEnabled: true,
  autoNotifyParents: true,
  attendanceThreshold: 90, // percentage
  
  // Custom roles
  customRoles: [] as Array<{
    id: string;
    name: string;
    nameEn: string;
    icon: string;
    color: string;
    permissions: string[];
  }>,
};

export type WilmaSettings = typeof DEFAULT_WILMA_SETTINGS;
