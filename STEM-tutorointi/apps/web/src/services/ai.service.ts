// ============================================
// STEM Genius - AI Service
// ============================================

import { getOpenAI, isAIConfigured } from '@/lib/openai';
import { Subject, TaskType, DifficultyLevel } from '@/lib/prisma-types';
import { AI_CONFIG, ERROR_CODES } from '@/config/constants';

// ============================================
// TYPES
// ============================================

export interface TaskGenerationParams {
  subject: Subject;
  topic: string;
  difficulty: number;
  type: TaskType;
  gradeLevel?: number;
}

export interface GeneratedTask {
  question: {
    text: string;
    latex?: string;
    images?: string[];
  };
  answer: {
    correct: string | string[];
    explanation: string;
  };
  solution: {
    steps: Array<{
      step: number;
      description: string;
      latex?: string;
    }>;
  };
  hints: Array<{
    level: number;
    text: string;
  }>;
  estimatedTime: number;
  tags: string[];
}

export interface TutorMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface TutorResponse {
  message: string;
  suggestions?: string[];
  relatedTopics?: string[];
  confidence: number;
}

// ============================================
// AI SERVICE
// ============================================

export class AIService {
  /**
   * Generate a STEM task using AI
   */
  static async generateTask(params: TaskGenerationParams): Promise<GeneratedTask> {
    try {
      const prompt = this.buildTaskGenerationPrompt(params);

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: AI_CONFIG.taskGenerationPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const generatedTask = JSON.parse(content) as GeneratedTask;

      // Validate generated task
      this.validateGeneratedTask(generatedTask);

      return generatedTask;
    } catch (error) {
      console.error('Task generation error:', error);
      throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
    }
  }

