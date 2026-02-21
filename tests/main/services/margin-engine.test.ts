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

      // Vendor cost = 1*1 + 1*2 + 1000*0.005 + 900*0.004 = 11.6
      expect(result.summary.totalVendorCost).toBe(11.6);
      // Client revenue = 1*2 + 1*3 + 1000*0.012 + 900*0.011 = 26.9
      expect(result.summary.totalClientRevenue).toBe(26.9);
      // margin = 26.9 - 11.6 = 15.3
      expect(result.summary.totalMargin).toBe(15.3);
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
      expect(entry.message_count).toBe(1900);
      expect(entry.vendor_rate).toBeCloseTo(0.006105, 6);
      expect(entry.client_rate).toBeCloseTo(0.014158, 6);
      expect(entry.vendor_cost).toBe(11.6);
      expect(entry.client_revenue).toBe(26.9);
      expect(entry.margin).toBe(15.3);
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

      // US: cost=11.6, revenue=26.9, margin=15.3
      // IN: cost = 1.5 + 2.5 + 5000*0.003 + 4500*0.0027 = 31.15 EUR
      //     revenue = 2.5 + 3.5 + 5000*0.008 + 4500*0.0075 = 79.75 USD
      //     normalized cost = 31.15 * 1.10 = 34.265 USD
      //     margin = 79.75 - 34.265 = 45.485
      expect(result.summary.totalVendorCost).toBeCloseTo(42.75, 4);
      expect(result.summary.totalClientRevenue).toBeCloseTo(106.65, 4);
      expect(result.summary.totalMargin).toBeCloseTo(60.785, 4);

      // Verify the IN entry has FX rate applied
      const inEntry = db
        .prepare(
          "SELECT * FROM margin_ledger WHERE country_code = 'IN'",
        )
        .get() as Record<string, unknown>;

      expect(inEntry.fx_rate).toBe(1.1);
      expect(inEntry.normalized_vendor_cost).toBeCloseTo(34.265, 4);
      expect(inEntry.normalized_currency).toBe('USD');
      expect(inEntry.margin).toBeCloseTo(45.485, 4);
    });
  });

  describe('error handling', () => {
    it('reports missing routing', () => {
      // Add traffic for a country with no routing
      db.prepare(
        `INSERT INTO traffic_records (
          id, batch_id, client_id, country_code, channel, use_case,
          setup_count, monthly_count, mt_count, mo_count, message_count, traffic_date
        )
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 0, 0, 100, 0, 100, '2025-03-15')`,
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
        `INSERT INTO traffic_records (
          id, batch_id, client_id, country_code, channel, use_case,
          setup_count, monthly_count, mt_count, mo_count, message_count, traffic_date
        )
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 0, 0, 100, 0, 100, '2025-03-15')`,
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
        `INSERT INTO vendor_rates (
          vendor_id, country_code, channel, use_case, rate,
          setup_fee, monthly_fee, mt_fee, mo_fee, currency, effective_from
        )
         VALUES (3, 'DE', 'sms', 'default', 0.004, 0, 0, 0.004, 0.0038, 'EUR', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO client_rates (
          client_id, country_code, channel, use_case, rate,
          setup_fee, monthly_fee, mt_fee, mo_fee, currency, effective_from
        )
         VALUES (1, 'DE', 'sms', 'default', 0.010, 0, 0, 0.010, 0.0095, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO traffic_records (
          id, batch_id, client_id, country_code, channel, use_case,
          setup_count, monthly_count, mt_count, mo_count, message_count, traffic_date
        )
         VALUES (10, 1, 1, 'DE', 'sms', 'default', 0, 0, 100, 0, 100, '2025-03-15')`,
      ).run();

      const result = engine.computeForTrafficBatch(1);

      expect(result.errors.some((e) => e.errorType === 'no_fx_rate')).toBe(true);
    });
  });

  describe('precision', () => {
    it('rounds to 6 decimal places', () => {
      // Create a rate that produces long decimal: 7 msgs * 0.003333 = 0.023331
      db.prepare(
        `INSERT INTO vendor_rates (
          vendor_id, country_code, channel, use_case, rate,
          setup_fee, monthly_fee, mt_fee, mo_fee, currency, effective_from
        )
         VALUES (1, 'GB', 'sms', 'default', 0.003333, 0, 0, 0.003333, 0, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO client_rates (
          client_id, country_code, channel, use_case, rate,
          setup_fee, monthly_fee, mt_fee, mo_fee, currency, effective_from
        )
         VALUES (1, 'GB', 'sms', 'default', 0.007777, 0, 0, 0.007777, 0, 'USD', '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO routing_assignments (client_id, country_code, channel, use_case, vendor_id, effective_from)
         VALUES (1, 'GB', 'sms', 'default', 1, '2025-01-01')`,
      ).run();
      db.prepare(
        `INSERT INTO traffic_records (
          id, batch_id, client_id, country_code, channel, use_case,
          setup_count, monthly_count, mt_count, mo_count, message_count, traffic_date
        )
         VALUES (99, 1, 1, 'GB', 'sms', 'default', 0, 0, 7, 0, 7, '2025-03-15')`,
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
