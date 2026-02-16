import { ListParams } from './common';

export interface FxRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_from: string;
  effective_to: string | null;
  source: string | null;
  batch_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFxRateDto {
  from_currency: string;
  to_currency: string;
  rate: number;
  effective_from: string;
  effective_to?: string | null;
  source?: string;
  batch_id?: number | null;
}

export interface FxRateListParams extends ListParams {
  from_currency?: string;
  to_currency?: string;
  effective_date?: string;
}
