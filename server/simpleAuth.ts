import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

// Simple mock authentication that bypasses database
export async function setupAuth(app: Express) {
  // Create admin user if it doesn't exist
  try {
    const adminUser = await storage.getUserByEmail("admin@ksyk.fi");
    if (!adminUser) {
      console.log("Creating admin user for development...");
      await storage.upsertUser({
        id: "mock-admin-id",
        email: "admin@ksyk.fi",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
        profileImageUrl: null
      });
      console.log("Admin user created successfully");
    }
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }

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