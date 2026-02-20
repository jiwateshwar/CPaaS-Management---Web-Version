"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsvProcessor = void 0;
const Papa = __importStar(require("papaparse"));
const fs = __importStar(require("node:fs"));
const country_normalizer_1 = require("../services/country-normalizer");
const country_repository_1 = require("../database/repositories/country-repository");
const vendor_rate_repository_1 = require("../database/repositories/vendor-rate-repository");
const client_rate_repository_1 = require("../database/repositories/client-rate-repository");
const routing_repository_1 = require("../database/repositories/routing-repository");
const client_repository_1 = require("../database/repositories/client-repository");
const vendor_repository_1 = require("../database/repositories/vendor-repository");
const upload_batch_repository_1 = require("../database/repositories/upload-batch-repository");
const fx_rate_repository_1 = require("../database/repositories/fx-rate-repository");
/**
 * Processes a CSV file in batched chunks, yielding to the event loop
 * between batches to prevent blocking the main process.
 */
class CsvProcessor {
    db;
    normalizer;
    countryRepo;
    vendorRateRepo;
    clientRateRepo;
    routingRepo;
    clientRepo;
    vendorRepo;
    batchRepo;
    fxRateRepo;
    constructor(db) {
        this.db = db;
        this.normalizer = new country_normalizer_1.CountryNormalizer(db);
        this.countryRepo = new country_repository_1.CountryRepository(db);
        this.vendorRateRepo = new vendor_rate_repository_1.VendorRateRepository(db);
        this.clientRateRepo = new client_rate_repository_1.ClientRateRepository(db);
        this.routingRepo = new routing_repository_1.RoutingRepository(db);
        this.clientRepo = new client_repository_1.ClientRepository(db);
        this.vendorRepo = new vendor_repository_1.VendorRepository(db);
        this.batchRepo = new upload_batch_repository_1.UploadBatchRepository(db);
        this.fxRateRepo = new fx_rate_repository_1.FxRateRepository(db);
    }
    async process(params, onProgress) {
        const { type, filePath, entityId, columnMapping, batchId } = params;
        try {
            this.batchRepo.updateStatus(batchId, 'processing');
            const content = fs.readFileSync(filePath, 'utf-8');
            const parsed = Papa.parse(content, {
                header: true,
                skipEmptyLines: true,
            });
            const rows = parsed.data;
            const colMap = new Map(columnMapping
                .filter((m) => m.dbField)
                .map((m) => [m.dbField, m.csvColumn]));
            const getValue = (row, field) => {
                const csvCol = colMap.get(field);
                return csvCol ? row[csvCol]?.trim() : undefined;
            };
            let inserted = 0;
            let errorCount = 0;
            const BATCH_SIZE = 500;
            // Process in chunks, yielding between each chunk
            for (let chunkStart = 0; chunkStart < rows.length; chunkStart += BATCH_SIZE) {
                const chunkEnd = Math.min(chunkStart + BATCH_SIZE, rows.length);
                // Yield to event loop between chunks
                await new Promise((resolve) => setImmediate(resolve));
                // Process this chunk in a transaction
                this.db.transaction(() => {
                    for (let i = chunkStart; i < chunkEnd; i++) {
                        try {
                            const row = rows[i];
                            const get = (field) => getValue(row, field);
                            const result = this.processRow(type, entityId, get, batchId, i, row);
                            if (result) {
                                inserted++;
                            }
                            else {
                                errorCount++;
                            }
                        }
                        catch (err) {
                            this.batchRepo.addError(batchId, chunkStart + 2, JSON.stringify(rows[chunkStart]), 'validation', err.message);
                            errorCount++;
                        }
                    }
                })();
                // Report progress
                if (onProgress) {
                    onProgress({
                        batchId,
                        phase: 'processing',
                        processed: chunkEnd,
                        total: rows.length,
                    });
                }
            }
            const status = errorCount > 0 ? 'completed_with_errors' : 'completed';
            this.batchRepo.updateStatus(batchId, status, {
                total_rows: rows.length,
                processed_rows: rows.length,
                inserted_rows: inserted,
                error_rows: errorCount,
            });
            return { batchId, status, insertedRows: inserted, errorRows: errorCount, totalRows: rows.length };
        }
        catch (err) {
            this.batchRepo.updateStatus(batchId, 'failed');
            return { batchId, status: 'failed', insertedRows: 0, errorRows: 0, totalRows: 0 };
        }
    }
    processRow(type, entityId, getValue, batchId, rowIndex, rawRow) {
        if (type === 'vendor_rate' && entityId) {
            return this.processVendorRate(entityId, getValue, batchId, rowIndex, rawRow);
        }
        else if (type === 'client_rate' && entityId) {
            return this.processClientRate(entityId, getValue, batchId, rowIndex, rawRow);
        }
        else if (type === 'traffic') {
            return this.processTraffic(getValue, batchId, rowIndex, rawRow);
        }
        else if (type === 'routing') {
            return this.processRouting(getValue, batchId, rowIndex, rawRow);
        }
        else if (type === 'fx_rate') {
            return this.processFxRate(getValue, batchId, rowIndex, rawRow);
        }
        return false;
    }
    resolveCountry(rawCountry, batchId, rowIndex, rawRow) {
        const result = this.normalizer.resolve(rawCountry);
        if (result.status === 'unresolved') {
            this.countryRepo.addPendingResolution(rawCountry, batchId, result.countryCode, result.confidence);
            this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'country_unknown', `Could not resolve country: "${rawCountry}"`);
            return null;
        }
        return result.countryCode;
    }
    processVendorRate(entityId, getValue, batchId, rowIndex, rawRow) {
        const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
        if (!countryCode)
            return false;
        this.vendorRateRepo.insertWithVersioning({
            vendor_id: entityId,
            country_code: countryCode,
            channel: (getValue('channel') || 'sms').toLowerCase(),
            rate: parseFloat(getValue('rate') || '0'),
            currency: getValue('currency') || 'USD',
            effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
            effective_to: getValue('effective_to') || undefined,
            batch_id: batchId,
        });
        return true;
    }
    processClientRate(entityId, getValue, batchId, rowIndex, rawRow) {
        const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
        if (!countryCode)
            return false;
        this.clientRateRepo.insertWithVersioning({
            client_id: entityId,
            country_code: countryCode,
            channel: (getValue('channel') || 'sms').toLowerCase(),
            use_case: getValue('use_case') || 'default',
            rate: parseFloat(getValue('rate') || '0'),
            currency: getValue('currency') || 'USD',
            contract_version: getValue('contract_version'),
            effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
            effective_to: getValue('effective_to') || undefined,
            batch_id: batchId,
        });
        return true;
    }
    processTraffic(getValue, batchId, rowIndex, rawRow) {
        const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
        if (!countryCode)
            return false;
        const clientCode = getValue('client_code') || '';
        const client = this.clientRepo.getByCode(clientCode);
        if (!client) {
            this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'validation', `Unknown client code: "${clientCode}"`);
            return false;
        }
        this.db.prepare(`INSERT INTO traffic_records (batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(batchId, client.id, countryCode, (getValue('channel') || 'sms').toLowerCase(), getValue('use_case') || 'default', parseInt(getValue('message_count') || '0', 10), getValue('traffic_date') || new Date().toISOString().slice(0, 10));
        return true;
    }
    processRouting(getValue, batchId, rowIndex, rawRow) {
        const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
        if (!countryCode)
            return false;
        const clientCode = getValue('client_code') || '';
        const vendorCode = getValue('vendor_code') || '';
        const client = this.clientRepo.getByCode(clientCode);
        const vendor = this.vendorRepo.getByCode(vendorCode);
        if (!client) {
            this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'validation', `Unknown client code: "${clientCode}"`);
            return false;
        }
        if (!vendor) {
            this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'validation', `Unknown vendor code: "${vendorCode}"`);
            return false;
        }
        this.routingRepo.create({
            client_id: client.id,
            country_code: countryCode,
            channel: (getValue('channel') || 'sms').toLowerCase(),
            use_case: getValue('use_case') || 'default',
            vendor_id: vendor.id,
            effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
            effective_to: getValue('effective_to') || undefined,
            batch_id: batchId,
        });
        return true;
    }
    processFxRate(getValue, batchId, _rowIndex, _rawRow) {
        this.fxRateRepo.create({
            from_currency: (getValue('from_currency') || '').toUpperCase(),
            to_currency: (getValue('to_currency') || '').toUpperCase(),
            rate: parseFloat(getValue('rate') || '0'),
            effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
            effective_to: getValue('effective_to') || undefined,
            batch_id: batchId,
        });
        return true;
    }
    reloadNormalizer() {
        this.normalizer.reload();
    }
}
exports.CsvProcessor = CsvProcessor;
//# sourceMappingURL=csv-processor.js.map