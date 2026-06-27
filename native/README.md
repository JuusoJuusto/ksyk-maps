# KSYK Maps — Native Windows Apps

Real, native Windows applications. Written in C#, compiled to true Win32 `.exe` files with the compiler that ships built-in to Windows (`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`). **No Electron. No Python. No web view.** Each app talks directly to `https://ksykmaps.fi/api/*` over HTTPS.

## What you get

| File | Size | Purpose |
|---|---|---|
| `build\KSYK-Maps-Admin.exe` | ~130 KB | Admin thick client (Rooms, Buildings, Tickets, Analytics, WiFi Scan, System health) |
| `build\KSYK-Maps-Quick.exe` | ~110 KB | Student utility (Room finder, Lunch menu, Announcements) |
| `build\Setup.exe` | ~360 KB | Full wizard installer that embeds the two apps |

All three carry the KSYK Maps logo as their Windows icon (multi-resolution: 16/32/48/64/128/512 px).

## Setup.exe — real Windows wizard installer

Setup.exe is a proper graphical Windows installer:

- 5-page wizard: **Welcome → Choose location → Confirm → Installing… → Done**
- Default install path: `%LOCALAPPDATA%\Programs\KSYK Maps`
- Browse button to pick a custom location
- Optional: create a desktop shortcut, launch app when finished
- Creates Start Menu folder `KSYK Maps` with three shortcuts:
  - `KSYK Maps` (student utility)
  - `KSYK Maps Admin` (admin tool)
  - `Uninstall KSYK Maps`
- Registers itself in **Add or Remove Programs** (Windows Settings → Apps)
- Both apps are findable from the **Start menu search bar** the moment install finishes
- Per-user install — no admin / UAC prompt needed

### Command-line flags

```cmd
Setup.exe                          ; interactive wizard (default)
Setup.exe /silent                  ; headless install to default location
Setup.exe /silent /dir="D:\Apps"   ; headless install to a custom location
Setup.exe /uninstall               ; uninstall wizard
Setup.exe /uninstall /silent       ; headless uninstall
```

## Building from source

```powershell
cd native
.\build.ps1
```

The script:
1. Compiles `MakeIcon.exe` (a tiny PNG→ICO converter)
2. Builds `icon.ico` from the KSYK logo PNGs in `../public/`
3. Compiles `KSYK-Maps-Admin.exe` with the icon embedded
4. Compiles `KSYK-Maps-Quick.exe` with the icon embedded
5. Compiles `Setup.exe` with both apps embedded as resources, also with the icon

No external SDKs / toolchains required — every binary used by `build.ps1` is already on a stock Windows install.

## Smoke testing

```powershell
cd native
.\test-install.ps1
```

Runs `Setup.exe /silent`, verifies every install artifact (files, shortcuts, registry, desktop link), launches each installed app to make sure it starts, then runs the silent uninstall and verifies everything is gone again.

## Why not Electron / Python?

These are real native binaries — they use Windows' own widget toolkit (Win32 controls via WinForms), don't bundle Chromium, don't depend on a Python runtime, and the .exe files are kilobytes instead of tens of megabytes. The admin tool also gets WiFi scanning straight from `netsh wlan show networks` with no IPC layer in between.

## Pointing at a non-prod API

```powershell
$env:KSYK_API_BASE = "http://localhost:5000/api"
.\build\KSYK-Maps-Admin.exe
```

## Source layout

```
native/
  src/
    Admin.cs       Admin thick client
    Quick.cs       Student utility
    Setup.cs       Wizard installer + silent install + uninstall
    MakeIcon.cs    Build-time PNG → multi-res ICO converter
  build/           Build output (gitignored)
  build.ps1        Compiles everything
  test-install.ps1 End-to-end install/uninstall verification
```
