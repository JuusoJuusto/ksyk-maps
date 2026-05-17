
Object.defineProperty(exports, "__esModule", { value: true });

const {
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
  PrismaClientRustPanicError,
  PrismaClientInitializationError,
  PrismaClientValidationError,
  NotFoundError,
  getPrismaClient,
  sqltag,
  empty,
  join,
  raw,
  skip,
  Decimal,
  Debug,
  objectEnumValues,
  makeStrictEnum,
  Extensions,
  warnOnce,
  defineDmmfProperty,
  Public,
  getRuntime
} = require('./runtime/wasm.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = PrismaClientKnownRequestError;
Prisma.PrismaClientUnknownRequestError = PrismaClientUnknownRequestError
Prisma.PrismaClientRustPanicError = PrismaClientRustPanicError
Prisma.PrismaClientInitializationError = PrismaClientInitializationError
Prisma.PrismaClientValidationError = PrismaClientValidationError
Prisma.NotFoundError = NotFoundError
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = sqltag
Prisma.empty = empty
Prisma.join = join
Prisma.raw = raw
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = Extensions.getExtensionContext
Prisma.defineExtension = Extensions.defineExtension

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}





/**
 * Enums
 */
exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  avatar: 'avatar',
  role: 'role',
  googleId: 'googleId',
  microsoftId: 'microsoftId',
  subscriptionTier: 'subscriptionTier',
  subscriptionEndsAt: 'subscriptionEndsAt',
  emailVerified: 'emailVerified',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserProfileScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  gradeLevel: 'gradeLevel',
  school: 'school',
  country: 'country',
  language: 'language',
  timezone: 'timezone',
  learningStyle: 'learningStyle',
  studyGoals: 'studyGoals',
  weakTopics: 'weakTopics',
  strongTopics: 'strongTopics',
  difficultyLevel: 'difficultyLevel',
  learningSpeed: 'learningSpeed',
  confidenceLevel: 'confidenceLevel',
  predictedGrade: 'predictedGrade',
  burnoutRisk: 'burnoutRisk',
  darkMode: 'darkMode',
  notifications: 'notifications',
  soundEffects: 'soundEffects',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SessionScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.TaskScalarFieldEnum = {
  id: 'id',
  subject: 'subject',
  topic: 'topic',
  subtopic: 'subtopic',
  difficulty: 'difficulty',
  type: 'type',
  level: 'level',
  question: 'question',
  answer: 'answer',
  solution: 'solution',
  hints: 'hints',
  estimatedTime: 'estimatedTime',
  xpReward: 'xpReward',
  tags: 'tags',
  generatedBy: 'generatedBy',
  prompt: 'prompt',
  rating: 'rating',
  reportCount: 'reportCount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserTaskScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  taskId: 'taskId',
  answerSubmitted: 'answerSubmitted',
  isCorrect: 'isCorrect',
  timeSpent: 'timeSpent',
  hintsUsed: 'hintsUsed',
  attempts: 'attempts',
  confidence: 'confidence',
  difficulty: 'difficulty',
  xpEarned: 'xpEarned',
  completedAt: 'completedAt',
  createdAt: 'createdAt'
};

exports.Prisma.ConversationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  subject: 'subject',
  topic: 'topic',
  messageCount: 'messageCount',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  conversationId: 'conversationId',
  role: 'role',
  content: 'content',
  images: 'images',
  equations: 'equations',
  model: 'model',
  tokens: 'tokens',
  createdAt: 'createdAt'
};

exports.Prisma.UserXPScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  totalXP: 'totalXP',
  level: 'level',
  mathXP: 'mathXP',
  physicsXP: 'physicsXP',
  chemistryXP: 'chemistryXP',
  astronomyXP: 'astronomyXP',
  xpMultiplier: 'xpMultiplier',
  updatedAt: 'updatedAt'
};

exports.Prisma.UserStreakScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  currentStreak: 'currentStreak',
  longestStreak: 'longestStreak',
  lastActivityDate: 'lastActivityDate',
  freezesAvailable: 'freezesAvailable',
  freezesUsed: 'freezesUsed',
  updatedAt: 'updatedAt'
};

exports.Prisma.AchievementScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  category: 'category',
  rarity: 'rarity',
  criteria: 'criteria',
  xpReward: 'xpReward',
  createdAt: 'createdAt'
};

