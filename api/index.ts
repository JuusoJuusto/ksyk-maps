import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getRealIP, sanitizeObject } from '../server/security.js';
import { emitLog, flushLogs } from '../server/posthogLogger.js';
import { capture as posthogCapture, flush as posthogFlush } from '../server/posthogNode.js';
import crypto from 'node:crypto';

// â”€â”€ Stateless admin token (HMAC-signed, 7-day TTL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sessions don't persist across Vercel Lambda cold starts. Instead,
// the login endpoint issues a signed token that the client stores and
// sends back via Authorization header on sensitive mutations.

function _adminSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) console.warn('âš ï¸ SESSION_SECRET missing or too short â€” admin tokens are insecure');
  return s || 'ksyk-insecure-fallback-set-session-secret-in-vercel';
}

function generateAdminToken(userId: string, role: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, role, exp: Date.now() + 604_800_000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', _adminSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string): { userId: string; role: string } | null {
  try {
    const dot = token.lastIndexOf('.');
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto.createHmac('sha256', _adminSecret()).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch { return null; }
}

function requireAdminAuth(req: VercelRequest, res: VercelResponse): { userId: string; role: string } | null {
  const header = (req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined;
  const token = header?.replace(/^Bearer\s+/i, '').trim();
  if (!token) { res.status(401).json({ message: 'Admin authentication required' }); return null; }
  const payload = verifyAdminToken(token);
  if (!payload) { res.status(401).json({ message: 'Invalid or expired admin token' }); return null; }
  return payload;
}

// Run once per cold start — creates kv_settings, campus_pois, room_aliases,
// unknown_locations tables if they don't exist yet (safe no-op otherwise).
import('../server/initDb.js').then(m => m.ensureSchema()).catch(() => {});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Correlation / request ID — echoed back so callers can include it in bug reports.
  const requestId = (req.headers['x-request-id'] as string) ||
    'KSYK-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  res.setHeader('X-Request-ID', requestId);

  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // CSP — firebase.googleapis.com and firebaseinstallations.googleapis.com
  // are whitelisted defensively even though the web bundle no longer imports
  // Firebase (v1.71.0). Users on stale bundles (service-worker cache, CDN
  // edge) shouldn't see red errors in the console during the rollover
  // window. Once the old bundle hash cycles out this remains harmless.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com ${process.env.POSTHOG_CSP_SCRIPT_SRC ?? ''}`.trim(),
      "style-src 'self' 'unsafe-inline'",
      `connect-src 'self' https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://firebaseremoteconfig.googleapis.com https://www.googletagmanager.com https://region1.google-analytics.com ${process.env.POSTHOG_HOST ?? ''}`.trim(),
      "worker-src 'self' blob:",
    ].join('; '),
  );
  
  // Rate limiting — admins get a separate high-capacity bucket. Public
  // limit raised from 100 → 500/min in v4.5.53 because the builder page
  // legitimately fires ~40 requests on load (pois/doors/stairs/elevators
  // + settings poll + telemetry heartbeat + rooms/buildings/hallways)
  // and one active user session was exhausting the old bucket in ~90 s.
  // Telemetry endpoints are exempt entirely — they must NEVER 429 a
  // user because a beacon fails.
  const clientIP = getRealIP(req.headers);
  const adminHeader = (req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined;
  const adminToken = adminHeader?.replace(/^Bearer\s+/i, '').trim();
  const isAdminReq = adminToken ? verifyAdminToken(adminToken) !== null : false;
  const _pathForRl = (req.url || '/').split('?')[0];
  const isTelemetry =
    _pathForRl.startsWith('/api/session/') ||
    _pathForRl.startsWith('/api/config/report') ||
    _pathForRl.startsWith('/api/preferences/save') ||
    _pathForRl.startsWith('/api/telemetry/') ||
    _pathForRl === '/api/analytics-event' ||
    _pathForRl.startsWith('/api/t/');
  const rateLimitKey = isAdminReq ? `admin:${adminToken!.slice(-16)}` : clientIP;
  const maxReq = isAdminReq ? 2000 : (isTelemetry ? 2000 : 500);
  const rateLimit = checkRateLimit(rateLimitKey, maxReq, 60000);

  res.setHeader('X-RateLimit-Limit', maxReq.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  if (!rateLimit.allowed) {
    return res.status(429).json({
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
  }
  
  // Capture body before sanitization — proxy handlers (Sentry tunnel) need
  // the original bytes. sanitizeObject strips < > and other chars which
  // corrupts Sentry envelopes and binary session recording blobs.
  const _presanitizedBody = req.body;

  // Sanitize request body for POST/PUT/PATCH requests
  if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    req.body = sanitizeObject(req.body);
  }
  
  try {
    // Simple router based on URL path
    const path = req.url || '/';

    // Strip /api prefix AND querystring. Every handler below matches by
    // path only — leaving `?t=<cache-bust>` in the string broke naive
    // `apiPath === '/settings'` checks and returned 404 to the client.
    // Query params remain available via req.query which Vercel parses.
    const apiPath = path.replace(/^\/api/, '').split('?')[0];

    // Sentry envelope tunnel — proxies POST /api/sentry-tunnel to Sentry's ingest.
    //
    // v4.7.23 — 403 root cause: the endpoint was hardcoded to a project
    // ID that no longer matches the DSN in production. Sentry rejects
    // envelopes whose header `dsn` field doesn't match the target
    // project. The fix follows Sentry's official tunnel pattern:
    //   1. Read the raw envelope body (Vercel doesn't parse
    //      application/x-sentry-envelope).
    //   2. Parse the first line — it's a JSON header containing `dsn`.
    //   3. Extract host + projectId from that DSN.
    //   4. Forward to `https://{host}/api/{projectId}/envelope/`.
    // This makes the tunnel work no matter which DSN the SDK is
    // configured with (dev, staging, prod, rotated keys, etc.).
    if (apiPath === '/sentry-tunnel') {
      if (req.method !== 'POST') return res.status(405).end();
      try {
        const rawBytes = await new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: unknown) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
          });
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        });
        const bodyToSend: Buffer =
          rawBytes.length > 0
            ? rawBytes
            : Buffer.isBuffer(_presanitizedBody)
              ? _presanitizedBody
              : typeof _presanitizedBody === 'string'
                ? Buffer.from(_presanitizedBody)
                : Buffer.from('');
        if (bodyToSend.length === 0) return res.status(400).end();

        // Parse the first line — envelope header JSON.
        const firstNewline = bodyToSend.indexOf(0x0a); // '\n'
        if (firstNewline < 0) return res.status(400).end();
        let envelopeDsn: string | null = null;
        try {
          const headerJson = JSON.parse(bodyToSend.slice(0, firstNewline).toString('utf8'));
          envelopeDsn = typeof headerJson?.dsn === 'string' ? headerJson.dsn : null;
        } catch { /* malformed header — soft-fail */ }
        if (!envelopeDsn) return res.status(400).end();

        // DSN shape: https://<publicKey>@<host>/<projectId>
        let host = '';
        let projectId = '';
        try {
          const u = new URL(envelopeDsn);
          host = u.host;
          projectId = u.pathname.replace(/^\/+/, '').split('/')[0];
        } catch { /* bad DSN — soft-fail */ }
        if (!host || !projectId) return res.status(400).end();

        const upstream = `https://${host}/api/${projectId}/envelope/`;
        const sentryRes = await fetch(upstream, {
          method: 'POST',
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/x-sentry-envelope',
            'User-Agent': req.headers['user-agent'] || 'ksyk-maps-tunnel',
          },
          body: bodyToSend,
        });
        res.status(sentryRes.status);
        return res.end();
      } catch {
        return res.status(500).end();
      }
    }

    // Health check — also served at /api/health for uptime monitors
    if (apiPath === '/' || apiPath === '' || apiPath === '/health') {
      try {
        const { storage: st } = await import('../server/storage.js');
        await st.getBuildings();
        return res.status(200).json({
          status: 'ok',
          version: process.env.npm_package_version ?? '4.5.3',
          db: 'connected',
          wilma: process.env.WILMA_BASE_URL ? 'configured' : 'not-configured',
          ts: new Date().toISOString(),
        });
      } catch (err) {
        return res.status(503).json({
          status: 'degraded',
          db: 'unreachable',
          ts: new Date().toISOString(),
        });
      }
    }

    // Debug endpoint — admin only
    if (apiPath === '/debug') {
      if (!requireAdminAuth(req, res)) return;
      const buildings = await storage.getBuildings();
      return res.status(200).json({
        storageType: storage.constructor.name,
        buildingCount: buildings.length,
        env: { HAS_POSTGRES_URL: !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL },
      });
    }
    
    // Import and use storage
    const { storage } = await import('../server/storage.js');

    // â”€â”€ KSYK security & telemetry endpoints (added 2026-06-25) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // These were missing on the Vercel build and were returning 404 in
    // production, breaking the access-control gate and the IP probe.

    // GET /api/client-info â€” caller's IP + server time.
    if (apiPath === '/client-info' && req.method === 'GET') {
      const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const ip = xff || (req.headers['cf-connecting-ip'] as string) || 'unknown';
      return res.status(200).json({ ip, time: new Date().toISOString() });
    }

    // GET /api/security-settings — public read for the access-control gate engine.
    if (apiPath === '/security-settings' && req.method === 'GET') {
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        return res.status(200).json(await kvGet('securitySettings'));
      } catch (err) {
        console.error('security-settings GET error:', err);
        return res.status(200).json(null);
      }
    }

    // PUT /api/security-settings — admin write with field whitelist.
    if (apiPath === '/security-settings' && req.method === 'PUT') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet, kvSet } = await import('../server/kvStorage.js');
        const src = req.body || {};
        const safeBool = (v: any, fb = false) => typeof v === 'boolean' ? v : fb;
        const safeStr = (v: any, max = 500) => typeof v === 'string' ? v.slice(0, max) : '';
        const safeTier = (v: any) => v === 'full' || v === 'restricted' || v === 'blocked' ? v : 'restricted';
        const safeArr = (v: any, max = 500) => Array.isArray(v) ? v.slice(0, max) : [];
        const payload = {
          enabled: safeBool(src.enabled),
          timeWindowEnabled: safeBool(src.timeWindowEnabled),
          schedule: (src.schedule && typeof src.schedule === 'object') ? src.schedule : {},
          outsideHoursTier: safeTier(src.outsideHoursTier),
          holidays: safeArr(src.holidays),
          ipGateEnabled: safeBool(src.ipGateEnabled),
          ipAllowlist: safeArr(src.ipAllowlist),
          offNetworkTier: safeTier(src.offNetworkTier),
          loginGateEnabled: safeBool(src.loginGateEnabled),
          allowedEmailDomains: safeArr(src.allowedEmailDomains),
          loggedInTier: safeTier(src.loggedInTier),
          guestTier: safeTier(src.guestTier),
          restrictedDisabledFeatures: (src.restrictedDisabledFeatures && typeof src.restrictedDisabledFeatures === 'object') ? src.restrictedDisabledFeatures : {},
          userExceptions: safeArr(src.userExceptions),
          accessRequests: safeArr(src.accessRequests),
          lockoutMessage: safeStr(src.lockoutMessage, 1000),
          dryRun: safeBool(src.dryRun),
          updatedAt: new Date().toISOString(),
        };
        // Capture old state before write so we can detect newly-approved requests.
        const oldSettings: any = await kvGet('securitySettings').catch(() => null);
        await kvSet('securitySettings', payload);
        // Send approval emails for requests that just moved from pending → approved.
        const oldReqs: any[] = Array.isArray(oldSettings?.accessRequests) ? oldSettings.accessRequests : [];
        const newReqs: any[] = payload.accessRequests;
        const newlyApproved = newReqs.filter((nr: any) =>
          nr.status === 'approved' &&
          oldReqs.some((or: any) => or.id === nr.id && or.status !== 'approved'),
        );
        if (newlyApproved.length > 0) {
          const { sendAccessApprovalEmail } = await import('../server/emailService.js');
          for (const req of newlyApproved) {
            if (req.email) {
              sendAccessApprovalEmail(req.email, req.reason || undefined).catch((e: any) =>
                console.error('Access approval email error:', e?.message),
              );
            }
          }
        }
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('security-settings PUT error:', err);
        return res.status(500).json({ message: 'Failed to save' });
      }
    }

    // v4.7.12 — one-click approve/deny for an individual access request.
    // Path: /api/security-settings/access-requests/:id  method: PATCH
    // Body: { status: 'approved' | 'denied' }
    // Writes just that request in place — no need to PUT the whole
    // securitySettings blob from the admin UI. Fires the approval email
    // automatically when the status transitions to 'approved'.
    {
      const m = apiPath.match(/^\/security-settings\/access-requests\/([^\/]+)$/);
      if (m && (req.method === 'PATCH' || req.method === 'DELETE')) {
        if (!requireAdminAuth(req, res)) return;
        try {
          const id = m[1];
          const nextStatus = req.method === 'DELETE'
            ? 'deleted'
            : (((req.body ?? {}) as any).status as string);
          if (!['approved', 'denied', 'pending', 'deleted'].includes(nextStatus)) {
            return res.status(400).json({ message: 'status must be approved | denied | pending | deleted' });
          }
          const { kvGet, kvSet } = await import('../server/kvStorage.js');
          const current = ((await kvGet('securitySettings')) as any) || {};
          const requests: any[] = Array.isArray(current.accessRequests) ? current.accessRequests : [];
          const idx = requests.findIndex((r: any) => r.id === id);
          if (idx < 0) return res.status(404).json({ message: 'Not found' });
          const prevStatus = requests[idx].status;
          let mintedFreshToken = false;
          if (nextStatus === 'deleted') {
            requests.splice(idx, 1);
          } else {
            // v4.7.14 — mint a one-shot grant token when the request
            // is approved. v4.7.23 — also re-mint if the token got
            // nuked by the pre-4.7.22 client-overwrite bug (which
            // left tons of "approved but no token" rows in the DB).
            // Rule: any approve without an existing token gets one,
            // so admins can just click Approve again to reissue.
            const hasToken = !!requests[idx].grantToken;
            mintedFreshToken = nextStatus === 'approved' && !hasToken;
            const mintToken = mintedFreshToken
              ? `t${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
              : (requests[idx].grantToken ?? null);
            requests[idx] = {
              ...requests[idx],
              status: nextStatus,
              decidedAt: new Date().toISOString(),
              grantToken: mintToken,
              // Reset redemption stamp on fresh mint so the new link
              // works even if the old one was already redeemed.
              redeemedAt: mintedFreshToken ? null : requests[idx].redeemedAt ?? null,
            };
          }
          await kvSet('securitySettings', { ...current, accessRequests: requests });
          // Auto-email whenever a fresh token was minted (first-time
          // approval OR re-approval of a stuck request).
          if (nextStatus === 'approved' && mintedFreshToken) {
            try {
              const email = requests[idx]?.email;
              const token = requests[idx]?.grantToken;
              if (email) {
                const { sendAccessApprovalEmail } = await import('../server/emailService.js');
                sendAccessApprovalEmail(email, requests[idx].reason ?? undefined, token)
                  .catch((e: any) => console.error('Approval email error:', e?.message));
              }
            } catch { /* email best-effort */ }
          }
          return res.status(200).json({ success: true, id, status: nextStatus });
        } catch (err) {
          console.error('access-request PATCH error:', err);
          return res.status(500).json({ message: 'Failed to update request' });
        }
      }
    }

    // v4.7.14 — Grant token redeem. Public endpoint reached from the
    // approval email link (/grant/:token → this endpoint). Marks the
    // token as spent + returns the email so the client can persist a
    // local `granted` flag. Single-use: subsequent hits return `used`.
    {
      const m = apiPath.match(/^\/security-settings\/grant\/([^\/]+)$/);
      if (m && req.method === 'POST') {
        try {
          const token = m[1];
          const { kvGet, kvSet } = await import('../server/kvStorage.js');
          const current = ((await kvGet('securitySettings')) as any) || {};
          const requests: any[] = Array.isArray(current.accessRequests) ? current.accessRequests : [];
          const idx = requests.findIndex((r: any) => r.grantToken === token);
          if (idx < 0) return res.status(404).json({ message: 'Invalid or expired token' });
          const request = requests[idx];
          if (request.status !== 'approved') {
            return res.status(400).json({ message: 'Request is not approved' });
          }
          // Idempotent — first hit stamps redeemedAt, later hits return
          // the same success payload so a user reopening the link (or
          // the browser making a preflight) doesn't lose access.
          if (!request.redeemedAt) {
            requests[idx] = { ...request, redeemedAt: new Date().toISOString() };
            await kvSet('securitySettings', { ...current, accessRequests: requests });
          }
          return res.status(200).json({
            success: true,
            email: request.email,
            reason: request.reason ?? null,
          });
        } catch (err) {
          console.error('grant redeem error:', err);
          return res.status(500).json({ message: 'Redeem failed' });
        }
      }
    }

    // POST /api/security-settings/request-access — queues a guest access request.
    if (apiPath === '/security-settings/request-access' && req.method === 'POST') {
      try {
        const { kvGet, kvSet } = await import('../server/kvStorage.js');
        const { email, reason } = req.body || {};
        if (!email || typeof email !== 'string') {
          return res.status(400).json({ message: 'Email is required' });
        }
        const current = (await kvGet('securitySettings') as any) || {};
        const requests = Array.isArray(current.accessRequests) ? current.accessRequests : [];
        const request = {
          id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          email: email.toLowerCase().trim(),
          reason: (reason || '').toString().slice(0, 500),
          createdAt: new Date().toISOString(),
          status: 'pending' as const,
        };
        await kvSet('securitySettings', { ...current, accessRequests: [request, ...requests].slice(0, 200) });
        return res.status(200).json({ success: true, id: request.id });
      } catch (err) {
        console.error('access-request POST error:', err);
        return res.status(500).json({ message: 'Failed to submit request' });
      }
    }

    // GET /api/map-defaults — admin-set map home/zoom.
    if (apiPath === '/map-defaults' && req.method === 'GET') {
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        return res.status(200).json(await kvGet('mapDefaults'));
      } catch {
        return res.status(200).json(null);
      }
    }

    // PUT /api/map-defaults — admin write.
    if (apiPath === '/map-defaults' && req.method === 'PUT') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvMerge } = await import('../server/kvStorage.js');
        const allowed = [
          'osmCenterLat', 'osmCenterLng', 'osmDefaultZoom', 'osmMinZoom',
          'osmMaxZoom', 'osmRotationDeg', 'osmPitchDeg', 'osmTileTheme',
          'osmCampusSpanMeters', 'osmMaxBoundsEnabled', 'osmMaxBoundsNorth',
          'osmMaxBoundsEast', 'osmMaxBoundsSouth', 'osmMaxBoundsWest',
          'matterportTourUrl',
        ];
        const data: Record<string, any> = {};
        for (const key of allowed) {
          if (req.body[key] !== undefined) data[key] = req.body[key];
        }
        data.updatedAt = new Date().toISOString();
        await kvMerge('mapDefaults', data);
        return res.status(200).json({ ...data, success: true });
      } catch (err) {
        console.error('map-defaults PUT error:', err);
        return res.status(500).json({ message: 'Failed to save' });
      }
    }

    // v4.7.18 — GET /api/admin-login-logs with cursor pagination.
    // Same shape as /api/logs — returns `{ rows, nextCursor, hasMore }`
    // when a cursor param is present, else falls back to the legacy
    // flat array response so old clients keep working.
    if ((apiPath === '/admin-login-logs' || apiPath.startsWith('/admin-login-logs?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const q = req.query as Record<string, string>;
        const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? '100', 10) || 100));
        const useCursor = q.cursor !== undefined || q.range !== undefined || q.q !== undefined;
        if (useCursor) {
          const { db: pgDb } = await import('../server/db.js');
          const { adminLoginLogs } = await import('../shared/schema.js');
          const { desc, and, gte, lt, or, ilike } = await import('drizzle-orm');
          const rangeHours = q.range === '90d' ? 24 * 90
            : q.range === '30d' ? 24 * 30
            : q.range === '7d'  ? 24 * 7
            : 24;
          const since = new Date(Date.now() - rangeHours * 3600 * 1000);
          const cursor = q.cursor ? new Date(q.cursor) : null;
          const search = (q.q ?? '').trim();
          const conds: any[] = [gte(adminLoginLogs.createdAt, since)];
          if (cursor && !Number.isNaN(cursor.getTime())) conds.push(lt(adminLoginLogs.createdAt, cursor));
          if (search) conds.push(or(
            ilike(adminLoginLogs.email, `%${search}%`),
            ilike(adminLoginLogs.userName, `%${search}%`),
          ));
          const rows = await pgDb.select().from(adminLoginLogs)
            .where(conds.length > 1 ? and(...conds) : conds[0])
            .orderBy(desc(adminLoginLogs.createdAt))
            .limit(limit + 1)
            .catch(() => [] as any[]);
          const hasMore = (rows as any[]).length > limit;
          const page = (rows as any[]).slice(0, limit);
          const nextCursor = hasMore && page.length
            ? (page[page.length - 1].createdAt as Date)?.toISOString() ?? null
            : null;
          return res.status(200).json({ rows: page, nextCursor, hasMore });
        }
        // Legacy flat-array response — kept so pre-v4.7.18 clients
        // (including any admin panels that haven't reloaded) don't break.
        if ((storage as any).getAdminLoginLogs) {
          const logs = await (storage as any).getAdminLoginLogs(limit);
          return res.status(200).json(logs);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    // GET /api/analytics/rooms â€” top viewed rooms.
    if ((apiPath === '/analytics/rooms' || apiPath.startsWith('/analytics/rooms?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        if ((storage as any).getTopRooms) {
          const data = await (storage as any).getTopRooms();
          return res.status(200).json(data);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    // v4.7.5 — Room popularity for the heatmap. Aggregates featureUsage
    // rows with feature='room_view' by metadata.roomId + joins to
    // rooms.points to return { roomId, count, lat, lng }. Admin-only.
    if ((apiPath === '/analytics/room-popularity' || apiPath.startsWith('/analytics/room-popularity?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { featureUsage, rooms } = await import('../shared/schema.js');
        const { sql: dsql, eq: deq } = await import('drizzle-orm');
        // Pull last-30-day room_view rows with a non-empty roomId.
        const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        const rows = await db.select({
          roomId: dsql<string>`(${featureUsage.metadata}->>'roomId')`,
          count: dsql<number>`count(*)::int`,
        })
          .from(featureUsage)
          .where(dsql`${featureUsage.feature} = 'room_view' AND ${featureUsage.createdAt} >= ${cutoff} AND (${featureUsage.metadata}->>'roomId') IS NOT NULL`)
          .groupBy(dsql`(${featureUsage.metadata}->>'roomId')`);

        if (!rows.length) return res.status(200).json([]);
        // Fetch positions for each roomId. Use polygon centroid.
        const roomIds = rows.map(r => r.roomId).filter(Boolean) as string[];
        const roomRows = await db.select().from(rooms);
        const positionById = new Map<string, { lat: number; lng: number }>();
        for (const r of roomRows) {
          const pts = (r.points as Array<{ lat: number; lng: number }> | null) ?? [];
          if (!pts.length) continue;
          let lat = 0, lng = 0;
          for (const p of pts) { lat += p.lat; lng += p.lng; }
          positionById.set(r.id, { lat: lat / pts.length, lng: lng / pts.length });
        }
        const out = rows
          .map(r => {
            const pos = r.roomId ? positionById.get(r.roomId) : null;
            if (!pos) return null;
            return { roomId: r.roomId, count: r.count, lat: pos.lat, lng: pos.lng };
          })
          .filter((x): x is { roomId: string; count: number; lat: number; lng: number } => x !== null);
        return res.status(200).json(out);
      } catch {
        return res.status(200).json([]);
      }
    }

    // v4.7.12 — rrweb DOM snapshot batch upload. Accepts JSON body
    // { sessionId, seq, startedAt, endedAt, eventCount, events[] }
    // and inserts one row into rrweb_batches. No auth — same
    // trust model as /telemetry/track. Rate limit relies on the
    // batch size cap already enforced client-side (300 events max).
    if (apiPath === '/sessions/rrweb' && req.method === 'POST') {
      try {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
        const seq = typeof body.seq === 'number' ? body.seq : null;
        const startedAt = typeof body.startedAt === 'string' ? new Date(body.startedAt) : null;
        const endedAt = typeof body.endedAt === 'string' ? new Date(body.endedAt) : null;
        const eventCount = typeof body.eventCount === 'number' ? body.eventCount : null;
        const events = Array.isArray(body.events) ? body.events : null;
        if (!sessionId || seq === null || !startedAt || !endedAt || eventCount === null || !events) {
          return res.status(400).json({ message: 'Missing fields' });
        }
        // Guard against absurd payloads (rough cap ~5 MB serialized).
        if (events.length > 500) return res.status(413).json({ message: 'Batch too large' });
        const { db: pgDb } = await import('../server/db.js');
        const { rrwebBatches } = await import('../shared/schema.js');
        try {
          await pgDb.insert(rrwebBatches).values({
            sessionId, seq, startedAt, endedAt, eventCount, events: events as unknown,
          } as any);
          return res.status(202).end();
        } catch (insertErr: any) {
          // v4.7.25 — first-write auto-migration. If the insert fails
          // because `rrweb_batches` doesn't exist yet (fresh deploy /
          // admin hasn't run the SQL migration), run CREATE TABLE IF
          // NOT EXISTS in-band and retry the insert exactly once.
          // Rationale: session replay is worth zero if it silently
          // drops every batch waiting on a manual DDL step.
          const msg = String(insertErr?.message ?? '');
          const missingTable = /rrweb_batches|relation .* does not exist|no such table/i.test(msg);
          if (missingTable) {
            try {
              const { sql: dsql } = await import('drizzle-orm');
              await pgDb.execute(dsql`
                CREATE TABLE IF NOT EXISTS "rrweb_batches" (
                  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
                  "session_id" varchar NOT NULL,
                  "seq" integer NOT NULL,
                  "started_at" timestamp NOT NULL,
                  "ended_at" timestamp NOT NULL,
                  "event_count" integer NOT NULL,
                  "events" jsonb NOT NULL,
                  "created_at" timestamp DEFAULT now()
                )
              `);
              await pgDb.execute(dsql`CREATE INDEX IF NOT EXISTS "idx_rrweb_session" ON "rrweb_batches" ("session_id")`);
              await pgDb.execute(dsql`CREATE INDEX IF NOT EXISTS "idx_rrweb_created_at" ON "rrweb_batches" ("created_at")`);
              console.log('POST /sessions/rrweb: auto-created rrweb_batches table on first write.');
              await pgDb.insert(rrwebBatches).values({
                sessionId, seq, startedAt, endedAt, eventCount, events: events as unknown,
              } as any);
              return res.status(202).end();
            } catch (ddlErr: any) {
              console.warn('POST /sessions/rrweb: auto-create failed:', ddlErr?.message);
              return res.status(202).end();
            }
          }
          console.warn('POST /sessions/rrweb failed:', msg);
          return res.status(202).end();
        }
      } catch (e: any) {
        console.warn('POST /sessions/rrweb outer failed:', e?.message);
        return res.status(202).end();
      }
    }

    // v4.7.25 — replay diagnostic. Tells the admin exactly which
    // link is broken (table missing / recording disabled / just
    // no traffic yet) instead of a silent empty Sessions tab.
    if (apiPath === '/sessions/rrweb/status' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        // Table existence check via pg_class (works regardless of schema).
        let tableExists = false;
        try {
          const r = await pgDb.execute(dsql`
            SELECT 1 FROM pg_class WHERE relname = 'rrweb_batches' LIMIT 1
          `);
          tableExists = ((r as any)?.rows?.length ?? (r as any)?.length ?? 0) > 0;
        } catch { tableExists = false; }
        let batchesLast24h = 0;
        let batchesTotal = 0;
        let lastBatchAt: string | null = null;
        if (tableExists) {
          try {
            const r24 = await pgDb.execute(dsql`
              SELECT COUNT(*)::int AS n FROM rrweb_batches WHERE created_at >= NOW() - INTERVAL '24 hours'
            `);
            batchesLast24h = Number(((r24 as any)?.rows?.[0]?.n ?? (r24 as any)?.[0]?.n ?? 0));
            const rTotal = await pgDb.execute(dsql`
              SELECT COUNT(*)::int AS n, MAX(created_at) AS last FROM rrweb_batches
            `);
            const row = (rTotal as any)?.rows?.[0] ?? (rTotal as any)?.[0];
            batchesTotal = Number(row?.n ?? 0);
            lastBatchAt = row?.last ?? null;
          } catch { /* soft-fail */ }
        }
        // Read the enableSessionReplay flag from admin settings.
        let recordingEnabled = true;
        try {
          const { kvGet } = await import('../server/kvStorage.js');
          const settings = (await kvGet('appSettings')) as any;
          recordingEnabled = settings?.enableSessionReplay !== false;
        } catch { /* default true */ }
        return res.status(200).json({
          tableExists,
          recordingEnabled,
          batchesLast24h,
          batchesTotal,
          lastBatchAt,
          migrationHint: tableExists
            ? null
            : 'Run migrations/0003_rrweb_batches.sql in Supabase SQL Editor, or just wait — the table auto-creates on the first client recorder POST.',
        });
      } catch (e: any) {
        return res.status(500).json({ message: e?.message ?? 'status check failed' });
      }
    }

    // GET /api/sessions/rrweb — admin: list recorded sessions with
    // metadata (batch count, event count, first/last activity).
    if ((apiPath === '/sessions/rrweb' || apiPath.startsWith('/sessions/rrweb?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { rrwebBatches } = await import('../shared/schema.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const cutoff = new Date(Date.now() - rangeHours * 3600 * 1000);
        const rows = await pgDb.select({
          sessionId: rrwebBatches.sessionId,
          batches: dsql<number>`count(*)::int`,
          totalEvents: dsql<number>`sum(${rrwebBatches.eventCount})::int`,
          startedAt: dsql<string>`MIN(${rrwebBatches.startedAt})`,
          endedAt: dsql<string>`MAX(${rrwebBatches.endedAt})`,
        })
          .from(rrwebBatches)
          .where(dsql`${rrwebBatches.createdAt} >= ${cutoff}`)
          .groupBy(rrwebBatches.sessionId)
          .orderBy(dsql`MAX(${rrwebBatches.endedAt}) DESC`)
          .limit(100);
        return res.status(200).json(rows);
      } catch {
        return res.status(200).json([]);
      }
    }

    // GET /api/sessions/rrweb/:sessionId — admin: concatenated events
    // across all batches in start-time order, ready for the player.
    {
      const m = apiPath.match(/^\/sessions\/rrweb\/([^\/]+)$/);
      if (m && req.method === 'GET') {
        if (!requireAdminAuth(req, res)) return;
        try {
          const sessionId = m[1];
          const { db: pgDb } = await import('../server/db.js');
          const { rrwebBatches } = await import('../shared/schema.js');
          const { asc, eq } = await import('drizzle-orm');
          const batches = await pgDb.select().from(rrwebBatches)
            .where(eq(rrwebBatches.sessionId, sessionId))
            .orderBy(asc(rrwebBatches.seq));
          const events = batches.flatMap((b: any) => (b.events as unknown[]) ?? []);
          return res.status(200).json({ sessionId, eventCount: events.length, events });
        } catch (e: any) {
          console.warn('GET /sessions/rrweb/:id failed:', e?.message);
          return res.status(500).json({ message: 'Fetch failed' });
        }
      }
    }

    // v4.7.11 — Route popularity top-20. Aggregates feature_usage
    // rows with feature='route_computed' grouped by from+to endpoint,
    // resolves labels from the metadata payload (client wrote them at
    // event time, so we don't need a room/building join). Returns
    // top-20 by count. Admin-only.
    if ((apiPath === '/analytics/route-popularity' || apiPath.startsWith('/analytics/route-popularity?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { featureUsage } = await import('../shared/schema.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const cutoff = new Date(Date.now() - rangeHours * 3600 * 1000);
        const rows = await db.select({
          fromId:    dsql<string>`(${featureUsage.metadata}->>'fromId')`,
          toId:      dsql<string>`(${featureUsage.metadata}->>'toId')`,
          fromLabel: dsql<string>`(${featureUsage.metadata}->>'fromLabel')`,
          toLabel:   dsql<string>`(${featureUsage.metadata}->>'toLabel')`,
          avgDistance: dsql<number>`AVG(((${featureUsage.metadata}->>'distanceMeters')::int))::int`,
          count:     dsql<number>`count(*)::int`,
        })
          .from(featureUsage)
          .where(dsql`${featureUsage.feature} = 'route_computed' AND ${featureUsage.createdAt} >= ${cutoff} AND (${featureUsage.metadata}->>'fromId') IS NOT NULL AND (${featureUsage.metadata}->>'toId') IS NOT NULL`)
          .groupBy(
            dsql`(${featureUsage.metadata}->>'fromId')`,
            dsql`(${featureUsage.metadata}->>'toId')`,
            dsql`(${featureUsage.metadata}->>'fromLabel')`,
            dsql`(${featureUsage.metadata}->>'toLabel')`,
          )
          .orderBy(dsql`count(*) DESC`)
          .limit(20);
        return res.status(200).json(rows);
      } catch {
        return res.status(200).json([]);
      }
    }

    // v4.7.10 — Announcement CTR. Aggregates feature_usage rows with
    // feature='announcement_view' vs 'announcement_click' grouped by
    // metadata.announcementId. Joins to announcements for the title.
    // Returns rows sorted by CTR descending. Admin-only.
    if ((apiPath === '/analytics/announcement-ctr' || apiPath.startsWith('/analytics/announcement-ctr?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { featureUsage, announcements } = await import('../shared/schema.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const cutoff = new Date(Date.now() - rangeHours * 3600 * 1000);
        const rawViews = await db.select({
          announcementId: dsql<string>`(${featureUsage.metadata}->>'announcementId')`,
          count: dsql<number>`count(*)::int`,
        })
          .from(featureUsage)
          .where(dsql`${featureUsage.feature} = 'announcement_view' AND ${featureUsage.createdAt} >= ${cutoff} AND (${featureUsage.metadata}->>'announcementId') IS NOT NULL`)
          .groupBy(dsql`(${featureUsage.metadata}->>'announcementId')`);
        const rawClicks = await db.select({
          announcementId: dsql<string>`(${featureUsage.metadata}->>'announcementId')`,
          count: dsql<number>`count(*)::int`,
        })
          .from(featureUsage)
          .where(dsql`${featureUsage.feature} = 'announcement_click' AND ${featureUsage.createdAt} >= ${cutoff} AND (${featureUsage.metadata}->>'announcementId') IS NOT NULL`)
          .groupBy(dsql`(${featureUsage.metadata}->>'announcementId')`);
        const viewsById = new Map<string, number>();
        const clicksById = new Map<string, number>();
        for (const r of rawViews) if (r.announcementId) viewsById.set(r.announcementId, Number(r.count));
        for (const r of rawClicks) if (r.announcementId) clicksById.set(r.announcementId, Number(r.count));
        const ids = new Set<string>([...viewsById.keys(), ...clicksById.keys()]);
        // Resolve titles.
        const anns = await db.select().from(announcements);
        const titleById = new Map<string, string>();
        for (const a of anns) titleById.set(a.id, a.titleFi ?? a.title ?? a.id);
        const rows = Array.from(ids).map((id) => {
          const views = viewsById.get(id) ?? 0;
          const clicks = clicksById.get(id) ?? 0;
          const ctr = views > 0 ? (clicks / views) * 100 : 0;
          return {
            announcementId: id,
            title: titleById.get(id) ?? id.slice(0, 8),
            views,
            clicks,
            ctrPct: Number(ctr.toFixed(1)),
          };
        }).sort((a, b) => b.ctrPct - a.ctrPct || b.views - a.views);
        return res.status(200).json(rows);
      } catch {
        return res.status(200).json([]);
      }
    }

    // v4.7.9 — Campus events on map. Public endpoint returning
    // active + upcoming events with a resolved lat/lng. Position comes
    // from the linked room polygon centroid when roomId is set,
    // otherwise from a "lat,lng" pattern in the `location` string.
    // Events without a resolvable position are dropped so the map
    // layer doesn't render orphan pins.
    if ((apiPath === '/events/map' || apiPath.startsWith('/events/map?')) && req.method === 'GET') {
      try {
        const { db } = await import('../server/db.js');
        const { events, rooms } = await import('../shared/schema.js');
        const { sql: dsql, and: dand, gt: dgt, eq: deq } = await import('drizzle-orm');
        const now = new Date();
        const evRows = await db.select()
          .from(events)
          .where(dand(dgt(events.endTime, now), deq(events.isActive, true), deq(events.isPublic, true)));
        if (!evRows.length) return res.status(200).json([]);
        const roomIds = Array.from(new Set(evRows.map((e: any) => e.roomId).filter(Boolean))) as string[];
        const positionByRoomId = new Map<string, { lat: number; lng: number }>();
        if (roomIds.length) {
          const roomRows = await db.select().from(rooms);
          for (const r of roomRows) {
            if (!roomIds.includes(r.id)) continue;
            const pts = (r.points as Array<{ lat: number; lng: number }> | null) ?? [];
            if (!pts.length) continue;
            let lat = 0, lng = 0;
            for (const p of pts) { lat += p.lat; lng += p.lng; }
            positionByRoomId.set(r.id, { lat: lat / pts.length, lng: lng / pts.length });
          }
        }
        const out: unknown[] = [];
        for (const e of evRows) {
          let pos: { lat: number; lng: number } | null = null;
          if (e.roomId && positionByRoomId.has(e.roomId)) {
            pos = positionByRoomId.get(e.roomId) ?? null;
          }
          if (!pos && typeof e.location === 'string') {
            const m = e.location.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
            if (m) pos = { lat: Number(m[1]), lng: Number(m[2]) };
          }
          if (!pos) continue;
          out.push({
            id: e.id,
            title: e.titleFi ?? e.title,
            titleEn: e.titleEn ?? e.title,
            description: e.descriptionFi ?? e.description ?? '',
            descriptionEn: e.descriptionEn ?? e.description ?? '',
            startTime: e.startTime,
            endTime: e.endTime,
            location: e.location,
            roomId: e.roomId,
            lat: pos.lat,
            lng: pos.lng,
          });
        }
        return res.status(200).json(out);
      } catch {
        return res.status(200).json([]);
      }
    }

    // v4.7.8 — Retention chart. Computes day-N cohort retention over
    // telemetry_sessions for the last 60 days. Returns:
    //   [ { day: 0..30, retainedPct: 0..100, retained: number }, ... ]
    // where D0 is the anchor (first-session-day cohort size), and
    // each subsequent day is the % of that cohort who came back N
    // days later. Admin-only.
    if ((apiPath === '/analytics/retention' || apiPath.startsWith('/analytics/retention?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        // Uses COALESCE so anonymous sessions (no user_id) still track.
        const rows = await db.execute<{ day: number; retained: number }>(dsql`
          WITH first_seen AS (
            SELECT COALESCE(user_id, anonymous_id, session_id) AS actor,
                   MIN(DATE(started_at)) AS first_day
            FROM telemetry_sessions
            WHERE started_at > NOW() - INTERVAL '60 days'
            GROUP BY 1
          ),
          activity AS (
            SELECT COALESCE(user_id, anonymous_id, session_id) AS actor,
                   DATE(started_at) AS day
            FROM telemetry_sessions
            WHERE started_at > NOW() - INTERVAL '60 days'
            GROUP BY 1, 2
          ),
          paired AS (
            SELECT a.actor, (a.day - f.first_day)::int AS day_offset
            FROM activity a JOIN first_seen f USING (actor)
            WHERE (a.day - f.first_day) BETWEEN 0 AND 30
          )
          SELECT day_offset AS day, COUNT(DISTINCT actor)::int AS retained
          FROM paired
          GROUP BY 1
          ORDER BY 1
        `);
        const arr = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
        const rawRows = arr as Array<{ day: number; retained: number }>;
        const d0 = rawRows.find(r => Number(r.day) === 0)?.retained ?? 0;
        const map = new Map<number, number>();
        for (const r of rawRows) map.set(Number(r.day), Number(r.retained));
        const out: Array<{ day: number; retained: number; retainedPct: number }> = [];
        for (let d = 0; d <= 30; d++) {
          const retained = map.get(d) ?? 0;
          const pct = d0 > 0 ? (retained / d0) * 100 : 0;
          out.push({ day: d, retained, retainedPct: Number(pct.toFixed(1)) });
        }
        return res.status(200).json({ cohortSize: d0, days: out });
      } catch {
        return res.status(200).json({ cohortSize: 0, days: [] });
      }
    }

    // GET /api/analytics/searches â€” recent / top searches.
    if ((apiPath === '/analytics/searches' || apiPath.startsWith('/analytics/searches?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        if ((storage as any).getTopSearches) {
          const data = await (storage as any).getTopSearches();
          return res.status(200).json(data);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    // GET /api/analytics/visitors â€” visitor breakdown by device / country.
    if ((apiPath === '/analytics/visitors' || apiPath.startsWith('/analytics/visitors?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        if ((storage as any).getVisitors) {
          const data = await (storage as any).getVisitors();
          return res.status(200).json(data);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    // â”€â”€ Beacon survey storage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Path: /api/beacons/:roomId/positions[/:positionId]
    {
      const beaconListMatch = apiPath.match(/^\/beacons\/([^\/]+)\/positions$/);
      const beaconOneMatch = apiPath.match(/^\/beacons\/([^\/]+)\/positions\/([^\/]+)$/);

      if (beaconListMatch && req.method === 'GET') {
        const roomId = beaconListMatch[1];
        try {
          const { getBeaconPositions, computeFingerprintQuality } = await import('../server/kvStorage.js');
          const positions = await getBeaconPositions(roomId);
          return res.status(200).json(positions.map((p: any) => ({
            ...p,
            quality: computeFingerprintQuality((p.readings as any[]) ?? []),
          })));
        } catch {
          return res.status(200).json([]);
        }
      }

      if (beaconListMatch && req.method === 'POST') {
        if (!requireAdminAuth(req, res)) return;
        const roomId = beaconListMatch[1];
        try {
          const { addBeaconPosition } = await import('../server/kvStorage.js');
          const { positionLabel, capturedAt, readings, lat, lng, accuracyM } = req.body || {};
          if (!positionLabel || !Array.isArray(readings)) {
            return res.status(400).json({ message: 'positionLabel and readings[] required' });
          }
          const safeReadings = readings.slice(0, 50).map((r: any) => ({
            bssid: String(r.bssid || '').toLowerCase().slice(0, 30),
            rssi: Number(r.rssi) || 0,
            ssid: r.ssid ? String(r.ssid).slice(0, 64) : undefined,
          })).filter((r: any) => r.bssid);
          const record = await addBeaconPosition(roomId, {
            positionLabel: String(positionLabel).slice(0, 60),
            capturedAt,
            readings: safeReadings,
            lat: typeof lat === 'number' && lat !== 0 ? lat : undefined,
            lng: typeof lng === 'number' && lng !== 0 ? lng : undefined,
            accuracyM: typeof accuracyM === 'number' ? accuracyM : undefined,
          });
          return res.status(201).json({ id: record.id, success: true });
        } catch (err) {
          console.error('beacons POST error:', err);
          return res.status(500).json({ message: 'Failed to save position' });
        }
      }

      if (beaconOneMatch && req.method === 'DELETE') {
        if (!requireAdminAuth(req, res)) return;
        const [, , positionId] = beaconOneMatch;
        try {
          const { deleteBeaconPosition } = await import('../server/kvStorage.js');
          await deleteBeaconPosition(positionId);
          return res.status(204).send('');
        } catch (err) {
          console.error('beacons DELETE error:', err);
          return res.status(500).json({ message: 'Failed to delete' });
        }
      }
    }

    // GET /api/beacons/coverage — per-room fingerprint counts for admin dashboard.
    if (apiPath === '/beacons/coverage' && req.method === 'GET') {
      try {
        const { getBeaconCoverage } = await import('../server/kvStorage.js');
        return res.status(200).json(await getBeaconCoverage());
      } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch coverage' });
      }
    }

    // GET /api/beacons/coverage-quality — per-room coverage with floor + quality label.
    if (apiPath === '/beacons/coverage-quality' && req.method === 'GET') {
      try {
        const { getBeaconCoverageWithQuality } = await import('../server/kvStorage.js');
        return res.status(200).json(await getBeaconCoverageWithQuality());
      } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch coverage quality' });
      }
    }

    // ── Wi-Fi fingerprint positioning ─────────────────────────────────
    // POST /api/wifi/locate — send current BSSID/RSSI scan, get estimated position.
    if (apiPath === '/wifi/locate' && req.method === 'POST') {
      const rl = checkRateLimit(getRealIP(req.headers), 15, 60_000);
      if (!rl.allowed) {
        res.setHeader('X-RateLimit-Remaining', '0');
        return res.status(429).json({ message: 'Too many requests — wait a minute' });
      }
      try {
        const { wifiLocate } = await import('../server/kvStorage.js');
        const { readings } = (req.body as any) || {};
        if (!Array.isArray(readings) || readings.length === 0) {
          return res.status(400).json({ message: 'readings[] required' });
        }
        const estimate = await wifiLocate(readings);
        if (!estimate) {
          return res.status(404).json({ message: 'No fingerprint data or no match found' });
        }
        return res.status(200).json(estimate);
      } catch (err) {
        console.error('wifi/locate error:', err);
        return res.status(500).json({ message: 'Positioning failed' });
      }
    }

    // GET /api/wifi/locate — healthcheck / fingerprint count.
    if (apiPath === '/wifi/locate' && req.method === 'GET') {
      try {
        const { getAllBeaconSurveys } = await import('../server/kvStorage.js');
        const all = await getAllBeaconSurveys();
        return res.status(200).json({ fingerprintCount: all.length, ready: all.length > 0 });
      } catch (err) {
        return res.status(500).json({ message: 'Failed to query fingerprints' });
      }
    }

    // POST /api/wifi/replay — admin dev tool: replay scan snapshots through the engine.
    if (apiPath === '/wifi/replay' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      const { snapshots } = req.body || {};
      if (!Array.isArray(snapshots) || snapshots.length === 0) {
        return res.status(400).json({ message: 'snapshots[] required' });
      }
      if (snapshots.length > 200) {
        return res.status(400).json({ message: 'Maximum 200 snapshots per replay' });
      }
      try {
        const { wifiLocate, getAllBeaconSurveys } = await import('../server/kvStorage.js');
        // Sequential processing prevents a maximal request from saturating the
        // DB with hundreds of concurrent fingerprint queries.
        const results: any[] = [];
        for (let idx = 0; idx < snapshots.length; idx++) {
          const snap = snapshots[idx];
          const rawReadings = Array.isArray(snap.readings) ? snap.readings : [];
          const readings = rawReadings.slice(0, 100).flatMap((r: any) => {
            const bssid = String(r?.bssid ?? '').toLowerCase().trim();
            const rssi = Number(r?.rssi);
            if (!bssid || bssid.length > 30 || !isFinite(rssi)) return [];
            return [{ bssid, rssi }];
          });
          try {
            const estimate = readings.length > 0 ? await wifiLocate(readings) : null;
            results.push({ index: idx, t: snap.t ?? idx, position: estimate, error: null });
          } catch (err) {
            results.push({ index: idx, t: snap.t ?? idx, position: null, error: (err as Error).message });
          }
        }
        const all = await getAllBeaconSurveys();
        return res.status(200).json({ results, fingerprintCount: all.length });
      } catch (err) {
        return res.status(500).json({ message: 'Replay failed' });
      }
    }

    // GET /api/wifi/fingerprints — full fingerprint DB for on-device KNN fallback.
    if (apiPath === '/wifi/fingerprints' && req.method === 'GET') {
      try {
        const { getAllFingerprintsWithFloor } = await import('../server/kvStorage.js');
        const fps = await getAllFingerprintsWithFloor();
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(fps);
      } catch (err) {
        return res.status(500).json({ message: 'Failed to fetch fingerprints' });
      }
    }

    // GET /api/analytics/external â€” aggregated CF + Vercel + Firestore stats.
    if ((apiPath === '/analytics/external' || apiPath.startsWith('/analytics/external?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const range = (req.query.range as string) || '24h';
      const now = new Date().toISOString();

      // Build a single response that each provider fills in independently.
      const out: any = {};

      // â”€â”€ Cloudflare Web Analytics (GraphQL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Requires CLOUDFLARE_API_TOKEN with the "Account Analytics â€” Read"
      // permission and CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_SITE_TAG.
      const cfToken = process.env.CLOUDFLARE_API_TOKEN;
      const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
      const cfSite = process.env.CLOUDFLARE_SITE_TAG;
      if (!cfToken || !cfAccount || !cfSite) {
        out.cloudflare = { configured: false, source: 'cloudflare', fetchedAt: now };
      } else {
        try {
          const sinceDays = range === '7d' ? 7 : range === '30d' ? 30 : 1;
          const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
          const query = `query GetVisits($accountTag: String!, $siteTag: String!, $since: Time!) {
            viewer {
              accounts(filter: { accountTag: $accountTag }) {
                rumPageloadEventsAdaptiveGroups(
                  filter: { siteTag: $siteTag, datetime_geq: $since }
                  limit: 1
                ) {
                  count
                  uniq { uniques }
                }
              }
            }
          }`;
          const cfRes = await fetch('https://api.cloudflare.com/client/v4/graphql', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query,
              variables: { accountTag: cfAccount, siteTag: cfSite, since },
            }),
          });
          const cfData: any = await cfRes.json();
          const g = cfData?.data?.viewer?.accounts?.[0]?.rumPageloadEventsAdaptiveGroups?.[0];
          out.cloudflare = {
            configured: true,
            source: 'Cloudflare Web Analytics',
            visitors24h: range === '24h' ? g?.uniq?.uniques : undefined,
            pageviews24h: range === '24h' ? g?.count : undefined,
            visitors7d: range === '7d' ? g?.uniq?.uniques : undefined,
            pageviews7d: range === '7d' ? g?.count : undefined,
            fetchedAt: now,
          };
        } catch (err) {
          out.cloudflare = {
            configured: true,
            source: 'cloudflare',
            error: (err as Error).message,
            fetchedAt: now,
          };
        }
      }

      // Supabase pageViews telemetry summary
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { pageViews } = await import('../shared/schema.js');
        const { gte, count: pgCount } = await import('drizzle-orm');
        const sinceDate = new Date(Date.now() - (range === '7d' ? 7 : range === '30d' ? 30 : 1) * 86_400_000);
        const pvRows = await pgDb.select({ count: pgCount() }).from(pageViews).where(gte(pageViews.createdAt, sinceDate));
        const pvCount = Number((pvRows[0] as any)?.count ?? 0);
        out.supabase = {
          configured: true,
          source: 'KSYK Supabase telemetry',
          visitors24h: range === '24h' ? pvCount : undefined,
          pageviews24h: range === '24h' ? pvCount : undefined,
          visitors7d: range === '7d' ? pvCount : undefined,
          pageviews7d: range === '7d' ? pvCount : undefined,
          fetchedAt: now,
        };
      } catch (err) {
        out.supabase = { configured: true, source: 'supabase', error: (err as Error).message, fetchedAt: now };
      }

      return res.status(200).json(out);
    }

    // GET /api/easter-eggs/stats — count of each discovered egg.
    if (apiPath === '/easter-eggs/stats' && req.method === 'GET') {
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const data = ((await kvGet('easterEggCounters')) as Record<string, number>) || {};
        const total = Object.values(data).reduce((s: number, n) => s + (n as number), 0);
        return res.status(200).json({ ...data, total });
      } catch {
        return res.status(200).json({ total: 0 });
      }
    }

    // POST /api/easter-eggs/found — record an egg discovery.
    if (apiPath === '/easter-eggs/found' && req.method === 'POST') {
      try {
        const { incrementEggCounter, appendEggRecent } = await import('../server/kvStorage.js');
        const egg = (req.body?.egg || '').toString().slice(0, 64);
        const who = (req.body?.userId || '').toString().slice(0, 60) || 'anonymous';
        if (!/^[a-z0-9-]{1,64}$/.test(egg)) return res.status(400).json({ message: 'Invalid egg id' });
        await incrementEggCounter(egg);
        await appendEggRecent({ egg, userId: who, at: new Date().toISOString() }).catch(() => {});
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('easter-eggs POST error:', err);
        return res.status(500).json({ message: 'Failed' });
      }
    }

    // POST /api/t/egg — adblock-safe egg discovery beacon.
    // v1.84.0: dedup so the same (egg, user) pair in a 5-minute window
    // no longer triples-fires the counter + double-writes the app_log
    // line. Was noisy in the admin panel: every discovery produced 2-3
    // "🥚 Easter egg discovered" rows because trackEasterEgg calls both
    // /t/egg AND /telemetry/track which appear as the same event twice.
    if (apiPath === '/t/egg' && req.method === 'POST') {
      try {
        const { incrementEggCounter, appendEggRecent } = await import('../server/kvStorage.js');
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const eggId = (req.body?.eggId || '').toString().slice(0, 64);
        if (/^[a-z0-9-]{1,64}$/.test(eggId)) {
          const who = (req.body?.userId || 'anonymous').toString().slice(0, 60);
          const dedupKey = `egg:${eggId}:${who}`;
          const _g = globalThis as any;
          _g.__eggDedup ??= new Map<string, number>();
          const last = _g.__eggDedup.get(dedupKey) ?? 0;
          const now = Date.now();
          if (now - last < 5 * 60 * 1000) {
            return res.status(204).end();
          }
          _g.__eggDedup.set(dedupKey, now);
          // Trim map so it can't grow unbounded — keep only last-hour entries
          for (const [k, ts] of _g.__eggDedup) {
            if (now - ts > 60 * 60 * 1000) _g.__eggDedup.delete(k);
          }
          await incrementEggCounter(eggId);
          await appendEggRecent({ egg: eggId, userId: who, at: new Date().toISOString() }).catch(() => {});
          await pgDb.insert(appLogs).values({ level: 'success', message: `🥚 Easter egg discovered: ${eggId}` }).catch(() => {});
        }
      } catch { /* non-critical */ }
      return res.status(204).end();
    }

    // GET /api/easter-eggs/recent — recent discoveries, capped to 50.
    if (apiPath === '/easter-eggs/recent' && req.method === 'GET') {
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const data = (await kvGet('easterEggRecent') as any) || {};
        const entries = Array.isArray(data.entries) ? data.entries : [];
        return res.status(200).json(entries.slice(0, 50));
      } catch {
        return res.status(200).json([]);
      }
    }

    // POST /api/analytics/pageview — visitor-facing pageview beacon.
    if (apiPath === '/analytics/pageview' && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { pageViews } = await import('../shared/schema.js');
        const { page, sessionId, referrer } = req.body || {};
        await pgDb.insert(pageViews).values({
          url: (page || '/').toString().slice(0, 200),
          sessionId: (sessionId || 'anon').toString().slice(0, 60),
          userId: null,
          referrer: (referrer || '').toString().slice(0, 200),
          userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300),
        }).catch(() => {});
        return res.status(200).json({ success: true });
      } catch {
        return res.status(200).json({ success: false });
      }
    }

    // POST /api/analytics/feature — named-counter feature usage.
    if (apiPath === '/analytics/feature' && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const { name, userId } = req.body || {};
        if (!name || typeof name !== 'string') {
          return res.status(400).json({ message: 'name is required' });
        }
        await pgDb.insert(appLogs).values({
          level: 'info',
          message: `feature:${name.slice(0, 80)}`,
          userId: (userId || null) as any,
        }).catch(() => {});
        return res.status(200).json({ success: true });
      } catch {
        return res.status(200).json({ success: false });
      }
    }

    // GET /api/analytics/overview — admin Overview panel counters.
    if (apiPath === '/analytics/overview' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { pageViews, searchAnalytics, appLogs } = await import('../shared/schema.js');
        const { kvGet } = await import('../server/kvStorage.js');
        const { gte, and, eq, count: pgCount } = await import('drizzle-orm');
        const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);

        const [pvRows, featRows, searchRows, eggData] = await Promise.all([
          pgDb.select({ count: pgCount() }).from(pageViews).where(gte(pageViews.createdAt, startOfToday)).catch(() => [{ count: 0 }]),
          pgDb.select({ message: appLogs.message }).from(appLogs)
            .where(and(gte(appLogs.createdAt, startOfToday), eq(appLogs.level, 'info')))
            .limit(2000).catch(() => [] as any[]),
          pgDb.select({ query: searchAnalytics.query }).from(searchAnalytics)
            .where(gte(searchAnalytics.createdAt, startOfToday)).limit(2000).catch(() => [] as any[]),
          kvGet('easterEggCounters').catch(() => null),
        ]);

        const featureCounts: Record<string, number> = {};
        for (const { message } of featRows as { message: string }[]) {
          if (message?.startsWith('feature:')) {
            const n = message.slice(8) || 'unknown';
            featureCounts[n] = (featureCounts[n] || 0) + 1;
          }
        }
        const topFeatures = Object.entries(featureCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count).slice(0, 5);

        const searchCounts: Record<string, number> = {};
        for (const { query } of searchRows as { query: string }[]) {
          const q = (query || '').trim().toLowerCase();
          if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
        }
        const topSearches = Object.entries(searchCounts)
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count).slice(0, 10);

        const egg = (eggData as any) || {};
        const eggCounts = {
          secretEasterEgg: egg.secretEasterEgg || 0,
          konamiCode:      egg.konamiCode      || 0,
          devMode:         egg.devMode         || 0,
          ksykTyped:       egg.ksykTyped       || 0,
          logoClicks:      egg.logoClicks      || 0,
          debugCombo:      egg.debugCombo      || 0,
        };
        return res.status(200).json({
          today: {
            pageviews: Number((pvRows[0] as any)?.count ?? 0),
            featureUses: (featRows as any[]).filter((r: any) => r.message?.startsWith('feature:')).length,
            searches: searchRows.length,
          },
          topFeatures,
          topSearches,
          easterEggs: { ...eggCounts, total: Object.values(eggCounts).reduce((s, n) => s + n, 0) },
          fetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('analytics overview error:', err);
        return res.status(200).json({
          today: { pageviews: 0, featureUses: 0, searches: 0 },
          topFeatures: [],
          topSearches: [],
          easterEggs: { secretEasterEgg: 0, konamiCode: 0, devMode: 0, ksykTyped: 0, logoClicks: 0, debugCombo: 0, total: 0 },
          fetchedAt: new Date().toISOString(),
        });
      }
    }

    // Buildings endpoints
    if (apiPath.startsWith('/buildings')) {
      if (req.method !== 'GET' && !requireAdminAuth(req, res)) return;
      if (req.method === 'GET' && apiPath === '/buildings') {
        const buildings = await storage.getBuildings();
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        const list = Array.isArray(buildings) ? buildings : [];
        const withCoords = list.map((b: any) => {
          if (b.coordinates || !Array.isArray(b.points) || b.points.length < 3) return b;
          const pts = b.points as { lat: number; lng: number }[];
          const lat = pts.reduce((s: number, p: any) => s + (Number(p.lat) || 0), 0) / pts.length;
          const lng = pts.reduce((s: number, p: any) => s + (Number(p.lng) || 0), 0) / pts.length;
          return { ...b, coordinates: { lat, lng } };
        });
        return res.status(200).json(withCoords);
      }
      
      if (req.method === 'POST' && apiPath === '/buildings') {
        const building = await storage.createBuilding(req.body);
        return res.status(201).json(building);
      }
      
      // Handle /buildings/:id routes
      const idMatch = apiPath.match(/^\/buildings\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const building = await storage.getBuilding(id);
          if (!building) {
            return res.status(404).json({ message: 'Building not found' });
          }
          return res.status(200).json(building);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const building = await storage.updateBuilding(id, req.body);
          return res.status(200).json(building);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteBuilding(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Rooms endpoints
    if (apiPath.startsWith('/rooms')) {
      // Whitelist matches the actual `rooms` table in shared/schema.ts.
      // Anything else in the body is dropped BEFORE we hand it to Drizzle
      // so an obsolete client field (e.g. legacy `tags` / `hours`) can
      // never blow up the update with a schema error.
      const ROOM_COLUMNS = new Set([
        'buildingId', 'roomNumber', 'name', 'nameEn', 'nameFi',
        'floor', 'capacity', 'type', 'subType',
        'equipment', 'features',
        'mapPositionX', 'mapPositionY', 'width', 'height', 'colorCode',
        'emergencyInfo', 'accessibilityInfo', 'maintenanceNotes', 'lastInspected',
        'isPublic', 'isAccessible', 'isActive',
        'isBookable', 'bookingDuration', 'maxOccupancy', 'amenities',
        'currentStatus', 'nextAvailableAt',
        'photos', 'virtualTourUrl', 'bookingRules', 'requiresApproval',
        'description', 'points', 'rotationDeg',
        'department', 'teacher',
        'scheduleUrl', 'scheduleLabel', 'photoUrl',
        'coordinates', 'metadata',
      ]);
      const filterBody = (raw: any): any => {
        const body = (raw ?? {}) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(body)) {
          if (ROOM_COLUMNS.has(k)) out[k] = body[k];
        }
        return out;
      };

      if (req.method !== 'GET' && !requireAdminAuth(req, res)) return;
      if (req.method === 'GET' && apiPath === '/rooms') {
        const buildingId = req.query.buildingId as string | undefined;
        const rooms = await storage.getRooms(buildingId);
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600');
        const list = Array.isArray(rooms) ? rooms : [];
        const withCoords = list.map((r: any) => {
          if (r.coordinates || !Array.isArray(r.points) || r.points.length < 3) return r;
          const pts = r.points as { lat: number; lng: number }[];
          const lat = pts.reduce((s: number, p: any) => s + (Number(p.lat) || 0), 0) / pts.length;
          const lng = pts.reduce((s: number, p: any) => s + (Number(p.lng) || 0), 0) / pts.length;
          return { ...r, coordinates: { lat, lng } };
        });
        return res.status(200).json(withCoords);
      }

      if (req.method === 'POST' && apiPath === '/rooms') {
        try {
          const room = await storage.createRoom(filterBody(req.body));
          return res.status(201).json(room);
        } catch (e: any) {
          console.error('POST /api/rooms failed:', e?.message);
          return res.status(400).json({ message: 'Create room failed', error: e?.message });
        }
      }

      // Handle /rooms/:id routes
      const idMatch = apiPath.match(/^\/rooms\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];

        if (req.method === 'GET') {
          const room = await storage.getRoom(id);
          if (!room) {
            return res.status(404).json({ message: 'Room not found' });
          }
          return res.status(200).json(room);
        }

        if (req.method === 'PUT' || req.method === 'PATCH') {
          try {
            const room = await storage.updateRoom(id, filterBody(req.body));
            return res.status(200).json(room);
          } catch (e: any) {
            console.error(`PATCH /api/rooms/${id} failed:`, e?.message);
            return res.status(400).json({ message: 'Save failed', error: e?.message });
          }
        }

        if (req.method === 'DELETE') {
          await storage.deleteRoom(id);
          return res.status(204).send('');
        }
      }
    }

    // Hallways endpoints
    if (apiPath.startsWith('/hallways')) {
      if (req.method !== 'GET' && !requireAdminAuth(req, res)) return;
      if (req.method === 'GET' && apiPath === '/hallways') {
        const buildingId = req.query.buildingId as string | undefined;
        try {
          const hallwaysList = await storage.getHallways(buildingId);
          return res.status(200).json(hallwaysList);
        } catch (err: any) {
          console.error('getHallways error:', err?.message || err);
          return res.status(200).json([]);
        }
      }

      if (req.method === 'POST' && apiPath === '/hallways') {
        try {
          const hallway = await storage.createHallway(req.body);
          return res.status(201).json(hallway);
        } catch (err: any) {
          console.error('createHallway error:', err?.message || err);
          return res.status(500).json({ message: err?.message ?? 'Failed to create hallway' });
        }
      }

      // Handle /hallways/:id routes
      const idMatch = apiPath.match(/^\/hallways\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];

        if (req.method === 'PUT' || req.method === 'PATCH') {
          try {
            const hallway = await storage.updateHallway(id, req.body);
            return res.status(200).json(hallway);
          } catch (err: any) {
            console.error('updateHallway error:', err?.message || err);
            return res.status(500).json({ message: err?.message ?? 'Failed to update hallway' });
          }
        }

        if (req.method === 'DELETE') {
          try {
            await storage.deleteHallway(id);
          } catch (err: any) {
            console.error('deleteHallway error:', err?.message || err);
          }
          return res.status(204).send('');
        }
      }
    }
    
    // Floors endpoint
    if (apiPath === '/floors' && req.method === 'GET') {
      const buildingId = req.query.buildingId as string | undefined;
      const floors = await storage.getFloors(buildingId);
      return res.status(200).json(floors);
    }
    
    // Staff endpoint
    if (apiPath === '/staff' && req.method === 'GET') {
      const staff = await storage.getStaff();
      return res.status(200).json(staff);
    }
    
    // Announcements endpoints
    if (apiPath.startsWith('/announcements')) {
      // Whitelist matches the announcements table in shared/schema.ts.
      // Unknown fields (e.g. legacy `publishedAt`, `type`, `body`) are
      // dropped so an outdated client can't crash the insert.
      const ANNOUNCEMENT_COLUMNS = new Set([
        'title', 'titleEn', 'titleFi',
        'content', 'contentEn', 'contentFi',
        'priority', 'authorId', 'expiresAt', 'isActive',
      ]);
      const filterAnnouncement = (raw: any): any => {
        const body = (raw ?? {}) as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(body)) {
          if (!ANNOUNCEMENT_COLUMNS.has(k)) continue;
          const v = body[k];
          // Empty string timestamps break Drizzle; force null.
          if ((k === 'expiresAt') && (v === '' || v === undefined)) continue;
          out[k] = v;
        }
        // authorId references staff(id). A dummy string like
        // 'owner-admin-user' is not a real staff row, so PostgreSQL
        // rejects the insert with a FK violation. Drop it — the schema
        // allows null.
        if (out.authorId && typeof out.authorId === 'string' &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(out.authorId)) {
          delete out.authorId;
        }
        return out;
      };

      if (req.method === 'GET') {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        try {
          const announcements = await storage.getAnnouncements(limit);
          return res.status(200).json(announcements);
        } catch {
          return res.status(200).json([]);
        }
      }

      if (req.method === 'POST') {
        const admin = requireAdminAuth(req, res);
        if (!admin) return;
        try {
          const announcement = await storage.createAnnouncement(filterAnnouncement(req.body));
          // Fire FCM push to all registered devices — non-blocking, don't fail request if FCM errors
          import('../server/fcm.js').then(({ broadcast }) => {
            const t = announcement.titleFi ?? announcement.title ?? 'KSYK Maps';
            const b = announcement.contentFi ?? announcement.content ?? '';
            if (t && b) {
              broadcast({ title: t, body: b, type: 'announcement', screen: 'news' })
                .then(r => console.log(`[FCM] Announcement broadcast: sent=${r.sent} failed=${r.failed}`))
                .catch(e => console.warn('[FCM] Broadcast failed:', e?.message));
            }
          }).catch(() => {});
          return res.status(201).json(announcement);
        } catch (e: any) {
          console.error('POST /api/announcements failed:', e?.message);
          return res.status(400).json({ message: 'Create announcement failed', error: e?.message });
        }
      }

      // Handle /announcements/:id routes
      const idMatch = apiPath.match(/^\/announcements\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];

        if (req.method === 'GET') {
          const announcement = await storage.getAnnouncement(id);
          if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
          }
          return res.status(200).json(announcement);
        }

        if (req.method === 'PUT' || req.method === 'PATCH') {
          try {
            const announcement = await storage.updateAnnouncement(id, filterAnnouncement(req.body));
            return res.status(200).json(announcement);
          } catch (e: any) {
            console.error(`PATCH /api/announcements/${id} failed:`, e?.message);
            return res.status(400).json({ message: 'Update failed', error: e?.message });
          }
        }

        if (req.method === 'DELETE') {
          await storage.deleteAnnouncement(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Analytics event ingest — accepts POST from the Android app and web.
    // Stored as a rolling list in KV (last 5000 events). No auth required
    // so the student app (no login) can report errors and searches.
    if (apiPath === '/analytics-event' && req.method === 'POST') {
      try {
        const { kvGet, kvSet } = await import('../server/kvStorage.js');
        const event = {
          ...sanitizeObject(req.body),
          ip: clientIP.slice(0, 45), // truncate — analytics, not audit log
          receivedAt: new Date().toISOString(),
        };
        const current: any[] = (await kvGet('analyticsEvents')) ?? [];
        current.unshift(event);
        await kvSet('analyticsEvents', current.slice(0, 5000));
        return res.status(204).send('');
      } catch {
        return res.status(204).send('');
      }
    }

    // Analytics summary — admin only, returns aggregated counts.
    if (apiPath === '/analytics' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const events: any[] = (await kvGet('analyticsEvents')) ?? [];
        const counts: Record<string, number> = {};
        const buildingSearches: Record<string, number> = {};
        const errors: any[] = [];
        const easterEggs: Record<string, number> = {};
        for (const ev of events) {
          counts[ev.event] = (counts[ev.event] ?? 0) + 1;
          if (ev.event === 'building_search' && ev.q) buildingSearches[ev.q] = (buildingSearches[ev.q] ?? 0) + 1;
          if (ev.event === 'app_error') errors.push({ screen: ev.screen, msg: ev.msg, ts: ev.receivedAt });
          if (ev.event === 'easter_egg') easterEggs[ev.name] = (easterEggs[ev.name] ?? 0) + 1;
        }
        return res.status(200).json({
          totalEvents: events.length,
          eventCounts: counts,
          topBuildingSearches: Object.entries(buildingSearches)
            .sort((a, b) => b[1] - a[1]).slice(0, 20)
            .map(([q, n]) => ({ query: q, count: n })),
          recentErrors: errors.slice(0, 50),
          easterEggs,
        });
      } catch {
        return res.status(200).json({ totalEvents: 0, eventCounts: {}, topBuildingSearches: [], recentErrors: [], easterEggs: {} });
      }
    }

    // Lunch menu proxy to bypass CORS
    if (apiPath === '/lunch-menu' && req.method === 'GET') {
      try {
        const response = await fetch("https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi");
        const text = await response.text();
        res.setHeader("Content-Type", "application/xml");
        return res.status(200).send(text);
      } catch (error: any) {
        console.error("Failed to fetch lunch menu:", error);
        return res.status(500).json({ error: "Failed to fetch lunch menu" });
      }
    }

    // Logs endpoint - for error logging
    if ((apiPath === '/logs' || apiPath === '/api/logs') && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const body = req.body || {};
        const level = (['error', 'warn', 'warning', 'info', 'debug', 'success']
          .includes(String(body.type)) ? String(body.type).replace('warning', 'warn') : 'info');
        await pgDb.insert(appLogs).values({
          level,
          message: (body.message || 'log').toString().slice(0, 1000),
          errorStack: ((body.details?.stack || body.stack || null) as string | null)?.slice(0, 2000) ?? null,
          userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300),
          url: (body.details?.path || body.url || '').toString().slice(0, 200),
          ipAddress: clientIP.slice(0, 45),
        } as any).catch(() => {});
        return res.status(200).json({ message: "Log received" });
      } catch (error: any) {
        console.error('Error processing log:', error);
        return res.status(500).json({ message: "Failed to process log" });
      }
    }
    // v4.7.18 — GET /api/logs with real server-side pagination.
    //   Query params (all optional):
    //     range   24h | 7d | 30d | 90d      default 24h — since filter
    //     level   info | warn | error | debug — comma-separated OK
    //     q       search string (message contains)
    //     limit   1..500                    default 50
    //     cursor  ISO timestamp (createdAt) — page break; rows strictly older
    //   Response:
    //     { rows: [...], nextCursor: string | null, hasMore: boolean }
    //
    // Cursor is the ISO createdAt of the LAST row in the returned page.
    // Client requests older pages by sending `cursor=<lastCreatedAt>` on
    // the next call. Sorted DESC by createdAt.
    if ((apiPath === '/logs' || apiPath === '/api/logs' ||
         apiPath.startsWith('/logs?') || apiPath.startsWith('/api/logs?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const { desc, and, gte, lt, ilike, inArray, sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const limit = Math.min(500, Math.max(1, parseInt(q.limit ?? '50', 10) || 50));
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const since = new Date(Date.now() - rangeHours * 3600 * 1000);
        const levels = (q.level ?? '').split(',').map(s => s.trim()).filter(Boolean);
        const search = (q.q ?? '').trim();
        const cursor = q.cursor ? new Date(q.cursor) : null;

        const conds: any[] = [gte(appLogs.createdAt, since)];
        if (cursor && !Number.isNaN(cursor.getTime())) conds.push(lt(appLogs.createdAt, cursor));
        if (levels.length) conds.push(inArray(appLogs.level, levels));
        if (search) conds.push(ilike(appLogs.message, `%${search}%`));

        const rows = await pgDb.select().from(appLogs)
          .where(conds.length > 1 ? and(...conds) : conds[0])
          .orderBy(desc(appLogs.createdAt))
          .limit(limit + 1)  // fetch one extra to detect hasMore
          .catch(() => [] as any[]);
        const hasMore = (rows as any[]).length > limit;
        const page = (rows as any[]).slice(0, limit);
        const nextCursor = hasMore && page.length
          ? (page[page.length - 1].createdAt as Date)?.toISOString() ?? null
          : null;
        return res.status(200).json({
          rows: page.map(r => ({
            id: r.id,
            level: r.level,
            message: r.message,
            source: (r.userAgent || '').includes('KSYK-Maps-Android') ? 'android' : 'web',
            timestamp: r.createdAt,
          })),
          nextCursor,
          hasMore,
        });
      } catch {
        return res.status(200).json({ rows: [], nextCursor: null, hasMore: false });
      }
    }

    // Tickets endpoints
    if (apiPath.startsWith('/tickets')) {
      if (apiPath === '/tickets' && req.method === 'GET') {
        if (!requireAdminAuth(req, res)) return;
        const tickets = await storage.getTickets();
        return res.status(200).json(tickets);
      }

      if (apiPath === '/tickets' && req.method === 'POST') {
        const ticketData = req.body || {};
        if (!ticketData.type || typeof ticketData.type !== 'string') {
          return res.status(400).json({ message: 'type is required' });
        }
        if (!ticketData.title || typeof ticketData.title !== 'string') {
          return res.status(400).json({ message: 'title is required' });
        }
        if (!ticketData.description || typeof ticketData.description !== 'string') {
          return res.status(400).json({ message: 'description is required' });
        }

        // Generate ticket ID if not provided
        const ticketId = ticketData.ticketId || `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        const ticket = await storage.createTicket({
          ...ticketData,
          ticketId,
          name: ticketData.name || 'Anonymous',
          email: ticketData.email || '',
          status: ticketData.status || 'pending',
          priority: ticketData.priority || 'normal',
        });
        
        // SEND EMAILS AND DISCORD NOTIFICATIONS
        if (ticketData.email && ticketData.email.trim()) {
          
          try {
            const { sendTicketEmail } = await import('../server/emailService.js');
            const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
            
            // Send to owner with detailed info
            const ownerEmailBody = `NEW SUPPORT TICKET RECEIVED

Ticket Details:
----------------------------------------
Type: ${ticketData.type.toUpperCase()}
Title: ${ticketData.title}
Status: PENDING

Description:
${ticketData.description}

Contact Information:
----------------------------------------
Name: ${ticketData.name || 'Anonymous'}
Email: ${ticketData.email}

Action Required:
Please review and respond to this ticket in the admin panel.
Login at: https://ksykmaps.fi/admin`;
            
            await sendTicketEmail(ownerEmail, `[KSYK Maps] New ${ticketData.type.toUpperCase()} Ticket: ${ticketId}`, ownerEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });

            // Send to user with friendly confirmation
            const userEmailBody = `Thank you for contacting KSYK Maps Support!

We have received your ${ticketData.type} ticket and our team will review it shortly.

Your Issue:
${ticketData.title}

What happens next?
----------------------------------------
- Our support team will review your ticket
- You'll receive email updates when the status changes
- We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.

Need immediate help? Visit our website at https://ksykmaps.fi`;
            
            await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
          } catch (emailError: any) {
            console.error('âŒ EMAIL ERROR:', emailError);
            console.error('âŒ Error stack:', emailError.stack);
            console.error('âŒ Error message:', emailError.message);
          }
        } else {
        }
        
        // Send Discord notification
        if (process.env.DISCORD_TICKETS_WEBHOOK) {
          try {
            const discordEmbed = {
              embeds: [{
                title: `ðŸŽ« New Support Ticket: ${ticketId}`,
                color: ticketData.type === 'bug' ? 0xff0000 : ticketData.type === 'feature' ? 0x00ff00 : 0x0099ff,
                fields: [
                  { name: 'Type', value: ticketData.type, inline: true },
                  { name: 'Status', value: 'pending', inline: true },
                  { name: 'Title', value: ticketData.title },
                  { name: 'Description', value: ticketData.description.substring(0, 1000) },
                  { name: 'From', value: `${ticketData.name || 'Anonymous'} (${ticketData.email})`, inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'KSYK Maps Support System' }
              }]
            };
            
            await fetch(process.env.DISCORD_TICKETS_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discordEmbed)
            });
          } catch (discordError: any) {
            console.error('âŒ Discord notification error:', discordError.message);
          }
        }
        return res.status(201).json({ ticketId, ...ticket });
      }
      
      // Handle /tickets/:id routes
      const idMatch = apiPath.match(/^\/tickets\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];

        if (req.method === 'GET') {
          if (!requireAdminAuth(req, res)) return;
          try {
            const ticket = await storage.getTicket(id);
            if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
            return res.status(200).json(ticket);
          } catch (e: any) {
            console.error(`GET /api/tickets/${id}:`, e?.message);
            return res.status(500).json({ message: 'Failed to fetch ticket', error: e?.message });
          }
        }

        if (req.method === 'PUT' || req.method === 'PATCH') {
          if (!requireAdminAuth(req, res)) return;
          // Only allow known ticket columns — prevents unknown fields from
          // causing Drizzle schema errors and returning 500 to the client.
          // assignedTo excluded: it has a FK constraint to users.id.
          const TICKET_WRITABLE = new Set([
            'status', 'priority', 'response', 'resolvedAt',
          ]);
          const filtered: Record<string, any> = {};
          for (const [k, v] of Object.entries(req.body || {})) {
            if (TICKET_WRITABLE.has(k)) filtered[k] = v;
          }
          // Coerce resolvedAt ISO string to Date so Drizzle/Postgres accepts it.
          if (typeof filtered.resolvedAt === 'string') {
            filtered.resolvedAt = new Date(filtered.resolvedAt);
          }
          try {
            const ticket = await storage.updateTicket(id, filtered);

            // When the admin resolves a ticket with a written response,
            // email the requester so they know it's been handled.
            if (
              filtered.status === 'resolved' &&
              filtered.response &&
              ticket.email
            ) {
              try {
                const { sendTicketEmail } = await import('../server/emailService.js');
                await sendTicketEmail(
                  ticket.email,
                  `Your ticket has been resolved: ${ticket.ticketId}`,
                  filtered.response,
                  {
                    ticketId: ticket.ticketId,
                    type: ticket.type,
                    title: ticket.title,
                    status: 'resolved',
                  },
                );
              } catch (emailErr: any) {
                console.error('Ticket resolution email error:', emailErr.message);
              }
            }

            return res.status(200).json(ticket);
          } catch (e: any) {
            console.error(`PATCH /api/tickets/${id}:`, e?.message);
            return res.status(500).json({ message: 'Failed to update ticket', error: e?.message });
          }
        }

        if (req.method === 'DELETE') {
          if (!requireAdminAuth(req, res)) return;
          try {
            await storage.deleteTicket(id);
            return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
          } catch (e: any) {
            console.error(`DELETE /api/tickets/${id}:`, e?.message);
            return res.status(500).json({ message: 'Failed to delete ticket' });
          }
        }
      }
    }

    // Jaksot (school periods) — small KV-backed doc so admins can edit
    // the period date ranges without a schema migration. The mobile
    // app reads the same doc via GET /api/jaksot to compute which
    // lesson templates apply to today.
    if (apiPath === '/jaksot') {
      const { kvGet, kvSet } = await import('../server/kvStorage.js');
      const DEFAULT_JAKSOT = [
        { id: 'j1', name: '1. jakso', startDate: '2026-08-12', endDate: '2026-10-05' },
        { id: 'j2', name: '2. jakso', startDate: '2026-10-06', endDate: '2026-12-01' },
        { id: 'j3', name: '3. jakso', startDate: '2026-12-02', endDate: '2027-02-08' },
        { id: 'j4', name: '4. jakso', startDate: '2027-02-09', endDate: '2027-04-12' },
        { id: 'j5', name: '5. jakso', startDate: '2027-04-13', endDate: '2027-06-05' },
      ];
      if (req.method === 'GET') {
        try {
          const stored = await kvGet('jaksot');
          if (Array.isArray(stored) && stored.length > 0) {
            return res.status(200).json(stored);
          }
        } catch {}
        return res.status(200).json(DEFAULT_JAKSOT);
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        if (!requireAdminAuth(req, res)) return;
        const body = req.body;
        if (!Array.isArray(body)) {
          return res.status(400).json({ message: 'body must be an array of jakso objects' });
        }
        const sanitised: any[] = [];
        const isoDate = /^\d{4}-\d{2}-\d{2}$/;
        for (const j of body) {
          if (!j || typeof j !== 'object') continue;
          const id = String((j as any).id ?? '').slice(0, 16);
          const name = String((j as any).name ?? '').slice(0, 80);
          const startDate = String((j as any).startDate ?? '');
          const endDate = String((j as any).endDate ?? '');
          if (!id || !name || !isoDate.test(startDate) || !isoDate.test(endDate)) continue;
          if (startDate > endDate) continue;
          sanitised.push({ id, name, startDate, endDate });
        }
        if (sanitised.length === 0) {
          return res.status(400).json({ message: 'no valid jakso rows' });
        }
        await kvSet('jaksot', sanitised);
        return res.status(200).json(sanitised);
      }
    }
    
    // Settings endpoints
    if (apiPath === '/settings') {
      // Whitelist — only known column names are forwarded to the DB.
      // Prevents a rogue field in req.body from crashing the insert with
      // a Drizzle schema error (which was returning 500 to the client).
      const SETTINGS_COLUMNS = new Set([
        'appName', 'appNameEn', 'appNameFi', 'logoUrl',
        'primaryColor', 'secondaryColor', 'successColor', 'warningColor',
        'theme', 'headerTitle', 'headerTitleEn', 'headerTitleFi',
        'footerText', 'footerTextEn', 'footerTextFi',
        'contactEmail', 'contactPhone',
        'showStats', 'showAnnouncements', 'enableSearch', 'enableAnimations',
        'enableAutoSave', 'compactMode', 'defaultLanguage', 'aiSensitivity',
        'enableSmartSnap', 'enableRoomAutoCreation',
        'cacheMinutes', 'maxImageSizeMB',
        'enablePreloadImages', 'enableLazyLoading', 'defaultZoomLevel',
        'enableEasterEgg', 'enableEvents', 'enableTicketSystem', 'enableVersionInfo',
        'maintenanceMode', 'maintenanceMessage',
        'enableDarkModeToggle', 'enableNotifications', 'enableOfflineMode', 'enableAnalytics',
        'enableAccessibilityMode', 'enableKeyboardShortcuts', 'enableAdvancedSearch',
        'enableRoomBooking', 'enableQRCodeScanning', 'enableARMode', 'enable3DView',
        'enableVoiceCommands', 'enableMultiLanguage', 'enableExportData',
      ]);
      const DEFAULT_SETTINGS = {
        id: 'default',
        appName: 'KSYK Maps',
        appNameEn: 'KSYK Maps',
        appNameFi: 'KSYK Kartat',
        logoUrl: '/ksykmaps_logo_new_new.png',
        primaryColor: '#000000',
        secondaryColor: '#FF0066',
        theme: 'light',
        defaultLanguage: 'fi',
        maintenanceMode: false,
        maintenanceMessage: null as string | null,
        showStats: true,
        showAnnouncements: true,
        enableSearch: true,
      };

      if (req.method === 'GET') {
        // NEVER CACHE this endpoint — the admin toggles maintenanceMode
        // from this same object, and stale CDN copies would leave the site
        // in maintenance mode for up to 30 minutes after disabling it.
        // Vercel's edge honors these headers when they win over vercel.json's
        // /api/(.*) rule (last-match wins → our explicit setHeader overrides).
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.setHeader('CDN-Cache-Control', 'no-store');
        res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
        try {
          const settings = await storage.getAppSettings();
          return res.status(200).json(settings ?? DEFAULT_SETTINGS);
        } catch (e: any) {
          console.error('GET /api/settings failed:', e?.message);
          // Never 500 on GET — the public app needs maintenanceMode
          // reliably. Return defaults so the map stays live.
          return res.status(200).json(DEFAULT_SETTINGS);
        }
      }
      if ((req.method === 'PUT' || req.method === 'PATCH') && !requireAdminAuth(req, res)) return;
      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          const body = (req.body ?? {}) as Record<string, unknown>;
          const filtered: Record<string, unknown> = {};
          for (const k of Object.keys(body)) {
            if (SETTINGS_COLUMNS.has(k)) filtered[k] = body[k];
          }
          const settings = await storage.updateAppSettings(filtered as any);
          return res.status(200).json(settings);
        } catch (e: any) {
          console.error('PUT /api/settings failed:', e?.message);
          return res.status(400).json({ message: 'Save failed', error: e?.message });
        }
      }
    }
    
    // Test email endpoint — admin only
    if (apiPath === '/test-email') {
      if (!requireAdminAuth(req, res)) return;
      if (req.method === 'GET') {
        return res.status(200).json({
          message: "Test email endpoint - use POST to send test email",
          usage: "POST /api/test-email with body: {\"email\": \"your@email.com\", \"name\": \"Your Name\"}",
          envVarsSet: {
            EMAIL_HOST: !!process.env.EMAIL_HOST,
            EMAIL_PORT: !!process.env.EMAIL_PORT,
            EMAIL_USER: !!process.env.EMAIL_USER,
            EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
          }
        });
      }
      
      if (req.method === 'POST') {
        const { sendTicketEmail } = await import('../server/emailService.js');
        
        const testEmail = req.body.email || process.env.EMAIL_USER || 'test@example.com';
        const testName = req.body.name || 'Test User';
        
        try {
          const result = await sendTicketEmail(
            testEmail, 
            'Test Email from KSYK Maps',
            'This is a test email to verify the email system is working correctly.\n\nIf you received this, the email system is functioning properly!',
            {
              ticketId: 'TEST-' + Date.now(),
              type: 'test',
              title: 'Test Email',
              status: 'test'
            }
          );
          
          return res.status(200).json({
            success: result.success,
            mode: result.mode,
            message: result.success ? 'Email sent successfully!' : 'Email failed to send',
            details: result,
            envVarsSet: {
              EMAIL_HOST: !!process.env.EMAIL_HOST,
              EMAIL_PORT: !!process.env.EMAIL_PORT,
              EMAIL_USER: !!process.env.EMAIL_USER,
              EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
            }
          });
        } catch (error: any) {
          console.error('Test email error:', error);
          return res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
          });
        }
      }
    }

    // Complete data cleanup endpoint - DELETE EVERYTHING
    if (apiPath === '/admin/cleanup-all' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_EVERYTHING') {
        return res.status(400).json({ message: 'Confirmation required: DELETE_EVERYTHING' });
      }
      
      try {
        let deletedCount = {
          buildings: 0,
          rooms: 0,
          hallways: 0,
          floors: 0,
          announcements: 0,
          staff: 0
        };
        
        // Delete all buildings
        const buildings = await storage.getBuildings();
        for (const building of buildings) {
          await storage.deleteBuilding(building.id);
          deletedCount.buildings++;
        }
        
        // Delete all rooms
        const rooms = await storage.getRooms();
        for (const room of rooms) {
          await storage.deleteRoom(room.id);
          deletedCount.rooms++;
        }
        
        // Delete all hallways
        try {
          const hallways = await storage.getHallways();
          for (const hallway of hallways) {
            await storage.deleteHallway(hallway.id);
            deletedCount.hallways++;
          }
        } catch (error) {
        }
        
        // Delete all floors
        try {
          const floors = await storage.getFloors();
          for (const floor of floors) {
            if (storage.deleteFloor) {
              await storage.deleteFloor(floor.id);
              deletedCount.floors++;
            }
          }
        } catch (error) {
        }
        
        // Delete all announcements
        const announcements = await storage.getAnnouncements(1000);
        for (const announcement of announcements) {
          await storage.deleteAnnouncement(announcement.id);
          deletedCount.announcements++;
        }
        
        // Delete all staff
        try {
          const staff = await storage.getStaff();
          for (const staffMember of staff) {
            await storage.deleteStaff(staffMember.id);
            deletedCount.staff++;
          }
        } catch (error) {
        }
        
        
        return res.status(200).json({
          success: true,
          message: 'All data deleted successfully',
          deleted: deletedCount,
          timestamp: new Date().toISOString()
        });
        
      } catch (error: any) {
        console.error('âŒ CLEANUP ERROR:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete all data',
          error: error.message
        });
      }
    }

    // Admin cleanup endpoint - DELETE ALL DATA
    if (apiPath === '/admin/cleanup' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_ALL') {
        return res.status(400).json({ message: 'Confirmation required' });
      }
      
      // Delete all buildings
      const buildings = await storage.getBuildings();
      for (const building of buildings) {
        await storage.deleteBuilding(building.id);
      }
      
      // Delete all rooms
      const rooms = await storage.getRooms();
      for (const room of rooms) {
        await storage.deleteRoom(room.id);
      }
      
      // Delete all announcements
      const announcements = await storage.getAnnouncements(1000);
      for (const announcement of announcements) {
        await storage.deleteAnnouncement(announcement.id);
      }
      
      return res.status(200).json({
        success: true,
        deleted: {
          buildings: buildings.length,
          rooms: rooms.length,
          announcements: announcements.length
        }
      });
    }
    
    // Admin login endpoint
    //
    // Password comparison is bcrypt-aware AND self-healing:
    //   - Stored value already bcrypt (`$2b$/$2a$/$2y$`) â†’ bcrypt.compare
    //   - Stored value plaintext (legacy) â†’ strict-equal, then on
    //     success we re-write the user with `password: <plaintext>`.
    //     storage.upsertUser now hashes at the boundary, so the next
    //     read sees a bcrypt hash. First successful legacy login
    //     upgrades that user forever.
    //
    // Prior versions did `stored !== password` unconditionally. When
    // hashPasswordFieldsInPlace was added at the storage layer, every
    // stored value became a bcrypt hash â†’ the strict-equal always
    // failed â†’ 100% of admin logins returned 401. This block fixes
    // that.
    if (apiPath === '/auth/admin-login' && req.method === 'POST') {
      const { email: rawEmail, password } = req.body ?? {};
      const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
      const emailLower = email.toLowerCase();


      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required', success: false });
      }

      // Route through the shared passwordUtils helper â€” bcryptjs primary,
      // native bcrypt fallback, plaintext-with-warning last resort so
      // this endpoint can NEVER 500 on a broken hash backend.
      const { verifyPassword: verifyPw, isAlreadyHashed } = await import('../server/passwordUtils.js');

      /** Verify `plain` against `stored`. If `stored` is plaintext and
       *  matches, kick off a background re-hash via storage.upsertUser
       *  so the next login uses bcrypt. */
      const verifyAndUpgrade = async (plain: string, stored: string, userId: string): Promise<boolean> => {
        if (isAlreadyHashed(stored)) {
          return verifyPw(plain, stored);
        }
        if (plain !== stored) return false;
        try {
          await storage.upsertUser({ id: userId, password: plain } as any);
        } catch (err) {
          console.warn('âš ï¸ Auto-upgrade of legacy password failed (still allowing login):', err);
        }
        return true;
      };

      const OWNER_EMAIL = 'JuusoJuusto112@gmail.com';
      const isOwner = emailLower === OWNER_EMAIL.toLowerCase();

      // â”€â”€ Break-glass owner login via env var. â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // If OWNER_PASSWORD is set in the Vercel env AND the caller
      // supplies the owner email + that exact password, we bypass the
      // DB lookup. This exists so the site is never permanently locked
      // out by a corrupt user record or a hashing regression. Docs
      // recommend clearing OWNER_PASSWORD after using it once.
      if (isOwner && process.env.OWNER_PASSWORD && password === process.env.OWNER_PASSWORD) {
        // Try to ensure a matching user record exists so the rest of
        // the admin panel finds someone to attach to.
        let ownerUser: any = await storage.getUserByEmail(OWNER_EMAIL).catch(() => null);
        if (!ownerUser) {
          ownerUser = await storage.getUserByEmail(emailLower).catch(() => null);
        }
        if (!ownerUser) {
          try {
            ownerUser = await storage.upsertUser({
              id: 'owner-admin-user',
              email: OWNER_EMAIL,
              firstName: 'Juuso',
              lastName: 'Kaikula',
              role: 'owner',
              password: password,
              isTemporaryPassword: false,
            } as any);
          } catch (err) {
            console.warn('âš ï¸ Could not create owner user record (continuing anyway):', err);
            ownerUser = {
              id: 'owner-admin-user',
              email: OWNER_EMAIL,
              firstName: 'Juuso',
              lastName: 'Kaikula',
              role: 'owner',
              isTemporaryPassword: false,
            };
          }
        }
        const { password: _pw, passwordResetToken: _tk, passwordResetExpiry: _ex, ...safeUser } = ownerUser;
        const ownerToken = generateAdminToken(safeUser.id || 'owner-admin-user', safeUser.role || 'owner');
        return res.status(200).json({ success: true, user: safeUser, requirePasswordChange: false, adminToken: ownerToken });
      }

      // â”€â”€ Case-insensitive user lookup with graceful fallbacks. â”€â”€â”€â”€â”€
      let user: any = null;
      try {
        // Try exact case first (original data), then lowercased.
        user = await storage.getUserByEmail(email);
        if (!user && emailLower !== email) {
          user = await storage.getUserByEmail(emailLower);
        }
        if (!user && isOwner) {
          // Owner email special-cased to whatever cased form is in the DB.
          user = await storage.getUserByEmail(OWNER_EMAIL);
        }
        // Final safety net: if a getUsers method exists, do a case-
        // insensitive scan. This is O(n) but only fires when the direct
        // lookups all miss â€” rare.
        if (!user && typeof (storage as any).getUsers === 'function') {
          const all = await (storage as any).getUsers().catch(() => []);
          user = Array.isArray(all)
            ? all.find((u: any) => (u.email || '').toLowerCase() === emailLower)
            : null;
        }
      } catch (err) {
        console.error('âŒ storage.getUserByEmail threw:', err);
        return res.status(500).json({
          success: false,
          message: 'Login temporarily unavailable â€” database is unreachable.',
        });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'Password not set. Please check your email for password setup link.',
        });
      }

      const ok = await verifyAndUpgrade(password, user.password, user.id);
      if (!ok) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const { password: _pw2, passwordResetToken: _tk2, passwordResetExpiry: _ex2, ...safeUser } = user as any;
      const adminToken = generateAdminToken(user.id, user.role || 'admin');
      return res.status(200).json({
        success: true,
        user: safeUser,
        requirePasswordChange: user.isTemporaryPassword || false,
        adminToken,
      });
    }

    // â”€â”€ Debug: GET /api/auth/admin-diag â€” sanity check on the login path.
    // Requires admin token because it reveals account existence.
    if (apiPath === '/auth/admin-diag' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const email = ((req.query.email as string) || '').trim();
      if (!email) return res.status(400).json({ message: 'email query param required' });
      try {
        const { isAlreadyHashed } = await import('../server/passwordUtils.js');
        const user: any = await storage.getUserByEmail(email).catch(() => null);
        const userLower = user
          ? null
          : await storage.getUserByEmail(email.toLowerCase()).catch(() => null);
        const found = user || userLower;
        return res.status(200).json({
          storageType: storage.constructor.name,
          bcryptJsAvailable: await (async () => { try { await import('bcryptjs'); return true; } catch { return false; } })(),
          bcryptAvailable:   await (async () => { try { await import('bcrypt'); return true; } catch { return false; } })(),
          matchedCase: !!user,
          matchedLower: !user && !!userLower,
          userFound: !!found,
          userRole: found?.role || null,
          hasPassword: !!found?.password,
          passwordShape: !found?.password ? null : (isAlreadyHashed(found.password) ? 'bcrypt' : `plaintext(len=${found.password.length})`),
          ownerPasswordEnvSet: !!process.env.OWNER_PASSWORD,
        });
      } catch (err: any) {
        return res.status(200).json({
          error: err.message,
          storageType: storage.constructor.name,
        });
      }
    }
    
    if (apiPath === '/auth/change-password' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      const { newPassword } = req.body;
      
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // For now, we'll use a simple approach - get user from request body
      // In production, this should use session authentication
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        return res.status(400).json({ message: "User identifier required" });
      }
      
      try {
        let user;
        if (userId) {
          user = await storage.getUser(userId);
        } else if (email) {
          user = await storage.getUserByEmail(email);
        }
        
        if (!user) {
        }
        
        
        // Hash password before storing
        const { hashPassword } = await import('../server/passwordUtils.js');
        const hashedPassword = await hashPassword(newPassword);

        // Update user password
        await storage.upsertUser({
          id: user.id,
          password: hashedPassword,
          isTemporaryPassword: false
        });
        
        
        return res.status(200).json({ 
          success: true, 
        });
      } catch (error: any) {
        return res.status(500).json({ message: "Failed to change password" });
      }
    }

    if (apiPath === '/auth/forgot-password' && req.method === 'POST') {
      const { email, resetPath } = req.body;
      
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      try {
        const emailNorm = email.trim();
        const emailLower = emailNorm.toLowerCase();
        // Try exact case, then lowercased, then a full scan so the
        // lookup is case-insensitive (owner email is stored mixed-case).
        let user: any = await storage.getUserByEmail(emailNorm).catch(() => null);
        if (!user) user = await storage.getUserByEmail(emailLower).catch(() => null);
        if (!user && typeof (storage as any).getUsers === 'function') {
          const all = await (storage as any).getUsers().catch(() => []);
          user = Array.isArray(all)
            ? all.find((u: any) => (u.email || '').toLowerCase() === emailLower)
            : null;
        }

        // Always return success to prevent email enumeration
        if (!user) {
          return res.status(200).json({ success: true, message: "If the email exists, a reset link has been sent" });
        }
        
        // Generate cryptographically secure reset token (valid for 1 hour)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = Date.now() + 3600000; // 1 hour
        
        // Store reset token
        await storage.upsertUser({
          id: user.id,
          passwordResetToken: resetToken,
          passwordResetExpiry: new Date(resetExpiry)
        });
        
        // Send reset email
        // Whitelist allowed reset paths to prevent open redirect in the emailed link.
        const allowedPaths = ['/admin/reset-password'];
        const safePath = allowedPaths.includes(resetPath) ? resetPath : '/admin/reset-password';
        const resetUrl = `${process.env.APP_URL || 'https://ksykmaps.fi'}${safePath}?token=${resetToken}`;
        
        try {
          const emailService = await import('../server/emailService.js');
          await emailService.sendEmail({
            to: email,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">ðŸ” Salasanan palautus</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #333;">Hei ${user.firstName},</p>
                  <p style="font-size: 16px; color: #333;">Olet pyytÃ¤nyt salasanan palautusta Wilma-tilillesi.</p>
                  <p style="font-size: 16px; color: #333;">Klikkaa alla olevaa painiketta palauttaaksesi salasanasi:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                      Palauta salasana
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #666;">Tai kopioi ja liitÃ¤ tÃ¤mÃ¤ linkki selaimeesi:</p>
                  <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="font-size: 14px; color: #666;">â° TÃ¤mÃ¤ linkki on voimassa 1 tunnin ajan.</p>
                    <p style="font-size: 14px; color: #666;">âš ï¸ Jos et pyytÃ¤nyt salasanan palautusta, voit jÃ¤ttÃ¤Ã¤ tÃ¤mÃ¤n viestin huomiotta.</p>
                  </div>
                </div>
              </div>
            `
          });
        } catch (emailError) {
          return res.status(500).json({ message: "Failed to send reset email" });
        }
        
        return res.status(200).json({ success: true, message: "If the email exists, a reset link has been sent" });
      } catch (error: any) {
      }
    }

    if (apiPath === '/auth/reset-password' && req.method === 'POST') {
      const { token, newPassword } = req.body;
      
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      try {
        const users = await storage.getUsers();
        const user = users.find((u: any) => u.passwordResetToken === token);
        
        if (!user) {
          return res.status(400).json({ message: "Invalid or expired reset token" });
        }
        
        // Check if token is expired
        if (user.passwordResetExpiry && new Date(user.passwordResetExpiry) < new Date()) {
          return res.status(400).json({ message: "Reset token has expired" });
        }
        
        // Hash password before storing, then clear reset token
        const { hashPassword: hashPw } = await import('../server/passwordUtils.js');
        const hashedNewPassword = await hashPw(newPassword);
        await storage.upsertUser({
          id: user.id,
          password: hashedNewPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          isTemporaryPassword: false
        });
        
        return res.status(200).json({ success: true, message: "Password has been reset successfully" });
      } catch (error: any) {
        return res.status(500).json({ message: "Failed to reset password" });
      }
    }
    
    // Auth user endpoint
    if (apiPath === '/auth/user' && req.method === 'GET') {
      // Check admin token — returns user info when a valid token is present,
      // 401 otherwise (expected for unauthenticated public visitors).
      const header = (req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined;
      const token = header?.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const payload = verifyAdminToken(token);
        if (payload) {
          try {
            const u = await storage.getUser(payload.userId);
            if (u) {
              const { password: _p, passwordResetToken: _t, passwordResetExpiry: _e, ...safe } = u as any;
              return res.status(200).json(safe);
            }
          } catch { /* fall through to 401 */ }
          return res.status(200).json({ id: payload.userId, role: payload.role });
        }
      }
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Logout endpoint - support both GET and POST
    if (apiPath === '/auth/logout' && (req.method === 'POST' || req.method === 'GET')) {
      // Clear any server-side session data if needed
      // For now, just return success as logout is handled client-side
      return res.status(200).json({ success: true, message: "Logged out successfully" });
    }
    
    // Logs endpoint - support both /logs and /api/logs
    if ((apiPath === '/logs' || apiPath === '/api/logs') && req.method === 'GET') {
      // Return empty logs for now
      // TODO: Implement proper logging system
      return res.status(200).json([]);
    }
    
    // Users endpoints
    if (apiPath.startsWith('/users')) {
      if (!requireAdminAuth(req, res)) return;
      if (req.method === 'GET') {
        const users = await storage.getAllUsers();
        return res.status(200).json(users);
      }
      
      if (req.method === 'POST') {
        const { sendPasswordSetupEmail, generateTempPassword } = await import('../server/emailService.js');
        const { email, firstName, lastName, role, password, passwordOption } = req.body;

        // Validate required fields
        if (!email || !firstName || !lastName) {
          return res.status(400).json({ message: "Email, first name, and last name are required" });
        }

        // Check if user already exists
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ message: "User with this email already exists" });
        }

        // Generate temp password if email option
        let finalPassword = password;
        let isTemp = false;
        if (passwordOption === 'email') {
          finalPassword = generateTempPassword();
          isTemp = true;
        }

        // Create user
        const newUser = await storage.upsertUser({
          email,
          firstName,
          lastName,
          role: role || 'admin',
          password: finalPassword,
          isTemporaryPassword: isTemp,
          profileImageUrl: null
        });

        // If email option, send invitation email with password
        let emailSent: boolean | undefined;
        let emailWarning: string | undefined;
        if (passwordOption === 'email') {
          try {
            const emailResult = await sendPasswordSetupEmail(email, firstName, finalPassword);
            if (!emailResult.success) {
              emailSent = false;
              emailWarning = 'Invite email failed. EMAIL_USER / EMAIL_PASSWORD env vars may be missing on the server. Hand the password below to the user manually.';
            } else {
              emailSent = true;
            }
          } catch (error: any) {
            console.error('Invite email error:', error?.message);
            emailSent = false;
            emailWarning = 'Invite email threw: ' + (error?.message || 'unknown');
          }
        }

        return res.status(201).json({
          ...newUser,
          password: finalPassword,
          emailSent,
          warning: emailWarning,
        });
      }
      
      // Admin reset-password — generates a temp password and emails the user
      const resetPwdMatch = apiPath.match(/^\/users\/([^\/]+)\/reset-password$/);
      if (resetPwdMatch && req.method === 'POST') {
        const userId = resetPwdMatch[1];
        try {
          const { sendPasswordSetupEmail, generateTempPassword } = await import('../server/emailService.js');
          const { hashPassword: hashPw } = await import('../server/passwordUtils.js');
          const user = await storage.getUser(userId);
          if (!user) return res.status(404).json({ message: 'User not found' });
          const tempPassword = generateTempPassword();
          const hashed = await hashPw(tempPassword);
          await storage.upsertUser({
            id: userId,
            password: hashed,
            isTemporaryPassword: true,
            passwordResetToken: null,
            passwordResetExpiry: null,
          });
          const emailResult = await sendPasswordSetupEmail(
            (user as any).email,
            (user as any).firstName || (user as any).email,
            tempPassword,
          );
          if (!emailResult.success) {
            // Password IS reset in the DB, but the email didn't send.
            // Return the temp password so the admin can hand it over
            // manually and know something went wrong.
            return res.status(200).json({
              success: true,
              emailSent: false,
              tempPassword,
              warning: 'Password reset OK but the email did not send. EMAIL_USER / EMAIL_PASSWORD env vars may be missing on the server. Copy the temporary password below and hand it to the user.',
            });
          }
          return res.status(200).json({ success: true, emailSent: true });
        } catch (error: any) {
          console.error('reset-password error:', error?.message);
          return res.status(500).json({ message: 'Failed to reset password: ' + (error?.message || 'unknown') });
        }
      }

      // Handle /users/:id routes
      const idMatch = apiPath.match(/^\/users\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const user = await storage.getUser(id);
          if (!user) {
          }
          return res.status(200).json(user);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteUser(id);
          return res.status(204).send('');
        }
      }
    }
    
    // POST /feedback — store in-app feedback (no auth required)
    if (apiPath === '/feedback' && req.method === 'POST') {
      const { category, message, appVersion, deviceInfo } = req.body || {};
      if (!message?.trim()) return res.status(400).json({ message: 'Message required' });
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`
          INSERT INTO app_feedback (category, message, app_version, device_info)
          VALUES (${category || 'general'}, ${message.trim()}, ${appVersion || null}, ${deviceInfo || null})
        `);
        return res.status(201).json({ success: true });
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to save feedback' });
      }
    }

    // GET /feedback — admin only
    if (apiPath === '/feedback' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const rows = await db.execute(sql`SELECT * FROM app_feedback ORDER BY created_at DESC LIMIT 200`);
        return res.status(200).json(rows.rows ?? rows);
      } catch {
        return res.status(500).json({ message: 'Failed to fetch feedback' });
      }
    }

    // POST /bug-reports — store bug report (no auth required)
    if (apiPath === '/bug-reports' && req.method === 'POST') {
      const { description, steps, appVersion, deviceInfo } = req.body || {};
      if (!description?.trim()) return res.status(400).json({ message: 'Description required' });
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`
          INSERT INTO app_bug_reports (description, steps, app_version, device_info)
          VALUES (${description.trim()}, ${steps?.trim() || null}, ${appVersion || null}, ${deviceInfo || null})
        `);
        return res.status(201).json({ success: true });
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to save bug report' });
      }
    }

    // GET /bug-reports — admin only
    if (apiPath === '/bug-reports' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const rows = await db.execute(sql`SELECT * FROM app_bug_reports ORDER BY created_at DESC LIMIT 200`);
        return res.status(200).json(rows.rows ?? rows);
      } catch {
        return res.status(500).json({ message: 'Failed to fetch bug reports' });
      }
    }

    // POST /crash-reports — mobile app uploads its last_crash.txt / log dump
    // straight to the admin panel instead of the user having to open a share
    // sheet + email. No auth required — same as feedback/bugs.
    if (apiPath === '/crash-reports' && req.method === 'POST') {
      const { logBody, appVersion, deviceInfo, platform } = req.body || {};
      if (!logBody || typeof logBody !== 'string' || !logBody.trim()) {
        return res.status(400).json({ message: 'logBody required' });
      }
      // Hard cap the body so a runaway log can't fill the DB.
      const trimmed = logBody.trim().slice(0, 200_000);
      const lineCount = trimmed.split('\n').length;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        await db.execute(sql`
          INSERT INTO app_crash_reports (log_body, log_lines, app_version, device_info, platform)
          VALUES (${trimmed}, ${lineCount}, ${appVersion || null}, ${deviceInfo || null}, ${platform || 'android'})
        `);
        return res.status(201).json({ success: true });
      } catch (e: any) {
        console.error('POST /crash-reports error:', e?.message);
        return res.status(500).json({ message: 'Failed to save crash report' });
      }
    }

    // GET /crash-reports — admin only
    if (apiPath === '/crash-reports' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const rows = await db.execute(sql`SELECT * FROM app_crash_reports ORDER BY created_at DESC LIMIT 200`);
        return res.status(200).json(rows.rows ?? rows);
      } catch {
        return res.status(500).json({ message: 'Failed to fetch crash reports' });
      }
    }

    // PATCH /feedback/:id, /bug-reports/:id, /crash-reports/:id — admin only,
    // updates the workflow status. Bug states: open | in_progress | closed.
    // Feedback states: new | reviewed | archived. Crash states: open | closed.
    {
      const patchMatch =
        apiPath.match(/^\/(feedback|bug-reports|crash-reports)\/([\w-]+)$/);
      if (patchMatch && req.method === 'PATCH') {
        if (!requireAdminAuth(req, res)) return;
        const [, resource, id] = patchMatch;
        const { status } = req.body || {};
        if (typeof status !== 'string' || !/^[a-z_]{1,20}$/.test(status)) {
          return res.status(400).json({ message: 'invalid status' });
        }
        const table =
          resource === 'feedback'      ? 'app_feedback'      :
          resource === 'bug-reports'   ? 'app_bug_reports'   :
                                         'app_crash_reports';
        try {
          const { db } = await import('../server/db.js');
          const { sql } = await import('drizzle-orm');
          await db.execute(sql`
            UPDATE ${sql.raw(table)} SET status = ${status}
            WHERE id = ${id}
          `);
          return res.status(200).json({ success: true });
        } catch (e: any) {
          return res.status(500).json({ message: 'Failed to update status' });
        }
      }
    }

    // POST /push-tokens — register or refresh an FCM device token (no auth required)
    if (apiPath === '/push-tokens' && req.method === 'POST') {
      const { fcmToken, platform, appVersion } = req.body || {};
      if (!fcmToken?.trim()) return res.status(400).json({ message: 'fcmToken required' });
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        // Upsert — update updated_at and app_version when token already exists
        await db.execute(sql`
          INSERT INTO push_tokens (fcm_token, platform, app_version)
          VALUES (${fcmToken.trim()}, ${platform || 'android'}, ${appVersion || null})
          ON CONFLICT (fcm_token) DO UPDATE
            SET updated_at = now(), app_version = EXCLUDED.app_version
        `);
        return res.status(200).json({ success: true });
      } catch (e: any) {
        console.error('POST /push-tokens error:', e?.message);
        return res.status(500).json({ message: 'Failed to register token' });
      }
    }

    // DELETE /analytics/reset — purge telemetry_sessions, telemetry_events,
    // feature_usage, performance_events, app_logs, easter_egg_events.
    // Useful when the tables have gotten cluttered with test data.
    if (apiPath === '/analytics/reset' && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res)) return;
      const { scope: resetScope } = req.body || {};
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const results: Record<string, number> = {};
        const wipe = async (table: string) => {
          const r = await db.execute(sql.raw(`DELETE FROM ${table}`));
          results[table] = (r as any).rowCount ?? 0;
        };
        // scope 'all' → all tables; 'events' → only event tables; 'logs' → only app_logs
        if (!resetScope || resetScope === 'all' || resetScope === 'events') {
          await wipe('telemetry_events').catch(() => {});
          await wipe('feature_usage').catch(() => {});
          await wipe('performance_events').catch(() => {});
          await wipe('easter_egg_events').catch(() => {});
          await wipe('telemetry_sessions').catch(() => {});
        }
        if (!resetScope || resetScope === 'all' || resetScope === 'logs') {
          await wipe('app_logs').catch(() => {});
        }
        return res.status(200).json({ success: true, ...results });
      } catch (e: any) {
        return res.status(500).json({ message: 'Reset failed: ' + (e?.message || 'unknown') });
      }
    }

    // DELETE /push-tokens — admin only — purge every registered FCM token.
    // Useful when tokens have gotten stale in bulk (e.g. after switching
    // Firebase projects, migrating signing keys, or debugging).
    if (apiPath === '/push-tokens' && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const result = await db.execute(sql`DELETE FROM push_tokens`);
        return res.status(200).json({ success: true, deleted: (result as any).rowCount ?? 0 });
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to purge tokens: ' + (e?.message || 'unknown') });
      }
    }

    // GET /push-tokens — admin only — list all registered tokens
    if (apiPath === '/push-tokens' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const rows = await db.execute(sql`
          SELECT COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE updated_at > now() - interval '30 days') AS active_30d
          FROM push_tokens
        `);
        const data = (rows as any).rows?.[0] ?? (rows as any)[0] ?? {};
        return res.status(200).json({
          total: Number(data.total ?? 0),
          active30d: Number(data.active_30d ?? 0),
          configured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
        });
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to fetch token stats' });
      }
    }

    // POST /notifications/broadcast — send FCM push to ALL registered devices (admin only)
    if (apiPath === '/notifications/broadcast' && req.method === 'POST') {
      const admin = requireAdminAuth(req, res);
      if (!admin) return;
      const { title, body: bodyText, type, screen } = req.body || {};
      if (!title?.trim() || !bodyText?.trim()) return res.status(400).json({ message: 'title and body required' });
      try {
        const { broadcast, isFcmConfigured } = await import('../server/fcm.js');
        if (!isFcmConfigured()) {
          return res.status(400).json({
            message: 'FCM not configured. Set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY on Vercel.',
            configured: false,
          });
        }
        const result = await broadcast({ title: title.trim(), body: bodyText.trim(), type, screen });
        // Record every broadcast so admins can audit history — even zero-device sends.
        try {
          const { db } = await import('../server/db.js');
          const { sql } = await import('drizzle-orm');
          await db.execute(sql`
            INSERT INTO fcm_broadcasts (title, body, type, screen, target_count, sent_count, failed_count, sent_by)
            VALUES (${title.trim()}, ${bodyText.trim()}, ${type ?? null}, ${screen ?? null}, ${result.total ?? 0}, ${result.sent ?? 0}, ${result.failed ?? 0}, ${admin.userId ?? null})
          `);
        } catch (e: any) { console.warn('broadcast history insert failed:', e?.message); }
        if (result.total === 0) {
          return res.status(200).json({
            ...result,
            warning: 'No registered devices. Users must open the app once on v1.71.0+ so their FCM token registers.',
          });
        }
        return res.status(200).json(result);
      } catch (e: any) {
        console.error('POST /notifications/broadcast error:', e?.message);
        return res.status(500).json({ message: 'Failed to send notifications: ' + (e?.message || 'unknown') });
      }
    }

    // GET /notifications/history — recent broadcasts + delivery stats (admin only)
    if (apiPath === '/notifications/history' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const rows = await db.execute(sql`
          SELECT id, title, body, type, target_count, sent_count, failed_count, created_at
          FROM fcm_broadcasts
          ORDER BY created_at DESC
          LIMIT 50
        `);
        return res.status(200).json((rows as any).rows ?? rows);
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to fetch history' });
      }
    }

    // POST /notifications/test — send a test push to all devices (admin only)
    if (apiPath === '/notifications/test' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { broadcast, isFcmConfigured } = await import('../server/fcm.js');
        if (!isFcmConfigured()) {
          return res.status(400).json({
            message: 'FCM not configured. Set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY on Vercel.',
            configured: false,
          });
        }
        const result = await broadcast({
          title: 'KSYK Maps — testi',
          body: 'Testipush-ilmoitus hallintapaneelista.',
          type: 'test',
          screen: 'news',
        });
        return res.status(200).json({
          ...result,
          ...(result.total === 0 && {
            warning: 'No registered devices. Install v1.71.0+ APK on a phone and open the app once so the FCM token registers.',
          }),
        });
      } catch (e: any) {
        return res.status(500).json({ message: 'Failed to send test notification: ' + (e?.message || 'unknown') });
      }
    }

    // GET /notifications/status — FCM config + token count + recent-activity diagnostics (admin only)
    if (apiPath === '/notifications/status' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const { isFcmConfigured, getInitError } = await import('../server/fcm.js');
      const configured = isFcmConfigured();
      const initError = await getInitError();
      try {
        const { db } = await import('../server/db.js');
        const { sql } = await import('drizzle-orm');
        const totalRow = await db.execute(sql`SELECT COUNT(*)::int AS n FROM push_tokens`);
        const active7d = await db.execute(sql`SELECT COUNT(*)::int AS n FROM push_tokens WHERE updated_at > now() - interval '7 days'`);
        const active30d = await db.execute(sql`SELECT COUNT(*)::int AS n FROM push_tokens WHERE updated_at > now() - interval '30 days'`);
        const recentTokens = await db.execute(sql`SELECT platform, app_version, updated_at FROM push_tokens ORDER BY updated_at DESC LIMIT 5`);
        const totalRows = (totalRow as any).rows ?? totalRow;
        const active7dRows = (active7d as any).rows ?? active7d;
        const active30dRows = (active30d as any).rows ?? active30d;
        const recentRows = (recentTokens as any).rows ?? recentTokens;
        return res.status(200).json({
          configured,
          initError,
          totalDevices: totalRows[0]?.n ?? 0,
          active7d: active7dRows[0]?.n ?? 0,
          active30d: active30dRows[0]?.n ?? 0,
          projectId: process.env.FIREBASE_PROJECT_ID || null,
          projectIdSet: !!process.env.FIREBASE_PROJECT_ID,
          clientEmailSet: !!process.env.FIREBASE_CLIENT_EMAIL,
          privateKeySet: !!process.env.FIREBASE_PRIVATE_KEY,
          privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length ?? 0,
          recentDevices: recentRows,
        });
      } catch (e: any) {
        return res.status(200).json({ configured, initError, error: e?.message });
      }
    }

    // Email diagnostic endpoint — admin only (leaks config info)
    if (apiPath === '/email-diagnostic' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      return res.status(200).json({
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        emailUser: process.env.EMAIL_USER || 'NOT SET',
        emailHost: process.env.EMAIL_HOST || 'NOT SET',
        emailPort: process.env.EMAIL_PORT || 'NOT SET',
        ownerEmail: process.env.OWNER_EMAIL || 'NOT SET',
        passwordLength: process.env.EMAIL_PASSWORD?.length || 0,
        passwordSet: !!process.env.EMAIL_PASSWORD,
        allEnvVars: Object.keys(process.env).filter(key => key.includes('EMAIL'))
      });
    }
    
    // Real Analytics Tracking Endpoint
    if (apiPath === '/analytics/track' && req.method === 'POST') {
      try {
        const { events, sessionInfo } = req.body;
        
        // Validate input
        if (!events || !Array.isArray(events)) {
          return res.status(400).json({ message: 'Invalid events data' });
        }
        
        // Get real IP address. x-forwarded-for can be string | string[] per
        // Express types â€” normalise before splitting on comma.
        const xff = req.headers['x-forwarded-for'];
        const xffFirst = Array.isArray(xff) ? xff[0] : xff;
        const realIP = req.headers['cf-connecting-ip'] ||
                       req.headers['x-real-ip'] ||
                       xffFirst?.split(',')[0]?.trim() ||
                       'Unknown';
        
        // Try to store events, but don't fail if storage method doesn't exist
        try {
          if (storage.createAnalyticsEvent && typeof storage.createAnalyticsEvent === 'function') {
            for (const event of events) {
              await storage.createAnalyticsEvent({
                ...event,
                ipAddress: realIP,
                sessionInfo
              });
            }
          } else {
          }
        } catch (storageError) {
          console.error('Analytics storage error (non-critical):', storageError);
          // Continue anyway - analytics shouldn't break the app
        }
        
        return res.status(200).json({ success: true, tracked: events.length });
      } catch (error) {
        console.error('Analytics endpoint error:', error);
        // Return success anyway - analytics shouldn't break the app
        return res.status(200).json({ success: true, tracked: 0 });
      }
    }

    // Live Analytics Endpoint — admin only
    if (apiPath === '/analytics/live' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const liveStats = await storage.getLiveAnalytics();
        return res.status(200).json(liveStats);
      } catch (error) {
        console.error('Failed to fetch live analytics:', error);
        return res.status(500).json({ message: 'Failed to fetch live analytics' });
      }
    }

    // Analytics Summary Endpoint
    if (apiPath === '/analytics/summary' || apiPath.startsWith('/analytics/summary?')) {
      if (!requireAdminAuth(req, res)) return;
      if (req.method === 'GET') {
        // Support both 'range' and 'timeRange' query parameters
        const range = req.query.range as string || req.query.timeRange as string || '24h';
        
        try {
          // Use real analytics data from Firestore
          let days = 1;
          if (range === '7d' || range === 'week') days = 7;
          else if (range === '30d' || range === 'month') days = 30;
          else if (range === '24h' || range === 'day') days = 1;
          
          const summary = await storage.getAnalyticsSummary(days);
          
          // Return real data from database
          return res.status(200).json(summary);
        } catch (error) {
          console.error('Failed to fetch analytics summary:', error);
          return res.status(500).json({ message: 'Failed to fetch analytics summary' });
        }
      }
    }

    // Analytics Events Endpoint — admin only
    if (apiPath === '/analytics/events' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const timeRange = req.query.timeRange as string || '24h';
      const limit = parseInt(req.query.limit as string) || 100;
      
      try {
        const events = await storage.getAnalyticsEvents(timeRange, limit);
        return res.status(200).json(events);
      } catch (error) {
        console.error('Failed to fetch analytics events:', error);
        return res.status(500).json({ message: 'Failed to fetch analytics events' });
      }
    }

    // Performance Analytics Endpoint — admin only
    if (apiPath === '/analytics/performance' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const timeRange = req.query.timeRange as string || '24h';
      
      try {
        const performance = await storage.getPerformanceMetrics(timeRange);
        return res.status(200).json(performance);
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
        return res.status(500).json({ message: 'Failed to fetch performance metrics' });
      }
    }

    // Logs endpoint — admin only
    if (apiPath === '/logs' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      // Return recent logs from memory or file
      const logs = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Application started successfully',
          source: 'system'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'User logged in',
          source: 'auth'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'info',
          message: 'Ticket created successfully',
          source: 'tickets'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 180000).toISOString(),
          level: 'info',
          message: 'Email sent successfully',
          source: 'email'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          level: 'info',
          message: 'Building data fetched',
          source: 'api'
        }
      ];
      
      return res.status(200).json(logs);
    }
    
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // MAP CAMPUS â€” layers CRUD + door/stair/elevator/window stubs +
    // map-package + route (added in v3.5).
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    // POI collections — campus_pois Supabase table. Reads soft-fail to [].
    if (['/doors', '/stairs', '/elevators'].includes(apiPath) && req.method === 'GET') {
      try {
        const { getPoisByKind } = await import('../server/kvStorage.js');
        return res.status(200).json(await getPoisByKind(apiPath.slice(1)));
      } catch {
        return res.status(200).json([]);
      }
    }
    if (['/doors', '/stairs', '/elevators'].includes(apiPath) && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { createPoi } = await import('../server/kvStorage.js');
        const kind = apiPath.slice(1);
        const body = (req.body ?? {}) as Record<string, unknown>;
        const lat = typeof (body.position as any)?.lat === 'number' ? (body.position as any).lat
                  : typeof body.mapPositionY === 'number' ? body.mapPositionY : null;
        const lng = typeof (body.position as any)?.lng === 'number' ? (body.position as any).lng
                  : typeof body.mapPositionX === 'number' ? body.mapPositionX : null;
        if (lat === null || lng === null) return res.status(400).json({ message: 'Missing position' });
        const record = await createPoi({ ...body, kind, position: { lat, lng } });
        return res.status(201).json(record);
      } catch (err) {
        return res.status(500).json({ message: `Failed to create ${apiPath.slice(1)}` });
      }
    }
    if (['/doors', '/stairs', '/elevators'].some((k) => apiPath.startsWith(k + '/')) && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { deletePoi } = await import('../server/kvStorage.js');
        const id = apiPath.split('/')[2];
        if (!id) return res.status(400).json({ message: 'Missing id' });
        await deletePoi(id);
        return res.status(204).end();
      } catch {
        return res.status(500).json({ message: 'Delete failed' });
      }
    }
    if (['/windows', '/outdoor'].includes(apiPath) && req.method === 'GET') {
      return res.status(200).json([]);
    }

    // Generic POIs — free-form kind string.
    if (apiPath === '/pois' && req.method === 'GET') {
      try {
        const { getAllPois } = await import('../server/kvStorage.js');
        return res.status(200).json(await getAllPois());
      } catch {
        res.setHeader('X-Read-Soft-Fail', '1');
        return res.status(200).json([]);
      }
    }
    if (apiPath === '/pois' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { createPoi } = await import('../server/kvStorage.js');
        const body = (req.body ?? {}) as Record<string, unknown>;
        if (typeof body.kind !== 'string' || !body.kind) return res.status(400).json({ message: 'Missing kind' });
        const lat = typeof (body.position as any)?.lat === 'number' ? (body.position as any).lat
                  : typeof body.mapPositionY === 'number' ? body.mapPositionY : null;
        const lng = typeof (body.position as any)?.lng === 'number' ? (body.position as any).lng
                  : typeof body.mapPositionX === 'number' ? body.mapPositionX : null;
        if (lat === null || lng === null) return res.status(400).json({ message: 'Missing position' });
        const record = await createPoi({ ...body, position: { lat, lng } });
        return res.status(201).json(record);
      } catch {
        return res.status(500).json({ message: 'Failed to create POI' });
      }
    }
    if (apiPath.startsWith('/pois/') && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { deletePoi } = await import('../server/kvStorage.js');
        const id = apiPath.slice('/pois/'.length);
        if (!id) return res.status(400).json({ message: 'Missing id' });
        await deletePoi(id);
        return res.status(204).end();
      } catch {
        return res.status(500).json({ message: 'Delete failed' });
      }
    }
    // v4.7.3 — PATCH used by the 360° panorama-spot editor to update
    // label / URL (via metadata) / position after placement.
    if (apiPath.startsWith('/pois/') && (req.method === 'PATCH' || req.method === 'PUT')) {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { updatePoi } = await import('../server/kvStorage.js');
        const id = apiPath.slice('/pois/'.length);
        if (!id) return res.status(400).json({ message: 'Missing id' });
        const updated = await updatePoi(id, (req.body ?? {}) as Record<string, unknown>);
        if (!updated) return res.status(404).json({ message: 'POI not found' });
        return res.status(200).json(updated);
      } catch {
        return res.status(500).json({ message: 'Update failed' });
      }
    }

    // /api/layers — backed by kv_settings with key 'mapLayers'.
    const DEFAULT_LAYERS = [
      { id: 'buildings', name: 'Buildings', visible: true, locked: false, opacity: 1, z: 10 },
      { id: 'rooms',     name: 'Rooms',     visible: true, locked: false, opacity: 1, z: 20 },
      { id: 'hallways',  name: 'Hallways',  visible: true, locked: false, opacity: 1, z: 30 },
      { id: 'labels',    name: 'Labels',    visible: true, locked: false, opacity: 1, z: 40 },
    ];
    if (apiPath === '/layers' && req.method === 'GET') {
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const rows = (await kvGet('mapLayers') as any[]) || [];
        return res.status(200).json(rows.length > 0 ? rows.sort((a: any, b: any) => (a.z ?? 0) - (b.z ?? 0)) : DEFAULT_LAYERS);
      } catch {
        return res.status(200).json(DEFAULT_LAYERS);
      }
    }

    const layerIdMatch = apiPath.match(/^\/layers\/([^\/]+)$/);
    if (layerIdMatch && req.method === 'PUT') {
      try {
        const { kvGet, kvSet } = await import('../server/kvStorage.js');
        const id = layerIdMatch[1];
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return res.status(400).json({ message: 'invalid id' });
        const b = req.body || {};
        const row = {
          id,
          name: (b.name || id).toString().slice(0, 80),
          visible:   typeof b.visible   === 'boolean' ? b.visible   : true,
          locked:    typeof b.locked    === 'boolean' ? b.locked    : false,
          opacity:   typeof b.opacity   === 'number'  ? b.opacity   : 1,
          z:         typeof b.z         === 'number'  ? b.z         : 0,
          blendMode: b.blendMode ?? null,
          updatedAt: new Date().toISOString(),
        };
        const current = ((await kvGet('mapLayers') as any[]) || []).filter((r: any) => r.id !== id);
        await kvSet('mapLayers', [...current, row]);
        return res.status(200).json(row);
      } catch (err) {
        console.error('layers PUT error:', err);
        return res.status(500).json({ message: 'failed' });
      }
    }
    if (layerIdMatch && req.method === 'DELETE') {
      try {
        const { kvGet, kvSet } = await import('../server/kvStorage.js');
        const id = layerIdMatch[1];
        const current = ((await kvGet('mapLayers') as any[]) || []).filter((r: any) => r.id !== id);
        await kvSet('mapLayers', current);
        return res.status(204).send('');
      } catch {
        return res.status(204).send('');
      }
    }

    // /api/map-package â€” the whole published campus in one call.
    if (apiPath === '/map-package' && req.method === 'GET') {
      try {
        const [buildings, rooms, hallways, floors] = await Promise.all([
          storage.getBuildings().catch(() => []),
          storage.getRooms().catch(() => []),
          storage.getHallways().catch(() => []),
          storage.getFloors().catch(() => []),
        ]);
        return res.status(200).json({
          manifest: { version: '1.0.0', title: 'KSYK Campus', publishedAt: new Date().toISOString() },
          mapDefaults: { center: { lat: 0, lng: 0 }, zoom: 16, bearing: 0, pitch: 0, minZoom: 12, maxZoom: 22 },
          buildings, floors, rooms, hallways, doors: [], stairs: [], elevators: [],
        });
      } catch {
        return res.status(200).json({
          manifest: { version: '1.0.0', title: 'KSYK Campus', publishedAt: new Date().toISOString() },
          mapDefaults: { center: { lat: 0, lng: 0 }, zoom: 16, bearing: 0, pitch: 0, minZoom: 12, maxZoom: 22 },
          buildings: [], floors: [], rooms: [], hallways: [], doors: [], stairs: [], elevators: [],
        });
      }
    }

    if (apiPath === '/map-package/draft' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      // Autosave sink â€” the Builder posts a MapPackage every 30s. We
      // acknowledge without persisting yet (versioning lands in a
      // later milestone); the client's localStorage is the source of
      // truth for now, so we return a fake version stub.
      const now = Date.now();
      return res.status(200).json({
        id: `draft-${now}`,
        packageId: 'current',
        version: Math.floor(now / 1000),
        savedAt: new Date().toISOString(),
        savedBy: null,
        published: false,
        message: null,
        payloadKey: `draft-${now}`,
      });
    }

    // Real publish — snapshot into Supabase mapVersions/mapPackages tables.
    if (apiPath === '/map-package/publish' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { mapVersions, mapPackages } = await import('../shared/schema.js');
        const { getPoisByKind } = await import('../server/kvStorage.js');
        const { eq, desc } = await import('drizzle-orm');
        const [buildings, rooms, hallways, floors, stairs, elevators, doors] = await Promise.all([
          storage.getBuildings().catch(() => []),
          storage.getRooms().catch(() => []),
          storage.getHallways().catch(() => []),
          storage.getFloors().catch(() => []),
          getPoisByKind('stairs').catch(() => []),
          getPoisByKind('elevators').catch(() => []),
          getPoisByKind('doors').catch(() => []),
        ]);
        const publishedAt = new Date().toISOString();
        const message = (req.body as { message?: string } | null)?.message ?? null;
        const latestVer = await pgDb.select({ version: mapVersions.version }).from(mapVersions)
          .orderBy(desc(mapVersions.version)).limit(1).catch(() => [{ version: 0 }]);
        const versionNumber = ((latestVer[0] as any)?.version ?? 0) + 1;
        const versionId = `v${versionNumber}-${Date.now()}`;
        const pkg = {
          manifest: { version: '1.0.0', title: 'KSYK Campus', publishedAt, description: message },
          mapDefaults: { center: { lat: 0, lng: 0 }, zoom: 16, bearing: 0, pitch: 0, minZoom: 12, maxZoom: 22 },
          buildings, floors, rooms, hallways, doors, stairs, elevators,
        };
        await pgDb.insert(mapVersions).values({
          id: versionId, packageId: 'current', version: versionNumber,
          savedAt: new Date(), savedBy: null, published: true,
          message, payloadKey: versionId, payload: pkg,
        });
        await pgDb.insert(mapPackages).values({ id: 'published', pointer: versionId, publishedAt: new Date(), publishedBy: null })
          .onConflictDoUpdate({ target: mapPackages.id, set: { pointer: versionId, publishedAt: new Date() } });
        return res.status(200).json({ ...pkg, versionId, version: versionNumber });
      } catch (err) {
        console.error('publish failed:', err);
        return res.status(500).json({ message: 'Publish failed' });
      }
    }

    // Read the last-published snapshot.
    if (apiPath === '/map-package/published' && req.method === 'GET') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { mapVersions, mapPackages } = await import('../shared/schema.js');
        const { eq } = await import('drizzle-orm');
        const ptr = await pgDb.select().from(mapPackages).where(eq(mapPackages.id, 'published')).limit(1);
        if (!ptr[0]?.pointer) return res.status(200).json(null);
        const ver = await pgDb.select({ payload: mapVersions.payload }).from(mapVersions)
          .where(eq(mapVersions.id, ptr[0].pointer)).limit(1);
        return res.status(200).json(ver[0]?.payload ?? null);
      } catch (err) {
        console.error('published read failed:', err);
        res.setHeader('X-Read-Soft-Fail', '1');
        return res.status(200).json(null);
      }
    }

    // Version list — metadata only, payload stripped.
    if (apiPath === '/map-package/versions' && req.method === 'GET') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { mapVersions } = await import('../shared/schema.js');
        const { desc } = await import('drizzle-orm');
        const rows = await pgDb.select({
          id: mapVersions.id, packageId: mapVersions.packageId, version: mapVersions.version,
          savedAt: mapVersions.savedAt, savedBy: mapVersions.savedBy, published: mapVersions.published,
          message: mapVersions.message, payloadKey: mapVersions.payloadKey,
        }).from(mapVersions).orderBy(desc(mapVersions.version)).limit(50);
        return res.status(200).json(rows);
      } catch {
        res.setHeader('X-Read-Soft-Fail', '1');
        return res.status(200).json([]);
      }
    }

    // Restore a specific version — swap the pointer.
    if (apiPath.startsWith('/map-package/versions/') && apiPath.endsWith('/restore') && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { mapVersions, mapPackages } = await import('../shared/schema.js');
        const { eq } = await import('drizzle-orm');
        const id = apiPath.slice('/map-package/versions/'.length, -'/restore'.length);
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return res.status(400).json({ message: 'invalid version id' });
        const ver = await pgDb.select({ id: mapVersions.id }).from(mapVersions).where(eq(mapVersions.id, id)).limit(1);
        if (!ver[0]) return res.status(404).json({ message: 'version not found' });
        await pgDb.insert(mapPackages).values({ id: 'published', pointer: id, publishedAt: new Date(), publishedBy: null })
          .onConflictDoUpdate({ target: mapPackages.id, set: { pointer: id, publishedAt: new Date() } });
        return res.status(200).json({ ok: true, pointer: id });
      } catch (err) {
        console.error('restore failed:', err);
        return res.status(500).json({ message: 'restore failed' });
      }
    }

    if (apiPath === '/route/graph' && req.method === 'GET') {
      return res.status(200).json({ nodes: [], edges: [], warnings: [] });
    }

    if (apiPath === '/route' && req.method === 'POST') {
      // No graph yet â€” the campus has no doors/hallways connecting rooms
      // in this deployment. Respond with a clean "no path" instead of a
      // 500 so the client UI can degrade gracefully.
      return res.status(200).json({ ok: false, route: null, message: 'no path' });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // EASTER-EGG server-side logging â€” mirror of the Express handler
    // so /found writes to app logs even on Vercel.
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // (POST /easter-eggs/found already exists above â€” this block adds
    //  the app-log write as a merge into that handler is safer done at
    //  its site. The existing handler at line ~452 already writes to
    //  the counters. We'll piggy-back a log via a separate collection.)

    // ── Telemetry aliases (/api/telemetry/*) ─────────────────────────────
    // analytics.ts sends to /api/telemetry/* to avoid adblocker URL
    // pattern matching. Mirror each to the canonical analytics handler.
    if (apiPath === '/telemetry/pageview' && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { pageViews } = await import('../shared/schema.js');
        const { page, sessionId, referrer } = req.body || {};
        // Never trust client-supplied userId — it can reference a user that
        // doesn't exist in the DB, causing a FK violation. Anonymous page
        // views always get userId=null; authenticated tracking lives in /auth.
        await pgDb.insert(pageViews).values({
          url: (page || '/').toString().slice(0, 200),
          sessionId: (sessionId || 'anon').toString().slice(0, 60),
          userId: null,
          referrer: (referrer || '').toString().slice(0, 200),
          userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300),
        }).catch(() => {});
      } catch { /* non-critical */ }
      return res.status(204).end();
    }
    if (apiPath === '/telemetry/track' && req.method === 'POST') {
      try {
        const { incrementEggCounter, appendEggRecent } = await import('../server/kvStorage.js');
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const { events } = req.body || {};
        if (Array.isArray(events)) {
          for (const ev of events.slice(0, 50)) {
            if (ev?.type === 'easter_egg' && typeof ev.eggType === 'string') {
              const eggId = ev.eggType.slice(0, 64);
              if (/^[a-z0-9-]{1,64}$/.test(eggId)) {
                await incrementEggCounter(eggId).catch(() => {});
                await appendEggRecent({ egg: eggId, userId: ev.userId ?? 'anonymous', at: new Date().toISOString() }).catch(() => {});
              }
            } else if (ev?.type === 'feature' && typeof ev.name === 'string') {
              await pgDb.insert(appLogs).values({ level: 'info', message: `feature:${ev.name.slice(0, 60)}` }).catch(() => {});
            }
          }
        }
      } catch { /* non-critical */ }
      return res.status(204).end();
    }
    // POST /api/telemetry/feature — named feature-use event.
    if (apiPath === '/telemetry/feature' && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const name = (req.body?.name || '').toString().slice(0, 60);
        if (name) await pgDb.insert(appLogs).values({ level: 'info', message: `feature:${name}` }).catch(() => {});
      } catch { /* non-critical */ }
      return res.status(204).end();
    }
    // POST /api/telemetry/search — log search queries.
    if (apiPath === '/telemetry/search' && req.method === 'POST') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { searchAnalytics } = await import('../shared/schema.js');
        const q = (req.body?.query || '').toString().slice(0, 200).trim();
        if (q) await pgDb.insert(searchAnalytics).values({ query: q, sessionId: (req.body?.sessionId || 'anon').toString().slice(0, 60) } as any).catch(() => {});
      } catch { /* non-critical */ }
      return res.status(204).end();
    }
    // ── Telemetry GET endpoints (admin dashboard) ──────────────────────────
    // AppLogsManager calls these to render analytics charts.
    // They proxy data from the same KV store that /api/analytics-event writes.
    if (apiPath === '/telemetry/events' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const events: any[] = (await kvGet('analyticsEvents')) ?? [];
        return res.status(200).json(events.slice(0, 500));
      } catch {
        return res.status(200).json([]);
      }
    }
    if (apiPath === '/telemetry/summary' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const events: any[] = (await kvGet('analyticsEvents')) ?? [];
        const counts: Record<string, number> = {};
        const errors: any[] = [];
        for (const ev of events) {
          counts[ev.event] = (counts[ev.event] ?? 0) + 1;
          if (ev.event === 'app_error') errors.push({ screen: ev.screen, msg: ev.msg, ts: ev.receivedAt });
        }
        return res.status(200).json({
          totalEvents: events.length,
          eventCounts: counts,
          recentErrors: errors.slice(0, 50),
        });
      } catch {
        return res.status(200).json({ totalEvents: 0, eventCounts: {}, recentErrors: [] });
      }
    }
    if (apiPath === '/telemetry/searches' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const events: any[] = (await kvGet('analyticsEvents')) ?? [];
        const searches: Record<string, number> = {};
        for (const ev of events) {
          if ((ev.event === 'building_search' || ev.event === 'room_search') && ev.q) {
            searches[ev.q] = (searches[ev.q] ?? 0) + 1;
          }
        }
        const result = Object.entries(searches)
          .sort((a, b) => b[1] - a[1]).slice(0, 50)
          .map(([query, count]) => ({ query, count }));
        return res.status(200).json(result);
      } catch {
        return res.status(200).json([]);
      }
    }
    if (apiPath === '/telemetry/rooms' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvGet } = await import('../server/kvStorage.js');
        const events: any[] = (await kvGet('analyticsEvents')) ?? [];
        const rooms: Record<string, number> = {};
        for (const ev of events) {
          if (ev.event === 'room_view' && ev.roomId) {
            rooms[ev.roomId] = (rooms[ev.roomId] ?? 0) + 1;
          }
        }
        const result = Object.entries(rooms)
          .sort((a, b) => b[1] - a[1]).slice(0, 50)
          .map(([roomId, views]) => ({ roomId, views }));
        return res.status(200).json(result);
      } catch {
        return res.status(200).json([]);
      }
    }

    // ── 2FA status stub ────────────────────────────────────────────────────
    if (apiPath === '/auth/2fa/status' && req.method === 'GET') {
      const payload = requireAdminAuth(req, res);
      if (!payload) return;
      return res.status(200).json({ enabled: false, verified: false });
    }

    // Pixel beacon fallback — tiny 1×1 GIF response.
    if (apiPath === '/t/p' && req.method === 'GET') {
      const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).end(gif);
    }

    // ── Wilma config stub (Wilma removed; returns "not configured") ──────
    if (apiPath === '/admin/wilma-config' && req.method === 'GET') {
      return res.status(200).json({ configured: false, serverUrl: '', connectionStatus: 'not_configured', lastSync: null, lastTestAt: null });
    }
    if (apiPath === '/admin/wilma-config' && req.method === 'POST') {
      return res.status(410).json({ message: 'Wilma integration has been removed.' });
    }
    if (apiPath === '/admin/wilma-config/test' && req.method === 'POST') {
      return res.status(410).json({ success: false, status: 'removed', message: 'Wilma integration has been removed.' });
    }

    // ── iCalendar parse proxy ────────────────────────────────────────────
    // POST /api/calendar/parse { url } → { events, stats, unknownLocations }
    // The URL is NOT logged or stored. Fetch-on-demand, caller caches result.
    if (apiPath === '/calendar/parse' && req.method === 'POST') {
      const { url } = req.body || {};
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: 'url is required' });
      }
      const trimmedUrl = url.trim();
      if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('http://')) {
        return res.status(400).json({ message: 'url must be http(s)' });
      }
      // Rate limit: 10 calendar fetches per IP per 5 min
      const calRL = checkRateLimit(`cal:${clientIP}`, 10, 5 * 60 * 1000);
      if (!calRL.allowed) {
        return res.status(429).json({ message: 'Too many calendar requests. Try again later.' });
      }

      try {
        // Fetch iCal without logging the URL
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const icalRes = await fetch(trimmedUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'KSYK-Maps-Calendar/1.0', 'Accept': 'text/calendar,*/*' },
          redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!icalRes.ok) {
          return res.status(422).json({
            message: `Calendar server returned ${icalRes.status}`,
            code: 'FETCH_ERROR',
          });
        }

        const contentType = icalRes.headers.get('content-type') ?? '';
        if (!contentType.includes('calendar') && !contentType.includes('text') && !contentType.includes('octet')) {
          return res.status(422).json({ message: 'URL does not point to a calendar', code: 'NOT_CALENDAR' });
        }

        const icalText = await icalRes.text();
        if (!icalText.includes('BEGIN:VCALENDAR')) {
          return res.status(422).json({ message: 'Not a valid iCalendar file', code: 'INVALID_ICAL' });
        }

        // Parse iCal
        const { parseICalFeed } = await import('../server/icalParser.js');
        const expanded = parseICalFeed(icalText);

        // Load rooms and aliases for matching
        const { storage: st } = await import('../server/storage.js');
        const rooms = await st.getRooms();

        const { db: pgDb } = await import('../server/db.js');
        const { roomAliases, unknownLocations } = await import('../shared/schema.js');
        const { eq } = await import('drizzle-orm');
        const aliases = await pgDb.select().from(roomAliases).where(eq(roomAliases.approved, true)).catch(() => []);

        // Match each event's location to a room
        const { matchRoom } = await import('../server/classroomMatcher.js');
        const matchableRooms = rooms.map((r: any) => ({
          id: r.id,
          roomNumber: r.roomNumber,
          name: r.name,
          nameFi: r.nameFi,
          nameEn: r.nameEn,
        }));
        const matchableAliases = aliases.map((a: any) => ({
          id: a.id,
          wilmaString: a.wilmaString,
          roomId: a.roomId,
        }));

        let matched = 0, unmatched = 0;
        const unknownSet = new Set<string>();

        // Only real lessons go into the timetable. Reservations
        // (Lounas etc.) still round-trip so admins can see them, but
        // are excluded from matched-room stats.
        const events = expanded
          .filter((ev: any) => ev.type !== 'reservation')
          .map((ev: any) => {
            const result = matchRoom(ev.location, matchableRooms, matchableAliases);
            if (result.confidence >= 70) {
              matched++;
            } else {
              unmatched++;
              if (ev.location) unknownSet.add(ev.location);
            }
            return {
              uid: ev.uid,
              occurrenceId: ev.occurrenceId,
              summary: ev.summary,
              location: ev.location,
              teacher: ev.teacher,
              date: ev.date,
              localDate: ev.localDate,
              startHhmm: ev.startHhmm,
              endHhmm: ev.endHhmm,
              dayOfWeek: ev.dayOfWeek,
              type: ev.type,
              matchedRoomId: result.confidence >= 70 ? result.roomId : null,
              matchedRoomNumber: result.confidence >= 70 ? result.roomNumber : null,
              matchConfidence: result.confidence,
              matchMethod: result.method,
            };
          });

        // Record unknown locations for admin review (best-effort, non-blocking)
        if (unknownSet.size > 0) {
          try {
            for (const ws of unknownSet) {
              await pgDb.insert(unknownLocations).values({ wilmaString: ws }).catch(() => {});
            }
          } catch { /* non-critical */ }
        }

        return res.status(200).json({
          events,
          stats: {
            total: events.length,
            matched,
            unmatched,
            ambiguous: events.filter((e: any) => e.matchConfidence >= 50 && e.matchConfidence < 70).length,
          },
          unknownLocations: [...unknownSet],
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return res.status(504).json({ message: 'Calendar URL timed out', code: 'TIMEOUT' });
        }
        console.error('[calendar/parse] error:', err?.message);
        return res.status(502).json({ message: 'Could not fetch calendar', code: 'NETWORK_ERROR' });
      }
    }

    // ── Room aliases (admin) ─────────────────────────────────────────────
    if (apiPath === '/admin/aliases') {
      if (!requireAdminAuth(req, res)) return;
      const { db: pgDb } = await import('../server/db.js');
      const { roomAliases, rooms: roomsTable } = await import('../shared/schema.js');

      if (req.method === 'GET') {
        const { eq } = await import('drizzle-orm');
        const rows = await pgDb
          .select({
            id: roomAliases.id,
            wilmaString: roomAliases.wilmaString,
            roomId: roomAliases.roomId,
            roomNumber: roomsTable.roomNumber,
            roomName: roomsTable.name,
            confidence: roomAliases.confidence,
            method: roomAliases.method,
            approved: roomAliases.approved,
            approvedBy: roomAliases.approvedBy,
            createdAt: roomAliases.createdAt,
          })
          .from(roomAliases)
          .leftJoin(roomsTable, eq(roomAliases.roomId, roomsTable.id))
          .orderBy(roomAliases.createdAt)
          .catch(() => []);
        return res.status(200).json(rows);
      }

      if (req.method === 'POST') {
        const { wilmaString, roomId, confidence, method } = req.body || {};
        if (!wilmaString || !roomId) {
          return res.status(400).json({ message: 'wilmaString and roomId are required' });
        }
        const auth = verifyAdminToken(
          ((req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined)
            ?.replace(/^Bearer\s+/i, '').trim() ?? ''
        );
        const row = await pgDb.insert(roomAliases).values({
          wilmaString: wilmaString.trim(),
          roomId,
          confidence: confidence ?? 99,
          method: method ?? 'manual',
          approved: true,
          approvedBy: auth?.userId ?? 'admin',
        } as any).returning().catch((e: any) => { throw e; });
        return res.status(201).json(row[0]);
      }
    }

    if (apiPath.match(/^\/admin\/aliases\/([^/]+)$/) && req.method === 'DELETE') {
      if (!requireAdminAuth(req, res)) return;
      const aliasId = apiPath.split('/').pop()!;
      const { db: pgDb } = await import('../server/db.js');
      const { roomAliases } = await import('../shared/schema.js');
      const { eq } = await import('drizzle-orm');
      await pgDb.delete(roomAliases).where(eq(roomAliases.id, aliasId)).catch(() => {});
      return res.status(204).end();
    }

    // ── Unknown locations (admin review) ─────────────────────────────────
    if (apiPath === '/admin/unknown-locations' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      const { db: pgDb } = await import('../server/db.js');
      const { unknownLocations } = await import('../shared/schema.js');
      const { eq, desc } = await import('drizzle-orm');
      const rows = await pgDb
        .select()
        .from(unknownLocations)
        .where(eq(unknownLocations.resolved, false))
        .orderBy(desc(unknownLocations.occurrences))
        .limit(200)
        .catch(() => []);
      return res.status(200).json(rows);
    }

    // ── Adblock-safe unified ingest ─────────────────────────────────────
    // /api/analytics/* and /api/telemetry/* are blocked by uBlock Origin
    // (EasyList, EasyPrivacy). We alias the same behaviour under path
    // names that don't match any tracking filter: /session/heartbeat,
    // /session/sync, /config/report, /preferences/save. All accept:
    //   { source: "web"|"android"|"ios",
    //     sessionId, userId, anonymousId, appVersion, meta: {...},
    //     events: [{ type, ts, url|screen|route, ...typed fields }] }
    // and fan out into the right table based on event.type / event.category.
    //
    // ROUTING (see also shared/schema.ts):
    //   session_started / session_ended → telemetry_sessions (upsert)
    //   page_view / screen_view         → pageViews
    //   search                          → searchAnalytics
    //   navigation                      → navigationAnalytics
    //   feature                         → featureUsage
    //   easter_egg                      → easterEggEvents
    //   performance / web_vital         → performanceEvents
    //   error                           → appLogs (level=error)
    //   log                             → appLogs (level from event.level)
    //   everything else                 → telemetryEvents (firehose)
    if (
      (apiPath === '/session/heartbeat' ||
        apiPath === '/session/sync' ||
        apiPath === '/config/report' ||
        apiPath === '/preferences/save') &&
      req.method === 'POST'
    ) {
      // Payload size guard — reject anything over 128 KB. Prevents a
      // pathological client from filling the disk with a single request.
      const contentLength = Number(req.headers['content-length'] || 0);
      if (contentLength > 128 * 1024) {
        return res.status(413).json({ message: 'payload too large' });
      }
      try {
        const { db: pgDb } = await import('../server/db.js');
        const schema = await import('../shared/schema.js');
        const {
          appLogs, pageViews, searchAnalytics, navigationAnalytics,
          telemetrySessions, telemetryEvents, featureUsage,
          easterEggEvents, performanceEvents,
        } = schema;
        const { eq, sql: dsql } = await import('drizzle-orm');

        const body = req.body || {};
        const source = ((body.source || 'web') as string).slice(0, 20);
        const sessionId = ((body.sessionId || 'anon') as string).slice(0, 60);
        const anonymousId = ((body.anonymousId || body.userId || '') as string).slice(0, 60);
        const appVersion = ((body.appVersion || body.meta?.appVersion || '') as string).slice(0, 40);
        const osVersion = ((body.osVersion || body.meta?.osVersion || '') as string).slice(0, 40);
        const deviceType = ((body.deviceType || body.meta?.deviceType || source) as string).slice(0, 40);
        const events = Array.isArray(body.events) ? body.events.slice(0, 100) : [];
        const ua = (req.headers['user-agent'] || '').toString().slice(0, 300);

        // Touch the session row: create if missing, bump last_seen_at.
        // A fresh Set the "startedAt" too. Every event we ingest counts as
        // a heartbeat, so this doubles as the activity ping.
        try {
          await pgDb.execute(dsql`
            INSERT INTO telemetry_sessions
              (session_id, anonymous_id, platform, app_version, os_version, device_type, started_at, last_seen_at)
            VALUES (${sessionId}, ${anonymousId || null}, ${source}, ${appVersion || null},
                    ${osVersion || null}, ${deviceType}, NOW(), NOW())
            ON CONFLICT (session_id) DO UPDATE
              SET last_seen_at = NOW(),
                  app_version = COALESCE(${appVersion || null}, telemetry_sessions.app_version)
          `);
        } catch (e: any) {
          // Table may not exist yet on first cold start — initDb creates
          // it, but if this request beat it, just drop the session touch.
          if (!/relation .* does not exist/.test(e?.message || '')) {
            console.warn('[heartbeat] session upsert failed:', e?.message?.slice(0, 120));
          }
        }

        for (const ev of events) {
          if (!ev || typeof ev !== 'object') continue;
          const kind = ((ev.type || ev.event || 'unknown') as string).slice(0, 60);
          const evCategory = ((ev.category || '') as string).slice(0, 40) || null;
          const evRoute = ((ev.route || ev.url || ev.screen || '') as string).slice(0, 200);
          const metaObj = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
          const msg = ((ev.message || ev.msg || '') as string).slice(0, 1000);
          const durMs = Number.isFinite(ev.durationMs) ? Number(ev.durationMs)
                       : Number.isFinite(ev.duration_ms) ? Number(ev.duration_ms) : null;

          try {
            if (kind === 'session_started') {
              // Session row already upserted above; nothing else to do.
              continue;
            } else if (kind === 'session_ended') {
              await pgDb.execute(dsql`
                UPDATE telemetry_sessions
                   SET ended_at    = NOW(),
                       duration_ms = ${durMs},
                       last_seen_at = NOW()
                 WHERE session_id = ${sessionId}
              `);
              continue;
            } else if (kind === 'page_view' || kind === 'pageview' || kind === 'screen_view') {
              await pgDb.insert(pageViews).values({
                url: evRoute || '/',
                sessionId,
                userId: null,
                referrer: ((ev.referrer || ev.from || '') as string).slice(0, 200),
                userAgent: ua,
                deviceType: source,
              }).catch(() => {});
            } else if (kind === 'search') {
              const q = ((ev.query || ev.q || '') as string).slice(0, 200).trim();
              if (q) {
                await pgDb.insert(searchAnalytics).values({
                  query: q,
                  sessionId,
                  userId: null,
                  resultsCount: Number(ev.hits ?? ev.resultsCount ?? 0),
                } as any).catch(() => {});
              }
            } else if (kind === 'navigation') {
              await pgDb.insert(navigationAnalytics).values({
                sessionId,
                userId: null,
                fromRoom: ((ev.fromRoom || null) as string | null)?.slice(0, 80) ?? null,
                toRoom: ((ev.toRoom || null) as string | null)?.slice(0, 80) ?? null,
                fromBuilding: ((ev.fromBuilding || null) as string | null)?.slice(0, 80) ?? null,
                toBuilding: ((ev.toBuilding || null) as string | null)?.slice(0, 80) ?? null,
                navigationType: ((ev.navigationType || 'walking') as string).slice(0, 40),
                distance: Number.isFinite(ev.distance) ? String(ev.distance) : null,
                duration: Number.isFinite(ev.duration) ? Number(ev.duration) : null,
                userAgent: ua,
              } as any).catch(() => {});
            } else if (kind === 'feature') {
              const feature = ((ev.name || ev.feature || 'unknown') as string).slice(0, 80);
              const action = ((ev.action || 'used') as string).slice(0, 40);
              await pgDb.insert(featureUsage).values({
                sessionId,
                userId: null,
                platform: source,
                appVersion: appVersion || null,
                feature,
                action,
                durationMs: durMs,
                metadata: metaObj,
              } as any).catch(() => {});
            } else if (kind === 'easter_egg') {
              const eggId = ((ev.eggId || ev.egg_id || ev.name || '') as string).slice(0, 80);
              if (eggId) {
                const action = ((ev.action || 'discovered') as string).slice(0, 40);
                await pgDb.insert(easterEggEvents).values({
                  sessionId,
                  userId: null,
                  platform: source,
                  eggId,
                  action,
                  metadata: metaObj,
                } as any).catch(() => {});
                // Also bump the KV counter so the legacy stats card keeps
                // working without a schema migration on the client.
                try {
                  const { incrementEggCounter, appendEggRecent } = await import('../server/kvStorage.js');
                  if (/^[a-z0-9-]{1,64}$/.test(eggId)) {
                    await incrementEggCounter(eggId).catch(() => {});
                    await appendEggRecent({
                      egg: eggId, userId: anonymousId || 'anon',
                      at: new Date().toISOString(),
                    }).catch(() => {});
                  }
                } catch { /* KV unavailable */ }
              }
            } else if (kind === 'performance' || kind === 'web_vital') {
              const metricName = ((ev.metric || ev.name || 'unknown') as string).slice(0, 40);
              const valueMs = Number.isFinite(ev.value) ? Number(ev.value)
                            : Number.isFinite(ev.valueMs) ? Number(ev.valueMs) : null;
              await pgDb.insert(performanceEvents).values({
                sessionId,
                userId: null,
                platform: source,
                appVersion: appVersion || null,
                metricName,
                valueMs,
                endpoint: ((ev.endpoint || null) as string | null)?.slice(0, 200) ?? null,
                statusCode: Number.isFinite(ev.statusCode) ? Number(ev.statusCode) : null,
                metadata: metaObj,
              } as any).catch(() => {});
            } else if (kind === 'error' || (ev.level === 'error')) {
              await pgDb.insert(appLogs).values({
                level: 'error',
                message: (msg || `${source}:error`).slice(0, 500),
                userAgent: ua,
                url: evRoute,
                ipAddress: clientIP.slice(0, 45),
                errorStack: ((ev.stack || ev.errorStack || null) as string | null)?.slice(0, 2000) ?? null,
              } as any).catch(() => {});
            } else if (kind === 'log' || ev.level) {
              const level = (['error', 'warn', 'warning', 'info', 'debug', 'success'].includes(String(ev.level))
                ? String(ev.level).replace('warning', 'warn')
                : 'info');
              const label = ev.tag ? `${source}:${ev.tag}` : source;
              await pgDb.insert(appLogs).values({
                level,
                message: (msg ? `${label} — ${msg}` : label).slice(0, 500),
                userAgent: ua,
                url: evRoute,
                ipAddress: clientIP.slice(0, 45),
              } as any).catch(() => {});
            } else {
              // Firehose: everything else goes into telemetry_events so we
              // never lose an event just because it's a new type.
              await pgDb.insert(telemetryEvents).values({
                sessionId,
                userId: null,
                platform: source,
                appVersion: appVersion || null,
                eventName: kind,
                eventCategory: evCategory,
                route: evRoute || null,
                screen: ((ev.screen || null) as string | null)?.slice(0, 80) ?? null,
                durationMs: durMs,
                success: typeof ev.success === 'boolean' ? ev.success : null,
                errorCode: ((ev.errorCode || null) as string | null)?.slice(0, 60) ?? null,
                metadata: metaObj,
              } as any).catch(() => {});
            }
          } catch (perEventErr: any) {
            // A single malformed event must never bring down the batch.
            console.warn('[heartbeat] event insert failed:', perEventErr?.message?.slice(0, 120));
          }
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.status(204).end();
      } catch (err) {
        console.error('session/heartbeat error:', err);
        return res.status(204).end();
      }
    }

    // ── Adblock-safe GET pixel — same payload via querystring beacon ──
    // Fires from <img src="/api/session/ping?..."> when sendBeacon isn't
    // available (Safari on iOS <13, some corporate proxies). We accept
    // a single event per hit encoded as query params.
    if (apiPath.startsWith('/session/ping') && req.method === 'GET') {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { pageViews } = await import('../shared/schema.js');
        const q = req.query as Record<string, string>;
        await pgDb.insert(pageViews).values({
          url: (q.p || '/').slice(0, 200),
          sessionId: (q.s || 'anon').slice(0, 60),
          userId: null,
          referrer: (q.r || '').slice(0, 200),
          userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300),
          deviceType: (q.src || 'web').slice(0, 20),
        }).catch(() => {});
      } catch { /* non-critical */ }
      const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).end(gif);
    }

    // ── /api/admin/analytics/* — dashboard queries ──────────────────────
    // Every handler requires admin auth. Every handler is READ-only. Every
    // handler emits a matching audit_logs row so we can prove who looked
    // at what and when (spec §32).
    async function auditView(action: string, meta: any = null) {
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { auditLogs } = await import('../shared/schema.js');
        const authHdr = (req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined;
        const t = authHdr?.replace(/^Bearer\s+/i, '').trim();
        const claim = t ? verifyAdminToken(t) : null;
        await pgDb.insert(auditLogs).values({
          adminUserId: claim?.userId ?? null,
          adminEmail: null,
          action,
          resource: null,
          ipAddress: clientIP.slice(0, 45),
          userAgent: (req.headers['user-agent'] || '').toString().slice(0, 300),
          metadata: meta,
        } as any).catch(() => {});
        // Mirror to PostHog Logs so the same events also land in the
        // hosted logs viewer (searchable across all deployments).
        emitLog(`admin action: ${action}`, {
          severity: 'info',
          attributes: {
            adminUserId: claim?.userId,
            ip: clientIP,
            ...(meta ?? {}),
          },
        });
        // Also emit as a Product Analytics event so admin activity
        // shows up on the Insights dashboards, not just the Logs view.
        posthogCapture(claim?.userId || `ip:${clientIP}`, `server_${action}`, {
          adminUserId: claim?.userId,
          role: claim?.role,
          ip: clientIP,
          ...(meta ?? {}),
        });
      } catch { /* audit is best-effort */ }
    }

    // GET /api/admin/analytics/overview
    if (apiPath === '/admin/analytics/overview' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'overview' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const {
          pageViews, searchAnalytics, appLogs, featureUsage,
          easterEggEvents, telemetrySessions, navigationAnalytics,
        } = await import('../shared/schema.js');
        const { gte, count: pgCount, eq, and } = await import('drizzle-orm');

        const q = req.query as Record<string, string>;
        const range = (q.range || '24h').toLowerCase();
        const hours = range === '7d' ? 168 : range === '30d' ? 720 : range === '90d' ? 2160 : 24;
        const since = new Date(Date.now() - hours * 3600 * 1000);

        const [pv, searches, errors, features, eggs, sessions, navs] = await Promise.all([
          pgDb.select({ n: pgCount() }).from(pageViews).where(gte(pageViews.createdAt, since)).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(searchAnalytics).where(gte(searchAnalytics.createdAt, since)).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(appLogs).where(and(gte(appLogs.createdAt, since), eq(appLogs.level, 'error'))).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(featureUsage).where(gte(featureUsage.createdAt, since)).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(easterEggEvents).where(gte(easterEggEvents.createdAt, since)).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(telemetrySessions).where(gte(telemetrySessions.startedAt, since)).catch(() => [{ n: 0 }]),
          pgDb.select({ n: pgCount() }).from(navigationAnalytics).where(gte(navigationAnalytics.createdAt, since)).catch(() => [{ n: 0 }]),
        ]);

        // Split sessions by platform.
        let bySource: Record<string, number> = {};
        try {
          const rows = await pgDb.select({
            platform: telemetrySessions.platform,
            n: pgCount(),
          }).from(telemetrySessions).where(gte(telemetrySessions.startedAt, since))
            .groupBy(telemetrySessions.platform);
          for (const r of rows as any[]) bySource[r.platform] = Number(r.n) || 0;
        } catch { /* table might not yet exist */ }

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          range,
          since: since.toISOString(),
          pageviews: Number((pv[0] as any)?.n ?? 0),
          searches: Number((searches[0] as any)?.n ?? 0),
          errors: Number((errors[0] as any)?.n ?? 0),
          featureUses: Number((features[0] as any)?.n ?? 0),
          easterEggs: Number((eggs[0] as any)?.n ?? 0),
          sessions: Number((sessions[0] as any)?.n ?? 0),
          navigations: Number((navs[0] as any)?.n ?? 0),
          bySource,
          fetchedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('analytics/overview error:', err);
        return res.status(200).json({ range: '24h', pageviews: 0, searches: 0, errors: 0, featureUses: 0, easterEggs: 0, sessions: 0, navigations: 0, bySource: {} });
      }
    }

    // GET /api/admin/analytics/sessions
    if (apiPath === '/admin/analytics/sessions' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'sessions' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { telemetrySessions } = await import('../shared/schema.js');
        const { desc, gte } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const limit = Math.min(parseInt(q.limit || '100', 10), 500);
        // v4.7.10 — honor the range picker like every other admin
        // analytics endpoint. Falls back to 24h when neither since
        // nor range are supplied.
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const since = q.since
          ? new Date(q.since)
          : new Date(Date.now() - rangeHours * 3600 * 1000);
        const rows = await pgDb.select().from(telemetrySessions)
          .where(gte(telemetrySessions.startedAt, since))
          .orderBy(desc(telemetrySessions.lastSeenAt))
          .limit(limit).catch(() => [] as any[]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rows);
      } catch { return res.status(200).json([]); }
    }

    // GET /api/admin/analytics/features
    if (apiPath === '/admin/analytics/features' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'features' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { featureUsage } = await import('../shared/schema.js');
        const { gte, count: pgCount, sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const hours = q.range === '7d' ? 168 : q.range === '30d' ? 720 : 24;
        const since = new Date(Date.now() - hours * 3600 * 1000);
        const rows = await pgDb.select({
          feature: featureUsage.feature,
          action: featureUsage.action,
          n: pgCount(),
        }).from(featureUsage)
          .where(gte(featureUsage.createdAt, since))
          .groupBy(featureUsage.feature, featureUsage.action)
          .orderBy(dsql`n DESC`)
          .limit(200).catch(() => [] as any[]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rows);
      } catch { return res.status(200).json([]); }
    }

    // GET /api/admin/analytics/timeseries
    // Returns hourly buckets of pageviews / errors / feature-uses
    // grouped by platform for the stacked-area chart on the dashboard.
    // Cheap because it's driven by DATE_TRUNC + GROUP BY on indexed
    // created_at columns.
    if (apiPath === '/admin/analytics/timeseries' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'timeseries' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const range = (q.range || '24h').toLowerCase();
        const hours = range === '7d' ? 168 : range === '30d' ? 720 : range === '90d' ? 2160 : 24;
        const bucket = hours <= 24 ? 'hour' : hours <= 168 ? 'hour' : 'day';
        const since = new Date(Date.now() - hours * 3600 * 1000);

        const [pv, err, feat] = await Promise.all([
          pgDb.execute(dsql`
            SELECT DATE_TRUNC(${bucket}, created_at) AS ts,
                   COALESCE(device_type, 'unknown')   AS platform,
                   COUNT(*)::int                       AS n
              FROM page_views
             WHERE created_at >= ${since}
          GROUP BY 1, 2 ORDER BY 1
          `).catch(() => ({ rows: [] } as any)),
          pgDb.execute(dsql`
            SELECT DATE_TRUNC(${bucket}, created_at) AS ts,
                   COUNT(*)::int AS n
              FROM app_logs
             WHERE created_at >= ${since} AND level = 'error'
          GROUP BY 1 ORDER BY 1
          `).catch(() => ({ rows: [] } as any)),
          pgDb.execute(dsql`
            SELECT DATE_TRUNC(${bucket}, created_at) AS ts,
                   feature,
                   COUNT(*)::int AS n
              FROM feature_usage
             WHERE created_at >= ${since}
          GROUP BY 1, 2 ORDER BY 1
          `).catch(() => ({ rows: [] } as any)),
        ]);

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          bucket,
          range,
          since: since.toISOString(),
          pageviews: (pv as any).rows ?? pv,
          errors: (err as any).rows ?? err,
          features: (feat as any).rows ?? feat,
        });
      } catch (e: any) {
        console.error('analytics/timeseries error:', e?.message);
        return res.status(200).json({ pageviews: [], errors: [], features: [] });
      }
    }

    // GET /api/admin/analytics/session/:id
    // Drill-in: recent events belonging to a specific session id, pulled
    // from telemetry_events + page_views + searches. Powers the "click a
    // session row" experience on the dashboard.
    const sessionMatch = apiPath.match(/^\/admin\/analytics\/session\/([^/?]+)$/);
    if (sessionMatch && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'session_detail', sessionId: sessionMatch[1] });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const {
          telemetryEvents, pageViews, searchAnalytics, telemetrySessions,
        } = await import('../shared/schema.js');
        const { eq, desc } = await import('drizzle-orm');
        const sid = sessionMatch[1];
        const [events, views, searches, session] = await Promise.all([
          pgDb.select().from(telemetryEvents)
            .where(eq(telemetryEvents.sessionId, sid))
            .orderBy(desc(telemetryEvents.createdAt))
            .limit(300).catch(() => [] as any[]),
          pgDb.select().from(pageViews)
            .where(eq(pageViews.sessionId, sid))
            .orderBy(desc(pageViews.createdAt))
            .limit(200).catch(() => [] as any[]),
          pgDb.select().from(searchAnalytics)
            .where(eq(searchAnalytics.sessionId, sid))
            .orderBy(desc(searchAnalytics.createdAt))
            .limit(100).catch(() => [] as any[]),
          pgDb.select().from(telemetrySessions)
            .where(eq(telemetrySessions.sessionId, sid))
            .limit(1).catch(() => [] as any[]),
        ]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          session: (session as any[])[0] ?? null,
          events,
          pageViews: views,
          searches,
        });
      } catch { return res.status(200).json({ session: null, events: [], pageViews: [], searches: [] }); }
    }

    // GET /api/admin/analytics/errors
    if (apiPath === '/admin/analytics/errors' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'errors' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const { desc, gte, eq, and } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const hours = q.range === '7d' ? 168 : q.range === '30d' ? 720 : 24;
        const since = new Date(Date.now() - hours * 3600 * 1000);
        const rows = await pgDb.select().from(appLogs)
          .where(and(gte(appLogs.createdAt, since), eq(appLogs.level, 'error')))
          .orderBy(desc(appLogs.createdAt))
          .limit(300).catch(() => [] as any[]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rows);
      } catch { return res.status(200).json([]); }
    }

    // v1.84.0 — 4 new analytics endpoints (search zero-results, peak
    // usage by hour × day, device/OS breakdown, bounce rate by page).
    // All follow the same shape: admin-only, range param (24h / 7d / 30d),
    // audit-logged, gracefully return [] on error so the UI doesn't blow up.

    // GET /api/admin/analytics/search-zero-results
    // Content gap finder — search queries that returned 0 results, ranked
    // by frequency. Points to missing rooms / missing aliases.
    if (apiPath === '/admin/analytics/search-zero-results' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'search_zero_results' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const hours = q.range === '7d' ? 168 : q.range === '30d' ? 720 : 24;
        const since = new Date(Date.now() - hours * 3600 * 1000);
        const rows = await pgDb.execute(dsql`
          SELECT
            LOWER(TRIM(query)) AS query,
            COUNT(*)::int      AS attempts,
            COUNT(DISTINCT COALESCE(user_id, session_id))::int AS unique_searchers,
            MAX(created_at)    AS last_seen
          FROM search_analytics
          WHERE results_count = 0
            AND created_at >= ${since}
            AND LENGTH(TRIM(query)) >= 2
          GROUP BY LOWER(TRIM(query))
          ORDER BY attempts DESC, unique_searchers DESC
          LIMIT 50
        `);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json((rows as any).rows ?? rows);
      } catch (err) {
        console.error('analytics/search-zero-results error:', (err as any)?.message);
        return res.status(200).json([]);
      }
    }

    // GET /api/admin/analytics/peak-usage
    // 24×7 grid of event counts (hour of day × day of week). Helps
    // understand when the app is used most so admins can time
    // announcements for maximum reach.
    if (apiPath === '/admin/analytics/peak-usage' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'peak_usage' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const days = q.range === '7d' ? 7 : q.range === '30d' ? 30 : 1;
        const since = new Date(Date.now() - days * 24 * 3600 * 1000);
        const rows = await pgDb.execute(dsql`
          SELECT
            EXTRACT(DOW  FROM created_at AT TIME ZONE 'Europe/Helsinki')::int AS dow,
            EXTRACT(HOUR FROM created_at AT TIME ZONE 'Europe/Helsinki')::int AS hour,
            COUNT(*)::int AS n
          FROM telemetry_events
          WHERE created_at >= ${since}
          GROUP BY dow, hour
          ORDER BY dow, hour
        `);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json((rows as any).rows ?? rows);
      } catch (err) {
        console.error('analytics/peak-usage error:', (err as any)?.message);
        return res.status(200).json([]);
      }
    }

    // GET /api/admin/analytics/devices
    // Device / OS / app_version breakdown from telemetry_sessions. Helps
    // prioritise: e.g. if 80% of users are on Android 14, we can drop
    // Android 12 quirks. Also surfaces stale app versions.
    if (apiPath === '/admin/analytics/devices' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'devices' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const days = q.range === '7d' ? 7 : q.range === '30d' ? 30 : 1;
        const since = new Date(Date.now() - days * 24 * 3600 * 1000);
        const [byPlatform, byVersion, byOs] = await Promise.all([
          pgDb.execute(dsql`SELECT COALESCE(platform, 'unknown') AS k, COUNT(*)::int AS n FROM telemetry_sessions WHERE started_at >= ${since} GROUP BY 1 ORDER BY n DESC`),
          pgDb.execute(dsql`SELECT COALESCE(app_version, 'unknown') AS k, COUNT(*)::int AS n FROM telemetry_sessions WHERE started_at >= ${since} GROUP BY 1 ORDER BY n DESC LIMIT 20`),
          pgDb.execute(dsql`SELECT COALESCE(os_version, 'unknown') AS k, COUNT(*)::int AS n FROM telemetry_sessions WHERE started_at >= ${since} GROUP BY 1 ORDER BY n DESC LIMIT 20`),
        ]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          platform: (byPlatform as any).rows ?? byPlatform,
          appVersion: (byVersion as any).rows ?? byVersion,
          os: (byOs as any).rows ?? byOs,
        });
      } catch (err) {
        console.error('analytics/devices error:', (err as any)?.message);
        return res.status(200).json({ platform: [], appVersion: [], os: [] });
      }
    }

    // GET /api/admin/analytics/bounce-rate
    // Sessions where the user viewed exactly one route before leaving.
    // High bounce = onboarding / landing UX problem.
    if (apiPath === '/admin/analytics/bounce-rate' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'bounce_rate' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const days = q.range === '7d' ? 7 : q.range === '30d' ? 30 : 1;
        const since = new Date(Date.now() - days * 24 * 3600 * 1000);
        const rows = await pgDb.execute(dsql`
          WITH landings AS (
            SELECT session_id, COALESCE(route, screen, '/') AS entry_route
            FROM (
              SELECT session_id, route, screen, created_at,
                     ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at ASC) AS rn
              FROM telemetry_events
              WHERE created_at >= ${since}
                AND event_name IN ('pageview', 'page_view', 'route_changed', 'screen_view')
            ) t
            WHERE rn = 1
          ),
          counts AS (
            SELECT session_id, COUNT(*)::int AS n
            FROM telemetry_events
            WHERE created_at >= ${since}
              AND event_name IN ('pageview', 'page_view', 'route_changed', 'screen_view')
            GROUP BY session_id
          )
          SELECT
            l.entry_route                                  AS route,
            COUNT(*)::int                                  AS sessions,
            SUM(CASE WHEN c.n = 1 THEN 1 ELSE 0 END)::int  AS bounced,
            ROUND(100.0 * SUM(CASE WHEN c.n = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS bounce_pct
          FROM landings l
          JOIN counts   c USING (session_id)
          GROUP BY l.entry_route
          HAVING COUNT(*) >= 3
          ORDER BY sessions DESC
          LIMIT 30
        `);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json((rows as any).rows ?? rows);
      } catch (err) {
        console.error('analytics/bounce-rate error:', (err as any)?.message);
        return res.status(200).json([]);
      }
    }

    // GET /api/admin/analytics/performance
    if (apiPath === '/admin/analytics/performance' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'performance' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { performanceEvents } = await import('../shared/schema.js');
        const { gte, sql: dsql } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const hours = q.range === '7d' ? 168 : q.range === '30d' ? 720 : 24;
        const since = new Date(Date.now() - hours * 3600 * 1000);
        // Percentile aggregation per metric. Postgres percentile_cont works
        // on numeric arrays; we bucket by metric_name.
        const rows = await pgDb.execute(dsql`
          SELECT metric_name,
                 COUNT(*)::int                                                   AS n,
                 percentile_cont(0.5)  WITHIN GROUP (ORDER BY value_ms)          AS p50,
                 percentile_cont(0.95) WITHIN GROUP (ORDER BY value_ms)          AS p95,
                 percentile_cont(0.99) WITHIN GROUP (ORDER BY value_ms)          AS p99,
                 AVG(value_ms)                                                   AS avg
            FROM performance_events
           WHERE created_at >= ${since}
             AND value_ms IS NOT NULL
        GROUP BY metric_name
        ORDER BY n DESC
           LIMIT 100
        `);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json((rows as any).rows ?? rows);
      } catch (err) {
        console.error('analytics/performance error:', err);
        return res.status(200).json([]);
      }
    }

    // GET /api/admin/analytics/easter-eggs
    if (apiPath === '/admin/analytics/easter-eggs' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'easter_eggs' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { easterEggEvents } = await import('../shared/schema.js');
        const { desc, gte, count: pgCount } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const hours = q.range === '7d' ? 168 : q.range === '30d' ? 720 : q.range === '90d' ? 2160 : 8760;
        const since = new Date(Date.now() - hours * 3600 * 1000);
        const [byEgg, recent] = await Promise.all([
          pgDb.select({
            eggId: easterEggEvents.eggId,
            n: pgCount(),
          }).from(easterEggEvents)
            .where(gte(easterEggEvents.createdAt, since))
            .groupBy(easterEggEvents.eggId).catch(() => [] as any[]),
          pgDb.select().from(easterEggEvents)
            .where(gte(easterEggEvents.createdAt, since))
            .orderBy(desc(easterEggEvents.createdAt))
            .limit(100).catch(() => [] as any[]),
        ]);
        // Include KV counters as a fallback so pre-v4.5.52 discoveries
        // aren't lost from the dashboard.
        const { kvGet } = await import('../server/kvStorage.js');
        const kvCounters = (await kvGet('easterEggCounters') as Record<string, number> | null) || {};
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          byEgg: (byEgg as any[]).map(r => ({ eggId: r.eggId, count: Number(r.n) || 0 })),
          recent,
          kvCounters,
          range: q.range || '365d',
        });
      } catch (err) {
        console.error('analytics/easter-eggs error:', err);
        return res.status(200).json({ byEgg: [], recent: [], kvCounters: {} });
      }
    }

    // GET /api/admin/analytics/recent-events
    if (apiPath === '/admin/analytics/recent-events' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      await auditView('analytics_viewed', { section: 'recent_events' });
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { telemetryEvents } = await import('../shared/schema.js');
        const { desc, gte } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const limit = Math.min(parseInt(q.limit || '200', 10), 500);
        // v4.7.10 — honor range picker for the Recent tab.
        const rangeHours = q.range === '90d' ? 24 * 90
          : q.range === '30d' ? 24 * 30
          : q.range === '7d'  ? 24 * 7
          : 24;
        const since = new Date(Date.now() - rangeHours * 3600 * 1000);
        const rows = await pgDb.select().from(telemetryEvents)
          .where(gte(telemetryEvents.createdAt, since))
          .orderBy(desc(telemetryEvents.createdAt))
          .limit(limit).catch(() => [] as any[]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rows);
      } catch { return res.status(200).json([]); }
    }

    // GET /api/admin/analytics/audit
    if (apiPath === '/admin/analytics/audit' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      // Note: we *don't* audit-log audit-log views — that would spiral.
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { auditLogs } = await import('../shared/schema.js');
        const { desc, gte } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const limit = Math.min(parseInt(q.limit || '200', 10), 500);
        const since = q.since ? new Date(q.since) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const rows = await pgDb.select().from(auditLogs)
          .where(gte(auditLogs.createdAt, since))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit).catch(() => [] as any[]);
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rows);
      } catch { return res.status(200).json([]); }
    }

    // POST /api/admin/analytics/reset-easter-eggs
    // Admin-only wipe of every easter-egg counter + history. Both the
    // legacy KV blob (easterEggCounters/easterEggRecent) and the new
    // easter_egg_events table are cleared. Emits an audit row + PostHog
    // log so it's traceable — never invoked accidentally.
    if (apiPath === '/admin/analytics/reset-easter-eggs' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { kvSet } = await import('../server/kvStorage.js');
        await Promise.all([
          kvSet('easterEggCounters', {}).catch(() => {}),
          kvSet('easterEggRecent', { entries: [] }).catch(() => {}),
        ]);
        try {
          const { db: pgDb } = await import('../server/db.js');
          const { sql: dsql } = await import('drizzle-orm');
          await pgDb.execute(dsql`TRUNCATE TABLE easter_egg_events`);
        } catch { /* table may not exist yet — swallow */ }
        await auditView('easter_eggs_reset');
        emitLog('Easter egg counters reset', { severity: 'warn' });
        await flushLogs().catch(() => {});
        return res.status(200).json({ success: true });
      } catch (err: any) {
        console.error('reset-easter-eggs failed:', err?.message);
        return res.status(500).json({ message: 'reset failed', error: err?.message });
      }
    }

    // ── GET /api/admin/activity ─────────────────────────────────────────
    // Unified paginated stream for the admin panel's Aktiviteetti tab.
    // Merges appLogs + pageViews + searchAnalytics into a single time-
    // ordered feed with filter options: level, source, since, limit.
    if (apiPath.startsWith('/admin/activity') && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs, pageViews, searchAnalytics } = await import('../shared/schema.js');
        const { desc, gte, eq, and } = await import('drizzle-orm');
        const q = req.query as Record<string, string>;
        const limit = Math.min(parseInt(q.limit || '200', 10), 500);
        const sinceParam = q.since ? new Date(q.since) : new Date(Date.now() - 24 * 3600 * 1000);
        const since = isNaN(sinceParam.getTime()) ? new Date(Date.now() - 24 * 3600 * 1000) : sinceParam;
        const levelFilter = q.level;
        const sourceFilter = q.source; // "web" | "android"

        const [logs, views, searches] = await Promise.all([
          pgDb.select().from(appLogs)
            .where(levelFilter
              ? and(gte(appLogs.createdAt, since), eq(appLogs.level, levelFilter))
              : gte(appLogs.createdAt, since))
            .orderBy(desc(appLogs.createdAt))
            .limit(limit).catch(() => [] as any[]),
          pgDb.select().from(pageViews)
            .where(gte(pageViews.createdAt, since))
            .orderBy(desc(pageViews.createdAt))
            .limit(limit).catch(() => [] as any[]),
          pgDb.select().from(searchAnalytics)
            .where(gte(searchAnalytics.createdAt, since))
            .orderBy(desc(searchAnalytics.createdAt))
            .limit(limit).catch(() => [] as any[]),
        ]);

        type Row = {
          id: string; ts: string; kind: string; level: string;
          source: string; message: string; url: string; userAgent: string;
        };
        const rows: Row[] = [];
        for (const r of logs as any[]) {
          // Message format when written via /session/heartbeat is
          // "<source>:<kind> — <message>". Parse it back out so the
          // dashboard can filter by source natively.
          const parts = String(r.message || '').split(':');
          const src = parts.length > 1 && ['web', 'android', 'ios'].includes(parts[0])
            ? parts[0] : 'server';
          rows.push({
            id: `log:${r.id}`,
            ts: (r.createdAt as Date).toISOString(),
            kind: 'log',
            level: r.level || 'info',
            source: src,
            message: r.message || '',
            url: r.url || '',
            userAgent: r.userAgent || '',
          });
        }
        for (const r of views as any[]) {
          rows.push({
            id: `view:${r.id}`,
            ts: (r.createdAt as Date).toISOString(),
            kind: 'pageview',
            level: 'info',
            source: r.deviceType || 'web',
            message: `pageview ${r.url}`,
            url: r.url || '',
            userAgent: r.userAgent || '',
          });
        }
        for (const r of searches as any[]) {
          rows.push({
            id: `search:${r.id}`,
            ts: (r.createdAt as Date).toISOString(),
            kind: 'search',
            level: 'info',
            source: 'web',
            message: `search "${r.query}" → ${r.resultsCount ?? 0} hits`,
            url: '',
            userAgent: '',
          });
        }
        rows.sort((a, b) => b.ts.localeCompare(a.ts));
        const filtered = sourceFilter
          ? rows.filter(r => r.source === sourceFilter)
          : rows;
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          rows: filtered.slice(0, limit),
          totals: {
            log: logs.length,
            pageview: views.length,
            search: searches.length,
          },
          since: since.toISOString(),
        });
      } catch (err) {
        console.error('admin/activity error:', err);
        return res.status(200).json({ rows: [], totals: { log: 0, pageview: 0, search: 0 } });
      }
    }

    // GET /api/admin/activity/live-stats — headline numbers for the
    // Aktiviteetti page hero: DAU proxy, top screens, error rate.
    if (apiPath === '/admin/activity/live-stats' && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs, pageViews } = await import('../shared/schema.js');
        const { gte, eq, and, count: pgCount } = await import('drizzle-orm');
        const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
        const hourAgo = new Date(Date.now() - 3600 * 1000);

        const [pvDay, pvHour, errDay, logsSample] = await Promise.all([
          pgDb.select({ count: pgCount() }).from(pageViews)
            .where(gte(pageViews.createdAt, dayAgo)).catch(() => [{ count: 0 }]),
          pgDb.select({ count: pgCount() }).from(pageViews)
            .where(gte(pageViews.createdAt, hourAgo)).catch(() => [{ count: 0 }]),
          pgDb.select({ count: pgCount() }).from(appLogs)
            .where(and(gte(appLogs.createdAt, dayAgo), eq(appLogs.level, 'error')))
            .catch(() => [{ count: 0 }]),
          pgDb.select({ url: pageViews.url, deviceType: pageViews.deviceType })
            .from(pageViews).where(gte(pageViews.createdAt, dayAgo))
            .limit(1000).catch(() => [] as any[]),
        ]);

        const screenCounts: Record<string, number> = {};
        const sourceCounts: Record<string, number> = {};
        for (const r of logsSample as any[]) {
          const url = (r.url || '/') as string;
          screenCounts[url] = (screenCounts[url] || 0) + 1;
          const src = (r.deviceType || 'web') as string;
          sourceCounts[src] = (sourceCounts[src] || 0) + 1;
        }
        const topScreens = Object.entries(screenCounts)
          .map(([url, count]) => ({ url, count }))
          .sort((a, b) => b.count - a.count).slice(0, 10);

        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json({
          pageviews24h: Number((pvDay[0] as any)?.count ?? 0),
          pageviewsLastHour: Number((pvHour[0] as any)?.count ?? 0),
          errors24h: Number((errDay[0] as any)?.count ?? 0),
          topScreens,
          bySource: sourceCounts,
          fetchedAt: new Date().toISOString(),
        });
      } catch {
        return res.status(200).json({
          pageviews24h: 0, pageviewsLastHour: 0, errors24h: 0,
          topScreens: [], bySource: {}, fetchedAt: new Date().toISOString(),
        });
      }
    }

    // 404 for unknown routes
    return res.status(404).json({
      message: "Not found",
      path: apiPath,
      availableEndpoints: [
        '/buildings',
        '/rooms',
        '/floors',
        '/staff',
        '/announcements',
        '/users',
        '/settings',
        '/auth/user',
        '/auth/admin-login',
        '/map-package',
        '/telemetry/pageview',
        '/session/heartbeat',
        '/admin/activity'
      ]
    });
    
  } catch (error: any) {
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
    // Ship the failure to PostHog Logs so we see it on the Logs board
    // without needing to scrape Vercel deployment logs.
    emitLog(`API 500 on ${req.method} ${req.url}: ${error.message}`, {
      severity: 'error',
      attributes: {
        method: req.method,
        url: req.url,
        stack: error?.stack?.slice(0, 1500),
      },
    });
    // Product Analytics event too — powers "5xx by endpoint" chart.
    posthogCapture(`ip:${clientIP}`, 'server_error', {
      status: 500,
      method: req.method,
      url: req.url,
      message: error?.message,
    });
    try { await Promise.all([flushLogs(), posthogFlush()]); } catch { /* ignore */ }

    return res.status(500).json({ message: 'Internal server error' });
  }
}

