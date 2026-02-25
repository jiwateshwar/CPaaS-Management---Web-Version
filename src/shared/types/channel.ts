import type { ListParams } from './common';

export interface ChannelRecord {
  id: number;
  code: string;
  label: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateChannelDto {
  code: string;
  label: string;
  status?: 'active' | 'inactive';
}

export interface UpdateChannelDto {
  id: number;
  code?: string;
  label?: string;
  status?: 'active' | 'inactive';
}

export interface ChannelListParams extends ListParams {
  status?: 'active' | 'inactive';
}
