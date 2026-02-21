import { Channel, ListParams } from './common';
import type { VendorZeroRateAction } from './upload';

export interface VendorRate {
  id: number;
  vendor_id: number;
  country_code: string;
  channel: Channel;
  use_case: string;
  discontinued: number;
  setup_fee: number;
  monthly_fee: number;
  mt_fee: number;
  mo_fee: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  batch_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, for display)
  vendor_name?: string;
  country_name?: string;
}

export interface CreateVendorRateDto {
  vendor_id: number;
  country_code: string;
  channel: Channel;
  use_case?: string;
  discontinued?: number;
  setup_fee: number;
  monthly_fee: number;
  mt_fee: number;
  mo_fee: number;
  currency?: string;
  effective_from: string;
  effective_to?: string | null;
  batch_id?: number | null;
  notes?: string;
  zero_action?: VendorZeroRateAction;
}

export interface ClientRate {
  id: number;
  client_id: number;
  country_code: string;
  channel: Channel;
  use_case: string;
  setup_fee: number;
  monthly_fee: number;
  mt_fee: number;
  mo_fee: number;
  currency: string;
  contract_version: string | null;
  effective_from: string;
  effective_to: string | null;
  batch_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  country_name?: string;
}

export interface CreateClientRateDto {
  client_id: number;
  country_code: string;
  channel: Channel;
  use_case?: string;
  setup_fee: number;
  monthly_fee: number;
  mt_fee: number;
  mo_fee: number;
  currency?: string;
  contract_version?: string | null;
  effective_from: string;
  effective_to?: string | null;
  batch_id?: number | null;
  notes?: string;
}

export interface VendorRateListParams extends ListParams {
  vendor_id?: number;
  country_code?: string;
  channel?: Channel;
  use_case?: string;
  effective_date?: string;
}

export interface ClientRateListParams extends ListParams {
  client_id?: number;
  country_code?: string;
  channel?: Channel;
  use_case?: string;
  effective_date?: string;
}
