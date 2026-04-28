# Firebase AI (Gemini) Integration Guide

## Overview
KSYK Maps now includes Firebase AI (Gemini) integration to provide smart, AI-powered features for the Wilma dashboard. This enhances the student experience with intelligent prioritization, stress level monitoring, and personalized recommendations.

## Setup Instructions

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment Variables

Add your Gemini API key to the `.env` file:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your real API key from step 1.

### 3. Restart Development Server

After adding the API key, restart your development server:

```bash
npm run dev
```

## Smart Features Implemented

### 1. Smart Prioritization 🎯
Automatically ranks tasks, messages, and events by importance (1-10 scale).

**Usage:**
```typescript
import { prioritizeItems } from '@/lib/gemini';

const items = [
  { title: 'Math homework', dueDate: '2024-05-01' },
  { title: 'Read chapter 5', dueDate: '2024-05-15' }
];

const prioritized = await prioritizeItems(items);
// Returns items with importance scores and reasons
```

### 2. Intelligent Notifications 🔔
Filters notifications to show only truly important ones.

**Usage:**
```typescript
import { filterImportantNotifications } from '@/lib/gemini';

const notifications = [
  { title: 'New message', type: 'message' },
  { title: 'Exam tomorrow', type: 'exam' }
];

const important = await filterImportantNotifications(notifications);
// Returns only high-priority notifications with urgency levels
```

### 3. Stress Level Calculation 📊
Analyzes student workload and calculates stress level (low/medium/high).

**Usage:**
```typescript
import { calculateStressLevel } from '@/lib/gemini';

const stressData = await calculateStressLevel({
  homework: homeworkList,
  exams: upcomingExams,
  attendance: 95,
  grades: recentGrades
});

console.log(stressData.level); // 'low', 'medium', or 'high'
console.log(stressData.score); // 0-100
console.log(stressData.advice); // Personalized advice in Finnish
```

### 4. Study Recommendations 📚
Provides personalized study suggestions based on performance.

**Usage:**
```typescript
import { getStudyRecommendations } from '@/lib/gemini';

const recommendations = await getStudyRecommendations({
  grades: studentGrades,
  subjects: ['Math', 'Physics', 'English'],
  weakAreas: ['Algebra', 'Grammar']
});

// Returns array of recommendations in Finnish
```

### 5. Deadline Predictions ⏰
Predicts if student will meet homework deadlines.

**Usage:**
```typescript
import { predictDeadlineMeeting } from '@/lib/gemini';

const predictions = await predictDeadlineMeeting(homeworkList);
// Returns each assignment with willMeetDeadline, confidence, and suggestions
```

### 6. Performance Insights 📈
Analyzes overall performance and provides insights.

**Usage:**
```typescript
import { getPerformanceInsights } from '@/lib/gemini';

const insights = await getPerformanceInsights({
  grades: studentGrades,
  attendance: 95,
  homeworkCompletion: 85,
  participationScore: 8
});

console.log(insights.overallScore); // 0-100
console.log(insights.strengths); // Array of strengths
console.log(insights.improvements); // Areas to improve
console.log(insights.trend); // 'improving', 'stable', or 'declining'
console.log(insights.advice); // Personalized advice in Finnish
```

### 7. Motivational Messages 💪
Generates encouraging messages based on student's current state.

**Usage:**
```typescript
import { getMotivationalMessage } from '@/lib/gemini';

const message = await getMotivationalMessage({
  recentGrades: [8, 9, 7],
  upcomingDeadlines: 3,
  stressLevel: 'medium'
});

// Returns a short, encouraging message in Finnish
```

### 8. Study Plan Generator 📅
Creates a personalized study plan for homework assignments.

**Usage:**
```typescript
import { generateStudyPlan } from '@/lib/gemini';

const plan = await generateStudyPlan(homeworkList);

console.log(plan.plan); // Array of daily tasks
console.log(plan.tips); // Study tips in Finnish
```

## Integration with Dashboard

The AI features are designed to work seamlessly with the Wilma dashboard widgets. Here's how to integrate them:

### Example: Smart Homework Widget

```typescript
import { predictDeadlineMeeting, generateStudyPlan } from '@/lib/gemini';

// In your component
const { data: homeworkData } = useQuery({
  queryKey: ['wilma-homework'],
  queryFn: async () => {
    const response = await fetch('/api/wilma/homework');
    const homework = await response.json();
    
    // Add AI predictions
    const predictions = await predictDeadlineMeeting(homework);
    return predictions;
  }
});
```

### Example: Stress Level Widget

```typescript
import { calculateStressLevel } from '@/lib/gemini';

const { data: stressLevel } = useQuery({
  queryKey: ['stress-level', userId],
  queryFn: async () => {
    const stress = await calculateStressLevel({
      homework: homeworkList,
      exams: upcomingExams,
      attendance: attendancePercentage,
      grades: recentGrades
    });
    return stress;
  },
  refetchInterval: 300000 // Refresh every 5 minutes
});
```

## Error Handling

All AI functions include fallback responses if the API fails:

```typescript
try {
  const result = await prioritizeItems(items);
  // Use AI result
} catch (error) {
  // Fallback to default behavior
  console.error('AI feature unavailable:', error);
}
```

## API Limits and Best Practices

### Rate Limits
- Gemini API has rate limits (check Google AI Studio for current limits)
- Implement caching to reduce API calls
- Use `refetchInterval` in React Query to control refresh frequency

### Best Practices
1. **Cache Results:** Use React Query's caching to avoid redundant API calls
2. **Batch Requests:** Combine multiple items in a single API call when possible
3. **Fallback Data:** Always provide fallback data for better UX
4. **Error Boundaries:** Wrap AI features in error boundaries
5. **Loading States:** Show loading indicators while AI processes data

### Example with Caching

```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['ai-insights', userId],
  queryFn: async () => {
    return await getPerformanceInsights(studentData);
  },
  staleTime: 300000, // 5 minutes
  cacheTime: 600000, // 10 minutes
  retry: 1 // Only retry once on failure
});
```

## Troubleshooting

### API Key Not Working
- Verify the API key is correct in `.env`
- Check that the environment variable is loaded: `console.log(import.meta.env.VITE_GEMINI_API_KEY)`
- Restart the development server after changing `.env`

### API Calls Failing
- Check browser console for error messages
- Verify you have internet connection
- Check API quota in Google AI Studio
- Ensure CORS is not blocking requests

### Slow Response Times
- Gemini API can take 2-5 seconds to respond
- Implement loading states in UI
- Consider caching results
- Use optimistic updates where appropriate

## Security Considerations

1. **API Key Protection:**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys regularly

2. **Data Privacy:**
   - Don't send sensitive personal information to AI
   - Anonymize data when possible
   - Follow GDPR guidelines

3. **Rate Limiting:**
   - Implement client-side rate limiting
   - Monitor API usage
   - Set up alerts for unusual activity

## Future Enhancements

Potential improvements for the AI integration:

1. **Real-time Chat Assistant:** AI-powered help bot for students
2. **Automated Study Groups:** AI matches students for study groups
3. **Exam Preparation:** AI generates practice questions
4. **Learning Path Optimization:** AI suggests optimal learning sequences
5. **Teacher Insights:** AI provides insights for teachers about class performance

## Support

For issues or questions:
- Check the [Gemini API Documentation](https://ai.google.dev/docs)
- Review error logs in browser console
- Contact support at: juusojuusto112@gmail.com

---

**Last Updated:** April 28, 2026
**Version:** 1.0.0
