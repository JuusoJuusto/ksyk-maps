/**
 * Electron preload — exposes safe native APIs to the renderer (ksykmaps.fi web app).
 * All exposed methods go through contextBridge so the renderer never gets raw Node.js access.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /** Flag the renderer can check to know it's running inside Electron. */
  isElectron: true,

  /**
   * Scan nearby WiFi access points.
   * Returns { networks: Array<{ ssid, bssid, rssi, signal }> } on success
   * or        { error: string, networks: [] }              on failure.
   */
  scanWifi: () => ipcRenderer.invoke('scan-wifi'),
});
