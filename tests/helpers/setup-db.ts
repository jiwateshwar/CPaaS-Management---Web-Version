import Database from 'better-sqlite3';
import { Migrator } from '../../src/main/database/migrator';
import migration001 from '../../src/main/database/migrations/001-initial-schema';

/**
 * Creates an in-memory SQLite database with the full schema applied.
 * Does NOT seed countries (migration 002) for faster test startup.
 * Call seedTestCountries() if country data is needed.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const migrator = new Migrator(db);
  migrator.initialize();
  migrator.migrate([migration001]);

  return db;
}

/**
 * Seeds a minimal set of countries for testing.
 */
export function seedTestCountries(db: Database.Database): void {
  const insert = db.prepare(
    'INSERT INTO country_master (code, name, iso_alpha3) VALUES (?, ?, ?)',
  );

  const countries = [
    ['US', 'United States', 'USA'],
    ['GB', 'United Kingdom', 'GBR'],
    ['IN', 'India', 'IND'],
    ['DE', 'Germany', 'DEU'],
    ['FR', 'France', 'FRA'],
    ['BR', 'Brazil', 'BRA'],
    ['NG', 'Nigeria', 'NGA'],
    ['ZA', 'South Africa', 'ZAF'],
    ['AE', 'United Arab Emirates', 'ARE'],
    ['SG', 'Singapore', 'SGP'],
  ];

  db.transaction(() => {
    for (const [code, name, alpha3] of countries) {
      insert.run(code, name, alpha3);
    }
  })();
}

/**
 * Seeds a few country aliases for testing.
 */
export function seedTestAliases(db: Database.Database): void {
  const insert = db.prepare(
    'INSERT INTO country_aliases (country_code, alias, source) VALUES (?, ?, ?)',
  );

  const aliases = [
    ['US', 'USA', 'test'],
    ['US', 'America', 'test'],
    ['US', 'United States of America', 'test'],
    ['GB', 'UK', 'test'],
    ['GB', 'England', 'test'],
    ['AE', 'UAE', 'test'],
  ];

  db.transaction(() => {
    for (const [code, alias, source] of aliases) {
      insert.run(code, alias, source);
    }
  })();
}

/**
 * Seeds vendor, client, rates, routing for margin engine testing.
 */
export function seedMarginTestData(db: Database.Database): void {
  // Vendor
  db.prepare(
    `INSERT INTO vendors (id, name, code, currency) VALUES (1, 'Test Vendor', 'TV', 'USD')`,
  ).run();

  // Client
  db.prepare(
    `INSERT INTO clients (id, name, code, billing_currency) VALUES (1, 'Test Client', 'TC', 'USD')`,
  ).run();

  // Upload batch (required FK for traffic)
  db.prepare(
    `INSERT INTO upload_batches (id, type, filename, status) VALUES (1, 'traffic', 'test.csv', 'completed')`,
  ).run();

  // Vendor rate: US SMS at 0.005/msg
  db.prepare(
    `INSERT INTO vendor_rates (id, vendor_id, country_code, channel, rate, currency, effective_from)
     VALUES (1, 1, 'US', 'sms', 0.005, 'USD', '2025-01-01')`,
  ).run();

  // Client rate: US SMS at 0.012/msg
  db.prepare(
    `INSERT INTO client_rates (id, client_id, country_code, channel, use_case, rate, currency, effective_from)
     VALUES (1, 1, 'US', 'sms', 'default', 0.012, 'USD', '2025-01-01')`,
  ).run();

  // Routing: Client 1 -> Vendor 1 for US SMS
  db.prepare(
    `INSERT INTO routing_assignments (id, client_id, country_code, channel, use_case, vendor_id, effective_from)
     VALUES (1, 1, 'US', 'sms', 'default', 1, '2025-01-01')`,
  ).run();

  // Traffic: 1000 msgs on 2025-03-15
  db.prepare(
    `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
     VALUES (1, 1, 1, 'US', 'sms', 'default', 1000, '2025-03-15')`,
  ).run();
}

/**
 * Seeds cross-currency test data (vendor in EUR, client in USD).
 */
export function seedCrossCurrencyTestData(db: Database.Database): void {
  // Vendor in EUR
  db.prepare(
    `INSERT INTO vendors (id, name, code, currency) VALUES (2, 'Euro Vendor', 'EV', 'EUR')`,
  ).run();

  // Vendor rate for IN SMS at 0.003 EUR
  db.prepare(
    `INSERT INTO vendor_rates (id, vendor_id, country_code, channel, rate, currency, effective_from)
     VALUES (2, 2, 'IN', 'sms', 0.003, 'EUR', '2025-01-01')`,
  ).run();

  // Client rate for IN SMS at 0.008 USD
  db.prepare(
    `INSERT INTO client_rates (id, client_id, country_code, channel, use_case, rate, currency, effective_from)
     VALUES (2, 1, 'IN', 'sms', 'default', 0.008, 'USD', '2025-01-01')`,
  ).run();

  // Routing: Client 1 -> Vendor 2 for IN SMS
  db.prepare(
    `INSERT INTO routing_assignments (id, client_id, country_code, channel, use_case, vendor_id, effective_from)
     VALUES (2, 1, 'IN', 'sms', 'default', 2, '2025-01-01')`,
  ).run();

  // FX: EUR->USD at 1.10
  db.prepare(
    `INSERT INTO fx_rates (id, from_currency, to_currency, rate, effective_from)
     VALUES (1, 'EUR', 'USD', 1.10, '2025-01-01')`,
  ).run();

  // Traffic: 5000 msgs to India
  db.prepare(
    `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
     VALUES (2, 1, 1, 'IN', 'sms', 'default', 5000, '2025-03-15')`,
  ).run();
}
