/**
 * Shared analytics computation utility.
 * Eliminates duplication across trades.js, ai.js, and public dashboard routes.
 */

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compute full analytics from an array of trade objects.
 * @param {Array} trades - Array of trade DB records
 * @returns {Object} Complete analytics object
 */
export function computeAnalytics(trades) {
  if (!trades || trades.length === 0) {
    return { empty: true };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
  const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const winRate = (wins.length / trades.length * 100).toFixed(1);
  const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '0';
  const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
  const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

  // Equity curve
  let running = 0;
  const equityCurve = trades.map(t => {
    running += t.pnl;
    return { date: t.entry_time, equity: parseFloat(running.toFixed(2)) };
  });

  // Max drawdown
  let peak = 0, maxDrawdown = 0;
  running = 0;
  trades.forEach(t => {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  // By symbol
  const symbolMap = {};
  trades.forEach(t => {
    if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, count: 0, wins: 0 };
    symbolMap[t.symbol].pnl += t.pnl;
    symbolMap[t.symbol].count++;
    if (t.pnl > 0) symbolMap[t.symbol].wins++;
  });

  // By setup
  const setupMap = {};
  trades.forEach(t => {
    const s = t.setup || 'Untagged';
    if (!setupMap[s]) setupMap[s] = { pnl: 0, count: 0, wins: 0 };
    setupMap[s].pnl += t.pnl;
    setupMap[s].count++;
    if (t.pnl > 0) setupMap[s].wins++;
  });

  // By day of week
  const dowMap = {};
  trades.forEach(t => {
    const d = DAY_NAMES[new Date(t.entry_time).getDay()];
    if (!dowMap[d]) dowMap[d] = { pnl: 0, count: 0 };
    dowMap[d].pnl += t.pnl;
    dowMap[d].count++;
  });

  // By hour
  const hourMap = {};
  trades.forEach(t => {
    const h = new Date(t.entry_time).getHours();
    if (!hourMap[h]) hourMap[h] = { pnl: 0, count: 0 };
    hourMap[h].pnl += t.pnl;
    hourMap[h].count++;
  });

  // Monthly P&L
  const monthMap = {};
  trades.forEach(t => {
    const d = new Date(t.entry_time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) monthMap[key] = 0;
    monthMap[key] += t.pnl;
  });

  // Daily P&L (for calendar)
  const dailyMap = {};
  trades.forEach(t => {
    const d = t.entry_time ? new Date(t.entry_time).toLocaleDateString('sv-SE', { timeZone: 'America/New_York' }) : null;
    if (d) {
      if (!dailyMap[d]) dailyMap[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
      dailyMap[d].pnl += t.pnl;
      dailyMap[d].count++;
      if (t.pnl > 0) dailyMap[d].wins++;
      else if (t.pnl < 0) dailyMap[d].losses++;
    }
  });

  // Streaks
  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
  let streakType = null;
  trades.forEach(t => {
    const isWin = t.pnl > 0;
    if (streakType === null) {
      streakType = isWin;
      currentStreak = 1;
    } else if (isWin === streakType) {
      currentStreak++;
    } else {
      streakType = isWin;
      currentStreak = 1;
    }
    if (isWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
    if (!isWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
  });

  // Best and worst trade
  const bestTrade = trades.reduce((best, t) => t.pnl > best.pnl ? t : best, trades[0]);
  const worstTrade = trades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, trades[0]);

  return {
    summary: {
      totalTrades: trades.length,
      totalPnL: parseFloat(totalPnL.toFixed(2)),
      winRate: parseFloat(winRate),
      profitFactor: parseFloat(profitFactor) || 0,
      avgWin: parseFloat(avgWin),
      avgLoss: parseFloat(avgLoss),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      wins: wins.length,
      losses: losses.length,
      maxWinStreak,
      maxLossStreak,
      bestTrade,
      worstTrade,
    },
    equityCurve,
    bySymbol: Object.entries(symbolMap).map(([sym, v]) => ({
      symbol: sym,
      pnl: parseFloat(v.pnl.toFixed(2)),
      count: v.count,
      winRate: parseFloat((v.wins / v.count * 100).toFixed(1)),
    })).sort((a, b) => b.pnl - a.pnl),
    bySetup: Object.entries(setupMap).map(([s, v]) => ({
      setup: s,
      pnl: parseFloat(v.pnl.toFixed(2)),
      count: v.count,
      winRate: parseFloat((v.wins / v.count * 100).toFixed(1)),
    })).sort((a, b) => b.pnl - a.pnl),
    byDow: DAY_NAMES.map(d => ({
      day: d,
      pnl: parseFloat((dowMap[d]?.pnl || 0).toFixed(2)),
      count: dowMap[d]?.count || 0,
    })),
    byHour: Object.entries(hourMap).map(([h, v]) => ({
      hour: parseInt(h),
      pnl: parseFloat(v.pnl.toFixed(2)),
      count: v.count,
    })).sort((a, b) => a.hour - b.hour),
    monthly: Object.entries(monthMap).map(([m, p]) => ({
      month: m,
      pnl: parseFloat(p.toFixed(2)),
    })).sort((a, b) => a.month.localeCompare(b.month)),
    daily: dailyMap,
  };
}

/**
 * Compute quick metrics summary for AI coaching context.
 * @param {Array} trades - Array of trade DB records
 * @returns {Object} Metrics object used for AI system prompt
 */
export function computeMetrics(trades) {
  if (!trades || !trades.length) {
    return {
      tradeCount: 0,
      winRate: '0',
      totalPnL: 0,
      profitFactor: '0',
      avgWin: '0',
      avgLoss: '0',
      avgFomo: '5.0',
      avgConfidence: '5.0',
      highFomoCount: 0,
      bestSetup: 'None',
    };
  }

  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
  const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
  const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
  const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '1.0';
  const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
  const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

  const setups = {};
  let fomoSum = 0, confSum = 0, highFomoCount = 0;

  trades.forEach(t => {
    const s = t.setup || 'Untagged';
    if (!setups[s]) setups[s] = { pnl: 0, count: 0 };
    setups[s].pnl += t.pnl;
    setups[s].count++;
    fomoSum += t.fomo_level || 5;
    confSum += t.confidence_level || 5;
    if ((t.fomo_level || 5) > 6) highFomoCount++;
  });

  const tradeCount = trades.length;
  const avgFomo = tradeCount ? (fomoSum / tradeCount).toFixed(1) : '5.0';
  const avgConfidence = tradeCount ? (confSum / tradeCount).toFixed(1) : '5.0';

  let bestSetup = 'None';
  let bestPnL = -Infinity;
  Object.entries(setups).forEach(([name, data]) => {
    if (data.pnl > bestPnL) {
      bestPnL = data.pnl;
      bestSetup = name;
    }
  });

  return {
    tradeCount,
    wins: wins.length,
    losses: losses.length,
    winRate,
    totalPnL,
    profitFactor,
    avgWin,
    avgLoss,
    avgFomo,
    avgConfidence,
    highFomoCount,
    bestSetup,
    bestPnL,
  };
}
