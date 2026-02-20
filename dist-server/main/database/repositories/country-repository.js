"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryRepository = void 0;
const base_repository_1 = require("./base-repository");
class CountryRepository extends base_repository_1.BaseRepository {
    listCountries() {
        return this.db
            .prepare('SELECT * FROM country_master ORDER BY name')
            .all();
    }
    getCountryByCode(code) {
        return (this.db
            .prepare('SELECT * FROM country_master WHERE code = ?')
            .get(code) ?? null);
    }
    listAliases(countryCode) {
        return this.db
            .prepare('SELECT * FROM country_aliases WHERE country_code = ? ORDER BY alias')
            .all(countryCode);
    }
    saveAlias(countryCode, alias, source) {
        const result = this.db
            .prepare('INSERT INTO country_aliases (country_code, alias, source) VALUES (?, ?, ?)')
            .run(countryCode, alias, source);
        return this.db
            .prepare('SELECT * FROM country_aliases WHERE id = ?')
            .get(Number(result.lastInsertRowid));
    }
    deleteAlias(id) {
        this.db.prepare('DELETE FROM country_aliases WHERE id = ?').run(id);
    }
    getPendingResolutions() {
        return this.db
            .prepare(`SELECT pcr.*, cm.name as suggested_name
         FROM pending_country_resolutions pcr
         LEFT JOIN country_master cm ON cm.code = pcr.suggested_code
         WHERE pcr.resolved = 0
         ORDER BY pcr.created_at DESC`)
            .all();
    }
    addPendingResolution(rawName, batchId, suggestedCode, confidence) {
        this.db
            .prepare(`INSERT OR IGNORE INTO pending_country_resolutions
           (raw_name, batch_id, suggested_code, confidence)
         VALUES (?, ?, ?, ?)`)
            .run(rawName, batchId, suggestedCode, confidence);
    }
    resolveMapping(resolutionId, countryCode) {
        this.db.transaction(() => {
            const pending = this.db
                .prepare('SELECT * FROM pending_country_resolutions WHERE id = ?')
                .get(resolutionId);
            if (!pending)
                throw new Error(`Resolution ${resolutionId} not found`);
            // Save as alias
            this.db
                .prepare("INSERT OR IGNORE INTO country_aliases (country_code, alias, source) VALUES (?, ?, 'manual')")
                .run(countryCode, pending.raw_name);
            // Mark resolved
            this.db
                .prepare(`UPDATE pending_country_resolutions
           SET resolved = 1, resolved_code = ?, resolved_at = datetime('now')
           WHERE id = ?`)
                .run(countryCode, resolutionId);
        })();
    }
}
exports.CountryRepository = CountryRepository;
//# sourceMappingURL=country-repository.js.map