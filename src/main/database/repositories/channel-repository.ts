import type { ChannelRecord, CreateChannelDto, UpdateChannelDto, ChannelListParams, PaginatedResult } from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class ChannelRepository extends BaseRepository {
  list(params: ChannelListParams): PaginatedResult<ChannelRecord> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.status) {
      where += ' AND status = ?';
      qp.push(params.status);
    }
    if (params.search) {
      where += ' AND (code LIKE ? OR label LIKE ?)';
      qp.push(`%${params.search}%`, `%${params.search}%`);
    }

    const baseQuery = `SELECT * FROM channels ${where}`;
    const countQuery = `SELECT COUNT(*) as total FROM channels ${where}`;

    return this.paginate<ChannelRecord>(
      baseQuery,
      countQuery,
      { ...params, sortBy: params.sortBy || 'code' },
      qp,
    );
  }

  getById(id: number): ChannelRecord | null {
    return (
      (this.db.prepare('SELECT * FROM channels WHERE id = ?').get(id) as ChannelRecord | undefined) ??
      null
    );
  }

  getByCode(code: string): ChannelRecord | null {
    return (
      (this.db.prepare('SELECT * FROM channels WHERE code = ? COLLATE NOCASE').get(code) as ChannelRecord | undefined) ??
      null
    );
  }

  getAll(): ChannelRecord[] {
    return this.db.prepare('SELECT * FROM channels ORDER BY code').all() as ChannelRecord[];
  }

  create(dto: CreateChannelDto): ChannelRecord {
    const result = this.db
      .prepare(
        `INSERT INTO channels (code, label, status)
         VALUES (?, ?, ?)`,
      )
      .run(dto.code.trim().toLowerCase(), dto.label.trim(), dto.status ?? 'active');

    const created = this.getById(Number(result.lastInsertRowid))!;
    this.writeAudit('channels', result.lastInsertRowid, 'INSERT', null, created);
    return created;
  }

  update(dto: UpdateChannelDto): ChannelRecord {
    const existing = this.getById(dto.id);
    if (!existing) throw new Error('Channel not found');

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.code !== undefined) {
      fields.push('code = ?');
      values.push(dto.code.trim().toLowerCase());
    }
    if (dto.label !== undefined) {
      fields.push('label = ?');
      values.push(dto.label.trim());
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(dto.id);

    this.db
      .prepare(`UPDATE channels SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    const updated = this.getById(dto.id)!;
    this.writeAudit('channels', dto.id, 'UPDATE', existing, updated);
    return updated;
  }

  delete(id: number): void {
    const existing = this.getById(id);
    if (!existing) return;

    this.db.prepare('DELETE FROM channels WHERE id = ?').run(id);
    this.writeAudit('channels', id, 'DELETE', existing, null);
  }
}
