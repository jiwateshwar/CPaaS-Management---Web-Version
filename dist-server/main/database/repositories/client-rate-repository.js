"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRateRepository = void 0;
const errors_1 = require("../../../shared/errors");
const base_repository_1 = require("./base-repository");
class ClientRateRepository extends base_repository_1.BaseRepository {
    stmtCloseExisting;
    stmtInsert;
    constructor(db) {
        super(db);
        this.stmtCloseExisting = db.prepare(`
      UPDATE client_rates
      SET effective_to = ?, updated_at = datetime('now')
      WHERE client_id = ? AND country_code = ? AND channel = ? AND use_case = ?
        AND effective_to IS NULL
        AND effective_from < ?
    `);
        this.stmtInsert = db.prepare(`
      INSERT INTO client_rates
        (client_id, country_code, channel, use_case, rate, currency,
         contract_version, effective_from, effective_to, batch_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    }
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.client_id) {
            where += ' AND cr.client_id = ?';
            qp.push(params.client_id);
        }
        if (params.country_code) {
            where += ' AND cr.country_code = ?';
            qp.push(params.country_code);
        }
        if (params.channel) {
            where += ' AND cr.channel = ?';
            qp.push(params.channel);
        }
        if (params.use_case) {
            where += ' AND cr.use_case = ?';
            qp.push(params.use_case);
        }
        if (params.effective_date) {
            where += ' AND cr.effective_from <= ? AND (cr.effective_to IS NULL OR cr.effective_to > ?)';
            qp.push(params.effective_date, params.effective_date);
        }
        if (params.search) {
            where += ' AND (c.name LIKE ? OR cm.name LIKE ?)';
            qp.push(`%${params.search}%`, `%${params.search}%`);
        }
        const baseQuery = `
      SELECT cr.*, c.name as client_name, cm.name as country_name
      FROM client_rates cr
      JOIN clients c ON c.id = cr.client_id
      JOIN country_master cm ON cm.code = cr.country_code
      ${where}
    `;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM client_rates cr
      JOIN clients c ON c.id = cr.client_id
      JOIN country_master cm ON cm.code = cr.country_code
      ${where}
    `;
        return this.paginate(baseQuery, countQuery, { ...params, sortBy: params.sortBy || 'cr.effective_from' }, qp);
    }
    getById(id) {
        return (this.db
            .prepare(`SELECT cr.*, c.name as client_name, cm.name as country_name
           FROM client_rates cr
           JOIN clients c ON c.id = cr.client_id
           JOIN country_master cm ON cm.code = cr.country_code
           WHERE cr.id = ?`)
            .get(id) ?? null);
    }
    getEffective(clientId, countryCode, channel, useCase, date) {
        return (this.db
            .prepare(`SELECT * FROM client_rates
           WHERE client_id = ? AND country_code = ? AND channel = ? AND use_case = ?
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to > ?)
           ORDER BY effective_from DESC
           LIMIT 1`)
            .get(clientId, countryCode, channel, useCase, date, date) ?? null);
    }
    insertWithVersioning(dto) {
        return this.db.transaction(() => {
            const useCase = dto.use_case ?? 'default';
            this.stmtCloseExisting.run(dto.effective_from, dto.client_id, dto.country_code, dto.channel, useCase, dto.effective_from);
            const effectiveTo = dto.effective_to ?? '9999-12-31';
            const overlaps = this.db
                .prepare(`SELECT id, effective_from, effective_to FROM client_rates
           WHERE client_id = ? AND country_code = ? AND channel = ? AND use_case = ?
             AND effective_from < ?
             AND (effective_to IS NULL OR effective_to > ?)`)
                .all(dto.client_id, dto.country_code, dto.channel, useCase, effectiveTo, dto.effective_from);
            if (overlaps.length > 0) {
                throw new errors_1.RateOverlapError(`Rate overlap detected with existing rate(s): ${overlaps.map((o) => o.id).join(', ')}`, overlaps);
            }
            const result = this.stmtInsert.run(dto.client_id, dto.country_code, dto.channel, useCase, dto.rate, dto.currency ?? 'USD', dto.contract_version ?? null, dto.effective_from, dto.effective_to ?? null, dto.batch_id ?? null, dto.notes ?? null);
            const rate = this.getById(Number(result.lastInsertRowid));
            this.writeAudit('client_rates', result.lastInsertRowid, 'INSERT', null, rate);
            return rate;
        })();
    }
}
exports.ClientRateRepository = ClientRateRepository;
//# sourceMappingURL=client-rate-repository.js.map