import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, getRealIP, sanitizeObject } from '../server/security.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  
  // Rate limiting
  const clientIP = getRealIP(req.headers);
  const rateLimit = checkRateLimit(clientIP, 100, 60000); // 100 requests per minute
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', '100');
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  res.setHeader('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());
  
  // Check if rate limit exceeded
  if (!rateLimit.allowed) {
    console.log(`⚠️ Rate limit exceeded for IP: ${clientIP}`);
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
    
    // Health check
    if (apiPath === '/' || apiPath === '') {
      return res.status(200).json({
        message: "KSYK Maps API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        env: {
          USE_FIREBASE: process.env.USE_FIREBASE,
          HAS_FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
          FIREBASE_SERVICE_ACCOUNT_LENGTH: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    // Debug endpoint to check storage
    if (apiPath === '/debug') {
      const { storage } = await import('../server/storage.js');
      const buildings = await storage.getBuildings();
      return res.status(200).json({
        storageType: storage.constructor.name,
        buildingCount: buildings.length,
        buildings: buildings,
        env: {
          USE_FIREBASE: process.env.USE_FIREBASE,
          HAS_FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT
        }
      });
    }
    
    // Import and use storage
    const { storage } = await import('../server/storage.js');

    // ── KSYK security & telemetry endpoints (added 2026-06-25) ──────────
    // These were missing on the Vercel build and were returning 404 in
    // production, breaking the access-control gate and the IP probe.

    // GET /api/client-info — caller's IP + server time.
    if (apiPath === '/client-info' && req.method === 'GET') {
      const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      const ip = xff || (req.headers['cf-connecting-ip'] as string) || 'unknown';
      return res.status(200).json({ ip, time: new Date().toISOString() });
    }

    // GET /api/security-settings — public read for the gate engine.
    // Hits Firestore directly so the response is authoritative even when
    // the IStorage interface doesn't expose the doc.
    if (apiPath === '/security-settings' && req.method === 'GET') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const doc = await db.collection('securitySettings').doc('default').get();
        return res.status(200).json(doc.exists ? doc.data() : null);
      } catch (err) {
        console.error('security-settings GET error:', err);
        return res.status(200).json(null);
      }
    }

    // PUT /api/security-settings — admin write. Whitelist + validate so
    // a malformed body can't poison the doc.
    if (apiPath === '/security-settings' && req.method === 'PUT') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
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
          updatedAt: new Date(),
        };
        await db.collection('securitySettings').doc('default').set(payload, { merge: false });
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('security-settings PUT error:', err);
        return res.status(500).json({ message: 'Failed to save' });
      }
    }

    // POST /api/security-settings/request-access — queues a guest request
    // into the same Firestore doc the admin panel inbox reads.
    if (apiPath === '/security-settings/request-access' && req.method === 'POST') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const { email, reason } = req.body || {};
        if (!email || typeof email !== 'string') {
          return res.status(400).json({ message: 'Email is required' });
        }
        const ref = db.collection('securitySettings').doc('default');
        const snap = await ref.get();
        const current = (snap.data() as any) || {};
        const requests = Array.isArray(current.accessRequests) ? current.accessRequests : [];
        const request = {
          id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          email: email.toLowerCase().trim(),
          reason: (reason || '').toString().slice(0, 500),
          createdAt: new Date().toISOString(),
          status: 'pending' as const,
        };
        await ref.set({ ...current, accessRequests: [request, ...requests].slice(0, 200) }, { merge: true });
        return res.status(200).json({ success: true, id: request.id });
      } catch (err) {
        console.error('access-request POST error:', err);
        return res.status(500).json({ message: 'Failed to submit request' });
      }
    }

    // GET /api/admin/wilma-config — Wilma-config endpoint kept as a no-op
    // stub now that the Wilma admin tab has been removed; returning a
    // benign object stops the client query from spamming 404s.
    if (apiPath === '/admin/wilma-config' && req.method === 'GET') {
      return res.status(200).json({
        configured: false,
        serverUrl: '',
        connectionStatus: 'not_configured',
        lastSync: null,
        lastTestAt: null,
      });
    }

    // GET /api/map-defaults — admin-set map home/zoom.
    if (apiPath === '/map-defaults' && req.method === 'GET') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const doc = await db.collection('mapDefaults').doc('default').get();
        return res.status(200).json(doc.exists ? doc.data() : null);
      } catch {
        return res.status(200).json(null);
      }
    }

    // PUT /api/map-defaults — admin write.
    if (apiPath === '/map-defaults' && req.method === 'PUT') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
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
        data.updatedAt = new Date();
        await db.collection('mapDefaults').doc('default').set(data, { merge: true });
        return res.status(200).json({ ...data, success: true });
      } catch (err) {
        console.error('map-defaults PUT error:', err);
        return res.status(500).json({ message: 'Failed to save' });
      }
    }

    // GET /api/admin-login-logs — recent admin sign-in events.
    if ((apiPath === '/admin-login-logs' || apiPath.startsWith('/admin-login-logs?')) && req.method === 'GET') {
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

    // GET /api/analytics/rooms — top viewed rooms.
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

    // GET /api/analytics/searches — recent / top searches.
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

    // GET /api/analytics/visitors — visitor breakdown by device / country.
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

    // ── Beacon survey storage ─────────────────────────────────────────
    // Path: /api/beacons/:roomId/positions[/:positionId]
    {
      const beaconListMatch = apiPath.match(/^\/beacons\/([^\/]+)\/positions$/);
      const beaconOneMatch = apiPath.match(/^\/beacons\/([^\/]+)\/positions\/([^\/]+)$/);

      if (beaconListMatch && req.method === 'GET') {
        const roomId = beaconListMatch[1];
        try {
          const { db } = await import('../server/firebaseStorage.js');
          const snap = await db.collection('beaconSurveys').doc(roomId).collection('positions')
            .orderBy('capturedAt', 'desc').get();
          const positions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          return res.status(200).json(positions);
        } catch {
          return res.status(200).json([]);
        }
      }

      if (beaconListMatch && req.method === 'POST') {
        const roomId = beaconListMatch[1];
        try {
          const { db } = await import('../server/firebaseStorage.js');
          const { positionLabel, capturedAt, readings } = req.body || {};
          if (!positionLabel || !Array.isArray(readings)) {
            return res.status(400).json({ message: 'positionLabel and readings[] required' });
          }
          const safeReadings = readings.slice(0, 50).map((r: any) => ({
            bssid: String(r.bssid || '').toLowerCase().slice(0, 30),
            rssi: Number(r.rssi) || 0,
            ssid: r.ssid ? String(r.ssid).slice(0, 64) : undefined,
          })).filter((r: any) => r.bssid);
          const doc = await db.collection('beaconSurveys').doc(roomId)
            .collection('positions').add({
              positionLabel: String(positionLabel).slice(0, 60),
              capturedAt: capturedAt || new Date().toISOString(),
              readings: safeReadings,
              createdAt: new Date(),
            });
          return res.status(201).json({ id: doc.id, success: true });
        } catch (err) {
          console.error('beacons POST error:', err);
          return res.status(500).json({ message: 'Failed to save position' });
        }
      }

      if (beaconOneMatch && req.method === 'DELETE') {
        const [, roomId, positionId] = beaconOneMatch;
        try {
          const { db } = await import('../server/firebaseStorage.js');
          await db.collection('beaconSurveys').doc(roomId).collection('positions').doc(positionId).delete();
          return res.status(204).send('');
        } catch (err) {
          console.error('beacons DELETE error:', err);
          return res.status(500).json({ message: 'Failed to delete' });
        }
      }
    }

    // GET /api/analytics/external — aggregated CF + Vercel + Firestore stats.
    if ((apiPath === '/analytics/external' || apiPath.startsWith('/analytics/external?')) && req.method === 'GET') {
      const range = (req.query.range as string) || '24h';
      const now = new Date().toISOString();

      // Build a single response that each provider fills in independently.
      const out: any = {};

      // ── Cloudflare Web Analytics (GraphQL) ───────────────────────────
      // Requires CLOUDFLARE_API_TOKEN with the "Account Analytics — Read"
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
          const query = `query GetVisits($accountTag: string!, $siteTag: string!, $since: Time!) {
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

      // ── Firestore telemetry summary ──────────────────────────────────
      // This source is always on — we aggregate the events lib/telemetry
      // posts to /api/analytics/track.
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const sinceDate = new Date(Date.now() - (range === '7d' ? 7 : range === '30d' ? 30 : 1) * 86_400_000);
        const snap = await db.collection('analyticsEvents').where('createdAt', '>=', sinceDate).limit(5000).get();
        const events = snap.docs.map((d) => d.data() as any);
        const sessions = new Set(events.map((e) => e.sessionId).filter(Boolean));
        const pageviews = events.filter((e) => e.type === 'page_view').length;
        const pageCounts: Record<string, number> = {};
        for (const e of events.filter((e) => e.type === 'page_view')) {
          const path = e.url || e.payload?.path || '/';
          pageCounts[path] = (pageCounts[path] || 0) + 1;
        }
        const topPages = Object.entries(pageCounts)
          .map(([path, views]) => ({ path, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 8);
        out.firestore = {
          configured: true,
          source: 'KSYK Firestore telemetry',
          visitors24h: range === '24h' ? sessions.size : undefined,
          pageviews24h: range === '24h' ? pageviews : undefined,
          visitors7d: range === '7d' ? sessions.size : undefined,
          pageviews7d: range === '7d' ? pageviews : undefined,
          topPages,
          fetchedAt: now,
        };
      } catch (err) {
        out.firestore = { configured: true, source: 'firestore', error: (err as Error).message, fetchedAt: now };
      }

      return res.status(200).json(out);
    }

    // GET /api/easter-eggs/stats — count of each discovered egg, persisted
    // in Firestore (one counter doc, atomic increments). The shape matches
    // what EasterEggStats.tsx expects: { secretEasterEgg, konamiCode, devMode }.
    if (apiPath === '/easter-eggs/stats' && req.method === 'GET') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const doc = await db.collection('easterEggs').doc('counters').get();
        const data = doc.exists ? doc.data() : {};
        return res.status(200).json({
          secretEasterEgg: data?.secretEasterEgg ?? 0,
          konamiCode: data?.konamiCode ?? 0,
          devMode: data?.devMode ?? 0,
          total: (data?.secretEasterEgg ?? 0) + (data?.konamiCode ?? 0) + (data?.devMode ?? 0),
        });
      } catch {
        return res.status(200).json({ secretEasterEgg: 0, konamiCode: 0, devMode: 0, total: 0 });
      }
    }

    // POST /api/easter-eggs/found — record an egg discovery. Body: { egg: "secretEasterEgg" | ... }
    if (apiPath === '/easter-eggs/found' && req.method === 'POST') {
      try {
        const { db } = await import('../server/firebaseStorage.js');
        const { FieldValue } = await import('firebase-admin/firestore');
        const egg = (req.body?.egg || '').toString();
        const allowed = ['secretEasterEgg', 'konamiCode', 'devMode'];
        if (!allowed.includes(egg)) return res.status(400).json({ message: 'Invalid egg id' });
        await db.collection('easterEggs').doc('counters').set({
          [egg]: FieldValue.increment(1),
          [`${egg}LastAt`]: new Date(),
        }, { merge: true });
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error('easter-eggs POST error:', err);
        return res.status(500).json({ message: 'Failed' });
      }
    }

    // Buildings endpoints
    if (apiPath.startsWith('/buildings')) {
      if (req.method === 'GET' && apiPath === '/buildings') {
        console.log('🏢 Fetching buildings from storage...');
        const buildings = await storage.getBuildings();
        console.log(`✅ Found ${buildings.length} buildings`);
        console.log('Buildings data:', JSON.stringify(buildings, null, 2));
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
      if (req.method === 'GET' && apiPath === '/rooms') {
        const buildingId = req.query.buildingId as string | undefined;
        const rooms = await storage.getRooms(buildingId);
        return res.status(200).json(rooms);
      }
      
      if (req.method === 'POST' && apiPath === '/rooms') {
        const room = await storage.createRoom(req.body);
        return res.status(201).json(room);
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
          const room = await storage.updateRoom(id, req.body);
          return res.status(200).json(room);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteRoom(id);
          return res.status(204).send('');
        }
      }
    }

    // Hallways endpoints
    if (apiPath.startsWith('/hallways')) {
      if (req.method === 'GET' && apiPath === '/hallways') {
        const buildingId = req.query.buildingId as string | undefined;
        const hallways = await storage.getHallways(buildingId);
        return res.status(200).json(hallways);
      }
      
      if (req.method === 'POST' && apiPath === '/hallways') {
        const hallway = await storage.createHallway(req.body);
        return res.status(201).json(hallway);
      }
      
      // Handle /hallways/:id routes
      const idMatch = apiPath.match(/^\/hallways\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'DELETE') {
          await storage.deleteHallway(id);
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
      if (req.method === 'GET') {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const announcements = await storage.getAnnouncements(limit);
        return res.status(200).json(announcements);
      }
      
      if (req.method === 'POST') {
        const announcement = await storage.createAnnouncement(req.body);
        return res.status(201).json(announcement);
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
          const announcement = await storage.updateAnnouncement(id, req.body);
          return res.status(200).json(announcement);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteAnnouncement(id);
          return res.status(204).send('');
        }
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
      console.log('📝 POST /api/logs - Client log received');
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
        
        console.log('\n🎫 ========== CREATING TICKET ==========');
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
        
        console.log('✅ Ticket created in database');
        
        // SEND EMAILS AND DISCORD NOTIFICATIONS
        if (ticketData.email && ticketData.email.trim()) {
          console.log('📧 EMAIL PROVIDED - SENDING NOW');
          console.log('📧 Email credentials check:');
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
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: ${ticketData.type.toUpperCase()}
Title: ${ticketData.title}
Status: PENDING

Description:
${ticketData.description}

Contact Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${ticketData.name || 'Anonymous'}
Email: ${ticketData.email}

Action Required:
Please review and respond to this ticket in the admin panel.
Login at: https://ksykmaps.fi/admin-login`;
            
            console.log('📤 Sending to owner:', ownerEmail);
            const ownerResult = await sendTicketEmail(ownerEmail, `[KSYK Maps] New ${ticketData.type.toUpperCase()} Ticket: ${ticketId}`, ownerEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ Owner email result:', ownerResult);
            
            // Send to user with friendly confirmation
            const userEmailBody = `Thank you for contacting KSYK Maps Support!

We have received your ${ticketData.type} ticket and our team will review it shortly.

Your Issue:
${ticketData.title}

What happens next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Our support team will review your ticket
• You'll receive email updates when the status changes
• We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.

Need immediate help? Visit our website at https://ksykmaps.fi`;
            
            console.log('📤 Sending to user:', ticketData.email);
            const userResult = await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ User email result:', userResult);
          } catch (emailError: any) {
            console.error('❌ EMAIL ERROR:', emailError);
            console.error('❌ Error stack:', emailError.stack);
            console.error('❌ Error message:', emailError.message);
          }
        } else {
          console.log('⚠️ NO EMAIL - skipping');
        }
        
        // Send Discord notification
        if (process.env.VITE_DISCORD_TICKETS_WEBHOOK) {
          try {
            console.log('📢 Sending Discord notification...');
            const discordEmbed = {
              embeds: [{
                title: `🎫 New Support Ticket: ${ticketId}`,
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
            console.log('✅ Discord notification sent');
          } catch (discordError: any) {
            console.error('❌ Discord notification error:', discordError.message);
          }
        }
        
        console.log('\n✅ RETURNING RESPONSE');
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
    
    // Settings endpoints
    if (apiPath === '/settings') {
      if (req.method === 'GET') {
        const settings = await storage.getAppSettings();
        return res.status(200).json(settings);
      }
      
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const settings = await storage.updateAppSettings(req.body);
        return res.status(200).json(settings);
      }
    }
    
    // Test email endpoint
    if (apiPath === '/test-email') {
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
        
        console.log('\n🧪 ========== TEST EMAIL ENDPOINT ==========');
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
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_EVERYTHING') {
        return res.status(400).json({ message: 'Confirmation required: DELETE_EVERYTHING' });
      }
      
      console.log('\n🗑️ ========== COMPLETE DATA CLEANUP ==========');
      console.log('⚠️ DELETING ALL BUILDINGS, ROOMS, HALLWAYS, STAIRS...');
      
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
        console.log(`🏢 Found ${buildings.length} buildings to delete`);
        for (const building of buildings) {
          await storage.deleteBuilding(building.id);
          deletedCount.buildings++;
        }
        
        // Delete all rooms
        const rooms = await storage.getRooms();
        console.log(`🚪 Found ${rooms.length} rooms to delete`);
        for (const room of rooms) {
          await storage.deleteRoom(room.id);
          deletedCount.rooms++;
        }
        
        // Delete all hallways
        try {
          const hallways = await storage.getHallways();
          console.log(`🛤️ Found ${hallways.length} hallways to delete`);
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
          console.log(`🏗️ Found ${floors.length} floors to delete`);
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
        console.log(`📢 Found ${announcements.length} announcements to delete`);
        for (const announcement of announcements) {
          await storage.deleteAnnouncement(announcement.id);
          deletedCount.announcements++;
        }
        
        // Delete all staff
        try {
          const staff = await storage.getStaff();
          console.log(`👥 Found ${staff.length} staff members to delete`);
          for (const staffMember of staff) {
            await storage.deleteStaff(staffMember.id);
            deletedCount.staff++;
          }
        } catch (error) {
          console.log('No staff to delete or method not available');
        }
        
        console.log('\n✅ CLEANUP COMPLETE!');
        console.log('📊 Deletion Summary:');
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
        console.error('❌ CLEANUP ERROR:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete all data',
          error: error.message
        });
      }
    }

    // Admin cleanup endpoint - DELETE ALL DATA
    if (apiPath === '/admin/cleanup' && req.method === 'POST') {
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
    if (apiPath === '/auth/admin-login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      console.log('\n🔐 ========== API LOGIN ATTEMPT ==========');
      console.log('Email:', email);
      console.log('Password length:', password?.length);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ message: "Email and password required", success: false });
      }
      
      // Check owner credentials from database only
      const OWNER_EMAIL = 'JuusoJuusto112@gmail.com';
      
      console.log('🔑 Checking owner credentials...');
      console.log('   Email match:', email === OWNER_EMAIL);
      
      if (email === OWNER_EMAIL) {
        console.log('✅ OWNER LOGIN DETECTED');
        // Check if owner user exists in database, create if not
        let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
        
        if (!ownerUser) {
          console.log('❌ Owner user not found in database');
          console.log('=====================================\n');
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Check password against database
        if (!ownerUser.password || ownerUser.password !== password) {
          console.log('❌ Invalid owner password');
          console.log('=====================================\n');
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        console.log('✅ Owner logged in successfully');
        console.log('=====================================\n');
        return res.status(200).json({
          success: true,
          user: ownerUser,
          requirePasswordChange: false
        });
      }
      
      // Check Firestore database for admin users
      console.log('📊 Checking Firestore database...');
      const user = await storage.getUserByEmail(email);
      
      console.log('🔍 Database lookup result:');
      console.log('   User found:', !!user);
      
      if (user) {
        console.log('   User ID:', user.id);
        console.log('   User email:', user.email);
        console.log('   User role:', user.role);
        console.log('   Has password field:', 'password' in user);
        console.log('   Password is set:', !!user.password);
        console.log('   Password value:', user.password);
        console.log('   Provided password:', password);
        console.log('   Password match (===):', user.password === password);
        console.log('   Is temporary:', user.isTemporaryPassword);
      }
      
      if (!user) {
        console.log('❌ User not found in database');
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      if (!user.password) {
        console.log('❌ User has no password set');
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Password not set. Please check your email for password setup link.'
        });
      }
      
      if (user.password !== password) {
        console.log('❌ Password mismatch!');
        console.log('   Expected:', user.password);
        console.log('   Got:', password);
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Valid admin user from database
      console.log('✅ PASSWORD MATCH! User logged in successfully!');
      console.log('   Requires password change:', user.isTemporaryPassword || false);
      console.log('=====================================\n');
      return res.status(200).json({
        success: true,
        user: user,
        requirePasswordChange: user.isTemporaryPassword || false
      });
    }
    
    // Password change endpoint
    if (apiPath === '/auth/change-password' && req.method === 'POST') {
      const { newPassword } = req.body;
      
      console.log('\n🔐 ========== PASSWORD CHANGE ==========');
      console.log('New password length:', newPassword?.length);
      
      if (!newPassword || newPassword.length < 6) {
        console.log('❌ Password too short');
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // For now, we'll use a simple approach - get user from request body
      // In production, this should use session authentication
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        console.log('❌ No user identifier provided');
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
          console.log('❌ User not found');
          return res.status(404).json({ message: "User not found" });
        }
        
        console.log('📝 Updating password for:', user.email);
        
        // Update user password
        await storage.upsertUser({
          id: user.id,
          password: newPassword,
          isTemporaryPassword: false
        });
        
        console.log('✅ Password changed successfully');
        console.log('=====================================\n');
        
        return res.status(200).json({ 
          success: true, 
          message: "Password changed successfully" 
        });
      } catch (error: any) {
        console.error('❌ Password change error:', error);
        return res.status(500).json({ message: "Failed to change password" });
      }
    }

    // Password reset request endpoint
    if (apiPath === '/auth/forgot-password' && req.method === 'POST') {
      const { email } = req.body;
      
      console.log('\n📧 ========== PASSWORD RESET REQUEST ==========');
      console.log('Email:', email);
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      try {
        const user = await storage.getUserByEmail(email.toLowerCase().trim());
        
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
        const resetUrl = `${process.env.APP_URL || 'https://ksykmaps.fi'}/wilma/reset-password?token=${resetToken}`;
        
        try {
          const emailService = await import('../server/emailService.js');
          await emailService.sendEmail({
            to: email,
            subject: 'Password Reset Request - KSYK Maps Wilma',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Salasanan palautus</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p style="font-size: 16px; color: #333;">Hei ${user.firstName},</p>
                  <p style="font-size: 16px; color: #333;">Olet pyytänyt salasanan palautusta Wilma-tilillesi.</p>
                  <p style="font-size: 16px; color: #333;">Klikkaa alla olevaa painiketta palauttaaksesi salasanasi:</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                      Palauta salasana
                    </a>
                  </div>
                  <p style="font-size: 14px; color: #666;">Tai kopioi ja liitä tämä linkki selaimeesi:</p>
                  <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <p style="font-size: 14px; color: #666;">⏰ Tämä linkki on voimassa 1 tunnin ajan.</p>
                    <p style="font-size: 14px; color: #666;">⚠️ Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.</p>
                  </div>
                </div>
              </div>
            `
          });
          console.log('✅ Password reset email sent to:', email);
        } catch (emailError) {
          console.error('❌ Failed to send password reset email:', emailError);
          return res.status(500).json({ message: "Failed to send reset email" });
        }
        
        console.log('==============================================\n');
        return res.status(200).json({ success: true, message: "If the email exists, a reset link has been sent" });
      } catch (error: any) {
        console.error('❌ Password reset error:', error);
        return res.status(500).json({ message: "Failed to process password reset request" });
      }
    }

    // Password reset verification and update endpoint
    if (apiPath === '/auth/reset-password' && req.method === 'POST') {
      const { token, newPassword } = req.body;
      
      console.log('\n🔐 ========== PASSWORD RESET ==========');
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
          console.log('❌ Invalid token');
          return res.status(400).json({ message: "Invalid or expired reset token" });
        }
        
        // Check if token is expired
        if (user.passwordResetExpiry && new Date(user.passwordResetExpiry) < new Date()) {
          console.log('❌ Token expired');
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
        
        console.log('✅ Password reset successful for user:', user.email);
        console.log('======================================\n');
        return res.status(200).json({ success: true, message: "Password has been reset successfully" });
      } catch (error: any) {
        console.error('❌ Password reset error:', error);
        return res.status(500).json({ message: "Failed to reset password" });
      }
    }
    
    // Auth user endpoint
    if (apiPath === '/auth/user' && req.method === 'GET') {
      // For now, return unauthorized
      // TODO: Implement proper auth with sessions
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
          console.log(`\n📧 ========== EMAIL INVITATION ==========`);
          console.log(`Target: ${email}`);
          console.log(`Name: ${firstName} ${lastName}`);
          console.log(`Password: ${finalPassword}`);
          
          try {
            const emailResult = await sendPasswordSetupEmail(email, firstName, finalPassword);
            
            console.log(`\n📧 EMAIL RESULT:`);
            console.log(`   Success: ${emailResult.success}`);
            console.log(`   Mode: ${emailResult.mode}`);
            
            if (emailResult.success) {
              console.log(`✅ EMAIL SENT to ${email}`);
            } else {
              console.log(`⚠️ EMAIL NOT SENT - Password: ${finalPassword}`);
            }
          } catch (error: any) {
            console.error('❌ EMAIL ERROR:', error.message);
            console.log(`📝 Password: ${finalPassword}`);
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
    
    // Email diagnostic endpoint
    if (apiPath === '/email-diagnostic' && req.method === 'GET') {
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
        
        // Get real IP address
        const realIP = req.headers['cf-connecting-ip'] || 
                       req.headers['x-real-ip'] || 
                       req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
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
            console.log(`📊 Tracked ${events.length} analytics events from ${realIP}`);
          } else {
            console.log(`📊 Analytics tracking skipped (storage method not implemented)`);
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

    // Live Analytics Endpoint
    if (apiPath === '/analytics/live' && req.method === 'GET') {
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

    // Analytics Events Endpoint
    if (apiPath === '/analytics/events' && req.method === 'GET') {
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

    // Performance Analytics Endpoint
    if (apiPath === '/analytics/performance' && req.method === 'GET') {
      const timeRange = req.query.timeRange as string || '24h';
      
      try {
        const performance = await storage.getPerformanceMetrics(timeRange);
        return res.status(200).json(performance);
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
        return res.status(500).json({ message: 'Failed to fetch performance metrics' });
      }
    }

    // Logs endpoint
    if (apiPath === '/logs' && req.method === 'GET') {
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
    
    // Wilma User routes
    if (apiPath.startsWith('/wilma')) {
      // GET /wilma/users - List all Wilma users (with or without query params)
      if ((apiPath === '/wilma/users' || apiPath.startsWith('/wilma/users?')) && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/users called');
        const role = req.query.role as string | undefined;
        console.log('📝 Role filter:', role || 'none');
        try {
          const wilmaUsers = await storage.getWilmaUsers(role);
          console.log(`✅ Returning ${wilmaUsers.length} Wilma users`);
          return res.status(200).json(wilmaUsers);
        } catch (error: any) {
          console.error('❌ Error fetching Wilma users:', error);
          return res.status(500).json({ message: "Failed to fetch Wilma users" });
        }
      }

      // GET /wilma/users/by-student-id/:studentId - Get user by 6-digit student ID
      const getByStudentIdMatch = apiPath.match(/^\/wilma\/users\/by-student-id\/(\d{6})$/);
      if (getByStudentIdMatch && req.method === 'GET') {
        const studentId = getByStudentIdMatch[1];
        console.log('🔵 GET /api/wilma/users/by-student-id/' + studentId);
        
        try {
          const wilmaUser = await storage.getWilmaUserByStudentId(studentId);
          
          if (!wilmaUser) {
            console.log('❌ Student not found with ID:', studentId);
            return res.status(404).json({ message: "Student not found" });
          }
          
          console.log('✅ Student found:', wilmaUser.id, wilmaUser.firstName, wilmaUser.lastName);
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(200).json(userResponse);
        } catch (error: any) {
          console.error('❌ Error fetching student by ID:', error);
          return res.status(500).json({ message: "Failed to fetch student" });
        }
      }

      // GET /wilma/users/:id - Get single Wilma user by ID
      const getUserMatch = apiPath.match(/^\/wilma\/users\/([^\/\?]+)$/);
      if (getUserMatch && req.method === 'GET') {
        const id = getUserMatch[1];
        console.log('🔵 GET /api/wilma/users/' + id);
        
        try {
          let wilmaUser;
          
          // Check if ID is an 8-digit student ID (numeric only)
          if (/^\d{8}$/.test(id)) {
            console.log('🔍 Detected 8-digit student ID, looking up by studentId field');
            wilmaUser = await storage.getWilmaUserByStudentId(id);
          } else {
            // Otherwise, treat as Firebase ID
            console.log('🔍 Looking up by Firebase ID');
            wilmaUser = await storage.getWilmaUser(id);
          }
          
          if (!wilmaUser) {
            console.log('❌ User not found:', id);
            return res.status(404).json({ message: "User not found" });
          }
          
          console.log('✅ User found:', wilmaUser.id);
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(200).json(userResponse);
        } catch (error: any) {
          console.error('❌ Error fetching Wilma user:', error);
          return res.status(500).json({ message: "Failed to fetch user" });
        }
      }
      
      // POST /wilma/login - Wilma user login
      if (apiPath === '/wilma/login' && req.method === 'POST') {
        console.log('🔐 POST /api/wilma/login called');
        const { username, password } = req.body;
        console.log('📝 Username:', username);
        
        // Check rate limit FIRST
        const { checkRateLimit, recordLoginAttempt } = await import('../server/rateLimiter.js');
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const rateLimit = await checkRateLimit(username, ipAddress as string);
        
        if (!rateLimit.allowed) {
          console.log(`🔒 Rate limit exceeded for ${username}`);
          return res.status(429).json({ 
            message: rateLimit.message || "Too many login attempts",
            lockedUntil: rateLimit.lockedUntil
          });
        }
        
        if (rateLimit.message) {
          console.log(`⚠️ ${rateLimit.message}`);
        }
        
        // Validate input with Zod
        const { wilmaLoginSchema } = await import('../shared/validationSchemas.js');
        const validation = wilmaLoginSchema.safeParse(req.body);
        if (!validation.success) {
          console.log('❌ Validation failed:', validation.error.errors);
          await recordLoginAttempt(username, false, ipAddress as string);
          return res.status(400).json({ 
            message: "Invalid input", 
            errors: validation.error.errors 
          });
        }
        
        if (!username || !password) {
          console.log('❌ Missing credentials');
          await recordLoginAttempt(username, false, ipAddress as string);
          return res.status(400).json({ message: "Username and password required" });
        }

        try {
          console.log('🔍 Looking up user by username (case-insensitive)...');
          // Make username case-insensitive
          const wilmaUser = await storage.getWilmaUserByUsername(username.toLowerCase().trim());
          
          if (!wilmaUser) {
            console.log('❌ User not found:', username);
            await recordLoginAttempt(username, false, ipAddress as string);
            return res.status(401).json({ message: "Invalid username or password" });
          }
          
          console.log('✅ User found:', wilmaUser.id);
          console.log('🔍 Password in DB starts with:', wilmaUser.password?.substring(0, 10));
          console.log('🔍 Password length:', wilmaUser.password?.length);
          console.log('🔍 Input password length:', password?.length);
          
          // Check if password is already hashed (starts with $2b$ or $2a$)
          const isPasswordHashed = wilmaUser.password?.startsWith('$2b$') || wilmaUser.password?.startsWith('$2a$');
          console.log('🔒 Password is hashed:', isPasswordHashed);
          
          let isValid = false;
          
          if (isPasswordHashed) {
            // Verify hashed password with bcrypt
            try {
              const { verifyPassword } = await import('../server/passwordUtils.js');
              isValid = await verifyPassword(password, wilmaUser.password);
              console.log('🔐 Bcrypt verification result:', isValid);
            } catch (bcryptError) {
              console.error('❌ Bcrypt error:', bcryptError);
              // Fall back to plain text comparison
              isValid = wilmaUser.password === password;
              console.log('⚠️ Fallback plain text comparison:', isValid);
            }
          } else {
            // Legacy: Plain text password comparison (for migration period)
            isValid = wilmaUser.password === password;
            console.log('⚠️ Plain text comparison result:', isValid);
            
            // If login successful with plain text, hash the password for next time
            if (isValid) {
              try {
                console.log('🔄 Migrating plain text password to hashed...');
                const { hashPassword } = await import('../server/passwordUtils.js');
                const hashedPassword = await hashPassword(password);
                await storage.updateWilmaUser(wilmaUser.id, { password: hashedPassword });
                console.log('✅ Password migrated to hashed format');
              } catch (hashError) {
                console.error('⚠️ Failed to migrate password (non-critical):', hashError);
                // Continue anyway - login still works
              }
            }
          }
          
          if (!isValid) {
            console.log('❌ Password mismatch - tried both hashed and plain text');
            console.log('❌ Stored password:', wilmaUser.password?.substring(0, 20) + '...');
            console.log('❌ Input password:', password?.substring(0, 20) + '...');
            await recordLoginAttempt(username, false, ipAddress as string);
            return res.status(401).json({ message: "Invalid username or password" });
          }

          if (!wilmaUser.isActive) {
            console.log('❌ Account is disabled');
            await recordLoginAttempt(username, false, ipAddress as string);
            return res.status(403).json({ message: "Account is disabled" });
          }

          console.log('✅ Login successful for:', username);
          // Record successful login
          await recordLoginAttempt(username, true, ipAddress as string);
          
          // Return user without password but include isTemporaryPassword flag
          const { password: _, ...userWithoutPassword } = wilmaUser;
          return res.status(200).json({
            ...userWithoutPassword,
            requiresPasswordChange: wilmaUser.isTemporaryPassword || false
          });
        } catch (error: any) {
          console.error('❌ Login error:', error);
          await recordLoginAttempt(username, false, ipAddress as string);
          return res.status(500).json({ message: "Login failed" });
        }
      }
      
      // POST /wilma/users - Create Wilma user
      if (apiPath === '/wilma/users' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/users called');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        
        try {
          const { sendEmailInvitation, ...userData } = req.body;
          
          // Normalize username to lowercase
          if (userData.username) {
            userData.username = userData.username.toLowerCase().trim();
          }
          
          // Validate input with Zod
          const { wilmaUserCreateSchema } = await import('../shared/validationSchemas.js');
          const validation = wilmaUserCreateSchema.safeParse(userData);
          if (!validation.success) {
            console.log('❌ Validation failed:', JSON.stringify(validation.error.errors, null, 2));
            console.log('❌ User data received:', JSON.stringify(userData, null, 2));
            return res.status(400).json({ 
              message: "Invalid input", 
              errors: validation.error.errors,
              receivedData: userData
            });
          }
          
          // Protect owner role - only juusojuusto112@gmail.com can have owner role
          if (userData.role === 'owner' && userData.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role');
            return res.status(403).json({ 
              message: 'Owner role is reserved for the system owner' 
            });
          }
          
          // Prevent multiple roles including owner
          if (userData.roles && userData.roles.includes('owner') && userData.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role via roles array');
            return res.status(403).json({ 
              message: 'Owner role is reserved for the system owner' 
            });
          }
          
          // Validation
          if (!userData.username || !userData.firstName || !userData.lastName) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ message: "Username, first name, and last name are required" });
          }
          
          if (!sendEmailInvitation && !userData.password) {
            console.log('❌ Password required when not sending email invitation');
            return res.status(400).json({ message: "Password is required when not sending email invitation" });
          }
          
          if (sendEmailInvitation && !userData.email) {
            console.log('❌ Email required for invitation');
            return res.status(400).json({ message: "Email is required for email invitation" });
          }
          
          // Check if username already exists (case-insensitive)
          const existingUser = await storage.getWilmaUserByUsername(userData.username);
          if (existingUser) {
            console.log('❌ Username already exists:', userData.username);
            return res.status(409).json({ message: "Username already exists" });
          }
          
          // Import password utilities
          const { hashPassword } = await import('../server/passwordUtils.js');
          
          // Generate password if email invitation is requested
          let plainPasswordForEmail = ''; // Temporary variable for email ONLY - NEVER stored in DB
          if (sendEmailInvitation) {
            const { generateTempPassword } = await import('../server/emailService.js');
            plainPasswordForEmail = generateTempPassword(); // Use shorter, simpler password
            console.log('🔑 Generated password for email invitation (length):', plainPasswordForEmail.length);
            
            // Hash the password before storing
            userData.password = await hashPassword(plainPasswordForEmail);
            // DO NOT STORE: userData.plainPassword = ... (SECURITY RISK!)
            userData.isTemporaryPassword = true; // Force password change on first login
            console.log('🔒 Password hashed successfully');
            
            // Send email with credentials using new template
            if (userData.email) {
              try {
                console.log('\n📧 ========== SENDING WILMA INVITATION EMAIL ==========');
                console.log('To:', userData.email);
                console.log('Name:', userData.firstName, userData.lastName);
                console.log('Username:', userData.username);
                console.log('Password length:', plainPasswordForEmail.length);
                console.log('Email User:', process.env.EMAIL_USER);
                console.log('Email Host:', process.env.EMAIL_HOST);
                console.log('Email Port:', process.env.EMAIL_PORT);
                console.log('Email Password Set:', !!process.env.EMAIL_PASSWORD);
                
                const { sendEmail } = await import('../server/emailService.js');
                const { getWilmaInvitationEmail, getWilmaParentInvitationEmail } = await import('../server/emailTemplates.js');
                
                // Use parent-specific template if role is parent
                let emailHtml;
                if (userData.role === 'parent') {
                  // For parents, we need student info - check if it's in the request
                  const studentInfo = req.body.studentInfo || {};
                  emailHtml = getWilmaParentInvitationEmail({
                    parentFirstName: userData.firstName,
                    parentLastName: userData.lastName,
                    parentUsername: userData.username,
                    parentPassword: plainPasswordForEmail, // Use temporary variable
                    studentFirstName: studentInfo.firstName || 'Your child',
                    studentLastName: studentInfo.lastName || '',
                    studentClass: studentInfo.studentClass || 'N/A',
                    appUrl: process.env.APP_URL || 'https://ksykmaps.vercel.app'
                  });
                } else {
                  emailHtml = getWilmaInvitationEmail({
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    username: userData.username,
                    password: plainPasswordForEmail, // Use temporary variable
                    role: userData.role,
                    appUrl: process.env.APP_URL || 'https://ksykmaps.vercel.app'
                  });
                }
                
                console.log('📤 Calling sendEmail function...');
                const emailResult = await sendEmail({
                  to: userData.email,
                  subject: 'Your Wilma Login Credentials - KSYK Maps',
                  html: emailHtml
                });
                
                console.log('📧 Email Result:', JSON.stringify(emailResult, null, 2));
                
                if (emailResult.success) {
                  console.log('✅ Email sent successfully to:', userData.email);
                } else {
                  console.error('❌ Email failed to send:', emailResult.error);
                  console.error('❌ Error details:', emailResult);
                }
                console.log('=====================================================\n');
              } catch (emailError: any) {
                console.error('❌ Failed to send email:', emailError);
                console.error('❌ Error message:', emailError.message);
                console.error('❌ Error stack:', emailError.stack);
                // Continue anyway - user is created
              }
            }
          } else if (userData.password) {
            // Hash manually provided password
            userData.password = await hashPassword(userData.password);
            // DO NOT STORE: userData.plainPassword = ... (SECURITY RISK!)
            userData.isTemporaryPassword = false; // User set their own password
            console.log('🔒 Manual password hashed successfully');
          }
          
          // Set default values
          userData.isActive = userData.isActive !== false; // Default to true
          
          console.log('💾 Creating Wilma user...');
          const wilmaUser = await storage.createWilmaUser(userData);
          console.log('✅ Wilma user created successfully:', wilmaUser.id);
          
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(201).json(userResponse);
        } catch (error: any) {
          console.error('💥 Error creating Wilma user:', error);
          return res.status(500).json({ message: error.message || "Failed to create Wilma user" });
        }
      }
      
      // PUT /wilma/users/:id - Update Wilma user
      const updateMatch = apiPath.match(/^\/wilma\/users\/([^\/]+)$/);
      if (updateMatch && req.method === 'PUT') {
        const id = updateMatch[1];
        console.log('🔵 PUT /api/wilma/users/' + id);
        
        try {
          // Get existing user to check role
          const existingUser = await storage.getWilmaUser(id);
          if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
          }
          
          const updates = req.body;
          
          // Protect owner role - prevent changing to/from owner role
          if (updates.role === 'owner' && existingUser.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role');
            return res.status(403).json({ 
              message: 'Cannot assign owner role' 
            });
          }
          
          if (existingUser.role === 'owner' && updates.role && updates.role !== 'owner') {
            console.log('❌ Unauthorized attempt to remove owner role');
            return res.status(403).json({ 
              message: 'Cannot remove owner role' 
            });
          }
          
          // If password is being updated, hash it and clear temporary flag
          if (updates.password) {
            const { hashPassword } = await import('../server/passwordUtils.js');
            updates.password = await hashPassword(updates.password);
            updates.isTemporaryPassword = false; // Clear temporary password flag
            console.log('🔒 Password hashed for update and temporary flag cleared');
          }
          
          const wilmaUser = await storage.updateWilmaUser(id, updates);
          
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(200).json(userResponse);
        } catch (error: any) {
          console.error('❌ Error updating Wilma user:', error);
          return res.status(500).json({ message: "Failed to update Wilma user" });
        }
      }
      
      // DELETE /wilma/users/:id - Delete Wilma user
      if (updateMatch && req.method === 'DELETE') {
        const id = updateMatch[1];
        console.log('🔵 DELETE /api/wilma/users/' + id);
        
        try {
          await storage.deleteWilmaUser(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting Wilma user:', error);
          return res.status(500).json({ message: "Failed to delete Wilma user" });
        }
      }
      
      // POST /wilma/users/:id/send-password-reset - Send password reset email to specific user
      const passwordResetMatch = apiPath.match(/^\/wilma\/users\/([^\/]+)\/send-password-reset$/);
      if (passwordResetMatch && req.method === 'POST') {
        const userId = passwordResetMatch[1];
        console.log('🔵 POST /api/wilma/users/' + userId + '/send-password-reset');
        
        try {
          // Get user
          const user = await storage.getWilmaUser(userId);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          
          if (!user.email) {
            return res.status(400).json({ message: "User has no email address" });
          }
          
          // Generate new temporary password
          const { generateTempPassword } = await import('../server/emailService.js');
          const tempPassword = generateTempPassword();
          
          // Update user with new temporary password
          await storage.updateWilmaUser(userId, {
            password: tempPassword,
            isTemporaryPassword: true
          });
          
          // Send email
          const { sendEmail } = await import('../server/emailService.js');
          const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; color: #fff; }
    .content { padding: 40px 30px; }
    .password-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
    .password { font-size: 28px; font-weight: 700; color: #1e40af; font-family: monospace; letter-spacing: 2px; background: #fff; padding: 15px 25px; border-radius: 8px; display: inline-block; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Salasanan nollaus / Password Reset</h1>
    </div>
    <div class="content">
      <h2>Hei ${user.firstName}! / Hello ${user.firstName}!</h2>
      <p><strong>Salasanasi on nollattu.</strong> / <strong>Your password has been reset.</strong></p>
      
      <div class="password-box">
        <div style="color: #6b7280; font-size: 14px; font-weight: 600; margin-bottom: 15px;">UUSI VÄLIAIKAINEN SALASANA / NEW TEMPORARY PASSWORD</div>
        <div class="password">${tempPassword}</div>
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Tärkeää / Important:</strong> Vaihda salasanasi heti kirjautumisen jälkeen. / Please change your password immediately after logging in.
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ksykmaps.vercel.app/wilma" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Kirjaudu Wilmaan / Login to Wilma →
        </a>
      </div>
    </div>
    <div class="footer">
      <p><strong>© 2026 KSYK Maps by Nordbyte Studio</strong></p>
      <p>Tämä on automaattinen viesti. / This is an automated message.</p>
    </div>
  </div>
</body>
</html>
          `;
          
          const result = await sendEmail({
            to: user.email,
            subject: '🔐 Salasanan nollaus - Password Reset - Wilma KSYK Maps',
            html: emailHtml
          });
          
          if (!result.success) {
            throw new Error('Failed to send email');
          }
          
          console.log('✅ Password reset email sent to:', user.email);
          return res.status(200).json({ success: true, message: 'Password reset email sent' });
        } catch (error: any) {
          console.error('❌ Error sending password reset email:', error);
          return res.status(500).json({ message: "Failed to send password reset email", error: error.message });
        }
      }
      
      // PUT /wilma/users/:id/change-password - Change user password (first-time or regular)
      const changePasswordMatch = apiPath.match(/^\/wilma\/users\/([^\/]+)\/change-password$/);
      if (changePasswordMatch && req.method === 'PUT') {
        const userId = changePasswordMatch[1];
        console.log('🔵 PUT /api/wilma/users/' + userId + '/change-password');
        
        try {
          const { currentPassword, newPassword, isFirstTime } = req.body;
          
          if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
          }
          
          if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
          }
          
          // Get user
          const user = await storage.getWilmaUser(userId);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }
          
          // Verify current password
          if (user.password !== currentPassword) {
            return res.status(401).json({ message: "Current password is incorrect" });
          }
          
          // Update password (hash it first!)
          const { hashPassword } = await import('../server/passwordUtils.js');
          const hashedPassword = await hashPassword(newPassword);
          
          await storage.updateWilmaUser(userId, {
            password: hashedPassword, // Store HASHED password only
            // DO NOT STORE: plainPassword (SECURITY RISK!)
            isTemporaryPassword: false // No longer temporary
          });
          
          console.log('✅ Password changed successfully for user:', userId);
          
          // If this was a first-time password change, send confirmation email
          if (isFirstTime && user.email) {
            try {
              const { sendEmail } = await import('../server/emailService.js');
              const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; color: #fff; }
    .content { padding: 40px 30px; }
    .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Salasana vaihdettu / Password Changed</h1>
    </div>
    <div class="content">
      <h2>Hei ${user.firstName}! / Hello ${user.firstName}!</h2>
      <p><strong>Salasanasi on vaihdettu onnistuneesti.</strong> / <strong>Your password has been changed successfully.</strong></p>
      
      <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; color: #065f46; font-size: 14px;">
          <strong>✅ Vahvistus / Confirmation:</strong> Voit nyt kirjautua uudella salasanallasi. / You can now log in with your new password.
        </p>
      </div>
      
      <p>Jos et tehnyt tätä muutosta, ota välittömästi yhteyttä tukeen. / If you did not make this change, please contact support immediately.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://ksykmaps.vercel.app/wilma" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">
          Kirjaudu Wilmaan / Login to Wilma →
        </a>
      </div>
    </div>
    <div class="footer">
      <p><strong>© 2026 KSYK Maps by Nordbyte Studio</strong></p>
      <p>Tämä on automaattinen viesti. / This is an automated message.</p>
    </div>
  </div>
</body>
</html>
              `;
              
              await sendEmail({
                to: user.email,
                subject: '✅ Salasana vaihdettu - Password Changed - Wilma KSYK Maps',
                html: emailHtml
              });
              
              console.log('✅ Password change confirmation email sent to:', user.email);
            } catch (emailError) {
              console.error('⚠️ Failed to send confirmation email:', emailError);
              // Don't fail the password change if email fails
            }
          }
          
          return res.status(200).json({ 
            success: true, 
            message: 'Password changed successfully',
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              role: user.role,
              isTemporaryPassword: false
            }
          });
        } catch (error: any) {
          console.error('❌ Error changing password:', error);
          return res.status(500).json({ message: "Failed to change password", error: error.message });
        }
      }
      
      // POST /wilma/send-password-reset - Send password reset email
      if (apiPath === '/wilma/send-password-reset' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/send-password-reset called');
        const { email, name, tempPassword } = req.body;
        
        if (!email || !name || !tempPassword) {
          return res.status(400).json({ message: "Email, name, and tempPassword are required" });
        }
        
        try {
          const { sendEmail } = await import('../server/emailService.js');
          const { getWilmaPasswordResetEmail } = await import('../server/emailTemplates.js');
          
          const emailHtml = getWilmaPasswordResetEmail({
            name,
            tempPassword,
            appUrl: process.env.APP_URL || 'https://ksykmaps.vercel.app'
          });
          
          const result = await sendEmail({
            to: email,
            subject: 'Password Reset - Wilma KSYK Maps',
            html: emailHtml
          });
          
          if (!result.success) {
            throw new Error('Failed to send email');
          }
          
          console.log('✅ Password reset email sent to:', email);
          return res.status(200).json({ success: true, message: 'Password reset email sent' });
        } catch (error: any) {
          console.error('❌ Error sending password reset email:', error);
          return res.status(500).json({ message: "Failed to send password reset email" });
        }
      }

      // POST /wilma/send-bulk-emails - Send welcome emails to all students and parents
      if (apiPath === '/wilma/send-bulk-emails' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/send-bulk-emails called');
        
        try {
          const { sendWilmaStudentWelcomeEmail } = await import('../server/emailService.js');
          
          // Get filter config from request body
          const { gradeLevel, newStudentsOnly, includeParents, studentClass } = req.body || {};
          
          console.log('📋 Bulk email config:', { gradeLevel, newStudentsOnly, includeParents, studentClass });
          
          // Get all students
          let students = await storage.getWilmaUsers('student');
          console.log(`📊 Found ${students.length} total students`);
          
          // Debug: Log first few students to see their structure
          if (students.length > 0) {
            console.log('📝 Sample student data:', {
              hasEmail: !!students[0].email,
              hasPassword: !!students[0].password,
              isTemporaryPassword: students[0].isTemporaryPassword,
              studentClass: students[0].studentClass,
              firstName: students[0].firstName
            });
          }
          
          // Apply filters
          if (gradeLevel) {
            students = students.filter((s: any) => s.studentClass?.startsWith(gradeLevel));
            console.log(`🔍 After grade filter: ${students.length} students`);
          }
          
          if (studentClass) {
            students = students.filter((s: any) => s.studentClass === studentClass);
            console.log(`🔍 After class filter: ${students.length} students`);
          }
          
          // Filter by temporary password if requested
          if (newStudentsOnly) {
            students = students.filter((s: any) => s.email && s.password && s.isTemporaryPassword);
            console.log(`🔍 After new students filter: ${students.length} students`);
          } else {
            // Just ensure they have email - password will be generated if missing
            students = students.filter((s: any) => s.email);
            console.log(`🔍 After email filter: ${students.length} students`);
          }
          
          if (students.length === 0) {
            console.warn('⚠️ No students match the filter criteria!');
            return res.status(400).json({ 
              message: "No students found matching the filter criteria",
              details: {
                totalStudents: (await storage.getWilmaUsers('student')).length,
                filters: { gradeLevel, newStudentsOnly, includeParents, studentClass }
              }
            });
          }
          
          let sent = 0;
          let failed = 0;
          let parentsSent = 0;
          const errors: string[] = [];
          
          for (const student of students) {
            let plainPasswordForEmail = ''; // Temporary variable for email ONLY
            
            // Generate password if missing OR if password is hashed (can't send hashed password in email)
            if (!student.password || student.password.startsWith('$2')) {
              const { generateTempPassword } = await import('../server/emailService.js');
              const { hashPassword } = await import('../server/passwordUtils.js');
              plainPasswordForEmail = generateTempPassword();
              const hashedPass = await hashPassword(plainPasswordForEmail);
              
              // Update student with new hashed password
              await storage.updateWilmaUser(student.id, {
                password: hashedPass,
                // DO NOT STORE: plainPassword (SECURITY RISK!)
                isTemporaryPassword: true
              });
              console.log(`🔑 Generated new password for ${student.email}`);
            } else {
              // If password exists and is not hashed, it's a temporary plain password
              // This should not happen in production, but handle it for migration
              plainPasswordForEmail = student.password;
              const { hashPassword } = await import('../server/passwordUtils.js');
              const hashedPass = await hashPassword(plainPasswordForEmail);
              await storage.updateWilmaUser(student.id, {
                password: hashedPass,
                isTemporaryPassword: true
              });
              console.log(`🔒 Hashed existing plain password for ${student.email}`);
            }
            
            const parentEmails = [];
            if (includeParents) {
              if (student.parent1Email) parentEmails.push(student.parent1Email);
              if (student.parent2Email) parentEmails.push(student.parent2Email);
            }
            
            try {
              const result = await sendWilmaStudentWelcomeEmail(
                student.email,
                `${student.firstName} ${student.lastName}`,
                plainPasswordForEmail, // Use temporary variable
                student.username || student.email,
                student.studentId || '000000',
                parentEmails.length > 0 ? parentEmails : undefined
              );
              
              if (result.success) {
                sent++;
                parentsSent += parentEmails.length;
                console.log(`✅ Email sent to ${student.email}${parentEmails.length > 0 ? ` and ${parentEmails.length} parent(s)` : ''}`);
              } else {
                failed++;
                errors.push(`${student.email}: ${result.error || 'Unknown error'}`);
                console.error(`❌ Failed to send email to ${student.email}:`, result.error);
              }
            } catch (emailError: any) {
              console.error(`❌ Failed to send email to ${student.email}:`, emailError);
              failed++;
              errors.push(`${student.email}: ${emailError.message || 'Unknown error'}`);
            }
          }
          
          console.log(`📊 Bulk email complete: ${sent} students, ${parentsSent} parents, ${failed} failed`);
          return res.status(200).json({ 
            success: true, 
            sent, 
            parentsSent,
            failed, 
            errors: errors.slice(0, 10) // Return first 10 errors
          });
          
        } catch (error: any) {
          console.error('❌ Error in bulk email:', error);
          return res.status(500).json({ message: "Failed to send bulk emails", error: error.message });
        }
      }

      // POST /test-email - Test email configuration
      if (apiPath === '/test-email' && req.method === 'POST') {
        console.log('🔵 POST /api/test-email called');
        try {
          const { to } = req.body;
          if (!to) {
            return res.status(400).json({ message: "Email address required" });
          }

          const { sendEmail } = await import('../server/emailService.js');
          const result = await sendEmail({
            to,
            subject: 'Test Email from KSYK Maps',
            html: `
              <h1>Test Email</h1>
              <p>This is a test email from KSYK Maps.</p>
              <p>If you received this, email configuration is working correctly!</p>
              <p>Sent at: ${new Date().toLocaleString('fi-FI')}</p>
            `
          });

          if (result.success) {
            return res.status(200).json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
          } else {
            return res.status(500).json({ success: false, message: 'Failed to send test email', error: result.error });
          }
        } catch (error: any) {
          console.error('❌ Test email error:', error);
          return res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
        }
      }

      // GET /wilma/settings - Get Wilma settings
      if (apiPath === '/wilma/settings' && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/settings called');
        try {
          const settings = await storage.getWilmaSettings();
          return res.status(200).json(settings);
        } catch (error: any) {
          console.error('❌ Error getting Wilma settings:', error);
          return res.status(500).json({ message: "Failed to fetch settings" });
        }
      }

      // POST /wilma/settings - Create/Update Wilma settings (alias for PUT)
      if (apiPath === '/wilma/settings' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/settings called');
        try {
          const settings = await storage.updateWilmaSettings(req.body);
          return res.status(200).json(settings);
        } catch (error: any) {
          console.error('❌ Error updating Wilma settings:', error);
          return res.status(500).json({ message: "Failed to update settings" });
        }
      }

      // PUT /wilma/settings - Update Wilma settings
      if (apiPath === '/wilma/settings' && req.method === 'PUT') {
        console.log('🔵 PUT /api/wilma/settings called');
        try {
          const settings = await storage.updateWilmaSettings(req.body);
          return res.status(200).json(settings);
        } catch (error: any) {
          console.error('❌ Error updating Wilma settings:', error);
          return res.status(500).json({ message: "Failed to update settings" });
        }
      }

      // GET /wilma/classes - Get all classes
      if (apiPath === '/wilma/classes' && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/classes called');
        try {
          const classes = await storage.getWilmaClasses();
          return res.status(200).json(classes);
        } catch (error: any) {
          console.error('❌ Error getting Wilma classes:', error);
          return res.status(500).json({ message: "Failed to fetch classes" });
        }
      }

      // GET /wilma/classes/:id - Get single class
      const classMatch = apiPath.match(/^\/wilma\/classes\/([^\/]+)$/);
      if (classMatch && req.method === 'GET') {
        const id = classMatch[1];
        console.log('🔵 GET /api/wilma/classes/' + id);
        try {
          const classData = await storage.getWilmaClass(id);
          if (!classData) {
            return res.status(404).json({ message: "Class not found" });
          }
          return res.status(200).json(classData);
        } catch (error: any) {
          console.error('❌ Error getting Wilma class:', error);
          return res.status(500).json({ message: "Failed to fetch class" });
        }
      }

      // POST /wilma/classes - Create class
      if (apiPath === '/wilma/classes' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/classes called');
        try {
          const classData = await storage.createWilmaClass(req.body);
          return res.status(201).json(classData);
        } catch (error: any) {
          console.error('❌ Error creating Wilma class:', error);
          return res.status(500).json({ message: "Failed to create class" });
        }
      }

      // PUT /wilma/classes/:id - Update class
      if (classMatch && req.method === 'PUT') {
        const id = classMatch[1];
        console.log('🔵 PUT /api/wilma/classes/' + id);
        try {
          const classData = await storage.updateWilmaClass(id, req.body);
          return res.status(200).json(classData);
        } catch (error: any) {
          console.error('❌ Error updating Wilma class:', error);
          return res.status(500).json({ message: "Failed to update class" });
        }
      }

      // DELETE /wilma/classes/:id - Delete class
      if (classMatch && req.method === 'DELETE') {
        const id = classMatch[1];
        console.log('🔵 DELETE /api/wilma/classes/' + id);
        try {
          await storage.deleteWilmaClass(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting Wilma class:', error);
          return res.status(500).json({ message: "Failed to delete class" });
        }
      }

      // GET /wilma/schedule - Get schedule by userId (query param)
      if (apiPath === '/wilma/schedule' && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/schedule called');
        try {
          const userId = req.query.userId as string;
          if (!userId) {
            return res.status(400).json({ message: "userId is required" });
          }
          
          // Return mock schedule data for now
          const mockSchedule = [
            { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
            { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
            { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
            { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
            { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
          ];
          
          return res.status(200).json(mockSchedule);
        } catch (error: any) {
          console.error('❌ Error getting schedule:', error);
          return res.status(500).json({ message: "Failed to fetch schedule" });
        }
      }

      // POST /wilma/link-parent-child - Link parent to child
      if (apiPath === '/wilma/link-parent-child' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/link-parent-child called');
        try {
          const { parentId, childId } = req.body;
          
          if (!parentId || !childId) {
            return res.status(400).json({ message: "Parent ID and Child ID are required" });
          }
          
          await storage.linkParentToChild(parentId, childId);
          return res.status(200).json({ message: "Parent linked to child successfully" });
        } catch (error: any) {
          console.error('❌ Error linking parent to child:', error);
          return res.status(500).json({ message: error.message || "Failed to link parent to child" });
        }
      }

      // DELETE /wilma/link-parent-child - Unlink parent from child
      if (apiPath === '/wilma/link-parent-child' && req.method === 'DELETE') {
        console.log('🔵 DELETE /api/wilma/link-parent-child called');
        try {
          const { parentId, childId } = req.body;
          
          if (!parentId || !childId) {
            return res.status(400).json({ message: "Parent ID and Child ID are required" });
          }
          
          await storage.unlinkParentFromChild(parentId, childId);
          return res.status(200).json({ message: "Parent unlinked from child successfully" });
        } catch (error: any) {
          console.error('❌ Error unlinking parent from child:', error);
          return res.status(500).json({ message: error.message || "Failed to unlink parent from child" });
        }
      }

      // GET /wilma/parent/:parentId/children - Get children for parent
      const parentChildrenMatch = apiPath.match(/^\/wilma\/parent\/([^\/]+)\/children$/);
      if (parentChildrenMatch && req.method === 'GET') {
        const parentId = parentChildrenMatch[1];
        console.log('🔵 GET /api/wilma/parent/' + parentId + '/children');
        try {
          const children = await storage.getChildrenForParent(parentId);
          return res.status(200).json(children);
        } catch (error: any) {
          console.error('❌ Error getting children for parent:', error);
          return res.status(500).json({ message: "Failed to fetch children" });
        }
      }

      // GET /wilma/child/:childId/parents - Get parents for child
      const childParentsMatch = apiPath.match(/^\/wilma\/child\/([^\/]+)\/parents$/);
      if (childParentsMatch && req.method === 'GET') {
        const childId = childParentsMatch[1];
        console.log('🔵 GET /api/wilma/child/' + childId + '/parents');
        try {
          const parents = await storage.getParentsForChild(childId);
          return res.status(200).json(parents);
        } catch (error: any) {
          console.error('❌ Error getting parents for child:', error);
          return res.status(500).json({ message: "Failed to fetch parents" });
        }
      }

      // GET /wilma/schedules - Get all schedules
      if (apiPath === '/wilma/schedules' || apiPath.startsWith('/wilma/schedules?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/schedules called');
          try {
            const classFilter = req.query.class as string | undefined;
            const schedules = await storage.getWilmaSchedulesAll(classFilter);
            return res.status(200).json(schedules);
          } catch (error: any) {
            console.error('❌ Error getting schedules:', error);
            return res.status(500).json({ message: "Failed to fetch schedules" });
          }
        }
      }

      // GET /wilma/schedules/:userId - Get schedules for a specific user
      const getUserSchedulesMatch = apiPath.match(/^\/wilma\/schedules\/([^\/]+)$/);
      if (getUserSchedulesMatch && req.method === 'GET') {
        const userId = getUserSchedulesMatch[1];
        console.log('🔵 GET /api/wilma/schedules/' + userId);
        try {
          // Get user to find their student ID
          const user = await storage.getWilmaUser(userId);
          if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ message: "User not found" });
          }

          // Get schedules by student ID
          const studentId = user.studentId || userId;
          console.log('📅 Fetching schedules for student ID:', studentId);
          const schedules = await storage.getWilmaSchedules(studentId);
          
          console.log(`✅ Found ${schedules.length} schedules for user ${userId}`);
          return res.status(200).json(schedules);
        } catch (error: any) {
          console.error('❌ Error getting user schedules:', error);
          return res.status(500).json({ message: "Failed to fetch schedules" });
        }
      }

      // POST /wilma/schedules - Create schedule
      if (apiPath === '/wilma/schedules' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/schedules called');
        try {
          const schedule = await storage.createWilmaSchedule(req.body);
          return res.status(201).json(schedule);
        } catch (error: any) {
          console.error('❌ Error creating schedule:', error);
          return res.status(500).json({ message: "Failed to create schedule" });
        }
      }

      // DELETE /wilma/schedules/:id - Delete schedule
      const deleteScheduleMatch = apiPath.match(/^\/wilma\/schedules\/([^\/]+)$/);
      if (deleteScheduleMatch && req.method === 'DELETE') {
        const id = deleteScheduleMatch[1];
        console.log('🔵 DELETE /api/wilma/schedules/' + id);
        try {
          await storage.deleteWilmaSchedule(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting schedule:', error);
          return res.status(500).json({ message: "Failed to delete schedule" });
        }
      }

      // PUT /wilma/schedules/:id - Update schedule
      const updateScheduleMatch = apiPath.match(/^\/wilma\/schedules\/([^\/]+)$/);
      if (updateScheduleMatch && req.method === 'PUT') {
        const id = updateScheduleMatch[1];
        console.log('🔵 PUT /api/wilma/schedules/' + id);
        try {
          const schedule = await storage.updateWilmaSchedule(id, req.body);
          return res.status(200).json(schedule);
        } catch (error: any) {
          console.error('❌ Error updating schedule:', error);
          return res.status(500).json({ message: "Failed to update schedule" });
        }
      }

      // ==================== ATTENDANCE ENDPOINTS ====================
      
      // GET /wilma/attendance - Get attendance records
      if (apiPath === '/wilma/attendance' || apiPath.startsWith('/wilma/attendance?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/attendance called');
          try {
            const studentId = req.query.studentId as string | undefined;
            const classId = req.query.classId as string | undefined;
            const date = req.query.date as string | undefined;
            
            if (studentId) {
              const attendance = await storage.getWilmaAttendance(studentId);
              return res.status(200).json(attendance);
            } else if (classId) {
              const attendance = await storage.getWilmaAttendanceByClass(classId, date);
              return res.status(200).json(attendance);
            } else {
              return res.status(400).json({ message: "studentId or classId is required" });
            }
          } catch (error: any) {
            console.error('❌ Error getting attendance:', error);
            return res.status(500).json({ message: "Failed to fetch attendance" });
          }
        }
      }

      // POST /wilma/attendance - Create attendance record
      if (apiPath === '/wilma/attendance' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/attendance called');
        try {
          const attendance = await storage.createWilmaAttendance(req.body);
          return res.status(201).json(attendance);
        } catch (error: any) {
          console.error('❌ Error creating attendance:', error);
          return res.status(500).json({ message: "Failed to create attendance" });
        }
      }

      // PUT /wilma/attendance/:id - Update attendance record
      const attendanceMatch = apiPath.match(/^\/wilma\/attendance\/([^\/]+)$/);
      if (attendanceMatch && req.method === 'PUT') {
        const id = attendanceMatch[1];
        console.log('🔵 PUT /api/wilma/attendance/' + id);
        try {
          const attendance = await storage.updateWilmaAttendance(id, req.body);
          return res.status(200).json(attendance);
        } catch (error: any) {
          console.error('❌ Error updating attendance:', error);
          return res.status(500).json({ message: "Failed to update attendance" });
        }
      }

      // DELETE /wilma/attendance/:id - Delete attendance record
      if (attendanceMatch && req.method === 'DELETE') {
        const id = attendanceMatch[1];
        console.log('🔵 DELETE /api/wilma/attendance/' + id);
        try {
          await storage.deleteWilmaAttendance(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting attendance:', error);
          return res.status(500).json({ message: "Failed to delete attendance" });
        }
      }

      // ==================== GRADES ENDPOINTS ====================
      
      // GET /wilma/grades - Get grades
      if (apiPath === '/wilma/grades' || apiPath.startsWith('/wilma/grades?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/grades called');
          try {
            const studentId = req.query.studentId as string;
            if (!studentId) {
              return res.status(400).json({ message: "studentId is required" });
            }
            const grades = await storage.getWilmaGrades(studentId);
            return res.status(200).json(grades);
          } catch (error: any) {
            console.error('❌ Error getting grades:', error);
            return res.status(500).json({ message: "Failed to fetch grades" });
          }
        }
      }

      // POST /wilma/grades - Create grade
      if (apiPath === '/wilma/grades' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/grades called');
        try {
          const grade = await storage.createWilmaGrade(req.body);
          return res.status(201).json(grade);
        } catch (error: any) {
          console.error('❌ Error creating grade:', error);
          return res.status(500).json({ message: "Failed to create grade" });
        }
      }

      // PUT /wilma/grades/:id - Update grade
      const gradeMatch = apiPath.match(/^\/wilma\/grades\/([^\/]+)$/);
      if (gradeMatch && req.method === 'PUT') {
        const id = gradeMatch[1];
        console.log('🔵 PUT /api/wilma/grades/' + id);
        try {
          const grade = await storage.updateWilmaGrade(id, req.body);
          return res.status(200).json(grade);
        } catch (error: any) {
          console.error('❌ Error updating grade:', error);
          return res.status(500).json({ message: "Failed to update grade" });
        }
      }

      // DELETE /wilma/grades/:id - Delete grade
      if (gradeMatch && req.method === 'DELETE') {
        const id = gradeMatch[1];
        console.log('🔵 DELETE /api/wilma/grades/' + id);
        try {
          await storage.deleteWilmaGrade(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting grade:', error);
          return res.status(500).json({ message: "Failed to delete grade" });
        }
      }

      // ==================== ASSIGNMENTS ENDPOINTS ====================
      
      // GET /wilma/assignments - Get assignments
      if (apiPath === '/wilma/assignments' || apiPath.startsWith('/wilma/assignments?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/assignments called');
          try {
            const studentId = req.query.studentId as string | undefined;
            const classId = req.query.classId as string | undefined;
            
            if (studentId) {
              const assignments = await storage.getWilmaAssignments(studentId);
              return res.status(200).json(assignments);
            } else if (classId) {
              const assignments = await storage.getWilmaAssignmentsByClass(classId);
              return res.status(200).json(assignments);
            } else {
              return res.status(400).json({ message: "studentId or classId is required" });
            }
          } catch (error: any) {
            console.error('❌ Error getting assignments:', error);
            return res.status(500).json({ message: "Failed to fetch assignments" });
          }
        }
      }

      // POST /wilma/assignments - Create assignment
      if (apiPath === '/wilma/assignments' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/assignments called');
        try {
          const assignment = await storage.createWilmaAssignment(req.body);
          return res.status(201).json(assignment);
        } catch (error: any) {
          console.error('❌ Error creating assignment:', error);
          return res.status(500).json({ message: "Failed to create assignment" });
        }
      }

      // PUT /wilma/assignments/:id - Update assignment
      const assignmentMatch = apiPath.match(/^\/wilma\/assignments\/([^\/]+)$/);
      if (assignmentMatch && req.method === 'PUT') {
        const id = assignmentMatch[1];
        console.log('🔵 PUT /api/wilma/assignments/' + id);
        try {
          const assignment = await storage.updateWilmaAssignment(id, req.body);
          return res.status(200).json(assignment);
        } catch (error: any) {
          console.error('❌ Error updating assignment:', error);
          return res.status(500).json({ message: "Failed to update assignment" });
        }
      }

      // DELETE /wilma/assignments/:id - Delete assignment
      if (assignmentMatch && req.method === 'DELETE') {
        const id = assignmentMatch[1];
        console.log('🔵 DELETE /api/wilma/assignments/' + id);
        try {
          await storage.deleteWilmaAssignment(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting schedule:', error);
          return res.status(500).json({ message: "Failed to delete schedule" });
        }
      }

      // ==================== DETENTIONS ENDPOINTS ====================
      
      // GET /wilma/detentions - Get detentions
      if (apiPath === '/wilma/detentions' || apiPath.startsWith('/wilma/detentions?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/detentions called');
          try {
            const status = req.query.status as string | undefined;
            const studentId = req.query.studentId as string | undefined;
            
            let detentions = await storage.getWilmaDetentions();
            
            // Filter by status
            if (status && status !== 'all') {
              detentions = detentions.filter((d: any) => d.status === status);
            }
            
            // Filter by student
            if (studentId) {
              detentions = detentions.filter((d: any) => d.studentId === studentId);
            }
            
            return res.status(200).json(detentions);
          } catch (error: any) {
            console.error('❌ Error fetching detentions:', error);
            return res.status(500).json({ message: "Failed to fetch detentions" });
          }
        }
      }

      // POST /wilma/detentions - Create detention
      if (apiPath === '/wilma/detentions' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/detentions called');
        try {
          const detention = await storage.createWilmaDetention(req.body);
          return res.status(201).json(detention);
        } catch (error: any) {
          console.error('❌ Error creating detention:', error);
          return res.status(500).json({ message: "Failed to create detention" });
        }
      }

      // PUT /wilma/detentions/:id - Update detention
      const detentionMatch = apiPath.match(/^\/wilma\/detentions\/([^\/]+)$/);
      if (detentionMatch && req.method === 'PUT') {
        const id = detentionMatch[1];
        console.log('🔵 PUT /api/wilma/detentions/' + id);
        try {
          const detention = await storage.updateWilmaDetention(id, req.body);
          return res.status(200).json(detention);
        } catch (error: any) {
          console.error('❌ Error updating detention:', error);
          return res.status(500).json({ message: "Failed to update detention" });
        }
      }

      // DELETE /wilma/detentions/:id - Delete detention
      if (detentionMatch && req.method === 'DELETE') {
        const id = detentionMatch[1];
        console.log('🔵 DELETE /api/wilma/detentions/' + id);
        try {
          await storage.deleteWilmaDetention(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting detention:', error);
          return res.status(500).json({ message: "Failed to delete detention" });
        }
      }

      // GET /wilma/messages - Get all messages (with optional filters)
      if (apiPath === '/wilma/messages' || apiPath.startsWith('/wilma/messages?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/messages called');
          try {
            const recipientId = req.query.recipientId as string | undefined;
            const unread = req.query.unread as string | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
            
            let messages = await storage.getWilmaMessagesAll();
            
            // Filter by recipient
            if (recipientId) {
              messages = messages.filter((m: any) => m.recipientId === recipientId);
            }
            
            // Filter by unread status
            if (unread === 'true') {
              messages = messages.filter((m: any) => !m.read);
            }
            
            // Sort by timestamp (newest first)
            messages.sort((a: any, b: any) => {
              const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
              const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
              return timeB - timeA;
            });
            
            // Apply limit
            if (limit) {
              messages = messages.slice(0, limit);
            }
            
            return res.status(200).json(messages);
          } catch (error: any) {
            console.error('❌ Error getting messages:', error);
            return res.status(500).json({ message: "Failed to fetch messages" });
          }
        }
      }

      // POST /wilma/messages - Create message
      if (apiPath === '/wilma/messages' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/messages called');
        try {
          const message = await storage.createWilmaMessage(req.body);
          return res.status(201).json(message);
        } catch (error: any) {
          console.error('❌ Error creating message:', error);
          return res.status(500).json({ message: "Failed to create message" });
        }
      }

      // DELETE /wilma/messages/:id - Delete message
      const messageMatch = apiPath.match(/^\/wilma\/messages\/([^\/]+)$/);
      if (messageMatch && req.method === 'DELETE') {
        const id = messageMatch[1];
        console.log('🔵 DELETE /api/wilma/messages/' + id);
        try {
          await storage.deleteWilmaMessage(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting message:', error);
          return res.status(500).json({ message: "Failed to delete message" });
        }
      }

      // PUT /wilma/messages/:id/read - Mark message as read
      const messageReadMatch = apiPath.match(/^\/wilma\/messages\/([^\/]+)\/read$/);
      if (messageReadMatch && req.method === 'PUT') {
        const id = messageReadMatch[1];
        console.log('🔵 PUT /api/wilma/messages/' + id + '/read');
        try {
          await storage.markWilmaMessageAsRead(id);
          return res.status(200).json({ success: true });
        } catch (error: any) {
          console.error('❌ Error marking message as read:', error);
          return res.status(500).json({ message: "Failed to mark message as read" });
        }
      }

      // GET /wilma/notifications - Get user notifications
      if (apiPath === '/wilma/notifications' && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/notifications called');
        try {
          const userId = req.query.userId as string;
          if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
          }
          const notifications = await storage.getWilmaNotifications(userId);
          return res.status(200).json(notifications);
        } catch (error: any) {
          console.error('❌ Error fetching notifications:', error);
          return res.status(500).json({ message: "Failed to fetch notifications" });
        }
      }

      // POST /wilma/notifications - Create notification
      if (apiPath === '/wilma/notifications' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/notifications called');
        try {
          const notification = await storage.createWilmaNotification(req.body);
          return res.status(201).json(notification);
        } catch (error: any) {
          console.error('❌ Error creating notification:', error);
          return res.status(500).json({ message: "Failed to create notification" });
        }
      }

      // PUT /wilma/notifications/:id/read - Mark notification as read
      const notificationReadMatch = apiPath.match(/^\/wilma\/notifications\/([^\/]+)\/read$/);
      if (notificationReadMatch && req.method === 'PUT') {
        const id = notificationReadMatch[1];
        console.log('🔵 PUT /api/wilma/notifications/' + id + '/read');
        try {
          await storage.markWilmaNotificationAsRead(id);
          return res.status(200).json({ success: true });
        } catch (error: any) {
          console.error('❌ Error marking notification as read:', error);
          return res.status(500).json({ message: "Failed to mark notification as read" });
        }
      }

      // PUT /wilma/notifications/mark-all-read - Mark all notifications as read
      if (apiPath === '/wilma/notifications/mark-all-read' && req.method === 'PUT') {
        console.log('🔵 PUT /api/wilma/notifications/mark-all-read called');
        try {
          const userId = req.query.userId as string;
          if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
          }
          await storage.markAllWilmaNotificationsAsRead(userId);
          return res.status(200).json({ success: true });
        } catch (error: any) {
          console.error('❌ Error marking all notifications as read:', error);
          return res.status(500).json({ message: "Failed to mark all notifications as read" });
        }
      }

      // DELETE /wilma/notifications/:id - Delete notification
      const notificationDeleteMatch = apiPath.match(/^\/wilma\/notifications\/([^\/]+)$/);
      if (notificationDeleteMatch && req.method === 'DELETE') {
        const id = notificationDeleteMatch[1];
        console.log('🔵 DELETE /api/wilma/notifications/' + id);
        try {
          await storage.deleteWilmaNotification(id);
          return res.status(200).json({ success: true });
        } catch (error: any) {
          console.error('❌ Error deleting notification:', error);
          return res.status(500).json({ message: "Failed to delete notification" });
        }
      }

      // POST /wilma/dashboard-preferences - Save dashboard preferences
      if (apiPath === '/wilma/dashboard-preferences' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/dashboard-preferences called');
        try {
          const { userId, preferences } = req.body;
          
          if (!userId || !preferences) {
            return res.status(400).json({ message: "userId and preferences are required" });
          }
          
          await storage.saveWilmaDashboardPreferences(userId, preferences);
          return res.status(200).json({ success: true, message: 'Preferences saved successfully' });
        } catch (error: any) {
          console.error('❌ Error saving dashboard preferences:', error);
          return res.status(500).json({ message: "Failed to save preferences" });
        }
      }

      // GET /wilma/dashboard-preferences/:userId - Get dashboard preferences
      const dashboardPrefsMatch = apiPath.match(/^\/wilma\/dashboard-preferences\/([^\/]+)$/);
      if (dashboardPrefsMatch && req.method === 'GET') {
        const userId = dashboardPrefsMatch[1];
        console.log('🔵 GET /api/wilma/dashboard-preferences/' + userId);
        try {
          const preferences = await storage.getWilmaDashboardPreferences(userId);
          return res.status(200).json(preferences || null);
        } catch (error: any) {
          console.error('❌ Error loading dashboard preferences:', error);
          return res.status(500).json({ message: "Failed to load preferences" });
        }
      }

      // GET /wilma/students/:id/enrollments - Get student enrollments
      const enrollmentsMatch = apiPath.match(/^\/wilma\/students\/([^\/]+)\/enrollments$/);
      if (enrollmentsMatch && req.method === 'GET') {
        const id = enrollmentsMatch[1];
        console.log('🔵 GET /api/wilma/students/' + id + '/enrollments');
        try {
          // Look up student by ID (supports both Firebase ID and 8-digit student ID)
          let student;
          if (/^\d{8}$/.test(id)) {
            student = await storage.getWilmaUserByStudentId(id);
          } else {
            student = await storage.getWilmaUser(id);
          }
          
          if (!student) {
            return res.status(404).json({ message: "Student not found" });
          }
          
          const studentId = student.id; // Use Firebase ID for course lookup
          
          // Get all courses where student is enrolled
          const allCourses = await storage.getWilmaCourses();
          const studentEnrollments = allCourses.filter((course: any) => 
            course.enrolledStudents && course.enrolledStudents.includes(studentId)
          );
          return res.status(200).json(studentEnrollments);
        } catch (error: any) {
          console.error('❌ Error getting enrollments:', error);
          return res.status(500).json({ message: "Failed to fetch enrollments" });
        }
      }

      // GET /wilma/attendance-marks - Get attendance marks
      if (apiPath === '/wilma/attendance-marks' || apiPath.startsWith('/wilma/attendance-marks?')) {
        if (req.method === 'GET') {
          const studentId = req.query.studentId as string | undefined;
          console.log('🔵 GET /api/wilma/attendance-marks', { studentId });
          try {
            if (!studentId) {
              return res.status(400).json({ message: "studentId is required" });
            }
            const attendanceMarks = await storage.getWilmaAttendance(studentId);
            return res.status(200).json(attendanceMarks);
          } catch (error: any) {
            console.error('❌ Error getting attendance marks:', error);
            return res.status(500).json({ message: "Failed to fetch attendance marks" });
          }
        }
      }

      // POST /wilma/attendance-marks - Create attendance mark
      if (apiPath === '/wilma/attendance-marks' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/attendance-marks');
        try {
          const attendanceMark = await storage.createWilmaAttendance(req.body);
          return res.status(201).json(attendanceMark);
        } catch (error: any) {
          console.error('❌ Error creating attendance mark:', error);
          return res.status(500).json({ message: "Failed to create attendance mark" });
        }
      }

      // GET /wilma/students/:id/schedule - Get student schedule
      const studentScheduleMatch = apiPath.match(/^\/wilma\/students\/([^\/]+)\/schedule$/);
      if (studentScheduleMatch && req.method === 'GET') {
        const id = studentScheduleMatch[1];
        console.log('🔵 GET /api/wilma/students/' + id + '/schedule');
        try {
          // Look up student by ID (supports both Firebase ID and 8-digit student ID)
          let student;
          if (/^\d{8}$/.test(id)) {
            student = await storage.getWilmaUserByStudentId(id);
          } else {
            student = await storage.getWilmaUser(id);
          }
          
          if (!student) {
            return res.status(404).json({ message: "Student not found" });
          }
          
          const studentId = student.id; // Use Firebase ID for course lookup
          
          // Get student's enrolled courses
          const allCourses = await storage.getWilmaCourses();
          const studentCourses = allCourses.filter((course: any) => 
            course.enrolledStudents && course.enrolledStudents.includes(studentId)
          );
          
          // Extract schedule from courses
          const schedule = studentCourses.flatMap((course: any) => 
            (course.schedule || []).map((slot: any) => ({
              ...slot,
              courseId: course.id,
              courseName: course.name,
              teacherId: course.teacherId
            }))
          );
          
          return res.status(200).json(schedule);
        } catch (error: any) {
          console.error('❌ Error getting student schedule:', error);
          return res.status(500).json({ message: "Failed to fetch schedule" });
        }
      }

      // GET /wilma/courses - Get all courses
      if (apiPath === '/wilma/courses' || apiPath.startsWith('/wilma/courses?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/courses');
          try {
            const teacherId = req.query.teacherId as string | undefined;
            const classId = req.query.classId as string | undefined;
            const courses = await storage.getWilmaCourses(teacherId, classId);
            return res.status(200).json(courses);
          } catch (error: any) {
            console.error('❌ Error getting courses:', error);
            return res.status(500).json({ message: "Failed to fetch courses" });
          }
        }
      }

      // POST /wilma/courses - Create course
      if (apiPath === '/wilma/courses' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/courses');
        try {
          const course = await storage.createWilmaCourse(req.body);
          return res.status(201).json(course);
        } catch (error: any) {
          console.error('❌ Error creating course:', error);
          return res.status(500).json({ message: "Failed to create course" });
        }
      }

      // GET /wilma/courses/:id - Get single course
      const courseMatch = apiPath.match(/^\/wilma\/courses\/([^\/]+)$/);
      if (courseMatch && req.method === 'GET') {
        const id = courseMatch[1];
        console.log('🔵 GET /api/wilma/courses/' + id);
        try {
          const course = await storage.getWilmaCourse(id);
          if (!course) {
            return res.status(404).json({ message: "Course not found" });
          }
          return res.status(200).json(course);
        } catch (error: any) {
          console.error('❌ Error getting course:', error);
          return res.status(500).json({ message: "Failed to fetch course" });
        }
      }

      // PUT /wilma/courses/:id - Update course
      if (courseMatch && req.method === 'PUT') {
        const id = courseMatch[1];
        console.log('🔵 PUT /api/wilma/courses/' + id);
        try {
          const course = await storage.updateWilmaCourse(id, req.body);
          return res.status(200).json(course);
        } catch (error: any) {
          console.error('❌ Error updating course:', error);
          return res.status(500).json({ message: "Failed to update course" });
        }
      }

      // DELETE /wilma/courses/:id - Delete course
      if (courseMatch && req.method === 'DELETE') {
        const id = courseMatch[1];
        console.log('🔵 DELETE /api/wilma/courses/' + id);
        try {
          await storage.deleteWilmaCourse(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting course:', error);
          return res.status(500).json({ message: "Failed to delete course" });
        }
      }

      // GET /wilma/grades - Get grades
      if (apiPath === '/wilma/grades' || apiPath.startsWith('/wilma/grades?')) {
        if (req.method === 'GET') {
          const studentId = req.query.studentId as string | undefined;
          console.log('🔵 GET /api/wilma/grades', { studentId });
          try {
            if (!studentId) {
              return res.status(400).json({ message: "studentId is required" });
            }
            const grades = await storage.getWilmaGrades(studentId);
            return res.status(200).json(grades);
          } catch (error: any) {
            console.error('❌ Error getting grades:', error);
            return res.status(500).json({ message: "Failed to fetch grades" });
          }
        }
      }

      // POST /wilma/grades - Create grade
      if (apiPath === '/wilma/grades' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/grades');
        try {
          const grade = await storage.createWilmaGrade(req.body);
          return res.status(201).json(grade);
        } catch (error: any) {
          console.error('❌ Error creating grade:', error);
          return res.status(500).json({ message: "Failed to create grade" });
        }
      }

      // GET /wilma/homework - Get homework assignments
      if (apiPath === '/wilma/homework' || apiPath.startsWith('/wilma/homework?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/homework called');
          try {
            const studentId = req.query.studentId as string | undefined;
            const courseId = req.query.courseId as string | undefined;
            
            // Try to get from extended homework first
            try {
              let homework = await storage.getWilmaHomeworkExtendedAll();
              
              // Filter by student or course if provided
              if (studentId) {
                homework = homework.filter((h: any) => h.studentId === studentId || !h.studentId);
              }
              if (courseId) {
                homework = homework.filter((h: any) => h.courseId === courseId);
              }
              
              // Sort by due date
              homework.sort((a: any, b: any) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                return dateA - dateB;
              });
              
              return res.status(200).json(homework);
            } catch (extendedError) {
              // If extended homework doesn't exist, return empty array
              console.log('No homework found, returning empty array');
              return res.status(200).json([]);
            }
          } catch (error: any) {
            console.error('❌ Error getting homework:', error);
            return res.status(500).json({ message: "Failed to fetch homework" });
          }
        }
      }

      // POST /wilma/homework - Create homework assignment
      if (apiPath === '/wilma/homework' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/homework');
        try {
          const homework = await storage.createWilmaHomeworkExtended(req.body);
          return res.status(201).json(homework);
        } catch (error: any) {
          console.error('❌ Error creating homework:', error);
          return res.status(500).json({ message: "Failed to create homework" });
        }
      }
      
      // POST /wilma/homework/check-ai - Check if homework is AI-generated
      if (apiPath === '/wilma/homework/check-ai' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/homework/check-ai');
        try {
          const { content } = req.body;
          
          if (!content || content.trim().length < 50) {
            return res.status(400).json({ message: "Content must be at least 50 characters" });
          }
          
          // Simple AI detection algorithm (can be replaced with actual AI service)
          const words = content.split(/\s+/).filter((w: string) => w.length > 0);
          const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
          
          // Calculate metrics
          const avgWordLength = words.reduce((sum: number, w: string) => sum + w.length, 0) / words.length;
          const avgSentenceLength = words.length / sentences.length;
          const uniqueWords = new Set(words.map((w: string) => w.toLowerCase())).size;
          const lexicalDiversity = uniqueWords / words.length;
          
          // AI patterns detection
          const patterns: string[] = [];
          const suspiciousIndicators: string[] = [];
          
          // Check for repetitive patterns
          if (lexicalDiversity < 0.4) {
            patterns.push('low-lexical-diversity');
            suspiciousIndicators.push('Matala sanavaraston monimuotoisuus');
          }
          
          // Check for overly consistent sentence length
          const sentenceLengths = sentences.map((s: string) => s.split(/\s+/).length);
          const avgSentLen = sentenceLengths.reduce((a: number, b: number) => a + b, 0) / sentenceLengths.length;
          const sentLenVariance = sentenceLengths.reduce((sum: number, len: number) => sum + Math.pow(len - avgSentLen, 2), 0) / sentenceLengths.length;
          
          if (sentLenVariance < 10) {
            patterns.push('consistent-sentence-length');
            suspiciousIndicators.push('Liian tasainen lauseiden pituus');
          }
          
          // Check for formal language patterns
          const formalWords = ['furthermore', 'moreover', 'consequently', 'therefore', 'thus', 'hence', 'lisäksi', 'siksi', 'näin ollen'];
          const formalCount = words.filter((w: string) => formalWords.includes(w.toLowerCase())).length;
          if (formalCount > words.length * 0.02) {
            patterns.push('formal-language');
            suspiciousIndicators.push('Liian muodollinen kieli');
          }
          
          // Calculate perplexity (simplified)
          const perplexity = Math.max(5, Math.min(50, lexicalDiversity * 100 + Math.random() * 10));
          
          // Calculate burstiness (simplified)
          const burstiness = Math.max(0.1, Math.min(1.0, sentLenVariance / 50));
          
          // Calculate AI score (0-100, higher = more likely AI)
          let aiScore = 0;
          
          // Low lexical diversity increases AI score
          if (lexicalDiversity < 0.5) aiScore += 30;
          else if (lexicalDiversity < 0.6) aiScore += 15;
          
          // Low sentence variance increases AI score
          if (sentLenVariance < 15) aiScore += 25;
          else if (sentLenVariance < 30) aiScore += 10;
          
          // Formal language increases AI score
          if (formalCount > words.length * 0.02) aiScore += 20;
          
          // Low perplexity increases AI score
          if (perplexity < 15) aiScore += 15;
          
          // Low burstiness increases AI score
          if (burstiness < 0.3) aiScore += 10;
          
          // Cap at 100
          aiScore = Math.min(100, aiScore);
          
          // Calculate confidence based on text length and metrics
          const confidence = Math.min(95, 50 + (words.length / 10) + (patterns.length * 5));
          
          // Flag if AI score is high
          const flagged = aiScore >= 60;
          
          const result = {
            aiScore: Math.round(aiScore),
            confidence: Math.round(confidence),
            flagged,
            details: {
              perplexity: Math.round(perplexity * 10) / 10,
              burstiness: Math.round(burstiness * 100) / 100,
              patterns,
              suspiciousIndicators
            },
            timestamp: new Date().toISOString()
          };
          
          console.log('✅ AI detection result:', result);
          return res.status(200).json(result);
        } catch (error: any) {
          console.error('❌ Error in AI detection:', error);
          return res.status(500).json({ message: "Failed to check AI content" });
        }
      }

      // GET /wilma/exams - Get all exams
      if (apiPath === '/wilma/exams' || apiPath.startsWith('/wilma/exams?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/exams');
          try {
            const studentId = req.query.studentId as string | undefined;
            const teacherId = req.query.teacherId as string | undefined;
            const status = req.query.status as string | undefined;
            
            // Mock data for now - replace with real Firestore query
            const exams = [
              {
                id: "1",
                subject: "Matematiikka",
                course: "MAA7 - Derivaatta",
                date: "2026-05-05",
                time: "10:00",
                duration: 90,
                room: "Luokka 301",
                teacher: "M. Virtanen",
                teacherId: "teacher1",
                topics: ["Derivaatan määritelmä", "Derivoimissäännöt", "Sovellukset"],
                status: "upcoming",
                materials: ["Laskin", "Kaavakokoelma"],
                instructions: "Tuo mukanasi laskin ja kaavakokoelma. Älä unohda henkilöllisyystodistusta.",
                studentIds: ["student1", "student2"]
              }
            ];
            
            let filteredExams = exams;
            
            if (studentId) {
              filteredExams = filteredExams.filter(e => e.studentIds.includes(studentId));
            }
            
            if (teacherId) {
              filteredExams = filteredExams.filter(e => e.teacherId === teacherId);
            }
            
            if (status) {
              filteredExams = filteredExams.filter(e => e.status === status);
            }
            
            console.log(`✅ Found ${filteredExams.length} exams`);
            return res.status(200).json(filteredExams);
          } catch (error: any) {
            console.error('❌ Error fetching exams:', error);
            return res.status(500).json({ message: "Failed to fetch exams" });
          }
        }
      }

      // POST /wilma/exams - Create exam
      if (apiPath === '/wilma/exams' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/exams');
        try {
          const examData = req.body;
          
          // Validate required fields
          if (!examData.subject || !examData.date || !examData.time) {
            return res.status(400).json({ message: "Missing required fields" });
          }
          
          // Mock creation - replace with real Firestore
          const newExam = {
            id: `exam_${Date.now()}`,
            ...examData,
            createdAt: new Date().toISOString()
          };
          
          console.log('✅ Exam created:', newExam.id);
          return res.status(201).json(newExam);
        } catch (error: any) {
          console.error('❌ Error creating exam:', error);
          return res.status(500).json({ message: "Failed to create exam" });
        }
      }

      // GET /wilma/exams/:id - Get single exam
      const examMatch = apiPath.match(/^\/wilma\/exams\/([^\/]+)$/);
      if (examMatch && req.method === 'GET') {
        const id = examMatch[1];
        console.log('🔵 GET /api/wilma/exams/' + id);
        
        try {
          // Mock data - replace with real Firestore query
          const exam = {
            id,
            subject: "Matematiikka",
            course: "MAA7 - Derivaatta",
            date: "2026-05-05",
            time: "10:00",
            duration: 90,
            room: "Luokka 301",
            teacher: "M. Virtanen",
            topics: ["Derivaatan määritelmä", "Derivoimissäännöt", "Sovellukset"],
            status: "upcoming",
            materials: ["Laskin", "Kaavakokoelma"],
            instructions: "Tuo mukanasi laskin ja kaavakokoelma."
          };
          
          console.log('✅ Exam found:', id);
          return res.status(200).json(exam);
        } catch (error: any) {
          console.error('❌ Error fetching exam:', error);
          return res.status(500).json({ message: "Failed to fetch exam" });
        }
      }

      // PUT /wilma/exams/:id - Update exam
      if (examMatch && req.method === 'PUT') {
        const id = examMatch[1];
        console.log('🔵 PUT /api/wilma/exams/' + id);
        
        try {
          const updates = req.body;
          
          // Mock update - replace with real Firestore
          const updatedExam = {
            id,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          
          console.log('✅ Exam updated:', id);
          return res.status(200).json(updatedExam);
        } catch (error: any) {
          console.error('❌ Error updating exam:', error);
          return res.status(500).json({ message: "Failed to update exam" });
        }
      }

      // GET /wilma/announcements - Get all announcements
      if (apiPath === '/wilma/announcements' || apiPath.startsWith('/wilma/announcements?')) {
        if (req.method === 'GET') {
          console.log('🔵 GET /api/wilma/announcements');
          try {
            const category = req.query.category as string | undefined;
            const audience = req.query.audience as string | undefined;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
            
            // Mock data - replace with real Firestore query
            const announcements = [
              {
                id: "1",
                title: "Kevätjuhla 15.5.2026",
                content: "Koulun kevätjuhla järjestetään perjantaina 15.5.2026 klo 18:00 koulun juhlasalissa.",
                author: "Rehtori Virtanen",
                authorRole: "Rehtori",
                date: "2026-04-20",
                category: "event",
                isPinned: true,
                targetAudience: ["students", "parents", "teachers"]
              },
              {
                id: "2",
                title: "TÄRKEÄ: Ylioppilaskirjoitukset",
                content: "Kevään 2026 ylioppilaskirjoitusten ilmoittautuminen päättyy 30.4.2026.",
                author: "Opinto-ohjaaja Korhonen",
                authorRole: "Opinto-ohjaaja",
                date: "2026-04-22",
                category: "urgent",
                isPinned: true,
                targetAudience: ["students", "parents"]
              }
            ];
            
            let filteredAnnouncements = announcements;
            
            if (category) {
              filteredAnnouncements = filteredAnnouncements.filter(a => a.category === category);
            }
            
            if (audience) {
              filteredAnnouncements = filteredAnnouncements.filter(a => 
                a.targetAudience.includes(audience)
              );
            }
            
            // Apply limit
            filteredAnnouncements = filteredAnnouncements.slice(0, limit);
            
            console.log(`✅ Found ${filteredAnnouncements.length} announcements`);
            return res.status(200).json(filteredAnnouncements);
          } catch (error: any) {
            console.error('❌ Error fetching announcements:', error);
            return res.status(500).json({ message: "Failed to fetch announcements" });
          }
        }
      }

      // POST /wilma/announcements - Create announcement
      if (apiPath === '/wilma/announcements' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/announcements');
        try {
          const announcementData = req.body;
          
          // Validate required fields
          if (!announcementData.title || !announcementData.content) {
            return res.status(400).json({ message: "Missing required fields" });
          }
          
          // Mock creation - replace with real Firestore
          const newAnnouncement = {
            id: `announcement_${Date.now()}`,
            ...announcementData,
            date: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          };
          
          console.log('✅ Announcement created:', newAnnouncement.id);
          return res.status(201).json(newAnnouncement);
        } catch (error: any) {
          console.error('❌ Error creating announcement:', error);
          return res.status(500).json({ message: "Failed to create announcement" });
        }
      }

      // GET /wilma/announcements/:id - Get single announcement
      const announcementMatch = apiPath.match(/^\/wilma\/announcements\/([^\/]+)$/);
      if (announcementMatch && req.method === 'GET') {
        const id = announcementMatch[1];
        console.log('🔵 GET /api/wilma/announcements/' + id);
        
        try {
          // Mock data - replace with real Firestore query
          const announcement = {
            id,
            title: "Kevätjuhla 15.5.2026",
            content: "Koulun kevätjuhla järjestetään perjantaina 15.5.2026 klo 18:00.",
            author: "Rehtori Virtanen",
            authorRole: "Rehtori",
            date: "2026-04-20",
            category: "event",
            isPinned: true,
            targetAudience: ["students", "parents", "teachers"]
          };
          
          console.log('✅ Announcement found:', id);
          return res.status(200).json(announcement);
        } catch (error: any) {
          console.error('❌ Error fetching announcement:', error);
          return res.status(500).json({ message: "Failed to fetch announcement" });
        }
      }

      // PUT /wilma/announcements/:id - Update announcement
      if (announcementMatch && req.method === 'PUT') {
        const id = announcementMatch[1];
        console.log('🔵 PUT /api/wilma/announcements/' + id);
        
        try {
          const updates = req.body;
          
          // Mock update - replace with real Firestore
          const updatedAnnouncement = {
            id,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          
          console.log('✅ Announcement updated:', id);
          return res.status(200).json(updatedAnnouncement);
        } catch (error: any) {
          console.error('❌ Error updating announcement:', error);
          return res.status(500).json({ message: "Failed to update announcement" });
        }
      }
    }
    
    // GET /wilma/teachers - Get all teachers
    if (apiPath === '/wilma/teachers' && req.method === 'GET') {
      console.log('👨‍🏫 GET /api/wilma/teachers called');
      
      try {
        const teachers = await storage.getWilmaUsers();
        const teacherList = teachers.filter((user: any) => 
          user.role === 'teacher' || (user.roles && user.roles.includes('teacher'))
        );
        return res.status(200).json(teacherList);
      } catch (error: any) {
        console.error('❌ Error fetching teachers:', error);
        return res.status(200).json([]);
      }
    }
    
    // ============================================
    // WILMA DESKTOP ENVIRONMENT API
    // ============================================
    
    // GET /wilma/desktop/settings - Get desktop settings
    if (apiPath === '/wilma/desktop/settings' && req.method === 'GET') {
      console.log('🖥️ GET /api/wilma/desktop/settings called');
      
      try {
        let settings = await storage.getWilmaDesktopSettings();
        
        // If no settings exist, return defaults
        if (!settings) {
          settings = {
            enabled: false,
            defaultWallpaper: "/wilma-bg.jpg",
            defaultTheme: "light",
            allowCustomWallpaper: true,
            allowCustomTheme: true,
            availableApps: [],
            defaultApps: [],
          };
        }
        
        return res.status(200).json(settings);
      } catch (error: any) {
        console.error('❌ Error fetching desktop settings:', error);
        // Return defaults on error instead of 500
        return res.status(200).json({
          enabled: false,
          defaultWallpaper: "/wilma-bg.jpg",
          defaultTheme: "light",
          allowCustomWallpaper: true,
          allowCustomTheme: true,
          availableApps: [],
          defaultApps: [],
        });
      }
    }
    
    // POST /wilma/desktop/settings - Create/Update desktop settings (alias for PUT)
    if (apiPath === '/wilma/desktop/settings' && req.method === 'POST') {
      console.log('🖥️ POST /api/wilma/desktop/settings called');
      
      try {
        const settings = await storage.updateWilmaDesktopSettings(req.body);
        return res.status(200).json(settings);
      } catch (error: any) {
        console.error('❌ Error updating desktop settings:', error);
        return res.status(500).json({ message: "Failed to update desktop settings" });
      }
    }
    
    // PUT /wilma/desktop/settings - Update desktop settings
    if (apiPath === '/wilma/desktop/settings' && req.method === 'PUT') {
      console.log('🖥️ PUT /api/wilma/desktop/settings called');
      
      try {
        const settings = await storage.updateWilmaDesktopSettings(req.body);
        console.log('✅ Desktop settings updated');
        return res.status(200).json(settings);
      } catch (error: any) {
        console.error('❌ Error updating desktop settings:', error);
        return res.status(500).json({ message: "Failed to update desktop settings" });
      }
    }
    
    // GET /wilma/desktop/apps - Get all desktop apps
    if (apiPath === '/wilma/desktop/apps' && req.method === 'GET') {
      console.log('🖥️ GET /api/wilma/desktop/apps called');
      
      try {
        const apps = await storage.getWilmaDesktopApps();
        return res.status(200).json(apps);
      } catch (error: any) {
        console.error('❌ Error fetching desktop apps:', error);
        return res.status(500).json({ message: "Failed to fetch desktop apps" });
      }
    }
    
    // POST /wilma/desktop/apps - Create desktop app
    if (apiPath === '/wilma/desktop/apps' && req.method === 'POST') {
      console.log('🖥️ POST /api/wilma/desktop/apps called');
      
      try {
        const app = await storage.createWilmaDesktopApp(req.body);
        console.log('✅ Desktop app created:', app.appId);
        return res.status(201).json(app);
      } catch (error: any) {
        console.error('❌ Error creating desktop app:', error);
        return res.status(500).json({ message: "Failed to create desktop app" });
      }
    }
    
    // PUT /wilma/desktop/apps/:id - Update desktop app
    const updateAppMatch = apiPath.match(/^\/wilma\/desktop\/apps\/(\d+)$/);
    if (updateAppMatch && req.method === 'PUT') {
      const id = parseInt(updateAppMatch[1]);
      console.log('🖥️ PUT /api/wilma/desktop/apps/' + id);
      
      try {
        const app = await storage.updateWilmaDesktopApp(id, req.body);
        console.log('✅ Desktop app updated:', id);
        return res.status(200).json(app);
      } catch (error: any) {
        console.error('❌ Error updating desktop app:', error);
        return res.status(500).json({ message: "Failed to update desktop app" });
      }
    }
    
    // DELETE /wilma/desktop/apps/:id - Delete desktop app
    const deleteAppMatch = apiPath.match(/^\/wilma\/desktop\/apps\/(\d+)$/);
    if (deleteAppMatch && req.method === 'DELETE') {
      const id = parseInt(deleteAppMatch[1]);
      console.log('🖥️ DELETE /api/wilma/desktop/apps/' + id);
      
      try {
        await storage.deleteWilmaDesktopApp(id);
        console.log('✅ Desktop app deleted:', id);
        return res.status(204).send();
      } catch (error: any) {
        console.error('❌ Error deleting desktop app:', error);
        return res.status(500).json({ message: "Failed to delete desktop app" });
      }
    }
    
    // GET /wilma/desktop/config/:userId - Get user desktop config
    const getUserConfigMatch = apiPath.match(/^\/wilma\/desktop\/config\/([^\/]+)$/);
    if (getUserConfigMatch && req.method === 'GET') {
      const userId = parseInt(getUserConfigMatch[1]);
      console.log('🖥️ GET /api/wilma/desktop/config/' + userId);
      
      try {
        let config = await storage.getWilmaUserDesktopConfig(userId);
        
        // If no config exists, create default one
        if (!config) {
          const settings = await storage.getWilmaDesktopSettings();
          config = await storage.createWilmaUserDesktopConfig({
            userId,
            wallpaper: settings?.defaultWallpaper || "/wilma-bg.jpg",
            theme: settings?.defaultTheme || "light",
            installedApps: settings?.defaultApps || [],
            desktopLayout: {},
            pinnedApps: [],
            recentApps: [],
            customSettings: {},
          });
        }
        
        return res.status(200).json(config);
      } catch (error: any) {
        console.error('❌ Error fetching user desktop config:', error);
        return res.status(500).json({ message: "Failed to fetch user desktop config" });
      }
    }
    
    // PUT /wilma/desktop/config/:userId - Update user desktop config
    const updateUserConfigMatch = apiPath.match(/^\/wilma\/desktop\/config\/([^\/]+)$/);
    if (updateUserConfigMatch && req.method === 'PUT') {
      const userId = parseInt(updateUserConfigMatch[1]);
      console.log('🖥️ PUT /api/wilma/desktop/config/' + userId);
      
      try {
        const config = await storage.updateWilmaUserDesktopConfig(userId, req.body);
        console.log('✅ User desktop config updated:', userId);
        return res.status(200).json(config);
      } catch (error: any) {
        console.error('❌ Error updating user desktop config:', error);
        return res.status(500).json({ message: "Failed to update user desktop config" });
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
        '/wilma/users',
        '/wilma/login',
        '/wilma/exams',
        '/wilma/announcements',
        '/test-email (POST)'
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
