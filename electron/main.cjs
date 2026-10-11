const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Single Instance Lock - avoids multiple processes, focuses existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

// 2. Set App User Model ID for consistent Windows taskbar and system notifications
app.setAppUserModelId('com.anexus.classmanager');
app.name = 'Anexus Class Manager';

let mainWindow = null;
let tray = null;
let isQuitting = false;

function resolveAppIcon() {
  const icoPath = path.join(__dirname, '../public/favicon.ico');
  const pngPath = path.join(__dirname, '../public/app-icon.png');
  const svgPath = path.join(__dirname, '../public/favicon.svg');

  try {
    if (process.platform === 'win32' && fs.existsSync(icoPath)) {
      return nativeImage.createFromPath(icoPath);
    }
    if (fs.existsSync(pngPath)) {
      return nativeImage.createFromPath(pngPath);
    }
    if (fs.existsSync(svgPath)) {
      return nativeImage.createFromPath(svgPath);
    }
  } catch {
    // fallback
  }
  return null;
}

function createWindow() {
  const icon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 850,
    minHeight: 600,
    title: 'Anexus Class Manager',
    icon: icon || path.join(__dirname, '../public/favicon.svg'),
    backgroundColor: '#000000',
    show: false, // show when ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:anexus' // ensure persistent IndexedDB / localStorage data
    }
  });

  Menu.setApplicationMenu(null);

  const indexPath = path.join(__dirname, '../dist/index.html');
  mainWindow.loadFile(indexPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // When user clicks the window close button [X], hide to system tray instead of terminating
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  setupTray(icon);
}

function setupTray(icon) {
  if (tray) return;

  try {
    const trayIcon = icon || resolveAppIcon();
    if (!trayIcon) return;

    tray = new Tray(trayIcon);
    tray.setToolTip('Anexus Class Manager (Running in background)');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Anexus Class Manager',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit App',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (!mainWindow) return;
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    tray.on('double-click', () => {
      if (!mainWindow) return;
      mainWindow.show();
      mainWindow.focus();
    });
  } catch (err) {
    console.error('Tray initialization error:', err);
  }
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(createWindow);

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Keep alive in the system tray on all platforms
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
});