exports.Prisma.UserAchievementScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  achievementId: 'achievementId',
  unlockedAt: 'unlockedAt'
};

exports.Prisma.StudyPlanScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  description: 'description',
  subject: 'subject',
  topics: 'topics',
  startDate: 'startDate',
  endDate: 'endDate',
  completed: 'completed',
  progress: 'progress',
  isAIGenerated: 'isAIGenerated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EventScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  eventType: 'eventType',
  eventData: 'eventData',
  device: 'device',
  browser: 'browser',
  location: 'location',
  createdAt: 'createdAt'
};

exports.Prisma.ClassroomScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  code: 'code',
  schoolName: 'schoolName',
  gradeLevel: 'gradeLevel',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ClassroomMemberScalarFieldEnum = {
  id: 'id',
  classroomId: 'classroomId',
  userId: 'userId',
  role: 'role',
  joinedAt: 'joinedAt'
};

exports.Prisma.AssignmentScalarFieldEnum = {
  id: 'id',
  classroomId: 'classroomId',
  title: 'title',
  description: 'description',
  subject: 'subject',
  topics: 'topics',
  difficulty: 'difficulty',
  taskIds: 'taskIds',
  dueDate: 'dueDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeaderboardEntryScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  subject: 'subject',
  rank: 'rank',
  score: 'score',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  STUDENT: 'STUDENT',
  TEACHER: 'TEACHER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

exports.SubscriptionTier = exports.$Enums.SubscriptionTier = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
  SCHOOL: 'SCHOOL'
};

exports.Subject = exports.$Enums.Subject = {
  MATHEMATICS: 'MATHEMATICS',
  PHYSICS: 'PHYSICS',
  CHEMISTRY: 'CHEMISTRY',
  ASTRONOMY: 'ASTRONOMY'
};

exports.TaskType = exports.$Enums.TaskType = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  OPEN_ENDED: 'OPEN_ENDED',
  GRAPHING: 'GRAPHING',
  DERIVATION: 'DERIVATION',
  CALCULATION: 'CALCULATION',
  SIMULATION: 'SIMULATION',
  APPLICATION: 'APPLICATION'
};

exports.DifficultyLevel = exports.$Enums.DifficultyLevel = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  EXPERT: 'EXPERT'
};

exports.MessageRole = exports.$Enums.MessageRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  SYSTEM: 'SYSTEM'
};

exports.AchievementCategory = exports.$Enums.AchievementCategory = {
  TASKS_COMPLETED: 'TASKS_COMPLETED',
  STREAK: 'STREAK',
  MASTERY: 'MASTERY',
  SPEED: 'SPEED',
  ACCURACY: 'ACCURACY',
  SOCIAL: 'SOCIAL',
  SPECIAL: 'SPECIAL'
};

exports.AchievementRarity = exports.$Enums.AchievementRarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY'
};

exports.EventType = exports.$Enums.EventType = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  TASK_GENERATED: 'TASK_GENERATED',
  TASK_STARTED: 'TASK_STARTED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_ABANDONED: 'TASK_ABANDONED',
  TUTOR_MESSAGE_SENT: 'TUTOR_MESSAGE_SENT',
  TUTOR_HINT_REQUESTED: 'TUTOR_HINT_REQUESTED',
  XP_EARNED: 'XP_EARNED',
  LEVEL_UP: 'LEVEL_UP',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  STREAK_MAINTAINED: 'STREAK_MAINTAINED',
  STREAK_BROKEN: 'STREAK_BROKEN',
  SUBSCRIPTION_STARTED: 'SUBSCRIPTION_STARTED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED'
};

exports.ClassroomRole = exports.$Enums.ClassroomRole = {
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT'
};

exports.Prisma.ModelName = {
  User: 'User',
  UserProfile: 'UserProfile',
  Session: 'Session',
  Task: 'Task',
  UserTask: 'UserTask',
  Conversation: 'Conversation',
  Message: 'Message',
  UserXP: 'UserXP',
  UserStreak: 'UserStreak',
  Achievement: 'Achievement',
  UserAchievement: 'UserAchievement',
  StudyPlan: 'StudyPlan',
  Event: 'Event',
  Classroom: 'Classroom',
  ClassroomMember: 'ClassroomMember',
  Assignment: 'Assignment',
  LeaderboardEntry: 'LeaderboardEntry'
};
/**
 * Create the Client
 */
