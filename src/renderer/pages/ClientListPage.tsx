import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { CsvUploadWizard } from '../components/csv-upload/CsvUploadWizard';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { Client } from '../../shared/types';
import { CLIENT_RATE_FIELDS } from '../../shared/constants/upload-types';
import { Plus, Search, Upload } from 'lucide-react';

const columns: ColumnDef<Client, unknown>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'billing_currency', header: 'Currency' },
  { accessorKey: 'contact_name', header: 'Contact' },
  { accessorKey: 'payment_terms', header: 'Terms' },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <Badge variant={getValue() === 'active' ? 'success' : 'secondary'}>
        {getValue() as string}
      </Badge>
    ),
  },
];

export function ClientListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClient, setUploadClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_name: '',
    contact_email: '',
    billing_currency: 'USD',
    payment_terms: 'Net 30',
  });

  const { data, loading, refetch } = useIpcQuery(
    'client:list',
    { page, pageSize: 50, search },
    [page, search],
  );

  const { mutate: createClient } = useIpcMutation('client:create', { successMessage: 'Client created successfully' });

  const handleCreate = async () => {
    if (!formData.name || !formData.code) return;
    await createClient(formData);
    setShowForm(false);
    setFormData({
      name: '',
      code: '',
      contact_name: '',
      contact_email: '',
      billing_currency: 'USD',
      payment_terms: 'Net 30',
    });
    refetch();
  };

  const handleUploadRates = (client: Client) => {
    setUploadClient(client);
    setUploadOpen(true);
  };

  const handleHeaderUpload = () => {
    setUploadClient(null);
    setUploadOpen(true);
  };

  const actionColumns: ColumnDef<Client, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleUploadRates(row.original)}
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload Rates
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage downstream enterprise clients"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleHeaderUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Rates
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">New Client</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Client Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              placeholder="Code (e.g., ACME)"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
            />
            <Input
              placeholder="Billing Currency"
              value={formData.billing_currency}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billing_currency: e.target.value.toUpperCase(),
                })
              }
            />
            <Input
              placeholder="Contact Name"
              value={formData.contact_name}
              onChange={(e) =>
                setFormData({ ...formData, contact_name: e.target.value })
              }
            />
            <Input
              placeholder="Contact Email"
              value={formData.contact_email}
              onChange={(e) =>
                setFormData({ ...formData, contact_email: e.target.value })
              }
            />
            <Input
              placeholder="Payment Terms (e.g., Net 30)"
              value={formData.payment_terms}
              onChange={(e) =>
                setFormData({ ...formData, payment_terms: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>Save</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <DataTable
        columns={actionColumns}
        data={data?.data ?? []}
        totalCount={data?.total ?? 0}
        page={data?.page ?? 1}
        pageSize={data?.pageSize ?? 50}
        totalPages={data?.totalPages ?? 1}
        onPageChange={setPage}
        isLoading={loading}
        emptyMessage="No clients yet. Add your first client above."
      />

      {/* Client selector when opening upload from header */}
      {uploadOpen && !uploadClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-96 shadow-lg">
            <h3 className="font-semibold text-lg mb-2">Select Client</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which client these rates belong to
            </p>
            <Select
              onValueChange={(val) => {
                const client = data?.data.find((c) => c.id === Number(val));
                if (client) setUploadClient(client);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {(data?.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!data?.data || data.data.length === 0) && (
              <p className="text-sm text-destructive mt-2">
                No clients found. Create a client first.
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <CsvUploadWizard
        open={uploadOpen && !!uploadClient}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setUploadClient(null);
        }}
        uploadType="client_rate"
        entityId={uploadClient?.id}
        entityName={uploadClient?.name}
        fieldDefs={CLIENT_RATE_FIELDS}
        onComplete={() => refetch()}
      />
    </div>
  );
}
