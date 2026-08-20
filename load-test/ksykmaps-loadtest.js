/**
 * KSYK Maps — k6 load test
 *
 * Tests the realistic user journey: open map, load data, search,
 * view lunch menu. Ramps from 100 to 2 000 VUs to find the
 * breaking point.
 *
 * Install:  https://k6.io/docs/getting-started/installation/
 * Run full: k6 run ksykmaps-loadtest.js
 * Quick:    k6 run --vus 50 --duration 1m ksykmaps-loadtest.js
 * Smoke:    k6 run --vus 5  --duration 30s ksykmaps-loadtest.js
 *
 * Target against production:  BASE_URL=https://www.ksykmaps.fi k6 run ksykmaps-loadtest.js
 * Target against local dev:   BASE_URL=http://localhost:5000    k6 run ksykmaps-loadtest.js
 *
 * Vercel note: Vercel's edge firewall blocks obvious bot User-Agents and
 * requests missing standard browser headers. The HEADERS block below
 * mimics a real Chrome browser session so requests pass the WAF check.
 * If Vercel's "Attack Challenge Mode" is ON, add the _vercel_jwt cookie
 * (grab it from a real browser session in DevTools → Application → Cookies).
 */

import http from "k6/http";
import { sleep, check, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "https://www.ksykmaps.fi";

// Optional: paste a real session cookie here if Vercel challenge mode is on.
// Get it from: browser DevTools → Application → Cookies → _vercel_jwt
// Leave empty string to skip.
const VERCEL_JWT = __ENV.VERCEL_JWT || "";

// Custom metrics
const errorRate     = new Rate("ksyk_error_rate");
const searchLatency = new Trend("ksyk_search_latency", true);
const mapPkgLatency = new Trend("ksyk_map_package_latency", true);
const apiErrors     = new Counter("ksyk_api_errors");
const rateLimited   = new Counter("ksyk_rate_limited_429");

// ── Thresholds (pass/fail criteria) ──────────────────────────────────────────

export const options = {
  thresholds: {
    ksyk_error_rate:          ["rate<0.01"],   // <1% errors overall
    ksyk_search_latency:      ["p(95)<500"],   // room search p95 < 500 ms
    ksyk_map_package_latency: ["p(95)<2000"],  // map package p95 < 2 s
    http_req_duration:        ["p(95)<1000", "p(99)<2000"],
    http_req_failed:          ["rate<0.01"],
  },

  // ── Ramp: 100 → 250 → 500 → 750 → 1000 (hold 10 min) → 1500 → 2000 ──
  scenarios: {
    ramp_to_breaking_point: {
      executor: "ramping-vus",
      startVUs: 0,
      gracefulStop: "30s",
      stages: [
        { duration: "1m",  target: 100  },
        { duration: "2m",  target: 100  },
        { duration: "1m",  target: 250  },
        { duration: "2m",  target: 250  },
        { duration: "1m",  target: 500  },
        { duration: "2m",  target: 500  },
        { duration: "1m",  target: 750  },
        { duration: "2m",  target: 750  },
        { duration: "1m",  target: 1000 },
        { duration: "10m", target: 1000 }, // sustained load target
        { duration: "2m",  target: 1500 },
        { duration: "2m",  target: 2000 }, // breakpoint hunt
        { duration: "1m",  target: 0    },
      ],
    },
  },
};

// ── Browser-realistic headers ─────────────────────────────────────────────────
// Vercel's WAF rejects requests that look like bots. We use a real Chrome UA
// and the same Accept/sec-fetch headers a browser sends so the requests pass
// the edge firewall without triggering challenge pages.

function buildHeaders(path) {
  const isApi = path.startsWith("/api/");
  const headers = {
    "User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Accept":                    isApi ? "application/json, text/plain, */*" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language":           "fi-FI,fi;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding":           "gzip, deflate, br",
    "Connection":                "keep-alive",
    "Cache-Control":             "no-cache",
    "Pragma":                    "no-cache",
    "Referer":                   `${BASE_URL}/`,
    "Origin":                    BASE_URL,
    "sec-ch-ua":                 '"Chromium";v="127", "Not)A;Brand";v="99"',
    "sec-ch-ua-mobile":          "?0",
    "sec-ch-ua-platform":        '"Windows"',
    "sec-fetch-dest":            isApi ? "empty" : "document",
    "sec-fetch-mode":            isApi ? "cors"  : "navigate",
    "sec-fetch-site":            isApi ? "same-origin" : "none",
    "sec-fetch-user":            isApi ? undefined : "?1",
    "DNT":                       "1",
    "Upgrade-Insecure-Requests": isApi ? undefined : "1",
  };

  // Strip undefined values (k6 sends them as the string "undefined" otherwise)
  Object.keys(headers).forEach((k) => headers[k] === undefined && delete headers[k]);

  if (VERCEL_JWT) {
    headers["Cookie"] = `_vercel_jwt=${VERCEL_JWT}`;
  }

  return headers;
}

function params(path) {
  return { headers: buildHeaders(path), timeout: "15s" };
}

// ── Helper: assert + record error ─────────────────────────────────────────────

function assertOK(res, tag) {
  // 429 = Vercel rate limit — back off, don't count as test failure
  if (res.status === 429) {
    rateLimited.add(1);
    console.warn(`[RATE_LIMITED] ${tag} — sleeping 5s`);
    sleep(5);
    return false;
  }

  // 403 on Vercel usually means challenge page — log so user knows to set VERCEL_JWT
  if (res.status === 403) {
    console.warn(`[BLOCKED_403] ${tag} — Vercel WAF may need VERCEL_JWT cookie`);
    errorRate.add(1);
    apiErrors.add(1);
    return false;
  }

  const ok = check(res, {
    [`${tag}: status 200`]: (r) => r.status === 200,
    [`${tag}: has body`]:   (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!ok);
  if (!ok) apiErrors.add(1);
  return ok;
}

// ── Room search terms ─────────────────────────────────────────────────────────

const SEARCH_TERMS = [
  "A1", "A2", "B3", "K32", "library", "kirjasto",
  "WC", "gym", "sali", "cafeteria", "kanttiini",
  "office", "toimisto", "lab", "luokka",
];

function randomSearch() {
  return SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
}

// ── Main VU scenario ──────────────────────────────────────────────────────────

export default function () {

  // 1. Landing page
  group("landing", () => {
    const res = http.get(`${BASE_URL}/`, params("/"));
    check(res, { "homepage: 200 or 304": (r) => r.status === 200 || r.status === 304 });
    errorRate.add(res.status >= 400 && res.status !== 304);
  });

  sleep(Math.random() * 1 + 0.5);

  // 2. Parallel initial API burst — mirrors what React fires on mount
  group("initial_api_burst", () => {
    const responses = http.batch([
      ["GET", `${BASE_URL}/api/auth/user`,           null, params("/api/auth/user")],
      ["GET", `${BASE_URL}/api/settings`,            null, params("/api/settings")],
      ["GET", `${BASE_URL}/api/map-defaults`,        null, params("/api/map-defaults")],
      ["GET", `${BASE_URL}/api/announcements`,       null, params("/api/announcements")],
      ["GET", `${BASE_URL}/api/appearance-settings`, null, params("/api/appearance-settings")],
    ]);

    assertOK(responses[0], "auth/user");
    assertOK(responses[1], "settings");
    assertOK(responses[2], "map-defaults");
    check(responses[3], { "announcements: 2xx": (r) => r.status < 400 });
    check(responses[4], { "appearance-settings: 2xx": (r) => r.status < 400 });
  });

  sleep(Math.random() * 0.5 + 0.3);

  // 3. Map package — heaviest request; campus renders after this
  group("map_package", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/map-package/published`, params("/api/map-package/published"));
    mapPkgLatency.add(Date.now() - start);
    assertOK(res, "map-package/published");
  });

  sleep(Math.random() * 2 + 1);

  // 4. Campus data (parallel)
  group("campus_data", () => {
    const responses = http.batch([
      ["GET", `${BASE_URL}/api/buildings`, null, params("/api/buildings")],
      ["GET", `${BASE_URL}/api/floors`,    null, params("/api/floors")],
      ["GET", `${BASE_URL}/api/rooms`,     null, params("/api/rooms")],
      ["GET", `${BASE_URL}/api/pois`,      null, params("/api/pois")],
    ]);
    assertOK(responses[0], "buildings");
    assertOK(responses[1], "floors");
    assertOK(responses[2], "rooms");
    check(responses[3], { "pois: 2xx": (r) => r.status < 400 });
  });

  sleep(Math.random() * 1.5 + 0.5);

  // 5. Room search
  group("room_search", () => {
    const q = randomSearch();
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/api/rooms/search?q=${encodeURIComponent(q)}`,
      params("/api/rooms/search")
    );
    searchLatency.add(Date.now() - start);
    check(res, { "search: 2xx": (r) => r.status < 400 });
    errorRate.add(res.status >= 400);
  });

  sleep(Math.random() * 1 + 0.5);

  // 6. ~40% check lunch menu
  if (Math.random() < 0.4) {
    group("lunch_menu", () => {
      const res = http.get(`${BASE_URL}/api/lunch-menu`, params("/api/lunch-menu"));
      check(res, { "lunch-menu: 2xx": (r) => r.status < 400 });
      errorRate.add(res.status >= 400);
    });
    sleep(Math.random() * 1 + 0.5);
  }

  // 7. ~20% check events
  if (Math.random() < 0.2) {
    group("events", () => {
      const res = http.get(`${BASE_URL}/api/events`, params("/api/events"));
      check(res, { "events: 2xx": (r) => r.status < 400 });
    });
  }

  sleep(Math.random() * 2 + 1);
}
