import type { Express, RequestHandler } from "express";
import session from "express-session";
import { storage } from "./storage";

// Real authentication with sessions
export async function setupAuth(app: Express) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn(
      "⚠️  SESSION_SECRET env var is not set — using insecure default. " +
      "Set SESSION_SECRET to a long random string in production."
    );
  }

  // Setup session middleware
  app.use(
    session({
      secret: secret || 'ksyk-map-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',        // blocks cross-site POST requests (CSRF mitigation)
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );

  // Add login method to request
  app.use((req: any, res, next) => {
    req.login = (user: any, callback: (err?: any) => void) => {
      req.session.user = user;
      callback();
    };
    
    req.logout = (callback: (err?: any) => void) => {
      req.session.user = null;
      callback();
    };
    
    req.isAuthenticated = () => {
      return !!req.session.user;
    };
    
    req.user = req.session.user || null;
    next();
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};