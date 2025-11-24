import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "API is working!",
    timestamp: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasFirebase: !!process.env.USE_FIREBASE,
      nodeEnv: process.env.NODE_ENV
    }
  });
}
