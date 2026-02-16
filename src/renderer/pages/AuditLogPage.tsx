import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import type { AuditLogEntry } from '../../shared/types';
import { Badge } from '../components/ui/badge';

const columns: ColumnDef<AuditLogEntry, unknown>[] = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'created_at', header: 'Timestamp' },
  { accessorKey: 'table_name', header: 'Table' },
  { accessorKey: 'record_id', header: 'Record ID' },
  {
    accessorKey: 'action',
    header: 'Action',
    cell: ({ getValue }) => {
      const action = getValue() as string;
      const variant = action === 'INSERT' ? 'success' : action === 'DELETE' ? 'destructive' : 'warning';
      return <Badge variant={variant}>{action}</Badge>;
    },
  },
  { accessorKey: 'user', header: 'User' },
];

export function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, loading } = useIpcQuery(
    'audit:list',
    { page, pageSize: 100 },
    [page],
  );

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of all data changes"
      />

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 100}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No audit entries yet."
      />
    </div>
  );
}
