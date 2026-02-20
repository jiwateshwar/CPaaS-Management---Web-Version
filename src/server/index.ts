import express, { type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import Papa from 'papaparse';
import { createConnection, getDatabasePath } from '../main/database/connection';
import { Migrator } from '../main/database/migrator';
import { migrations } from '../main/database/migrations';
import { createIpcHandlers } from './ipc-handlers';
import { MarginLedgerRepository } from '../main/database/repositories/margin-ledger-repository';
import { UploadBatchRepository } from '../main/database/repositories/upload-batch-repository';
import { CsvProcessor } from '../main/workers/csv-processor';
import type { ColumnMapping, UploadType } from '../shared/types';

const PORT = Number(process.env.PORT ?? 3000);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: UPLOAD_DIR });

const db = createConnection();
const migrator = new Migrator(db);
migrator.initialize();
migrator.migrate(migrations);

const ipcHandlers = createIpcHandlers(db);
const ledgerRepo = new MarginLedgerRepository(db);
const batchRepo = new UploadBatchRepository(db);

app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true }));

app.get('/api/system/info', (_req: Request, res: Response) => {
  res.json({
    dbPath: getDatabasePath(),
    version: process.env.npm_package_version ?? '1.0.0',
  });
});

app.get('/api/system/backup', (_req: Request, res: Response) => {
  const dbPath = getDatabasePath();
  const filename = path.basename(dbPath);
  res.download(dbPath, filename);
});

app.post('/api/ipc/:channel', async (req: Request, res: Response) => {
  const channel = req.params.channel;
  const handler = ipcHandlers[channel as keyof typeof ipcHandlers];
  if (!handler) {
    res.status(404).json({ error: `Unknown channel: ${channel}` });
    return;
  }

  try {
    const result = await handler(req.body?.params);
    res.json(result ?? null);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.get('/api/ledger/export', (req: Request, res: Response) => {
  const params = {
    client_id: req.query.client_id ? Number(req.query.client_id) : undefined,
    vendor_id: req.query.vendor_id ? Number(req.query.vendor_id) : undefined,
    country_code: req.query.country_code ? String(req.query.country_code) : undefined,
    date_from: req.query.date_from ? String(req.query.date_from) : undefined,
    date_to: req.query.date_to ? String(req.query.date_to) : undefined,
  };

  const result = ledgerRepo.list({
    ...params,
    page: 1,
    pageSize: 1_000_000,
  });

  const csv = Papa.unparse(result.data);
  const filename = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

app.post('/api/upload/preview', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing file' });
    return;
  }

  try {
    const content = fs.readFileSync(req.file.path, 'utf-8');
    const parsed = Papa.parse(content, {
      header: true,
      preview: 50,
      skipEmptyLines: true,
    });
    const totalLines = content.split('\n').length - 1;

    res.json({
      headers: parsed.meta.fields || [],
      sampleRows: parsed.data as string[][],
      totalRowEstimate: totalLines,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  } finally {
    fs.unlink(req.file.path, () => undefined);
  }
});

app.post('/api/upload/start', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Missing file' });
    return;
  }

  try {
    const type = String(req.body.type) as UploadType;
    const entityId = req.body.entityId ? Number(req.body.entityId) : undefined;
    const columnMapping = req.body.columnMapping
      ? (JSON.parse(req.body.columnMapping) as ColumnMapping[])
      : [];

    const batch = batchRepo.create(
      type,
      req.file.originalname || 'upload.csv',
      entityId,
      JSON.stringify(columnMapping),
    );

    const csvProcessor = new CsvProcessor(db);
    await csvProcessor.process({
      type,
      filePath: req.file.path,
      entityId,
      columnMapping,
      batchId: batch.id,
    });

    const updated = batchRepo.getById(batch.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  } finally {
    fs.unlink(req.file.path, () => undefined);
  }
});

const clientDir = path.join(process.cwd(), 'dist');
app.use(express.static(clientDir));
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] CPaaS Management web running on :${PORT}`);
});
