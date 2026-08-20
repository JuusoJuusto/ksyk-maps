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
 */

import http from "k6/http";
import { sleep, check, group } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "https://www.ksykmaps.fi";

// Custom metrics
const errorRate     = new Rate("ksyk_error_rate");
const searchLatency = new Trend("ksyk_search_latency", true);
const mapPkgLatency = new Trend("ksyk_map_package_latency", true);
const apiErrors     = new Counter("ksyk_api_errors");

// ── Thresholds (pass/fail criteria) ──────────────────────────────────────────

export const options = {
  thresholds: {
    // Overall error rate must stay below 1%
    ksyk_error_rate:              ["rate<0.01"],
    // 95th-percentile latency for the room search API < 500 ms
    ksyk_search_latency:          ["p(95)<500"],
    // 95th-percentile for the heavy map-package download < 2 s
    ksyk_map_package_latency:     ["p(95)<2000"],
    // All HTTP requests combined: p95 < 1 s, p99 < 2 s
    http_req_duration:            ["p(95)<1000", "p(99)<2000"],
    // HTTP failure rate (4xx/5xx) < 1%
    http_req_failed:              ["rate<0.01"],
  },

  // ── Ramp scenario — 100 → 250 → 500 → 750 → 1000 (hold 10 min) → 1500 → 2000 ──
  scenarios: {
    ramp_to_breaking_point: {
      executor: "ramping-vus",
      startVUs: 0,
      gracefulStop: "30s",
      stages: [
        { duration: "1m",  target: 100  },  // warm up to 100 VUs
        { duration: "2m",  target: 100  },  // hold at 100
        { duration: "1m",  target: 250  },  // ramp to 250
        { duration: "2m",  target: 250  },  // hold at 250
        { duration: "1m",  target: 500  },  // ramp to 500
        { duration: "2m",  target: 500  },  // hold at 500
        { duration: "1m",  target: 750  },  // ramp to 750
        { duration: "2m",  target: 750  },  // hold at 750
        { duration: "1m",  target: 1000 },  // ramp to 1 000
        { duration: "10m", target: 1000 },  // SUSTAINED — hold 10 min at 1 000
        { duration: "2m",  target: 1500 },  // push to 1 500 (find breaking point)
        { duration: "2m",  target: 2000 },  // push to 2 000
        { duration: "1m",  target: 0    },  // cool down
      ],
    },
  },
};

// ── Shared request params ─────────────────────────────────────────────────────

const HEADERS = {
  "Accept":          "application/json",
  "Accept-Language": "fi,en;q=0.9",
  "User-Agent":      "k6-ksykmaps-loadtest/1.0",
};

const PARAMS = { headers: HEADERS, timeout: "10s" };

// ── Helper: assert + record error ────────────────────────────────────────────

function assertOK(res, tag) {
  const ok = check(res, {
    [`${tag}: status 200`]: (r) => r.status === 200,
    [`${tag}: has body`]:   (r) => r.body && r.body.length > 0,
  });
  errorRate.add(!ok);
  if (!ok) apiErrors.add(1);
  return ok;
}

// ── Simulated room names users might search for ───────────────────────────────

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

  // 1. Landing page load
  group("landing", () => {
    const res = http.get(`${BASE_URL}/`, PARAMS);
    check(res, { "homepage: 200 or 304": (r) => r.status === 200 || r.status === 304 });
    errorRate.add(res.status >= 400);
  });

  sleep(Math.random() * 1 + 0.5); // 0.5–1.5 s reading the page

  // 2. Parallel initial API burst — what the React app fires on mount
  group("initial_api_burst", () => {
    const responses = http.batch([
      ["GET", `${BASE_URL}/api/auth/user`,              null, PARAMS],
      ["GET", `${BASE_URL}/api/settings`,               null, PARAMS],
      ["GET", `${BASE_URL}/api/map-defaults`,           null, PARAMS],
      ["GET", `${BASE_URL}/api/announcements`,          null, PARAMS],
      ["GET", `${BASE_URL}/api/appearance-settings`,    null, PARAMS],
    ]);

    assertOK(responses[0], "auth/user");
    assertOK(responses[1], "settings");
    assertOK(responses[2], "map-defaults");
    // announcements and appearance may be empty — just check 2xx
    check(responses[3], { "announcements: 2xx": (r) => r.status < 400 });
    check(responses[4], { "appearance-settings: 2xx": (r) => r.status < 400 });
  });

  sleep(Math.random() * 0.5 + 0.3);

  // 3. Map package — heaviest request; user waits for the campus to render
  group("map_package", () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/map-package/published`, PARAMS);
    mapPkgLatency.add(Date.now() - start);
    assertOK(res, "map-package/published");
  });

  sleep(Math.random() * 2 + 1); // 1–3 s exploring the map

  // 4. Floor/room data (parallel — overlay installer fires these)
  group("campus_data", () => {
    const responses = http.batch([
      ["GET", `${BASE_URL}/api/buildings`, null, PARAMS],
      ["GET", `${BASE_URL}/api/floors`,    null, PARAMS],
      ["GET", `${BASE_URL}/api/rooms`,     null, PARAMS],
      ["GET", `${BASE_URL}/api/pois`,      null, PARAMS],
    ]);
    assertOK(responses[0], "buildings");
    assertOK(responses[1], "floors");
    assertOK(responses[2], "rooms");
    check(responses[3], { "pois: 2xx": (r) => r.status < 400 });
  });

  sleep(Math.random() * 1.5 + 0.5);

  // 5. Room search — simulates a user typing in the search box
  group("room_search", () => {
    const q = randomSearch();
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/rooms/search?q=${encodeURIComponent(q)}`, PARAMS);
    searchLatency.add(Date.now() - start);
    check(res, { "search: 2xx": (r) => r.status < 400 });
    errorRate.add(res.status >= 400);
  });

  sleep(Math.random() * 1 + 0.5);

  // 6. ~40% of users check the lunch menu
  if (Math.random() < 0.4) {
    group("lunch_menu", () => {
      const res = http.get(`${BASE_URL}/api/lunch-menu`, PARAMS);
      check(res, { "lunch-menu: 2xx": (r) => r.status < 400 });
      errorRate.add(res.status >= 400);
    });
    sleep(Math.random() * 1 + 0.5);
  }

  // 7. ~20% of users look at events / announcements
  if (Math.random() < 0.2) {
    group("events", () => {
      const res = http.get(`${BASE_URL}/api/events`, PARAMS);
      check(res, { "events: 2xx": (r) => r.status < 400 });
    });
  }

  // 8. Think time before the next "page interaction"
  sleep(Math.random() * 2 + 1); // 1–3 s
}
