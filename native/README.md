# KSYK Maps — Native Windows Apps

Two true-native Tkinter desktop apps for KSYK Maps. Not Electron, not a webview — pure Win32 widgets styled in the retro Win-9x palette. Both talk directly to `https://ksykmaps.fi/api/...` over HTTPS.

## Apps

### KSYK Maps Admin (`ksyk_admin.py` → `KSYK-Maps-Admin.exe`)

Thick-client admin tool. Sign in with your owner / admin credentials and you get tabbed access to:

- **Rooms** — search, edit (number, name, floor, type, x/y/width/height), create, delete
- **Buildings** — campus building list with room counts
- **Tickets** — incoming support tickets, double-click any to see the full body
- **Analytics** — summary numbers (visitors, pageviews, sessions, avg duration) plus the external Cloudflare / Firestore provider rows
- **WiFi Scan** — native `netsh wlan show networks mode=bssid` parsed into BSSID/RSSI/signal rows; one click copies them in the exact format BeaconSurveyor's paste field expects
- **System** — server health probe (`/`, `/email-diagnostic`, `/client-info`)

### KSYK Maps Quick (`ksyk_viewer.py` → `KSYK-Maps-Quick.exe`)

Lightweight student utility. No login required.

- **Find a room** — type-as-you-search across number, name, type; double-click to open the room on the live map at ksykmaps.fi
- **Lunch** — pulls the school's RSS lunch feed via `/api/lunch-menu`, parses + renders day-by-day
- **Announcements** — latest 20 from `/api/announcements`

## Build

```powershell
# One-time
python -m pip install --user pyinstaller

# Build both .exes
.\build.ps1
```

Outputs land in `native/dist/`:

```
KSYK-Maps-Admin.exe   ~10 MB
KSYK-Maps-Quick.exe   ~11 MB
```

Each .exe is a single self-contained Windows binary — no Python install required on the target machine.

## Run

Just double-click the `.exe`. To point at a non-production API (e.g. dev server), set an env var:

```powershell
$env:KSYK_API_BASE = "http://localhost:5000/api"
.\KSYK-Maps-Admin.exe
```

## Look & feel

Both apps share the Win-9x palette from the old browser Toolbench page:
- Teal `#008080` desktop
- Silver `#c0c0c0` chrome with raised/sunken bevels
- Navy `#000080` title bars with white MS Sans Serif bold
- Native Tkinter `classic` theme — no themed widgets, no gradients

## Why not Electron?

These are truly native: they use the OS's native widget toolkit (Tk, which wraps Win32 controls on Windows), don't bundle Chromium, and the .exe is ~10 MB instead of ~76 MB. The admin tool also gets WiFi scanning through `netsh` directly — no extra IPC layer.
