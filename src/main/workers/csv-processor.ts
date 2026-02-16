import Database from 'better-sqlite3';
import * as Papa from 'papaparse';
import * as fs from 'node:fs';
import type { ColumnMapping, UploadType, UploadBatch } from '../../shared/types';
import { CountryNormalizer } from '../services/country-normalizer';
import { CountryRepository } from '../database/repositories/country-repository';
import { VendorRateRepository } from '../database/repositories/vendor-rate-repository';
import { ClientRateRepository } from '../database/repositories/client-rate-repository';
import { RoutingRepository } from '../database/repositories/routing-repository';
import { ClientRepository } from '../database/repositories/client-repository';
import { VendorRepository } from '../database/repositories/vendor-repository';
import { UploadBatchRepository } from '../database/repositories/upload-batch-repository';
import { FxRateRepository } from '../database/repositories/fx-rate-repository';

export interface CsvProcessorParams {
  type: UploadType;
  filePath: string;
  entityId?: number;
  columnMapping: ColumnMapping[];
  batchId: number;
}

export interface CsvProcessorResult {
  batchId: number;
  status: 'completed' | 'completed_with_errors' | 'failed';
  insertedRows: number;
  errorRows: number;
  totalRows: number;
}

export type ProgressCallback = (data: {
  batchId: number;
  phase: string;
  processed: number;
  total: number;
}) => void;

/**
 * Processes a CSV file in batched chunks, yielding to the event loop
 * between batches to prevent blocking the main process.
 */
export class CsvProcessor {
  private normalizer: CountryNormalizer;
  private countryRepo: CountryRepository;
  private vendorRateRepo: VendorRateRepository;
  private clientRateRepo: ClientRateRepository;
  private routingRepo: RoutingRepository;
  private clientRepo: ClientRepository;
  private vendorRepo: VendorRepository;
  private batchRepo: UploadBatchRepository;
  private fxRateRepo: FxRateRepository;

  constructor(private db: Database.Database) {
    this.normalizer = new CountryNormalizer(db);
    this.countryRepo = new CountryRepository(db);
    this.vendorRateRepo = new VendorRateRepository(db);
    this.clientRateRepo = new ClientRateRepository(db);
    this.routingRepo = new RoutingRepository(db);
    this.clientRepo = new ClientRepository(db);
    this.vendorRepo = new VendorRepository(db);
    this.batchRepo = new UploadBatchRepository(db);
    this.fxRateRepo = new FxRateRepository(db);
  }

  async process(
    params: CsvProcessorParams,
    onProgress?: ProgressCallback,
  ): Promise<CsvProcessorResult> {
    const { type, filePath, entityId, columnMapping, batchId } = params;

    try {
      this.batchRepo.updateStatus(batchId, 'processing');

      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
      });

      const rows = parsed.data as Record<string, string>[];
      const colMap = new Map(
        columnMapping
          .filter((m) => m.dbField)
          .map((m) => [m.dbField!, m.csvColumn]),
      );

      const getValue = (row: Record<string, string>, field: string) => {
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
        await new Promise<void>((resolve) => setImmediate(resolve));

        // Process this chunk in a transaction
        this.db.transaction(() => {
          for (let i = chunkStart; i < chunkEnd; i++) {
            try {
              const row = rows[i];
              const get = (field: string) => getValue(row, field);
              const result = this.processRow(type, entityId, get, batchId, i, row);
              if (result) {
                inserted++;
              } else {
                errorCount++;
              }
            } catch (err) {
              this.batchRepo.addError(
                batchId,
                chunkStart + 2,
                JSON.stringify(rows[chunkStart]),
                'validation',
                (err as Error).message,
              );
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
    } catch (err) {
      this.batchRepo.updateStatus(batchId, 'failed');
      return { batchId, status: 'failed', insertedRows: 0, errorRows: 0, totalRows: 0 };
    }
  }

  private processRow(
    type: UploadType,
    entityId: number | undefined,
    getValue: (field: string) => string | undefined,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): boolean {
    if (type === 'vendor_rate' && entityId) {
      return this.processVendorRate(entityId, getValue, batchId, rowIndex, rawRow);
    } else if (type === 'client_rate' && entityId) {
      return this.processClientRate(entityId, getValue, batchId, rowIndex, rawRow);
    } else if (type === 'traffic') {
      return this.processTraffic(getValue, batchId, rowIndex, rawRow);
    } else if (type === 'routing') {
      return this.processRouting(getValue, batchId, rowIndex, rawRow);
    } else if (type === 'fx_rate') {
      return this.processFxRate(getValue, batchId, rowIndex, rawRow);
    }
    return false;
  }

  private resolveCountry(
    rawCountry: string,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): string | null {
    const result = this.normalizer.resolve(rawCountry);
    if (result.status === 'unresolved') {
      this.countryRepo.addPendingResolution(rawCountry, batchId, result.countryCode, result.confidence);
      this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'country_unknown', `Could not resolve country: "${rawCountry}"`);
      return null;
    }
    return result.countryCode!;
  }

  private processVendorRate(
    entityId: number,
    getValue: (f: string) => string | undefined,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): boolean {
    const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
    if (!countryCode) return false;

    this.vendorRateRepo.insertWithVersioning({
      vendor_id: entityId,
      country_code: countryCode,
      channel: (getValue('channel') || 'sms').toLowerCase() as never,
      rate: parseFloat(getValue('rate') || '0'),
      currency: getValue('currency') || 'USD',
      effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
      effective_to: getValue('effective_to') || undefined,
      batch_id: batchId,
    });
    return true;
  }

  private processClientRate(
    entityId: number,
    getValue: (f: string) => string | undefined,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): boolean {
    const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
    if (!countryCode) return false;

    this.clientRateRepo.insertWithVersioning({
      client_id: entityId,
      country_code: countryCode,
      channel: (getValue('channel') || 'sms').toLowerCase() as never,
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

  private processTraffic(
    getValue: (f: string) => string | undefined,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): boolean {
    const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
    if (!countryCode) return false;

    const clientCode = getValue('client_code') || '';
    const client = this.clientRepo.getByCode(clientCode);
    if (!client) {
      this.batchRepo.addError(batchId, rowIndex + 2, JSON.stringify(rawRow), 'validation', `Unknown client code: "${clientCode}"`);
      return false;
    }

    this.db.prepare(
      `INSERT INTO traffic_records (batch_id, client_id, country_code, channel, use_case, message_count, traffic_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      batchId,
      client.id,
      countryCode,
      (getValue('channel') || 'sms').toLowerCase(),
      getValue('use_case') || 'default',
      parseInt(getValue('message_count') || '0', 10),
      getValue('traffic_date') || new Date().toISOString().slice(0, 10),
    );
    return true;
  }

  private processRouting(
    getValue: (f: string) => string | undefined,
    batchId: number,
    rowIndex: number,
    rawRow: Record<string, string>,
  ): boolean {
    const countryCode = this.resolveCountry(getValue('country') || '', batchId, rowIndex, rawRow);
    if (!countryCode) return false;

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
      channel: (getValue('channel') || 'sms').toLowerCase() as never,
      use_case: getValue('use_case') || 'default',
      vendor_id: vendor.id,
      effective_from: getValue('effective_from') || new Date().toISOString().slice(0, 10),
      effective_to: getValue('effective_to') || undefined,
      batch_id: batchId,
    });
    return true;
  }

  private processFxRate(
    getValue: (f: string) => string | undefined,
    batchId: number,
    _rowIndex: number,
    _rawRow: Record<string, string>,
  ): boolean {
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

  reloadNormalizer(): void {
    this.normalizer.reload();
  }
}
