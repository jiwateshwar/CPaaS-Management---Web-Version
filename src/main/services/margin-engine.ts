import Database from 'better-sqlite3';
import type { TrafficRecord, ComputeResult, MarginComputeError, ProgressData } from '../../shared/types';
import { RoutingRepository } from '../database/repositories/routing-repository';
import { VendorRateRepository } from '../database/repositories/vendor-rate-repository';
import { ClientRateRepository } from '../database/repositories/client-rate-repository';
import { FxRateRepository } from '../database/repositories/fx-rate-repository';
import { MarginLedgerRepository } from '../database/repositories/margin-ledger-repository';
import { TrafficRepository } from '../database/repositories/traffic-repository';

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export class MarginEngine {
  private routingRepo: RoutingRepository;
  private vendorRateRepo: VendorRateRepository;
  private clientRateRepo: ClientRateRepository;
  private fxRateRepo: FxRateRepository;
  private ledgerRepo: MarginLedgerRepository;
  private trafficRepo: TrafficRepository;

  constructor(private db: Database.Database) {
    this.routingRepo = new RoutingRepository(db);
    this.vendorRateRepo = new VendorRateRepository(db);
    this.clientRateRepo = new ClientRateRepository(db);
    this.fxRateRepo = new FxRateRepository(db);
    this.ledgerRepo = new MarginLedgerRepository(db);
    this.trafficRepo = new TrafficRepository(db);
  }

  /**
   * Async version that yields to the event loop between batches of 500 records.
   * Prevents UI freezing for large traffic batches.
   */
  async computeForTrafficBatchAsync(
    trafficBatchId: number,
    onProgress?: (p: ProgressData) => void,
  ): Promise<ComputeResult> {
    const records = this.trafficRepo.getByBatchId(trafficBatchId);
    const errors: MarginComputeError[] = [];
    let totalVendorCost = 0;
    let totalClientRevenue = 0;
    let totalMargin = 0;
    let successCount = 0;

    const BATCH_SIZE = 500;

    for (let chunkStart = 0; chunkStart < records.length; chunkStart += BATCH_SIZE) {
      const chunkEnd = Math.min(chunkStart + BATCH_SIZE, records.length);

      // Yield to event loop between chunks
      await new Promise<void>((resolve) => setImmediate(resolve));

      // Process this chunk in a transaction
      this.db.transaction(() => {
        for (let i = chunkStart; i < chunkEnd; i++) {
          const tr = records[i];
          const result = this.computeSingle(tr, errors);

          if (result) {
            this.ledgerRepo.insert(result);
            totalVendorCost += result.vendor_cost;
            totalClientRevenue += result.client_revenue;
            totalMargin += result.margin;
            successCount++;
          }
        }
      })();

      if (onProgress) {
        onProgress({
          batchId: trafficBatchId,
          phase: 'computing_margins',
          processed: chunkEnd,
          total: records.length,
        });
      }
    }

    return {
      totalRecords: records.length,
      successCount,
      errorCount: errors.length,
      errors,
      summary: {
        totalVendorCost: round6(totalVendorCost),
        totalClientRevenue: round6(totalClientRevenue),
        totalMargin: round6(totalMargin),
      },
    };
  }

  /**
   * Synchronous version for smaller batches or test usage.
   */
  computeForTrafficBatch(
    trafficBatchId: number,
    onProgress?: (p: ProgressData) => void,
  ): ComputeResult {
    const records = this.trafficRepo.getByBatchId(trafficBatchId);
    const errors: MarginComputeError[] = [];
    let totalVendorCost = 0;
    let totalClientRevenue = 0;
    let totalMargin = 0;
    let successCount = 0;

    // Process in a single transaction for atomicity
    this.db.transaction(() => {
      for (let i = 0; i < records.length; i++) {
        const tr = records[i];
        const result = this.computeSingle(tr, errors);

        if (result) {
          this.ledgerRepo.insert(result);
          totalVendorCost += result.vendor_cost;
          totalClientRevenue += result.client_revenue;
          totalMargin += result.margin;
          successCount++;
        }

        if (onProgress && i % 500 === 0) {
          onProgress({
            batchId: trafficBatchId,
            phase: 'computing_margins',
            processed: i,
            total: records.length,
          });
        }
      }
    })();

    return {
      totalRecords: records.length,
      successCount,
      errorCount: errors.length,
      errors,
      summary: {
        totalVendorCost: round6(totalVendorCost),
        totalClientRevenue: round6(totalClientRevenue),
        totalMargin: round6(totalMargin),
      },
    };
  }

  private computeSingle(
    tr: TrafficRecord,
    errors: MarginComputeError[],
  ): Parameters<MarginLedgerRepository['insert']>[0] | null {
    // Step 1: Find routing assignment
    const routing = this.routingRepo.getEffective(
      tr.client_id,
      tr.country_code,
      tr.channel,
      tr.use_case,
      tr.traffic_date,
    );
    if (!routing) {
      errors.push({
        trafficRecordId: tr.id,
        errorType: 'no_routing',
        message: `No routing for client=${tr.client_id}, country=${tr.country_code}, channel=${tr.channel}, use_case=${tr.use_case}, date=${tr.traffic_date}`,
      });
      return null;
    }

    // Step 2: Find vendor rate
    const vendorRate = this.vendorRateRepo.getEffective(
      routing.vendor_id,
      tr.country_code,
      tr.channel,
      tr.traffic_date,
    );
    if (!vendorRate) {
      errors.push({
        trafficRecordId: tr.id,
        errorType: 'no_vendor_rate',
        message: `No vendor rate for vendor=${routing.vendor_id}, country=${tr.country_code}, channel=${tr.channel}, date=${tr.traffic_date}`,
      });
      return null;
    }

    // Step 3: Find client rate
    const clientRate = this.clientRateRepo.getEffective(
      tr.client_id,
      tr.country_code,
      tr.channel,
      tr.use_case,
      tr.traffic_date,
    );
    if (!clientRate) {
      errors.push({
        trafficRecordId: tr.id,
        errorType: 'no_client_rate',
        message: `No client rate for client=${tr.client_id}, country=${tr.country_code}, channel=${tr.channel}, use_case=${tr.use_case}, date=${tr.traffic_date}`,
      });
      return null;
    }

    // Step 4: Compute raw costs
    const vendorCost = round6(tr.message_count * vendorRate.rate);
    const clientRevenue = round6(tr.message_count * clientRate.rate);

    // Step 5: FX conversion
    let fxRateId: number | null = null;
    let fxRateValue: number | null = null;
    let normalizedVendorCost: number | null = null;
    let normalizedCurrency: string | null = null;

    if (vendorRate.currency !== clientRate.currency) {
      let fxRecord = this.fxRateRepo.getEffective(
        vendorRate.currency,
        clientRate.currency,
        tr.traffic_date,
      );

      if (!fxRecord) {
        // Try reverse
        const reverse = this.fxRateRepo.getEffective(
          clientRate.currency,
          vendorRate.currency,
          tr.traffic_date,
        );
        if (reverse) {
          fxRateId = reverse.id;
          fxRateValue = round6(1 / reverse.rate);
        } else {
          errors.push({
            trafficRecordId: tr.id,
            errorType: 'no_fx_rate',
            message: `No FX rate for ${vendorRate.currency}->${clientRate.currency} on ${tr.traffic_date}`,
          });
          return null;
        }
      } else {
        fxRateId = fxRecord.id;
        fxRateValue = fxRecord.rate;
      }

      normalizedVendorCost = round6(vendorCost * fxRateValue!);
      normalizedCurrency = clientRate.currency;
    } else {
      normalizedVendorCost = vendorCost;
      normalizedCurrency = clientRate.currency;
    }

    // Step 6: Compute margin
    const margin = round6(clientRevenue - normalizedVendorCost);

    return {
      traffic_record_id: tr.id,
      client_id: tr.client_id,
      vendor_id: routing.vendor_id,
      country_code: tr.country_code,
      channel: tr.channel,
      use_case: tr.use_case,
      traffic_date: tr.traffic_date,
      message_count: tr.message_count,
      vendor_rate_id: vendorRate.id,
      vendor_rate: vendorRate.rate,
      vendor_currency: vendorRate.currency,
      vendor_cost: vendorCost,
      client_rate_id: clientRate.id,
      client_rate: clientRate.rate,
      client_currency: clientRate.currency,
      client_revenue: clientRevenue,
      fx_rate_id: fxRateId,
      fx_rate: fxRateValue,
      normalized_vendor_cost: normalizedVendorCost,
      normalized_currency: normalizedCurrency,
      margin,
      is_reversal: 0,
      original_entry_id: null,
      reversal_reason: null,
    };
  }
}
