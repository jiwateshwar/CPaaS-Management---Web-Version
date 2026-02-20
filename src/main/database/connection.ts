import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_FILENAME = 'cpaas-ledger.db';

export function getDatabasePath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  const dataDir = process.env.DB_DIR ?? path.join(process.cwd(), 'data');
  return path.join(dataDir, DB_FILENAME);
}

export function ensureDatabaseDir(dbPath?: string): void {
  const resolvedPath = dbPath ?? getDatabasePath();
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function createConnection(dbPath?: string): Database.Database {
  ensureDatabaseDir(dbPath);
  const db = new Database(dbPath ?? getDatabasePath());
  applyPragmas(db);
  return db;
}

export function applyPragmas(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
}
