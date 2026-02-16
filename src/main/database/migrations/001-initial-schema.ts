import type { Migration } from '../migrator';

const migration: Migration = {
  version: 1,
  name: 'initial-schema',
  up: (db) => {
    db.exec(`
      -- ============================================================
      -- COUNTRY MASTER DATA
      -- ============================================================

      CREATE TABLE country_master (
        code        TEXT PRIMARY KEY,
        name        TEXT NOT NULL UNIQUE,
        iso_alpha3  TEXT UNIQUE,
        iso_numeric TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE country_aliases (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT NOT NULL REFERENCES country_master(code) ON UPDATE CASCADE,
        alias        TEXT NOT NULL COLLATE NOCASE,
        source       TEXT NOT NULL DEFAULT 'manual',
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(alias)
      );

      CREATE INDEX idx_country_aliases_alias ON country_aliases(alias COLLATE NOCASE);
      CREATE INDEX idx_country_aliases_country_code ON country_aliases(country_code);

      -- ============================================================
      -- UPLOAD BATCH TRACKING
      -- ============================================================

      CREATE TABLE upload_batches (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        type            TEXT NOT NULL CHECK(type IN (
                          'vendor_rate', 'client_rate', 'routing', 'traffic', 'fx_rate'
                        )),
        filename        TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending' CHECK(status IN (
                          'pending', 'validating', 'processing', 'completed',
                          'completed_with_errors', 'failed', 'cancelled'
                        )),
        total_rows      INTEGER NOT NULL DEFAULT 0,
        processed_rows  INTEGER NOT NULL DEFAULT 0,
        inserted_rows   INTEGER NOT NULL DEFAULT 0,
        skipped_rows    INTEGER NOT NULL DEFAULT 0,
        error_rows      INTEGER NOT NULL DEFAULT 0,
        entity_id       INTEGER,
        column_mapping  TEXT,
        uploaded_at     TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at    TEXT,
        error_summary   TEXT
      );

      CREATE TABLE batch_errors (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id      INTEGER NOT NULL REFERENCES upload_batches(id),
        row_number    INTEGER NOT NULL,
        raw_data      TEXT NOT NULL,
        error_type    TEXT NOT NULL,
        error_message TEXT NOT NULL,
        resolved      INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_batch_errors_batch_id ON batch_errors(batch_id);

      -- ============================================================
      -- VENDORS
      -- ============================================================

      CREATE TABLE vendors (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT NOT NULL,
        code          TEXT NOT NULL UNIQUE,
        contact_name  TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        currency      TEXT NOT NULL DEFAULT 'USD',
        notes         TEXT,
        status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at    TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- ============================================================
      -- VENDOR RATES
      -- ============================================================

      CREATE TABLE vendor_rates (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id       INTEGER NOT NULL REFERENCES vendors(id),
        country_code    TEXT NOT NULL REFERENCES country_master(code),
        channel         TEXT NOT NULL CHECK(channel IN (
                          'sms', 'whatsapp', 'viber', 'rcs', 'voice', 'email', 'other'
                        )),
        rate            REAL NOT NULL CHECK(rate >= 0),
        currency        TEXT NOT NULL DEFAULT 'USD',
        effective_from  TEXT NOT NULL,
        effective_to    TEXT,
        batch_id        INTEGER REFERENCES upload_batches(id),
        notes           TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_vendor_rates_lookup ON vendor_rates(
        vendor_id, country_code, channel, effective_from, effective_to
      );
      CREATE INDEX idx_vendor_rates_batch ON vendor_rates(batch_id);

      -- ============================================================
      -- CLIENTS
      -- ============================================================

      CREATE TABLE clients (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        name             TEXT NOT NULL,
        code             TEXT NOT NULL UNIQUE,
        contact_name     TEXT,
        contact_email    TEXT,
        contact_phone    TEXT,
        billing_currency TEXT NOT NULL DEFAULT 'USD',
        payment_terms    TEXT,
        notes            TEXT,
        status           TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at       TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- ============================================================
      -- CLIENT RATES
      -- ============================================================

      CREATE TABLE client_rates (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id         INTEGER NOT NULL REFERENCES clients(id),
        country_code      TEXT NOT NULL REFERENCES country_master(code),
        channel           TEXT NOT NULL CHECK(channel IN (
                            'sms', 'whatsapp', 'viber', 'rcs', 'voice', 'email', 'other'
                          )),
        use_case          TEXT NOT NULL DEFAULT 'default',
        rate              REAL NOT NULL CHECK(rate >= 0),
        currency          TEXT NOT NULL DEFAULT 'USD',
        contract_version  TEXT,
        effective_from    TEXT NOT NULL,
        effective_to      TEXT,
        batch_id          INTEGER REFERENCES upload_batches(id),
        notes             TEXT,
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_client_rates_lookup ON client_rates(
        client_id, country_code, channel, use_case, effective_from, effective_to
      );
      CREATE INDEX idx_client_rates_batch ON client_rates(batch_id);

      -- ============================================================
      -- ROUTING ASSIGNMENTS
      -- ============================================================

      CREATE TABLE routing_assignments (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id       INTEGER NOT NULL REFERENCES clients(id),
        country_code    TEXT NOT NULL REFERENCES country_master(code),
        channel         TEXT NOT NULL CHECK(channel IN (
                          'sms', 'whatsapp', 'viber', 'rcs', 'voice', 'email', 'other'
                        )),
        use_case        TEXT NOT NULL DEFAULT 'default',
        vendor_id       INTEGER NOT NULL REFERENCES vendors(id),
        priority        INTEGER NOT NULL DEFAULT 1,
        effective_from  TEXT NOT NULL,
        effective_to    TEXT,
        batch_id        INTEGER REFERENCES upload_batches(id),
        notes           TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_routing_lookup ON routing_assignments(
        client_id, country_code, channel, use_case, effective_from, effective_to
      );
      CREATE INDEX idx_routing_vendor ON routing_assignments(vendor_id);
      CREATE INDEX idx_routing_batch ON routing_assignments(batch_id);

      -- ============================================================
      -- TRAFFIC RECORDS
      -- ============================================================

      CREATE TABLE traffic_records (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id        INTEGER NOT NULL REFERENCES upload_batches(id),
        client_id       INTEGER NOT NULL REFERENCES clients(id),
        country_code    TEXT NOT NULL REFERENCES country_master(code),
        channel         TEXT NOT NULL CHECK(channel IN (
                          'sms', 'whatsapp', 'viber', 'rcs', 'voice', 'email', 'other'
                        )),
        use_case        TEXT NOT NULL DEFAULT 'default',
        message_count   INTEGER NOT NULL CHECK(message_count > 0),
        traffic_date    TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_traffic_client_date ON traffic_records(client_id, traffic_date);
      CREATE INDEX idx_traffic_lookup ON traffic_records(
        client_id, country_code, channel, use_case, traffic_date
      );
      CREATE INDEX idx_traffic_batch ON traffic_records(batch_id);

      -- ============================================================
      -- FX RATES
      -- ============================================================

      CREATE TABLE fx_rates (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        from_currency   TEXT NOT NULL,
        to_currency     TEXT NOT NULL,
        rate            REAL NOT NULL CHECK(rate > 0),
        effective_from  TEXT NOT NULL,
        effective_to    TEXT,
        source          TEXT,
        batch_id        INTEGER REFERENCES upload_batches(id),
        created_at      TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_fx_rates_lookup ON fx_rates(
        from_currency, to_currency, effective_from, effective_to
      );

      -- ============================================================
      -- MARGIN LEDGER (IMMUTABLE)
      -- ============================================================

      CREATE TABLE margin_ledger (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        traffic_record_id       INTEGER REFERENCES traffic_records(id),
        client_id               INTEGER NOT NULL REFERENCES clients(id),
        vendor_id               INTEGER NOT NULL REFERENCES vendors(id),
        country_code            TEXT NOT NULL REFERENCES country_master(code),
        channel                 TEXT NOT NULL,
        use_case                TEXT NOT NULL DEFAULT 'default',
        traffic_date            TEXT NOT NULL,
        message_count           INTEGER NOT NULL,
        vendor_rate_id          INTEGER REFERENCES vendor_rates(id),
        vendor_rate             REAL NOT NULL,
        vendor_currency         TEXT NOT NULL,
        vendor_cost             REAL NOT NULL,
        client_rate_id          INTEGER REFERENCES client_rates(id),
        client_rate             REAL NOT NULL,
        client_currency         TEXT NOT NULL,
        client_revenue          REAL NOT NULL,
        fx_rate_id              INTEGER REFERENCES fx_rates(id),
        fx_rate                 REAL,
        normalized_vendor_cost  REAL,
        normalized_currency     TEXT,
        margin                  REAL NOT NULL,
        calculated_at           TEXT NOT NULL DEFAULT (datetime('now')),
        is_reversal             INTEGER NOT NULL DEFAULT 0,
        original_entry_id       INTEGER REFERENCES margin_ledger(id),
        reversal_reason         TEXT,
        locked                  INTEGER NOT NULL DEFAULT 1,
        CHECK(locked = 1),
        CHECK(is_reversal = 0 OR original_entry_id IS NOT NULL)
      );

      CREATE INDEX idx_ledger_traffic_date ON margin_ledger(traffic_date);
      CREATE INDEX idx_ledger_client ON margin_ledger(client_id, traffic_date);
      CREATE INDEX idx_ledger_vendor ON margin_ledger(vendor_id, traffic_date);
      CREATE INDEX idx_ledger_country ON margin_ledger(country_code, traffic_date);
      CREATE INDEX idx_ledger_original_entry ON margin_ledger(original_entry_id);
      CREATE INDEX idx_ledger_traffic_record ON margin_ledger(traffic_record_id);

      -- Immutability triggers
      CREATE TRIGGER prevent_ledger_update
      BEFORE UPDATE ON margin_ledger
      BEGIN
        SELECT RAISE(ABORT, 'margin_ledger rows are immutable. Use reversal entries for corrections.');
      END;

      CREATE TRIGGER prevent_ledger_delete
      BEFORE DELETE ON margin_ledger
      BEGIN
        SELECT RAISE(ABORT, 'margin_ledger rows cannot be deleted. Use reversal entries for corrections.');
      END;

      -- ============================================================
      -- AUDIT LOG
      -- ============================================================

      CREATE TABLE audit_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name  TEXT NOT NULL,
        record_id   INTEGER NOT NULL,
        action      TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
        old_values  TEXT,
        new_values  TEXT,
        user        TEXT NOT NULL DEFAULT 'system',
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
      CREATE INDEX idx_audit_created_at ON audit_log(created_at);

      CREATE TRIGGER prevent_audit_update
      BEFORE UPDATE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'audit_log rows are immutable.');
      END;

      CREATE TRIGGER prevent_audit_delete
      BEFORE DELETE ON audit_log
      BEGIN
        SELECT RAISE(ABORT, 'audit_log rows cannot be deleted.');
      END;

      -- ============================================================
      -- PENDING COUNTRY RESOLUTIONS
      -- ============================================================

      CREATE TABLE pending_country_resolutions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_name        TEXT NOT NULL UNIQUE,
        batch_id        INTEGER REFERENCES upload_batches(id),
        suggested_code  TEXT REFERENCES country_master(code),
        confidence      REAL,
        resolved        INTEGER NOT NULL DEFAULT 0,
        resolved_code   TEXT REFERENCES country_master(code),
        resolved_at     TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_pending_resolutions_unresolved
        ON pending_country_resolutions(resolved) WHERE resolved = 0;

      -- ============================================================
      -- APP SETTINGS
      -- ============================================================

      CREATE TABLE app_settings (
        key         TEXT PRIMARY KEY,
        value       TEXT NOT NULL,
        updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
};

export default migration;
