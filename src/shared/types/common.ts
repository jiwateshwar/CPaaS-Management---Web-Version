export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  search?: string;
}

export type Channel = 'sms' | 'whatsapp' | 'viber' | 'rcs' | 'voice' | 'email' | 'other';

export const CHANNELS: Channel[] = ['sms', 'whatsapp', 'viber', 'rcs', 'voice', 'email', 'other'];

export type EntityStatus = 'active' | 'inactive';

export type UploadType = 'vendor_rate' | 'client_rate' | 'routing' | 'traffic' | 'fx_rate';

export type BatchStatus =
  | 'pending'
  | 'validating'
  | 'processing'
  | 'completed'
  | 'completed_with_errors'
  | 'failed'
  | 'cancelled';

export interface ProgressData {
  batchId: number;
  phase: string;
  processed: number;
  total: number;
}

export interface BatchCompleteEvent {
  batchId: number;
  status: BatchStatus;
  insertedRows: number;
  errorRows: number;
}
