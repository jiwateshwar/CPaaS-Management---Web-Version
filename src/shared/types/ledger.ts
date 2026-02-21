import { ListParams } from './common';

export interface MarginLedgerEntry {
  id: number;
  traffic_record_id: number | null;
  client_id: number;
  vendor_id: number;
  country_code: string;
  channel: string;
  use_case: string;
  traffic_date: string;
  setup_count: number;
  monthly_count: number;
  mt_count: number;
  mo_count: number;
  message_count: number;
  vendor_rate_id: number | null;
  vendor_rate: number;
  vendor_setup_fee: number;
  vendor_monthly_fee: number;
  vendor_mt_fee: number;
  vendor_mo_fee: number;
  vendor_currency: string;
  vendor_cost: number;
  client_rate_id: number | null;
  client_rate: number;
  client_setup_fee: number;
  client_monthly_fee: number;
  client_mt_fee: number;
  client_mo_fee: number;
  client_currency: string;
  client_revenue: number;
  fx_rate_id: number | null;
  fx_rate: number | null;
  normalized_vendor_cost: number | null;
  normalized_currency: string | null;
  margin: number;
  calculated_at: string;
  is_reversal: number;
  original_entry_id: number | null;
  reversal_reason: string | null;
  locked: number;
  // Joined fields
  client_name?: string;
  vendor_name?: string;
  country_name?: string;
}

export interface LedgerListParams extends ListParams {
  client_id?: number;
  vendor_id?: number;
  country_code?: string;
  channel?: string;
  date_from?: string;
  date_to?: string;
  include_reversals?: boolean;
}

export interface LedgerExportParams {
  client_id?: number;
  vendor_id?: number;
  country_code?: string;
  date_from?: string;
  date_to?: string;
}

export interface ComputeResult {
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: MarginComputeError[];
  summary: {
    totalVendorCost: number;
    totalClientRevenue: number;
    totalMargin: number;
  };
}

export interface MarginComputeError {
  trafficRecordId: number;
  errorType: 'no_routing' | 'no_vendor_rate' | 'no_client_rate' | 'no_fx_rate' | 'calculation_error';
  message: string;
}
