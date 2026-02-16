import type {
  FxRate,
  CreateFxRateDto,
  FxRateListParams,
  PaginatedResult,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class FxRateRepository extends BaseRepository {
  list(params: FxRateListParams): PaginatedResult<FxRate> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.from_currency) {
      where += ' AND from_currency = ?';
      qp.push(params.from_currency);
    }
    if (params.to_currency) {
      where += ' AND to_currency = ?';
      qp.push(params.to_currency);
    }
    if (params.effective_date) {
      where += ' AND effective_from <= ? AND (effective_to IS NULL OR effective_to > ?)';
      qp.push(params.effective_date, params.effective_date);
    }

    return this.paginate<FxRate>(
      `SELECT * FROM fx_rates ${where}`,
      `SELECT COUNT(*) as total FROM fx_rates ${where}`,
      { ...params, sortBy: params.sortBy || 'effective_from' },
      qp,
    );
  }

  getEffective(
    fromCurrency: string,
    toCurrency: string,
    date: string,
  ): FxRate | null {
    return (
      (this.db
        .prepare(
          `SELECT * FROM fx_rates
           WHERE from_currency = ? AND to_currency = ?
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to > ?)
           ORDER BY effective_from DESC
           LIMIT 1`,
        )
        .get(fromCurrency, toCurrency, date, date) as FxRate | undefined) ??
      null
    );
  }

  create(dto: CreateFxRateDto): FxRate {
    // Auto-close previous
    this.db
      .prepare(
        `UPDATE fx_rates
         SET effective_to = ?, updated_at = datetime('now')
         WHERE from_currency = ? AND to_currency = ?
           AND effective_to IS NULL AND effective_from < ?`,
      )
      .run(dto.effective_from, dto.from_currency, dto.to_currency, dto.effective_from);

    const result = this.db
      .prepare(
        `INSERT INTO fx_rates (from_currency, to_currency, rate, effective_from, effective_to, source, batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dto.from_currency,
        dto.to_currency,
        dto.rate,
        dto.effective_from,
        dto.effective_to ?? null,
        dto.source ?? 'manual',
        dto.batch_id ?? null,
      );

    return this.db
      .prepare('SELECT * FROM fx_rates WHERE id = ?')
      .get(Number(result.lastInsertRowid)) as FxRate;
  }
}
