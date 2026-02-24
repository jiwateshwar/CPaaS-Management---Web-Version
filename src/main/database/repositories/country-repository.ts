import type {
  CountryMaster,
  CountryAlias,
  CountryAliasWithName,
  CreateCountryDto,
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

  createCountry(dto: CreateCountryDto): CountryMaster {
    const existing = this.db
      .prepare('SELECT * FROM country_master WHERE code = ? OR name = ?')
      .get(dto.code.toUpperCase(), dto.name) as CountryMaster | undefined;
    if (existing) throw new Error(`Country with code "${dto.code}" or name "${dto.name}" already exists`);

    this.db
      .prepare(
        `INSERT INTO country_master (code, name, iso_alpha3, iso_numeric)
         VALUES (?, ?, ?, ?)`,
      )
      .run(dto.code.toUpperCase(), dto.name, dto.iso_alpha3 ?? null, dto.iso_numeric ?? null);

    return this.db
      .prepare('SELECT * FROM country_master WHERE code = ?')
      .get(dto.code.toUpperCase()) as CountryMaster;
  }

  listAllAliasesWithNames(): CountryAliasWithName[] {
    return this.db
      .prepare(
        `SELECT ca.id, ca.country_code, cm.name AS country_name, ca.alias, ca.source
         FROM country_aliases ca
         JOIN country_master cm ON cm.code = ca.country_code
         ORDER BY cm.name, ca.alias`,
      )
      .all() as CountryAliasWithName[];
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
