import { BatchStatus, ListParams, UploadType } from './common';

export interface UploadBatch {
  id: number;
  type: UploadType;
  filename: string;
  status: BatchStatus;
  total_rows: number;
  processed_rows: number;
  inserted_rows: number;
  skipped_rows: number;
  error_rows: number;
  entity_id: number | null;
  column_mapping: string | null;
  uploaded_at: string;
  completed_at: string | null;
  error_summary: string | null;
}

export interface BatchError {
  id: number;
  batch_id: number;
  row_number: number;
  raw_data: string;
  error_type: 'validation' | 'duplicate' | 'country_unknown' | 'parse';
  error_message: string;
  resolved: number;
  created_at: string;
}

export interface BatchListParams extends ListParams {
  type?: UploadType;
  status?: BatchStatus;
}

export interface ColumnMapping {
  csvColumn: string;
  dbField: string | null;
}

export interface CsvPreview {
  headers: string[];
  sampleRows: string[][];
  totalRowEstimate: number;
}

export interface FieldDef {
  name: string;
  label: string;
  required: boolean;
  type: 'string' | 'decimal' | 'integer' | 'date' | 'country' | 'channel' | 'currency';
  default?: string;
}

export type VendorZeroRateAction = 'use_past' | 'discontinue';

export interface VendorRateZeroHandling {
  defaultAction: VendorZeroRateAction;
  perKey?: Record<string, VendorZeroRateAction>;
}
