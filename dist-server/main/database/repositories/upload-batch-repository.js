"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadBatchRepository = void 0;
const base_repository_1 = require("./base-repository");
class UploadBatchRepository extends base_repository_1.BaseRepository {
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.type) {
            where += ' AND type = ?';
            qp.push(params.type);
        }
        if (params.status) {
            where += ' AND status = ?';
            qp.push(params.status);
        }
        return this.paginate(`SELECT * FROM upload_batches ${where}`, `SELECT COUNT(*) as total FROM upload_batches ${where}`, { ...params, sortBy: params.sortBy || 'uploaded_at', sortDirection: 'desc' }, qp);
    }
    getById(id) {
        return (this.db
            .prepare('SELECT * FROM upload_batches WHERE id = ?')
            .get(id) ?? null);
    }
    create(type, filename, entityId, columnMapping) {
        const result = this.db
            .prepare(`INSERT INTO upload_batches (type, filename, entity_id, column_mapping)
         VALUES (?, ?, ?, ?)`)
            .run(type, filename, entityId ?? null, columnMapping ?? null);
        return this.getById(Number(result.lastInsertRowid));
    }
    updateStatus(id, status, counts) {
        const fields = ['status = ?'];
        const values = [status];
        if (counts?.total_rows !== undefined) {
            fields.push('total_rows = ?');
            values.push(counts.total_rows);
        }
        if (counts?.processed_rows !== undefined) {
            fields.push('processed_rows = ?');
            values.push(counts.processed_rows);
        }
        if (counts?.inserted_rows !== undefined) {
            fields.push('inserted_rows = ?');
            values.push(counts.inserted_rows);
        }
        if (counts?.skipped_rows !== undefined) {
            fields.push('skipped_rows = ?');
            values.push(counts.skipped_rows);
        }
        if (counts?.error_rows !== undefined) {
            fields.push('error_rows = ?');
            values.push(counts.error_rows);
        }
        if (status === 'completed' ||
            status === 'completed_with_errors' ||
            status === 'failed') {
            fields.push("completed_at = datetime('now')");
        }
        values.push(id);
        this.db
            .prepare(`UPDATE upload_batches SET ${fields.join(', ')} WHERE id = ?`)
            .run(...values);
    }
    addError(batchId, rowNumber, rawData, errorType, errorMessage) {
        this.db
            .prepare(`INSERT INTO batch_errors (batch_id, row_number, raw_data, error_type, error_message)
         VALUES (?, ?, ?, ?, ?)`)
            .run(batchId, rowNumber, rawData, errorType, errorMessage);
    }
    getErrors(batchId) {
        return this.db
            .prepare('SELECT * FROM batch_errors WHERE batch_id = ? ORDER BY row_number')
            .all(batchId);
    }
}
exports.UploadBatchRepository = UploadBatchRepository;
//# sourceMappingURL=upload-batch-repository.js.map