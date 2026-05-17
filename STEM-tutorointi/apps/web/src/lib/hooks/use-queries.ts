// ============================================
// STEM Genius - React Query Hooks
// Type-safe data fetching hooks
// ============================================

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  userAPI,
  tasksAPI,
  aiAPI,
  gamificationAPI,
  analyticsAPI,
  feedAPI,
  flashcardsAPI,
  onboardingAPI,
} from '../api-client';
import { Subject, TaskType } from '../prisma-types';
import { toast } from 'react-hot-toast';

// ============================================
// QUERY KEYS
// ============================================

export const queryKeys = {
  user: {
    profile: ['user', 'profile'] as const,
    stats: ['user', 'stats'] as const,
    dailyProgress: ['user', 'daily-progress'] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (params?: any) => ['tasks', 'list', params] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },
  ai: {
    conversations: ['ai', 'conversations'] as const,
    conversation: (id: string) => ['ai', 'conversation', id] as const,
  },
  gamification: {
    achievements: ['gamification', 'achievements'] as const,
    dailyQuests: ['gamification', 'daily-quests'] as const,
  },
  analytics: {
    progress: (params?: any) => ['analytics', 'progress', params] as const,
    leaderboard: (params?: any) => ['analytics', 'leaderboard', params] as const,
    knowledgeGraph: (subject: Subject) => ['analytics', 'knowledge-graph', subject] as const,
  },
  feed: {
    personalized: ['feed', 'personalized'] as const,
  },
  flashcards: {
    decks: (subject?: Subject) => ['flashcards', 'decks', subject] as const,
    deck: (id: string) => ['flashcards', 'deck', id] as const,
  },
};

// ============================================
// USER HOOKS
// ============================================

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.user.profile,
    queryFn: () => userAPI.getProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: queryKeys.user.stats,
    queryFn: () => userAPI.getStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useDailyProgress() {
  return useQuery({
    queryKey: queryKeys.user.dailyProgress,
    queryFn: () => userAPI.getDailyProgress(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => userAPI.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });
}

// ============================================
// TASKS HOOKS
// ============================================

export function useTasks(params?: {
  subject?: Subject;
  difficulty?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: () => tasksAPI.getTasks(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksAPI.getTask(id),
    enabled: !!id,
  });
}

export function useGenerateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      subject: Subject;
      topic: string;
      difficulty: number;
      type: TaskType;
    }) => tasksAPI.generateTask(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast.success('Task generated successfully');
    },
    onError: () => {
      toast.error('Failed to generate task');
    },
  });
}

export function useSubmitAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, answer, timeSpent, hintsUsed }: { taskId: string; answer: any; timeSpent?: number; hintsUsed?: number }) =>
      tasksAPI.submitAnswer(taskId, answer, timeSpent, hintsUsed),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.dailyProgress });
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.achievements });

      if (data.leveledUp) {
        toast.success(`🎉 Level Up! You're now level ${data.newLevel}!`, {
          duration: 5000,
        });
      } else if (data.isCorrect) {
        toast.success(`✅ Correct! +${data.xpEarned} XP`);
      } else {
        toast.error('❌ Incorrect. Try again!');
      }
    },
    onError: () => {
      toast.error('Failed to submit answer');
    },
  });
}

// ============================================
// AI TUTOR HOOKS
// ============================================

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.ai.conversations,
    queryFn: () => aiAPI.getConversations(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: queryKeys.ai.conversation(id),
    queryFn: () => aiAPI.getConversation(id),
    enabled: !!id,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      conversationId?: string;
      message: string;
      subject?: Subject;
      topic?: string;
    }) => aiAPI.sendMessage(params),
    onSuccess: (data) => {
      if (data.conversationId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.ai.conversation(data.conversationId),
        });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.conversations });
    },
    onError: () => {
      toast.error('Failed to send message');
    },
  });
}

export function useExplainConcept() {
  return useMutation({
    mutationFn: (params: {
      concept: string;
      subject: Subject;
      level?: number;
    }) => aiAPI.explainConcept(params),
    onError: () => {
      toast.error('Failed to get explanation');
    },
  });
}

