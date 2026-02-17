import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { createConnection } from './database/connection';
import { Migrator } from './database/migrator';
import { migrations } from './database/migrations';
import { registerIpcHandlers } from './ipc/register-handlers';

console.log('[main] Process started, squirrel-startup:', started);

// Handle Squirrel events for Windows installer
if (started) {
  console.log('[main] Squirrel event detected, quitting');
  app.quit();
}

let db: ReturnType<typeof createConnection> | null = null;

const createWindow = () => {
  console.log('[main] Creating window...');
  console.log('[main] __dirname:', __dirname);
  console.log('[main] DEV_SERVER_URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
  console.log('[main] VITE_NAME:', MAIN_WINDOW_VITE_NAME);

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CPaaS Management',
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  console.log('[main] BrowserWindow created, should be visible now');

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[main] Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[main] Page finished loading');
  });

  // Always open DevTools to see errors
  mainWindow.webContents.openDevTools();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('[main] Loading dev URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const filePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('[main] Loading file:', filePath);
    mainWindow.loadFile(filePath);
  }

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelMap = ['LOG', 'WARN', 'ERROR'];
    console.log(`[renderer:${levelMap[level] || level}] ${message} (${sourceId}:${line})`);
  });
};

console.log('[main] Waiting for app ready...');

app.whenReady().then(() => {
  console.log('[main] App is ready');

  // Initialize database AFTER app is ready (app.getPath requires it)
  try {
    console.log('[main] Initializing database...');
    db = createConnection();
    console.log('[main] Database connection created');
    const migrator = new Migrator(db);
    migrator.initialize();
    migrator.migrate(migrations);
    registerIpcHandlers(db);
    console.log('[main] Database initialized and IPC handlers registered');
  } catch (err) {
    console.error('[main] Failed to initialize database:', err);
    app.quit();
    return;
  }

  createWindow();
  console.log('[main] createWindow() called');
}).catch((err) => {
  console.error('[main] whenReady failed:', err);
});

app.on('window-all-closed', () => {
  console.log('[main] All windows closed');
  if (db) db.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
