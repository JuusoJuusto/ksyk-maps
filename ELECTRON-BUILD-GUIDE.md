# Electron Desktop Apps Build Guide

## Overview
KSYK Maps now has 3 separate desktop applications:
1. **KSYK Maps** - Main application
2. **KSYK Maps Admin** - Admin panel application
3. **Wilma - Brando** - Wilma student portal application

## Prerequisites
```bash
cd electron
npm install
```

## Building Applications

### Build All Apps (Recommended)
```bash
cd electron
npm run build:all
```
This will create 3 separate EXE installers in:
- `electron/dist/main/` - KSYK Maps Setup.exe
- `electron/dist/admin/` - KSYK Maps Admin Setup.exe
- `electron/dist/wilma/` - Wilma - Brando Setup.exe

### Build Individual Apps
```bash
# Build main app only
npm run build:main

# Build admin app only
npm run build:admin

# Build Wilma app only
npm run build:wilma
```

## Development Mode

### Run Main App
```bash
npm start
```

### Run Admin App
```bash
npm run start:admin
```

### Run Wilma App
```bash
npm run start:wilma
```

## Application Details

### Main App (KSYK Maps)
- **Entry Point**: `main.js`
- **URL**: `https://ksykmaps.vercel.app`
- **Window Size**: 1400x900
- **Icon**: KSYK Maps logo

### Admin App (KSYK Maps Admin)
- **Entry Point**: `admin-main.js`
- **URL**: `https://ksykmaps.vercel.app/admin-login`
- **Window Size**: 1600x1000
- **Icon**: KSYK Maps logo
- **Purpose**: Admin management portal

### Wilma App (Wilma - Brando)
- **Entry Point**: `wilma-main.js`
- **URL**: `https://ksykmaps.vercel.app/wilma`
- **Window Size**: 1200x800
- **Icon**: KSYK Maps logo
- **Purpose**: Student portal

## Distribution
After building, you'll find the installers in the respective `dist` folders. These can be distributed to users for installation on Windows systems.

## Notes
- All apps use NSIS installer format
- Users can choose installation directory
- Apps are standalone and don't interfere with each other
- Each app has its own unique App ID
