import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import type { FxRate } from '../../shared/types';
import { formatDate } from '../lib/utils';

const columns: ColumnDef<FxRate, unknown>[] = [
  { accessorKey: 'from_currency', header: 'From' },
  { accessorKey: 'to_currency', header: 'To' },
  { accessorKey: 'rate', header: 'Rate', cell: ({ getValue }) => (getValue() as number).toFixed(6) },
  { accessorKey: 'effective_from', header: 'Effective From', cell: ({ getValue }) => formatDate(getValue() as string) },
  {
    accessorKey: 'effective_to',
    header: 'Effective To',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? formatDate(val) : 'Current';
    },
  },
  { accessorKey: 'source', header: 'Source' },
];

export function FxRatesPage() {
  const [page, setPage] = useState(1);

  const { data, loading } = useIpcQuery(
    'fx:list',
    { page, pageSize: 50 },
    [page],
  );

  return (
    <div>
      <PageHeader
        title="FX Rates"
        description="Currency exchange rates for cross-currency margin computation"
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
        emptyMessage="No FX rates defined yet."
      />
    </div>
  );
}
