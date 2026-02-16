import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { UploadBatch, UploadType, BatchStatus } from '../../shared/types';
import { UPLOAD_TYPE_LABELS } from '../../shared/constants/upload-types';
import { formatDate } from '../lib/utils';
import { Upload } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'secondary',
  validating: 'warning',
  processing: 'warning',
  completed: 'success',
  completed_with_errors: 'warning',
  failed: 'destructive',
  cancelled: 'secondary',
};

const columns: ColumnDef<UploadBatch, unknown>[] = [
  { accessorKey: 'id', header: 'ID' },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }) => UPLOAD_TYPE_LABELS[getValue() as UploadType] ?? getValue(),
  },
  { accessorKey: 'filename', header: 'File' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return <Badge variant={statusVariant[status] ?? 'secondary'}>{status}</Badge>;
    },
  },
  { accessorKey: 'total_rows', header: 'Total' },
  { accessorKey: 'inserted_rows', header: 'Inserted' },
  { accessorKey: 'error_rows', header: 'Errors' },
  {
    accessorKey: 'uploaded_at',
    header: 'Uploaded',
    cell: ({ getValue }) => formatDate(getValue() as string),
  },
];

export function UploadCenterPage() {
  const [page, setPage] = useState(1);

  const { data, loading } = useIpcQuery(
    'batch:list',
    { page, pageSize: 50 },
    [page],
  );

  return (
    <div>
      <PageHeader
        title="Upload Center"
        description="View all CSV upload batches and their status"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 50}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No uploads yet. Upload CSV files from the Vendors or Clients pages."
      />
    </div>
  );
}
