import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { CsvUploadWizard } from '../components/csv-upload/CsvUploadWizard';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { FxRate } from '../../shared/types';
import { FX_RATE_FIELDS } from '../../shared/constants/upload-types';
import { formatDate } from '../lib/utils';
import { Plus, Upload } from 'lucide-react';

const columns: ColumnDef<FxRate, unknown>[] = [
  { accessorKey: 'from_currency', header: 'From', cell: ({ getValue }) => (
    <Badge variant="outline" className="font-mono">{getValue() as string}</Badge>
  )},
  { accessorKey: 'to_currency', header: 'To', cell: ({ getValue }) => (
    <Badge variant="outline" className="font-mono">{getValue() as string}</Badge>
  )},
  { accessorKey: 'rate', header: 'Rate', cell: ({ getValue }) => (
    <span className="font-mono">{(getValue() as number).toFixed(6)}</span>
  )},
  { accessorKey: 'effective_from', header: 'Effective From', cell: ({ getValue }) => formatDate(getValue() as string) },
  {
    accessorKey: 'effective_to',
    header: 'Effective To',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? formatDate(val) : <Badge variant="success">Current</Badge>;
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ getValue }) => (
      <Badge variant="secondary">{(getValue() as string) || 'manual'}</Badge>
    ),
  },
];

export function FxRatesPage() {
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [formData, setFormData] = useState({
    from_currency: 'USD',
    to_currency: '',
    rate: '',
    effective_from: '',
    effective_to: '',
    source: 'manual',
  });

  const { data, loading, refetch } = useIpcQuery(
    'fx:list',
    { page, pageSize: 50 },
    [page],
  );

  const { mutate: createFxRate, loading: creating } = useIpcMutation('fx:create', { successMessage: 'FX rate saved successfully' });

  const handleCreate = async () => {
    if (!formData.from_currency || !formData.to_currency || !formData.rate || !formData.effective_from) return;
    await createFxRate({
      from_currency: formData.from_currency.toUpperCase(),
      to_currency: formData.to_currency.toUpperCase(),
      rate: parseFloat(formData.rate),
      effective_from: formData.effective_from,
      effective_to: formData.effective_to || null,
      source: formData.source || 'manual',
    });
    setShowForm(false);
    setFormData({
      from_currency: 'USD',
      to_currency: '',
      rate: '',
      effective_from: '',
      effective_to: '',
      source: 'manual',
    });
    refetch();
  };

  const isFormValid =
    formData.from_currency.trim() &&
    formData.to_currency.trim() &&
    formData.rate &&
    parseFloat(formData.rate) > 0 &&
    formData.effective_from;

  return (
    <div>
      <PageHeader
        title="FX Rates"
        description="Currency exchange rates for cross-currency margin computation"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rate
            </Button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">New FX Rate</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">From Currency *</label>
              <Input
                placeholder="e.g., USD"
                value={formData.from_currency}
                onChange={(e) => setFormData({ ...formData, from_currency: e.target.value.toUpperCase() })}
                className="mt-1"
                maxLength={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">To Currency *</label>
              <Input
                placeholder="e.g., EUR"
                value={formData.to_currency}
                onChange={(e) => setFormData({ ...formData, to_currency: e.target.value.toUpperCase() })}
                className="mt-1"
                maxLength={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Rate *</label>
              <Input
                type="number"
                step="0.000001"
                placeholder="e.g., 0.920000"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Effective From *</label>
              <Input
                type="date"
                value={formData.effective_from}
                onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Effective To</label>
              <Input
                type="date"
                value={formData.effective_to}
                onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for current/open-ended</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Source</label>
              <Input
                placeholder="e.g., manual, ECB, XE"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          {formData.from_currency && formData.to_currency && formData.rate && (
            <p className="text-sm text-muted-foreground">
              1 {formData.from_currency} = {parseFloat(formData.rate) || 0} {formData.to_currency}
              {parseFloat(formData.rate) > 0 && (
                <span className="ml-3">
                  (1 {formData.to_currency} = {(1 / parseFloat(formData.rate)).toFixed(6)} {formData.from_currency})
                </span>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!isFormValid || creating}>
              {creating ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 50}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No FX rates defined yet. Add rates manually or upload a CSV."
      />

      <CsvUploadWizard
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        uploadType="fx_rate"
        fieldDefs={FX_RATE_FIELDS}
        onComplete={() => refetch()}
      />
    </div>
  );
}
