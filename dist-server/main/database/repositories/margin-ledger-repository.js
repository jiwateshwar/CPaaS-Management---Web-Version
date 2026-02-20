"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarginLedgerRepository = void 0;
const base_repository_1 = require("./base-repository");
class MarginLedgerRepository extends base_repository_1.BaseRepository {
    // NO update method - ledger is immutable
    // NO delete method - ledger is immutable
    insert(entry) {
        const result = this.db
            .prepare(`INSERT INTO margin_ledger (
          traffic_record_id, client_id, vendor_id, country_code,
          channel, use_case, traffic_date, message_count,
          vendor_rate_id, vendor_rate, vendor_currency, vendor_cost,
          client_rate_id, client_rate, client_currency, client_revenue,
          fx_rate_id, fx_rate, normalized_vendor_cost, normalized_currency,
          margin, is_reversal, original_entry_id, reversal_reason, locked
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, 1
        )`)
            .run(entry.traffic_record_id, entry.client_id, entry.vendor_id, entry.country_code, entry.channel, entry.use_case, entry.traffic_date, entry.message_count, entry.vendor_rate_id, entry.vendor_rate, entry.vendor_currency, entry.vendor_cost, entry.client_rate_id, entry.client_rate, entry.client_currency, entry.client_revenue, entry.fx_rate_id, entry.fx_rate, entry.normalized_vendor_cost, entry.normalized_currency, entry.margin, entry.is_reversal, entry.original_entry_id, entry.reversal_reason);
        return this.getById(Number(result.lastInsertRowid));
    }
    reverseEntry(originalEntryId, reason) {
        const original = this.getById(originalEntryId);
        if (!original)
            throw new Error(`Ledger entry ${originalEntryId} not found`);
        if (original.is_reversal)
            throw new Error('Cannot reverse a reversal entry');
        // Check if already reversed
        const existing = this.db
            .prepare('SELECT id FROM margin_ledger WHERE original_entry_id = ? AND is_reversal = 1')
            .get(originalEntryId);
        if (existing) {
            throw new Error(`Entry ${originalEntryId} already reversed by entry ${existing.id}`);
        }
        return this.insert({
            traffic_record_id: original.traffic_record_id,
            client_id: original.client_id,
            vendor_id: original.vendor_id,
            country_code: original.country_code,
            channel: original.channel,
            use_case: original.use_case,
            traffic_date: original.traffic_date,
            message_count: -original.message_count,
            vendor_rate_id: original.vendor_rate_id,
            vendor_rate: original.vendor_rate,
            vendor_currency: original.vendor_currency,
            vendor_cost: -original.vendor_cost,
            client_rate_id: original.client_rate_id,
            client_rate: original.client_rate,
            client_currency: original.client_currency,
            client_revenue: -original.client_revenue,
            fx_rate_id: original.fx_rate_id,
            fx_rate: original.fx_rate,
            normalized_vendor_cost: original.normalized_vendor_cost
                ? -original.normalized_vendor_cost
                : null,
            normalized_currency: original.normalized_currency,
            margin: -original.margin,
            is_reversal: 1,
            original_entry_id: originalEntryId,
            reversal_reason: reason,
        });
    }
    getById(id) {
        return (this.db
            .prepare(`SELECT ml.*, c.name as client_name, v.name as vendor_name, cm.name as country_name
           FROM margin_ledger ml
           JOIN clients c ON c.id = ml.client_id
           JOIN vendors v ON v.id = ml.vendor_id
           JOIN country_master cm ON cm.code = ml.country_code
           WHERE ml.id = ?`)
            .get(id) ?? null);
    }
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.client_id) {
            where += ' AND ml.client_id = ?';
            qp.push(params.client_id);
        }
        if (params.vendor_id) {
            where += ' AND ml.vendor_id = ?';
            qp.push(params.vendor_id);
        }
        if (params.country_code) {
            where += ' AND ml.country_code = ?';
            qp.push(params.country_code);
        }
        if (params.channel) {
            where += ' AND ml.channel = ?';
            qp.push(params.channel);
        }
        if (params.date_from) {
            where += ' AND ml.traffic_date >= ?';
            qp.push(params.date_from);
        }
        if (params.date_to) {
            where += ' AND ml.traffic_date <= ?';
            qp.push(params.date_to);
        }
        if (!params.include_reversals) {
            where += ' AND ml.is_reversal = 0';
        }
        const baseQuery = `
      SELECT ml.*, c.name as client_name, v.name as vendor_name, cm.name as country_name
      FROM margin_ledger ml
      JOIN clients c ON c.id = ml.client_id
      JOIN vendors v ON v.id = ml.vendor_id
      JOIN country_master cm ON cm.code = ml.country_code
      ${where}
    `;
        const countQuery = `
      SELECT COUNT(*) as total
      FROM margin_ledger ml
      JOIN clients c ON c.id = ml.client_id
      JOIN vendors v ON v.id = ml.vendor_id
      JOIN country_master cm ON cm.code = ml.country_code
      ${where}
    `;
        return this.paginate(baseQuery, countQuery, { ...params, sortBy: params.sortBy || 'ml.traffic_date' }, qp);
    }
}
exports.MarginLedgerRepository = MarginLedgerRepository;
//# sourceMappingURL=margin-ledger-repository.js.map