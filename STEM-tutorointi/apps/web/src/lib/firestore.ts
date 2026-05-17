/**
 * Firestore Helper Functions
 * 
 * This file contains helper functions for interacting with Firestore.
 * Provides type-safe wrappers and common operations.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  QueryConstraint,
  WhereFilterOp,
  OrderByDirection,
  DocumentSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firebaseDb } from './firebase';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'teacher' | 'admin';
  subscriptionTier: 'free' | 'premium' | 'school';
  subscriptionEndsAt?: Timestamp;
  onboardingCompleted: boolean;
  onboardingData?: {
    gradeLevel: number;
    subjects: string[];
    learningStyle: string;
    goals: string[];
  };
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt: Timestamp;
}

export interface LearningProfile {
  difficultyLevel: number;
  learningSpeed: number;
  confidenceLevel: number;
  strongTopics: string[];
  weakTopics: string[];
  predictedGrade?: number;
  burnoutRisk: number;
  preferredExplanationStyle: string;
  visualLearner: boolean;
  updatedAt: Timestamp;
}

export interface Exercise {
  id: string;
  subject: 'mathematics' | 'physics' | 'chemistry' | 'astronomy';
  topic: string;
  subtopic?: string;
  difficulty: number;
  type: 'multiple_choice' | 'open_ended' | 'calculation';
  question: any;
  answer: any;
  solution: any;
  hints?: any[];
  estimatedTime: number;
  xpReward: number;
  tags: string[];
  generatedBy: string;
  generatedAt: Timestamp;
  rating?: number;
  completionCount: number;
  successRate: number;
  createdAt: Timestamp;
}

export interface UserProgress {
  exerciseId: string;
  userId: string;
  completed: boolean;
  correct: boolean;
  timeSpent: number;
  hintsUsed: number;
  attempts: number;
  xpEarned: number;
  completedAt: Timestamp;
}

// ============================================
// COLLECTION REFERENCES
// ============================================

export const COLLECTIONS = {
  USERS: 'users',
  EXERCISES: 'exercises',
  CLASSROOMS: 'classrooms',
  ACHIEVEMENTS: 'achievements',
  LEADERBOARDS: 'leaderboards',
} as const;

export const SUBCOLLECTIONS = {
  LEARNING_PROFILE: 'learningProfile',
  PROGRESS: 'progress',
  ACHIEVEMENTS: 'achievements',
  CONVERSATIONS: 'conversations',
  MEMBERS: 'members',
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convert Firestore timestamp to Date
 */
export const timestampToDate = (timestamp: Timestamp): Date => {
  return timestamp.toDate();
};

/**
 * Convert Date to Firestore timestamp
 */
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

/**
 * Get current timestamp
 */
export const now = (): Timestamp => {
  return Timestamp.now();
};

/**
 * Convert Firestore document to typed object
 */
export const docToData = <T>(doc: DocumentSnapshot): T | null => {
  if (!doc.exists()) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as T;
};

/**
 * Convert Firestore query snapshot to typed array
 */
export const queryToData = <T>(snapshot: QueryDocumentSnapshot[]): T[] => {
  return snapshot.map((doc) => ({ id: doc.id, ...doc.data() } as T));
};

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Get user profile by UID
 */
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  return docToData<UserProfile>(userSnap);
};

/**
 * Create user profile
 */
export const createUserProfile = async (
  uid: string,
  data: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  const userData: Partial<UserProfile> = {
    ...data,
    uid,
    createdAt: now(),
    updatedAt: now(),
    lastLoginAt: now(),
  };
  await setDoc(userRef, userData);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  data: Partial<UserProfile>
): Promise<void> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: now(),
  });
};

/**
 * Update last login time
 */
export const updateLastLogin = async (uid: string): Promise<void> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  await updateDoc(userRef, {
    lastLoginAt: now(),
    updatedAt: now(),
  });
};

/**
 * Get learning profile
 */
export const getLearningProfile = async (
  uid: string
): Promise<LearningProfile | null> => {
  const profileRef = doc(
    firebaseDb,
    COLLECTIONS.USERS,
    uid,
    SUBCOLLECTIONS.LEARNING_PROFILE,
    'profile'
  );
  const profileSnap = await getDoc(profileRef);
  return docToData<LearningProfile>(profileSnap);
};

/**
 * Update learning profile
 */
export const updateLearningProfile = async (
  uid: string,
  data: Partial<LearningProfile>
): Promise<void> => {
  const profileRef = doc(
    firebaseDb,
    COLLECTIONS.USERS,
    uid,
    SUBCOLLECTIONS.LEARNING_PROFILE,
    'profile'
  );
  await setDoc(
    profileRef,
    {
      ...data,
      updatedAt: now(),
    },
    { merge: true }
  );
};

// ============================================
// EXERCISE OPERATIONS
// ============================================

/**
 * Get exercise by ID
 */
