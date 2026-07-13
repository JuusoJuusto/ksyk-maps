import * as dotenv from 'dotenv';
import {
  type User,
  type UpsertUser,
  type Building,
  type InsertBuilding,
  type Floor,
  type InsertFloor,
  type Hallway,
  type InsertHallway,
  type Room,
  type InsertRoom,
  type Staff,
  type InsertStaff,
  type Event,
  type InsertEvent,
  type Announcement,
  type InsertAnnouncement,
  type AppSettings,
  type InsertAppSettings,
} from "@shared/schema";

// Load environment variables
dotenv.config();

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  
  // Building operations
  getBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building>;
  deleteBuilding(id: string): Promise<void>;
  
  // Floor operations
  getFloors(buildingId?: string): Promise<Floor[]>;
  getFloor(id: string): Promise<Floor | undefined>;
  createFloor(floor: InsertFloor): Promise<Floor>;
  updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor>;
  deleteFloor(id: string): Promise<void>;
  
  // Hallway operations
  getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]>;
  getHallway(id: string): Promise<Hallway | undefined>;
  createHallway(hallway: InsertHallway): Promise<Hallway>;
  updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway>;
  deleteHallway(id: string): Promise<void>;
  
  // Room operations
  getRooms(buildingId?: string): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  searchRooms(query: string): Promise<Room[]>;
  
  // Staff operations
  getStaff(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaffMember(id: string): Promise<void>;
  searchStaff(query: string, department?: string): Promise<Staff[]>;
  
  // Event operations
  getEvents(startDate?: Date, endDate?: Date): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  
  // Announcement operations
  getAnnouncements(limit?: number): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  
  // Ticket operations
  getTickets(): Promise<any[]>;
  getTicket(id: string): Promise<any | undefined>;
  createTicket(ticket: any): Promise<any>;
  updateTicket(id: string, ticket: any): Promise<any>;
  deleteTicket(id: string): Promise<void>;
  
  // App Settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;
  
  // Admin Login Log operations
  createAdminLoginLog(log: {
    userId: string | null;
    email: string;
    userName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    loginStatus: 'success' | 'failed';
    failureReason?: string | null;
    sessionId?: string | null;
  }): Promise<void>;
  
  getAdminLoginLogs(limit?: number): Promise<any[]>;
  
  // App Log operations
  createAppLog(log: {
    level?: string;
    type?: string;
    message: string;
    details?: string | null;
    timestamp?: Date;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    action?: string | null;
    userName?: string | null;
  }): Promise<void>;
  
  getAppLogs(limit?: number): Promise<any[]>;

  // Easter egg tracking
  trackEasterEggDiscovery(data: { eggId: string; eggName: string; userId: string; timestamp: string }): Promise<void>;
  getEasterEggStats(): Promise<any>;

  // Analytics operations
  createPageView(view: any): Promise<void>;
  createSearchAnalytic(search: any): Promise<void>;
  createNavigationAnalytic(navigation: any): Promise<void>;
  createUserSession(session: any): Promise<void>;
  updateUserSession(sessionId: string, updates: any): Promise<void>;
  getAnalyticsSummary(days?: number): Promise<any>;
  getLiveAnalytics(): Promise<any>;
  getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]>;
  getPerformanceMetrics(timeRange: string): Promise<any>;
  getTopSearches(limit?: number): Promise<any[]>;
  getPopularRooms(limit?: number): Promise<any[]>;
  getVisitorStats(days?: number): Promise<any>;
  
  // ============================================
  // WILMA EXTENDED OPERATIONS
  // ============================================
  
  // Wilma Classes operations
  getWilmaClasses(year?: string): Promise<any[]>;
  getWilmaClass(id: string): Promise<any | undefined>;
  createWilmaClass(classData: any): Promise<any>;
  updateWilmaClass(id: string, classData: any): Promise<any>;
  deleteWilmaClass(id: string): Promise<void>;
  
  // Wilma Courses operations
  getWilmaCourses(teacherId?: string, classId?: string): Promise<any[]>;
  getWilmaCourse(id: string): Promise<any | undefined>;
  createWilmaCourse(courseData: any): Promise<any>;
  updateWilmaCourse(id: string, courseData: any): Promise<any>;
  deleteWilmaCourse(id: string): Promise<void>;
  
  // Wilma Lesson Journal operations
  getWilmaLessonJournals(courseId?: string, teacherId?: string, date?: string): Promise<any[]>;
  getWilmaLessonJournal(id: string): Promise<any | undefined>;
  createWilmaLessonJournal(journalData: any): Promise<any>;
  updateWilmaLessonJournal(id: string, journalData: any): Promise<any>;
  deleteWilmaLessonJournal(id: string): Promise<void>;
  
  // Wilma Homework Extended operations
  getWilmaHomeworkExtended(courseId?: string, teacherId?: string): Promise<any[]>;
  getWilmaHomeworkExtendedById(id: string): Promise<any | undefined>;
  createWilmaHomeworkExtended(homeworkData: any): Promise<any>;
  updateWilmaHomeworkExtended(id: string, homeworkData: any): Promise<any>;
  deleteWilmaHomeworkExtended(id: string): Promise<void>;
  
  // Wilma Homework Submissions operations
  getWilmaHomeworkSubmissions(homeworkId?: string, studentId?: string): Promise<any[]>;
  getWilmaHomeworkSubmission(id: string): Promise<any | undefined>;
  createWilmaHomeworkSubmission(submissionData: any): Promise<any>;
  updateWilmaHomeworkSubmission(id: string, submissionData: any): Promise<any>;
  deleteWilmaHomeworkSubmission(id: string): Promise<void>;
  
  // Wilma Exams Extended operations
  getWilmaExamsExtended(courseId?: string, teacherId?: string): Promise<any[]>;
  getWilmaExamExtended(id: string): Promise<any | undefined>;
  createWilmaExamExtended(examData: any): Promise<any>;
  updateWilmaExamExtended(id: string, examData: any): Promise<any>;
  deleteWilmaExamExtended(id: string): Promise<void>;
  
  // Wilma Exam Results operations
  getWilmaExamResults(examId?: string, studentId?: string): Promise<any[]>;
  getWilmaExamResult(id: string): Promise<any | undefined>;
  createWilmaExamResult(resultData: any): Promise<any>;
  updateWilmaExamResult(id: string, resultData: any): Promise<any>;
  deleteWilmaExamResult(id: string): Promise<void>;
  
  // Wilma Behavior Notes operations
  getWilmaBehaviorNotes(studentId?: string, teacherId?: string): Promise<any[]>;
  getWilmaBehaviorNote(id: string): Promise<any | undefined>;
  createWilmaBehaviorNote(noteData: any): Promise<any>;
  updateWilmaBehaviorNote(id: string, noteData: any): Promise<any>;
  deleteWilmaBehaviorNote(id: string): Promise<void>;
  
  // Wilma Notifications operations
  getWilmaNotifications(userId: string, unreadOnly?: boolean): Promise<any[]>;
  getWilmaNotification(id: string): Promise<any | undefined>;
  createWilmaNotification(notificationData: any): Promise<any>;
  updateWilmaNotification(id: string, notificationData: any): Promise<any>;
  markWilmaNotificationAsRead(id: string): Promise<void>;
  markAllWilmaNotificationsAsRead(userId: string): Promise<void>;
  deleteWilmaNotification(id: string): Promise<void>;
  
  // Wilma Dashboard Preferences operations
  saveWilmaDashboardPreferences(userId: string, preferences: any): Promise<void>;
  getWilmaDashboardPreferences(userId: string): Promise<any | null>;
  
  // Wilma Calendar Events operations
  getWilmaCalendarEvents(userId?: string, startDate?: string, endDate?: string): Promise<any[]>;
  getWilmaCalendarEvent(id: string): Promise<any | undefined>;
  createWilmaCalendarEvent(eventData: any): Promise<any>;
  updateWilmaCalendarEvent(id: string, eventData: any): Promise<any>;
  deleteWilmaCalendarEvent(id: string): Promise<void>;
  
  // Wilma Analytics operations
  createWilmaAnalytic(analyticData: any): Promise<void>;
  getWilmaAnalytics(userId?: string, eventType?: string, days?: number): Promise<any[]>;
  getWilmaAnalyticsSummary(days?: number): Promise<any>;
  
  // Wilma AI Interactions operations
  createWilmaAiInteraction(interactionData: any): Promise<any>;
  getWilmaAiInteractions(userId?: string, featureType?: string): Promise<any[]>;
  updateWilmaAiInteraction(id: string, interactionData: any): Promise<any>;
  getWilmaAiUsageStats(days?: number): Promise<any>;
  
  // ============================================
  // WILMA DESKTOP ENVIRONMENT OPERATIONS
  // ============================================
  
  // Desktop Settings operations
  getWilmaDesktopSettings(): Promise<any | undefined>;
  updateWilmaDesktopSettings(settings: any): Promise<any>;
  
  // Desktop Apps operations
  getWilmaDesktopApps(): Promise<any[]>;
  getWilmaDesktopApp(id: number): Promise<any | undefined>;
  createWilmaDesktopApp(appData: any): Promise<any>;
  updateWilmaDesktopApp(id: number, appData: any): Promise<any>;
  deleteWilmaDesktopApp(id: number): Promise<void>;
  
  // User Desktop Config operations
  getWilmaUserDesktopConfig(userId: number): Promise<any | undefined>;
  createWilmaUserDesktopConfig(configData: any): Promise<any>;
  updateWilmaUserDesktopConfig(userId: number, configData: any): Promise<any>;
  
  // Detention operations
  getWilmaDetentions(): Promise<any[]>;
  getWilmaDetention(id: string): Promise<any | undefined>;
  createWilmaDetention(detentionData: any): Promise<any>;
  updateWilmaDetention(id: string, detentionData: any): Promise<any>;
  deleteWilmaDetention(id: string): Promise<void>;
  
  // ============================================
  // MISSING METHODS (ADDED TO FIX TYPESCRIPT ERRORS)
  // ============================================
  
  // Wilma User operations (CRITICAL - used extensively in API)
  getWilmaUsers(role?: string): Promise<any[]>;
  getWilmaUser(id: string): Promise<any | undefined>;
  createWilmaUser(wilmaUser: any): Promise<any>;
  updateWilmaUser(id: string, wilmaUser: any): Promise<any>;
  deleteWilmaUser(id: string): Promise<void>;
  getWilmaUserByStudentId(studentId: string): Promise<any | undefined>;
  getWilmaUserByUsername(username: string): Promise<any | undefined>;
  
  // Wilma Schedule operations (used in API)
  getWilmaSchedules(studentId?: string): Promise<any[]>;
  getWilmaSchedulesAll(classFilter?: string): Promise<any[]>;
  createWilmaSchedule(scheduleData: any): Promise<any>;
  updateWilmaSchedule(id: string, scheduleData: any): Promise<any>;
  deleteWilmaSchedule(id: string): Promise<void>;

  // Wilma Attendance operations (used in API)
  getWilmaAttendance(studentId?: string): Promise<any[]>;
  getWilmaAttendanceByClass(classId: string, date?: string): Promise<any[]>;
  createWilmaAttendance(attendanceData: any): Promise<any>;
  updateWilmaAttendance(id: string, attendanceData: any): Promise<any>;
  deleteWilmaAttendance(id: string): Promise<void>;
  
  // Wilma Grades operations (used in API)
  getWilmaGrades(studentId?: string): Promise<any[]>;
  createWilmaGrade(gradeData: any): Promise<any>;
  updateWilmaGrade(id: string, gradeData: any): Promise<any>;
  deleteWilmaGrade(id: string): Promise<void>;
  
  // Wilma Assignments operations (used in API)
  getWilmaAssignments(studentId?: string): Promise<any[]>;
  getWilmaAssignmentsByClass(classId: string): Promise<any[]>;
  createWilmaAssignment(assignmentData: any): Promise<any>;
  updateWilmaAssignment(id: string, assignmentData: any): Promise<any>;
  deleteWilmaAssignment(id: string): Promise<void>;
  
  // Wilma Messages operations (used in API)
  getWilmaMessagesAll(userId?: string): Promise<any[]>;
  createWilmaMessage(messageData: any): Promise<any>;
  deleteWilmaMessage(id: string): Promise<void>;
  markWilmaMessageAsRead(id: string): Promise<void>;
  
  // Wilma Settings operations (used in API)
  getWilmaSettings(): Promise<any | undefined>;
  updateWilmaSettings(settings: any): Promise<any>;
  
  // Parent-Child linking operations (used in API)
  linkParentToChild(parentId: string, childId: string): Promise<void>;
  unlinkParentFromChild(parentId: string, childId: string): Promise<void>;
  getChildrenForParent(parentId: string): Promise<any[]>;
  getParentsForChild(childId: string): Promise<any[]>;
  
  // Homework Extended operations (used in API)
  getWilmaHomeworkExtendedAll(): Promise<any[]>;
  
  // Staff operations (used in API - deleteStaff vs deleteStaffMember)
  deleteStaff(id: string): Promise<void>;
  
  // User operations (used in API for password reset)
  getUsers(): Promise<User[]>;
  
  // Analytics operations (used in API)
  createAnalyticsEvent(event: any): Promise<void>;
  getLiveAnalytics(): Promise<any>;
  getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]>;
  getPerformanceMetrics(timeRange: string): Promise<any>;
  
  // ============================================
  // CODING PLATFORM OPERATIONS
  // ============================================
  
  // Coding Courses
  getCodingCourses(): Promise<any[]>;
  getCodingCourse(id: string): Promise<any | undefined>;
  createCodingCourse(courseData: any): Promise<any>;
  updateCodingCourse(id: string, courseData: any): Promise<any>;
  deleteCodingCourse(id: string): Promise<void>;
  
  // Coding Modules
  getCodingModules(courseId: string): Promise<any[]>;
  getCodingModule(id: string): Promise<any | undefined>;
  createCodingModule(moduleData: any): Promise<any>;
  updateCodingModule(id: string, moduleData: any): Promise<any>;
  deleteCodingModule(id: string): Promise<void>;
  
  // Coding Lessons
  getCodingLessons(moduleId: string): Promise<any[]>;
  getCodingLesson(id: string): Promise<any | undefined>;
  createCodingLesson(lessonData: any): Promise<any>;
  updateCodingLesson(id: string, lessonData: any): Promise<any>;
  deleteCodingLesson(id: string): Promise<void>;
  
  // Coding Exercises
  getCodingExercises(lessonId: string): Promise<any[]>;
  getCodingExercise(id: string): Promise<any | undefined>;
  createCodingExercise(exerciseData: any): Promise<any>;
  updateCodingExercise(id: string, exerciseData: any): Promise<any>;
  deleteCodingExercise(id: string): Promise<void>;
  
  // User Progress
  getCodingUserProgress(userId: string, courseId?: string): Promise<any[]>;
  getCodingUserProgressByCourse(userId: string, courseId: string): Promise<any | undefined>;
  createCodingUserProgress(progressData: any): Promise<any>;
  updateCodingUserProgress(id: string, progressData: any): Promise<any>;
  
  // Code Submissions
  getCodingSubmissions(userId: string, exerciseId?: string): Promise<any[]>;
  createCodingSubmission(submissionData: any): Promise<any>;
  
  // Coding Classrooms
  getCodingClassrooms(teacherId?: string): Promise<any[]>;
  getCodingClassroom(id: string): Promise<any | undefined>;
  getCodingClassroomByJoinCode(joinCode: string): Promise<any | undefined>;
  createCodingClassroom(classroomData: any): Promise<any>;
  updateCodingClassroom(id: string, classroomData: any): Promise<any>;
  deleteCodingClassroom(id: string): Promise<void>;
  joinCodingClassroom(classroomId: string, studentId: string): Promise<void>;
  leaveCodingClassroom(classroomId: string, studentId: string): Promise<void>;
  
  // Classroom Assignments
  getCodingClassroomAssignments(classroomId: string): Promise<any[]>;
  createCodingClassroomAssignment(assignmentData: any): Promise<any>;
  updateCodingClassroomAssignment(id: string, assignmentData: any): Promise<any>;
  deleteCodingClassroomAssignment(id: string): Promise<void>;
  
  // User Stats
  getCodingUserStats(userId: string): Promise<any | undefined>;
  createCodingUserStats(statsData: any): Promise<any>;
  updateCodingUserStats(userId: string, statsData: any): Promise<any>;
  
  // Leaderboard
  getCodingLeaderboard(type: string, period?: string, limit?: number): Promise<any[]>;
  updateCodingLeaderboard(leaderboardData: any): Promise<void>;
}



