/**
 * Coding Learning Platform Schema
 * Inspired by Tie koodariksi, Duolingo, Codecademy
 * Finnish-first, modern, gamified coding education
 */

export interface CodingUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  language: 'fi' | 'en'; // User's preferred language
  avatar?: string;
  bio?: string;
  
  // Gamification
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  totalCoursesCompleted: number;
  totalLessonsCompleted: number;
  totalExercisesCompleted: number;
  
  // Settings
  theme: 'light' | 'dark';
  emailNotifications: boolean;
  soundEffects: boolean;
  
  // Linked to Wilma
  wilmaUserId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  slug: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  language: 'python' | 'javascript' | 'html-css' | 'csharp' | 'scratch';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  
  // Content
  thumbnail: string;
  color: string; // Brand color for the course
  icon: string;
  
  // Structure
  modules: string[]; // Array of module IDs
  
  // Stats
  enrolledCount: number;
  completionRate: number;
  averageRating: number;
  
  // Visibility
  isPublished: boolean;
  isFree: boolean;
  
  // Metadata
  tags: string[];
  prerequisites: string[]; // Course IDs
  
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  order: number;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  
  // Content
  lessons: string[]; // Array of lesson IDs
  
  // Requirements
  requiredXP: number;
  unlockAfter?: string; // Module ID that must be completed first
  
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  order: number;
  title: { fi: string; en: string };
  
  // Content types
  type: 'tutorial' | 'exercise' | 'quiz' | 'project' | 'challenge';
  
  // Tutorial content
  content?: {
    fi: LessonContent;
    en: LessonContent;
  };
  
  // Exercise/Quiz content
  exercises?: Exercise[];
  quiz?: Quiz;
  project?: Project;
  
  // Rewards
  xpReward: number;
  
  // Requirements
  estimatedMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  
  createdAt: string;
  updatedAt: string;
}

export interface LessonContent {
  introduction: string;
  sections: ContentSection[];
  summary: string;
  keyTakeaways: string[];
}

export interface ContentSection {
  type: 'text' | 'code' | 'video' | 'image' | 'interactive';
  title?: string;
  content: string;
  code?: CodeBlock;
  videoUrl?: string;
  imageUrl?: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  runnable: boolean;
  editable: boolean;
  expectedOutput?: string;
  hints?: string[];
}

export interface Exercise {
  id: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  instructions: { fi: string[]; en: string[] };
  
  // Code challenge
  starterCode: string;
  solution: string;
  testCases: TestCase[];
  
  // Hints
  hints: { fi: string[]; en: string[] };
  
  // Validation
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  hidden: boolean; // Hidden test cases for validation
}

export interface Quiz {
  id: string;
  title: { fi: string; en: string };
  questions: QuizQuestion[];
  passingScore: number; // Percentage
  xpReward: number;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'code-output' | 'fill-blank';
  question: { fi: string; en: string };
  options?: { fi: string[]; en: string[] };
  correctAnswer: string | number;
  explanation: { fi: string; en: string };
  points: number;
}

export interface Project {
  id: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  requirements: { fi: string[]; en: string[] };
  
  // Starter files
  starterFiles: ProjectFile[];
  
  // Validation
  rubric: ProjectRubric[];
  
  // Rewards
  xpReward: number;
  badge?: string;
}

export interface ProjectFile {
  filename: string;
  content: string;
  language: string;
}

export interface ProjectRubric {
  criterion: { fi: string; en: string };
  points: number;
  description: { fi: string; en: string };
}

// User Progress Tracking
export interface UserProgress {
  userId: string;
  courseId: string;
  
  // Progress
  enrolledAt: string;
  lastAccessedAt: string;
  completedModules: string[];
  completedLessons: string[];
  currentLesson?: string;
  
  // Stats
  totalXpEarned: number;
  completionPercentage: number;
  timeSpentMinutes: number;
  
  // Status
  status: 'not-started' | 'in-progress' | 'completed';
  completedAt?: string;
  certificateIssued?: boolean;
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  
  // Status
  status: 'not-started' | 'in-progress' | 'completed';
  startedAt?: string;
  completedAt?: string;
  
  // Exercise progress
  exercisesCompleted: string[];
  quizScore?: number;
  quizAttempts: number;
  
  // Code submissions
  submissions: CodeSubmission[];
  
  // Time tracking
  timeSpentMinutes: number;
}

export interface CodeSubmission {
  id: string;
  userId: string;
  exerciseId: string;
  code: string;
  language: string;
  
  // Results
  passed: boolean;
  testResults: TestResult[];
  output?: string;
  error?: string;
  
  // Metadata
  submittedAt: string;
  executionTime: number;
}

export interface TestResult {
  testCase: string;
  passed: boolean;
  expected: string;
  actual: string;
}

// Classroom System
export interface Classroom {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  
  // Access
  joinCode: string; // Unique 6-8 character code
  isPublic: boolean;
  
  // Members
  studentIds: string[];
  coTeacherIds: string[];
  
  // Courses
  assignedCourses: string[];
  
  // Settings
  allowStudentChat: boolean;
  showLeaderboard: boolean;
  
  // Metadata
  schoolName?: string;
  grade?: string;
  subject?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: string;
  classroomId: string;
  teacherId: string;
  
  // Content
  title: string;
  description: string;
  type: 'lesson' | 'exercise' | 'project' | 'quiz';
  contentId: string; // Lesson/Exercise/Project ID
  
  // Scheduling
  assignedAt: string;
  dueDate?: string;
  
