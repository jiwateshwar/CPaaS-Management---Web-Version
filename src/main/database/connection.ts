import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

const DB_FILENAME = 'cpaas-ledger.db';

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), DB_FILENAME);
}

export function createConnection(dbPath?: string): Database.Database {
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
