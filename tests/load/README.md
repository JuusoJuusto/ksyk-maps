# KSYK Maps — Load Tests

k6 load test scripts for verifying scalability at 100 / 500 / 1 000 concurrent users.

## Prerequisites

Install k6: https://k6.io/docs/getting-started/installation/

```
# macOS
brew install k6

# Windows (winget)
winget install k6 --source winget

# Docker
docker pull grafana/k6
```

## Running

```bash
# 100-user scenario (typical school period)
k6 run tests/load/scenario-100.js --env BASE_URL=https://ksykmaps.fi

# 500-user scenario (morning rush)
k6 run tests/load/scenario-500.js --env BASE_URL=https://ksykmaps.fi

# 1000-user stress test
k6 run tests/load/scenario-1000.js --env BASE_URL=https://ksykmaps.fi

# With admin token (enables authenticated flows)
k6 run tests/load/scenario-500.js \
  --env BASE_URL=https://ksykmaps.fi \
  --env ADMIN_TOKEN=your-hmac-token

# Local dev server
k6 run tests/load/scenario-100.js --env BASE_URL=http://localhost:5000
```

## Scenarios

| File | VUs | Duration | Purpose |
|------|-----|----------|---------|
| `scenario-100.js` | 0→100 | ~9 min | Baseline: quiet period |
| `scenario-500.js` | 0→500 | ~13 min | Peak: morning bell |
| `scenario-1000.js` | 0→1000 | ~16 min | Stress: all-school event |

## What is tested

| Endpoint | Weight |
|----------|--------|
| `GET /api/health` | Every student flow |
| `GET /api/buildings` | Every map load |
| `GET /api/rooms` | Every floor view |
| `GET /api/rooms/search` | Every search interaction |
| `GET /api/wifi/locate` | Positioning initialisation |
| `POST /api/wifi/locate` | Active navigation (Wi-Fi KNN) |
| `GET /api/wifi/fingerprints` | Android app start (fingerprint DB) |
| `GET /api/logs` | Admin monitoring (if ADMIN_TOKEN set) |

## Thresholds

| Scenario | p95 | Error rate |
|----------|-----|------------|
| 100 VU | < 800 ms | < 1% |
| 500 VU | < 1 500 ms | < 2% |
| 1 000 VU | < 3 000 ms | < 5% |

## Interpreting results

**Common bottlenecks at scale:**

- **Supabase connection pool** — Supabase free tier has 60 connections.
  At 500+ VUs the pool can saturate. Upgrade to Pro or add PgBouncer.
- **Vercel concurrency** — Serverless functions have a default concurrency
  limit. Watch for cold starts in the p99 column.
- **`/api/wifi/locate` rate limiter** — 15 requests/minute per IP.
  k6 shares one IP in most setups; real users each get their own quota.
- **`/api/wifi/fingerprints` payload size** — this endpoint returns all
  fingerprints. At >10 000 fingerprints, add pagination or gzip.

## Adding to CI

```yaml
# .github/workflows/load-test.yml (example)
- name: Load test (100 VU smoke)
  run: k6 run tests/load/scenario-100.js --env BASE_URL=${{ secrets.STAGING_URL }}
  timeout-minutes: 15
```