  // Settings
  allowLateSubmission: boolean;
  maxAttempts?: number;
  
  // Tracking
  studentProgress: {
    [studentId: string]: {
      status: 'not-started' | 'in-progress' | 'submitted' | 'graded';
      submittedAt?: string;
      score?: number;
      feedback?: string;
    };
  };
}

export interface ClassroomAnnouncement {
  id: string;
  classroomId: string;
  teacherId: string;
  
  title: string;
  content: string;
  
  // Visibility
  pinned: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Gamification
export interface Achievement {
  id: string;
  slug: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  icon: string;
  color: string;
  
  // Requirements
  requirement: {
    type: 'xp' | 'streak' | 'courses' | 'exercises' | 'projects' | 'special';
    value: number;
  };
  
  // Rewards
  xpReward: number;
  
  // Rarity
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

export interface Badge {
  id: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  icon: string;
  color: string;
  
  // Earned by
  earnedBy: 'course-completion' | 'project-completion' | 'challenge-win' | 'special';
  relatedId?: string; // Course/Project ID
}

export interface DailyChallenge {
  id: string;
  date: string; // YYYY-MM-DD
  
  // Challenge
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  difficulty: 'easy' | 'medium' | 'hard';
  
  // Exercise
  exercise: Exercise;
  
  // Rewards
  xpReward: number;
  
  // Stats
  attemptsCount: number;
  completionCount: number;
}

export interface Leaderboard {
  id: string;
  type: 'global' | 'classroom' | 'weekly' | 'monthly';
  classroomId?: string;
  
  // Period
  startDate: string;
  endDate: string;
  
  // Rankings
  rankings: LeaderboardEntry[];
  
  updatedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  
  // Stats
  xp: number;
  rank: number;
  coursesCompleted: number;
  exercisesCompleted: number;
}

// Saved Projects
export interface SavedProject {
  id: string;
  userId: string;
  
  title: string;
  description?: string;
  
  // Code
  files: ProjectFile[];
  language: string;
  
  // Metadata
  isPublic: boolean;
  likes: number;
  views: number;
  
  // Forking
  forkedFrom?: string;
  forkCount: number;
  
  createdAt: string;
  updatedAt: string;
}

// Certificates
export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  
  // Details
  courseName: string;
  completedAt: string;
  
  // Verification
  certificateCode: string; // Unique verification code
  
  // Design
  templateId: string;
  
  issuedAt: string;
}

// AI Assistant
export interface AIConversation {
  id: string;
  userId: string;
  
  // Context
  lessonId?: string;
  exerciseId?: string;
  
  // Messages
  messages: AIMessage[];
  
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  
  // Code context
  codeSnippet?: string;
  error?: string;
}

// Analytics for Teachers
export interface ClassroomAnalytics {
  classroomId: string;
  
  // Overview
  totalStudents: number;
  activeStudents: number; // Active in last 7 days
  averageProgress: number; // Percentage
  
  // Engagement
  totalTimeSpent: number; // Minutes
  averageTimePerStudent: number;
  
  // Performance
  averageQuizScore: number;
  exerciseCompletionRate: number;
  
  // Trends
  dailyActivity: { date: string; activeUsers: number; lessonsCompleted: number }[];
  
  // Top performers
  topStudents: LeaderboardEntry[];
  
  // Struggling students
  strugglingStudents: {
    userId: string;
    username: string;
    issuesCount: number;
    lastActive: string;
  }[];
  
  updatedAt: string;
}

// Multiplayer Coding Rooms
export interface CodingRoom {
  id: string;
  name: string;
  hostId: string;
  
  // Settings
  maxParticipants: number;
  isPublic: boolean;
  password?: string;
  
  // Participants
  participants: RoomParticipant[];
  
  // Shared code
  sharedCode: string;
  language: string;
  
  // Chat
  chatMessages: ChatMessage[];
  
  // Status
  status: 'waiting' | 'active' | 'ended';
  
  createdAt: string;
  endedAt?: string;
}

export interface RoomParticipant {
  userId: string;
  username: string;
  avatar?: string;
  role: 'host' | 'participant';
  cursor?: { line: number; column: number };
  color: string; // Cursor color
  joinedAt: string;
}

export interface ChatMessage {
  userId: string;
  username: string;
  message: string;
  timestamp: string;
}

// Weekly Competitions
export interface Competition {
  id: string;
  title: { fi: string; en: string };
  description: { fi: string; en: string };
  
  // Schedule
  startDate: string;
  endDate: string;
  
  // Challenge
  challenges: Exercise[];
  
  // Prizes
  prizes: {
    rank: number;
    xpReward: number;
    badge?: string;
  }[];
  
  // Participants
  participants: CompetitionParticipant[];
  
  // Status
  status: 'upcoming' | 'active' | 'ended';
  
  createdAt: string;
}

export interface CompetitionParticipant {
  userId: string;
  username: string;
  
  // Score
  totalScore: number;
  completedChallenges: string[];
  
  // Timing
  startedAt: string;
  submittedAt?: string;
  
  // Ranking
  rank?: number;
}

// System Settings
export interface PlatformSettings {
  id: string;
  
  // Features
  enableAIAssistant: boolean;
  enableMultiplayer: boolean;
  enableCompetitions: boolean;
  enableCertificates: boolean;
  
  // Limits
  maxClassroomSize: number;
  maxProjectSize: number; // MB
  dailyChallengeXP: number;
  
  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage?: { fi: string; en: string };
  
  updatedAt: string;
}
