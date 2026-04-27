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
    level: string;
    message: string;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }): Promise<void>;
  
  getAppLogs(limit?: number): Promise<any[]>;
  
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
}



// Simple in-memory storage with mock data for KSYK campus
class MemStorage implements IStorage {
  private mockBuildings: Building[] = [
    { id: "1", name: "M", nameEn: "Music Building", nameFi: "Musiikkitalo", description: null, descriptionEn: "Music and arts education", descriptionFi: "Musiikin ja taiteen opetus", floors: 3, mapPositionX: -200, mapPositionY: 50, colorCode: "#9333EA", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", name: "K", nameEn: "Central Hall", nameFi: "Keskushalli", description: null, descriptionEn: "Main building", descriptionFi: "Päärakennus", floors: 3, mapPositionX: 100, mapPositionY: 0, colorCode: "#DC2626", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "3", name: "L", nameEn: "Gymnasium", nameFi: "Liikuntahalli", description: null, descriptionEn: "Sports and physical education", descriptionFi: "Urheilu ja liikuntakasvatus", floors: 2, mapPositionX: 350, mapPositionY: 80, colorCode: "#059669", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "4", name: "R", nameEn: "R Building", nameFi: "R-rakennus", description: null, descriptionEn: "Research and laboratories", descriptionFi: "Tutkimus ja laboratoriot", floors: 3, mapPositionX: -50, mapPositionY: 200, colorCode: "#F59E0B", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "5", name: "A", nameEn: "A Building", nameFi: "A-rakennus", description: null, descriptionEn: "Administration and offices", descriptionFi: "Hallinto ja toimistot", floors: 3, mapPositionX: 250, mapPositionY: 180, colorCode: "#8B5CF6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "6", name: "U", nameEn: "U Building", nameFi: "U-rakennus", description: null, descriptionEn: "University programs", descriptionFi: "Yliopisto-ohjelmat", floors: 3, mapPositionX: -100, mapPositionY: -120, colorCode: "#3B82F6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "7", name: "OG", nameEn: "Old Gymnasium", nameFi: "Vanha liikuntahalli", description: null, descriptionEn: "Historic sports facility", descriptionFi: "Historiallinen liikuntapaikka", floors: 2, mapPositionX: 200, mapPositionY: -80, colorCode: "#06B6D4", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  private mockRooms: Room[] = [
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
  ];

  private mockFloors: Floor[] = [
    { id: "1", buildingId: "1", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", buildingId: "2", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  // User operations
  private mockUsers: User[] = [];

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
      password: null,
      isTemporaryPassword: null,
      canLoginToKsykMaps: userData.canLoginToKsykMaps ?? null,
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
    const newRoom: Room = {
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
    };
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
  private mockAppSettings: AppSettings = {
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
    aiSensitivity: 0.7,
    enableSmartSnap: true,
    enableRoomAutoCreation: false,
    cacheMinutes: 30,
    maxImageSizeMB: 10,
    enablePreloadImages: true,
    enableLazyLoading: true,
    defaultZoomLevel: 1.0,
    updatedAt: new Date()
  };

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
    // In-memory storage - just log to console for now
    console.log('📝 Admin Login Log:', {
      ...log,
      timestamp: new Date().toISOString()
    });
  }

  async getAdminLoginLogs(limit?: number): Promise<any[]> {
    // In-memory storage - return empty array
    return [];
  }

  // App Log operations
  async createAppLog(log: {
    level: string;
    message: string;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    // In-memory storage - just log to console
    console.log(`📝 App Log [${log.level.toUpperCase()}]:`, log.message);
    if (log.errorReferenceId) {
      console.log('  Error Ref:', log.errorReferenceId);
    }
    if (log.errorStack) {
      console.log('  Stack:', log.errorStack.substring(0, 200));
    }
  }

  async getAppLogs(limit: number = 100): Promise<any[]> {
    // In-memory storage - return empty array
    return [];
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
      return new DatabaseStorage();
    } catch (error) {
      console.warn('⚠️ PostgreSQL not available, falling back to mock storage:', error);
    }
  }
  
  console.log('📦 Using mock storage for development');
  return new MemStorage();
}

export const storage = await createStorage();
