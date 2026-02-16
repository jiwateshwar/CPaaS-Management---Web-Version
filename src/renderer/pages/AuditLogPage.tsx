import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import type { AuditLogEntry } from '../../shared/types';
import { formatDate } from '../lib/utils';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';

function JsonDiff({ oldValues, newValues }: { oldValues: string | null; newValues: string | null }) {
  const oldObj = oldValues ? JSON.parse(oldValues) : null;
  const newObj = newValues ? JSON.parse(newValues) : null;

  const allKeys = Array.from(
    new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]),
  );

  if (allKeys.length === 0) {
    return <p className="text-sm text-muted-foreground">No data</p>;
  }

  return (
    <table className="w-full text-xs font-mono">
      <thead>
        <tr className="border-b">
          <th className="text-left py-1 px-2 font-medium">Field</th>
          {oldObj && <th className="text-left py-1 px-2 font-medium text-red-600">Old Value</th>}
          {newObj && <th className="text-left py-1 px-2 font-medium text-green-600">New Value</th>}
        </tr>
      </thead>
      <tbody>
        {allKeys.map((key) => {
          const oldVal = oldObj?.[key];
          const newVal = newObj?.[key];
          const changed = oldObj && newObj && JSON.stringify(oldVal) !== JSON.stringify(newVal);

          return (
            <tr key={key} className={`border-b ${changed ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
              <td className="py-1 px-2 text-muted-foreground">{key}</td>
              {oldObj && (
                <td className={`py-1 px-2 ${changed ? 'text-red-600' : ''}`}>
                  {formatValue(oldVal)}
                </td>
              )}
              {newObj && (
                <td className={`py-1 px-2 ${changed ? 'text-green-600' : ''}`}>
                  {formatValue(newVal)}
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function ExpandableRow({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasData = entry.old_values || entry.new_values;

  return (
    <>
      <tr className="border-b hover:bg-muted/50">
        <td className="py-2 px-3">
          {hasData ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <span className="inline-block w-6" />
          )}
        </td>
        <td className="py-2 px-3 text-muted-foreground">{entry.id}</td>
        <td className="py-2 px-3 text-sm">{formatDate(entry.created_at)}</td>
        <td className="py-2 px-3 font-mono text-sm">{entry.table_name}</td>
        <td className="py-2 px-3">{entry.record_id}</td>
        <td className="py-2 px-3">
          <Badge
            variant={
              entry.action === 'INSERT'
                ? 'success'
                : entry.action === 'DELETE'
                  ? 'destructive'
                  : 'warning'
            }
          >
            {entry.action}
          </Badge>
        </td>
        <td className="py-2 px-3 text-sm">{entry.user || 'system'}</td>
      </tr>
      {expanded && hasData && (
        <tr className="border-b">
          <td colSpan={7} className="p-3 bg-muted/30">
            <JsonDiff oldValues={entry.old_values} newValues={entry.new_values} />
          </td>
        </tr>
      )}
    </>
  );
}

export function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, loading } = useIpcQuery(
    'audit:list',
    {
      page,
      pageSize: 100,
      table_name: tableFilter || undefined,
      action: actionFilter || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    },
    [page, tableFilter, actionFilter, dateFrom, dateTo],
  );

  const entries = data?.data ?? [];
  const hasFilters = tableFilter || actionFilter || dateFrom || dateTo;

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Immutable record of all data changes - click rows to view details"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative w-48">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by table..."
            className="pl-9"
            value={tableFilter}
            onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <Input
          type="date"
          className="w-40"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          className="w-40"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setTableFilter('');
              setActionFilter('');
              setDateFrom('');
              setDateTo('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Custom table with expandable rows */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading...
            </div>
          ) : entries.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              No audit entries{hasFilters ? ' matching filters' : ' yet'}.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2 px-3 w-10" />
                  <th className="text-left py-2 px-3">ID</th>
                  <th className="text-left py-2 px-3">Timestamp</th>
                  <th className="text-left py-2 px-3">Table</th>
                  <th className="text-left py-2 px-3">Record ID</th>
                  <th className="text-left py-2 px-3">Action</th>
                  <th className="text-left py-2 px-3">User</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <ExpandableRow key={entry.id} entry={entry} />
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>
            {data?.total ?? 0} entries total - Page {data?.page ?? 1} of {data?.totalPages ?? 1}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data?.totalPages ?? 1)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
