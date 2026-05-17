
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


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

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

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
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
