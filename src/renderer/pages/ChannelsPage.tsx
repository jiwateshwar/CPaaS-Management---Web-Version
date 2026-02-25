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
import type { ChannelRecord } from '../../shared/types';
import { formatDate } from '../lib/utils';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const columns: ColumnDef<ChannelRecord, unknown>[] = [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'label', header: 'Label' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'created_at', header: 'Created', cell: ({ getValue }) => formatDate(getValue() as string) },
];

export function ChannelsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ code: '', label: '', status: 'active' as 'active' | 'inactive' });

  const [editItem, setEditItem] = useState<ChannelRecord | null>(null);
  const [editData, setEditData] = useState({ code: '', label: '', status: 'active' as 'active' | 'inactive' });
  const [deleteItem, setDeleteItem] = useState<ChannelRecord | null>(null);

  const { data, loading, refetch } = useIpcQuery(
    'channel:list',
    { page, pageSize: 50, search },
    [page, search],
  );

  const { mutate: createChannel } = useIpcMutation('channel:create', { successMessage: 'Channel created' });
  const { mutate: updateChannel } = useIpcMutation('channel:update', { successMessage: 'Channel updated' });
  const { mutate: deleteChannel } = useIpcMutation('channel:delete', { successMessage: 'Channel deleted' });

  const handleCreate = async () => {
    if (!formData.code.trim() || !formData.label.trim()) return;
    await createChannel({
      code: formData.code.trim(),
      label: formData.label.trim(),
      status: formData.status,
    });
    setFormData({ code: '', label: '', status: 'active' });
    setShowForm(false);
    refetch();
  };

  const handleEdit = (item: ChannelRecord) => {
    setEditItem(item);
    setEditData({ code: item.code, label: item.label, status: item.status });
  };

  const handleUpdate = async () => {
    if (!editItem || !editData.code.trim() || !editData.label.trim()) return;
    await updateChannel({
      id: editItem.id,
      code: editData.code.trim(),
      label: editData.label.trim(),
      status: editData.status,
    });
    setEditItem(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await deleteChannel({ id: deleteItem.id });
    setDeleteItem(null);
    refetch();
  };

  const actionColumns: ColumnDef<ChannelRecord, unknown>[] = [
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
        title="Channels"
        description="Manage available messaging channels for rates, routing, and traffic"
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        }
      />

      {showForm && (
        <div className="mb-6 p-4 border rounded-lg bg-card space-y-3">
          <h3 className="font-semibold">New Channel</h3>
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Code (e.g., sms)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <Input
              placeholder="Label (e.g., SMS)"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
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
            placeholder="Search channels..."
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
        emptyMessage="No channels yet. Add your first channel above."
      />

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>Update channel details below.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <Input
              placeholder="Code (e.g., sms)"
              value={editData.code}
              onChange={(e) => setEditData({ ...editData, code: e.target.value })}
            />
            <Input
              placeholder="Label (e.g., SMS)"
              value={editData.label}
              onChange={(e) => setEditData({ ...editData, label: e.target.value })}
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
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteItem?.label}</strong> ({deleteItem?.code})?
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
