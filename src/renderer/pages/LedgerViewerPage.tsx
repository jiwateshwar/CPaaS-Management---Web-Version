import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { MarginLedgerEntry } from '../../shared/types';
import { formatCurrency, formatRate, formatDate, formatNumber } from '../lib/utils';
import { Download, RotateCcw, DollarSign, TrendingUp, TrendingDown, Hash } from 'lucide-react';

const columns: ColumnDef<MarginLedgerEntry, unknown>[] = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'traffic_date', header: 'Date', cell: ({ getValue }) => formatDate(getValue() as string) },
  { accessorKey: 'client_name', header: 'Client' },
  { accessorKey: 'vendor_name', header: 'Vendor' },
  { accessorKey: 'country_name', header: 'Country' },
  { accessorKey: 'channel', header: 'Ch.' },
  { accessorKey: 'message_count', header: 'Msgs', cell: ({ getValue }) => formatNumber(getValue() as number) },
  { accessorKey: 'vendor_cost', header: 'V.Cost', cell: ({ getValue }) => formatCurrency(getValue() as number) },
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
      getValue() ? <Badge variant="destructive">Reversal</Badge> : null,
  },
];

export function LedgerViewerPage() {
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [includeReversals, setIncludeReversals] = useState(true);
  const [reversalTarget, setReversalTarget] = useState<MarginLedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

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
  const { mutate: reverseEntry, loading: reversing } = useIpcMutation('ledger:reverseEntry');

  const handleReverse = async () => {
    if (!reversalTarget || !reversalReason.trim()) return;
    await reverseEntry({ entryId: reversalTarget.id, reason: reversalReason });
    setReversalTarget(null);
    setReversalReason('');
    refetch();
  };

  // Column totals from current page data
  const pageData = data?.data ?? [];
  const totals = pageData.reduce(
    (acc, row) => ({
      messages: acc.messages + (row.message_count ?? 0),
      cost: acc.cost + (row.vendor_cost ?? 0),
      revenue: acc.revenue + (row.client_revenue ?? 0),
      margin: acc.margin + (row.margin ?? 0),
    }),
    { messages: 0, cost: 0, revenue: 0, margin: 0 },
  );

  const actionColumns: ColumnDef<MarginLedgerEntry, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.is_reversal) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setReversalTarget(entry)}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reverse
          </Button>
        );
      },
    },
  ];

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

      {/* Filters */}
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
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Page totals */}
      {pageData.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Hash className="h-3 w-3" /> Messages (page)
            </div>
            <p className="text-lg font-semibold">{formatNumber(totals.messages)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3" /> Cost (page)
            </div>
            <p className="text-lg font-semibold">{formatCurrency(totals.cost)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" /> Revenue (page)
            </div>
            <p className="text-lg font-semibold">{formatCurrency(totals.revenue)}</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" /> Margin (page)
            </div>
            <p className={`text-lg font-semibold ${totals.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totals.margin)}
            </p>
          </Card>
        </div>
      )}

      <DataTable
        columns={actionColumns}
        data={pageData}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 100}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No ledger entries. Upload traffic data and compute margins first."
      />

      {/* Reversal Dialog */}
      <Dialog open={!!reversalTarget} onOpenChange={(open) => !open && setReversalTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Ledger Entry</DialogTitle>
            <DialogDescription>
              This will create a new entry with negated amounts. The original entry remains unchanged.
            </DialogDescription>
          </DialogHeader>
          {reversalTarget && (
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <p><strong>Entry #{reversalTarget.id}</strong></p>
                <p>Client: {reversalTarget.client_name} | Vendor: {reversalTarget.vendor_name}</p>
                <p>Country: {reversalTarget.country_name} | Date: {formatDate(reversalTarget.traffic_date)}</p>
                <p>Margin: {formatCurrency(reversalTarget.margin)}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Reason for reversal *</label>
                <Input
                  className="mt-1"
                  placeholder="e.g., Incorrect rate applied, duplicate traffic"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReversalTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reversalReason.trim() || reversing}
              onClick={handleReverse}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Create Reversal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
