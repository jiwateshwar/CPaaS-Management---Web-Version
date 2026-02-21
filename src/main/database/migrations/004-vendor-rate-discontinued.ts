import type { Migration } from '../migrator';

const migration: Migration = {
  version: 4,
  name: 'vendor-rate-discontinued',
  up: (db) => {
    db.exec(`
      ALTER TABLE vendor_rates ADD COLUMN discontinued INTEGER NOT NULL DEFAULT 0 CHECK(discontinued IN (0, 1));

      CREATE INDEX IF NOT EXISTS idx_vendor_rates_effective_active ON vendor_rates(
        vendor_id, country_code, channel, use_case, effective_from, effective_to, discontinued
      );
    `);
  },
};

export default migration;
