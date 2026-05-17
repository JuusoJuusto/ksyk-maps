// ============================================
// STEM Genius - API Client
// Type-safe API client for frontend
// ============================================

import { Subject, TaskType } from './prisma-types';

const API_BASE = '/api';

// ============================================
// ERROR HANDLING
// ============================================

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Get auth token from cookie
function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(c => c.trim().startsWith('auth-token='));
  
  if (!authCookie) return null;
  
  return authCookie.split('=')[1];
}

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') headers[key] = value;
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new APIError(
      error.message || 'Request failed',
      response.status,
      error.code
    );
  }

  return response.json();
}

// ============================================
// USER API
// ============================================

export const userAPI = {
  async getProfile() {
    return fetchAPI<{
      user: any;
      profile: any;
      xp: any;
      streak: any;
    }>('/user/profile');
  },

  async updateProfile(data: any) {
    return fetchAPI('/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getStats() {
    return fetchAPI<{
      xp: number;
      level: number;
      xpToNextLevel: number;
      streak: number;
      longestStreak: number;
      achievements: number;
      totalAchievements: number;
      rank: number;
    }>('/user/stats');
  },

  async getDailyProgress() {
    return fetchAPI<{
      tasksCompleted: number;
      tasksGoal: number;
      xpEarned: number;
      xpGoal: number;
      goalMet: boolean;
    }>('/user/daily-progress');
  },
};

// ============================================
// TASKS API
// ============================================

export const tasksAPI = {
  async getTasks(params?: {
    subject?: Subject;
    difficulty?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.subject) query.set('subject', params.subject);
    if (params?.difficulty) query.set('difficulty', params.difficulty.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    return fetchAPI<{ tasks: any[] }>(`/tasks?${query}`);
  },

  async getTask(id: string) {
    return fetchAPI<{ task: any }>(`/tasks/${id}`);
  },

  async generateTask(params: {
    subject: Subject;
    topic: string;
    difficulty: number;
    type: TaskType;
  }) {
    return fetchAPI<{ task: any }>('/tasks/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async submitAnswer(taskId: string, answer: any, timeSpent?: number, hintsUsed?: number) {
    return fetchAPI<{
      isCorrect: boolean;
      xpEarned: number;
      feedback: string;
      leveledUp?: boolean;
      newLevel?: number;
    }>(`/tasks/${taskId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answer, timeSpent, hintsUsed }),
    });
  },

  async getHint(taskId: string, hintLevel: number) {
    return fetchAPI<{ hint: string }>(`/tasks/${taskId}/hint?level=${hintLevel}`);
  },
};

// ============================================
// AI TUTOR API
// ============================================

export const aiAPI = {
  async sendMessage(params: {
    conversationId?: string;
    message: string;
    subject?: Subject;
    topic?: string;
  }) {
    return fetchAPI<{
      conversationId: string;
      message: string;
      suggestions?: string[];
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async getConversations() {
    return fetchAPI<{ conversations: any[] }>('/ai/conversations');
  },

  async getConversation(id: string) {
    return fetchAPI<{
      conversation: any;
      messages: any[];
    }>(`/ai/conversations/${id}`);
  },

  async explainConcept(params: {
    concept: string;
    subject: Subject;
    level?: number;
  }) {
    return fetchAPI<{ explanation: string }>('/ai/explain', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
};

// ============================================
// GAMIFICATION API
// ============================================

export const gamificationAPI = {
  async getAchievements() {
    return fetchAPI<{
      unlocked: any[];
      locked: any[];
      progress: Record<string, number>;
    }>('/gamification/achievements');
  },

  async getDailyQuests() {
    return fetchAPI<{ quests: any[] }>('/gamification/daily-quests');
  },

  async completeQuest(questId: string) {
    return fetchAPI<{
      xpEarned: number;
      questCompleted: boolean;
    }>(`/gamification/daily-quests/${questId}/complete`, {
      method: 'POST',
    });
  },

  async useStreakFreeze() {
    return fetchAPI<{ success: boolean }>('/gamification/streak-freeze', {
      method: 'POST',
    });
  },
};

// ============================================
// ANALYTICS API
// ============================================

export const analyticsAPI = {
  async getProgress(params?: {
    subject?: Subject;
    timeframe?: 'week' | 'month' | 'year';
  }) {
    const query = new URLSearchParams();
    if (params?.subject) query.set('subject', params.subject);
    if (params?.timeframe) query.set('timeframe', params.timeframe);

    return fetchAPI<{
      overallMastery: number;
      studyTime: number;
      subjects: Array<{
        subject: Subject;
        mastery: number;
        weakTopics: string[];
        strongTopics: string[];
      }>;
      weeklyActivity: Array<{
        date: string;
        tasks: number;
        xp: number;
      }>;
      insights: string[];
    }>(`/analytics/progress?${query}`);
  },

  async getLeaderboard(params?: {
    scope?: 'global' | 'friends' | 'school' | 'class';
    period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
    subject?: Subject;
  }) {
    const query = new URLSearchParams();
    if (params?.scope) query.set('scope', params.scope);
    if (params?.period) query.set('period', params.period);
    if (params?.subject) query.set('subject', params.subject);

    return fetchAPI<{
      entries: Array<{
        rank: number;
        userId: string;
        name: string;
        avatar?: string;
        score: number;
        level: number;
      }>;
      userRank?: number;
    }>(`/analytics/leaderboard?${query}`);
  },

  async getKnowledgeGraph(subject: Subject) {
    return fetchAPI<{
      topics: Array<{
        id: string;
        name: string;
        status: 'locked' | 'available' | 'in-progress' | 'mastered';
        mastery: number;
        prerequisites: string[];
        unlocks: string[];
      }>;
    }>(`/analytics/knowledge-graph?subject=${subject}`);
  },
};

// ============================================
// FEED API
// ============================================

export const feedAPI = {
  async getPersonalizedFeed() {
    return fetchAPI<{
      items: Array<{
        id: string;
        type: 'recommendation' | 'challenge' | 'achievement' | 'insight' | 'countdown' | 'alert' | 'coach-tip';
        title: string;
        description: string;
        action?: {
          label: string;
          href: string;
        };
        metadata?: any;
      }>;
    }>('/feed/personalized');
  },
};

// ============================================
// FLASHCARDS API
// ============================================

export const flashcardsAPI = {
  async getDecks(subject?: Subject) {
    const query = subject ? `?subject=${subject}` : '';
    return fetchAPI<{ decks: any[] }>(`/flashcards/decks${query}`);
  },

  async getDeck(id: string) {
    return fetchAPI<{
      deck: any;
      cards: any[];
    }>(`/flashcards/decks/${id}`);
  },

  async generateDeck(params: {
    subject: Subject;
    topic: string;
    count: number;
  }) {
    return fetchAPI<{ deck: any; cards: any[] }>('/flashcards/generate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async recordReview(cardId: string, quality: number) {
    return fetchAPI('/flashcards/review', {
      method: 'POST',
      body: JSON.stringify({ cardId, quality }),
    });
  },
};

// ============================================
// ONBOARDING API
// ============================================

export const onboardingAPI = {
  async startAssessment() {
    return fetchAPI<{
      assessmentId: string;
      questions: any[];
    }>('/onboarding/assessment/start', {
      method: 'POST',
    });
  },

  async submitAssessment(params: {
    assessmentId: string;
    answers: Array<{
      questionId: string;
      answer: any;
    }>;
  }) {
    return fetchAPI<{
      results: {
        estimatedLevel: number;
        strengths: string[];
        weaknesses: string[];
        recommendations: string[];
      };
    }>('/onboarding/assessment/submit', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async completeOnboarding(data: {
    goals: string[];
    subjects: Subject[];
    studyTime: number;
  }) {
    return fetchAPI('/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
