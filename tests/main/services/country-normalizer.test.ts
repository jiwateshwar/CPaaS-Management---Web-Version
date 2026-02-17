import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { CountryNormalizer } from '../../../src/main/services/country-normalizer';
import { createTestDb, seedTestCountries, seedTestAliases } from '../../helpers/setup-db';

describe('CountryNormalizer', () => {
  let db: Database.Database;
  let normalizer: CountryNormalizer;

  beforeEach(() => {
    db = createTestDb();
    seedTestCountries(db);
    seedTestAliases(db);
    normalizer = new CountryNormalizer(db);
  });

  describe('Stage 1: ISO alpha-2 code', () => {
    it('resolves valid 2-letter ISO code', () => {
      const result = normalizer.resolve('US');
      expect(result.status).toBe('exact_master');
      expect(result.countryCode).toBe('US');
      expect(result.confidence).toBe(1.0);
    });

    it('resolves case-insensitively', () => {
      const result = normalizer.resolve('us');
      expect(result.status).toBe('exact_master');
      expect(result.countryCode).toBe('US');
    });

    it('returns unresolved for invalid 2-letter code', () => {
      const result = normalizer.resolve('XX');
      expect(result.countryCode).not.toBe('XX');
    });
  });

  describe('Stage 2: ISO alpha-3 code', () => {
    it('resolves valid 3-letter ISO code to alpha-2', () => {
      const result = normalizer.resolve('USA');
      // Should match either via alpha-3 or alias
      expect(result.countryCode).toBe('US');
      expect(result.confidence).toBe(1.0);
    });

    it('resolves GBR to GB', () => {
      const result = normalizer.resolve('GBR');
      expect(result.countryCode).toBe('GB');
    });

    it('resolves IND to IN', () => {
      const result = normalizer.resolve('IND');
      expect(result.countryCode).toBe('IN');
    });
  });

  describe('Stage 3: Exact master name match', () => {
    it('resolves full country name', () => {
      const result = normalizer.resolve('United States');
      expect(result.status).toBe('exact_master');
      expect(result.countryCode).toBe('US');
    });

    it('is case insensitive', () => {
      const result = normalizer.resolve('united kingdom');
      expect(result.status).toBe('exact_master');
      expect(result.countryCode).toBe('GB');
    });

    it('trims whitespace', () => {
      const result = normalizer.resolve('  India  ');
      expect(result.status).toBe('exact_master');
      expect(result.countryCode).toBe('IN');
    });
  });

  describe('Stage 4: Alias match', () => {
    it('resolves alias "America" to US', () => {
      const result = normalizer.resolve('America');
      expect(result.status).toBe('exact_alias');
      expect(result.countryCode).toBe('US');
    });

    it('resolves alias "UK" to GB', () => {
      const result = normalizer.resolve('UK');
      expect(result.countryCode).toBe('GB');
    });

    it('resolves alias "UAE" to AE', () => {
      const result = normalizer.resolve('UAE');
      expect(result.countryCode).toBe('AE');
    });

    it('resolves alias "United States of America"', () => {
      const result = normalizer.resolve('United States of America');
      expect(result.countryCode).toBe('US');
    });
  });

  describe('Stage 5: Fuzzy match', () => {
    it('resolves close misspelling "Germeny" to DE', () => {
      const result = normalizer.resolve('Germeny');
      expect(result.status).toBe('fuzzy_match');
      expect(result.countryCode).toBe('DE');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('resolves "Nigera" to NG (1-char drop)', () => {
      const result = normalizer.resolve('Nigera');
      expect(result.status).toBe('fuzzy_match');
      expect(result.countryCode).toBe('NG');
    });
  });

  describe('Stage 6: Unresolved', () => {
    it('returns unresolved for gibberish', () => {
      const result = normalizer.resolve('xyzfoobar123');
      expect(result.status).toBe('unresolved');
      expect(result.countryCode).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('returns unresolved for empty string', () => {
      const result = normalizer.resolve('');
      expect(result.status).toBe('unresolved');
      expect(result.countryCode).toBeNull();
    });
  });

  describe('Batch resolution', () => {
    it('resolves multiple names with caching', () => {
      const names = ['US', 'United States', 'us', 'India', 'UK', 'xyzfoo'];
      const results = normalizer.resolveBatch(names);

      expect(results.size).toBe(6);
      expect(results.get('US')!.countryCode).toBe('US');
      expect(results.get('United States')!.countryCode).toBe('US');
      expect(results.get('us')!.countryCode).toBe('US');
      expect(results.get('India')!.countryCode).toBe('IN');
      expect(results.get('UK')!.countryCode).toBe('GB');
      expect(results.get('xyzfoo')!.status).toBe('unresolved');
    });
  });

  describe('Reload', () => {
    it('picks up new aliases after reload', () => {
      // Before adding alias
      const before = normalizer.resolve('Hindustan');
      expect(before.status).not.toBe('exact_alias');

      // Add alias
      db.prepare(
        "INSERT INTO country_aliases (country_code, alias, source) VALUES ('IN', 'Hindustan', 'test')",
      ).run();

      // Still cached
      const stillOld = normalizer.resolve('Hindustan');
      expect(stillOld.status).not.toBe('exact_alias');

      // After reload
      normalizer.reload();
      const after = normalizer.resolve('Hindustan');
      expect(after.status).toBe('exact_alias');
      expect(after.countryCode).toBe('IN');
    });
  });
});
