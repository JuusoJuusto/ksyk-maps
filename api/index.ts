import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getRealIP, sanitizeObject } from '../server/security.js';
import crypto from 'node:crypto';

// â”€â”€ Stateless admin token (HMAC-signed, 24h TTL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  
  // Rate limiting — admins get a separate high-capacity bucket so the
  // dashboard (which fires 5 parallel requests on load) never hits 429.
  const clientIP = getRealIP(req.headers);
  const adminHeader = (req.headers['authorization'] || req.headers['x-admin-token']) as string | undefined;
  const adminToken = adminHeader?.replace(/^Bearer\s+/i, '').trim();
  const isAdminReq = adminToken ? verifyAdminToken(adminToken) !== null : false;
  const rateLimitKey = isAdminReq ? `admin:${adminToken!.slice(-16)}` : clientIP;
  const maxReq = isAdminReq ? 1000 : 100;
  const rateLimit = checkRateLimit(rateLimitKey, maxReq, 60000);

  res.setHeader('X-RateLimit-Limit', maxReq.toString());
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

  if (!rateLimit.allowed) {
    console.log(`âš ï¸ Rate limit exceeded for IP: ${clientIP}`);
    return res.status(429).json({
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
    });
  }
  
  // Sanitize request body for POST/PUT/PATCH requests
  if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
    req.body = sanitizeObject(req.body);
  }
  
  try {
    // Simple router based on URL path
    const path = req.url || '/';
    
    // Remove /api prefix if present
    const apiPath = path.replace(/^\/api/, '');
    
    console.log(`Handling request: ${req.method} ${apiPath}`);
    
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
          error: (err as Error).message,
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
        const { kvSet } = await import('../server/kvStorage.js');
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
        await kvSet('securitySettings', payload);
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('security-settings PUT error:', err);
        return res.status(500).json({ message: 'Failed to save' });
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

    // GET /api/admin-login-logs â€” recent admin sign-in events (admin only).
    if ((apiPath === '/admin-login-logs' || apiPath.startsWith('/admin-login-logs?')) && req.method === 'GET') {
      if (!requireAdminAuth(req, res)) return;
      try {
        if ((storage as any).getAdminLoginLogs) {
          const limit = parseInt((req.query.limit as string) || '100', 10);
          const logs = await (storage as any).getAdminLoginLogs(Math.min(limit, 500));
          return res.status(200).json(logs);
        }
        return res.status(200).json([]);
      } catch {
        return res.status(200).json([]);
      }
    }

    // GET /api/analytics/rooms â€” top viewed rooms.
    if ((apiPath === '/analytics/rooms' || apiPath.startsWith('/analytics/rooms?')) && req.method === 'GET') {
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

    // GET /api/analytics/searches â€” recent / top searches.
    if ((apiPath === '/analytics/searches' || apiPath.startsWith('/analytics/searches?')) && req.method === 'GET') {
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
    if (apiPath === '/t/egg' && req.method === 'POST') {
      try {
        const { incrementEggCounter, appendEggRecent } = await import('../server/kvStorage.js');
        const { db: pgDb } = await import('../server/db.js');
        const { appLogs } = await import('../shared/schema.js');
        const eggId = (req.body?.eggId || '').toString().slice(0, 64);
        if (/^[a-z0-9-]{1,64}$/.test(eggId)) {
          const who = (req.body?.userId || 'anonymous').toString().slice(0, 60);
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
        res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
        return res.status(200).json(buildings);
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
        // No edge-cache — the builder relies on fresh reads after a
        // POST/PATCH. The old s-maxage=30 was why "rooms don't load
        // immediately after building": Vercel served a 30-second-stale
        // list even though the DB already had the new row.
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(rooms);
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
      console.log('ðŸ“ POST /api/logs - Client log received');
      try {
        const logData = req.body;
        console.log('Client log:', logData);
        // In production, you would save this to a logging service
        return res.status(200).json({ message: "Log received" });
      } catch (error: any) {
        console.error('Error processing log:', error);
        return res.status(500).json({ message: "Failed to process log" });
      }
    }
    
    // Tickets endpoints
    if (apiPath.startsWith('/tickets')) {
      if (req.method === 'GET') {
        const tickets = await storage.getTickets();
        return res.status(200).json(tickets);
      }
      
      if (req.method === 'POST') {
        const ticketData = req.body;
        
        // Generate ticket ID if not provided
        const ticketId = ticketData.ticketId || `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        console.log('\nðŸŽ« ========== CREATING TICKET ==========');
        console.log('Ticket ID:', ticketId);
        console.log('Type:', ticketData.type);
        console.log('Title:', ticketData.title);
        console.log('Email:', ticketData.email);
        console.log('Name:', ticketData.name);
        console.log('========================================\n');
        
        const ticket = await storage.createTicket({
          ...ticketData,
          ticketId,
          name: ticketData.name || 'Anonymous',
          email: ticketData.email || '',
          status: ticketData.status || 'pending',
          priority: ticketData.priority || 'normal',
        });
        
        console.log('âœ… Ticket created in database');
        
        // SEND EMAILS AND DISCORD NOTIFICATIONS
        if (ticketData.email && ticketData.email.trim()) {
          console.log('ðŸ“§ EMAIL PROVIDED - SENDING NOW');
          console.log('ðŸ“§ Email credentials check:');
          console.log('   EMAIL_USER:', process.env.EMAIL_USER);
          console.log('   EMAIL_PASSWORD set:', !!process.env.EMAIL_PASSWORD);
          console.log('   EMAIL_HOST:', process.env.EMAIL_HOST);
          console.log('   EMAIL_PORT:', process.env.EMAIL_PORT);
          
          try {
            const { sendTicketEmail } = await import('../server/emailService.js');
            const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
            
            // Send to owner with detailed info
            const ownerEmailBody = `NEW SUPPORT TICKET RECEIVED

Ticket Details:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Type: ${ticketData.type.toUpperCase()}
Title: ${ticketData.title}
Status: PENDING

Description:
${ticketData.description}

Contact Information:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Name: ${ticketData.name || 'Anonymous'}
Email: ${ticketData.email}

Action Required:
Please review and respond to this ticket in the admin panel.
Login at: https://ksykmaps.fi/admin`;
            
            console.log('ðŸ“¤ Sending to owner:', ownerEmail);
            const ownerResult = await sendTicketEmail(ownerEmail, `[KSYK Maps] New ${ticketData.type.toUpperCase()} Ticket: ${ticketId}`, ownerEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('âœ… Owner email result:', ownerResult);
            
            // Send to user with friendly confirmation
            const userEmailBody = `Thank you for contacting KSYK Maps Support!

We have received your ${ticketData.type} ticket and our team will review it shortly.

Your Issue:
${ticketData.title}

What happens next?
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â€¢ Our support team will review your ticket
â€¢ You'll receive email updates when the status changes
â€¢ We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.

Need immediate help? Visit our website at https://ksykmaps.fi`;
            
            console.log('ðŸ“¤ Sending to user:', ticketData.email);
            const userResult = await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('âœ… User email result:', userResult);
          } catch (emailError: any) {
            console.error('âŒ EMAIL ERROR:', emailError);
            console.error('âŒ Error stack:', emailError.stack);
            console.error('âŒ Error message:', emailError.message);
          }
        } else {
          console.log('âš ï¸ NO EMAIL - skipping');
        }
        
        // Send Discord notification
        if (process.env.VITE_DISCORD_TICKETS_WEBHOOK) {
          try {
            console.log('ðŸ“¢ Sending Discord notification...');
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
            
            await fetch(process.env.VITE_DISCORD_TICKETS_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discordEmbed)
            });
            console.log('âœ… Discord notification sent');
          } catch (discordError: any) {
            console.error('âŒ Discord notification error:', discordError.message);
          }
        }
        
        console.log('\nâœ… RETURNING RESPONSE');
        return res.status(201).json({ ticketId, ...ticket });
      }
      
      // Handle /tickets/:id routes
      const idMatch = apiPath.match(/^\/tickets\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const ticket = await storage.getTicket(id);
          if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
          }
          return res.status(200).json(ticket);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const ticket = await storage.updateTicket(id, req.body);
          return res.status(200).json(ticket);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteTicket(id);
          return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
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
        
        console.log('\nðŸ§ª ========== TEST EMAIL ENDPOINT ==========');
        console.log('Environment variables check:');
        console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
        console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
        console.log('  EMAIL_USER:', process.env.EMAIL_USER);
        console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
        
        const testEmail = req.body.email || process.env.EMAIL_USER || 'test@example.com';
        const testName = req.body.name || 'Test User';
        
        console.log(`\nSending test email to: ${testEmail}`);
        
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
          
          console.log('\nTest email result:', result);
          console.log('==========================================\n');
          
          return res.status(200).json({
            success: result.success,
            mode: result.mode,
            message: result.success ? 'Email sent successfully!' : 'Email failed to send',
            details: result,
            envVars: {
              EMAIL_HOST: process.env.EMAIL_HOST,
              EMAIL_PORT: process.env.EMAIL_PORT,
              EMAIL_USER: process.env.EMAIL_USER,
              EMAIL_PASSWORD_SET: !!process.env.EMAIL_PASSWORD
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
      
      console.log('\nðŸ—‘ï¸ ========== COMPLETE DATA CLEANUP ==========');
      console.log('âš ï¸ DELETING ALL BUILDINGS, ROOMS, HALLWAYS, STAIRS...');
      
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
        console.log(`ðŸ¢ Found ${buildings.length} buildings to delete`);
        for (const building of buildings) {
          await storage.deleteBuilding(building.id);
          deletedCount.buildings++;
        }
        
        // Delete all rooms
        const rooms = await storage.getRooms();
        console.log(`ðŸšª Found ${rooms.length} rooms to delete`);
        for (const room of rooms) {
          await storage.deleteRoom(room.id);
          deletedCount.rooms++;
        }
        
        // Delete all hallways
        try {
          const hallways = await storage.getHallways();
          console.log(`ðŸ›¤ï¸ Found ${hallways.length} hallways to delete`);
          for (const hallway of hallways) {
            await storage.deleteHallway(hallway.id);
            deletedCount.hallways++;
          }
        } catch (error) {
          console.log('No hallways to delete or method not available');
        }
        
        // Delete all floors
        try {
          const floors = await storage.getFloors();
          console.log(`ðŸ—ï¸ Found ${floors.length} floors to delete`);
          for (const floor of floors) {
            if (storage.deleteFloor) {
              await storage.deleteFloor(floor.id);
              deletedCount.floors++;
            }
          }
        } catch (error) {
          console.log('No floors to delete or method not available');
        }
        
        // Delete all announcements
        const announcements = await storage.getAnnouncements(1000);
        console.log(`ðŸ“¢ Found ${announcements.length} announcements to delete`);
        for (const announcement of announcements) {
          await storage.deleteAnnouncement(announcement.id);
          deletedCount.announcements++;
        }
        
        // Delete all staff
        try {
          const staff = await storage.getStaff();
          console.log(`ðŸ‘¥ Found ${staff.length} staff members to delete`);
          for (const staffMember of staff) {
            await storage.deleteStaff(staffMember.id);
            deletedCount.staff++;
          }
        } catch (error) {
          console.log('No staff to delete or method not available');
        }
        
        console.log('\nâœ… CLEANUP COMPLETE!');
        console.log('ðŸ“Š Deletion Summary:');
        console.log(`   Buildings: ${deletedCount.buildings}`);
        console.log(`   Rooms: ${deletedCount.rooms}`);
        console.log(`   Hallways: ${deletedCount.hallways}`);
        console.log(`   Floors: ${deletedCount.floors}`);
        console.log(`   Announcements: ${deletedCount.announcements}`);
        console.log(`   Staff: ${deletedCount.staff}`);
        console.log('==========================================\n');
        
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

      console.log('\nðŸ” ========== API LOGIN ATTEMPT ==========');
      console.log('Email:', email, '(lower:', emailLower + ')');
      console.log('Password length:', password?.length);

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
          console.log('ðŸ”’ Auto-upgraded legacy plaintext password â†’ bcrypt for', userId);
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
        console.log('âœ… OWNER break-glass login via OWNER_PASSWORD env var');
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
            console.log('ðŸ†• Created owner user record from break-glass login');
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
        console.log('âŒ User not found in database (tried both cases + scan)');
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
      console.log('âœ… User found: id=' + user.id + ' role=' + user.role);

      if (!user.password) {
        console.log('âŒ User has no password set');
        return res.status(401).json({
          success: false,
          message: 'Password not set. Please check your email for password setup link.',
        });
      }

      const ok = await verifyAndUpgrade(password, user.password, user.id);
      if (!ok) {
        console.log(`âŒ Password mismatch (${isOwner ? 'owner' : 'admin'}) â€” stored format: ${isAlreadyHashed(user.password) ? 'bcrypt' : 'plaintext'}`);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      console.log(`âœ… ${isOwner ? 'OWNER' : 'ADMIN'} login successful for ${email}`);
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
    
    // Password change endpoint â€” requires admin token (admin setting another user's password)
    if (apiPath === '/auth/change-password' && req.method === 'POST') {
      if (!requireAdminAuth(req, res)) return;
      const { newPassword } = req.body;
      
      console.log('\nðŸ” ========== PASSWORD CHANGE ==========');
      console.log('New password length:', newPassword?.length);
      
      if (!newPassword || newPassword.length < 6) {
        console.log('âŒ Password too short');
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // For now, we'll use a simple approach - get user from request body
      // In production, this should use session authentication
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        console.log('âŒ No user identifier provided');
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
          console.log('âŒ User not found');
          return res.status(404).json({ message: "User not found" });
        }
        
        console.log('ðŸ“ Updating password for:', user.email);
        
        // Update user password
        await storage.upsertUser({
          id: user.id,
          password: newPassword,
          isTemporaryPassword: false
        });
        
        console.log('âœ… Password changed successfully');
        console.log('=====================================\n');
        
        return res.status(200).json({ 
          success: true, 
          message: "Password changed successfully" 
        });
      } catch (error: any) {
        console.error('âŒ Password change error:', error);
        return res.status(500).json({ message: "Failed to change password" });
      }
    }

    // Password reset request endpoint
    if (apiPath === '/auth/forgot-password' && req.method === 'POST') {
      const { email, resetPath } = req.body;
      
      console.log('\nðŸ“§ ========== PASSWORD RESET REQUEST ==========');
      console.log('Email:', email);
      
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
          console.log('Password reset requested for non-existent email:', email);
          return res.status(200).json({ success: true, message: "If the email exists, a reset link has been sent" });
        }
        
        // Generate reset token (valid for 1 hour)
        const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
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
            subject: 'Password Reset Request - KSYK Maps Wilma',
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
          console.log('âœ… Password reset email sent to:', email);
        } catch (emailError) {
          console.error('âŒ Failed to send password reset email:', emailError);
          return res.status(500).json({ message: "Failed to send reset email" });
        }
        
        console.log('==============================================\n');
        return res.status(200).json({ success: true, message: "If the email exists, a reset link has been sent" });
      } catch (error: any) {
        console.error('âŒ Password reset error:', error);
        return res.status(500).json({ message: "Failed to process password reset request" });
      }
    }

    // Password reset verification and update endpoint
    if (apiPath === '/auth/reset-password' && req.method === 'POST') {
      const { token, newPassword } = req.body;
      
      console.log('\nðŸ” ========== PASSWORD RESET ==========');
      console.log('Token provided:', !!token);
      console.log('New password length:', newPassword?.length);
      
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
          console.log('âŒ Invalid token');
          return res.status(400).json({ message: "Invalid or expired reset token" });
        }
        
        // Check if token is expired
        if (user.passwordResetExpiry && new Date(user.passwordResetExpiry) < new Date()) {
          console.log('âŒ Token expired');
          return res.status(400).json({ message: "Reset token has expired" });
        }
        
        // Update password and clear reset token
        await storage.upsertUser({
          id: user.id,
          password: newPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          isTemporaryPassword: false
        });
        
        console.log('âœ… Password reset successful for user:', user.email);
        console.log('======================================\n');
        return res.status(200).json({ success: true, message: "Password has been reset successfully" });
      } catch (error: any) {
        console.error('âŒ Password reset error:', error);
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
        if (passwordOption === 'email') {
          console.log(`\nðŸ“§ ========== EMAIL INVITATION ==========`);
          console.log(`Target: ${email}`);
          console.log(`Name: ${firstName} ${lastName}`);
          
          try {
            const emailResult = await sendPasswordSetupEmail(email, firstName, finalPassword);
            
            console.log(`\nðŸ“§ EMAIL RESULT:`);
            console.log(`   Success: ${emailResult.success}`);
            console.log(`   Mode: ${emailResult.mode}`);
            
            if (emailResult.success) {
              console.log(`âœ… EMAIL SENT to ${email}`);
            } else {
              console.log(`âš ï¸ EMAIL NOT SENT (mode: ${emailResult.mode})`);
            }
          } catch (error: any) {
            console.error('âŒ EMAIL ERROR:', error.message);
          }
          
          console.log(`==========================================\n`);
        }

        return res.status(201).json({ ...newUser, password: finalPassword });
      }
      
      // Handle /users/:id routes
      const idMatch = apiPath.match(/^\/users\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const user = await storage.getUser(id);
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          return res.status(200).json(user);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteUser(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Email diagnostic endpoint â€” admin only (leaks config info)
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
            console.log(`ðŸ“Š Tracked ${events.length} analytics events from ${realIP}`);
          } else {
            console.log(`ðŸ“Š Analytics tracking skipped (storage method not implemented)`);
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
        '/telemetry/pageview'
      ]
    });
    
  } catch (error: any) {
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
    
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
}
