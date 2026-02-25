import type { Migration } from '../migrator';

const migration: Migration = {
  version: 8,
  name: 'drop-channel-check-constraints',
  up: (db) => {
    // SQLite does not support DROP CONSTRAINT. We must recreate each table.
    // Temporarily disable foreign keys so we can drop/rename tables safely.
    db.pragma('foreign_keys = OFF');

    db.exec(`
      -- ============================================================
      -- VENDOR RATES (recreate without CHECK on channel)
      -- Current columns (from migrations 001, 003, 004):
      --   id, vendor_id, country_code, channel, rate, currency,
      --   effective_from, effective_to, batch_id, notes,
      --   created_at, updated_at, use_case, setup_fee, monthly_fee,
      --   mt_fee, mo_fee, discontinued
      -- ============================================================

      CREATE TABLE vendor_rates_new (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id      INTEGER NOT NULL REFERENCES vendors(id),
        country_code   TEXT NOT NULL REFERENCES country_master(code),
        channel        TEXT NOT NULL,
        rate           REAL NOT NULL CHECK(rate >= 0),
        currency       TEXT NOT NULL DEFAULT 'USD',
        effective_from TEXT NOT NULL,
        effective_to   TEXT,
        batch_id       INTEGER REFERENCES upload_batches(id),
        notes          TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
        use_case       TEXT NOT NULL DEFAULT 'default',
        setup_fee      REAL NOT NULL DEFAULT 0 CHECK(setup_fee >= 0),
        monthly_fee    REAL NOT NULL DEFAULT 0 CHECK(monthly_fee >= 0),
        mt_fee         REAL NOT NULL DEFAULT 0 CHECK(mt_fee >= 0),
        mo_fee         REAL NOT NULL DEFAULT 0 CHECK(mo_fee >= 0),
        discontinued   INTEGER NOT NULL DEFAULT 0 CHECK(discontinued IN (0, 1))
      );

      INSERT INTO vendor_rates_new SELECT * FROM vendor_rates;
      DROP TABLE vendor_rates;
      ALTER TABLE vendor_rates_new RENAME TO vendor_rates;

      CREATE INDEX IF NOT EXISTS idx_vendor_rates_lookup ON vendor_rates(
        vendor_id, country_code, channel, effective_from, effective_to
      );
      CREATE INDEX IF NOT EXISTS idx_vendor_rates_batch ON vendor_rates(batch_id);
      CREATE INDEX IF NOT EXISTS idx_vendor_rates_lookup_v2 ON vendor_rates(
        vendor_id, country_code, channel, use_case, effective_from, effective_to
      );
      CREATE INDEX IF NOT EXISTS idx_vendor_rates_effective_active ON vendor_rates(
        vendor_id, country_code, channel, use_case, effective_from, effective_to, discontinued
      );

      -- ============================================================
      -- CLIENT RATES (recreate without CHECK on channel)
      -- Current columns (from migrations 001, 003):
      --   id, client_id, country_code, channel, use_case, rate,
      --   currency, contract_version, effective_from, effective_to,
      --   batch_id, notes, created_at, updated_at,
      --   setup_fee, monthly_fee, mt_fee, mo_fee
      -- ============================================================

      CREATE TABLE client_rates_new (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id        INTEGER NOT NULL REFERENCES clients(id),
        country_code     TEXT NOT NULL REFERENCES country_master(code),
        channel          TEXT NOT NULL,
        use_case         TEXT NOT NULL DEFAULT 'default',
        rate             REAL NOT NULL CHECK(rate >= 0),
        currency         TEXT NOT NULL DEFAULT 'USD',
        contract_version TEXT,
        effective_from   TEXT NOT NULL,
        effective_to     TEXT,
        batch_id         INTEGER REFERENCES upload_batches(id),
        notes            TEXT,
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
        setup_fee        REAL NOT NULL DEFAULT 0 CHECK(setup_fee >= 0),
        monthly_fee      REAL NOT NULL DEFAULT 0 CHECK(monthly_fee >= 0),
        mt_fee           REAL NOT NULL DEFAULT 0 CHECK(mt_fee >= 0),
        mo_fee           REAL NOT NULL DEFAULT 0 CHECK(mo_fee >= 0)
      );

      INSERT INTO client_rates_new SELECT * FROM client_rates;
      DROP TABLE client_rates;
      ALTER TABLE client_rates_new RENAME TO client_rates;

      CREATE INDEX IF NOT EXISTS idx_client_rates_lookup ON client_rates(
        client_id, country_code, channel, use_case, effective_from, effective_to
      );
      CREATE INDEX IF NOT EXISTS idx_client_rates_batch ON client_rates(batch_id);

      -- ============================================================
      -- ROUTING ASSIGNMENTS (recreate without CHECK on channel)
      -- Current columns (from migration 001):
      --   id, client_id, country_code, channel, use_case, vendor_id,
      --   priority, effective_from, effective_to, batch_id, notes,
      --   created_at, updated_at
      -- ============================================================

      CREATE TABLE routing_assignments_new (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id      INTEGER NOT NULL REFERENCES clients(id),
        country_code   TEXT NOT NULL REFERENCES country_master(code),
        channel        TEXT NOT NULL,
        use_case       TEXT NOT NULL DEFAULT 'default',
        vendor_id      INTEGER NOT NULL REFERENCES vendors(id),
        priority       INTEGER NOT NULL DEFAULT 1,
        effective_from TEXT NOT NULL,
        effective_to   TEXT,
        batch_id       INTEGER REFERENCES upload_batches(id),
        notes          TEXT,
        created_at     TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
      );

      INSERT INTO routing_assignments_new SELECT * FROM routing_assignments;
      DROP TABLE routing_assignments;
      ALTER TABLE routing_assignments_new RENAME TO routing_assignments;

      CREATE INDEX IF NOT EXISTS idx_routing_lookup ON routing_assignments(
        client_id, country_code, channel, use_case, effective_from, effective_to
      );
      CREATE INDEX IF NOT EXISTS idx_routing_vendor ON routing_assignments(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_routing_batch ON routing_assignments(batch_id);

      -- ============================================================
      -- TRAFFIC RECORDS (recreate without CHECK on channel)
      -- Current columns (from migrations 001, 003):
      --   id, batch_id, client_id, country_code, channel, use_case,
      --   message_count, traffic_date, created_at,
      --   setup_count, monthly_count, mt_count, mo_count
      -- ============================================================

      CREATE TABLE traffic_records_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id      INTEGER NOT NULL REFERENCES upload_batches(id),
        client_id     INTEGER NOT NULL REFERENCES clients(id),
        country_code  TEXT NOT NULL REFERENCES country_master(code),
        channel       TEXT NOT NULL,
        use_case      TEXT NOT NULL DEFAULT 'default',
        message_count INTEGER NOT NULL CHECK(message_count > 0),
        traffic_date  TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        setup_count   INTEGER NOT NULL DEFAULT 0 CHECK(setup_count >= 0),
        monthly_count INTEGER NOT NULL DEFAULT 0 CHECK(monthly_count >= 0),
        mt_count      INTEGER NOT NULL DEFAULT 0 CHECK(mt_count >= 0),
        mo_count      INTEGER NOT NULL DEFAULT 0 CHECK(mo_count >= 0)
      );

      INSERT INTO traffic_records_new SELECT * FROM traffic_records;
      DROP TABLE traffic_records;
      ALTER TABLE traffic_records_new RENAME TO traffic_records;

      CREATE INDEX IF NOT EXISTS idx_traffic_client_date ON traffic_records(client_id, traffic_date);
      CREATE INDEX IF NOT EXISTS idx_traffic_lookup ON traffic_records(
        client_id, country_code, channel, use_case, traffic_date
      );
      CREATE INDEX IF NOT EXISTS idx_traffic_batch ON traffic_records(batch_id);
    `);

    db.pragma('foreign_keys = ON');
  },
};

export default migration;
