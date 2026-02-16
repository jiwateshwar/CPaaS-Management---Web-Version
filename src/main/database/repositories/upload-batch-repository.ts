import type {
  UploadBatch,
  BatchError,
  BatchListParams,
  PaginatedResult,
  BatchStatus,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class UploadBatchRepository extends BaseRepository {
  list(params: BatchListParams): PaginatedResult<UploadBatch> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.type) {
      where += ' AND type = ?';
      qp.push(params.type);
    }
    if (params.status) {
      where += ' AND status = ?';
      qp.push(params.status);
    }

    return this.paginate<UploadBatch>(
      `SELECT * FROM upload_batches ${where}`,
      `SELECT COUNT(*) as total FROM upload_batches ${where}`,
      { ...params, sortBy: params.sortBy || 'uploaded_at', sortDirection: 'desc' },
      qp,
    );
  }

  getById(id: number): UploadBatch | null {
    return (
      (this.db
        .prepare('SELECT * FROM upload_batches WHERE id = ?')
        .get(id) as UploadBatch | undefined) ?? null
    );
  }

  create(
    type: string,
    filename: string,
    entityId?: number,
    columnMapping?: string,
  ): UploadBatch {
    const result = this.db
      .prepare(
        `INSERT INTO upload_batches (type, filename, entity_id, column_mapping)
         VALUES (?, ?, ?, ?)`,
      )
      .run(type, filename, entityId ?? null, columnMapping ?? null);

    return this.getById(Number(result.lastInsertRowid))!;
  }

  updateStatus(
    id: number,
    status: BatchStatus,
    counts?: {
      total_rows?: number;
      processed_rows?: number;
      inserted_rows?: number;
      skipped_rows?: number;
      error_rows?: number;
    },
  ): void {
    const fields = ['status = ?'];
    const values: unknown[] = [status];

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

    if (
      status === 'completed' ||
      status === 'completed_with_errors' ||
      status === 'failed'
    ) {
      fields.push("completed_at = datetime('now')");
    }

    values.push(id);
    this.db
      .prepare(`UPDATE upload_batches SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);
  }

  addError(
    batchId: number,
    rowNumber: number,
    rawData: string,
    errorType: string,
    errorMessage: string,
  ): void {
    this.db
      .prepare(
        `INSERT INTO batch_errors (batch_id, row_number, raw_data, error_type, error_message)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(batchId, rowNumber, rawData, errorType, errorMessage);
  }

  getErrors(batchId: number): BatchError[] {
    return this.db
      .prepare(
        'SELECT * FROM batch_errors WHERE batch_id = ? ORDER BY row_number',
      )
      .all(batchId) as BatchError[];
  }
}
