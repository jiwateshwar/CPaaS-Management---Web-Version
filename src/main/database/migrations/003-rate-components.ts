import type { Migration } from '../migrator';

const migration: Migration = {
  version: 3,
  name: 'rate-components-and-traffic-counts',
  up: (db) => {
    db.exec(`
      -- ============================================================
      -- VENDOR RATES: add use_case + component fees
      -- ============================================================
      ALTER TABLE vendor_rates ADD COLUMN use_case TEXT NOT NULL DEFAULT 'default';
      ALTER TABLE vendor_rates ADD COLUMN setup_fee REAL NOT NULL DEFAULT 0 CHECK(setup_fee >= 0);
      ALTER TABLE vendor_rates ADD COLUMN monthly_fee REAL NOT NULL DEFAULT 0 CHECK(monthly_fee >= 0);
      ALTER TABLE vendor_rates ADD COLUMN mt_fee REAL NOT NULL DEFAULT 0 CHECK(mt_fee >= 0);
      ALTER TABLE vendor_rates ADD COLUMN mo_fee REAL NOT NULL DEFAULT 0 CHECK(mo_fee >= 0);

      UPDATE vendor_rates
      SET mt_fee = rate,
          mo_fee = rate
      WHERE mt_fee = 0 AND mo_fee = 0;

      CREATE INDEX IF NOT EXISTS idx_vendor_rates_lookup_v2 ON vendor_rates(
        vendor_id, country_code, channel, use_case, effective_from, effective_to
      );

      -- ============================================================
      -- CLIENT RATES: add component fees
      -- ============================================================
      ALTER TABLE client_rates ADD COLUMN setup_fee REAL NOT NULL DEFAULT 0 CHECK(setup_fee >= 0);
      ALTER TABLE client_rates ADD COLUMN monthly_fee REAL NOT NULL DEFAULT 0 CHECK(monthly_fee >= 0);
      ALTER TABLE client_rates ADD COLUMN mt_fee REAL NOT NULL DEFAULT 0 CHECK(mt_fee >= 0);
      ALTER TABLE client_rates ADD COLUMN mo_fee REAL NOT NULL DEFAULT 0 CHECK(mo_fee >= 0);

      UPDATE client_rates
      SET mt_fee = rate,
          mo_fee = rate
      WHERE mt_fee = 0 AND mo_fee = 0;

      -- ============================================================
      -- TRAFFIC RECORDS: add component counts
      -- ============================================================
      ALTER TABLE traffic_records ADD COLUMN setup_count INTEGER NOT NULL DEFAULT 0 CHECK(setup_count >= 0);
      ALTER TABLE traffic_records ADD COLUMN monthly_count INTEGER NOT NULL DEFAULT 0 CHECK(monthly_count >= 0);
      ALTER TABLE traffic_records ADD COLUMN mt_count INTEGER NOT NULL DEFAULT 0 CHECK(mt_count >= 0);
      ALTER TABLE traffic_records ADD COLUMN mo_count INTEGER NOT NULL DEFAULT 0 CHECK(mo_count >= 0);

      UPDATE traffic_records
      SET mt_count = message_count
      WHERE mt_count = 0 AND mo_count = 0;

      -- ============================================================
      -- MARGIN LEDGER: store component counts + fees
      -- ============================================================
      ALTER TABLE margin_ledger ADD COLUMN setup_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE margin_ledger ADD COLUMN monthly_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE margin_ledger ADD COLUMN mt_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE margin_ledger ADD COLUMN mo_count INTEGER NOT NULL DEFAULT 0;

      ALTER TABLE margin_ledger ADD COLUMN vendor_setup_fee REAL NOT NULL DEFAULT 0 CHECK(vendor_setup_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN vendor_monthly_fee REAL NOT NULL DEFAULT 0 CHECK(vendor_monthly_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN vendor_mt_fee REAL NOT NULL DEFAULT 0 CHECK(vendor_mt_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN vendor_mo_fee REAL NOT NULL DEFAULT 0 CHECK(vendor_mo_fee >= 0);

      ALTER TABLE margin_ledger ADD COLUMN client_setup_fee REAL NOT NULL DEFAULT 0 CHECK(client_setup_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN client_monthly_fee REAL NOT NULL DEFAULT 0 CHECK(client_monthly_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN client_mt_fee REAL NOT NULL DEFAULT 0 CHECK(client_mt_fee >= 0);
      ALTER TABLE margin_ledger ADD COLUMN client_mo_fee REAL NOT NULL DEFAULT 0 CHECK(client_mo_fee >= 0);

      UPDATE margin_ledger
      SET mt_count = message_count
      WHERE mt_count = 0 AND mo_count = 0;
    `);
  },
};

export default migration;
