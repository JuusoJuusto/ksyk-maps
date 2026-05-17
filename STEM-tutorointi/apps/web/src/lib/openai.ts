import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

export function getOpenAI(): OpenAI {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return openai;
}

export function isAIConfigured(): boolean {
  return !!apiKey;
}
