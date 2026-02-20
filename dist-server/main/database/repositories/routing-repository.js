"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingRepository = void 0;
const base_repository_1 = require("./base-repository");
class RoutingRepository extends base_repository_1.BaseRepository {
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.client_id) {
            where += ' AND ra.client_id = ?';
            qp.push(params.client_id);
        }
        if (params.vendor_id) {
            where += ' AND ra.vendor_id = ?';
            qp.push(params.vendor_id);
        }
        if (params.country_code) {
            where += ' AND ra.country_code = ?';
            qp.push(params.country_code);
        }
        if (params.channel) {
            where += ' AND ra.channel = ?';
            qp.push(params.channel);
        }
        if (params.effective_date) {
            where += ' AND ra.effective_from <= ? AND (ra.effective_to IS NULL OR ra.effective_to > ?)';
            qp.push(params.effective_date, params.effective_date);
        }
        if (params.search) {
            where += ' AND (c.name LIKE ? OR v.name LIKE ? OR cm.name LIKE ?)';
            qp.push(`%${params.search}%`, `%${params.search}%`, `%${params.search}%`);
        }
        const baseQuery = `
      SELECT ra.*, c.name as client_name, v.name as vendor_name, cm.name as country_name
      FROM routing_assignments ra
      JOIN clients c ON c.id = ra.client_id
      JOIN vendors v ON v.id = ra.vendor_id
      JOIN country_master cm ON cm.code = ra.country_code
      ${where}
    `;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM routing_assignments ra
      JOIN clients c ON c.id = ra.client_id
      JOIN vendors v ON v.id = ra.vendor_id
      JOIN country_master cm ON cm.code = ra.country_code
      ${where}
    `;
        return this.paginate(baseQuery, countQuery, { ...params, sortBy: params.sortBy || 'ra.effective_from' }, qp);
    }
    getEffective(clientId, countryCode, channel, useCase, date) {
        return (this.db
            .prepare(`SELECT * FROM routing_assignments
           WHERE client_id = ? AND country_code = ? AND channel = ? AND use_case = ?
             AND effective_from <= ?
             AND (effective_to IS NULL OR effective_to > ?)
           ORDER BY priority ASC, effective_from DESC
           LIMIT 1`)
            .get(clientId, countryCode, channel, useCase, date, date) ?? null);
    }
    create(dto) {
        const useCase = dto.use_case ?? 'default';
        // Auto-close previous open-ended assignment for same route
        this.db
            .prepare(`UPDATE routing_assignments
         SET effective_to = ?, updated_at = datetime('now')
         WHERE client_id = ? AND country_code = ? AND channel = ? AND use_case = ?
           AND effective_to IS NULL AND effective_from < ?`)
            .run(dto.effective_from, dto.client_id, dto.country_code, dto.channel, useCase, dto.effective_from);
        const result = this.db
            .prepare(`INSERT INTO routing_assignments
           (client_id, country_code, channel, use_case, vendor_id, priority,
            effective_from, effective_to, batch_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(dto.client_id, dto.country_code, dto.channel, useCase, dto.vendor_id, dto.priority ?? 1, dto.effective_from, dto.effective_to ?? null, dto.batch_id ?? null, dto.notes ?? null);
        const assignment = this.db
            .prepare('SELECT * FROM routing_assignments WHERE id = ?')
            .get(Number(result.lastInsertRowid));
        this.writeAudit('routing_assignments', result.lastInsertRowid, 'INSERT', null, assignment);
        return assignment;
    }
}
exports.RoutingRepository = RoutingRepository;
//# sourceMappingURL=routing-repository.js.map