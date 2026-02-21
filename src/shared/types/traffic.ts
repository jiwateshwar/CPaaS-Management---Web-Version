import { Channel, ListParams } from './common';

export interface TrafficRecord {
  id: number;
  batch_id: number;
  client_id: number;
  country_code: string;
  channel: Channel;
  use_case: string;
  setup_count: number;
  monthly_count: number;
  mt_count: number;
  mo_count: number;
  message_count: number;
  traffic_date: string;
  created_at: string;
  // Joined fields
  client_name?: string;
  country_name?: string;
}

export interface TrafficListParams extends ListParams {
  client_id?: number;
  country_code?: string;
  channel?: Channel;
  date_from?: string;
  date_to?: string;
  batch_id?: number;
}
