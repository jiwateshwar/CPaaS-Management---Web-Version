import { ipcMain, dialog } from 'electron';
import Database from 'better-sqlite3';
import { VendorRepository } from '../database/repositories/vendor-repository';
import { ClientRepository } from '../database/repositories/client-repository';
import { VendorRateRepository } from '../database/repositories/vendor-rate-repository';
import { ClientRateRepository } from '../database/repositories/client-rate-repository';
import { RoutingRepository } from '../database/repositories/routing-repository';
import { TrafficRepository } from '../database/repositories/traffic-repository';
import { MarginLedgerRepository } from '../database/repositories/margin-ledger-repository';
import { FxRateRepository } from '../database/repositories/fx-rate-repository';
import { CountryRepository } from '../database/repositories/country-repository';
import { UploadBatchRepository } from '../database/repositories/upload-batch-repository';
import { AuditLogRepository } from '../database/repositories/audit-log-repository';
import { CountryNormalizer } from '../services/country-normalizer';
import { MarginEngine } from '../services/margin-engine';
import { CsvProcessor } from '../workers/csv-processor';
import * as Papa from 'papaparse';
import * as fs from 'node:fs';
import type { ColumnMapping, UploadType, VendorRateZeroHandling } from '../../shared/types';

export function registerIpcHandlers(db: Database.Database): void {
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
  const csvProcessor = new CsvProcessor(db);

  // === Vendors ===
  ipcMain.handle('vendor:list', (_, params) => vendorRepo.list(params));
  ipcMain.handle('vendor:get', (_, params) => vendorRepo.getById(params.id));
  ipcMain.handle('vendor:create', (_, params) => vendorRepo.create(params));
  ipcMain.handle('vendor:update', (_, params) => vendorRepo.update(params));
  ipcMain.handle('vendor:delete', (_, params) => vendorRepo.delete(params.id));

  // === Clients ===
  ipcMain.handle('client:list', (_, params) => clientRepo.list(params));
  ipcMain.handle('client:get', (_, params) => clientRepo.getById(params.id));
  ipcMain.handle('client:create', (_, params) => clientRepo.create(params));
  ipcMain.handle('client:update', (_, params) => clientRepo.update(params));

  // === Vendor Rates ===
  ipcMain.handle('vendorRate:list', (_, params) => vendorRateRepo.list(params));
  ipcMain.handle('vendorRate:create', (_, params) => {
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
  });
  ipcMain.handle('vendorRate:getEffective', (_, params) =>
    vendorRateRepo.getEffective(
      params.vendorId,
      params.countryCode,
      params.channel,
      params.useCase,
      params.date,
    ),
  );

  // === Client Rates ===
  ipcMain.handle('clientRate:list', (_, params) => clientRateRepo.list(params));
  ipcMain.handle('clientRate:getEffective', (_, params) =>
    clientRateRepo.getEffective(
      params.clientId,
      params.countryCode,
      params.channel,
      params.useCase,
      params.date,
    ),
  );

  // === Routing ===
  ipcMain.handle('routing:list', (_, params) => routingRepo.list(params));

  // === Traffic ===
  ipcMain.handle('traffic:list', (_, params) => trafficRepo.list(params));

  // === Ledger ===
  ipcMain.handle('ledger:list', (_, params) => ledgerRepo.list(params));
  ipcMain.handle('ledger:reverseEntry', (_, params) =>
    ledgerRepo.reverseEntry(params.entryId, params.reason),
  );
  ipcMain.handle('ledger:computeForBatch', (_, params) =>
    marginEngine.computeForTrafficBatchAsync(params.trafficBatchId),
  );
  ipcMain.handle('ledger:export', async (_, params) => {
    const result = ledgerRepo.list({
      ...params,
      page: 1,
      pageSize: 1_000_000,
    });
    const savePath = await dialog.showSaveDialog({
      defaultPath: `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (savePath.canceled || !savePath.filePath) {
      return { filePath: '' };
    }
    const csv = Papa.unparse(result.data);
    fs.writeFileSync(savePath.filePath, csv, 'utf-8');
    return { filePath: savePath.filePath };
  });

  // === Country ===
  ipcMain.handle('country:list', () => countryRepo.listCountries());
  ipcMain.handle('country:aliases', (_, params) =>
    countryRepo.listAliases(params.countryCode),
  );
  ipcMain.handle('country:resolve', (_, params) =>
    normalizer.resolve(params.rawName),
  );
  ipcMain.handle('country:saveAlias', (_, params) => {
    const alias = countryRepo.saveAlias(
      params.countryCode,
      params.alias,
      params.source,
    );
    normalizer.reload();
    csvProcessor.reloadNormalizer();
    return alias;
  });
  ipcMain.handle('country:pendingResolutions', () =>
    countryRepo.getPendingResolutions(),
  );
  ipcMain.handle('country:resolveMapping', (_, params) => {
    countryRepo.resolveMapping(params.resolutionId, params.countryCode);
    normalizer.reload();
    csvProcessor.reloadNormalizer();
  });

  // === FX Rates ===
  ipcMain.handle('fx:list', (_, params) => fxRateRepo.list(params));
  ipcMain.handle('fx:create', (_, params) => fxRateRepo.create(params));
  ipcMain.handle('fx:getEffective', (_, params) =>
    fxRateRepo.getEffective(params.from, params.to, params.date),
  );

  // === Upload / CSV ===
  ipcMain.handle('upload:preview', (_, params) => {
    const content = fs.readFileSync(params.filePath, 'utf-8');
    const parsed = Papa.parse(content, {
      header: true,
      preview: 50,
      skipEmptyLines: true,
    });
    const totalLines = content.split('\n').length - 1;
    return {
      headers: parsed.meta.fields || [],
      sampleRows: parsed.data as string[][],
      totalRowEstimate: totalLines,
    };
  });

  ipcMain.handle('upload:start', async (event, params: { type: UploadType; filePath: string; entityId?: number; columnMapping: ColumnMapping[]; vendorRateZeroHandling?: VendorRateZeroHandling }) => {
    const batch = batchRepo.create(
      params.type,
      params.filePath.split(/[\\/]/).pop() || 'unknown',
      params.entityId,
      JSON.stringify(params.columnMapping),
    );

    // Process asynchronously using CsvProcessor (yields to event loop between batches)
    const result = await csvProcessor.process(
      {
        type: params.type,
        filePath: params.filePath,
        entityId: params.entityId,
        columnMapping: params.columnMapping,
        batchId: batch.id,
        vendorRateZeroHandling: params.vendorRateZeroHandling,
      },
      (progress) => {
        event.sender.send('batch:progress', progress);
      },
    );

    event.sender.send('batch:complete', {
      batchId: batch.id,
      status: result.status,
      insertedRows: result.insertedRows,
      errorRows: result.errorRows,
    });

    return batchRepo.getById(batch.id);
  });

  // === Batches ===
  ipcMain.handle('batch:list', (_, params) => batchRepo.list(params));
  ipcMain.handle('batch:get', (_, params) => batchRepo.getById(params.id));
  ipcMain.handle('batch:errors', (_, params) =>
    batchRepo.getErrors(params.batchId),
  );

  // === Audit ===
  ipcMain.handle('audit:list', (_, params) => auditRepo.list(params));

  // === Dashboard ===
  ipcMain.handle('dashboard:summary', (_, params) => {
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
      marginPercent:
        row.totalRevenue > 0
          ? (row.totalMargin / row.totalRevenue) * 100
          : 0,
      totalMessages: row.totalMessages,
      clientCount: row.clientCount,
      countryCount: row.countryCount,
    };
  });

  ipcMain.handle('dashboard:marginByCountry', (_, params) => {
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
      .all(monthStart, monthEnd);
  });

  ipcMain.handle('dashboard:marginByClient', (_, params) => {
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
      .all(monthStart, monthEnd);
  });

  ipcMain.handle('dashboard:marginTrend', (_, params) => {
    return db
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
      .all(params.months);
  });

  // === File Dialog ===
  ipcMain.handle('dialog:openFile', async (_, params) => {
    const result = await dialog.showOpenDialog({
      filters: params.filters,
      properties: ['openFile'],
    });
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle('dialog:saveFile', async (_, params) => {
    const result = await dialog.showSaveDialog({
      defaultPath: params.defaultPath,
      filters: params.filters,
    });
    return result.canceled ? null : result.filePath;
  });
}

function composeNotes(base: string | undefined, extra: string): string {
  if (base && base.trim()) return `${base.trim()} | ${extra}`;
  return extra;
}
