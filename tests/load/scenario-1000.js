/**
 * KSYK Maps — 1 000-user stress test
 *
 * Simulates a worst-case scenario: school-wide event where every student
 * and teacher hits the app simultaneously. Validates that the platform
 * doesn't collapse under maximum foreseeable load.
 *
 * This test is intentionally harsh — some threshold breaches are expected
 * at 1 000 VU without horizontal scaling. The goal is to measure WHERE
 * the system degrades, not to pass cleanly.
 *
 * Usage:
 *   k6 run tests/load/scenario-1000.js --env BASE_URL=https://ksykmaps.fi
 *
 * What to watch:
 *   - Supabase connection pool exhaustion (typically first bottleneck)
 *   - Vercel serverless cold starts / concurrency limit
 *   - /api/wifi/locate rate limiter (15 req/min per IP)
 *   - Memory on the Express local-dev server (not relevant on Vercel)
 */

import { sleep } from 'k6';
import { studentFlow, navigationFlow, fingerprintDownload, adminFlow, errorRate, searchTime, mapLoadTime, wifiLocTime } from './shared.js';

export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 200  },   // warm up
        { duration: '3m',  target: 500  },   // ramp to 500
        { duration: '3m',  target: 1000 },   // ramp to 1 000 (peak)
        { duration: '5m',  target: 1000 },   // hold peak
        { duration: '2m',  target: 200  },   // step down
        { duration: '1m',  target: 0    },   // ramp down
      ],
      gracefulRampDown: '30s',
    },
    navigators: {
      executor: 'constant-vus',
      vus: 80,                               // ~8% navigating
      duration: '16m',
      startTime: '0m',
    },
    admins: {
      executor: 'constant-vus',
      vus: 5,
      duration: '16m',
      startTime: '0m',
    },
    fingerprint_refresh: {
      executor: 'constant-arrival-rate',
      rate: 20,                              // 20 app opens per minute at peak
      timeUnit: '1m',
      duration: '16m',
      preAllocatedVUs: 10,
      maxVUs: 20,
    },
  },

  // Looser thresholds — at 1 000 VU we accept some slowdown.
  // Fix violations before claiming production-readiness at this scale.
  thresholds: {
    'http_req_duration':   ['p(95)<3000', 'p(99)<6000'],
    'http_req_failed':     ['rate<0.05'],    // < 5% hard errors at peak
    errors:                ['rate<0.05'],
    search_duration_ms:    ['p(95)<2000'],
    map_load_duration_ms:  ['p(95)<2500'],
    wifi_locate_duration_ms: ['p(95)<4000'],
  },

  summaryTrendStats: ['min', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  studentFlow();
  sleep(Math.random() * 1 + 0.3);   // 0.3–1.3 s think time (stressed users are impatient)
}

export function navigators() {
  navigationFlow();
  sleep(5);
}

export function admins() {
  adminFlow();
  sleep(15);
}

export function fingerprint_refresh() {
  fingerprintDownload();
}
