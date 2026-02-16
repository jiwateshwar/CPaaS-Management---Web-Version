import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { CsvUploadWizard } from '../components/csv-upload/CsvUploadWizard';
import { useIpcQuery } from '../hooks/useIpc';
import type { UploadBatch, BatchError, UploadType } from '../../shared/types';
import { UPLOAD_TYPE_LABELS, TRAFFIC_FIELDS, ROUTING_FIELDS, FX_RATE_FIELDS } from '../../shared/constants/upload-types';
import { formatDate } from '../lib/utils';
import { Upload, ChevronDown, ChevronRight, FileWarning, X } from 'lucide-react';

const statusVariant: Record<string, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'secondary',
  validating: 'warning',
  processing: 'warning',
  completed: 'success',
  completed_with_errors: 'warning',
  failed: 'destructive',
  cancelled: 'secondary',
};

const batchColumns: ColumnDef<UploadBatch, unknown>[] = [
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
      return <Badge variant={statusVariant[status] ?? 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
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
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<'traffic' | 'routing' | 'fx_rate' | null>(null);

  const { data, loading, refetch } = useIpcQuery(
    'batch:list',
    { page, pageSize: 50 },
    [page],
  );

  const { data: errors } = useIpcQuery(
    'batch:errors',
    { batchId: selectedBatchId ?? 0 },
    [selectedBatchId],
  );

  const expandColumns: ColumnDef<UploadBatch, unknown>[] = [
    ...batchColumns,
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const batch = row.original;
        if (batch.error_rows === 0) return null;
        const isSelected = selectedBatchId === batch.id;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedBatchId(isSelected ? null : batch.id)}
          >
            {isSelected ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            Errors
          </Button>
        );
      },
    },
  ];

  const uploadConfig = {
    traffic: { fields: TRAFFIC_FIELDS, label: 'Traffic Data' },
    routing: { fields: ROUTING_FIELDS, label: 'Routing Assignments' },
    fx_rate: { fields: FX_RATE_FIELDS, label: 'FX Rates' },
  };

  return (
    <div>
      <PageHeader
        title="Upload Center"
        description="Upload CSV files and view batch processing status"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setUploadType('traffic')}>
              <Upload className="h-4 w-4 mr-2" />
              Traffic
            </Button>
            <Button variant="outline" onClick={() => setUploadType('routing')}>
              <Upload className="h-4 w-4 mr-2" />
              Routing
            </Button>
            <Button variant="outline" onClick={() => setUploadType('fx_rate')}>
              <Upload className="h-4 w-4 mr-2" />
              FX Rates
            </Button>
          </div>
        }
      />

      <DataTable
        columns={expandColumns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 50}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No uploads yet. Use the buttons above or upload from Vendors/Clients pages."
      />

      {/* Error drill-down panel */}
      {selectedBatchId && errors && errors.length > 0 && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-destructive" />
              Errors for Batch #{selectedBatchId} ({errors.length} errors)
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBatchId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 sticky top-0">
                    <th className="text-left px-3 py-2 w-16">Row</th>
                    <th className="text-left px-3 py-2 w-32">Type</th>
                    <th className="text-left px-3 py-2">Message</th>
                    <th className="text-left px-3 py-2 w-48">Raw Data</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((err: BatchError) => (
                    <tr key={err.id} className="border-b hover:bg-muted/30">
                      <td className="px-3 py-1.5 font-mono text-xs">{err.row_number}</td>
                      <td className="px-3 py-1.5">
                        <Badge
                          variant={
                            err.error_type === 'country_unknown'
                              ? 'warning'
                              : err.error_type === 'duplicate'
                                ? 'secondary'
                                : 'destructive'
                          }
                        >
                          {err.error_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5 text-xs">{err.error_message}</td>
                      <td className="px-3 py-1.5 font-mono text-xs truncate max-w-[12rem]">
                        {err.raw_data}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {uploadType && (
        <CsvUploadWizard
          open={!!uploadType}
          onOpenChange={(open) => {
            if (!open) setUploadType(null);
          }}
          uploadType={uploadType}
          fieldDefs={uploadConfig[uploadType].fields}
          onComplete={() => {
            refetch();
            setUploadType(null);
          }}
        />
      )}
    </div>
  );
}
