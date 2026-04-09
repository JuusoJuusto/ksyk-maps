# KSYK Maps Desktop Application

## Building the Desktop App (.exe)

### Prerequisites
1. Install Node.js (already installed)
2. Navigate to electron folder

### Build Instructions

```bash
# Navigate to electron folder
cd electron

# Install dependencies
npm install

# Build for Windows (.exe)
npm run build:win

# Build for Mac (.dmg)
npm run build:mac

# Build for Linux (.AppImage)
npm run build:linux
```

### Output
The built application will be in `electron/dist/` folder:
- Windows: `KSYK Maps Setup.exe`
- Mac: `KSYK Maps.dmg`
- Linux: `KSYK Maps.AppImage`

### Development Mode
To test the app before building:
```bash
cd electron
npm start
```

### Notes
- The desktop app loads the production website (ksykmaps.vercel.app)
- Works offline if the website is cached
- Native window controls and system integration
- Auto-updates can be added later with electron-updater
