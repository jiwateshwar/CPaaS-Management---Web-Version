import type {
  PaginatedResult,
  Channel,
  Vendor,
  CreateVendorDto,
  UpdateVendorDto,
  VendorListParams,
  Client,
  CreateClientDto,
  UpdateClientDto,
  ClientListParams,
  VendorRate,
  VendorRateListParams,
  ClientRate,
  ClientRateListParams,
  RoutingAssignment,
  RoutingListParams,
  TrafficRecord,
  TrafficListParams,
  MarginLedgerEntry,
  LedgerListParams,
  LedgerExportParams,
  ComputeResult,
  CountryMaster,
  CountryAlias,
  CountryMatchResult,
  PendingCountryResolution,
  FxRate,
  CreateFxRateDto,
  FxRateListParams,
  UploadBatch,
  BatchError,
  BatchListParams,
  AuditLogEntry,
  AuditListParams,
  DashboardSummary,
  MarginByCountry,
  MarginByClient,
  MarginTrend,
  CsvPreview,
  ColumnMapping,
} from './types';

export interface IpcChannelMap {
  // Vendors
  'vendor:list': { params: VendorListParams; result: PaginatedResult<Vendor> };
  'vendor:get': { params: { id: number }; result: Vendor | null };
  'vendor:create': { params: CreateVendorDto; result: Vendor };
  'vendor:update': { params: UpdateVendorDto; result: Vendor };

  // Clients
  'client:list': { params: ClientListParams; result: PaginatedResult<Client> };
  'client:get': { params: { id: number }; result: Client | null };
  'client:create': { params: CreateClientDto; result: Client };
  'client:update': { params: UpdateClientDto; result: Client };

  // Vendor Rates
  'vendorRate:list': { params: VendorRateListParams; result: PaginatedResult<VendorRate> };
  'vendorRate:getEffective': {
    params: { vendorId: number; countryCode: string; channel: Channel; date: string };
    result: VendorRate | null;
  };

  // Client Rates
  'clientRate:list': { params: ClientRateListParams; result: PaginatedResult<ClientRate> };
  'clientRate:getEffective': {
    params: { clientId: number; countryCode: string; channel: Channel; useCase: string; date: string };
    result: ClientRate | null;
  };

  // Routing
  'routing:list': { params: RoutingListParams; result: PaginatedResult<RoutingAssignment> };

  // Traffic
  'traffic:list': { params: TrafficListParams; result: PaginatedResult<TrafficRecord> };

  // Margin Ledger
  'ledger:list': { params: LedgerListParams; result: PaginatedResult<MarginLedgerEntry> };
  'ledger:computeForBatch': { params: { trafficBatchId: number }; result: ComputeResult };
  'ledger:reverseEntry': { params: { entryId: number; reason: string }; result: MarginLedgerEntry };
  'ledger:export': { params: LedgerExportParams; result: { filePath: string } };

  // Country
  'country:list': { params: void; result: CountryMaster[] };
  'country:aliases': { params: { countryCode: string }; result: CountryAlias[] };
  'country:resolve': { params: { rawName: string }; result: CountryMatchResult };
  'country:saveAlias': { params: { countryCode: string; alias: string; source: string }; result: CountryAlias };
  'country:pendingResolutions': { params: void; result: PendingCountryResolution[] };
  'country:resolveMapping': {
    params: { resolutionId: number; countryCode: string };
    result: void;
  };

  // FX Rates
  'fx:list': { params: FxRateListParams; result: PaginatedResult<FxRate> };
  'fx:create': { params: CreateFxRateDto; result: FxRate };
  'fx:getEffective': { params: { from: string; to: string; date: string }; result: FxRate | null };

  // Upload / CSV
  'upload:preview': { params: { filePath: string }; result: CsvPreview };
  'upload:start': {
    params: {
      type: string;
      filePath: string;
      entityId?: number;
      columnMapping: ColumnMapping[];
    };
    result: UploadBatch;
  };
  'batch:list': { params: BatchListParams; result: PaginatedResult<UploadBatch> };
  'batch:get': { params: { id: number }; result: UploadBatch | null };
  'batch:errors': { params: { batchId: number }; result: BatchError[] };

  // Audit
  'audit:list': { params: AuditListParams; result: PaginatedResult<AuditLogEntry> };

  // Dashboard
  'dashboard:summary': { params: { month: string }; result: DashboardSummary };
  'dashboard:marginByCountry': { params: { month: string }; result: MarginByCountry[] };
  'dashboard:marginByClient': { params: { month: string }; result: MarginByClient[] };
  'dashboard:marginTrend': { params: { months: number }; result: MarginTrend[] };

  // File Dialog
  'dialog:openFile': {
    params: { filters: { name: string; extensions: string[] }[] };
    result: string | null;
  };
  'dialog:saveFile': {
    params: { defaultPath: string; filters: { name: string; extensions: string[] }[] };
    result: string | null;
  };
}

export type IpcChannel = keyof IpcChannelMap;