const config = {
  "generator": {
    "name": "client",
    "provider": {
      "fromEnvVar": null,
      "value": "prisma-client-js"
    },
    "output": {
      "value": "C:\\Users\\JuusoKaikula\\Downloads\\KSYK-Map\\STEM-tutorointi\\generated\\prisma",
      "fromEnvVar": null
    },
    "config": {
      "engineType": "library"
    },
    "binaryTargets": [
      {
        "fromEnvVar": null,
        "value": "windows",
        "native": true
      }
    ],
    "previewFeatures": [
      "driverAdapters"
    ],
    "sourceFilePath": "C:\\Users\\JuusoKaikula\\Downloads\\KSYK-Map\\STEM-tutorointi\\prisma\\schema.prisma",
    "isCustomOutput": true
  },
  "relativeEnvPaths": {
    "rootEnvPath": null
  },
  "relativePath": "../../prisma",
  "clientVersion": "5.22.0",
  "engineVersion": "605197351a3c8bdd595af2d2a9bc3025bca48ea2",
  "datasourceNames": [
    "db"
  ],
  "activeProvider": "postgresql",
  "postinstall": false,
  "inlineDatasources": {
    "db": {
      "url": {
        "fromEnvVar": "DATABASE_URL",
        "value": null
      }
    }
  },
  "inlineSchema": "// STEM Genius - Database Schema\n// AI-Powered STEM Learning Platform\n\ngenerator client {\n  provider        = \"prisma-client-js\"\n  output          = \"../generated/prisma\"\n  previewFeatures = [\"driverAdapters\"]\n}\n\ndatasource db {\n  provider  = \"postgresql\"\n  url       = env(\"DATABASE_URL\")\n  directUrl = env(\"DATABASE_URL_UNPOOLED\")\n}\n\n// ============================================\n// USER MANAGEMENT\n// ============================================\n\nenum UserRole {\n  STUDENT\n  TEACHER\n  ADMIN\n  SUPER_ADMIN\n}\n\nenum SubscriptionTier {\n  FREE\n  PREMIUM\n  SCHOOL\n}\n\nmodel User {\n  id           String   @id @default(uuid())\n  email        String   @unique\n  passwordHash String?\n  name         String\n  avatar       String?\n  role         UserRole @default(STUDENT)\n\n  // OAuth\n  googleId    String? @unique\n  microsoftId String? @unique\n\n  // Subscription\n  subscriptionTier   SubscriptionTier @default(FREE)\n  subscriptionEndsAt DateTime?\n\n  // Metadata\n  emailVerified Boolean   @default(false)\n  isActive      Boolean   @default(true)\n  lastLoginAt   DateTime?\n  createdAt     DateTime  @default(now())\n  updatedAt     DateTime  @updatedAt\n\n  // Relations\n  profile       UserProfile?\n  tasks         UserTask[]\n  conversations Conversation[]\n  xp            UserXP?\n  achievements  UserAchievement[]\n  streaks       UserStreak?\n  sessions      Session[]\n  events        Event[]\n  studyPlans    StudyPlan[]\n  classrooms    ClassroomMember[]\n\n  @@index([email])\n  @@index([role])\n  @@index([subscriptionTier])\n}\n\nmodel UserProfile {\n  id     String @id @default(uuid())\n  userId String @unique\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  // Demographics\n  gradeLevel Int? // 7-12 for Finnish system\n  school     String?\n  country    String  @default(\"FI\")\n  language   String  @default(\"fi\")\n  timezone   String  @default(\"Europe/Helsinki\")\n\n  // Learning preferences\n  learningStyle String? // visual, auditory, kinesthetic\n  studyGoals    Json? // Array of goals\n  weakTopics    Json? // Array of weak topics\n  strongTopics  Json? // Array of strong topics\n\n  // AI personalization\n  difficultyLevel Float @default(5.0) // 1-10 scale\n  learningSpeed   Float @default(1.0) // Multiplier\n  confidenceLevel Float @default(0.5) // 0-1 scale\n\n  // Predictions\n  predictedGrade Float? // Predicted exam grade\n  burnoutRisk    Float  @default(0.0) // 0-1 scale\n\n  // Settings\n  darkMode      Boolean @default(true)\n  notifications Boolean @default(true)\n  soundEffects  Boolean @default(true)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([userId])\n}\n\nmodel Session {\n  id        String   @id @default(uuid())\n  userId    String\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  token     String   @unique\n  expiresAt DateTime\n  createdAt DateTime @default(now())\n\n  @@index([userId])\n  @@index([token])\n}\n\n// ============================================\n// TASK SYSTEM\n// ============================================\n\nenum Subject {\n  MATHEMATICS\n  PHYSICS\n  CHEMISTRY\n  ASTRONOMY\n}\n\nenum TaskType {\n  MULTIPLE_CHOICE\n  OPEN_ENDED\n  GRAPHING\n  DERIVATION\n  CALCULATION\n  SIMULATION\n  APPLICATION\n}\n\nenum DifficultyLevel {\n  BEGINNER\n  INTERMEDIATE\n  ADVANCED\n  EXPERT\n}\n\nmodel Task {\n  id String @id @default(uuid())\n\n  // Classification\n  subject    Subject\n  topic      String // e.g., \"Quadratic Equations\"\n  subtopic   String? // e.g., \"Completing the Square\"\n  difficulty Float // 1-10 scale\n  type       TaskType\n  level      DifficultyLevel\n\n  // Content (JSON for flexibility)\n  question Json // Question text, images, equations\n  answer   Json // Correct answer(s)\n  solution Json // Step-by-step solution\n  hints    Json? // Progressive hints\n\n  // Metadata\n  estimatedTime Int // Seconds\n  xpReward      Int      @default(10)\n  tags          String[] // For search/filtering\n\n  // AI generation\n  generatedBy String? // AI model used\n  prompt      String? // Prompt used for generation\n\n  // Quality\n  rating      Float? // User ratings\n  reportCount Int    @default(0)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  userTasks UserTask[]\n\n  @@index([subject, difficulty])\n  @@index([topic])\n  @@index([level])\n}\n\nmodel UserTask {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n  taskId String\n  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)\n\n  // Attempt data\n  answerSubmitted Json\n  isCorrect       Boolean\n  timeSpent       Int // Seconds\n  hintsUsed       Int     @default(0)\n  attempts        Int     @default(1)\n\n  // Performance metrics\n  confidence Float? // Self-reported 0-1\n  difficulty Float? // Perceived difficulty 1-10\n\n  // XP earned\n  xpEarned Int @default(0)\n\n  completedAt DateTime @default(now())\n  createdAt   DateTime @default(now())\n\n  @@index([userId, createdAt])\n  @@index([taskId])\n  @@index([isCorrect])\n}\n\n// ============================================\n// AI TUTOR SYSTEM\n// ============================================\n\nmodel Conversation {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  title   String   @default(\"New Conversation\")\n  subject Subject?\n  topic   String?\n\n  // Metadata\n  messageCount Int     @default(0)\n  isActive     Boolean @default(true)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  messages Message[]\n\n  @@index([userId, createdAt])\n}\n\nenum MessageRole {\n  USER\n  ASSISTANT\n  SYSTEM\n}\n\nmodel Message {\n  id             String       @id @default(uuid())\n  conversationId String\n  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)\n\n  role    MessageRole\n  content String      @db.Text\n\n  // Attachments\n  images    String[] // URLs to uploaded images\n  equations Json? // Parsed equations\n\n  // AI metadata\n  model  String? // AI model used\n  tokens Int? // Tokens used\n\n  createdAt DateTime @default(now())\n\n  @@index([conversationId, createdAt])\n}\n\n// ============================================\n// GAMIFICATION SYSTEM\n// ============================================\n\nmodel UserXP {\n  id     String @id @default(uuid())\n  userId String @unique\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  totalXP Int @default(0)\n  level   Int @default(1)\n\n  // Subject-specific XP\n  mathXP      Int @default(0)\n  physicsXP   Int @default(0)\n  chemistryXP Int @default(0)\n  astronomyXP Int @default(0)\n\n  // Multipliers\n  xpMultiplier Float @default(1.0)\n\n  updatedAt DateTime @updatedAt\n\n  @@index([totalXP])\n  @@index([level])\n}\n\nmodel UserStreak {\n  id     String @id @default(uuid())\n  userId String @unique\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  currentStreak    Int      @default(0)\n  longestStreak    Int      @default(0)\n  lastActivityDate DateTime @default(now())\n\n  // Streak freeze (premium feature)\n  freezesAvailable Int @default(0)\n  freezesUsed      Int @default(0)\n\n  updatedAt DateTime @updatedAt\n\n  @@index([currentStreak])\n}\n\nenum AchievementCategory {\n  TASKS_COMPLETED\n  STREAK\n  MASTERY\n  SPEED\n  ACCURACY\n  SOCIAL\n  SPECIAL\n}\n\nenum AchievementRarity {\n  COMMON\n  RARE\n  EPIC\n  LEGENDARY\n}\n\nmodel Achievement {\n  id String @id @default(uuid())\n\n  name        String\n  description String\n  icon        String // Emoji or icon name\n  category    AchievementCategory\n  rarity      AchievementRarity\n\n  // Unlock criteria (JSON for flexibility)\n  criteria Json\n\n  // Rewards\n  xpReward Int @default(0)\n\n  createdAt DateTime @default(now())\n\n  // Relations\n  users UserAchievement[]\n\n  @@index([category])\n  @@index([rarity])\n}\n\nmodel UserAchievement {\n  id            String      @id @default(uuid())\n  userId        String\n  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n  achievementId String\n  achievement   Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)\n\n  unlockedAt DateTime @default(now())\n\n  @@unique([userId, achievementId])\n  @@index([userId])\n}\n\n// ============================================\n// LEARNING ANALYTICS\n// ============================================\n\nmodel StudyPlan {\n  id     String @id @default(uuid())\n  userId String\n  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  title       String\n  description String?\n\n  // Plan details\n  subject   Subject\n  topics    Json // Array of topics to cover\n  startDate DateTime\n  endDate   DateTime\n\n  // Progress\n  completed Boolean @default(false)\n  progress  Float   @default(0.0) // 0-1\n\n  // AI-generated\n  isAIGenerated Boolean @default(false)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([userId])\n  @@index([subject])\n}\n\nenum EventType {\n  // User events\n  USER_REGISTERED\n  USER_LOGIN\n  USER_LOGOUT\n\n  // Task events\n  TASK_GENERATED\n  TASK_STARTED\n  TASK_COMPLETED\n  TASK_ABANDONED\n\n  // Tutor events\n  TUTOR_MESSAGE_SENT\n  TUTOR_HINT_REQUESTED\n\n  // Gamification events\n  XP_EARNED\n  LEVEL_UP\n  ACHIEVEMENT_UNLOCKED\n  STREAK_MAINTAINED\n  STREAK_BROKEN\n\n  // Subscription events\n  SUBSCRIPTION_STARTED\n  SUBSCRIPTION_RENEWED\n  SUBSCRIPTION_CANCELLED\n}\n\nmodel Event {\n  id     String  @id @default(uuid())\n  userId String?\n  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)\n\n  eventType EventType\n  eventData Json? // Additional event data\n\n  // Context\n  device   String?\n  browser  String?\n  location String?\n\n  createdAt DateTime @default(now())\n\n  @@index([userId, createdAt])\n  @@index([eventType, createdAt])\n}\n\n// ============================================\n// CLASSROOM SYSTEM (B2B)\n// ============================================\n\nmodel Classroom {\n  id String @id @default(uuid())\n\n  name        String\n  description String?\n  code        String  @unique // Join code\n\n  // School info\n  schoolName String\n  gradeLevel Int?\n\n  // Settings\n  isActive Boolean @default(true)\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  // Relations\n  members     ClassroomMember[]\n  assignments Assignment[]\n\n  @@index([code])\n}\n\nenum ClassroomRole {\n  TEACHER\n  STUDENT\n}\n\nmodel ClassroomMember {\n  id          String    @id @default(uuid())\n  classroomId String\n  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)\n  userId      String\n  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)\n\n  role ClassroomRole\n\n  joinedAt DateTime @default(now())\n\n  @@unique([classroomId, userId])\n  @@index([classroomId])\n  @@index([userId])\n}\n\nmodel Assignment {\n  id          String    @id @default(uuid())\n  classroomId String\n  classroom   Classroom @relation(fields: [classroomId], references: [id], onDelete: Cascade)\n\n  title       String\n  description String?\n\n  // Assignment details\n  subject    Subject\n  topics     String[]\n  difficulty Float\n\n  // Tasks (JSON array of task IDs)\n  taskIds String[]\n\n  // Deadlines\n  dueDate DateTime\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([classroomId])\n  @@index([dueDate])\n}\n\n// ============================================\n// LEADERBOARDS\n// ============================================\n\nmodel LeaderboardEntry {\n  id     String @id @default(uuid())\n  userId String\n\n  // Leaderboard type\n  type    String // global, weekly, monthly, subject-specific\n  subject Subject?\n\n  // Ranking\n  rank  Int\n  score Int // XP or other metric\n\n  // Time period\n  periodStart DateTime\n  periodEnd   DateTime\n\n  createdAt DateTime @default(now())\n\n  @@unique([userId, type, periodStart])\n  @@index([type, rank])\n  @@index([periodStart, periodEnd])\n}\n",
  "inlineSchemaHash": "185845894e402b8918f6a9d92ee74465175718ad36e294df986065586eecc2b2",
  "copyEngine": true
}
config.dirname = '/'

