import { FieldDef, UploadType } from '../types';

export const UPLOAD_TYPE_LABELS: Record<UploadType, string> = {
  vendor_rate: 'Vendor Rates',
  client_rate: 'Client Rates',
  routing: 'Routing Assignments',
  traffic: 'Traffic Data',
  fx_rate: 'FX Rates',
};

export const VENDOR_RATE_FIELDS: FieldDef[] = [
  { name: 'country', label: 'Country', required: true, type: 'country' },
  { name: 'channel', label: 'Channel', required: true, type: 'channel' },
  { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
  { name: 'setup_fee', label: 'Setup Fee', required: true, type: 'decimal' },
  { name: 'monthly_fee', label: 'Monthly Fee', required: true, type: 'decimal' },
  { name: 'mt_fee', label: 'MT Fee', required: true, type: 'decimal' },
  { name: 'mo_fee', label: 'MO Fee', required: true, type: 'decimal' },
  { name: 'currency', label: 'Currency', required: false, type: 'currency', default: 'USD' },
  { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
  { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
  { name: 'notes', label: 'Remarks', required: false, type: 'string' },
];

export const CLIENT_RATE_FIELDS: FieldDef[] = [
  { name: 'country', label: 'Country', required: true, type: 'country' },
  { name: 'channel', label: 'Channel', required: true, type: 'channel' },
  { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
  { name: 'setup_fee', label: 'Setup Fee', required: true, type: 'decimal' },
  { name: 'monthly_fee', label: 'Monthly Fee', required: true, type: 'decimal' },
  { name: 'mt_fee', label: 'MT Fee', required: true, type: 'decimal' },
  { name: 'mo_fee', label: 'MO Fee', required: true, type: 'decimal' },
  { name: 'currency', label: 'Currency', required: false, type: 'currency', default: 'USD' },
  { name: 'contract_version', label: 'Contract Version', required: false, type: 'string' },
  { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
  { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
  { name: 'notes', label: 'Remarks', required: false, type: 'string' },
];

export const ROUTING_FIELDS: FieldDef[] = [
  { name: 'client_code', label: 'Client Code', required: true, type: 'string' },
  { name: 'country', label: 'Country', required: true, type: 'country' },
  { name: 'channel', label: 'Channel', required: true, type: 'channel' },
  { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
  { name: 'vendor_code', label: 'Vendor Code', required: true, type: 'string' },
  { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
  { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];

export const TRAFFIC_FIELDS: FieldDef[] = [
  { name: 'client_code', label: 'Client Code', required: true, type: 'string' },
  { name: 'country', label: 'Country', required: true, type: 'country' },
  { name: 'channel', label: 'Channel', required: true, type: 'channel' },
  { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
  { name: 'setup_count', label: 'Setup Fee (count)', required: true, type: 'integer' },
  { name: 'monthly_count', label: 'Monthly Fee (count)', required: true, type: 'integer' },
  { name: 'mt_count', label: 'MT Traffic (count)', required: true, type: 'integer' },
  { name: 'mo_count', label: 'MO Traffic (count)', required: true, type: 'integer' },
  { name: 'traffic_date', label: 'Traffic Date', required: true, type: 'date' },
];

export const FX_RATE_FIELDS: FieldDef[] = [
  { name: 'from_currency', label: 'From Currency', required: true, type: 'currency' },
  { name: 'to_currency', label: 'To Currency', required: true, type: 'currency' },
  { name: 'rate', label: 'Rate', required: true, type: 'decimal' },
  { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
  { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];
