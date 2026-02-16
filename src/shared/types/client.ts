import { EntityStatus, ListParams } from './common';

export interface Client {
  id: number;
  name: string;
  code: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_currency: string;
  payment_terms: string | null;
  notes: string | null;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateClientDto {
  name: string;
  code: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  billing_currency?: string;
  payment_terms?: string;
  notes?: string;
}

export interface UpdateClientDto {
  id: number;
  name?: string;
  code?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  billing_currency?: string;
  payment_terms?: string | null;
  notes?: string | null;
  status?: EntityStatus;
}

export interface ClientListParams extends ListParams {
  status?: EntityStatus;
}
