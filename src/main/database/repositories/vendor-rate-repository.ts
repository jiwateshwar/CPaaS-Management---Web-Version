import Database from 'better-sqlite3';
import type {
  VendorRate,
  CreateVendorRateDto,
  VendorRateListParams,
  PaginatedResult,
} from '../../../shared/types';
import { RateOverlapError } from '../../../shared/errors';
import { BaseRepository } from './base-repository';

export class VendorRateRepository extends BaseRepository {
  private stmtCloseExisting: Database.Statement;
  private stmtInsert: Database.Statement;

  constructor(db: Database.Database) {
    super(db);

    this.stmtCloseExisting = db.prepare(`
      UPDATE vendor_rates
      SET effective_to = ?, updated_at = datetime('now')
      WHERE vendor_id = ? AND country_code = ? AND channel = ?
        AND effective_to IS NULL
        AND effective_from < ?
    `);

    this.stmtInsert = db.prepare(`
      INSERT INTO vendor_rates
        (vendor_id, country_code, channel, rate, currency,
         effective_from, effective_to, batch_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  list(params: VendorRateListParams): PaginatedResult<VendorRate> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.vendor_id) {
      where += ' AND vr.vendor_id = ?';
      qp.push(params.vendor_id);
    }
    if (params.country_code) {
      where += ' AND vr.country_code = ?';
      qp.push(params.country_code);
    }
    if (params.channel) {
      where += ' AND vr.channel = ?';
      qp.push(params.channel);
    }
    if (params.effective_date) {
      where += ' AND vr.effective_from <= ? AND (vr.effective_to IS NULL OR vr.effective_to > ?)';
      qp.push(params.effective_date, params.effective_date);
    }
    if (params.search) {
      where += ' AND (v.name LIKE ? OR cm.name LIKE ?)';
      qp.push(`%${params.search}%`, `%${params.search}%`);
    }

    const baseQuery = `
      SELECT vr.*, v.name as vendor_name, cm.name as country_name
      FROM vendor_rates vr
      JOIN vendors v ON v.id = vr.vendor_id
      JOIN country_master cm ON cm.code = vr.country_code
      ${where}
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM vendor_rates vr
      JOIN vendors v ON v.id = vr.vendor_id
      JOIN country_master cm ON cm.code = vr.country_code
      ${where}
    `;

    return this.paginate<VendorRate>(
      baseQuery,
      countQuery,
      { ...params, sortBy: params.sortBy || 'vr.effective_from' },
      qp,
    );
  }

  getById(id: number): VendorRate | null {
    return (
      (this.db
        .prepare(
          `SELECT vr.*, v.name as vendor_name, cm.name as country_name
           FROM vendor_rates vr
           JOIN vendors v ON v.id = vr.vendor_id
           JOIN country_master cm ON cm.code = vr.country_code
           WHERE vr.id = ?`,
        )
        .get(id) as VendorRate | undefined) ?? null
    );
  }

  getEffective(
    vendorId: number,
    countryCode: string,
    channel: string,
    date: string,
  ): VendorRate | null {
    return (
      (this.db
        .prepare(
          `SELECT * FROM vendor_rates
           WHERE vendor_id = ? AND country_code = ? AND channel = ?
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to > ?)
           ORDER BY effective_from DESC
           LIMIT 1`,
        )
        .get(vendorId, countryCode, channel, date, date) as
        | VendorRate
        | undefined) ?? null
    );
  }

  insertWithVersioning(dto: CreateVendorRateDto): VendorRate {
    return this.db.transaction(() => {
      // Auto-close previous open-ended rate
      this.stmtCloseExisting.run(
        dto.effective_from,
        dto.vendor_id,
        dto.country_code,
        dto.channel,
        dto.effective_from,
      );

      // Check for remaining overlaps
      const effectiveTo = dto.effective_to ?? '9999-12-31';
      const overlaps = this.db
        .prepare(
          `SELECT id, effective_from, effective_to FROM vendor_rates
           WHERE vendor_id = ? AND country_code = ? AND channel = ?
             AND effective_from < ?
             AND (effective_to IS NULL OR effective_to > ?)`,
        )
        .all(
          dto.vendor_id,
          dto.country_code,
          dto.channel,
          effectiveTo,
          dto.effective_from,
        );

      if (overlaps.length > 0) {
        throw new RateOverlapError(
          `Rate overlap detected with existing rate(s): ${(overlaps as Array<{ id: number }>).map((o) => o.id).join(', ')}`,
          overlaps,
        );
      }

      // Insert new rate
      const result = this.stmtInsert.run(
        dto.vendor_id,
        dto.country_code,
        dto.channel,
        dto.rate,
        dto.currency ?? 'USD',
        dto.effective_from,
        dto.effective_to ?? null,
        dto.batch_id ?? null,
        dto.notes ?? null,
      );

      const rate = this.getById(Number(result.lastInsertRowid))!;
      this.writeAudit(
        'vendor_rates',
        result.lastInsertRowid,
        'INSERT',
        null,
        rate,
      );
      return rate;
    })();
  }
}
