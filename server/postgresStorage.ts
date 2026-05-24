import {
  users,
  buildings,
  floors,
  hallways,
  rooms,
  staff,
  events,
  announcements,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, or, gt, isNull } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Building operations
  async getBuildings(): Promise<Building[]> {
    return await db.select().from(buildings).where(eq(buildings.isActive, true));
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building;
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    const [newBuilding] = await db.insert(buildings).values(building).returning();
    return newBuilding;
  }

  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> {
    const [updatedBuilding] = await db
      .update(buildings)
      .set({ ...building, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();
    return updatedBuilding;
  }

  async deleteBuilding(id: string): Promise<void> {
    await db.update(buildings).set({ isActive: false }).where(eq(buildings.id, id));
  }

  // Floor operations
  async getFloors(buildingId?: string): Promise<Floor[]> {
    if (buildingId) {
      return await db.select().from(floors).where(and(eq(floors.isActive, true), eq(floors.buildingId, buildingId)));
    }
    return await db.select().from(floors).where(eq(floors.isActive, true));
  }

  async getFloor(id: string): Promise<Floor | undefined> {
    const [floor] = await db.select().from(floors).where(eq(floors.id, id));
    return floor;
  }

  async createFloor(floor: InsertFloor): Promise<Floor> {
    const [newFloor] = await db.insert(floors).values(floor).returning();
    return newFloor;
  }

  async updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor> {
    const [updatedFloor] = await db
      .update(floors)
      .set({ ...floor, updatedAt: new Date() })
      .where(eq(floors.id, id))
      .returning();
    return updatedFloor;
  }

  async deleteFloor(id: string): Promise<void> {
    await db.update(floors).set({ isActive: false }).where(eq(floors.id, id));
  }

  // Hallway operations
  async getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]> {
    let conditions = [eq(hallways.isActive, true)];
    
    if (buildingId) {
      conditions.push(eq(hallways.buildingId, buildingId));
    }
    if (floorId) {
      conditions.push(eq(hallways.floorId, floorId));
    }
    
    return await db.select().from(hallways).where(and(...conditions));
  }

  async getHallway(id: string): Promise<Hallway | undefined> {
    const [hallway] = await db.select().from(hallways).where(eq(hallways.id, id));
    return hallway;
  }

  async createHallway(hallway: InsertHallway): Promise<Hallway> {
    const [newHallway] = await db.insert(hallways).values(hallway).returning();
    return newHallway;
  }

  async updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway> {
    const [updatedHallway] = await db
      .update(hallways)
      .set({ ...hallway, updatedAt: new Date() })
      .where(eq(hallways.id, id))
      .returning();
    return updatedHallway;
  }

  async deleteHallway(id: string): Promise<void> {
    await db.update(hallways).set({ isActive: false }).where(eq(hallways.id, id));
  }

  // Room operations
  async getRooms(buildingId?: string): Promise<Room[]> {
    if (buildingId) {
      return await db.select().from(rooms).where(and(eq(rooms.isActive, true), eq(rooms.buildingId, buildingId)));
    }
    return await db.select().from(rooms).where(eq(rooms.isActive, true));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<void> {
    await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, id));
  }

  async searchRooms(query: string): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.isActive, true),
          or(
            like(rooms.roomNumber, `%${query}%`),
            like(rooms.name, `%${query}%`),
            like(rooms.nameEn, `%${query}%`),
            like(rooms.nameFi, `%${query}%`)
          )
        )
      );
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.isActive, true));
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async createStaffMember(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaffMember(id: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaffMember(id: string): Promise<void> {
    await db.update(staff).set({ isActive: false }).where(eq(staff.id, id));
  }

  async searchStaff(query: string, department?: string): Promise<Staff[]> {
    let whereConditions = and(
      eq(staff.isActive, true),
      or(
        like(staff.firstName, `%${query}%`),
        like(staff.lastName, `%${query}%`),
        like(staff.position, `%${query}%`),
        like(staff.positionEn, `%${query}%`),
        like(staff.positionFi, `%${query}%`)
      )
    );

    if (department) {
      whereConditions = and(
        whereConditions,
        or(
          like(staff.department, `%${department}%`),
          like(staff.departmentEn, `%${department}%`),
          like(staff.departmentFi, `%${department}%`)
        )
      );
    }

    return await db.select().from(staff).where(whereConditions);
  }

  // Event operations
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    if (startDate && endDate) {
      return await db.select().from(events)
        .where(
          and(
            eq(events.isActive, true),
            and(
              eq(events.startTime, startDate),
              eq(events.endTime, endDate)
            )
          )
        )
        .orderBy(desc(events.startTime));
    }
    
    return await db.select().from(events)
      .where(eq(events.isActive, true))
      .orderBy(desc(events.startTime));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.update(events).set({ isActive: false }).where(eq(events.id, id));
  }

  // Announcement operations
  async getAnnouncements(limit = 10): Promise<Announcement[]> {
    const now = new Date();
    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          or(
            isNull(announcements.expiresAt),
            gt(announcements.expiresAt, now)
          )
        )
      )
      .orderBy(desc(announcements.createdAt))
      .limit(limit);
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set({ ...announcement, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.update(announcements).set({ isActive: false }).where(eq(announcements.id, id));
  }

  // App Settings operations
  async getAppSettings(): Promise<any> {
    // Return default settings since PostgreSQL doesn't have app settings table
    return {
      id: 'default',
      appName: 'KSYK Map',
      appNameEn: 'KSYK Map',
      appNameFi: 'KSYK Kartta',
      logoUrl: '/ksykmaps_logo.png',
      primaryColor: '#3B82F6',
      secondaryColor: '#2563EB',
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
      defaultLanguage: 'en',
      updatedAt: new Date()
    };
  }

  async updateAppSettings(settings: any): Promise<any> {
    // Return the settings as-is since PostgreSQL doesn't have app settings table
    return {
      ...await this.getAppSettings(),
      ...settings,
      updatedAt: new Date()
    };
  }

  // Ticket operations (stub implementations)
  async getTickets(): Promise<any[]> {
    return [];
  }

  async getTicket(id: string): Promise<any | undefined> {
    return undefined;
  }

  async createTicket(ticket: any): Promise<any> {
    return ticket;
  }

  async updateTicket(id: string, ticket: any): Promise<any> {
    return ticket;
  }

  async deleteTicket(id: string): Promise<void> {
    // No-op
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
    console.log('📝 Admin Login Log:', {
      ...log,
      timestamp: new Date().toISOString()
    });
  }

  async getAdminLoginLogs(limit?: number): Promise<any[]> {
    return [];
  }

  // App Log operations
  async createAppLog(log: {
    type: string;
    message: string;
    details?: string | null;
    timestamp: Date;
  }): Promise<void> {
    console.log(`📝 App Log [${log.type.toUpperCase()}]:`, log.message);
    if (log.details) {
      console.log('  Details:', log.details);
    }
  }

  // ============================================
  // MISSING METHODS IMPLEMENTATIONS
  // ============================================

  // Analytics operations
  async createPageView(view: any): Promise<void> {
    console.log('📊 Page View:', view);
  }

  async createSearchAnalytic(search: any): Promise<void> {
    console.log('🔍 Search Analytic:', search);
  }

  async createNavigationAnalytic(navigation: any): Promise<void> {
    console.log('🧭 Navigation Analytic:', navigation);
  }

  async createUserSession(session: any): Promise<void> {
    console.log('👤 User Session:', session);
  }

  async updateUserSession(sessionId: string, updates: any): Promise<void> {
    console.log('🔄 Update Session:', sessionId, updates);
  }

  async getAnalyticsSummary(days?: number): Promise<any> {
    return { totalViews: 0, totalUsers: 0, avgSessionDuration: 0 };
  }

  async getLiveAnalytics(): Promise<any> {
    return { activeUsers: 0, pageViews: 0 };
  }

  async getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]> {
    return [];
  }

  async getPerformanceMetrics(timeRange: string): Promise<any> {
    return { avgLoadTime: 0, errorRate: 0 };
  }

  async getTopSearches(limit?: number): Promise<any[]> {
    return [];
  }

  async getPopularRooms(limit?: number): Promise<any[]> {
    return [];
  }

  async getVisitorStats(days?: number): Promise<any> {
    return { totalVisitors: 0, uniqueVisitors: 0 };
  }

  async createAnalyticsEvent(event: any): Promise<void> {
    console.log('📊 Analytics Event:', event);
  }

  // Wilma User operations
  async getWilmaUsers(role?: string): Promise<any[]> {
    return [];
  }

  async getWilmaUser(id: string): Promise<any | undefined> {
    return undefined;
  }

  async createWilmaUser(wilmaUser: any): Promise<any> {
    return wilmaUser;
  }

  async updateWilmaUser(id: string, wilmaUser: any): Promise<any> {
    return wilmaUser;
  }

  async deleteWilmaUser(id: string): Promise<void> {
    // No-op
  }

  async getWilmaUserByStudentId(studentId: string): Promise<any | undefined> {
    return undefined;
  }

  async getWilmaUserByUsername(username: string): Promise<any | undefined> {
    return undefined;
  }

  // Wilma Schedule operations
  async getWilmaSchedules(studentId?: string): Promise<any[]> {
    return [];
  }

  async getWilmaSchedulesAll(): Promise<any[]> {
    return [];
  }

  async createWilmaSchedule(scheduleData: any): Promise<any> {
    return scheduleData;
  }

  async updateWilmaSchedule(id: string, scheduleData: any): Promise<any> {
    return scheduleData;
  }

  async deleteWilmaSchedule(id: string): Promise<void> {
    // No-op
  }

  // Wilma Attendance operations
  async getWilmaAttendance(studentId?: string): Promise<any[]> {
    return [];
  }

  async getWilmaAttendanceByClass(classId: string): Promise<any[]> {
    return [];
  }

  async createWilmaAttendance(attendanceData: any): Promise<any> {
    return attendanceData;
  }

  async updateWilmaAttendance(id: string, attendanceData: any): Promise<any> {
    return attendanceData;
  }

  async deleteWilmaAttendance(id: string): Promise<void> {
    // No-op
  }

  // Wilma Grades operations
  async getWilmaGrades(studentId?: string): Promise<any[]> {
    return [];
  }

  async createWilmaGrade(gradeData: any): Promise<any> {
    return gradeData;
  }

  async updateWilmaGrade(id: string, gradeData: any): Promise<any> {
    return gradeData;
  }

  async deleteWilmaGrade(id: string): Promise<void> {
    // No-op
  }

  // Wilma Assignments operations
  async getWilmaAssignments(studentId?: string): Promise<any[]> {
    return [];
  }

  async getWilmaAssignmentsByClass(classId: string): Promise<any[]> {
    return [];
  }

  async createWilmaAssignment(assignmentData: any): Promise<any> {
    return assignmentData;
  }

  async updateWilmaAssignment(id: string, assignmentData: any): Promise<any> {
    return assignmentData;
  }

  async deleteWilmaAssignment(id: string): Promise<void> {
    // No-op
  }

  // Wilma Messages operations
  async getWilmaMessagesAll(userId?: string): Promise<any[]> {
    return [];
  }

  async createWilmaMessage(messageData: any): Promise<any> {
    return messageData;
  }

  async deleteWilmaMessage(id: string): Promise<void> {
    // No-op
  }

  async markWilmaMessageAsRead(id: string): Promise<void> {
    // No-op
  }

  // Wilma Settings operations
  async getWilmaSettings(): Promise<any | undefined> {
    return undefined;
  }

  async updateWilmaSettings(settings: any): Promise<any> {
    return settings;
  }

  // Parent-Child linking operations
  async linkParentToChild(parentId: string, childId: string): Promise<void> {
    console.log('🔗 Link Parent to Child:', parentId, childId);
  }

  async unlinkParentFromChild(parentId: string, childId: string): Promise<void> {
    console.log('🔗 Unlink Parent from Child:', parentId, childId);
  }

  async getChildrenForParent(parentId: string): Promise<any[]> {
    return [];
  }

  async getParentsForChild(childId: string): Promise<any[]> {
    return [];
  }

  // Wilma Extended operations
  async getWilmaClasses(year?: string): Promise<any[]> {
    return [];
  }

  async getWilmaClass(id: string): Promise<any | undefined> {
    return undefined;
  }

  async createWilmaClass(classData: any): Promise<any> {
    return classData;
  }

  async updateWilmaClass(id: string, classData: any): Promise<any> {
    return classData;
  }

  async deleteWilmaClass(id: string): Promise<void> {
    // No-op
  }

  async getWilmaCourses(teacherId?: string, classId?: string): Promise<any[]> {
    return [];
  }

  async getWilmaCourse(id: string): Promise<any | undefined> {
    return undefined;
  }

  async createWilmaCourse(courseData: any): Promise<any> {
    return courseData;
  }

  async updateWilmaCourse(id: string, courseData: any): Promise<any> {
    return courseData;
  }

  async deleteWilmaCourse(id: string): Promise<void> {
    // No-op
  }

  // Desktop operations
  async getWilmaDesktopSettings(): Promise<any | undefined> {
    return undefined;
  }

  async updateWilmaDesktopSettings(settings: any): Promise<any> {
    return settings;
  }

  async getWilmaDesktopApps(): Promise<any[]> {
    return [];
  }

  async getWilmaDesktopApp(id: number): Promise<any | undefined> {
    return undefined;
  }

  async createWilmaDesktopApp(appData: any): Promise<any> {
    return appData;
  }

  async updateWilmaDesktopApp(id: number, appData: any): Promise<any> {
    return appData;
  }

  async deleteWilmaDesktopApp(id: number): Promise<void> {
    // No-op
  }

  async getWilmaUserDesktopConfig(userId: number): Promise<any | undefined> {
    return undefined;
  }

  async createWilmaUserDesktopConfig(configData: any): Promise<any> {
    return configData;
  }

  async updateWilmaUserDesktopConfig(userId: number, configData: any): Promise<any> {
    return configData;
  }

  // Additional missing methods
  async deleteStaff(id: string): Promise<void> {
    await this.deleteStaffMember(id);
  }

  async getUsers(): Promise<User[]> {
    return await this.getAllUsers();
  }

  async getWilmaHomeworkExtendedAll(): Promise<any[]> {
    return [];
  }

  // Coding platform operations (stubs)
  async getCodingCourses(): Promise<any[]> { return []; }
  async getCodingCourse(id: string): Promise<any | undefined> { return undefined; }
  async createCodingCourse(courseData: any): Promise<any> { return courseData; }
  async updateCodingCourse(id: string, courseData: any): Promise<any> { return courseData; }
  async deleteCodingCourse(id: string): Promise<void> {}
  async getCodingModules(courseId: string): Promise<any[]> { return []; }
  async getCodingModule(id: string): Promise<any | undefined> { return undefined; }
  async createCodingModule(moduleData: any): Promise<any> { return moduleData; }
  async updateCodingModule(id: string, moduleData: any): Promise<any> { return moduleData; }
  async deleteCodingModule(id: string): Promise<void> {}
  async getCodingLessons(moduleId: string): Promise<any[]> { return []; }
  async getCodingLesson(id: string): Promise<any | undefined> { return undefined; }
  async createCodingLesson(lessonData: any): Promise<any> { return lessonData; }
  async updateCodingLesson(id: string, lessonData: any): Promise<any> { return lessonData; }
  async deleteCodingLesson(id: string): Promise<void> {}
  async getCodingExercises(lessonId: string): Promise<any[]> { return []; }
  async getCodingExercise(id: string): Promise<any | undefined> { return undefined; }
  async createCodingExercise(exerciseData: any): Promise<any> { return exerciseData; }
  async updateCodingExercise(id: string, exerciseData: any): Promise<any> { return exerciseData; }
  async deleteCodingExercise(id: string): Promise<void> {}
  async getCodingUserProgress(userId: string, courseId?: string): Promise<any[]> { return []; }
  async getCodingUserProgressByCourse(userId: string, courseId: string): Promise<any | undefined> { return undefined; }
  async createCodingUserProgress(progressData: any): Promise<any> { return progressData; }
  async updateCodingUserProgress(id: string, progressData: any): Promise<any> { return progressData; }
  async getCodingSubmissions(userId: string, exerciseId?: string): Promise<any[]> { return []; }
  async createCodingSubmission(submissionData: any): Promise<any> { return submissionData; }
  async getCodingClassrooms(teacherId?: string): Promise<any[]> { return []; }
  async getCodingClassroom(id: string): Promise<any | undefined> { return undefined; }
  async getCodingClassroomByJoinCode(joinCode: string): Promise<any | undefined> { return undefined; }
  async createCodingClassroom(classroomData: any): Promise<any> { return classroomData; }
  async updateCodingClassroom(id: string, classroomData: any): Promise<any> { return classroomData; }
  async deleteCodingClassroom(id: string): Promise<void> {}
  async joinCodingClassroom(classroomId: string, studentId: string): Promise<void> {}
  async leaveCodingClassroom(classroomId: string, studentId: string): Promise<void> {}
  async getCodingClassroomAssignments(classroomId: string): Promise<any[]> { return []; }
  async createCodingClassroomAssignment(assignmentData: any): Promise<any> { return assignmentData; }
  async updateCodingClassroomAssignment(id: string, assignmentData: any): Promise<any> { return assignmentData; }
  async deleteCodingClassroomAssignment(id: string): Promise<void> {}
  async getCodingUserStats(userId: string): Promise<any | undefined> { return undefined; }
  async createCodingUserStats(statsData: any): Promise<any> { return statsData; }
  async updateCodingUserStats(userId: string, statsData: any): Promise<any> { return statsData; }
  async getCodingLeaderboard(type: string, period?: string, limit?: number): Promise<any[]> { return []; }
  async updateCodingLeaderboard(leaderboardData: any): Promise<void> {}
}
