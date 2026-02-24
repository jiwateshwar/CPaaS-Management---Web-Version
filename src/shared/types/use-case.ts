import { ListParams } from './common';

export interface UseCase {
  id: number;
  name: string;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateUseCaseDto {
  name: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface UpdateUseCaseDto {
  id: number;
  name?: string;
  description?: string | null;
  status?: 'active' | 'inactive';
}

export interface UseCaseListParams extends ListParams {
  status?: 'active' | 'inactive';
}
