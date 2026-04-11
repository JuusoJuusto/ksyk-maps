const { app, BrowserWindow } = require('electron');
const path = require('path');

function createAdminWindow() {
  const adminWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../client/public/icon-512.png'),
    title: 'KSYK Maps - Admin Panel',
    backgroundColor: '#1e293b',
    frame: true,
    autoHideMenuBar: true,
  });

  // Load the admin panel directly
  const startUrl = process.env.ELECTRON_START_URL || 'https://ksykmaps.vercel.app';
  adminWindow.loadURL(`${startUrl}/admin-login`);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    adminWindow.webContents.openDevTools();
  }

  // Set window title after load
  adminWindow.webContents.on('did-finish-load', () => {
    adminWindow.setTitle('KSYK Maps - Admin Management Portal');
  });
}

app.whenReady().then(() => {
  createAdminWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAdminWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
