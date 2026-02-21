import Database from 'better-sqlite3';
import { VendorRepository } from '../main/database/repositories/vendor-repository';
import { ClientRepository } from '../main/database/repositories/client-repository';
import { VendorRateRepository } from '../main/database/repositories/vendor-rate-repository';
import { ClientRateRepository } from '../main/database/repositories/client-rate-repository';
import { RoutingRepository } from '../main/database/repositories/routing-repository';
import { TrafficRepository } from '../main/database/repositories/traffic-repository';
import { MarginLedgerRepository } from '../main/database/repositories/margin-ledger-repository';
import { FxRateRepository } from '../main/database/repositories/fx-rate-repository';
import { CountryRepository } from '../main/database/repositories/country-repository';
import { UploadBatchRepository } from '../main/database/repositories/upload-batch-repository';
import { AuditLogRepository } from '../main/database/repositories/audit-log-repository';
import { CountryNormalizer } from '../main/services/country-normalizer';
import { MarginEngine } from '../main/services/margin-engine';
import type { IpcChannel, IpcChannelMap } from '../shared/ipc-channels';
import type { MarginByCountry, MarginByClient, MarginTrend } from '../shared/types';

export type IpcHandlerMap = {
  [K in IpcChannel]?: (
    params: IpcChannelMap[K]['params'],
  ) => Promise<IpcChannelMap[K]['result']> | IpcChannelMap[K]['result'];
};

