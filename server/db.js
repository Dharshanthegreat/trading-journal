import pg from 'pg';
import './utils/env.js';

const { Pool } = pg;

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Log connection events
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// ─── Helper: query wrapper ────────────────────────────
async function query(text, params) {
  const result = await pool.query(text, params);
  return result;
}

// ─── Initialize Database Tables ───────────────────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL DEFAULT 'Trader',
        account_size DOUBLE PRECISION DEFAULT 10000,
        currency TEXT DEFAULT 'USD',
        risk_percent DOUBLE PRECISION DEFAULT 1.0,
        dashboard_share_token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Long',
        entry_price DOUBLE PRECISION DEFAULT 0,
        exit_price DOUBLE PRECISION DEFAULT 0,
        lot_size DOUBLE PRECISION DEFAULT 0,
        stop_loss DOUBLE PRECISION DEFAULT 0,
        take_profit DOUBLE PRECISION DEFAULT 0,
        pnl DOUBLE PRECISION DEFAULT 0,
        entry_time TIMESTAMPTZ,
        exit_time TIMESTAMPTZ,
        setup TEXT DEFAULT '',
        grade TEXT DEFAULT 'B',
        notes TEXT DEFAULT '',
        tags TEXT DEFAULT '[]',
        emotion_tags TEXT DEFAULT '[]',
        fomo_level INTEGER DEFAULT 5,
        confidence_level INTEGER DEFAULT 5,
        image_path TEXT DEFAULT '',
        share_token TEXT UNIQUE,
        account_id INTEGER,
        notion_link TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        pre_market TEXT DEFAULT '',
        session_notes TEXT DEFAULT '',
        lessons TEXT DEFAULT '',
        mistakes TEXT DEFAULT '',
        goals TEXT DEFAULT '',
        mood TEXT DEFAULT 'neutral',
        rating INTEGER DEFAULT 5,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, date)
      );

      CREATE TABLE IF NOT EXISTS notion_documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'Untitled Document',
        content TEXT DEFAULT '',
        icon TEXT DEFAULT '📄',
        tags TEXT DEFAULT '[]',
        external_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stoic_reframings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        situation TEXT NOT NULL,
        in_control TEXT NOT NULL,
        out_of_control TEXT NOT NULL,
        stoic_reframe TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS economic_news (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        country TEXT NOT NULL,
        date TEXT NOT NULL,
        impact TEXT NOT NULL,
        forecast TEXT DEFAULT '',
        previous TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        account_name TEXT NOT NULL,
        account_type TEXT NOT NULL DEFAULT 'Simulated',
        balance DOUBLE PRECISION DEFAULT 10000.0,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'Active',
        notion_link TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        account_name TEXT DEFAULT '',
        amount DOUBLE PRECISION DEFAULT 0.0,
        date TEXT NOT NULL,
        certificate_image_path TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time ON trades(user_id, entry_time DESC);
      CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
      CREATE INDEX IF NOT EXISTS idx_trades_share_token ON trades(share_token);
      CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_notion_user ON notion_documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_notion_updated ON notion_documents(updated_at);
      CREATE INDEX IF NOT EXISTS idx_stoic_user ON stoic_reframings(user_id);
      CREATE INDEX IF NOT EXISTS idx_economic_news_date ON economic_news(date);
      CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_dashboard_share_token ON users(dashboard_share_token);
    `);

    // Database schema migrations
    await client.query(`
      ALTER TABLE achievements ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT '';
      ALTER TABLE achievements ADD COLUMN IF NOT EXISTS amount DOUBLE PRECISION DEFAULT 0.0;
      ALTER TABLE achievements ADD COLUMN IF NOT EXISTS certificate_image_path TEXT DEFAULT '';
      ALTER TABLE achievements ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
      ALTER TABLE trades ADD COLUMN IF NOT EXISTS account_id INTEGER;
      ALTER TABLE trades ADD COLUMN IF NOT EXISTS notion_link TEXT DEFAULT '';
      ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';
    `);

    await client.query('COMMIT');
    console.log('  ✅ PostgreSQL database initialized and migrated successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize PostgreSQL database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Export pool, query helper, and init function
const db = { pool, query, initDB };
export default db;