// ============================================
// GAMIFICATION HOOKS
// ============================================

export function useAchievements() {
  return useQuery({
    queryKey: queryKeys.gamification.achievements,
    queryFn: () => gamificationAPI.getAchievements(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyQuests() {
  return useQuery({
    queryKey: queryKeys.gamification.dailyQuests,
    queryFn: () => gamificationAPI.getDailyQuests(),
    staleTime: 1 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useCompleteQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (questId: string) => gamificationAPI.completeQuest(questId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gamification.dailyQuests });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.stats });
      queryClient.invalidateQueries({ queryKey: queryKeys.user.dailyProgress });
      toast.success(`Quest completed! +${data.xpEarned} XP`);
    },
    onError: () => {
      toast.error('Failed to complete quest');
    },
  });
}

export function useStreakFreeze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => gamificationAPI.useStreakFreeze(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.stats });
      toast.success('Streak freeze used!');
    },
    onError: () => {
      toast.error('No streak freezes available');
    },
  });
}

// ============================================
// ANALYTICS HOOKS
// ============================================

export function useProgress(params?: {
  subject?: Subject;
  timeframe?: 'week' | 'month' | 'year';
}) {
  return useQuery({
    queryKey: queryKeys.analytics.progress(params),
    queryFn: () => analyticsAPI.getProgress(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeaderboard(params?: {
  scope?: 'global' | 'friends' | 'school' | 'class';
  period?: 'daily' | 'weekly' | 'monthly' | 'all-time';
  subject?: Subject;
}) {
  return useQuery({
    queryKey: queryKeys.analytics.leaderboard(params),
    queryFn: () => analyticsAPI.getLeaderboard(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useKnowledgeGraph(subject: Subject) {
  return useQuery({
    queryKey: queryKeys.analytics.knowledgeGraph(subject),
    queryFn: () => analyticsAPI.getKnowledgeGraph(subject),
    enabled: !!subject,
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================
// FEED HOOKS
// ============================================

export function usePersonalizedFeed() {
  return useQuery({
    queryKey: queryKeys.feed.personalized,
    queryFn: () => feedAPI.getPersonalizedFeed(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// ============================================
// FLASHCARDS HOOKS
// ============================================

export function useFlashcardDecks(subject?: Subject) {
  return useQuery({
    queryKey: queryKeys.flashcards.decks(subject),
    queryFn: () => flashcardsAPI.getDecks(subject),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlashcardDeck(id: string) {
  return useQuery({
    queryKey: queryKeys.flashcards.deck(id),
    queryFn: () => flashcardsAPI.getDeck(id),
    enabled: !!id,
  });
}

export function useGenerateFlashcards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      subject: Subject;
      topic: string;
      count: number;
    }) => flashcardsAPI.generateDeck(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.flashcards.decks() });
      toast.success('Flashcards generated successfully');
    },
    onError: () => {
      toast.error('Failed to generate flashcards');
    },
  });
}

export function useRecordReview() {
  return useMutation({
    mutationFn: ({ cardId, quality }: { cardId: string; quality: number }) =>
      flashcardsAPI.recordReview(cardId, quality),
  });
}

// ============================================
// ONBOARDING HOOKS
// ============================================

export function useStartAssessment() {
  return useMutation({
    mutationFn: () => onboardingAPI.startAssessment(),
    onError: () => {
      toast.error('Failed to start assessment');
    },
  });
}

export function useSubmitAssessment() {
  return useMutation({
    mutationFn: (params: {
      assessmentId: string;
      answers: Array<{
        questionId: string;
        answer: any;
      }>;
    }) => onboardingAPI.submitAssessment(params),
    onError: () => {
      toast.error('Failed to submit assessment');
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      goals: string[];
      subjects: Subject[];
      studyTime: number;
    }) => onboardingAPI.completeOnboarding(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.profile });
      toast.success('Welcome to STEM Genius! 🎉');
    },
    onError: () => {
      toast.error('Failed to complete onboarding');
    },
  });
}
