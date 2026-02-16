import Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export class Migrator {
  constructor(private db: Database.Database) {}

  initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INTEGER PRIMARY KEY,
        name       TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  getCurrentVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) as version FROM schema_migrations')
      .get() as { version: number | null } | undefined;
    return row?.version ?? 0;
  }

  migrate(migrations: Migration[]): void {
    const current = this.getCurrentVersion();
    const pending = migrations
      .filter((m) => m.version > current)
      .sort((a, b) => a.version - b.version);

    for (const migration of pending) {
      this.db.transaction(() => {
        migration.up(this.db);
        this.db
          .prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)')
          .run(migration.version, migration.name);
      })();
      console.log(`Migration ${migration.version}: ${migration.name} applied`);
    }

    if (pending.length === 0) {
      console.log('Database is up to date');
    }
  }
}