config.runtimeDataModel = JSON.parse("{\"models\":{\"User\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"email\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"passwordHash\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"avatar\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"UserRole\"},{\"name\":\"googleId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"microsoftId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subscriptionTier\",\"kind\":\"enum\",\"type\":\"SubscriptionTier\"},{\"name\":\"subscriptionEndsAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"emailVerified\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"lastLoginAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"profile\",\"kind\":\"object\",\"type\":\"UserProfile\",\"relationName\":\"UserToUserProfile\"},{\"name\":\"tasks\",\"kind\":\"object\",\"type\":\"UserTask\",\"relationName\":\"UserToUserTask\"},{\"name\":\"conversations\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationToUser\"},{\"name\":\"xp\",\"kind\":\"object\",\"type\":\"UserXP\",\"relationName\":\"UserToUserXP\"},{\"name\":\"achievements\",\"kind\":\"object\",\"type\":\"UserAchievement\",\"relationName\":\"UserToUserAchievement\"},{\"name\":\"streaks\",\"kind\":\"object\",\"type\":\"UserStreak\",\"relationName\":\"UserToUserStreak\"},{\"name\":\"sessions\",\"kind\":\"object\",\"type\":\"Session\",\"relationName\":\"SessionToUser\"},{\"name\":\"events\",\"kind\":\"object\",\"type\":\"Event\",\"relationName\":\"EventToUser\"},{\"name\":\"studyPlans\",\"kind\":\"object\",\"type\":\"StudyPlan\",\"relationName\":\"StudyPlanToUser\"},{\"name\":\"classrooms\",\"kind\":\"object\",\"type\":\"ClassroomMember\",\"relationName\":\"ClassroomMemberToUser\"}],\"dbName\":null},\"UserProfile\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserProfile\"},{\"name\":\"gradeLevel\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"school\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"country\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"language\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"timezone\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"learningStyle\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"studyGoals\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"weakTopics\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"strongTopics\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"difficultyLevel\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"learningSpeed\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"confidenceLevel\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"predictedGrade\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"burnoutRisk\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"darkMode\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"notifications\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"soundEffects\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Session\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"SessionToUser\"},{\"name\":\"token\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"expiresAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Task\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"enum\",\"type\":\"Subject\"},{\"name\":\"topic\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subtopic\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"difficulty\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"type\",\"kind\":\"enum\",\"type\":\"TaskType\"},{\"name\":\"level\",\"kind\":\"enum\",\"type\":\"DifficultyLevel\"},{\"name\":\"question\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"answer\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"solution\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"hints\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"estimatedTime\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"xpReward\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"tags\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"generatedBy\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"prompt\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"rating\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"reportCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"userTasks\",\"kind\":\"object\",\"type\":\"UserTask\",\"relationName\":\"TaskToUserTask\"}],\"dbName\":null},\"UserTask\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserTask\"},{\"name\":\"taskId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"task\",\"kind\":\"object\",\"type\":\"Task\",\"relationName\":\"TaskToUserTask\"},{\"name\":\"answerSubmitted\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"isCorrect\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"timeSpent\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"hintsUsed\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"attempts\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"confidence\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"difficulty\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"xpEarned\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"completedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Conversation\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ConversationToUser\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"enum\",\"type\":\"Subject\"},{\"name\":\"topic\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"messageCount\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"messages\",\"kind\":\"object\",\"type\":\"Message\",\"relationName\":\"ConversationToMessage\"}],\"dbName\":null},\"Message\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conversationId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"conversation\",\"kind\":\"object\",\"type\":\"Conversation\",\"relationName\":\"ConversationToMessage\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"MessageRole\"},{\"name\":\"content\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"images\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"equations\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"model\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"tokens\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"UserXP\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserXP\"},{\"name\":\"totalXP\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"level\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"mathXP\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"physicsXP\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"chemistryXP\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"astronomyXP\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"xpMultiplier\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"UserStreak\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserStreak\"},{\"name\":\"currentStreak\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"longestStreak\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"lastActivityDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"freezesAvailable\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"freezesUsed\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Achievement\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"icon\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"category\",\"kind\":\"enum\",\"type\":\"AchievementCategory\"},{\"name\":\"rarity\",\"kind\":\"enum\",\"type\":\"AchievementRarity\"},{\"name\":\"criteria\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"xpReward\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"users\",\"kind\":\"object\",\"type\":\"UserAchievement\",\"relationName\":\"AchievementToUserAchievement\"}],\"dbName\":null},\"UserAchievement\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"UserToUserAchievement\"},{\"name\":\"achievementId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"achievement\",\"kind\":\"object\",\"type\":\"Achievement\",\"relationName\":\"AchievementToUserAchievement\"},{\"name\":\"unlockedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"StudyPlan\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"StudyPlanToUser\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"enum\",\"type\":\"Subject\"},{\"name\":\"topics\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"startDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"endDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"completed\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"progress\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"isAIGenerated\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Event\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"EventToUser\"},{\"name\":\"eventType\",\"kind\":\"enum\",\"type\":\"EventType\"},{\"name\":\"eventData\",\"kind\":\"scalar\",\"type\":\"Json\"},{\"name\":\"device\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"browser\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"location\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Classroom\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"name\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"code\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"schoolName\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"gradeLevel\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"isActive\",\"kind\":\"scalar\",\"type\":\"Boolean\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"members\",\"kind\":\"object\",\"type\":\"ClassroomMember\",\"relationName\":\"ClassroomToClassroomMember\"},{\"name\":\"assignments\",\"kind\":\"object\",\"type\":\"Assignment\",\"relationName\":\"AssignmentToClassroom\"}],\"dbName\":null},\"ClassroomMember\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classroomId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classroom\",\"kind\":\"object\",\"type\":\"Classroom\",\"relationName\":\"ClassroomToClassroomMember\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"user\",\"kind\":\"object\",\"type\":\"User\",\"relationName\":\"ClassroomMemberToUser\"},{\"name\":\"role\",\"kind\":\"enum\",\"type\":\"ClassroomRole\"},{\"name\":\"joinedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"Assignment\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classroomId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"classroom\",\"kind\":\"object\",\"type\":\"Classroom\",\"relationName\":\"AssignmentToClassroom\"},{\"name\":\"title\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"description\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"enum\",\"type\":\"Subject\"},{\"name\":\"topics\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"difficulty\",\"kind\":\"scalar\",\"type\":\"Float\"},{\"name\":\"taskIds\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"dueDate\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"updatedAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null},\"LeaderboardEntry\":{\"fields\":[{\"name\":\"id\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"userId\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"type\",\"kind\":\"scalar\",\"type\":\"String\"},{\"name\":\"subject\",\"kind\":\"enum\",\"type\":\"Subject\"},{\"name\":\"rank\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"score\",\"kind\":\"scalar\",\"type\":\"Int\"},{\"name\":\"periodStart\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"periodEnd\",\"kind\":\"scalar\",\"type\":\"DateTime\"},{\"name\":\"createdAt\",\"kind\":\"scalar\",\"type\":\"DateTime\"}],\"dbName\":null}},\"enums\":{},\"types\":{}}")
defineDmmfProperty(exports.Prisma, config.runtimeDataModel)
config.engineWasm = {
  getRuntime: () => require('./query_engine_bg.js'),
  getQueryEngineWasmModule: async () => {
    const loader = (await import('#wasm-engine-loader')).default
    const engine = (await loader).default
    return engine 
  }
}

config.injectableEdgeEnv = () => ({
  parsed: {
    DATABASE_URL: typeof globalThis !== 'undefined' && globalThis['DATABASE_URL'] || typeof process !== 'undefined' && process.env && process.env.DATABASE_URL || undefined
  }
})

if (typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined) {
  Debug.enable(typeof globalThis !== 'undefined' && globalThis['DEBUG'] || typeof process !== 'undefined' && process.env && process.env.DEBUG || undefined)
}

const PrismaClient = getPrismaClient(config)
exports.PrismaClient = PrismaClient
Object.assign(exports, Prisma)