export const getExercise = async (exerciseId: string): Promise<Exercise | null> => {
  const exerciseRef = doc(firebaseDb, COLLECTIONS.EXERCISES, exerciseId);
  const exerciseSnap = await getDoc(exerciseRef);
  return docToData<Exercise>(exerciseSnap);
};

/**
 * Get exercises by subject and difficulty
 */
export const getExercisesBySubjectAndDifficulty = async (
  subject: string,
  minDifficulty: number,
  maxDifficulty: number,
  limitCount: number = 10
): Promise<Exercise[]> => {
  const exercisesRef = collection(firebaseDb, COLLECTIONS.EXERCISES);
  const q = query(
    exercisesRef,
    where('subject', '==', subject),
    where('difficulty', '>=', minDifficulty),
    where('difficulty', '<=', maxDifficulty),
    orderBy('difficulty'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return queryToData<Exercise>(snapshot.docs);
};

/**
 * Create exercise
 */
export const createExercise = async (data: Omit<Exercise, 'id'>): Promise<string> => {
  const exercisesRef = collection(firebaseDb, COLLECTIONS.EXERCISES);
  const newExerciseRef = doc(exercisesRef);
  await setDoc(newExerciseRef, {
    ...data,
    createdAt: now(),
  });
  return newExerciseRef.id;
};

// ============================================
// PROGRESS OPERATIONS
// ============================================

/**
 * Record user progress on exercise
 */
export const recordProgress = async (
  uid: string,
  progressData: Omit<UserProgress, 'completedAt'>
): Promise<void> => {
  const progressRef = collection(
    firebaseDb,
    COLLECTIONS.USERS,
    uid,
    SUBCOLLECTIONS.PROGRESS
  );
  const newProgressRef = doc(progressRef);
  await setDoc(newProgressRef, {
    ...progressData,
    completedAt: now(),
  });
};

/**
 * Get user progress for specific exercise
 */
export const getUserProgressForExercise = async (
  uid: string,
  exerciseId: string
): Promise<UserProgress[]> => {
  const progressRef = collection(
    firebaseDb,
    COLLECTIONS.USERS,
    uid,
    SUBCOLLECTIONS.PROGRESS
  );
  const q = query(progressRef, where('exerciseId', '==', exerciseId));
  const snapshot = await getDocs(q);
  return queryToData<UserProgress>(snapshot.docs);
};

/**
 * Get all user progress
 */
export const getAllUserProgress = async (
  uid: string,
  limitCount: number = 50
): Promise<UserProgress[]> => {
  const progressRef = collection(
    firebaseDb,
    COLLECTIONS.USERS,
    uid,
    SUBCOLLECTIONS.PROGRESS
  );
  const q = query(progressRef, orderBy('completedAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return queryToData<UserProgress>(snapshot.docs);
};

// ============================================
// GAMIFICATION OPERATIONS
// ============================================

/**
 * Add XP to user
 */
export const addXP = async (uid: string, xpAmount: number): Promise<void> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  const newTotalXP = (userData.totalXP || 0) + xpAmount;
  
  // Calculate new level (simple formula: level = floor(sqrt(totalXP / 100)))
  const newLevel = Math.floor(Math.sqrt(newTotalXP / 100)) + 1;
  
  await updateDoc(userRef, {
    totalXP: newTotalXP,
    level: newLevel,
    updatedAt: now(),
  });
};

/**
 * Update streak
 */
export const updateStreak = async (uid: string): Promise<void> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  const lastActivity = userData.lastActivityDate?.toDate() || new Date(0);
  const now = new Date();
  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  let newStreak = userData.currentStreak || 0;
  let longestStreak = userData.longestStreak || 0;
  
  if (daysSinceLastActivity === 0) {
    // Same day, no change
    return;
  } else if (daysSinceLastActivity === 1) {
    // Consecutive day, increment streak
    newStreak += 1;
  } else {
    // Streak broken, reset to 1
    newStreak = 1;
  }
  
  // Update longest streak if necessary
  if (newStreak > longestStreak) {
    longestStreak = newStreak;
  }
  
  await updateDoc(userRef, {
    currentStreak: newStreak,
    longestStreak: longestStreak,
    lastActivityDate: dateToTimestamp(now),
    updatedAt: dateToTimestamp(now),
  });
};

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

/**
 * Get global leaderboard
 */
export const getGlobalLeaderboard = async (
  limitCount: number = 10
): Promise<UserProfile[]> => {
  const usersRef = collection(firebaseDb, COLLECTIONS.USERS);
  const q = query(usersRef, orderBy('totalXP', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  return queryToData<UserProfile>(snapshot.docs);
};

/**
 * Get user rank
 */
export const getUserRank = async (uid: string): Promise<number> => {
  const userRef = doc(firebaseDb, COLLECTIONS.USERS, uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  const userXP = userData.totalXP || 0;
  
  // Count users with more XP
  const usersRef = collection(firebaseDb, COLLECTIONS.USERS);
  const q = query(usersRef, where('totalXP', '>', userXP));
  const snapshot = await getDocs(q);
  
  return snapshot.size + 1; // Rank is count + 1
};
