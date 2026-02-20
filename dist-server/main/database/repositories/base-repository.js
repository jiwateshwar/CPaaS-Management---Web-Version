"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    paginate(baseQuery, countQuery, params, queryParams = []) {
        const page = params.page ?? 1;
        const pageSize = params.pageSize ?? 50;
        const offset = (page - 1) * pageSize;
        const totalRow = this.db.prepare(countQuery).get(...queryParams);
        const total = totalRow?.total ?? 0;
        let query = baseQuery;
        if (params.sortBy) {
            const direction = params.sortDirection === 'desc' ? 'DESC' : 'ASC';
            // Only allow alphanumeric and underscore in sort column to prevent injection
            const safeColumn = params.sortBy.replace(/[^a-zA-Z0-9_]/g, '');
            query += ` ORDER BY ${safeColumn} ${direction}`;
        }
        query += ' LIMIT ? OFFSET ?';
        const data = this.db
            .prepare(query)
            .all(...queryParams, pageSize, offset);
        return {
            data,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }
    writeAudit(tableName, recordId, action, oldValues, newValues) {
        this.db
            .prepare(`INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
         VALUES (?, ?, ?, ?, ?)`)
            .run(tableName, Number(recordId), action, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null);
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=base-repository.js.map