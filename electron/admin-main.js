const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');

/* ── WiFi scanning (same implementation as main.js) ─────────────────── */

function parseNetshOutput(stdout) {
  const networks = [];
  const lines = stdout.split('\n');
  let currentSsid = '';
  let currentBssid = '';
  let currentSignal = 0;

  const flush = () => {
    if (currentBssid) {
      networks.push({
        ssid: currentSsid,
        bssid: currentBssid,
        rssi: Math.round(-100 + currentSignal * 0.5),
        signal: currentSignal,
      });
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const ssidMatch = line.match(/^SSID\s+\d+\s*:\s*(.*)$/);
    if (ssidMatch) { flush(); currentSsid = ssidMatch[1].trim(); currentBssid = ''; currentSignal = 0; continue; }
    const bssidMatch = line.match(/^BSSID\s+\d+\s*:\s*([0-9a-f:]+)$/i);
    if (bssidMatch) { flush(); currentBssid = bssidMatch[1].toLowerCase(); currentSignal = 0; continue; }
    const signalMatch = line.match(/^Signal\s*:\s*(\d+)%/);
    if (signalMatch && currentBssid) currentSignal = parseInt(signalMatch[1], 10);
  }
  flush();
  return networks.filter(n => n.bssid).sort((a, b) => b.signal - a.signal);
}

function parseAirportOutput(stdout) {
  const networks = [];
  for (const line of stdout.split('\n').slice(1)) {
    const m = line.match(/^\s*(.+?)\s+([0-9a-f:]{17})\s+(-\d+)/i);
    if (m) networks.push({ ssid: m[1].trim(), bssid: m[2].toLowerCase(), rssi: parseInt(m[3], 10), signal: Math.max(0, Math.min(100, (parseInt(m[3], 10) + 100) * 2)) });
  }
  return networks.sort((a, b) => b.rssi - a.rssi);
}

function parseNmcliOutput(stdout) {
  const networks = [];
  for (const line of stdout.split('\n')) {
    const parts = line.split(':');
    if (parts.length < 3) continue;
    const bssid = parts.slice(0, 6).join(':').toLowerCase().replace(/\\/g, '');
    const ssid = parts[6] || '';
    const signal = parseInt(parts[7] || '0', 10);
    if (bssid.length === 17) networks.push({ ssid: ssid.trim(), bssid, rssi: Math.round(-100 + signal * 0.5), signal });
  }
  return networks.sort((a, b) => b.signal - a.signal);
}

ipcMain.handle('scan-wifi', async () => {
  return new Promise((resolve) => {
    let cmd, parser;
    if (process.platform === 'win32') { cmd = 'netsh wlan show networks mode=bssid'; parser = parseNetshOutput; }
    else if (process.platform === 'darwin') { cmd = '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s'; parser = parseAirportOutput; }
    else { cmd = 'nmcli -t -f BSSID,SSID,SIGNAL dev wifi list 2>/dev/null'; parser = parseNmcliOutput; }
    exec(cmd, { encoding: 'utf8', timeout: 15000 }, (err, stdout) => {
      if (err && !stdout) { resolve({ error: err.message, networks: [] }); return; }
      try { resolve({ networks: parser(stdout || '') }); }
      catch (e) { resolve({ error: e.message, networks: [] }); }
    });
  });
});

/* ── Window ──────────────────────────────────────────────────────────── */

function createAdminWindow() {
  const adminWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../client/public/icon-512.png'),
    title: 'KSYK Maps - Admin Panel',
    backgroundColor: '#1e293b',
    frame: true,
    autoHideMenuBar: true,
  });

  const startUrl = process.env.ELECTRON_START_URL || 'https://ksykmaps.fi';
  adminWindow.loadURL(`${startUrl}/admin-login`);

  if (process.env.NODE_ENV === 'development') {
    adminWindow.webContents.openDevTools();
  }

  adminWindow.webContents.on('did-finish-load', () => {
    adminWindow.setTitle('KSYK Maps - Admin Management Portal');
  });
}

app.whenReady().then(() => {
  createAdminWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createAdminWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
