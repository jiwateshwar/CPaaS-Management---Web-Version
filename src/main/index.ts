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

let db: ReturnType<typeof createConnection>;

try {
  db = createConnection();
  const migrator = new Migrator(db);
  migrator.initialize();
  migrator.migrate(migrations);
  registerIpcHandlers(db);
  console.log('[main] Database initialized and IPC handlers registered');
} catch (err) {
  console.error('[main] Failed to initialize database:', err);
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'CPaaS Management',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levelMap = ['LOG', 'WARN', 'ERROR'];
    console.log(`[renderer:${levelMap[level] || level}] ${message} (${sourceId}:${line})`);
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (db) db.close();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
