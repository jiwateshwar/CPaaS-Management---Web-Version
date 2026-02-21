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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { CsvUploadWizard } from '../components/csv-upload/CsvUploadWizard';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { Vendor } from '../../shared/types';
import { VENDOR_RATE_FIELDS } from '../../shared/constants/upload-types';
import { Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';

const columns: ColumnDef<Vendor, unknown>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'currency', header: 'Currency' },
  { accessorKey: 'contact_name', header: 'Contact' },
  { accessorKey: 'contact_email', header: 'Email' },
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

export function VendorListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadVendor, setUploadVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    contact_name: '',
    contact_email: '',
    currency: 'USD',
  });

  // Edit/Delete state
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    code: '',
    contact_name: '',
    contact_email: '',
    currency: 'USD',
    status: 'active' as 'active' | 'inactive',
  });
  const [deleteVendor, setDeleteVendor] = useState<Vendor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, loading, refetch } = useIpcQuery(
    'vendor:list',
    { page, pageSize: 50, search },
    [page, search],
  );

  const { mutate: createVendor } = useIpcMutation('vendor:create', { successMessage: 'Vendor created successfully' });
  const { mutate: updateVendor } = useIpcMutation('vendor:update', { successMessage: 'Vendor updated successfully' });
  const { mutate: deleteVendorMutation } = useIpcMutation('vendor:delete', { successMessage: 'Vendor deleted successfully' });

  const handleCreate = async () => {
    if (!formData.name || !formData.code) return;
    await createVendor(formData);
    setShowForm(false);
    setFormData({ name: '', code: '', contact_name: '', contact_email: '', currency: 'USD' });
    refetch();
  };

  const handleUploadRates = (vendor: Vendor) => {
    setUploadVendor(vendor);
    setUploadOpen(true);
  };

  const handleHeaderUpload = () => {
    setUploadVendor(null);
    setUploadOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditVendor(vendor);
    setEditFormData({
      name: vendor.name,
      code: vendor.code,
      contact_name: vendor.contact_name ?? '',
      contact_email: vendor.contact_email ?? '',
      currency: vendor.currency,
      status: vendor.status,
    });
  };

  const handleUpdate = async () => {
    if (!editVendor || !editFormData.name || !editFormData.code) return;
    await updateVendor({
      id: editVendor.id,
      ...editFormData,
      contact_name: editFormData.contact_name || null,
      contact_email: editFormData.contact_email || null,
    });
    setEditVendor(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteVendor) return;
    setDeleteError(null);
    try {
      await deleteVendorMutation({ id: deleteVendor.id });
      setDeleteVendor(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete vendor');
    }
  };

  const actionColumns: ColumnDef<Vendor, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
            title="Edit vendor"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteVendor(row.original)}
            title="Delete vendor"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUploadRates(row.original)}
          >
            <Upload className="h-3 w-3 mr-1" />
            Upload Rates
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Manage upstream connectivity providers"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleHeaderUpload}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Rates
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">New Vendor</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Vendor Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              placeholder="Code (e.g., TWL)"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
            />
            <Input
              placeholder="Currency (e.g., USD)"
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
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
            placeholder="Search vendors..."
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
        emptyMessage="No vendors yet. Add your first vendor above."
      />

      {/* Vendor selector when opening upload from header */}
      {uploadOpen && !uploadVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border rounded-lg p-6 w-96 shadow-lg">
            <h3 className="font-semibold text-lg mb-2">Select Vendor</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which vendor these rates belong to
            </p>
            <Select
              onValueChange={(val) => {
                const vendor = data?.data.find((v) => v.id === Number(val));
                if (vendor) setUploadVendor(vendor);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a vendor..." />
              </SelectTrigger>
              <SelectContent>
                {(data?.data ?? []).map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.name} ({v.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!data?.data || data.data.length === 0) && (
              <p className="text-sm text-destructive mt-2">
                No vendors found. Create a vendor first.
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
        open={uploadOpen && !!uploadVendor}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) setUploadVendor(null);
        }}
        uploadType="vendor_rate"
        entityId={uploadVendor?.id}
        entityName={uploadVendor?.name}
        fieldDefs={VENDOR_RATE_FIELDS}
        onComplete={() => refetch()}
      />

      {/* Edit Vendor Dialog */}
      <Dialog open={!!editVendor} onOpenChange={(open) => !open && setEditVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Input
              placeholder="Vendor Name"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            />
            <Input
              placeholder="Code (e.g., TWL)"
              value={editFormData.code}
              onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value.toUpperCase() })}
            />
            <Input
              placeholder="Currency"
              value={editFormData.currency}
              onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value.toUpperCase() })}
            />
            <Select
              value={editFormData.status}
              onValueChange={(val) => setEditFormData({ ...editFormData, status: val as 'active' | 'inactive' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Contact Name"
              value={editFormData.contact_name}
              onChange={(e) => setEditFormData({ ...editFormData, contact_name: e.target.value })}
            />
            <Input
              placeholder="Contact Email"
              value={editFormData.contact_email}
              onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditVendor(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteVendor} onOpenChange={(open) => { if (!open) { setDeleteVendor(null); setDeleteError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteVendor?.name}</strong> ({deleteVendor?.code})?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteVendor(null); setDeleteError(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
