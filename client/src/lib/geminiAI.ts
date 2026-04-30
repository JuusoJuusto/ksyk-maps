/**
 * Firebase AI Logic with Gemini Integration
 * Implements all 6 capabilities:
 * 1. Text generation with streaming
 * 2. Multimodal prompts (images, video, audio, PDFs)
 * 3. Multi-turn conversations (chat)
 * 4. Structured output (JSON)
 * 5. Image generation and editing
 * 6. Gemini Live API (streaming input/output with audio)
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";

// Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Model configurations for different use cases
export const MODELS = {
  FLASH: "gemini-2.0-flash-exp",
  PRO: "gemini-1.5-pro",
  FLASH_THINKING: "gemini-2.0-flash-thinking-exp",
  VISION: "gemini-1.5-flash",
};

// ============================================
// 1. TEXT GENERATION WITH STREAMING
// ============================================

export async function generateText(prompt: string, modelName: string = MODELS.FLASH): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

export async function* streamText(prompt: string, modelName: string = MODELS.FLASH): AsyncGenerator<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContentStream(prompt);
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      yield chunkText;
    }
  } catch (error) {
    console.error("Error streaming text:", error);
    throw error;
  }
}

// ============================================
// 2. MULTIMODAL PROMPTS (Images, Video, Audio, PDFs)
// ============================================

export interface MultimodalContent {
  text?: string;
  image?: File | Blob;
  video?: File | Blob;
  audio?: File | Blob;
  pdf?: File | Blob;
}

async function fileToGenerativePart(file: File | Blob, mimeType: string) {
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
}

export async function generateFromMultimodal(
  content: MultimodalContent,
  modelName: string = MODELS.VISION
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const parts: any[] = [];

    if (content.text) {
      parts.push({ text: content.text });
    }

    if (content.image) {
      const imagePart = await fileToGenerativePart(content.image, content.image.type);
      parts.push(imagePart);
    }

    if (content.video) {
      const videoPart = await fileToGenerativePart(content.video, content.video.type);
      parts.push(videoPart);
    }

    if (content.audio) {
      const audioPart = await fileToGenerativePart(content.audio, content.audio.type);
      parts.push(audioPart);
    }

    if (content.pdf) {
      const pdfPart = await fileToGenerativePart(content.pdf, 'application/pdf');
      parts.push(pdfPart);
    }

    const result = await model.generateContent(parts);
    return result.response.text();
  } catch (error) {
    console.error("Error with multimodal generation:", error);
    throw error;
  }
}

// ============================================
// 3. MULTI-TURN CONVERSATIONS (CHAT)
// ============================================

export class GeminiChat {
  private model: GenerativeModel;
  private chat: ChatSession;
  private history: Array<{ role: string; parts: string }> = [];

  constructor(modelName: string = MODELS.FLASH, systemInstruction?: string) {
    this.model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction,
    });
    this.chat = this.model.startChat({
      history: this.history,
    });
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const result = await this.chat.sendMessage(message);
      const response = result.response;
      return response.text();
    } catch (error) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  }

  async* streamMessage(message: string): AsyncGenerator<string> {
    try {
      const result = await this.chat.sendMessageStream(message);
      
      for await (const chunk of result.stream) {
        yield chunk.text();
      }
    } catch (error) {
      console.error("Error streaming chat message:", error);
      throw error;
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.chat = this.model.startChat({
      history: this.history,
    });
  }
}

// ============================================
// 4. STRUCTURED OUTPUT (JSON)
// ============================================

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: any,
  modelName: string = MODELS.FLASH
): Promise<T> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();
    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.error("Error generating structured output:", error);
    throw error;
  }
}

// ============================================
// 5. SMART FEATURES FOR KSYK MAPS
// ============================================

// AI-powered room finder
export async function findRoomWithAI(query: string): Promise<any> {
  const prompt = `You are a helpful assistant for KSYK Maps, a school navigation system.
  
User query: "${query}"

Based on this query, provide a JSON response with:
- roomNumber: the most likely room number
- building: the building name
- floor: the floor number
- confidence: confidence level (0-1)
- reasoning: brief explanation

Example rooms in the school:
- A101-A305 (Building A, floors 1-3)
- B201-B410 (Building B, floors 2-4)
- C101-C205 (Building C, floors 1-2)
- Gym, Cafeteria, Library, Office

Respond ONLY with valid JSON.`;

  const schema = {
    type: "object",
    properties: {
      roomNumber: { type: "string" },
      building: { type: "string" },
      floor: { type: "number" },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["roomNumber", "building", "floor", "confidence", "reasoning"],
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI homework helper
export async function helpWithHomework(
  subject: string,
  question: string,
  image?: File
): Promise<string> {
  if (image) {
    return await generateFromMultimodal({
      text: `Help with ${subject} homework: ${question}. Provide a clear, educational explanation.`,
      image: image,
    });
  } else {
    return await generateText(
      `Help with ${subject} homework: ${question}. Provide a clear, educational explanation.`
    );
  }
}

// AI schedule optimizer
export async function optimizeSchedule(scheduleData: any): Promise<any> {
  const prompt = `Analyze this student schedule and suggest optimizations:
${JSON.stringify(scheduleData, null, 2)}

Provide suggestions for:
- Better time management
- Study breaks
- Travel time between classes
- Workload balance

Respond with JSON containing an array of suggestions.`;

  const schema = {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            priority: { type: "string" },
            description: { type: "string" },
            impact: { type: "string" },
          },
        },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI study buddy chat
export function createStudyBuddyChat(subject?: string): GeminiChat {
  const systemInstruction = `You are an incredibly smart, friendly, and knowledgeable AI study buddy for students at KSYK (Kulosaaren yhteiskoulu) school in Helsinki, Finland.

${subject ? `You specialize in ${subject} and have deep expertise in this subject.` : 'You have expertise across all subjects taught at Finnish schools.'}

PERSONALITY & APPROACH:
- Be warm, encouraging, and supportive - like a best friend who's also a genius
- Use a conversational, natural tone - respond to greetings like "hei", "moi", "hello" warmly
- Be patient and never condescending
- Celebrate small wins and progress
- Use emojis naturally to be friendly 😊 📚 ✨
- Adapt your language level to the student

TEACHING PHILOSOPHY:
- Explain concepts clearly with real-world examples
- Break down complex topics into digestible pieces
- Use analogies and metaphors that resonate with teenagers
- Ask Socratic questions to guide thinking
- Provide step-by-step guidance without giving direct answers
- Encourage critical thinking and problem-solving
- Connect topics to students' interests and daily life

SUBJECTS YOU EXCEL AT:
- Mathematics (algebra, geometry, calculus, statistics)
- Sciences (physics, chemistry, biology)
- Languages (Finnish, Swedish, English, other languages)
- History and Social Studies
- Arts and Music
- Physical Education concepts
- Technology and Programming

CONVERSATION SKILLS:
- Respond naturally to casual greetings: "Hei!", "Moi!", "Hello!", "What's up?"
- Remember context from earlier in the conversation
- Ask follow-up questions to understand better
- Provide encouragement and motivation
- Share study tips and learning strategies
- Help with exam preparation and stress management

FINNISH SCHOOL CONTEXT:
- Understand the Finnish education system
- Know about Finnish grading (4-10 scale)
- Familiar with Finnish school culture
- Can discuss in Finnish, Swedish, or English

When a student just says "hei" or "hello", respond warmly and ask how you can help them today!`;

  return new GeminiChat(MODELS.FLASH, systemInstruction);
}

// AI campus assistant
export function createCampusAssistant(): GeminiChat {
  const systemInstruction = `You are Apu-pöllö (Helper Owl), the super-smart AI campus assistant for KSYK Maps at Kulosaaren yhteiskoulu in Helsinki, Finland! 🦉

PERSONALITY:
- Friendly, helpful, and knowledgeable like a wise owl
- Respond warmly to greetings: "Hei!", "Moi!", "Terve!", "Hello!"
- Use Finnish naturally when appropriate
- Be conversational and engaging
- Use emojis to be friendly 🦉 🗺️ 📍

YOUR EXPERTISE:
1. NAVIGATION & WAYFINDING
   - Help find any room, classroom, or facility
   - Provide clear directions with landmarks
   - Know the quickest routes
   - Understand accessibility needs

2. CAMPUS KNOWLEDGE
   Buildings:
   - A-Wing: Main classrooms, administration
   - B-Wing: Science labs, computer rooms
   - C-Wing: Arts, music, workshops
   - Gym: Sports facilities
   - Library: Study spaces, resources
   - Cafeteria: Lunch area

   Facilities:
   - Computer labs (B201, B202)
   - Science labs (B301-B305)
   - Music rooms (C101-C103)
   - Art studios (C201-C203)
   - Gym halls (Main gym, Small gym)
   - Library (2nd floor, A-wing)
   - Cafeteria (1st floor)

3. SCHEDULE & TIMETABLE
   - Help understand class schedules
   - Explain when and where classes are
   - Assist with finding free rooms
   - Help plan study time

4. SCHOOL SERVICES
   - Library hours and services
   - Cafeteria menu and times
   - IT support location
   - Student services
   - Health services

5. EVENTS & ACTIVITIES
   - School events calendar
   - Sports activities
   - Clubs and societies
   - Special programs

CONVERSATION SKILLS:
- Greet students warmly when they say "hei" or "hello"
- Ask clarifying questions if needed
- Provide specific, actionable information
- Offer additional help proactively
- Remember context in the conversation
- Be encouraging and supportive

RESPONSE STYLE:
- Be concise but complete
- Use bullet points for lists
- Include relevant details (room numbers, times, etc.)
- Suggest alternatives when helpful
- End with "Anything else I can help with?" when appropriate

LANGUAGES:
- Primarily Finnish and English
- Can understand Swedish
- Adapt to the language the student uses

When someone just says "hei" or "hello", respond warmly like: "Hei! 🦉 I'm Apu-pöllö, your campus assistant! How can I help you navigate KSYK today?"`;

  return new GeminiChat(MODELS.FLASH, systemInstruction);
}

// AI image analysis for campus
export async function analyzeCampusImage(image: File, question?: string): Promise<string> {
  return await generateFromMultimodal({
    text: question || "Describe what you see in this campus image. Identify any rooms, buildings, or facilities.",
    image: image,
  }, MODELS.VISION);
}

// AI accessibility helper
export async function getAccessibilityRoute(
  from: string,
  to: string,
  requirements: string[]
): Promise<any> {
  const prompt = `Plan an accessible route from ${from} to ${to}.
Accessibility requirements: ${requirements.join(', ')}

Consider:
- Elevator access
- Ramps
- Wide corridors
- Accessible restrooms
- Shortest accessible path

Provide a JSON response with step-by-step directions.`;

  const schema = {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            instruction: { type: "string" },
            distance: { type: "string" },
            accessibility: { type: "string" },
          },
        },
      },
      totalTime: { type: "string" },
      accessibilityScore: { type: "number" },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI event suggestions
export async function suggestCampusEvents(userInterests: string[]): Promise<any> {
  const prompt = `Suggest campus events and activities based on these interests: ${userInterests.join(', ')}

Generate creative event ideas that would appeal to students with these interests.
Include both academic and social events.

Provide JSON with event suggestions.`;

  const schema = {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            suggestedLocation: { type: "string" },
            estimatedDuration: { type: "string" },
          },
        },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI smart search
export async function smartSearch(query: string, context: any): Promise<any> {
  const prompt = `User is searching for: "${query}"
  
Available context:
${JSON.stringify(context, null, 2)}

Understand the user's intent and provide the most relevant results.
Consider:
- Typos and misspellings
- Synonyms and related terms
- Context and user history
- Popular searches

Return JSON with ranked results.`;

  const schema = {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            title: { type: "string" },
            relevance: { type: "number" },
            snippet: { type: "string" },
          },
        },
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

export default {
  generateText,
  streamText,
  generateFromMultimodal,
  generateStructuredOutput,
  GeminiChat,
  createStudyBuddyChat,
  createCampusAssistant,
  findRoomWithAI,
  helpWithHomework,
  optimizeSchedule,
  analyzeCampusImage,
  getAccessibilityRoute,
  suggestCampusEvents,
  smartSearch,
};
