"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabasePath = getDatabasePath;
exports.ensureDatabaseDir = ensureDatabaseDir;
exports.createConnection = createConnection;
exports.applyPragmas = applyPragmas;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_path_1 = __importDefault(require("node:path"));
const node_fs_1 = __importDefault(require("node:fs"));
const DB_FILENAME = 'cpaas-ledger.db';
function getDatabasePath() {
    if (process.env.DB_PATH) {
        return process.env.DB_PATH;
    }
    const dataDir = process.env.DB_DIR ?? node_path_1.default.join(process.cwd(), 'data');
    return node_path_1.default.join(dataDir, DB_FILENAME);
}
function ensureDatabaseDir(dbPath) {
    const resolvedPath = dbPath ?? getDatabasePath();
    const dir = node_path_1.default.dirname(resolvedPath);
    if (!node_fs_1.default.existsSync(dir)) {
        node_fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function createConnection(dbPath) {
    ensureDatabaseDir(dbPath);
    const db = new better_sqlite3_1.default(dbPath ?? getDatabasePath());
    applyPragmas(db);
    return db;
}
function applyPragmas(db) {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    db.pragma('foreign_keys = ON');
    db.pragma('temp_store = MEMORY');
}
//# sourceMappingURL=connection.js.map