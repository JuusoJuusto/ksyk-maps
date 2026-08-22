/**
 * Shared helpers for KSYK Maps k6 load tests.
 *
 * Run any scenario:
 *   k6 run tests/load/scenario-100.js  --env BASE_URL=https://ksykmaps.fi
 *   k6 run tests/load/scenario-500.js  --env BASE_URL=https://ksykmaps.fi
 *   k6 run tests/load/scenario-1000.js --env BASE_URL=https://ksykmaps.fi
 *
 * Required environment variables:
 *   BASE_URL — e.g. https://ksykmaps.fi or http://localhost:5000
 *
 * Optional:
 *   ADMIN_TOKEN — Bearer token for routes that require authentication.
 *                 If omitted, authenticated-only flows are skipped.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const errorRate   = new Rate('errors');
export const searchTime  = new Trend('search_duration_ms', true);
export const mapLoadTime = new Trend('map_load_duration_ms', true);
export const wifiLocTime = new Trend('wifi_locate_duration_ms', true);

export const BASE_URL    = __ENV.BASE_URL || 'http://localhost:5000';
export const ADMIN_TOKEN = __ENV.ADMIN_TOKEN || '';

// Standard headers that mimic the web client so Cloudflare doesn't bot-block.
export const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-KSYK-Client': 'KSYK-Maps-LoadTest/1.0',
};

// Representative room IDs to look up — edit with real IDs from your DB.
const SAMPLE_ROOMS = ['204', '314', '112', 'library', '101'];
// Representative search queries.
const SEARCH_QUERIES = ['math', '204', 'physics', 'library', 'gym', '3'];
// Fake Wi-Fi readings for positioning smoke tests.
const FAKE_READINGS = [
  { bssid: 'aa:bb:cc:11:22:33', rssi: -48, ssid: 'KSYK' },
  { bssid: 'aa:bb:cc:44:55:66', rssi: -61, ssid: 'KSYK' },
  { bssid: 'aa:bb:cc:77:88:99', rssi: -73, ssid: 'KSYK' },
  { bssid: 'aa:bb:cc:aa:bb:cc', rssi: -81, ssid: 'KSYK-5G' },
];

/** Pick a random element from an array. */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Assert response status and count errors. */
export function expect(res, status, label) {
  const ok = check(res, {
    [`${label}: status ${status}`]: (r) => r.status === status,
    [`${label}: body non-empty`]:   (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!ok);
  return ok;
}

/**
 * Core "student" workflow — the primary production scenario.
 * Represents a student opening the app, checking timetable, and searching
 * for a room. No authentication required.
 */
export function studentFlow() {
  // 1. Health check / app load
  {
    const res = http.get(`${BASE_URL}/api/health`, { headers: HEADERS });
    expect(res, 200, 'health');
    mapLoadTime.add(res.timings.duration);
  }

  sleep(Math.random() * 0.5 + 0.2); // 200–700 ms think time

  // 2. Load buildings (map initialisation)
  {
    const res = http.get(`${BASE_URL}/api/buildings`, { headers: HEADERS });
    expect(res, 200, 'buildings');
    mapLoadTime.add(res.timings.duration);
  }

  sleep(Math.random() * 0.3 + 0.1);

  // 3. Load rooms for a building (floor plan)
  {
    const res = http.get(`${BASE_URL}/api/rooms?limit=50&offset=0`, { headers: HEADERS });
    expect(res, 200, 'rooms-list');
  }

  sleep(Math.random() * 0.5 + 0.2);

  // 4. Search for a room
  {
    const q = pick(SEARCH_QUERIES);
    const res = http.get(`${BASE_URL}/api/rooms/search?q=${encodeURIComponent(q)}`, { headers: HEADERS });
    expect(res, 200, 'room-search');
    searchTime.add(res.timings.duration);
  }

  sleep(Math.random() * 0.4 + 0.2);

  // 5. Wi-Fi fingerprint count (positioning initialisation)
  {
    const res = http.get(`${BASE_URL}/api/wifi/locate`, { headers: HEADERS });
    expect(res, 200, 'wifi-status');
  }

  sleep(Math.random() * 0.3 + 0.1);
}

/**
 * Active navigation workflow — heavier. Simulates a student actively
 * navigating with Wi-Fi positioning enabled (Navigate mode = 5s scans).
 */
export function navigationFlow() {
  // Wi-Fi locate (server-side KNN)
  const body = JSON.stringify({ readings: FAKE_READINGS });
  const res = http.post(`${BASE_URL}/api/wifi/locate`, body, { headers: HEADERS });
  // 200 (match found) or 404 (no fingerprints yet) are both acceptable
  check(res, {
    'wifi-locate: status ok': (r) => r.status === 200 || r.status === 404,
    'wifi-locate: not 5xx':   (r) => r.status < 500,
  });
  errorRate.add(res.status >= 500);
  wifiLocTime.add(res.timings.duration);

  sleep(Math.random() * 0.2 + 0.1);
}

/**
 * Fingerprint download — simulates Android app refreshing its local DB.
 * Called infrequently (once per app start) so weight is low.
 */
export function fingerprintDownload() {
  const res = http.get(`${BASE_URL}/api/wifi/fingerprints`, { headers: HEADERS });
  expect(res, 200, 'fingerprints-dl');
}

/**
 * Admin background job — only runs if ADMIN_TOKEN is provided.
 * Simulates an admin loading the log viewer or Wi-Fi dashboard.
 */
export function adminFlow() {
  if (!ADMIN_TOKEN) return;
  const authHeaders = { ...HEADERS, Authorization: `Bearer ${ADMIN_TOKEN}` };

  const res = http.get(`${BASE_URL}/api/logs?limit=50`, { headers: authHeaders });
  expect(res, 200, 'admin-logs');

  sleep(Math.random() * 1 + 0.5);
}
