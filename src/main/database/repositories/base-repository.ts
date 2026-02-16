import Database from 'better-sqlite3';
import type { PaginatedResult, ListParams } from '../../../shared/types';

export abstract class BaseRepository {
  constructor(protected db: Database.Database) {}

  protected paginate<T>(
    baseQuery: string,
    countQuery: string,
    params: ListParams,
    queryParams: unknown[] = [],
  ): PaginatedResult<T> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const totalRow = this.db.prepare(countQuery).get(...queryParams) as {
      total: number;
    };
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
      .all(...queryParams, pageSize, offset) as T[];

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  protected writeAudit(
    tableName: string,
    recordId: number | bigint,
    action: 'INSERT' | 'UPDATE' | 'DELETE',
    oldValues: unknown | null,
    newValues: unknown | null,
  ): void {
    this.db
      .prepare(
        `INSERT INTO audit_log (table_name, record_id, action, old_values, new_values)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        tableName,
        Number(recordId),
        action,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
      );
  }
}
