import type { Migration } from '../migrator';

const migration: Migration = {
  version: 7,
  name: 'channels-and-seed-use-cases',
  up: (db) => {
    db.exec(`
      -- ============================================================
      -- CHANNELS MASTER TABLE
      -- ============================================================

      CREATE TABLE IF NOT EXISTS channels (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        code       TEXT NOT NULL UNIQUE COLLATE NOCASE,
        label      TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);

      -- Seed default channels
      INSERT OR IGNORE INTO channels (code, label) VALUES
        ('sms',       'SMS'),
        ('whatsapp',  'WhatsApp'),
        ('viber',     'Viber'),
        ('rcs',       'RCS'),
        ('voice',     'Voice'),
        ('email',     'Email'),
        ('other',     'Other');

      -- ============================================================
      -- SEED DEFAULT USE CASES (table already exists from migration 005)
      -- ============================================================

      INSERT OR IGNORE INTO use_cases (name, description, status) VALUES
        ('default',       'Default use case',          'active'),
        ('otp',           'One-Time Password',         'active'),
        ('marketing',     'Marketing messages',        'active'),
        ('transactional', 'Transactional messages',    'active'),
        ('alerts',        'Alerts and notifications',  'active'),
        ('notifications', 'General notifications',     'active'),
        ('support',       'Customer support',          'active');
    `);
  },
};

export default migration;
