import type { Migration } from '../migrator';

const migration: Migration = {
  version: 5,
  name: 'use-cases',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS use_cases (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL UNIQUE,
        description TEXT,
        status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_use_cases_status ON use_cases(status);
    `);
  },
};

export default migration;
