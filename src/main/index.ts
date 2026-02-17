import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createConnection } from './database/connection';
import { Migrator } from './database/migrator';
import { migrations } from './database/migrations';
import { registerIpcHandlers } from './ipc/register-handlers';

// Handle Squirrel events for Windows installer
if (started) {
  app.quit();
}

let db: ReturnType<typeof createConnection> | null = null;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CPaaS Management',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

app.whenReady().then(() => {
  try {
    db = createConnection();
    const migrator = new Migrator(db);
    migrator.initialize();
    migrator.migrate(migrations);
    registerIpcHandlers(db);
  } catch (err) {
    console.error('[main] Failed to initialize database:', err);
    app.quit();
    return;
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
