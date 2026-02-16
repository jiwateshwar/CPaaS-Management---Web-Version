import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { MarginLedgerEntry } from '../../shared/types';
import { formatCurrency, formatRate, formatDate, formatNumber } from '../lib/utils';
import { Download, RotateCcw } from 'lucide-react';

const columns: ColumnDef<MarginLedgerEntry, unknown>[] = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'traffic_date', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
  { accessorKey: 'client_name', header: 'Client' },
  { accessorKey: 'vendor_name', header: 'Vendor' },
  { accessorKey: 'country_name', header: 'Country' },
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'use_case', header: 'Use Case' },
  { accessorKey: 'message_count', header: 'Messages', cell: ({ getValue }) => formatNumber(getValue() as number) },
  { accessorKey: 'vendor_rate', header: 'V.Rate', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'vendor_cost', header: 'V.Cost', cell: ({ getValue }) => formatCurrency(getValue() as number) },
  { accessorKey: 'client_rate', header: 'C.Rate', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'client_revenue', header: 'Revenue', cell: ({ getValue }) => formatCurrency(getValue() as number) },
  {
    accessorKey: 'margin',
    header: 'Margin',
    cell: ({ getValue }) => {
      const margin = getValue() as number;
      return (
        <span className={margin >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {formatCurrency(margin)}
        </span>
      );
    },
  },
  {
    accessorKey: 'is_reversal',
    header: 'Type',
    cell: ({ getValue }) =>
      getValue() ? <Badge variant="destructive">Reversal</Badge> : <Badge variant="success">Normal</Badge>,
  },
];

export function LedgerViewerPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeReversals, setIncludeReversals] = useState(true);

  const { data, loading, refetch } = useIpcQuery(
    'ledger:list',
    {
      page,
      pageSize: 100,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      include_reversals: includeReversals,
      sortDirection: 'desc',
    },
    [page, dateFrom, dateTo, includeReversals],
  );

  const { mutate: exportLedger } = useIpcMutation('ledger:export');

  return (
    <div>
      <PageHeader
        title="Margin Ledger"
        description="Immutable financial ledger - computed margins for all traffic"
        actions={
          <Button variant="outline" onClick={() => exportLedger({})}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <Input
          type="date"
          placeholder="From"
          className="w-40"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          placeholder="To"
          className="w-40"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeReversals}
            onChange={(e) => setIncludeReversals(e.target.checked)}
          />
          Show reversals
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 100}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No ledger entries. Upload traffic data and compute margins first."
      />
    </div>
  );
}
