/**
 * Easter egg endpoints — all Supabase-backed via kvStorage and appLogs.
 */
import type { Express, Request, Response } from "express";
import { kvGet, kvSet, incrementEggCounter, appendEggRecent } from "./kvStorage";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";
import { db } from "./db.js";
import { appLogs } from "../shared/schema.js";
import { eq, like } from "drizzle-orm";

export function registerEasterEggRoutes(app: Express) {
  // POST /found — record an egg discovery
  app.post("/api/easter-eggs/found", async (req: Request, res: Response) => {
    try {
      const { egg, userId } = (req.body ?? {}) as { egg?: string; userId?: string };
      if (typeof egg !== "string" || !/^[a-z0-9-]{1,64}$/.test(egg)) {
        res.status(400).json({ message: "invalid egg id" });
        return;
      }
      await storage.trackEasterEggDiscovery({
        eggId: egg,
        eggName: egg,
        userId: userId || "anonymous",
        timestamp: new Date().toISOString(),
      });
      await storage.createAppLog({
        level: "success",
        message: `🥚 Easter egg discovered: ${egg}`,
        userId: (userId && userId !== "anonymous") ? userId : null,
      }).catch(() => {});
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // POST /reset — admin-only, wipes all egg discovery logs
  app.post("/api/easter-eggs/reset", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as unknown as { user?: { role?: string; claims?: { role?: string } } }).user;
      const role = user?.role ?? user?.claims?.role ?? "";
      if (!["admin", "owner"].includes(role)) {
        res.status(403).json({ message: "admin only" });
        return;
      }
      // Delete egg discovery logs from appLogs
      await db.delete(appLogs).where(like(appLogs.message, '🥚 Easter egg discovered:%'));
      // Reset counters and recent feed in kv_settings
      await kvSet("easterEggCounters", {});
      await kvSet("easterEggRecent", { entries: [] });
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });
}
