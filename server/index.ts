import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { createOwnerAdmin } from "./createOwnerAdmin";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, async () => {
    log(`serving on port ${port}`);
    
    // Always create owner admin on startup
    try {
      await createOwnerAdmin();
    } catch (error) {
      console.error("Failed to create owner admin:", error);
    }
    
    // Seed some initial data for demo
    if (process.env.NODE_ENV === 'development') {
      try {
        // Create a sample announcement
        await storage.createAnnouncement({
          title: "🎉 Welcome to KSYK Map!",
          titleEn: "🎉 Welcome to KSYK Map!",
          titleFi: "🎉 Tervetuloa KSYK Karttaan!",
          content: "The new campus map system is now live! Use the Builder tool to create buildings and rooms.",
          contentEn: "The new campus map system is now live! Use the Builder tool to create buildings and rooms.",
          contentFi: "Uusi kampuskarttajärjestelmä on nyt käytössä! Käytä Builder-työkalua rakennusten ja huoneiden luomiseen.",
          priority: "high",
          authorId: "owner-admin-user"
        });
        console.log("✅ Sample data created");
      } catch (error) {
        console.log("ℹ️ Sample data already exists or error:", error.message);
      }
    }
  });
})();
