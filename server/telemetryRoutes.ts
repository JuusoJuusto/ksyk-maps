/**
 * server/telemetryRoutes — adblock-resistant analytics ingest.
 *
 * Filter lists (uBlock Origin's EasyList/EasyPrivacy, Brave shields,
 * pi-hole default set) block a large fraction of `/api/analytics/*`
 * requests because the URL contains "analytics". This module publishes
 * the same ingest under a neutrally-named path so most blocked clients
 * still land their events:
 *
 *   POST /api/telemetry/pageview
 *   POST /api/telemetry/track
 *   POST /api/telemetry/feature
 *   POST /api/telemetry/search
 *   GET  /api/t/p            ← last-resort image-beacon fallback
 *
 * Everything writes to the same storage sinks the existing
 * /api/analytics/* endpoints in routes.ts do — same
 * `storage.createPageView`, `storage.createAnalyticsEvent`,
 * `storage.trackFeatureUsage` — so the Overview/Logs panels don't
 * need to know about the URL split.
 *
 * All handlers respond 204 with no body: telemetry is fire-and-forget.
 */
import type { Express, Request, Response } from "express";
import { storage } from "./storage";

interface AnalyticsEventInBody {
  type?: string;
  page?: string;
  eggType?: string;
  feature?: string;
  query?: string;
  timestamp?: string;
  userId?: string;
  sessionId?: string;
}

interface OptionalTelemetryStorage {
  createPageView?: (data: unknown) => Promise<unknown>;
  createAnalyticsEvent?: (data: unknown) => Promise<unknown>;
  trackFeatureUsage?: (data: unknown) => Promise<unknown>;
  trackSearch?: (data: unknown) => Promise<unknown>;
  trackEasterEggDiscovery?: (data: unknown) => Promise<unknown>;
  createAppLog?: (data: unknown) => Promise<unknown>;
}

function opt(): OptionalTelemetryStorage {
  return storage as unknown as OptionalTelemetryStorage;
}

/** Fire-and-forget wrapper — never let a storage error abort the
 *  response, since the client already treats telemetry as best-effort. */
function fireAndForget(fn: () => Promise<unknown>): void {
  fn().catch(() => { /* silent */ });
}

/** Extract client info from the request. All best-effort — the real
 *  data source is what the client sent. */
function clientMeta(req: Request) {
  return {
    ipAddress: (req.ip ?? req.socket.remoteAddress ?? "").replace(/^::ffff:/, ""),
    userAgent: req.get("user-agent") ?? "",
    referrer: req.get("referer") ?? null,
  };
}

