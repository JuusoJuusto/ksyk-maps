/**
 * AI Coding Assistant using Gemini API
 * Provides coding help, explanations, and debugging assistance
 */

export interface CodingHelpRequest {
  question: string;
  code?: string;
  language?: string;
  context?: string;
}

export interface CodingHelpResponse {
  success: boolean;
  answer?: string;
  error?: string;
  suggestions?: string[];
}

export async function getCodingHelp(request: CodingHelpRequest): Promise<CodingHelpResponse> {
  try {
    const response = await fetch('/api/ai/coding-help', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    return {
      success: true,
      answer: data.answer,
      suggestions: data.suggestions,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get coding help',
    };
  }
}

export async function explainCode(code: string, language: string = 'python'): Promise<CodingHelpResponse> {
  return getCodingHelp({
    question: `Explain this ${language} code in simple terms:`,
    code,
    language,
  });
}

export async function debugCode(code: string, error: string, language: string = 'python'): Promise<CodingHelpResponse> {
  return getCodingHelp({
    question: `I'm getting this error: "${error}". Can you help me fix it?`,
    code,
    language,
  });
}

export async function improveCode(code: string, language: string = 'python'): Promise<CodingHelpResponse> {
  return getCodingHelp({
    question: 'How can I improve this code? Suggest better practices and optimizations.',
    code,
    language,
  });
}

export async function getHint(exerciseDescription: string, currentCode?: string): Promise<CodingHelpResponse> {
  return getCodingHelp({
    question: `I'm stuck on this exercise: "${exerciseDescription}". Can you give me a hint without giving away the full solution?`,
    code: currentCode,
    context: 'learning exercise',
  });
}

// Offline fallback responses
const offlineResponses = {
  help: "I'm currently offline. Try checking the lesson content or asking your teacher for help!",
  explain: "Code explanation is not available offline. Please connect to the internet.",
  debug: "Debugging assistance requires an internet connection. Try reading the error message carefully and checking your syntax.",
  improve: "Code improvement suggestions are not available offline.",
  hint: "Hints are not available offline. Review the lesson material or try breaking down the problem into smaller steps.",
};

export function getOfflineResponse(type: keyof typeof offlineResponses): CodingHelpResponse {
  return {
    success: false,
    error: offlineResponses[type],
  };
}
