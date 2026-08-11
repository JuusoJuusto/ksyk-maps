import type { Express, RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_EXPIRY = "24h";
const COOKIE_NAME = "ksyk_auth";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET env var must be set in production");
    }
    console.warn("⚠️  SESSION_SECRET not set — using insecure default (dev only)");
    return "ksyk-map-dev-only-secret-not-for-production";
  }
  return s;
}

function verifyToken(req: any): Record<string, any> | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret()) as Record<string, any>;
  } catch {
    return null;
  }
}

export async function setupAuth(app: Express) {
  // Attach user info from JWT cookie to every request.
  // cookie-parser must already be mounted before this.
  app.use((req: any, res: any, next) => {
    const payload = verifyToken(req);

    // req.login: signs a JWT and sets the httpOnly cookie
    req.login = (user: any, callback: (err?: any) => void) => {
      try {
        const token = jwt.sign(user, getSecret(), { expiresIn: JWT_EXPIRY });
        res.cookie(COOKIE_NAME, token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000,
          path: "/",
        });
        req.user = user;
        callback();
      } catch (err) {
        callback(err);
      }
    };

    // req.logout: clears the cookie
    req.logout = (callback: (err?: any) => void) => {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      req.user = null;
      callback();
    };

    req.user = payload ?? null;
    req.isAuthenticated = () => !!payload;

    // Compat shim for code that reads req.session.user
    // Also provides a per-request in-memory store for temp 2FA state
    req.session = req.session ?? {};
    req.session.user = payload ?? null;
    req.session.destroy = (cb: (err?: any) => void) => cb();

    next();
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};

/** Sign a short-lived challenge token (for email verification codes). */
export function signChallenge(payload: object, expiresIn = "10m"): string {
  return jwt.sign(payload, getSecret(), { expiresIn } as any);
}

/** Verify a challenge token. Returns payload or null. */
export function verifyChallenge(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, getSecret()) as Record<string, any>;
  } catch {
    return null;
  }
}