export function createIpcHandlers(db: Database.Database): IpcHandlerMap {
  const vendorRepo = new VendorRepository(db);
  const clientRepo = new ClientRepository(db);
  const vendorRateRepo = new VendorRateRepository(db);
  const clientRateRepo = new ClientRateRepository(db);
  const routingRepo = new RoutingRepository(db);
  const trafficRepo = new TrafficRepository(db);
  const ledgerRepo = new MarginLedgerRepository(db);
  const fxRateRepo = new FxRateRepository(db);
  const countryRepo = new CountryRepository(db);
  const batchRepo = new UploadBatchRepository(db);
  const auditRepo = new AuditLogRepository(db);
  const normalizer = new CountryNormalizer(db);
  const marginEngine = new MarginEngine(db);

  return {
    // Vendors
    'vendor:list': (params) => vendorRepo.list(params),
    'vendor:get': (params) => vendorRepo.getById(params.id),
    'vendor:create': (params) => vendorRepo.create(params),
    'vendor:update': (params) => vendorRepo.update(params),

    // Clients
    'client:list': (params) => clientRepo.list(params),
    'client:get': (params) => clientRepo.getById(params.id),
    'client:create': (params) => clientRepo.create(params),
    'client:update': (params) => clientRepo.update(params),

    // Vendor Rates
    'vendorRate:list': (params) => vendorRateRepo.list(params),
    'vendorRate:create': (params) => {
      const useCase = params.use_case ?? 'default';
      const totalFee = params.setup_fee + params.monthly_fee + params.mt_fee + params.mo_fee;
      if (totalFee <= 0) {
        const action = params.zero_action ?? 'use_past';
        if (action === 'use_past') {
          const past = vendorRateRepo.getMostRecentBefore(
            params.vendor_id,
            params.country_code,
            params.channel,
            useCase,
            params.effective_from,
          );
          if (past) {
            return vendorRateRepo.insertWithVersioning({
              ...params,
              use_case: useCase,
              setup_fee: past.setup_fee,
              monthly_fee: past.monthly_fee,
              mt_fee: past.mt_fee,
              mo_fee: past.mo_fee,
              currency: past.currency,
              notes: composeNotes(params.notes, `Used past rate #${past.id}`),
              discontinued: 0,
            });
          }
        }
        return vendorRateRepo.insertWithVersioning({
          ...params,
          use_case: useCase,
          setup_fee: 0,
          monthly_fee: 0,
          mt_fee: 0,
          mo_fee: 0,
          notes: composeNotes(params.notes, 'Discontinued - no quoted rate'),
          discontinued: 1,
        });
      }
      return vendorRateRepo.insertWithVersioning({
        ...params,
        use_case: useCase,
        discontinued: 0,
      });
    },
    'vendorRate:getEffective': (params) =>
      vendorRateRepo.getEffective(
        params.vendorId,
        params.countryCode,
        params.channel,
        params.useCase,
        params.date,
      ),

    // Client Rates
    'clientRate:list': (params) => clientRateRepo.list(params),
    'clientRate:getEffective': (params) =>
      clientRateRepo.getEffective(
        params.clientId,
        params.countryCode,
        params.channel,
        params.useCase,
        params.date,
      ),

    // Routing
    'routing:list': (params) => routingRepo.list(params),

    // Traffic
    'traffic:list': (params) => trafficRepo.list(params),

    // Margin Ledger
    'ledger:list': (params) => ledgerRepo.list(params),
    'ledger:reverseEntry': (params) => ledgerRepo.reverseEntry(params.entryId, params.reason),
    'ledger:computeForBatch': (params) => marginEngine.computeForTrafficBatchAsync(params.trafficBatchId),

    // Country
    'country:list': () => countryRepo.listCountries(),
    'country:aliases': (params) => countryRepo.listAliases(params.countryCode),
    'country:resolve': (params) => normalizer.resolve(params.rawName),
    'country:saveAlias': (params) => {
      const alias = countryRepo.saveAlias(params.countryCode, params.alias, params.source);
      normalizer.reload();
      return alias;
    },
    'country:pendingResolutions': () => countryRepo.getPendingResolutions(),
    'country:resolveMapping': (params) => {
      countryRepo.resolveMapping(params.resolutionId, params.countryCode);
      normalizer.reload();
    },

    // FX Rates
    'fx:list': (params) => fxRateRepo.list(params),
    'fx:create': (params) => fxRateRepo.create(params),
    'fx:getEffective': (params) => fxRateRepo.getEffective(params.from, params.to, params.date),

    // Batches
    'batch:list': (params) => batchRepo.list(params),
    'batch:get': (params) => batchRepo.getById(params.id),
    'batch:errors': (params) => batchRepo.getErrors(params.batchId),

    // Audit
    'audit:list': (params) => auditRepo.list(params),

    // Dashboard
    'dashboard:summary': (params) => {
      const monthStart = params.month + '-01';
      const monthEnd = params.month + '-31';

      const row = db
        .prepare(
          `SELECT
            COALESCE(SUM(client_revenue), 0) as totalRevenue,
            COALESCE(SUM(CASE WHEN normalized_vendor_cost IS NOT NULL THEN normalized_vendor_cost ELSE vendor_cost END), 0) as totalCost,
            COALESCE(SUM(margin), 0) as totalMargin,
            COALESCE(SUM(message_count), 0) as totalMessages,
            COUNT(DISTINCT client_id) as clientCount,
            COUNT(DISTINCT country_code) as countryCount
          FROM margin_ledger
          WHERE traffic_date >= ? AND traffic_date <= ?`,
        )
        .get(monthStart, monthEnd) as Record<string, number>;

      return {
        month: params.month,
        totalRevenue: row.totalRevenue,
        totalCost: row.totalCost,
        totalMargin: row.totalMargin,
        marginPercent: row.totalRevenue > 0 ? (row.totalMargin / row.totalRevenue) * 100 : 0,
        totalMessages: row.totalMessages,
        clientCount: row.clientCount,
        countryCount: row.countryCount,
      };
    },

    'dashboard:marginByCountry': (params) => {
      const monthStart = params.month + '-01';
      const monthEnd = params.month + '-31';

      return db
        .prepare(
          `SELECT
            ml.country_code,
            cm.name as country_name,
            SUM(ml.client_revenue) as revenue,
            SUM(CASE WHEN ml.normalized_vendor_cost IS NOT NULL THEN ml.normalized_vendor_cost ELSE ml.vendor_cost END) as cost,
            SUM(ml.margin) as margin,
            SUM(ml.message_count) as message_count
          FROM margin_ledger ml
          JOIN country_master cm ON cm.code = ml.country_code
          WHERE ml.traffic_date >= ? AND ml.traffic_date <= ?
          GROUP BY ml.country_code
          ORDER BY margin DESC
          LIMIT 15`,
        )
        .all(monthStart, monthEnd) as MarginByCountry[];
    },

    'dashboard:marginByClient': (params) => {
      const monthStart = params.month + '-01';
      const monthEnd = params.month + '-31';

      return db
        .prepare(
          `SELECT
            ml.client_id,
            c.name as client_name,
            SUM(ml.client_revenue) as revenue,
            SUM(CASE WHEN ml.normalized_vendor_cost IS NOT NULL THEN ml.normalized_vendor_cost ELSE ml.vendor_cost END) as cost,
            SUM(ml.margin) as margin,
            SUM(ml.message_count) as message_count
          FROM margin_ledger ml
          JOIN clients c ON c.id = ml.client_id
          WHERE ml.traffic_date >= ? AND ml.traffic_date <= ?
          GROUP BY ml.client_id
          ORDER BY margin DESC`,
        )
        .all(monthStart, monthEnd) as MarginByClient[];
    },

    'dashboard:marginTrend': (params) =>
      db
        .prepare(
          `SELECT
            strftime('%Y-%m', traffic_date) as month,
            SUM(client_revenue) as revenue,
            SUM(CASE WHEN normalized_vendor_cost IS NOT NULL THEN normalized_vendor_cost ELSE vendor_cost END) as cost,
            SUM(margin) as margin
          FROM margin_ledger
          GROUP BY strftime('%Y-%m', traffic_date)
          ORDER BY month DESC
          LIMIT ?`,
        )
        .all(params.months) as MarginTrend[],

    // File Dialog stubs for web (not used by UI)
    'dialog:openFile': async () => null,
    'dialog:saveFile': async () => null,
  };
}

function composeNotes(base: string | undefined, extra: string): string {
  if (base && base.trim()) return `${base.trim()} | ${extra}`;
  return extra;
}
