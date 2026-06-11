import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'tradezella.db');
const legacyPath = join(dataDir, 'tradevault.db');
if (!fs.existsSync(dbPath) && fs.existsSync(legacyPath)) {
  try {
    fs.copyFileSync(legacyPath, dbPath);
    if (fs.existsSync(legacyPath + '-wal')) fs.copyFileSync(legacyPath + '-wal', dbPath + '-wal');
    if (fs.existsSync(legacyPath + '-shm')) fs.copyFileSync(legacyPath + '-shm', dbPath + '-shm');
    console.log('Successfully migrated legacy tradevault database to tradezella.db');
  } catch (err) {
    console.error('Failed to migrate legacy database file:', err);
  }
}

const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ───────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT 'Trader',
    account_size REAL DEFAULT 10000,
    currency TEXT DEFAULT 'USD',
    risk_percent REAL DEFAULT 1.0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Long',
    entry_price REAL DEFAULT 0,
    exit_price REAL DEFAULT 0,
    lot_size REAL DEFAULT 0,
    stop_loss REAL DEFAULT 0,
    take_profit REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    entry_time TEXT,
    exit_time TEXT,
    setup TEXT DEFAULT '',
    grade TEXT DEFAULT 'B',
    notes TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    emotion_tags TEXT DEFAULT '[]',
    fomo_level INTEGER DEFAULT 5,
    confidence_level INTEGER DEFAULT 5,
    image_path TEXT DEFAULT '',
    share_token TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    pre_market TEXT DEFAULT '',
    session_notes TEXT DEFAULT '',
    lessons TEXT DEFAULT '',
    mistakes TEXT DEFAULT '',
    goals TEXT DEFAULT '',
    mood TEXT DEFAULT 'neutral',
    rating INTEGER DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
  CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
  CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);
`);

// Migration: dynamically add share_token column to trades if it doesn't exist
try {
  db.exec("ALTER TABLE trades ADD COLUMN share_token TEXT");
} catch (e) {
  // Ignore error if column already exists
}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_trades_share_token ON trades(share_token)");
} catch (e) {
  // Ignore index creation error
}

export default db;
