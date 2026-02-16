import type {
  Vendor,
  CreateVendorDto,
  UpdateVendorDto,
  VendorListParams,
  PaginatedResult,
} from '../../../shared/types';
import { BaseRepository } from './base-repository';

export class VendorRepository extends BaseRepository {
  list(params: VendorListParams): PaginatedResult<Vendor> {
    let where = 'WHERE 1=1';
    const qp: unknown[] = [];

    if (params.status) {
      where += ' AND status = ?';
      qp.push(params.status);
    }
    if (params.search) {
      where += ' AND (name LIKE ? OR code LIKE ?)';
      qp.push(`%${params.search}%`, `%${params.search}%`);
    }

    return this.paginate<Vendor>(
      `SELECT * FROM vendors ${where}`,
      `SELECT COUNT(*) as total FROM vendors ${where}`,
      { ...params, sortBy: params.sortBy || 'name' },
      qp,
    );
  }

  getById(id: number): Vendor | null {
    return (
      (this.db
        .prepare('SELECT * FROM vendors WHERE id = ?')
        .get(id) as Vendor | undefined) ?? null
    );
  }

  getByCode(code: string): Vendor | null {
    return (
      (this.db
        .prepare('SELECT * FROM vendors WHERE code = ?')
        .get(code) as Vendor | undefined) ?? null
    );
  }

  create(dto: CreateVendorDto): Vendor {
    const result = this.db
      .prepare(
        `INSERT INTO vendors (name, code, contact_name, contact_email, contact_phone, currency, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dto.name,
        dto.code,
        dto.contact_name ?? null,
        dto.contact_email ?? null,
        dto.contact_phone ?? null,
        dto.currency ?? 'USD',
        dto.notes ?? null,
      );

    const vendor = this.getById(Number(result.lastInsertRowid))!;
    this.writeAudit('vendors', result.lastInsertRowid, 'INSERT', null, vendor);
    return vendor;
  }

  update(dto: UpdateVendorDto): Vendor {
    const existing = this.getById(dto.id);
    if (!existing) throw new Error(`Vendor ${dto.id} not found`);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) { fields.push('name = ?'); values.push(dto.name); }
    if (dto.code !== undefined) { fields.push('code = ?'); values.push(dto.code); }
    if (dto.contact_name !== undefined) { fields.push('contact_name = ?'); values.push(dto.contact_name); }
    if (dto.contact_email !== undefined) { fields.push('contact_email = ?'); values.push(dto.contact_email); }
    if (dto.contact_phone !== undefined) { fields.push('contact_phone = ?'); values.push(dto.contact_phone); }
    if (dto.currency !== undefined) { fields.push('currency = ?'); values.push(dto.currency); }
    if (dto.notes !== undefined) { fields.push('notes = ?'); values.push(dto.notes); }
    if (dto.status !== undefined) { fields.push('status = ?'); values.push(dto.status); }

    if (fields.length === 0) return existing;

    fields.push("updated_at = datetime('now')");
    values.push(dto.id);

    this.db
      .prepare(`UPDATE vendors SET ${fields.join(', ')} WHERE id = ?`)
      .run(...values);

    const updated = this.getById(dto.id)!;
    this.writeAudit('vendors', dto.id, 'UPDATE', existing, updated);
    return updated;
  }
}
