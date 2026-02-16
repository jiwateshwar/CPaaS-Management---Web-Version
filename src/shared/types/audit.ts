import { ListParams } from './common';

export interface AuditLogEntry {
  id: number;
  table_name: string;
  record_id: number;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_values: string | null;
  new_values: string | null;
  user: string;
  created_at: string;
}

export interface AuditListParams extends ListParams {
  table_name?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}
