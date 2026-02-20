"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIpcHandlers = createIpcHandlers;
const vendor_repository_1 = require("../main/database/repositories/vendor-repository");
const client_repository_1 = require("../main/database/repositories/client-repository");
const vendor_rate_repository_1 = require("../main/database/repositories/vendor-rate-repository");
const client_rate_repository_1 = require("../main/database/repositories/client-rate-repository");
const routing_repository_1 = require("../main/database/repositories/routing-repository");
const traffic_repository_1 = require("../main/database/repositories/traffic-repository");
const margin_ledger_repository_1 = require("../main/database/repositories/margin-ledger-repository");
const fx_rate_repository_1 = require("../main/database/repositories/fx-rate-repository");
const country_repository_1 = require("../main/database/repositories/country-repository");
const upload_batch_repository_1 = require("../main/database/repositories/upload-batch-repository");
const audit_log_repository_1 = require("../main/database/repositories/audit-log-repository");
const country_normalizer_1 = require("../main/services/country-normalizer");
const margin_engine_1 = require("../main/services/margin-engine");
function createIpcHandlers(db) {
    const vendorRepo = new vendor_repository_1.VendorRepository(db);
    const clientRepo = new client_repository_1.ClientRepository(db);
    const vendorRateRepo = new vendor_rate_repository_1.VendorRateRepository(db);
    const clientRateRepo = new client_rate_repository_1.ClientRateRepository(db);
    const routingRepo = new routing_repository_1.RoutingRepository(db);
    const trafficRepo = new traffic_repository_1.TrafficRepository(db);
    const ledgerRepo = new margin_ledger_repository_1.MarginLedgerRepository(db);
    const fxRateRepo = new fx_rate_repository_1.FxRateRepository(db);
    const countryRepo = new country_repository_1.CountryRepository(db);
    const batchRepo = new upload_batch_repository_1.UploadBatchRepository(db);
    const auditRepo = new audit_log_repository_1.AuditLogRepository(db);
    const normalizer = new country_normalizer_1.CountryNormalizer(db);
    const marginEngine = new margin_engine_1.MarginEngine(db);
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
        'vendorRate:getEffective': (params) => vendorRateRepo.getEffective(params.vendorId, params.countryCode, params.channel, params.date),
        // Client Rates
        'clientRate:list': (params) => clientRateRepo.list(params),
        'clientRate:getEffective': (params) => clientRateRepo.getEffective(params.clientId, params.countryCode, params.channel, params.useCase, params.date),
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
                .prepare(`SELECT
            COALESCE(SUM(client_revenue), 0) as totalRevenue,
            COALESCE(SUM(CASE WHEN normalized_vendor_cost IS NOT NULL THEN normalized_vendor_cost ELSE vendor_cost END), 0) as totalCost,
            COALESCE(SUM(margin), 0) as totalMargin,
            COALESCE(SUM(message_count), 0) as totalMessages,
            COUNT(DISTINCT client_id) as clientCount,
            COUNT(DISTINCT country_code) as countryCount
          FROM margin_ledger
          WHERE traffic_date >= ? AND traffic_date <= ?`)
                .get(monthStart, monthEnd);
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
                .prepare(`SELECT
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
          LIMIT 15`)
                .all(monthStart, monthEnd);
        },
        'dashboard:marginByClient': (params) => {
            const monthStart = params.month + '-01';
            const monthEnd = params.month + '-31';
            return db
                .prepare(`SELECT
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
          ORDER BY margin DESC`)
                .all(monthStart, monthEnd);
        },
        'dashboard:marginTrend': (params) => db
            .prepare(`SELECT
            strftime('%Y-%m', traffic_date) as month,
            SUM(client_revenue) as revenue,
            SUM(CASE WHEN normalized_vendor_cost IS NOT NULL THEN normalized_vendor_cost ELSE vendor_cost END) as cost,
            SUM(margin) as margin
          FROM margin_ledger
          GROUP BY strftime('%Y-%m', traffic_date)
          ORDER BY month DESC
          LIMIT ?`)
            .all(params.months),
        // File Dialog stubs for web (not used by UI)
        'dialog:openFile': async () => null,
        'dialog:saveFile': async () => null,
    };
}
//# sourceMappingURL=ipc-handlers.js.map