"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogRepository = void 0;
const base_repository_1 = require("./base-repository");
class AuditLogRepository extends base_repository_1.BaseRepository {
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.table_name) {
            where += ' AND table_name = ?';
            qp.push(params.table_name);
        }
        if (params.action) {
            where += ' AND action = ?';
            qp.push(params.action);
        }
        if (params.date_from) {
            where += ' AND created_at >= ?';
            qp.push(params.date_from);
        }
        if (params.date_to) {
            where += ' AND created_at <= ?';
            qp.push(params.date_to);
        }
        return this.paginate(`SELECT * FROM audit_log ${where}`, `SELECT COUNT(*) as total FROM audit_log ${where}`, { ...params, sortBy: params.sortBy || 'created_at', sortDirection: 'desc' }, qp);
    }
}
exports.AuditLogRepository = AuditLogRepository;
//# sourceMappingURL=audit-log-repository.js.map