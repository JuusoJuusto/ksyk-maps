// Gemini AI Integration for KSYK Maps
// Using Gemini API directly via REST

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

console.log('🤖 Initializing Gemini AI...');
console.log('API Key set:', !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here');

/**
 * Call Gemini API with a prompt
 */
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    console.warn('⚠️ Gemini API key not set. Using fallback responses.');
    throw new Error('Gemini API key not configured');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return text;
  } catch (error) {
    console.error('❌ Gemini API call failed:', error);
    throw error;
  }
}

console.log('✅ Gemini AI initialized successfully!');

// ============================================
// SMART FEATURES FOR WILMA DASHBOARD
// ============================================

/**
 * 1. Smart Prioritization
 * Analyzes tasks, messages, and events to determine importance
 */
export async function prioritizeItems(items: any[]): Promise<any[]> {
  try {
    const prompt = `Analyze these school items and rank them by importance (1-10, 10 being most urgent):
${JSON.stringify(items, null, 2)}

Return ONLY a valid JSON array with each item having an "importance" score (number) and "reason" field (string). No markdown, no explanation, just the JSON array.`;

    const text = await callGemini(prompt);
    
    // Clean up response - remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Parse JSON response
    const prioritized = JSON.parse(cleanText);
    return prioritized;
  } catch (error) {
    console.error('❌ Prioritization error:', error);
    return items.map(item => ({ ...item, importance: 5, reason: 'Normaali prioriteetti' }));
  }
}

/**
 * 2. Intelligent Notifications
 * Determines which notifications are truly important
 */
export async function filterImportantNotifications(notifications: any[]): Promise<any[]> {
  try {
    const prompt = `Filter these notifications and return only the truly important ones for a student:
${JSON.stringify(notifications, null, 2)}

Return ONLY a valid JSON array of the important notifications with an "urgency" field (low/medium/high). No markdown, just JSON.`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const filtered = JSON.parse(cleanText);
    return filtered;
  } catch (error) {
    console.error('❌ Notification filtering error:', error);
    return notifications.map(n => ({ ...n, urgency: 'medium' }));
  }
}

/**
 * 3. Stress Level Calculation
 * Analyzes workload to calculate student stress level
 */
export async function calculateStressLevel(data: {
  homework: any[];
  exams: any[];
  attendance: number;
  grades: any[];
}): Promise<{
  level: 'low' | 'medium' | 'high';
  score: number;
  advice: string;
}> {
  try {
    const prompt = `Analyze this student's workload and calculate their stress level:
Homework: ${data.homework.length} assignments
Upcoming Exams: ${data.exams.length}
Attendance: ${data.attendance}%
Recent Grades: ${JSON.stringify(data.grades)}

Return ONLY valid JSON (no markdown) with:
{
  "level": "low" or "medium" or "high",
  "score": number between 0-100,
  "advice": "helpful advice in Finnish"
}`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const stressData = JSON.parse(cleanText);
    return stressData;
  } catch (error) {
    console.error('❌ Stress calculation error:', error);
    return {
      level: 'medium',
      score: 50,
      advice: 'Jatka hyvää työtä!'
    };
  }
}

/**
 * 4. Study Recommendations
 * Provides personalized study suggestions based on performance
 */
export async function getStudyRecommendations(studentData: {
  grades: any[];
  subjects: string[];
  weakAreas: string[];
}): Promise<string[]> {
  try {
    const prompt = `Based on this student's performance, provide 3-5 study recommendations in Finnish:
Grades: ${JSON.stringify(studentData.grades)}
Subjects: ${studentData.subjects.join(', ')}
Weak Areas: ${studentData.weakAreas.join(', ')}

Return ONLY a valid JSON array of recommendation strings in Finnish. No markdown, just the array.`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const recommendations = JSON.parse(cleanText);
    return recommendations;
  } catch (error) {
    console.error('❌ Study recommendations error:', error);
    return [
      'Keskity heikkoihin aineisiin',
      'Tee säännöllisesti läksyjä',
      'Kysy opettajalta apua tarvittaessa'
    ];
  }
}

