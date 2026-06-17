import db from '../db.js';

// Synchronize news data from Forex Factory
export async function syncNewsData() {
  console.log('[News Agent] Beginning economic news synchronization...');
  try {
    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (!response.ok) {
      throw new Error(`Forex Factory CDN returned status code ${response.status}`);
    }

    const events = await response.json();
    if (!Array.isArray(events)) {
      throw new Error('Invalid calendar payload (not an array)');
    }

    // Execute in a transaction for performance and consistency
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      let count = 0;
      for (const e of events) {
        // Generate a stable composite ID
        const id = `${e.title}_${e.date}_${e.country}`.trim();
        await client.query(`
          INSERT INTO economic_news (id, title, country, date, impact, forecast, previous, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT(id) DO UPDATE SET
            forecast = EXCLUDED.forecast,
            previous = EXCLUDED.previous,
            impact = EXCLUDED.impact,
            updated_at = NOW()
        `, [
          id,
          e.title || 'Untitled Event',
          e.country || '',
          e.date || '',
          e.impact || 'Low',
          e.forecast || '',
          e.previous || ''
        ]);
        count++;
      }

      await client.query('COMMIT');
      console.log(`[News Agent] Successfully synchronized ${count} economic news events to PostgreSQL.`);
      return count;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[News Agent] Synchronization failed:', err);
    throw err;
  }
}

// Start the background interval agent
export function startNewsAgent() {
  // 1. Run sync immediately on server boot
  // Wrapped in setTimeout to prevent blocking startup thread
  setTimeout(() => {
    syncNewsData().catch(() => {});
  }, 1000);

  // 2. Set interval to synchronize every 30 minutes
  const INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    syncNewsData().catch(() => {});
  }, INTERVAL_MS);

  console.log('[News Agent] Background synchronization worker successfully initialized (polling every 30 mins).');
}