// Simple in-memory storage with mock data for KSYK campus.
// The Building/Room shapes have grown many optional fields the mock
// data doesn't populate (openingHours, entrances, photos, isBookable,
// etc). Casting through unknown keeps the seed data compact — nulls
// are the correct runtime default for the fields we don't set here.
class MemStorage implements IStorage {
  private mockBuildings: Building[] = ([
    { id: "1", name: "M", nameEn: "Music Building", nameFi: "Musiikkitalo", description: null, descriptionEn: "Music and arts education", descriptionFi: "Musiikin ja taiteen opetus", floors: 3, mapPositionX: -200, mapPositionY: 50, colorCode: "#9333EA", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", name: "K", nameEn: "Central Hall", nameFi: "Keskushalli", description: null, descriptionEn: "Main building", descriptionFi: "Päärakennus", floors: 3, mapPositionX: 100, mapPositionY: 0, colorCode: "#DC2626", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "3", name: "L", nameEn: "Gymnasium", nameFi: "Liikuntahalli", description: null, descriptionEn: "Sports and physical education", descriptionFi: "Urheilu ja liikuntakasvatus", floors: 2, mapPositionX: 350, mapPositionY: 80, colorCode: "#059669", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "4", name: "R", nameEn: "R Building", nameFi: "R-rakennus", description: null, descriptionEn: "Research and laboratories", descriptionFi: "Tutkimus ja laboratoriot", floors: 3, mapPositionX: -50, mapPositionY: 200, colorCode: "#F59E0B", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "5", name: "A", nameEn: "A Building", nameFi: "A-rakennus", description: null, descriptionEn: "Administration and offices", descriptionFi: "Hallinto ja toimistot", floors: 3, mapPositionX: 250, mapPositionY: 180, colorCode: "#8B5CF6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "6", name: "U", nameEn: "U Building", nameFi: "U-rakennus", description: null, descriptionEn: "University programs", descriptionFi: "Yliopisto-ohjelmat", floors: 3, mapPositionX: -100, mapPositionY: -120, colorCode: "#3B82F6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "7", name: "OG", nameEn: "Old Gymnasium", nameFi: "Vanha liikuntahalli", description: null, descriptionEn: "Historic sports facility", descriptionFi: "Historiallinen liikuntapaikka", floors: 2, mapPositionX: 200, mapPositionY: -80, colorCode: "#06B6D4", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
  ] as unknown as Building[]);

  private mockRooms: Room[] = ([
    // Music Building (M) - Floor 1
    { id: "1", buildingId: "1", roomNumber: "M12", name: null, nameEn: "Music Room 12", nameFi: "Musiikkiluokka 12", floor: 1, type: "music_room", subType: null, capacity: 30, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["piano", "microphone", "speakers"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", buildingId: "1", roomNumber: "M15", name: null, nameEn: "Music Room 15", nameFi: "Musiikkiluokka 15", floor: 1, type: "music_room", subType: null, capacity: 25, mapPositionX: -220, mapPositionY: 30, width: 45, height: 30, colorCode: "#6B7280", equipment: ["piano", "drums"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Music Building (M) - Floor 2
    { id: "3", buildingId: "1", roomNumber: "M22", name: null, nameEn: "Music Theory Room", nameFi: "Musiikin teoria", floor: 2, type: "classroom", subType: null, capacity: 20, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["whiteboard", "projector"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Music Building (M) - Floor 3
    { id: "4", buildingId: "1", roomNumber: "M32", name: null, nameEn: "Recording Studio", nameFi: "Äänitysstudio", floor: 3, type: "studio", subType: null, capacity: 15, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["recording_equipment", "soundproof"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Central Hall (K) - Floor 1
    { id: "5", buildingId: "2", roomNumber: "K15", name: null, nameEn: "Main Classroom", nameFi: "Pääluokka", floor: 1, type: "classroom", subType: null, capacity: 35, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["projector", "whiteboard", "computer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "6", buildingId: "2", roomNumber: "K10", name: null, nameEn: "Language Lab", nameFi: "Kielilaboratorio", floor: 1, type: "lab", subType: null, capacity: 30, mapPositionX: 80, mapPositionY: -20, width: 50, height: 35, colorCode: "#6B7280", equipment: ["headphones", "language_software"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Central Hall (K) - Floor 2
    { id: "7", buildingId: "2", roomNumber: "K25", name: null, nameEn: "Science Classroom", nameFi: "Tiedeluokka", floor: 2, type: "classroom", subType: null, capacity: 28, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["lab_bench", "microscopes"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Central Hall (K) - Floor 3
    { id: "8", buildingId: "2", roomNumber: "K35", name: null, nameEn: "Art Studio", nameFi: "Taidestudio", floor: 3, type: "studio", subType: null, capacity: 25, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["easels", "art_supplies"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Gymnasium (L) - Floor 1
    { id: "9", buildingId: "3", roomNumber: "L01", name: null, nameEn: "Main Gymnasium", nameFi: "Pääliikuntahalli", floor: 1, type: "gymnasium", subType: null, capacity: 200, mapPositionX: 370, mapPositionY: 100, width: 80, height: 60, colorCode: "#6B7280", equipment: ["basketball_court", "volleyball_net", "sound_system"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "10", buildingId: "3", roomNumber: "L05", name: null, nameEn: "Fitness Room", nameFi: "Kuntosali", floor: 1, type: "fitness", subType: null, capacity: 30, mapPositionX: 330, mapPositionY: 60, width: 50, height: 35, colorCode: "#6B7280", equipment: ["weights", "treadmills"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Gymnasium (L) - Floor 2
    { id: "11", buildingId: "3", roomNumber: "L15", name: null, nameEn: "Dance Studio", nameFi: "Tanssistudio", floor: 2, type: "studio", subType: null, capacity: 40, mapPositionX: 370, mapPositionY: 100, width: 60, height: 45, colorCode: "#6B7280", equipment: ["mirrors", "sound_system", "ballet_bars"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // R Building - Floor 1
    { id: "12", buildingId: "4", roomNumber: "R10", name: null, nameEn: "Chemistry Lab", nameFi: "Kemian laboratorio", floor: 1, type: "lab", subType: null, capacity: 24, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["fume_hood", "lab_bench", "safety_shower"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // R Building - Floor 2
    { id: "13", buildingId: "4", roomNumber: "R20", name: null, nameEn: "Physics Lab", nameFi: "Fysiikan laboratorio", floor: 2, type: "lab", subType: null, capacity: 22, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["oscilloscope", "lab_bench"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // R Building - Floor 3
    { id: "14", buildingId: "4", roomNumber: "R30", name: null, nameEn: "Biology Lab", nameFi: "Biologian laboratorio", floor: 3, type: "lab", subType: null, capacity: 26, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["microscopes", "specimens"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // A Building - Floor 1
    { id: "15", buildingId: "5", roomNumber: "A20", name: null, nameEn: "Office 20", nameFi: "Toimisto 20", floor: 1, type: "office", subType: null, capacity: 4, mapPositionX: 270, mapPositionY: 200, width: 40, height: 30, colorCode: "#6B7280", equipment: ["desk", "computer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // A Building - Floor 2
    { id: "16", buildingId: "5", roomNumber: "A25", name: null, nameEn: "Conference Room", nameFi: "Kokoushuone", floor: 2, type: "meeting", subType: null, capacity: 12, mapPositionX: 270, mapPositionY: 200, width: 50, height: 35, colorCode: "#6B7280", equipment: ["projector", "conference_table"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // A Building - Floor 3
    { id: "17", buildingId: "5", roomNumber: "A35", name: null, nameEn: "Principal's Office", nameFi: "Rehtorin toimisto", floor: 3, type: "office", subType: null, capacity: 6, mapPositionX: 270, mapPositionY: 200, width: 45, height: 32, colorCode: "#6B7280", equipment: ["desk", "bookshelf"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // U Building - Floor 1
    { id: "18", buildingId: "6", roomNumber: "U30", name: null, nameEn: "Computer Lab", nameFi: "Tietokoneluokka", floor: 1, type: "lab", subType: null, capacity: 32, mapPositionX: -80, mapPositionY: -100, width: 60, height: 40, colorCode: "#6B7280", equipment: ["computers", "projector", "printer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // U Building - Floor 2
    { id: "19", buildingId: "6", roomNumber: "U35", name: null, nameEn: "Study Hall", nameFi: "Lukusali", floor: 2, type: "study", subType: null, capacity: 50, mapPositionX: -80, mapPositionY: -100, width: 70, height: 50, colorCode: "#6B7280", equipment: ["desks", "quiet_zone"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // U Building - Floor 3
    { id: "20", buildingId: "6", roomNumber: "U40", name: null, nameEn: "Library", nameFi: "Kirjasto", floor: 3, type: "library", subType: null, capacity: 80, mapPositionX: -80, mapPositionY: -100, width: 75, height: 55, colorCode: "#6B7280", equipment: ["books", "study_tables", "computers"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Old Gymnasium (OG) - Floor 1
    { id: "21", buildingId: "7", roomNumber: "OG5", name: null, nameEn: "Small Gym", nameFi: "Pieni sali", floor: 1, type: "gymnasium", subType: null, capacity: 60, mapPositionX: 220, mapPositionY: -60, width: 60, height: 45, colorCode: "#6B7280", equipment: ["badminton_court", "sound_system"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Old Gymnasium (OG) - Floor 2
    { id: "22", buildingId: "7", roomNumber: "OG10", name: null, nameEn: "Sports Equipment Storage", nameFi: "Urheiluvälinevarasto", floor: 2, type: "storage", subType: null, capacity: 10, mapPositionX: 220, mapPositionY: -60, width: 40, height: 30, colorCode: "#6B7280", equipment: ["sports_equipment"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ] as unknown as Room[]);

  private mockFloors: Floor[] = [
    { id: "1", buildingId: "1", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", buildingId: "2", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  // User operations
  private mockUsers: User[] = [];

  // In-memory log stores (persists for server lifetime)
  private loginLogs: any[] = [];
  private appLogs: any[] = [];
  private easterEggDiscoveries: any[] = [];

  async getUser(id: string): Promise<User | undefined> { 
    return this.mockUsers.find(u => u.id === id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> { 
    return this.mockUsers.find(u => u.email === email);
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> { 
    const existingIndex = this.mockUsers.findIndex(u => u.id === userData.id || u.email === userData.email);
    
    const user: User = {
      id: userData.id || `user-${Date.now()}`,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'user',
      password: userData.password || null,
      isTemporaryPassword: userData.isTemporaryPassword || null,
      canLoginToKsykMaps: userData.canLoginToKsykMaps ?? null,
      twoFactorSecret: userData.twoFactorSecret || null,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorBackupCodes: userData.twoFactorBackupCodes || null,
      passwordResetToken: userData.passwordResetToken || null,
      passwordResetExpiry: userData.passwordResetExpiry || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (existingIndex >= 0) {
      this.mockUsers[existingIndex] = user;
    } else {
      this.mockUsers.push(user);
    }
    
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.mockUsers;
  }

  async deleteUser(id: string): Promise<void> {
    const index = this.mockUsers.findIndex(u => u.id === id);
    if (index >= 0) {
      this.mockUsers.splice(index, 1);
    }
  }

  // Building operations
  async getBuildings(): Promise<Building[]> { return this.mockBuildings; }
  async getBuilding(id: string): Promise<Building | undefined> { return this.mockBuildings.find(b => b.id === id); }
  async createBuilding(building: InsertBuilding): Promise<Building> { throw new Error("Not implemented"); }
  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> { throw new Error("Not implemented"); }
  async deleteBuilding(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Floor operations  
  async getFloors(buildingId?: string): Promise<Floor[]> { return this.mockFloors; }
  async getFloor(id: string): Promise<Floor | undefined> { return this.mockFloors.find(f => f.id === id); }
  async createFloor(floor: InsertFloor): Promise<Floor> { throw new Error("Not implemented"); }
  async updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor> { throw new Error("Not implemented"); }
  async deleteFloor(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Room operations
  async getRooms(buildingId?: string): Promise<Room[]> { return this.mockRooms; }
  async getRoom(id: string): Promise<Room | undefined> { return this.mockRooms.find(r => r.id === id); }
  async createRoom(room: InsertRoom): Promise<Room> {
    // Cast newRoom via `as unknown as Room` — the Room shape has many
    // extra optional fields (currentStatus, virtualTourUrl, photos,
    // isBookable, etc) we don't seed here; nulls are the runtime default.
    const newRoom = {
      id: (this.mockRooms.length + 1).toString(),
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      name: room.name || null,
      nameEn: room.nameEn || null,
      nameFi: room.nameFi || null,
      floor: room.floor ?? 1,
      capacity: room.capacity ?? null,
      type: room.type ?? 'classroom',
      subType: room.subType || null,
      equipment: room.equipment || null,
      features: room.features || null,
      mapPositionX: room.mapPositionX || null,
      mapPositionY: room.mapPositionY || null,
      width: room.width || null,
      height: room.height || null,
      colorCode: room.colorCode || "#6B7280",
      emergencyInfo: room.emergencyInfo || null,
      accessibilityInfo: room.accessibilityInfo || null,
      maintenanceNotes: room.maintenanceNotes || null,
      lastInspected: room.lastInspected || null,
      isPublic: room.isPublic ?? true,
      isAccessible: room.isAccessible ?? true,
      isActive: room.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as unknown as Room;
    this.mockRooms.push(newRoom);
    return newRoom;
  }
  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const index = this.mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Room not found");
    this.mockRooms[index] = { ...this.mockRooms[index], ...room, updatedAt: new Date() };
    return this.mockRooms[index];
  }
  async deleteRoom(id: string): Promise<void> { 
    const index = this.mockRooms.findIndex(r => r.id === id);
    if (index !== -1) {
      this.mockRooms[index].isActive = false;
    }
  }
  async searchRooms(query: string): Promise<Room[]> { return this.mockRooms.filter(r => r.roomNumber.includes(query)); }

  // Hallway operations
  async getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]> { return []; }
  async getHallway(id: string): Promise<Hallway | undefined> { return undefined; }
  async createHallway(hallway: InsertHallway): Promise<Hallway> { throw new Error("Not implemented"); }
  async updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway> { throw new Error("Not implemented"); }
  async deleteHallway(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Staff operations
  async getStaff(): Promise<Staff[]> { return []; }
  async getStaffMember(id: string): Promise<Staff | undefined> { return undefined; }
  async createStaffMember(staff: InsertStaff): Promise<Staff> { throw new Error("Not implemented"); }
  async updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff> { throw new Error("Not implemented"); }
  async deleteStaffMember(id: string): Promise<void> { throw new Error("Not implemented"); }
  async searchStaff(query: string, department?: string): Promise<Staff[]> { return []; }

  // Event operations
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> { return []; }
  async getEvent(id: string): Promise<Event | undefined> { return undefined; }
  async createEvent(event: InsertEvent): Promise<Event> { throw new Error("Not implemented"); }
  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> { throw new Error("Not implemented"); }
  async deleteEvent(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Announcement operations
  private mockAnnouncements: Announcement[] = [];
  
  async getAnnouncements(limit?: number): Promise<Announcement[]> { 
    return this.mockAnnouncements.slice(0, limit || 10); 
  }
  
  async getAnnouncement(id: string): Promise<Announcement | undefined> { 
    return this.mockAnnouncements.find(a => a.id === id); 
  }
  
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> { 
    const newAnnouncement: Announcement = {
      id: `announcement-${Date.now()}`,
      ...announcement,
      isActive: announcement.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Announcement;
    this.mockAnnouncements.push(newAnnouncement);
    return newAnnouncement;
  }
  
  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> { 
    const index = this.mockAnnouncements.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Announcement not found");
    this.mockAnnouncements[index] = { ...this.mockAnnouncements[index], ...announcement, updatedAt: new Date() } as Announcement;
    return this.mockAnnouncements[index];
  }
  
  async deleteAnnouncement(id: string): Promise<void> { 
    const index = this.mockAnnouncements.findIndex(a => a.id === id);
    if (index !== -1) {
      this.mockAnnouncements.splice(index, 1);
    }
  }

  // Ticket operations
  private mockTickets: any[] = [];
  
  async getTickets(): Promise<any[]> {
    return this.mockTickets;
  }
  
  async getTicket(id: string): Promise<any | undefined> {
    return this.mockTickets.find(t => t.id === id);
  }
  
  async createTicket(ticket: any): Promise<any> {
    const newTicket = {
      id: `ticket-${Date.now()}`,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockTickets.push(newTicket);
    return newTicket;
  }
  
  async updateTicket(id: string, ticket: any): Promise<any> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Ticket not found");
    this.mockTickets[index] = { ...this.mockTickets[index], ...ticket, updatedAt: new Date() };
    return this.mockTickets[index];
  }
  
  async deleteTicket(id: string): Promise<void> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTickets.splice(index, 1);
    }
  }

  // App Settings operations
  // AppSettings has grown ~30 feature-flag fields (enableEasterEgg,
  // enableEvents, enableTicketSystem, backupFrequencyHours, etc) not
  // populated in this mock. Cast through unknown — nulls are fine at
  // runtime for the fields we don't seed.
  private mockAppSettings: AppSettings = ({
    id: 'default',
    appName: 'KSYK Map',
    appNameEn: 'KSYK Map',
    appNameFi: 'KSYK Kartta',
    logoUrl: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#F59E0B',
    successColor: '#10B981',
    warningColor: '#EF4444',
    theme: 'light',
    headerTitle: 'Campus Map',
    headerTitleEn: 'Campus Map',
    headerTitleFi: 'Kampuskartta',
    footerText: null,
    footerTextEn: null,
    footerTextFi: null,
    contactEmail: null,
    contactPhone: null,
    showStats: true,
    showAnnouncements: true,
    enableSearch: true,
    enableAnimations: true,
    enableAutoSave: true,
    compactMode: false,
    defaultLanguage: 'en',
    aiSensitivity: '0.7',
    enableSmartSnap: true,
    enableRoomAutoCreation: false,
    cacheMinutes: 30,
    maxImageSizeMB: 10,
    enablePreloadImages: true,
    enableLazyLoading: true,
    defaultZoomLevel: '1.0',
    updatedAt: new Date()
  } as unknown as AppSettings);

  async getAppSettings(): Promise<AppSettings> {
    return this.mockAppSettings;
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    this.mockAppSettings = { ...this.mockAppSettings, ...settings, updatedAt: new Date() };
    return this.mockAppSettings;
  }

  // Admin Login Log operations
  async createAdminLoginLog(log: {
    userId: string | null;
    email: string;
    userName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    loginStatus: 'success' | 'failed';
    failureReason?: string | null;
    sessionId?: string | null;
  }): Promise<void> {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...log,
      createdAt: new Date(),
    };
    this.loginLogs.unshift(entry);
    if (this.loginLogs.length > 500) this.loginLogs.length = 500;
  }

  async getAdminLoginLogs(limit: number = 100): Promise<any[]> {
    return this.loginLogs.slice(0, limit);
  }

  // App Log operations
  async createAppLog(log: {
    level?: string;
    type?: string;
    message: string;
    details?: string | null;
    timestamp?: Date;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    action?: string | null;
    userName?: string | null;
  }): Promise<void> {
    const entry = {
      id: `alog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...log,
      level: log.level ?? log.type ?? 'info',
      createdAt: new Date(),
    };
    this.appLogs.unshift(entry);
    if (this.appLogs.length > 1000) this.appLogs.length = 1000;
  }

  async getAppLogs(limit: number = 100): Promise<any[]> {
    return this.appLogs.slice(0, limit);
  }

  async trackEasterEggDiscovery(data: { eggId: string; eggName: string; userId: string; timestamp: string }): Promise<void> {
    this.easterEggDiscoveries.unshift({ ...data, id: `egg-${Date.now()}` });
    if (this.easterEggDiscoveries.length > 500) this.easterEggDiscoveries.length = 500;
  }

  async getEasterEggStats(): Promise<any> {
    const counts: Record<string, { name: string; count: number; lastFound: string }> = {};
    for (const d of this.easterEggDiscoveries) {
      if (!counts[d.eggId]) counts[d.eggId] = { name: d.eggName, count: 0, lastFound: d.timestamp };
      counts[d.eggId].count++;
    }
    return {
      totalDiscoveries: this.easterEggDiscoveries.length,
      uniqueEggs: Object.keys(counts).length,
      byEgg: Object.entries(counts).map(([id, v]) => ({ id, ...v })),
      recent: this.easterEggDiscoveries.slice(0, 20),
    };
  }

  // Analytics methods - mock implementations for in-memory storage
  async createPageView(view: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createSearchAnalytic(search: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createNavigationAnalytic(navigation: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createUserSession(session: any): Promise<void> {
    // Mock implementation - no-op
  }

  async updateUserSession(sessionId: string, updates: any): Promise<void> {
    // Mock implementation - no-op
  }

  async getAnalyticsSummary(days: number = 30): Promise<any> {
    // Mock analytics data
    return {
      totalVisitors: 1250,
      totalPageViews: 3450,
      totalSearches: 890,
      totalNavigationRequests: 234,
      topCountries: [
        { country: 'Finland', count: 850 },
        { country: 'Sweden', count: 120 },
        { country: 'Norway', count: 95 }
      ],
      topBrowsers: [
        { browser: 'Chrome', count: 780 },
        { browser: 'Safari', count: 320 },
        { browser: 'Firefox', count: 150 }
      ],
      peakHours: [10, 11, 12, 13, 14],
      avgSessionDuration: 245 // seconds
    };
  }

  async getTopSearches(limit: number = 10): Promise<any[]> {
    // Mock top searches
    return [
      { query: 'M12', count: 45, type: 'room' },
      { query: 'music room', count: 32, type: 'room' },
      { query: 'K15', count: 28, type: 'room' },
      { query: 'library', count: 25, type: 'room' },
      { query: 'gym', count: 22, type: 'building' }
    ];
  }

  async getPopularRooms(limit: number = 10): Promise<any[]> {
    // Mock popular rooms
    return [
      { roomId: '1', roomNumber: 'M12', building: 'Music Building', visits: 95 },
      { roomId: '2', roomNumber: 'K15', building: 'Central Hall', visits: 87 },
      { roomId: '3', roomNumber: 'L20', building: 'Gymnasium', visits: 79 },
      { roomId: '4', roomNumber: 'R12', building: 'R Building', visits: 65 },
      { roomId: '5', roomNumber: 'A15', building: 'A Building', visits: 58 }
    ];
  }

  async getVisitorStats(days: number = 30): Promise<any> {
    // Mock visitor stats
    return {
      uniqueVisitors: 1250,
      returningVisitors: 340,
      newVisitors: 910,
      bounceRate: 0.23,
      avgPagesPerSession: 2.8,
      topReferrers: [
        { referrer: 'Direct', count: 650 },
        { referrer: 'Google', count: 280 },
        { referrer: 'School Website', count: 180 }
      ]
    };
  }

  // ============================================
  // MISSING METHOD IMPLEMENTATIONS (STUBS)
  // ============================================
  
  // Wilma User operations
  async getWilmaUsers(role?: string): Promise<any[]> { return []; }
  async getWilmaUser(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaUser(wilmaUser: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaUser(id: string, wilmaUser: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaUser(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getWilmaUserByStudentId(studentId: string): Promise<any | undefined> { return undefined; }
  async getWilmaUserByUsername(username: string): Promise<any | undefined> { return undefined; }
  
  // Wilma Schedule operations
  async getWilmaSchedules(studentId?: string): Promise<any[]> { return []; }
  async getWilmaSchedulesAll(): Promise<any[]> { return []; }
  async createWilmaSchedule(scheduleData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaSchedule(id: string, scheduleData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaSchedule(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Attendance operations
  async getWilmaAttendance(studentId?: string): Promise<any[]> { return []; }
  async getWilmaAttendanceByClass(classId: string): Promise<any[]> { return []; }
  async createWilmaAttendance(attendanceData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaAttendance(id: string, attendanceData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaAttendance(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Grades operations
  async getWilmaGrades(studentId?: string): Promise<any[]> { return []; }
  async createWilmaGrade(gradeData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaGrade(id: string, gradeData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaGrade(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Assignments operations
  async getWilmaAssignments(studentId?: string): Promise<any[]> { return []; }
  async getWilmaAssignmentsByClass(classId: string): Promise<any[]> { return []; }
  async createWilmaAssignment(assignmentData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaAssignment(id: string, assignmentData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaAssignment(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Messages operations
  async getWilmaMessagesAll(userId?: string): Promise<any[]> { return []; }
  async createWilmaMessage(messageData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaMessage(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async markWilmaMessageAsRead(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Settings operations
  async getWilmaSettings(): Promise<any | undefined> { return undefined; }
  async updateWilmaSettings(settings: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  // Parent-Child linking operations
  async linkParentToChild(parentId: string, childId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async unlinkParentFromChild(parentId: string, childId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getChildrenForParent(parentId: string): Promise<any[]> { return []; }
  async getParentsForChild(childId: string): Promise<any[]> { return []; }
  
  // Homework Extended operations
  async getWilmaHomeworkExtendedAll(): Promise<any[]> { return []; }
  
  // Wilma Classes operations
  async getWilmaClasses(year?: string): Promise<any[]> { return []; }
  async getWilmaClass(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaClass(classData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaClass(id: string, classData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaClass(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Courses operations
  async getWilmaCourses(teacherId?: string, classId?: string): Promise<any[]> { return []; }
  async getWilmaCourse(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaCourse(courseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaCourse(id: string, courseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaCourse(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Lesson Journal operations
  async getWilmaLessonJournals(courseId?: string, teacherId?: string, date?: string): Promise<any[]> { return []; }
  async getWilmaLessonJournal(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaLessonJournal(journalData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaLessonJournal(id: string, journalData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaLessonJournal(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Homework Extended operations
  async getWilmaHomeworkExtended(courseId?: string, teacherId?: string): Promise<any[]> { return []; }
  async getWilmaHomeworkExtendedById(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaHomeworkExtended(homeworkData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaHomeworkExtended(id: string, homeworkData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaHomeworkExtended(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Homework Submissions operations
  async getWilmaHomeworkSubmissions(homeworkId?: string, studentId?: string): Promise<any[]> { return []; }
  async getWilmaHomeworkSubmission(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaHomeworkSubmission(submissionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaHomeworkSubmission(id: string, submissionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaHomeworkSubmission(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Exams Extended operations
  async getWilmaExamsExtended(courseId?: string, teacherId?: string): Promise<any[]> { return []; }
  async getWilmaExamExtended(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaExamExtended(examData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaExamExtended(id: string, examData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaExamExtended(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Exam Results operations
  async getWilmaExamResults(examId?: string, studentId?: string): Promise<any[]> { return []; }
  async getWilmaExamResult(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaExamResult(resultData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaExamResult(id: string, resultData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaExamResult(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Behavior Notes operations
  async getWilmaBehaviorNotes(studentId?: string, teacherId?: string): Promise<any[]> { return []; }
  async getWilmaBehaviorNote(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaBehaviorNote(noteData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaBehaviorNote(id: string, noteData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaBehaviorNote(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Notifications operations
  async getWilmaNotifications(userId: string, unreadOnly?: boolean): Promise<any[]> { return []; }
  async getWilmaNotification(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaNotification(notificationData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaNotification(id: string, notificationData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async markWilmaNotificationAsRead(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async markAllWilmaNotificationsAsRead(userId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaNotification(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Dashboard Preferences operations
  async saveWilmaDashboardPreferences(userId: string, preferences: any): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getWilmaDashboardPreferences(userId: string): Promise<any | null> { return null; }
  
  // Wilma Calendar Events operations
  async getWilmaCalendarEvents(userId?: string, startDate?: string, endDate?: string): Promise<any[]> { return []; }
  async getWilmaCalendarEvent(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaCalendarEvent(eventData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaCalendarEvent(id: string, eventData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaCalendarEvent(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Wilma Analytics operations
  async createWilmaAnalytic(analyticData: any): Promise<void> { /* no-op */ }
  async getWilmaAnalytics(userId?: string, eventType?: string, days?: number): Promise<any[]> { return []; }
  async getWilmaAnalyticsSummary(days?: number): Promise<any> { return {}; }
  
  // Wilma AI Interactions operations
  async createWilmaAiInteraction(interactionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async getWilmaAiInteractions(userId?: string, featureType?: string): Promise<any[]> { return []; }
  async updateWilmaAiInteraction(id: string, interactionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async getWilmaAiUsageStats(days?: number): Promise<any> { return {}; }
  
  // Desktop Settings operations
  async getWilmaDesktopSettings(): Promise<any | undefined> { return undefined; }
  async updateWilmaDesktopSettings(settings: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  // Desktop Apps operations
  async getWilmaDesktopApps(): Promise<any[]> { return []; }
  async getWilmaDesktopApp(id: number): Promise<any | undefined> { return undefined; }
  async createWilmaDesktopApp(appData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaDesktopApp(id: number, appData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaDesktopApp(id: number): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // User Desktop Config operations
  async getWilmaUserDesktopConfig(userId: number): Promise<any | undefined> { return undefined; }
  async createWilmaUserDesktopConfig(configData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaUserDesktopConfig(userId: number, configData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  // Detention operations
  async getWilmaDetentions(): Promise<any[]> { return []; }
  async getWilmaDetention(id: string): Promise<any | undefined> { return undefined; }
  async createWilmaDetention(detentionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateWilmaDetention(id: string, detentionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteWilmaDetention(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  // Staff operations (alias for deleteStaffMember)
  async deleteStaff(id: string): Promise<void> { 
    return this.deleteStaffMember(id);
  }
  
  // User operations (getUsers - returns all users)
  async getUsers(): Promise<User[]> {
    return this.getAllUsers();
  }
  
  // Analytics operations
  async createAnalyticsEvent(event: any): Promise<void> { /* no-op */ }
  async getLiveAnalytics(): Promise<any> { return {}; }
  async getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]> { return []; }
  async getPerformanceMetrics(timeRange: string): Promise<any> { return {}; }
  
  // ============================================
  // CODING PLATFORM OPERATIONS (STUBS)
  // ============================================
  
  async getCodingCourses(): Promise<any[]> { return []; }
  async getCodingCourse(id: string): Promise<any | undefined> { return undefined; }
  async createCodingCourse(courseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingCourse(id: string, courseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingCourse(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingModules(courseId: string): Promise<any[]> { return []; }
  async getCodingModule(id: string): Promise<any | undefined> { return undefined; }
  async createCodingModule(moduleData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingModule(id: string, moduleData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingModule(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingLessons(moduleId: string): Promise<any[]> { return []; }
  async getCodingLesson(id: string): Promise<any | undefined> { return undefined; }
  async createCodingLesson(lessonData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingLesson(id: string, lessonData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingLesson(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingExercises(lessonId: string): Promise<any[]> { return []; }
  async getCodingExercise(id: string): Promise<any | undefined> { return undefined; }
  async createCodingExercise(exerciseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingExercise(id: string, exerciseData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingExercise(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingUserProgress(userId: string, courseId?: string): Promise<any[]> { return []; }
  async getCodingUserProgressByCourse(userId: string, courseId: string): Promise<any | undefined> { return undefined; }
  async createCodingUserProgress(progressData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingUserProgress(id: string, progressData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingSubmissions(userId: string, exerciseId?: string): Promise<any[]> { return []; }
  async createCodingSubmission(submissionData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingClassrooms(teacherId?: string): Promise<any[]> { return []; }
  async getCodingClassroom(id: string): Promise<any | undefined> { return undefined; }
  async getCodingClassroomByJoinCode(joinCode: string): Promise<any | undefined> { return undefined; }
  async createCodingClassroom(classroomData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingClassroom(id: string, classroomData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingClassroom(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async joinCodingClassroom(classroomId: string, studentId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async leaveCodingClassroom(classroomId: string, studentId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingClassroomAssignments(classroomId: string): Promise<any[]> { return []; }
  async createCodingClassroomAssignment(assignmentData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingClassroomAssignment(id: string, assignmentData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async deleteCodingClassroomAssignment(id: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingUserStats(userId: string): Promise<any | undefined> { return undefined; }
  async createCodingUserStats(statsData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async updateCodingUserStats(userId: string, statsData: any): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  
  async getCodingLeaderboard(type: string, period?: string, limit?: number): Promise<any[]> { return []; }
  async updateCodingLeaderboard(leaderboardData: any): Promise<void> { /* no-op */ }
}

// Create storage factory function
async function createStorage(): Promise<IStorage> {
  // Debug env vars
  console.log('🔧 Storage initialization - Environment check:');
  console.log('  USE_FIREBASE:', process.env.USE_FIREBASE);
  console.log('  Has FIREBASE_SERVICE_ACCOUNT:', !!process.env.FIREBASE_SERVICE_ACCOUNT);
  console.log('  FIREBASE_SERVICE_ACCOUNT length:', process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0);
  console.log('  Has DATABASE_URL:', !!process.env.DATABASE_URL);
  
  // Check if we should use Firebase
  if (process.env.USE_FIREBASE === 'true') {
    console.log('🔥 USE_FIREBASE is true, attempting to load Firebase...');
    try {
      const { firebaseStorage } = await import('./firebaseStorage.js');
      console.log('✅ Firebase storage module loaded');
      
      // Test Firebase connection by trying to get buildings
      try {
        const testBuildings = await firebaseStorage.getBuildings();
        console.log(`✅ Firebase connection verified - found ${testBuildings.length} buildings`);
        return firebaseStorage;
      } catch (testError) {
        console.error('❌ Firebase connection test failed:', testError);
        throw testError;
      }
    } catch (error) {
      console.error('❌ Firebase not available, falling back to mock storage:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
    }
  } else {
    console.log('ℹ️ USE_FIREBASE not set to true, using mock storage');
  }
  
  // Check if we should use PostgreSQL
  if (process.env.DATABASE_URL) {
    try {
      const { DatabaseStorage } = await import('./postgresStorage.js');
      console.log('✅ Using PostgreSQL storage');
      // DatabaseStorage is a partial IStorage — only ~60% of methods are
      // implemented (Wilma journals, easter-egg tracking etc are stubs).
      // Cast to IStorage; the underlying app rarely hits Postgres paths
      // and the missing methods return sensible defaults.
      return new DatabaseStorage() as unknown as IStorage;
    } catch (error) {
      console.warn('⚠️ PostgreSQL not available, falling back to mock storage:', error);
    }
  }
  
  console.log('📦 Using mock storage for development');
  return new MemStorage();
}

export const storage = await createStorage();
