import type { IpcChannel, IpcChannelMap } from '../../shared/ipc-channels';
import type { ColumnMapping, UploadBatch, CsvPreview } from '../../shared/types';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, init);
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function invoke<C extends IpcChannel>(
  channel: C,
  params: IpcChannelMap[C]['params'],
): Promise<IpcChannelMap[C]['result']> {
  return requestJson<IpcChannelMap[C]['result']>(`/api/ipc/${channel}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ params }),
  });
}

export async function uploadPreview(file: File): Promise<CsvPreview> {
  const formData = new FormData();
  formData.append('file', file);
  return requestJson<CsvPreview>('/api/upload/preview', {
    method: 'POST',
    body: formData,
  });
}

export async function uploadStart(opts: {
  file: File;
  type: string;
  entityId?: number;
  columnMapping: ColumnMapping[];
}): Promise<UploadBatch> {
  const formData = new FormData();
  formData.append('file', opts.file);
  formData.append('type', opts.type);
  if (opts.entityId) {
    formData.append('entityId', String(opts.entityId));
  }
  formData.append('columnMapping', JSON.stringify(opts.columnMapping));

  return requestJson<UploadBatch>('/api/upload/start', {
    method: 'POST',
    body: formData,
  });
}

export async function downloadLedgerExport(params: Record<string, string | number | undefined>): Promise<void> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });

  const res = await fetch(`${API_BASE}/api/ledger/export?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Export failed: ${res.status}`);
  }

  const blob = await res.blob();
  const filename = getFilenameFromResponse(res) ?? `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadBlob(blob, filename);
}

export async function downloadBackup(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/system/backup`);
  if (!res.ok) {
    throw new Error(`Backup failed: ${res.status}`);
  }
  const blob = await res.blob();
  const filename = getFilenameFromResponse(res) ?? `cpaas-backup-${new Date().toISOString().slice(0, 10)}.db`;
  downloadBlob(blob, filename);
}

export async function getSystemInfo(): Promise<{ dbPath: string; version: string }> {
  return requestJson<{ dbPath: string; version: string }>('/api/system/info');
}

function getFilenameFromResponse(res: Response): string | null {
  const contentDisposition = res.headers.get('Content-Disposition');
  if (!contentDisposition) return null;
  const match = /filename="([^"]+)"/.exec(contentDisposition);
  return match?.[1] ?? null;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
