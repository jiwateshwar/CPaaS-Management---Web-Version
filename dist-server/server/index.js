"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const multer_1 = __importDefault(require("multer"));
const papaparse_1 = __importDefault(require("papaparse"));
const connection_1 = require("../main/database/connection");
const migrator_1 = require("../main/database/migrator");
const migrations_1 = require("../main/database/migrations");
const ipc_handlers_1 = require("./ipc-handlers");
const margin_ledger_repository_1 = require("../main/database/repositories/margin-ledger-repository");
const upload_batch_repository_1 = require("../main/database/repositories/upload-batch-repository");
const csv_processor_1 = require("../main/workers/csv-processor");
const PORT = Number(process.env.PORT ?? 3000);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? node_path_1.default.join(process.cwd(), 'uploads');
if (!node_fs_1.default.existsSync(UPLOAD_DIR)) {
    node_fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
const upload = (0, multer_1.default)({ dest: UPLOAD_DIR });
const db = (0, connection_1.createConnection)();
const migrator = new migrator_1.Migrator(db);
migrator.initialize();
migrator.migrate(migrations_1.migrations);
const ipcHandlers = (0, ipc_handlers_1.createIpcHandlers)(db);
const ledgerRepo = new margin_ledger_repository_1.MarginLedgerRepository(db);
const batchRepo = new upload_batch_repository_1.UploadBatchRepository(db);
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/system/info', (_req, res) => {
    res.json({
        dbPath: (0, connection_1.getDatabasePath)(),
        version: process.env.npm_package_version ?? '1.0.0',
    });
});
app.get('/api/system/backup', (_req, res) => {
    const dbPath = (0, connection_1.getDatabasePath)();
    const filename = node_path_1.default.basename(dbPath);
    res.download(dbPath, filename);
});
app.post('/api/ipc/:channel', async (req, res) => {
    const channel = req.params.channel;
    const handler = ipcHandlers[channel];
    if (!handler) {
        res.status(404).json({ error: `Unknown channel: ${channel}` });
        return;
    }
    try {
        const result = await handler(req.body?.params);
        res.json(result ?? null);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/api/ledger/export', (req, res) => {
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
    const csv = papaparse_1.default.unparse(result.data);
    const filename = `ledger-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});
app.post('/api/upload/preview', upload.single('file'), (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Missing file' });
        return;
    }
    try {
        const content = node_fs_1.default.readFileSync(req.file.path, 'utf-8');
        const parsed = papaparse_1.default.parse(content, {
            header: true,
            preview: 50,
            skipEmptyLines: true,
        });
        const totalLines = content.split('\n').length - 1;
        res.json({
            headers: parsed.meta.fields || [],
            sampleRows: parsed.data,
            totalRowEstimate: totalLines,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
    finally {
        node_fs_1.default.unlink(req.file.path, () => undefined);
    }
});
app.post('/api/upload/start', upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'Missing file' });
        return;
    }
    try {
        const type = String(req.body.type);
        const entityId = req.body.entityId ? Number(req.body.entityId) : undefined;
        const columnMapping = req.body.columnMapping
            ? JSON.parse(req.body.columnMapping)
            : [];
        const batch = batchRepo.create(type, req.file.originalname || 'upload.csv', entityId, JSON.stringify(columnMapping));
        const csvProcessor = new csv_processor_1.CsvProcessor(db);
        await csvProcessor.process({
            type,
            filePath: req.file.path,
            entityId,
            columnMapping,
            batchId: batch.id,
        });
        const updated = batchRepo.getById(batch.id);
        res.json(updated);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
    finally {
        node_fs_1.default.unlink(req.file.path, () => undefined);
    }
});
const clientDir = node_path_1.default.join(process.cwd(), 'dist');
app.use(express_1.default.static(clientDir));
app.get('*', (_req, res) => {
    res.sendFile(node_path_1.default.join(clientDir, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`[server] CPaaS Management web running on :${PORT}`);
});
//# sourceMappingURL=index.js.map