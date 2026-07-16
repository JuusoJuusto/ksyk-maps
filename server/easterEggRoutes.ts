/**
 * server/easterEggRoutes — thin wrappers around the existing storage
 * easter egg APIs so the client hook can talk to a single, obvious
 * endpoint pathway.
 *
 * Adds:
 *   - POST /api/easter-eggs/found — the client hook writes here.
 *     Accepts { egg, userId } and forwards to storage.trackEasterEggDiscovery.
 *   - POST /api/easter-eggs/reset — admin-only. Nukes every discovery
 *     doc + resets the recent-feed cache.
 *
 * The existing /api/easter-eggs/track + /api/easter-eggs/stats + /recent
 * endpoints in routes.ts stay as-is. `/found` is an alias so both work
 * during the transition.
 */
import type { Express, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";

export function registerEasterEggRoutes(app: Express) {
  // ── POST /found — alias of /track ────────────────────────────────
  // Body:  { egg: string, userId?: string }  (userId is optional so
  //        anonymous clients count too)
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
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── POST /reset — admin-only. Wipes every discovery doc. ─────────
  app.post("/api/easter-eggs/reset", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = (req as unknown as { user?: { role?: string; claims?: { role?: string } } }).user;
      const role = user?.role ?? user?.claims?.role ?? "";
      if (!["admin", "owner"].includes(role)) {
        res.status(403).json({ message: "admin only" });
        return;
      }

      const db = getFirestore();
      // Delete the discovery collection in batched writes so we don't
      // exceed Firestore's 500-op batch limit on large campuses.
      const snap = await db.collection("easterEggDiscoveries").get();
      let deleted = 0;
      const chunkSize = 400;
      for (let i = 0; i < snap.docs.length; i += chunkSize) {
        const chunk = snap.docs.slice(i, i + chunkSize);
        const batch = db.batch();
        for (const doc of chunk) batch.delete(doc.ref);
        await batch.commit();
        deleted += chunk.length;
      }
      // Also clear the recent-feed doc if present.
      await db.collection("easterEggs").doc("recent").set({ entries: [] }, { merge: false }).catch(() => {});

      res.json({ ok: true, deleted });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });
}
