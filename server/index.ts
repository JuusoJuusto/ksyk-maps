import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { setupAuth } from "./simpleAuth";
// import { createOwnerAdmin } from "./createOwnerAdmin"; // TODO: Re-enable when file exists

const app = express();

// ── Security headers ──────────────────────────────────────────────────
// Inline middleware so we don't introduce a helmet dependency. Covers
// the same baseline: anti-clickjack, no-sniff, referrer policy, HSTS,
// COOP, a tight CSP that still allows our tile providers + Cloudflare
// beacon + Pyodide. Cross-origin protections lift via env-var if the
// app is embedded somewhere.
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (!res.getHeader("Content-Security-Policy")) {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // Tile providers + Carto/OSM/Stadia attribution links
        "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://*.cartocdn.com https://tiles.stadiamaps.com https://stamen-tiles.a.ssl.fastly.net https://*.tile.openstreetmap.org",
        // Google fonts + Pyodide + Cloudflare beacon
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://replit.com",
        "connect-src 'self' https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://tiles.stadiamaps.com https://cloudflareinsights.com https://*.cloudflareinsights.com https://api.openweathermap.org",
        "worker-src 'self' blob:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }
  next();
});

// Conservative JSON size limit — a 1 MB ceiling stops accidental
// runaway payloads and a class of cheap DoS attacks.
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// Tiny NoSQL-injection guard for body / params / query — strips any
// MongoDB-style operator keys ($where, $ne, $gt, …) that snuck in. We
// use Firestore which isn't directly vulnerable, but Supabase (planned
// migration) and any future raw query will be.
app.use((req, _res, next) => {
  const strip = (obj: unknown): void => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      if (k.startsWith("$") || k.includes(".")) {
        delete (obj as Record<string, unknown>)[k];
      } else {
        strip((obj as Record<string, unknown>)[k]);
      }
    }
  };
  strip(req.body);
  strip(req.params);
  strip(req.query);
  next();
});

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
  await setupAuth(app);
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
  server.listen(port, '0.0.0.0', async () => {
    log(`serving on 0.0.0.0:${port}`);
    
    // Always create owner admin on startup
    // try {
    //   await createOwnerAdmin();
    // } catch (error) {
    //   console.error("Failed to create owner admin:", error);
    // }
    
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