export function registerTelemetryRoutes(app: Express) {
  // ── POST /api/telemetry/pageview ─────────────────────────────────
  const handlePageview = (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      page?: string; sessionId?: string; userId?: string; referrer?: string; timestamp?: string;
    };
    const meta = clientMeta(req);
    fireAndForget(async () => {
      if (opt().createPageView) {
        await opt().createPageView!({
          url: body.page ?? "/",
          sessionId: body.sessionId ?? "anon",
          userId: body.userId ?? null,
          referrer: body.referrer ?? meta.referrer,
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
        });
      }
    });
    res.status(204).end();
  };
  app.post("/api/telemetry/pageview", handlePageview);
  // Alias so old cached clients continue to work.
  app.post("/api/analytics/pageview", handlePageview);

  // ── POST /api/telemetry/track ─────────────────────────────────
  const handleTrack = (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      events?: AnalyticsEventInBody[];
      sessionInfo?: { sessionId?: string; userId?: string };
    };
    const meta = clientMeta(req);
    const events = Array.isArray(body.events) ? body.events : [];
    for (const ev of events) {
      fireAndForget(async () => {
        if (opt().createAnalyticsEvent) {
          await opt().createAnalyticsEvent!({
            type: ev.type ?? "event",
            page: ev.page ?? null,
            feature: ev.feature ?? null,
            query: ev.query ?? null,
            eggType: ev.eggType ?? null,
            timestamp: ev.timestamp ?? new Date().toISOString(),
            userId: ev.userId ?? body.sessionInfo?.userId ?? null,
            sessionId: ev.sessionId ?? body.sessionInfo?.sessionId ?? "anon",
            userAgent: meta.userAgent,
            ipAddress: meta.ipAddress,
          });
        }
      });
    }
    res.status(204).end();
  };
  app.post("/api/telemetry/track", handleTrack);
  app.post("/api/analytics/track", handleTrack);
  app.post("/api/analytics/events", handleTrack);

  // ── POST /api/telemetry/feature ─────────────────────────────────
  const handleFeature = (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      name?: string; meta?: unknown; sessionId?: string; userId?: string; timestamp?: string;
    };
    const meta = clientMeta(req);
    fireAndForget(async () => {
      if (opt().trackFeatureUsage) {
        await opt().trackFeatureUsage!({
          name: body.name ?? "unknown",
          meta: body.meta ?? null,
          sessionId: body.sessionId ?? "anon",
          userId: body.userId ?? null,
          timestamp: body.timestamp ?? new Date().toISOString(),
          userAgent: meta.userAgent,
          ipAddress: meta.ipAddress,
        });
      }
    });
    res.status(204).end();
  };
  app.post("/api/telemetry/feature", handleFeature);
  app.post("/api/analytics/feature", handleFeature);

  // ── POST /api/telemetry/search ─────────────────────────────────
  const handleSearch = (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      query?: string; sessionId?: string; userId?: string; timestamp?: string;
    };
    fireAndForget(async () => {
      if (opt().trackSearch) {
        await opt().trackSearch!({
          query: body.query ?? "",
          sessionId: body.sessionId ?? "anon",
          userId: body.userId ?? null,
          timestamp: body.timestamp ?? new Date().toISOString(),
        });
      }
    });
    res.status(204).end();
  };
  app.post("/api/telemetry/search", handleSearch);
  app.post("/api/analytics/search", handleSearch);

  // ── POST /api/t/egg — adblock-safe easter egg discovery ─────────────
  // /api/easter-eggs/* paths get blocked by some filter lists.  This
  // short, neutral path delivers the same write to storage.
  app.post("/api/t/egg", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { eggId?: string; eggName?: string; userId?: string };
    const eggId = typeof body.eggId === "string" ? body.eggId.slice(0, 64) : "";
    if (!eggId || !/^[a-z0-9-]{1,64}$/.test(eggId)) { res.status(204).end(); return; }
    fireAndForget(async () => {
      opt().trackEasterEggDiscovery?.({
        eggId,
        eggName: body.eggName ?? eggId,
        userId: body.userId ?? "anonymous",
        timestamp: new Date().toISOString(),
      });
      opt().createAppLog?.({
        level: "success",
        message: `🥚 Easter egg discovered: ${eggId}`,
        action: "easter_egg",
        userId: null,
        userName: null,
      });
    });
    res.status(204).end();
  });

  // ── GET /api/t/p — pixel beacon fallback ─────────────────────────
  //
  // Called by `new Image().src = "/api/t/p?d=<base64json>"` when the
  // client's `fetch` + `sendBeacon` are both blocked. Response is a
  // 1×1 transparent PNG so the browser doesn't render an error icon
  // in any dev console. Data comes in over the query string, capped
  // at 1500 chars by the client.
  const TRANSPARENT_PIXEL = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64",
  );
  app.get("/api/t/p", (req: Request, res: Response) => {
    try {
      const d = typeof req.query.d === "string" ? req.query.d : "";
      if (d) {
        // Best-effort decode; ignore malformed. Encoded payload is a
        // JSON blob matching one of the POST body shapes.
        try {
          const parsed = JSON.parse(Buffer.from(d, "base64").toString("utf-8"));
          if (parsed && typeof parsed === "object") {
            const meta = clientMeta(req);
            const p = parsed as Record<string, unknown>;
            // Best-guess routing based on payload shape.
            if (typeof p.page === "string") {
              fireAndForget(async () => opt().createPageView?.({
                url: p.page,
                sessionId: p.sessionId ?? "anon",
                userId: p.userId ?? null,
                referrer: meta.referrer,
                userAgent: meta.userAgent,
                ipAddress: meta.ipAddress,
              }));
            } else if (Array.isArray(p.events)) {
              for (const ev of p.events as AnalyticsEventInBody[]) {
                fireAndForget(async () => opt().createAnalyticsEvent?.({
                  ...ev,
                  userAgent: meta.userAgent,
                  ipAddress: meta.ipAddress,
                }));
              }
            }
          }
        } catch { /* malformed payload — ignore */ }
      }
    } finally {
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.set("Pragma", "no-cache");
      res.status(200).send(TRANSPARENT_PIXEL);
    }
  });
}
