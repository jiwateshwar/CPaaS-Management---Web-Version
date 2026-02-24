import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import type { UseCase } from '../../shared/types';
import { formatDate } from '../lib/utils';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const columns: ColumnDef<UseCase, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => formatDate(getValue() as string) },
];

export function UseCasePage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'active' as 'active' | 'inactive' });

  const [editItem, setEditItem] = useState<UseCase | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '', status: 'active' as 'active' | 'inactive' });
  const [deleteItem, setDeleteItem] = useState<UseCase | null>(null);

  const { data, loading, refetch } = useIpcQuery(
    'useCase:list',
    { page, pageSize: 50, search },
    [page, search],
  );

  const { mutate: createUseCase } = useIpcMutation('useCase:create', { successMessage: 'Use case created' });
  const { mutate: updateUseCase } = useIpcMutation('useCase:update', { successMessage: 'Use case updated' });
  const { mutate: deleteUseCase } = useIpcMutation('useCase:delete', { successMessage: 'Use case deleted' });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    await createUseCase({
      name: formData.name.trim(),
      description: formData.description || null,
      status: formData.status,
    });
    setFormData({ name: '', description: '', status: 'active' });
    setShowForm(false);
    refetch();
  };

  const handleEdit = (item: UseCase) => {
    setEditItem(item);
    setEditData({
      name: item.name,
      description: item.description ?? '',
      status: item.status,
    });
  };

  const handleUpdate = async () => {
    if (!editItem || !editData.name.trim()) return;
    await updateUseCase({
      id: editItem.id,
      name: editData.name.trim(),
      description: editData.description || null,
      status: editData.status,
    });
    setEditItem(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await deleteUseCase({ id: deleteItem.id });
    setDeleteItem(null);
    refetch();
  };

  const actionColumns: ColumnDef<UseCase, unknown>[] = [
    ...columns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteItem(row.original)}
            title="Delete"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Use Cases"
        description="Manage available use cases for routing and rate plans"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Use Case
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">New Use Case</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Name (e.g., otp)"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <Select
              value={formData.status}
              onValueChange={(val) => setFormData({ ...formData, status: val as 'active' | 'inactive' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
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
          <Input
            placeholder="Search use cases..."
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
        emptyMessage="No use cases yet. Add your first use case above."
      />

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Use Case</DialogTitle>
            <DialogDescription>Update use case details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Input
              placeholder="Name"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            />
            <Select
              value={editData.status}
              onValueChange={(val) => setEditData({ ...editData, status: val as 'active' | 'inactive' })}
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
              placeholder="Description"
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Use Case</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.name}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
