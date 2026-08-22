/**
 * KSYK Maps — 500-user load test
 *
 * Simulates a peak school event: morning rush when all students check
 * their first-period classroom at the same time (~500 concurrent).
 *
 * Usage:
 *   k6 run tests/load/scenario-500.js --env BASE_URL=https://ksykmaps.fi
 *
 * Thresholds (targets for 500 VU):
 *   - 95th percentile response < 1 500 ms
 *   - Error rate < 2%
 *   - Database layer must not saturate (watch Supabase connection pool)
 */

import { sleep } from 'k6';
import { studentFlow, navigationFlow, fingerprintDownload, adminFlow, errorRate, searchTime, mapLoadTime, wifiLocTime } from './shared.js';

export const options = {
  scenarios: {
    morning_rush: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 200 },   // ramp to 200 VUs
        { duration: '3m',  target: 500 },   // ramp to 500 VUs — peak
        { duration: '5m',  target: 500 },   // sustain peak for 5 min
        { duration: '2m',  target: 100 },   // settle post-bell
        { duration: '1m',  target: 0   },   // ramp down
      ],
      gracefulRampDown: '30s',
    },
    navigators: {
      executor: 'constant-vus',
      vus: 50,                              // 10% navigating
      duration: '13m',
      startTime: '0m',
    },
    admins: {
      executor: 'constant-vus',
      vus: 2,
      duration: '13m',
      startTime: '0m',
    },
  },

  thresholds: {
    'http_req_duration':   ['p(95)<1500', 'p(99)<3000'],
    'http_req_failed':     ['rate<0.02'],
    errors:                ['rate<0.02'],
    search_duration_ms:    ['p(95)<1000'],
    map_load_duration_ms:  ['p(95)<1200'],
    wifi_locate_duration_ms: ['p(95)<2000'],
  },

  summaryTrendStats: ['min', 'med', 'avg', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  studentFlow();
  sleep(Math.random() * 1.5 + 0.5);   // 0.5–2 s — busier, shorter think time
}

export function navigators() {
  navigationFlow();
  sleep(5);
}

export function admins() {
  adminFlow();
  sleep(10);
}
