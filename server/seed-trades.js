import db from './db.js';

async function seed() {
  // Find user test@example.com
  const userResult = await db.query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
  if (userResult.rows.length === 0) {
    console.error('User test@example.com not found. Please log in/register first.');
    process.exit(1);
  }

  const userId = userResult.rows[0].id;
  console.log(`Found user test@example.com with ID: ${userId}`);

  // Check if user has accounts
  let accountResult = await db.query('SELECT id, status FROM accounts WHERE user_id = $1', [userId]);
  if (accountResult.rows.length === 0) {
    console.log('No accounts found for user. Creating default accounts (Active, Passed, Failed)...');
    
    // Create Active account
    await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, 'Apex Challenge Account', 'Challenge', 50000.0, 'USD', 'Active']);

    // Create Passed account
    await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, '50K Evaluation Challenge', 'Prop Challenge', 50000.0, 'USD', 'Passed']);

    // Create Failed account
    await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, '10K Micro Live Build', 'Live', 10000.0, 'USD', 'Failed']);

    accountResult = await db.query('SELECT id, status FROM accounts WHERE user_id = $1', [userId]);
  }
  
  const activeAccount = accountResult.rows.find(r => r.status === 'Active') || accountResult.rows[0];
  const passedAccount = accountResult.rows.find(r => r.status === 'Passed') || accountResult.rows[0];
  const failedAccount = accountResult.rows.find(r => r.status === 'Failed') || accountResult.rows[0];
  
  console.log(`Using active account ID: ${activeAccount.id}, passed: ${passedAccount.id}, failed: ${failedAccount.id}`);

  // Clear existing trades to start fresh
  await db.query('DELETE FROM trades WHERE user_id = $1', [userId]);
  console.log('Cleared existing trades for test@example.com');

  // Define random generators
  const symbols = ['NQ', 'ES', 'YM', 'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'BTCUSD', 'EURUSD'];
  const setups = ['Bull Flag', 'Double Bottom', 'Support Bounce', 'VWAP Reclaim', 'EMA Cross', 'Breakout', 'Mean Reversion'];
  const emotions = ['disciplined', 'anxious', 'patient', 'fearful', 'confident', 'greedy', 'calm'];
  const tags = ['Apex', 'Trend', 'Counter-trend', 'Scalp', 'Daytrade', 'Swing'];

  const generateRandomTime = (date, hourMin, hourMax) => {
    const hour = Math.floor(Math.random() * (hourMax - hourMin + 1)) + hourMin;
    const minute = Math.floor(Math.random() * 60);
    const second = Math.floor(Math.random() * 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
  };

  const now = new Date();
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 45);
      const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const type = Math.random() > 0.4 ? 'Long' : 'Short';
      
      let entryPrice = 100 + Math.random() * 500;
      if (symbol === 'BTCUSD') entryPrice = 60000 + Math.random() * 10000;
      if (symbol === 'EURUSD') entryPrice = 1.05 + Math.random() * 0.05;
      if (symbol === 'NQ') entryPrice = 18000 + Math.random() * 1000;
      if (symbol === 'ES') entryPrice = 5000 + Math.random() * 200;

      // Distribute trades across accounts:
      // Active account: 50% chance, random win/loss
      // Passed account: 30% chance, high win rate (75% win rate)
      // Failed account: 20% chance, low win rate (25% win rate)
      let targetAccountId = activeAccount.id;
      let win = Math.random() > 0.45;

      const roll = Math.random();
      if (roll < 0.5) {
        targetAccountId = activeAccount.id;
        win = Math.random() > 0.45;
      } else if (roll < 0.8) {
        targetAccountId = passedAccount.id;
        win = Math.random() > 0.25; // 75% win rate
      } else {
        targetAccountId = failedAccount.id;
        win = Math.random() > 0.75; // 25% win rate
      }

      const percentChange = (0.1 + Math.random() * 1.5) / 100;
      let exitPrice;
      if (type === 'Long') {
        exitPrice = win ? entryPrice * (1 + percentChange) : entryPrice * (1 - percentChange);
      } else {
        exitPrice = win ? entryPrice * (1 - percentChange) : entryPrice * (1 + percentChange);
      }

      const lotSize = symbol.includes('USD') ? 10000 : (symbol === 'NQ' || symbol === 'ES' || symbol === 'YM' ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 100) + 10);
      
      let pnl = 0;
      if (symbol === 'NQ') pnl = (exitPrice - entryPrice) * lotSize * 20 * (type === 'Long' ? 1 : -1);
      else if (symbol === 'ES') pnl = (exitPrice - entryPrice) * lotSize * 50 * (type === 'Long' ? 1 : -1);
      else if (symbol === 'YM') pnl = (exitPrice - entryPrice) * lotSize * 5 * (type === 'Long' ? 1 : -1);
      else pnl = (exitPrice - entryPrice) * lotSize * (type === 'Long' ? 1 : -1);
      pnl = Math.round(pnl * 100) / 100;

      const entryTime = generateRandomTime(dateStr, 9, 11);
      const exitTime = generateRandomTime(dateStr, 11, 15);
      const setup = setups[Math.floor(Math.random() * setups.length)];
      const grade = win ? (Math.random() > 0.5 ? 'A' : 'B') : (Math.random() > 0.4 ? 'C' : 'D');
      const notes = win ? `Nice execution on the ${setup}. Took profit at target.` : `Stop hit. Market reversed on the ${setup}. Need to watch support.`;
      const tradeTags = [tags[Math.floor(Math.random() * tags.length)]];
      const emotionTags = [emotions[Math.floor(Math.random() * emotions.length)]];

      await client.query(`
        INSERT INTO trades (
          user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
          pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
          fomo_level, confidence_level, account_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      `, [
        userId, symbol, type, entryPrice, exitPrice, lotSize,
        type === 'Long' ? entryPrice * 0.99 : entryPrice * 1.01,
        type === 'Long' ? entryPrice * 1.02 : entryPrice * 0.98,
        pnl, entryTime, exitTime, setup, grade, notes,
        JSON.stringify(tradeTags), JSON.stringify(emotionTags),
        Math.floor(Math.random() * 5) + 1,
        Math.floor(Math.random() * 5) + 1,
        targetAccountId
      ]);
    }

    await client.query('COMMIT');
    console.log('Successfully inserted 100 random premium trades!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
  } finally {
    client.release();
    await db.pool.end();
  }
}

// Initialize DB first, then seed
db.initDB().then(() => seed()).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
