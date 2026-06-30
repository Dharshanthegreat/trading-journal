import pg from 'pg';
import '../server/utils/env.js';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function run() {
  try {
    const res = await pool.query("SELECT id, symbol, tags, image_path, pnl FROM trades WHERE symbol LIKE '%EURUSD%'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
