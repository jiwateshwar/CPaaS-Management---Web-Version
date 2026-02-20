"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientRepository = void 0;
const base_repository_1 = require("./base-repository");
class ClientRepository extends base_repository_1.BaseRepository {
    list(params) {
        let where = 'WHERE 1=1';
        const qp = [];
        if (params.status) {
            where += ' AND status = ?';
            qp.push(params.status);
        }
        if (params.search) {
            where += ' AND (name LIKE ? OR code LIKE ?)';
            qp.push(`%${params.search}%`, `%${params.search}%`);
        }
        return this.paginate(`SELECT * FROM clients ${where}`, `SELECT COUNT(*) as total FROM clients ${where}`, { ...params, sortBy: params.sortBy || 'name' }, qp);
    }
    getById(id) {
        return (this.db
            .prepare('SELECT * FROM clients WHERE id = ?')
            .get(id) ?? null);
    }
    getByCode(code) {
        return (this.db
            .prepare('SELECT * FROM clients WHERE code = ?')
            .get(code) ?? null);
    }
    create(dto) {
        const result = this.db
            .prepare(`INSERT INTO clients (name, code, contact_name, contact_email, contact_phone, billing_currency, payment_terms, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(dto.name, dto.code, dto.contact_name ?? null, dto.contact_email ?? null, dto.contact_phone ?? null, dto.billing_currency ?? 'USD', dto.payment_terms ?? null, dto.notes ?? null);
        const client = this.getById(Number(result.lastInsertRowid));
        this.writeAudit('clients', result.lastInsertRowid, 'INSERT', null, client);
        return client;
    }
    update(dto) {
        const existing = this.getById(dto.id);
        if (!existing)
            throw new Error(`Client ${dto.id} not found`);
        const fields = [];
        const values = [];
        if (dto.name !== undefined) {
            fields.push('name = ?');
            values.push(dto.name);
        }
        if (dto.code !== undefined) {
            fields.push('code = ?');
            values.push(dto.code);
        }
        if (dto.contact_name !== undefined) {
            fields.push('contact_name = ?');
            values.push(dto.contact_name);
        }
        if (dto.contact_email !== undefined) {
            fields.push('contact_email = ?');
            values.push(dto.contact_email);
        }
        if (dto.contact_phone !== undefined) {
            fields.push('contact_phone = ?');
            values.push(dto.contact_phone);
        }
        if (dto.billing_currency !== undefined) {
            fields.push('billing_currency = ?');
            values.push(dto.billing_currency);
        }
        if (dto.payment_terms !== undefined) {
            fields.push('payment_terms = ?');
            values.push(dto.payment_terms);
        }
        if (dto.notes !== undefined) {
            fields.push('notes = ?');
            values.push(dto.notes);
        }
        if (dto.status !== undefined) {
            fields.push('status = ?');
            values.push(dto.status);
        }
        if (fields.length === 0)
            return existing;
        fields.push("updated_at = datetime('now')");
        values.push(dto.id);
        this.db
            .prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`)
            .run(...values);
        const updated = this.getById(dto.id);
        this.writeAudit('clients', dto.id, 'UPDATE', existing, updated);
        return updated;
    }
}
exports.ClientRepository = ClientRepository;
//# sourceMappingURL=client-repository.js.map