import db from './db.js';

// Find user test@example.com
const user = db.prepare('SELECT id FROM users WHERE email = ?').get('test@example.com');
if (!user) {
  console.error('User test@example.com not found. Please log in/register first.');
  process.exit(1);
}

const userId = user.id;
console.log(`Found user test@example.com with ID: ${userId}`);

// Check if user has an account
let account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId);
if (!account) {
  // Create a default account
  console.log('No account found for user. Creating a default "Apex Challenge" account...');
  db.prepare(`
    INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, 'Apex Challenge Account', 'Challenge', 50000.0, 'USD', 'Active');
  account = db.prepare('SELECT id FROM accounts WHERE user_id = ?').get(userId);
}
const accountId = account.id;
console.log(`Using account ID: ${accountId}`);

// Clear existing trades to start fresh
db.prepare('DELETE FROM trades WHERE user_id = ?').run(userId);
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

// We want to spread 100 trades across the last 45 days.
const tradesToInsert = [];
const now = new Date();

for (let i = 0; i < 100; i++) {
  const daysAgo = Math.floor(Math.random() * 45); // last 45 days
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const dateStr = date.toISOString().split('T')[0];

  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  const type = Math.random() > 0.4 ? 'Long' : 'Short';
  
  // Sane entry prices
  let entryPrice = 100 + Math.random() * 500;
  if (symbol === 'BTCUSD') entryPrice = 60000 + Math.random() * 10000;
  if (symbol === 'EURUSD') entryPrice = 1.05 + Math.random() * 0.05;
  if (symbol === 'NQ') entryPrice = 18000 + Math.random() * 1000;
  if (symbol === 'ES') entryPrice = 5000 + Math.random() * 200;

  // Compute profit/loss
  const win = Math.random() > 0.45; // 55% win rate
  const percentChange = (0.1 + Math.random() * 1.5) / 100; // 0.1% to 1.6% change
  let exitPrice;
  if (type === 'Long') {
    exitPrice = win ? entryPrice * (1 + percentChange) : entryPrice * (1 - percentChange);
  } else {
    exitPrice = win ? entryPrice * (1 - percentChange) : entryPrice * (1 + percentChange);
  }

  const lotSize = symbol.includes('USD') ? 10000 : (symbol === 'NQ' || symbol === 'ES' || symbol === 'YM' ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 100) + 10);
  
  // Compute P&L
  let pnl = 0;
  if (symbol === 'NQ') {
    pnl = (exitPrice - entryPrice) * lotSize * 20 * (type === 'Long' ? 1 : -1);
  } else if (symbol === 'ES') {
    pnl = (exitPrice - entryPrice) * lotSize * 50 * (type === 'Long' ? 1 : -1);
  } else if (symbol === 'YM') {
    pnl = (exitPrice - entryPrice) * lotSize * 5 * (type === 'Long' ? 1 : -1);
  } else {
    pnl = (exitPrice - entryPrice) * lotSize * (type === 'Long' ? 1 : -1);
  }

  pnl = Math.round(pnl * 100) / 100;

  const entryTime = generateRandomTime(dateStr, 9, 11);
  const exitTime = generateRandomTime(dateStr, 11, 15);

  const setup = setups[Math.floor(Math.random() * setups.length)];
  const grade = win ? (Math.random() > 0.5 ? 'A' : 'B') : (Math.random() > 0.4 ? 'C' : 'D');
  const notes = win ? `Nice execution on the ${setup}. Took profit at target.` : `Stop hit. Market reversed on the ${setup}. Need to watch support.`;
  
  const tradeTags = [tags[Math.floor(Math.random() * tags.length)]];
  const emotionTags = [emotions[Math.floor(Math.random() * emotions.length)]];

  tradesToInsert.push({
    user_id: userId,
    symbol,
    type,
    entry_price: entryPrice,
    exit_price: exitPrice,
    lot_size: lotSize,
    stop_loss: type === 'Long' ? entryPrice * 0.99 : entryPrice * 1.01,
    take_profit: type === 'Long' ? entryPrice * 1.02 : entryPrice * 0.98,
    pnl,
    entry_time: entryTime,
    exit_time: exitTime,
    setup,
    grade,
    notes,
    tags: JSON.stringify(tradeTags),
    emotion_tags: JSON.stringify(emotionTags),
    fomo_level: Math.floor(Math.random() * 5) + 1,
    confidence_level: Math.floor(Math.random() * 5) + 1,
    account_id: accountId
  });
}

// Insert in transaction
const insertTrade = db.prepare(`
  INSERT INTO trades (
    user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
    pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
    fomo_level, confidence_level, account_id
  ) VALUES (
    @user_id, @symbol, @type, @entry_price, @exit_price, @lot_size, @stop_loss, @take_profit,
    @pnl, @entry_time, @exit_time, @setup, @grade, @notes, @tags, @emotion_tags,
    @fomo_level, @confidence_level, @account_id
  )
`);

const insertMany = db.transaction((trades) => {
  for (const trade of trades) insertTrade.run(trade);
});

insertMany(tradesToInsert);
console.log('Successfully inserted 100 random premium trades!');
db.close();
