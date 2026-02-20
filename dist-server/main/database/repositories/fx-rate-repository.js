"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FxRateRepository = void 0;
const base_repository_1 = require("./base-repository");
class FxRateRepository extends base_repository_1.BaseRepository {
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
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
        return this.paginate(`SELECT * FROM fx_rates ${where}`, `SELECT COUNT(*) as total FROM fx_rates ${where}`, { ...params, sortBy: params.sortBy || 'effective_from' }, qp);
    }
    getEffective(fromCurrency, toCurrency, date) {
        return (this.db
            .prepare(`SELECT * FROM fx_rates
           WHERE from_currency = ? AND to_currency = ?
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to > ?)
           ORDER BY effective_from DESC
           LIMIT 1`)
            .get(fromCurrency, toCurrency, date, date) ??
            null);
    }
    create(dto) {
        // Auto-close previous
        this.db
            .prepare(`UPDATE fx_rates
         SET effective_to = ?, updated_at = datetime('now')
         WHERE from_currency = ? AND to_currency = ?
           AND effective_to IS NULL AND effective_from < ?`)
            .run(dto.effective_from, dto.from_currency, dto.to_currency, dto.effective_from);
        const result = this.db
            .prepare(`INSERT INTO fx_rates (from_currency, to_currency, rate, effective_from, effective_to, source, batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(dto.from_currency, dto.to_currency, dto.rate, dto.effective_from, dto.effective_to ?? null, dto.source ?? 'manual', dto.batch_id ?? null);
        return this.db
            .prepare('SELECT * FROM fx_rates WHERE id = ?')
            .get(Number(result.lastInsertRowid));
    }
}
exports.FxRateRepository = FxRateRepository;
//# sourceMappingURL=fx-rate-repository.js.map