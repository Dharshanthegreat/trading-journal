import db from './db.js';

async function runMigration() {
  console.log('🚀 Starting PostgreSQL optimization migration...');
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    console.log('🔄 Safely converting trades.entry_time and trades.exit_time from TEXT to TIMESTAMPTZ...');
    await client.query(`
      ALTER TABLE trades 
      ALTER COLUMN entry_time TYPE TIMESTAMPTZ 
      USING (CASE WHEN entry_time IS NULL OR entry_time = '' OR entry_time = 'null' THEN NULL ELSE entry_time::TIMESTAMPTZ END);
    `);

    await client.query(`
      ALTER TABLE trades 
      ALTER COLUMN exit_time TYPE TIMESTAMPTZ 
      USING (CASE WHEN exit_time IS NULL OR exit_time = '' OR exit_time = 'null' THEN NULL ELSE exit_time::TIMESTAMPTZ END);
    `);

    console.log('➕ Creating composite index on trades(user_id, entry_time DESC)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trades_user_entry_time ON trades(user_id, entry_time DESC);
    `);

    console.log('➖ Dropping redundant indexes idx_trades_user and idx_trades_entry_time...');
    await client.query(`
      DROP INDEX IF EXISTS idx_trades_user;
    `);
    await client.query(`
      DROP INDEX IF EXISTS idx_trades_entry_time;
    `);

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

runMigration();
