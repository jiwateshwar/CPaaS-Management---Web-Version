import type {
  TrafficRecord,
  TrafficListParams,
  PaginatedResult,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class TrafficRepository extends BaseRepository {
  list(params: TrafficListParams): PaginatedResult<TrafficRecord> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.client_id) {
      where += ' AND tr.client_id = ?';
      qp.push(params.client_id);
    }
    if (params.country_code) {
      where += ' AND tr.country_code = ?';
      qp.push(params.country_code);
    }
    if (params.channel) {
      where += ' AND tr.channel = ?';
      qp.push(params.channel);
    }
    if (params.date_from) {
      where += ' AND tr.traffic_date >= ?';
      qp.push(params.date_from);
    }
    if (params.date_to) {
      where += ' AND tr.traffic_date <= ?';
      qp.push(params.date_to);
    }
    if (params.batch_id) {
      where += ' AND tr.batch_id = ?';
      qp.push(params.batch_id);
    }

    const baseQuery = `
      SELECT tr.*, c.name as client_name, cm.name as country_name
      FROM traffic_records tr
      JOIN clients c ON c.id = tr.client_id
      JOIN country_master cm ON cm.code = tr.country_code
      ${where}
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM traffic_records tr
      JOIN clients c ON c.id = tr.client_id
      JOIN country_master cm ON cm.code = tr.country_code
      ${where}
    `;

    return this.paginate<TrafficRecord>(
      baseQuery,
      countQuery,
      { ...params, sortBy: params.sortBy || 'tr.traffic_date' },
      qp,
    );
  }

  getByBatchId(batchId: number): TrafficRecord[] {
    return this.db
      .prepare('SELECT * FROM traffic_records WHERE batch_id = ?')
      .all(batchId) as TrafficRecord[];
  }
}
