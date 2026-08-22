/**
 * KSYK Maps — 100-user load test
 *
 * Simulates a typical quiet school period: ~100 concurrent students
 * checking timetables, searching rooms, and occasionally navigating.
 *
 * Usage:
 *   k6 run tests/load/scenario-100.js --env BASE_URL=https://ksykmaps.fi
 *
 * Thresholds (targets for 100 VU):
 *   - 95th percentile response < 800 ms
 *   - Error rate < 1%
 *   - Search p95 < 500 ms
 */

import { sleep } from 'k6';
import { studentFlow, navigationFlow, fingerprintDownload, adminFlow, errorRate, searchTime, mapLoadTime, wifiLocTime } from './shared.js';

export const options = {
  scenarios: {
    students: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m',  target: 50  },   // ramp up to 50 VUs
        { duration: '2m',  target: 100 },   // ramp to 100 VUs
        { duration: '5m',  target: 100 },   // hold at 100 VUs
        { duration: '1m',  target: 0   },   // ramp down
      ],
      gracefulRampDown: '30s',
    },
    navigators: {
      executor: 'constant-vus',
      vus: 10,                              // 10% of users actively navigating
      duration: '9m',
      startTime: '0m',
    },
    fingerprint_refresh: {
      executor: 'constant-arrival-rate',
      rate: 2,                              // 2 app starts per minute
      timeUnit: '1m',
      duration: '9m',
      preAllocatedVUs: 3,
      maxVUs: 5,
    },
  },

  thresholds: {
    'http_req_duration':   ['p(95)<800', 'p(99)<1500'],
    'http_req_failed':     ['rate<0.01'],   // < 1% HTTP failures
    errors:                ['rate<0.01'],
    search_duration_ms:    ['p(95)<500'],
    map_load_duration_ms:  ['p(95)<600'],
    wifi_locate_duration_ms: ['p(95)<1000'],
  },

  summaryTrendStats: ['min', 'med', 'avg', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  studentFlow();
  sleep(Math.random() * 2 + 1);   // 1–3 s between page interactions
}

export function navigators() {
  navigationFlow();
  sleep(5);   // navigate-mode: 5 s between scans (matches Android Navigate mode)
}

export function fingerprint_refresh() {
  fingerprintDownload();
}
