import { EntityStatus, ListParams } from './common';

export interface Vendor {
  id: number;
  name: string;
  code: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  currency: string;
  notes: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorDto {
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  currency?: string;
  notes?: string;
}

export interface UpdateVendorDto {
  id: number;
  name?: string;
  code?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  currency?: string;
  notes?: string | null;
  status?: EntityStatus;
}

export interface VendorListParams extends ListParams {
  status?: EntityStatus;
}