  /**
   * Get AI tutor response
   */
  static async getTutorResponse(
    messages: TutorMessage[],
    context?: {
      subject?: Subject;
      topic?: string;
      userLevel?: number;
    }
  ): Promise<TutorResponse> {
    try {
      const systemPrompt = this.buildTutorSystemPrompt(context);

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          ...messages.map((msg) => ({
            role: msg.role as 'user' | 'assistant' | 'system',
            content: msg.content,
          })),
        ],
        temperature: AI_CONFIG.temperature,
        max_tokens: AI_CONFIG.maxTokens,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return {
        message: content,
        confidence: 0.9,
      };
    } catch (error) {
      console.error('Tutor response error:', error);
      throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
    }
  }

  /**
   * Generate hints for a task
   */
  static async generateHints(
    question: string,
    answer: string,
    numHints: number = 3
  ): Promise<string[]> {
    try {
      const prompt = `Generate ${numHints} progressive hints for this problem:

Question: ${question}
Answer: ${answer}

Provide hints that gradually guide the student without giving away the answer.
Return as JSON array of strings.`;

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful STEM tutor creating progressive hints.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const result = JSON.parse(content);
      return result.hints || [];
    } catch (error) {
      console.error('Hint generation error:', error);
      return [];
    }
  }

  /**
   * Explain a concept
   */
  static async explainConcept(
    concept: string,
    subject: Subject,
    level: number = 5
  ): Promise<string> {
    try {
      const prompt = `Explain the concept of "${concept}" in ${subject} for a student at difficulty level ${level}/10.
      
Use clear language, examples, and analogies. Make it engaging and easy to understand.`;

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert STEM educator who explains concepts clearly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return completion.choices[0]?.message?.content || 'Explanation not available.';
    } catch (error) {
      console.error('Concept explanation error:', error);
      throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
    }
  }

  /**
   * Analyze student answer
   */
  static async analyzeAnswer(
    question: string,
    correctAnswer: string,
    studentAnswer: string
  ): Promise<{
    isCorrect: boolean;
    feedback: string;
    partialCredit?: number;
  }> {
    try {
      const prompt = `Analyze this student's answer:

Question: ${question}
Correct Answer: ${correctAnswer}
Student Answer: ${studentAnswer}

Provide:
1. Whether the answer is correct (true/false)
2. Constructive feedback
3. Partial credit percentage if applicable (0-100)

Return as JSON: { "isCorrect": boolean, "feedback": string, "partialCredit": number }`;

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are a fair and encouraging STEM teacher analyzing student work.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Answer analysis error:', error);
      return {
        isCorrect: false,
        feedback: 'Unable to analyze answer. Please try again.',
      };
    }
  }

  /**
   * Generate study plan
   */
  static async generateStudyPlan(params: {
    subject: Subject;
    currentLevel: number;
    targetLevel: number;
    timeframe: number; // days
    weakTopics?: string[];
  }): Promise<{
    title: string;
    description: string;
    topics: Array<{
      topic: string;
      duration: number;
      difficulty: number;
      resources: string[];
    }>;
  }> {
    try {
      const prompt = `Create a personalized study plan:

Subject: ${params.subject}
Current Level: ${params.currentLevel}/10
Target Level: ${params.targetLevel}/10
Timeframe: ${params.timeframe} days
Weak Topics: ${params.weakTopics?.join(', ') || 'None specified'}

Generate a structured study plan with topics, durations, and progression.
Return as JSON with title, description, and topics array.`;

      const completion = await getOpenAI().chat.completions.create({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational planner creating personalized study plans.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Study plan generation error:', error);
      throw new Error(ERROR_CODES.AI_GENERATION_FAILED);
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  private static buildTaskGenerationPrompt(params: TaskGenerationParams): string {
    return `Generate a ${params.subject} task about "${params.topic}".

Requirements:
- Type: ${params.type}
- Difficulty: ${params.difficulty}/10
- Grade Level: ${params.gradeLevel || 'High School'}
- Language: Finnish (with English technical terms)

The task should:
1. Be educationally valuable and engaging
2. Have a clear, unambiguous correct answer
3. Include step-by-step solution
4. Provide 3 progressive hints
5. Be appropriate for the difficulty level
6. Use proper mathematical notation (LaTeX where needed)

Return JSON with this structure:
{
  "question": {
    "text": "Question text",
    "latex": "LaTeX formula if needed"
  },
  "answer": {
    "correct": "Correct answer",
    "explanation": "Why this is correct"
  },
  "solution": {
    "steps": [
      { "step": 1, "description": "First step", "latex": "formula" }
    ]
  },
  "hints": [
    { "level": 1, "text": "First hint" }
  ],
  "estimatedTime": 300,
  "tags": ["tag1", "tag2"]
}`;
  }

  private static buildTutorSystemPrompt(context?: {
    subject?: Subject;
    topic?: string;
    userLevel?: number;
  }): string {
    let prompt = AI_CONFIG.tutorSystemPrompt;

    if (context?.subject) {
      prompt += `\n\nCurrent subject: ${context.subject}`;
    }

    if (context?.topic) {
      prompt += `\nCurrent topic: ${context.topic}`;
    }

    if (context?.userLevel) {
      prompt += `\nStudent level: ${context.userLevel}/10`;
    }

    prompt += `\n\nGuidelines:
- Ask guiding questions instead of giving direct answers
- Provide hints and encouragement
- Use examples and analogies
- Check for understanding
- Adapt to the student's responses
- Be patient and supportive
- Use Finnish when appropriate, English for technical terms`;

    return prompt;
  }

  private static validateGeneratedTask(task: GeneratedTask): void {
    if (!task.question?.text) {
      throw new Error('Invalid task: missing question');
    }

    if (!task.answer?.correct) {
      throw new Error('Invalid task: missing answer');
    }

    if (!task.solution?.steps || task.solution.steps.length === 0) {
      throw new Error('Invalid task: missing solution steps');
    }

    if (!task.hints || task.hints.length === 0) {
      throw new Error('Invalid task: missing hints');
    }
  }

  /**
   * Check if AI service is available
   */
  static isAvailable(): boolean {
    return isAIConfigured();
  }

  /**
   * Get mock task for demo/testing
   */
  static getMockTask(params: TaskGenerationParams): GeneratedTask {
    return {
      question: {
        text: `Solve the equation: 2x + 5 = 13`,
        latex: '2x + 5 = 13',
      },
      answer: {
        correct: 'x = 4',
        explanation: 'Subtract 5 from both sides, then divide by 2',
      },
      solution: {
        steps: [
          { step: 1, description: 'Subtract 5 from both sides', latex: '2x = 8' },
          { step: 2, description: 'Divide both sides by 2', latex: 'x = 4' },
        ],
      },
      hints: [
        { level: 1, text: 'Start by isolating the term with x' },
        { level: 2, text: 'What operation cancels out +5?' },
        { level: 3, text: 'After subtracting 5, you should have 2x = 8' },
      ],
      estimatedTime: 180,
      tags: ['algebra', 'linear-equations', 'basic'],
    };
  }
}
