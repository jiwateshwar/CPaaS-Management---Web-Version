import type {
  CountryMaster,
  CountryAlias,
  PendingCountryResolution,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class CountryRepository extends BaseRepository {
  listCountries(): CountryMaster[] {
    return this.db
      .prepare('SELECT * FROM country_master ORDER BY name')
      .all() as CountryMaster[];
  }

  getCountryByCode(code: string): CountryMaster | null {
    return (
      (this.db
        .prepare('SELECT * FROM country_master WHERE code = ?')
        .get(code) as CountryMaster | undefined) ?? null
    );
  }

  listAliases(countryCode: string): CountryAlias[] {
    return this.db
      .prepare(
        'SELECT * FROM country_aliases WHERE country_code = ? ORDER BY alias',
      )
      .all(countryCode) as CountryAlias[];
  }

  saveAlias(
    countryCode: string,
    alias: string,
    source: string,
  ): CountryAlias {
    const result = this.db
      .prepare(
        'INSERT INTO country_aliases (country_code, alias, source) VALUES (?, ?, ?)',
      )
      .run(countryCode, alias, source);

    return this.db
      .prepare('SELECT * FROM country_aliases WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as CountryAlias;
  }

  deleteAlias(id: number): void {
    this.db.prepare('DELETE FROM country_aliases WHERE id = ?').run(id);
  }

  getPendingResolutions(): PendingCountryResolution[] {
    return this.db
      .prepare(
        `SELECT pcr.*, cm.name as suggested_name
         FROM pending_country_resolutions pcr
         LEFT JOIN country_master cm ON cm.code = pcr.suggested_code
         WHERE pcr.resolved = 0
         ORDER BY pcr.created_at DESC`,
      )
      .all() as PendingCountryResolution[];
  }

  addPendingResolution(
    rawName: string,
    batchId: number | null,
    suggestedCode: string | null,
    confidence: number | null,
  ): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO pending_country_resolutions
           (raw_name, batch_id, suggested_code, confidence)
         VALUES (?, ?, ?, ?)`,
      )
      .run(rawName, batchId, suggestedCode, confidence);
  }

  resolveMapping(resolutionId: number, countryCode: string): void {
    this.db.transaction(() => {
      const pending = this.db
        .prepare('SELECT * FROM pending_country_resolutions WHERE id = ?')
        .get(resolutionId) as PendingCountryResolution | undefined;

      if (!pending) throw new Error(`Resolution ${resolutionId} not found`);

      // Save as alias
      this.db
        .prepare(
          "INSERT OR IGNORE INTO country_aliases (country_code, alias, source) VALUES (?, ?, 'manual')",
        )
        .run(countryCode, pending.raw_name);

      // Mark resolved
      this.db
        .prepare(
          `UPDATE pending_country_resolutions
           SET resolved = 1, resolved_code = ?, resolved_at = datetime('now')
           WHERE id = ?`,
        )
        .run(countryCode, resolutionId);
    })();
  }
}
