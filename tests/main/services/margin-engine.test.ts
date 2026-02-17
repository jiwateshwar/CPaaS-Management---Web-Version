import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { MarginEngine } from '../../../src/main/services/margin-engine';
import {
  createTestDb,
  seedTestCountries,
  seedMarginTestData,
  seedCrossCurrencyTestData,
} from '../../helpers/setup-db';

describe('MarginEngine', () => {
  let db: Database.Database;
  let engine: MarginEngine;

  beforeEach(() => {
    db = createTestDb();
    seedTestCountries(db);
    seedMarginTestData(db);
    engine = new MarginEngine(db);
  });

  describe('computeForTrafficBatch - same currency', () => {
    it('computes margin correctly for US SMS traffic', () => {
      const result = engine.computeForTrafficBatch(1);

      expect(result.totalRecords).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // 1000 msgs * 0.005 vendor rate = 5.00 cost
      expect(result.summary.totalVendorCost).toBe(5.0);
      // 1000 msgs * 0.012 client rate = 12.00 revenue
      expect(result.summary.totalClientRevenue).toBe(12.0);
      // margin = 12.00 - 5.00 = 7.00
      expect(result.summary.totalMargin).toBe(7.0);
    });

    it('creates an immutable ledger entry', () => {
      engine.computeForTrafficBatch(1);

      const entry = db
        .prepare('SELECT * FROM margin_ledger WHERE id = 1')
        .get() as Record<string, unknown>;

      expect(entry).toBeDefined();
      expect(entry.client_id).toBe(1);
      expect(entry.vendor_id).toBe(1);
      expect(entry.country_code).toBe('US');
      expect(entry.message_count).toBe(1000);
      expect(entry.vendor_rate).toBe(0.005);
      expect(entry.client_rate).toBe(0.012);
      expect(entry.vendor_cost).toBe(5.0);
      expect(entry.client_revenue).toBe(12.0);
      expect(entry.margin).toBe(7.0);
      expect(entry.locked).toBe(1);
      expect(entry.is_reversal).toBe(0);
    });

    it('prevents UPDATE on ledger entries', () => {
      engine.computeForTrafficBatch(1);

      expect(() => {
        db.prepare('UPDATE margin_ledger SET margin = 999 WHERE id = 1').run();
      }).toThrow(/immutable/);
    });

    it('prevents DELETE on ledger entries', () => {
      engine.computeForTrafficBatch(1);

      expect(() => {
        db.prepare('DELETE FROM margin_ledger WHERE id = 1').run();
      }).toThrow(/immutable|cannot be deleted/);
    });
  });

  describe('computeForTrafficBatch - cross currency', () => {
    beforeEach(() => {
      seedCrossCurrencyTestData(db);
    });

    it('applies FX conversion when currencies differ', () => {
      const result = engine.computeForTrafficBatch(1);

      // Batch 1 has 2 records now: US (same currency) + IN (cross currency)
      expect(result.totalRecords).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.errorCount).toBe(0);

      // US: cost=5.0, revenue=12.0, margin=7.0
      // IN: cost = 5000 * 0.003 EUR = 15 EUR, revenue = 5000 * 0.008 USD = 40 USD
      //     normalized cost = 15 * 1.10 = 16.5 USD
      //     margin = 40 - 16.5 = 23.5
      expect(result.summary.totalVendorCost).toBeCloseTo(20.0, 4); // 5 + 15
      expect(result.summary.totalClientRevenue).toBeCloseTo(52.0, 4); // 12 + 40
      expect(result.summary.totalMargin).toBeCloseTo(30.5, 4); // 7 + 23.5

      // Verify the IN entry has FX rate applied
      const inEntry = db
        .prepare(
          "SELECT * FROM margin_ledger WHERE country_code = 'IN'",
        )
        .get() as Record<string, unknown>;

      expect(inEntry.fx_rate).toBe(1.1);
      expect(inEntry.normalized_vendor_cost).toBeCloseTo(16.5, 4);
      expect(inEntry.normalized_currency).toBe('USD');
      expect(inEntry.margin).toBeCloseTo(23.5, 4);
    });
  });

  describe('error handling', () => {
    it('reports missing routing', () => {
      // Add traffic for a country with no routing
      db.prepare(
        `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 100, '2025-03-15')`,
      ).run();

      const result = engine.computeForTrafficBatch(1);

      // US succeeds, DE fails
      expect(result.successCount).toBe(1);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0].errorType).toBe('no_routing');
      expect(result.errors[0].trafficRecordId).toBe(10);
    });

    it('reports missing vendor rate', () => {
      // Add routing for DE but no vendor rate
      db.prepare(
        `INSERT INTO routing_assignments (client_id, country_code, channel, use_case, vendor_id, effective_from)
         VALUES (1, 'DE', 'sms', 'default', 1, '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 100, '2025-03-15')`,
      ).run();

      const result = engine.computeForTrafficBatch(1);

      expect(result.errors.some((e) => e.errorType === 'no_vendor_rate')).toBe(true);
    });

    it('reports missing FX rate for cross-currency', () => {
      // Add EUR vendor for DE but no FX rate
      db.prepare(
        `INSERT INTO vendors (id, name, code, currency) VALUES (3, 'EUR Vendor', 'EV2', 'EUR')`,
      ).run();
      db.prepare(
        `INSERT INTO routing_assignments (client_id, country_code, channel, use_case, vendor_id, effective_from)
         VALUES (1, 'DE', 'sms', 'default', 3, '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO vendor_rates (vendor_id, country_code, channel, rate, currency, effective_from)
         VALUES (3, 'DE', 'sms', 0.004, 'EUR', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO client_rates (client_id, country_code, channel, use_case, rate, currency, effective_from)
         VALUES (1, 'DE', 'sms', 'default', 0.010, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 100, '2025-03-15')`,
      ).run();

      const result = engine.computeForTrafficBatch(1);

      expect(result.errors.some((e) => e.errorType === 'no_fx_rate')).toBe(true);
    });
  });

  describe('precision', () => {
    it('rounds to 6 decimal places', () => {
      // Create a rate that produces long decimal: 7 msgs * 0.003333 = 0.023331
      db.prepare(
        `INSERT INTO vendor_rates (vendor_id, country_code, channel, rate, currency, effective_from)
         VALUES (1, 'GB', 'sms', 0.003333, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO client_rates (client_id, country_code, channel, use_case, rate, currency, effective_from)
         VALUES (1, 'GB', 'sms', 'default', 0.007777, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO routing_assignments (client_id, country_code, channel, use_case, vendor_id, effective_from)
         VALUES (1, 'GB', 'sms', 'default', 1, '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO traffic_records (id, batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
         VALUES (99, 1, 1, 'GB', 'sms', 'default', 7, '2025-03-15')`,
      ).run();

      const result = engine.computeForTrafficBatch(1);

      // All entries should succeed
      const gbEntry = db
        .prepare("SELECT * FROM margin_ledger WHERE country_code = 'GB'")
        .get() as Record<string, unknown>;

      // Check that values are rounded to 6 decimals (no more)
      const cost = gbEntry.vendor_cost as number;
      const rev = gbEntry.client_revenue as number;
      const margin = gbEntry.margin as number;

      expect(cost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(rev.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(margin.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });
});
