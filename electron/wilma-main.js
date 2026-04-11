const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWilmaWindow() {
  const wilmaWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../client/public/icon-512.png'),
    title: 'Wilma - Brando',
    backgroundColor: '#003d82',
    frame: true,
    autoHideMenuBar: true,
  });

  // Load Wilma directly
  const startUrl = process.env.ELECTRON_START_URL || 'https://ksykmaps.vercel.app';
  wilmaWindow.loadURL(`${startUrl}/wilma`);

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    wilmaWindow.webContents.openDevTools();
  }

  // Set window title after load
  wilmaWindow.webContents.on('did-finish-load', () => {
    wilmaWindow.setTitle('Wilma - Brando School');
  });
}

app.whenReady().then(() => {
  createWilmaWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWilmaWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
