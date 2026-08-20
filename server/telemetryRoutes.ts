/**
 * server/telemetryRoutes — adblock-resistant analytics ingest.
 *
 * All handlers write directly to Supabase (pageViews, appLogs,
 * searchAnalytics, kv_settings) so analytics actually persist.
 */
import type { Express, Request, Response } from "express";
import { db } from "./db.js";
import { pageViews, appLogs, searchAnalytics } from "../shared/schema.js";
import { incrementEggCounter, appendEggRecent } from "./kvStorage.js";

function clientMeta(req: Request) {
  return {
    ipAddress: (req.ip ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, ""),
    userAgent: req.get("user-agent") ?? "",
  };
}

function fireAndForget(fn: () => Promise<unknown>): void {
  fn().catch(() => {});
}

export function registerTelemetryRoutes(app: Express) {
  // ── POST /api/telemetry/pageview ─────────────────────────────────────────
  const handlePageview = (req: Request, res: Response) => {
    const { page, sessionId, userId, referrer } = (req.body ?? {}) as Record<string, string>;
    const { userAgent } = clientMeta(req);
    fireAndForget(() =>
      db.insert(pageViews).values({
        url: (page || "/").toString().slice(0, 200),
        sessionId: (sessionId || "anon").toString().slice(0, 60),
        userId: (userId || null) as any,
        referrer: (referrer || "").toString().slice(0, 200),
        userAgent: userAgent.slice(0, 300),
      }).catch(() => {})
    );
    res.status(204).end();
  };
  app.post("/api/telemetry/pageview", handlePageview);
  app.post("/api/analytics/pageview", handlePageview);

  // ── POST /api/telemetry/feature ──────────────────────────────────────────
  const handleFeature = (req: Request, res: Response) => {
    const { name } = (req.body ?? {}) as { name?: string };
    const featureName = (name || "unknown").toString().slice(0, 60);
    fireAndForget(() =>
      db.insert(appLogs).values({
        level: "info",
        message: `feature:${featureName}`,
      }).catch(() => {})
    );
    res.status(204).end();
  };
  app.post("/api/telemetry/feature", handleFeature);
  app.post("/api/analytics/feature", handleFeature);

  // ── POST /api/telemetry/search ───────────────────────────────────────────
  const handleSearch = (req: Request, res: Response) => {
    const { query, sessionId } = (req.body ?? {}) as { query?: string; sessionId?: string };
    const q = (query || "").toString().slice(0, 200).trim();
    if (q) {
      fireAndForget(() =>
        db.insert(searchAnalytics).values({
          query: q,
          sessionId: (sessionId || "anon").toString().slice(0, 60),
        } as any).catch(() => {})
      );
    }
    res.status(204).end();
  };
  app.post("/api/telemetry/search", handleSearch);
  app.post("/api/analytics/search", handleSearch);

  // ── POST /api/telemetry/track ────────────────────────────────────────────
  // General event batch — route egg events to the egg counter.
  const handleTrack = (req: Request, res: Response) => {
    const { events } = (req.body ?? {}) as { events?: any[] };
    if (Array.isArray(events)) {
      for (const ev of events.slice(0, 50)) {
        if (ev?.type === "easter_egg" && typeof ev.eggType === "string") {
          const eggId = ev.eggType.slice(0, 64);
          if (/^[a-z0-9-]{1,64}$/.test(eggId)) {
            fireAndForget(() => incrementEggCounter(eggId));
            fireAndForget(() =>
              appendEggRecent({ egg: eggId, userId: ev.userId ?? "anonymous", at: new Date().toISOString() })
            );
          }
        }
      }
    }
    res.status(204).end();
  };
  app.post("/api/telemetry/track", handleTrack);
  app.post("/api/analytics/track", handleTrack);
  app.post("/api/analytics/events", handleTrack);

  // ── POST /api/t/egg — adblock-safe egg discovery ─────────────────────────
  const handleEgg = (req: Request, res: Response) => {
    const { eggId, eggName, userId } = (req.body ?? {}) as { eggId?: string; eggName?: string; userId?: string };
    const id = (eggId || "").toString().slice(0, 64);
    if (/^[a-z0-9-]{1,64}$/.test(id)) {
      const who = (userId || "anonymous").toString().slice(0, 60);
      fireAndForget(() => incrementEggCounter(id));
      fireAndForget(() => appendEggRecent({ egg: id, userId: who, at: new Date().toISOString() }));
      fireAndForget(() =>
        db.insert(appLogs).values({
          level: "success",
          message: `\u{1F95A} Easter egg discovered: ${id}`,
        }).catch(() => {})
      );
    }
    res.status(204).end();
  };
  app.post("/api/t/egg", handleEgg);

  // ── GET /api/t/p — pixel beacon fallback ─────────────────────────────────
  const TRANSPARENT_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  app.get("/api/t/p", (req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).end(TRANSPARENT_PIXEL);
  });
}
