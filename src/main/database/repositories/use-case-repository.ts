import type { UseCase, CreateUseCaseDto, UpdateUseCaseDto, UseCaseListParams, PaginatedResult } from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class UseCaseRepository extends BaseRepository {
  list(params: UseCaseListParams): PaginatedResult<UseCase> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.status) {
      where += ' AND status = ?';
      qp.push(params.status);
    }
    if (params.search) {
      where += ' AND (name LIKE ? OR description LIKE ?)';
      qp.push(`%${params.search}%`, `%${params.search}%`);
    }

    const baseQuery = `SELECT * FROM use_cases ${where}`;
    const countQuery = `SELECT COUNT(*) as total FROM use_cases ${where}`;

    return this.paginate<UseCase>(
      baseQuery,
      countQuery,
      { ...params, sortBy: params.sortBy || 'name' },
      qp,
    );
  }

  getByName(name: string): UseCase | null {
    return (
      (this.db.prepare('SELECT * FROM use_cases WHERE name = ? COLLATE NOCASE').get(name) as UseCase | undefined) ??
      null
    );
  }

  getAll(): UseCase[] {
    return this.db.prepare('SELECT * FROM use_cases WHERE status = ? ORDER BY name').all('active') as UseCase[];
  }

  getById(id: number): UseCase | null {
    return (
      (this.db.prepare('SELECT * FROM use_cases WHERE id = ?').get(id) as UseCase | undefined) ??
      null
    );
  }

  create(dto: CreateUseCaseDto): UseCase {
    const result = this.db
      .prepare(
        `INSERT INTO use_cases (name, description, status)
         VALUES (?, ?, ?)`,
      )
      .run(dto.name, dto.description ?? null, dto.status ?? 'active');

    const created = this.getById(Number(result.lastInsertRowid))!;
    this.writeAudit('use_cases', result.lastInsertRowid, 'INSERT', null, created);
    return created;
  }

  update(dto: UpdateUseCaseDto): UseCase {
    const existing = this.getById(dto.id);
    if (!existing) throw new Error('Use case not found');

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      values.push(dto.description);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(dto.id);

    this.db
      .prepare(`UPDATE use_cases SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    const updated = this.getById(dto.id)!;
    this.writeAudit('use_cases', dto.id, 'UPDATE', existing, updated);
    return updated;
  }

  delete(id: number): void {
    const existing = this.getById(id);
    if (!existing) return;

    this.db.prepare('DELETE FROM use_cases WHERE id = ?').run(id);
    this.writeAudit('use_cases', id, 'DELETE', existing, null);
  }
}