/**
 * 5. Deadline Predictions
 * Predicts if student will meet deadlines based on current progress
 */
export async function predictDeadlineMeeting(homework: any[]): Promise<any[]> {
  try {
    const prompt = `Analyze these homework assignments and predict if the student will meet the deadlines:
${JSON.stringify(homework, null, 2)}

For each assignment, return ONLY valid JSON (no markdown) array with:
{
  "id": "assignment id",
  "willMeetDeadline": true or false,
  "confidence": number 0-100,
  "suggestion": "advice in Finnish"
}`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const predictions = JSON.parse(cleanText);
    return predictions;
  } catch (error) {
    console.error('❌ Deadline prediction error:', error);
    return homework.map(hw => ({
      ...hw,
      willMeetDeadline: true,
      confidence: 75,
      suggestion: 'Aloita ajoissa'
    }));
  }
}

/**
 * 6. Performance Insights
 * Analyzes overall performance and provides insights
 */
export async function getPerformanceInsights(data: {
  grades: any[];
  attendance: number;
  homeworkCompletion: number;
  participationScore: number;
}): Promise<{
  overallScore: number;
  strengths: string[];
  improvements: string[];
  trend: 'improving' | 'stable' | 'declining';
  advice: string;
}> {
  try {
    const prompt = `Analyze this student's overall performance and provide insights in Finnish:
Grades: ${JSON.stringify(data.grades)}
Attendance: ${data.attendance}%
Homework Completion: ${data.homeworkCompletion}%
Participation: ${data.participationScore}/10

Return ONLY valid JSON (no markdown) with:
{
  "overallScore": number 0-100,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["area 1", "area 2"],
  "trend": "improving" or "stable" or "declining",
  "advice": "personalized advice in Finnish"
}`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const insights = JSON.parse(cleanText);
    return insights;
  } catch (error) {
    console.error('❌ Performance insights error:', error);
    return {
      overallScore: 75,
      strengths: ['Hyvä osallistuminen', 'Säännöllinen läsnäolo'],
      improvements: ['Kotitehtävien palautus', 'Kokeiden valmistautuminen'],
      trend: 'stable',
      advice: 'Jatka hyvää työtä ja keskity heikkoihin alueisiin!'
    };
  }
}

/**
 * Generate a motivational message based on student's current state
 */
export async function getMotivationalMessage(context: {
  recentGrades: any[];
  upcomingDeadlines: number;
  stressLevel: string;
}): Promise<string> {
  try {
    const prompt = `Generate a short, encouraging message in Finnish for a student with:
Recent Grades: ${JSON.stringify(context.recentGrades)}
Upcoming Deadlines: ${context.upcomingDeadlines}
Stress Level: ${context.stressLevel}

Return just the message text (no JSON), max 2 sentences.`;

    const text = await callGemini(prompt);
    return text.trim();
  } catch (error) {
    console.error('❌ Motivational message error:', error);
    return 'Jatka hyvää työtä! Olet oikealla tiellä. 💪';
  }
}

/**
 * Smart homework helper - suggests study plan
 */
export async function generateStudyPlan(homework: any[]): Promise<{
  plan: Array<{
    day: string;
    tasks: string[];
    duration: string;
  }>;
  tips: string[];
}> {
  try {
    const prompt = `Create a study plan for these homework assignments in Finnish:
${JSON.stringify(homework, null, 2)}

Return ONLY valid JSON (no markdown) with:
{
  "plan": [
    {
      "day": "Maanantai",
      "tasks": ["task 1", "task 2"],
      "duration": "2 tuntia"
    }
  ],
  "tips": ["tip 1", "tip 2"]
}`;

    const text = await callGemini(prompt);
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const studyPlan = JSON.parse(cleanText);
    return studyPlan;
  } catch (error) {
    console.error('❌ Study plan error:', error);
    return {
      plan: [],
      tips: ['Aloita ajoissa', 'Tee säännöllisesti', 'Pidä taukoja']
    };
  }
}
