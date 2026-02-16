import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import type { RoutingAssignment } from '../../shared/types';
import { formatDate } from '../lib/utils';

const columns: ColumnDef<RoutingAssignment, unknown>[] = [
  { accessorKey: 'client_name', header: 'Client' },
  { accessorKey: 'country_name', header: 'Country' },
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'use_case', header: 'Use Case' },
  { accessorKey: 'vendor_name', header: 'Vendor' },
  { accessorKey: 'effective_from', header: 'From', cell: ({ getValue }) => formatDate(getValue() as string) },
  {
    accessorKey: 'effective_to',
    header: 'To',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? formatDate(val) : 'Current';
    },
  },
];

export function RoutingPage() {
  const [page, setPage] = useState(1);

  const { data, loading } = useIpcQuery(
    'routing:list',
    { page, pageSize: 50 },
    [page],
  );

  return (
    <div>
      <PageHeader
        title="Routing Assignments"
        description="Which vendor handles which client's traffic by country, channel, and use case"
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
        emptyMessage="No routing assignments. Upload routing CSV to define vendor-client mappings."
      />
    </div>
  );
}
