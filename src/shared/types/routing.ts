import { Channel, ListParams } from './common';

export interface RoutingAssignment {
  id: number;
  client_id: number;
  country_code: string;
  channel: Channel;
  use_case: string;
  vendor_id: number;
  priority: number;
  effective_from: string;
  effective_to: string | null;
  batch_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  vendor_name?: string;
  country_name?: string;
}

export interface CreateRoutingDto {
  client_id: number;
  country_code: string;
  channel: Channel;
  use_case?: string;
  vendor_id: number;
  priority?: number;
  effective_from: string;
  effective_to?: string | null;
  batch_id?: number | null;
  notes?: string;
}

export interface RoutingListParams extends ListParams {
  client_id?: number;
  vendor_id?: number;
  country_code?: string;
  channel?: Channel;
  effective_date?: string;
}
