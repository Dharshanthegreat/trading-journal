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

    // Prepare upsert statement
    const upsertStmt = db.prepare(`
      INSERT INTO economic_news (id, title, country, date, impact, forecast, previous, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        forecast = excluded.forecast,
        previous = excluded.previous,
        impact = excluded.impact,
        updated_at = datetime('now')
    `);

    // Execute in a transaction for performance and consistency
    const runSync = db.transaction((eventList) => {
      let count = 0;
      for (const e of eventList) {
        // Generate a stable composite ID
        const id = `${e.title}_${e.date}_${e.country}`.trim();
        upsertStmt.run(
          id,
          e.title || 'Untitled Event',
          e.country || '',
          e.date || '',
          e.impact || 'Low',
          e.forecast || '',
          e.previous || ''
        );
        count++;
      }
      return count;
    });

    const synchronizedCount = runSync(events);
    console.log(`[News Agent] Successfully synchronized ${synchronizedCount} economic news events to SQLite.`);
    return synchronizedCount;
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
