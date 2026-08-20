# KSYK Maps — k6 Load Test

## Install k6

**Windows (Chocolatey):**
```
choco install k6
```
**Windows (Winget):**
```
winget install k6 --source winget
```
**Mac:**
```
brew install k6
```
**Linux:**
```
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

---

## Quick commands

| Command | What it does |
|---------|-------------|
| `k6 run ksykmaps-loadtest.js` | Full ramp: 100 → 2 000 VUs, ~30 min |
| `k6 run --vus 50 --duration 1m ksykmaps-loadtest.js` | Quick 1-minute smoke test |
| `k6 run --vus 5 --duration 30s ksykmaps-loadtest.js` | Sanity check (no ramp) |
| `BASE_URL=http://localhost:5000 k6 run ...` | Test local dev server |

---

## Targets

| Metric | Target |
|--------|--------|
| Concurrent users (sustained) | 1 000 |
| Error rate | < 1% |
| p95 API latency | < 500 ms |
| p99 API latency | < 1 s |
| Map package p95 | < 2 s |
| Server crashes | 0 |
| Sustained test duration | 10 min at 1 000 VUs |

---

## Ramp profile

```
 VUs
2000 ──────────────────────────────────────────────────────────┐
1500 ────────────────────────────────────────────────────────┐ │
1000 ──────────────────────────────────────────────┬─────── │─┤
 750 ──────────────────────────────────────┬────── │        │ │
 500 ──────────────────────────┬────────── │       │        │ │
 250 ──────────────────┬────── │           │       │        │ │
 100 ────────┬──────── │       │           │       │        │ │
   0 ────────┘         │       │           │       │        │ │
      0   1   2   3  4  5   6  7  8   9  10  20  22  24  26  27 min
```

The last two stages (1 500 → 2 000) intentionally exceed the target load to find the **breaking point** — where error rates spike or latency blows past thresholds.

---

## What it tests

Each virtual user simulates a realistic student session:

1. **Homepage** — `GET /`
2. **Initial API burst** (parallel) — `/api/auth/user`, `/api/settings`, `/api/map-defaults`, `/api/announcements`, `/api/appearance-settings`
3. **Map package** — `/api/map-package/published` (heaviest payload, custom latency metric)
4. **Campus data** (parallel) — `/api/buildings`, `/api/floors`, `/api/rooms`, `/api/pois`
5. **Room search** — `/api/rooms/search?q=<random term>` (custom latency metric)
6. **Lunch menu** — `/api/lunch-menu` (40% of users)
7. **Events** — `/api/events` (20% of users)

Think-time pauses between groups simulate real human interaction delays (0.5–3 s).

---

## Reading results

k6 prints a summary at the end. Key lines:

```
ksyk_error_rate............: 0.12%   ✓ PASS (< 1%)
ksyk_search_latency........: p(95)=234ms ✓ PASS (< 500ms)
ksyk_map_package_latency...: p(95)=1.2s  ✓ PASS (< 2s)
http_req_duration..........: p(95)=410ms ✓ PASS (< 1s)
```

If a threshold fails, k6 exits with code 99. In CI you can gate on this:

```yaml
- run: k6 run load-test/ksykmaps-loadtest.js
```

The job fails automatically if any threshold is breached.
