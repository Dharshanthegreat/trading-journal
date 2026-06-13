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

  CREATE TABLE IF NOT EXISTS notion_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content TEXT DEFAULT '',
    icon TEXT DEFAULT '📄',
    tags TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS stoic_reframings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    situation TEXT NOT NULL,
    in_control TEXT NOT NULL,
    out_of_control TEXT NOT NULL,
    stoic_reframe TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS economic_news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    country TEXT NOT NULL,
    date TEXT NOT NULL,
    impact TEXT NOT NULL,
    forecast TEXT DEFAULT '',
    previous TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
  CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
  CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
  CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_notion_user ON notion_documents(user_id);
  CREATE INDEX IF NOT EXISTS idx_notion_updated ON notion_documents(updated_at);
  CREATE INDEX IF NOT EXISTS idx_stoic_user ON stoic_reframings(user_id);
  CREATE INDEX IF NOT EXISTS idx_economic_news_date ON economic_news(date);

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'Simulated',
    balance REAL DEFAULT 10000.0,
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    account_name TEXT DEFAULT '',
    amount REAL DEFAULT 0.0,
    date TEXT NOT NULL,
    certificate_image_path TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
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

// Migration: dynamically add dashboard_share_token column to users if it doesn't exist
try {
  db.exec("ALTER TABLE users ADD COLUMN dashboard_share_token TEXT");
} catch (e) {
  // Ignore error if column already exists
}
try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_dashboard_share_token ON users(dashboard_share_token)");
} catch (e) {
  // Ignore index creation error
}

// Migration: dynamically add account_id column to trades if it doesn't exist
try {
  db.exec("ALTER TABLE trades ADD COLUMN account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL");
} catch (e) {
  // Ignore error if column already exists
}

// Migration: dynamically add external_url column to notion_documents if it doesn't exist
try {
  db.exec("ALTER TABLE notion_documents ADD COLUMN external_url TEXT");
} catch (e) {
  // Ignore error if column already exists
}

export default db;
