import type { Express, RequestHandler } from "express";

// Simple mock authentication that bypasses database
export async function setupAuth(app: Express) {
  // Mock session setup without database
  app.use((req: any, res, next) => {
    // Mock user session for development
    req.user = {
      claims: {
        sub: "mock-admin-id",
        email: "admin@ksyk.fi",
        first_name: "Admin",
        last_name: "User"
      }
    };
    req.isAuthenticated = () => true;
    next();
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Always allow access in development mode
  return next();
};