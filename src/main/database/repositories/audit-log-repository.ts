import type {
  AuditLogEntry,
  AuditListParams,
  PaginatedResult,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class AuditLogRepository extends BaseRepository {
  list(params: AuditListParams): PaginatedResult<AuditLogEntry> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

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

    return this.paginate<AuditLogEntry>(
      `SELECT * FROM audit_log ${where}`,
      `SELECT COUNT(*) as total FROM audit_log ${where}`,
      { ...params, sortBy: params.sortBy || 'created_at', sortDirection: 'desc' },
      qp,
    );
  }
}
