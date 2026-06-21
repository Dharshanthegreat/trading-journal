import { Router } from 'express';
import db from '../db.js';

const router = Router();

const MCP_URL = process.env.TRADINGVIEW_MCP_URL || null;

/* ─── Mock Analysis Generator ─────────────────────── */
function generateMockAnalysis(symbol, timeframe) {
  const s = symbol.toUpperCase();
  const seed = [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min, max) => {
    const x = Math.sin(seed * 9301 + 49297) % 1;
    return min + Math.abs(x) * (max - min);
  };

  let priceMin = 20, priceMax = 500, decimals = 2;
  if (s.includes('BTCUSD') || s === 'BTC') { priceMin = 58000; priceMax = 72000; }
  else if (s.includes('ETHUSD') || s === 'ETH') { priceMin = 3100; priceMax = 4200; }
  else if (s === 'ES' || s === 'MES') { priceMin = 5100; priceMax = 5600; }
  else if (s === 'NQ' || s === 'MNQ') { priceMin = 18200; priceMax = 20500; }
  else if (s === 'GC') { priceMin = 2200; priceMax = 2500; }
  else if (s === 'CL') { priceMin = 70; priceMax = 90; }
  else if (s === 'EURUSD') { priceMin = 1.05; priceMax = 1.12; decimals = 4; }
  else if (s === 'GBPUSD') { priceMin = 1.22; priceMax = 1.31; decimals = 4; }

  const price = +(rand(priceMin, priceMax)).toFixed(decimals);
  const rsi = +(rand(25, 78)).toFixed(1);
  const macdLine = +(rand(-3, 4)).toFixed(3);
  const macdSignal = +(macdLine - rand(-1, 1)).toFixed(3);
  const macdHist = +(macdLine - macdSignal).toFixed(3);
  const ema20 = +(price * rand(0.96, 1.02)).toFixed(2);
  const ema50 = +(price * rand(0.93, 1.04)).toFixed(2);
  const sma200 = +(price * rand(0.88, 1.06)).toFixed(2);
  const bbUpper = +(price * 1.04).toFixed(2);
  const bbMiddle = +(price * 1.00).toFixed(2);
  const bbLower = +(price * 0.96).toFixed(2);
  const bbWidth = +((bbUpper - bbLower) / bbMiddle * 100).toFixed(2);
  const volume = Math.floor(rand(500000, 80000000));
  const avgVolume = Math.floor(volume * rand(0.7, 1.3));

  let buySignals = 0, sellSignals = 0, neutralSignals = 0;
  if (rsi < 30) buySignals += 2; else if (rsi < 45) buySignals++; else if (rsi > 70) sellSignals += 2; else if (rsi > 55) sellSignals++; else neutralSignals++;
  if (macdHist > 0) buySignals++; else if (macdHist < 0) sellSignals++; else neutralSignals++;
  if (price > ema20) buySignals++; else sellSignals++;
  if (price > ema50) buySignals++; else sellSignals++;
  if (price > sma200) buySignals++; else sellSignals++;

  const totalSignals = buySignals + sellSignals + neutralSignals;
  let overallSignal = 'Neutral';
  if (buySignals >= 4) overallSignal = 'Strong Buy';
  else if (buySignals >= 3) overallSignal = 'Buy';
  else if (sellSignals >= 4) overallSignal = 'Strong Sell';
  else if (sellSignals >= 3) overallSignal = 'Sell';

  const support1 = +(price * 0.97).toFixed(2);
  const support2 = +(price * 0.94).toFixed(2);
  const support3 = +(price * 0.90).toFixed(2);
  const resistance1 = +(price * 1.03).toFixed(2);
  const resistance2 = +(price * 1.06).toFixed(2);
  const resistance3 = +(price * 1.10).toFixed(2);

  const trend = price > ema50 ? 'bullish' : 'bearish';
  const macdTrend = macdHist > 0 ? 'positive and expanding' : 'negative and contracting';
  const rsiZone = rsi < 30 ? 'oversold' : rsi > 70 ? 'overbought' : 'neutral';
  const insight = `**${s}** is showing **${trend} momentum** on the ${timeframe} timeframe. RSI is at **${rsi}** (${rsiZone} territory). Price is trading ${price > ema50 ? 'above' : 'below'} the 50 EMA ($${ema50}) and ${price > sma200 ? 'above' : 'below'} the 200 SMA ($${sma200}). MACD histogram is **${macdTrend}**. Key support at **$${support1}**, resistance at **$${resistance1}**.`;

  return {
    symbol: s, timeframe, price, timestamp: new Date().toISOString(), overallSignal,
    signalCounts: { buy: buySignals, sell: sellSignals, neutral: neutralSignals, total: totalSignals },
    indicators: {
      rsi: { value: rsi, signal: rsi < 30 ? 'Buy' : rsi > 70 ? 'Sell' : 'Neutral' },
      macd: { line: macdLine, signal: macdSignal, histogram: macdHist, signal_type: macdHist > 0 ? 'Buy' : 'Sell' },
      ema20: { value: ema20, signal: price > ema20 ? 'Buy' : 'Sell' },
      ema50: { value: ema50, signal: price > ema50 ? 'Buy' : 'Sell' },
      sma200: { value: sma200, signal: price > sma200 ? 'Buy' : 'Sell' },
      bollingerBands: { upper: bbUpper, middle: bbMiddle, lower: bbLower, width: bbWidth, squeeze: bbWidth < 3, signal: price > bbUpper ? 'Sell' : price < bbLower ? 'Buy' : 'Neutral' },
      volume: { current: volume, average: avgVolume, ratio: +(volume / avgVolume).toFixed(2) },
    },
    supportResistance: {
      support: [
        { level: support1, strength: 'Strong', label: 'S1' },
        { level: support2, strength: 'Medium', label: 'S2' },
        { level: support3, strength: 'Weak', label: 'S3' },
      ],
      resistance: [
        { level: resistance1, strength: 'Strong', label: 'R1' },
        { level: resistance2, strength: 'Medium', label: 'R2' },
        { level: resistance3, strength: 'Weak', label: 'R3' },
      ],
    },
    insight, mode: 'mock',
  };
}

/* ─── POST /analyze ───────────────────────────────── */
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, timeframe = '1D', indicators = [] } = req.body;
    if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

    if (MCP_URL) {
      try {
        const mcpPayload = {
          jsonrpc: '2.0', method: 'tools/call',
          params: { name: 'get_technical_analysis', arguments: { symbol: symbol.toUpperCase(), timeframe, indicators } },
          id: Date.now(),
        };
        const mcpRes = await fetch(MCP_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mcpPayload), signal: AbortSignal.timeout(15000),
        });
        if (!mcpRes.ok) throw new Error(`MCP server returned ${mcpRes.status}`);
        const mcpData = await mcpRes.json();
        if (mcpData.error) throw new Error(mcpData.error.message || 'MCP error');
        const content = mcpData.result?.content?.[0]?.text;
        if (content) {
          const parsed = JSON.parse(content);
          return res.json({ ...parsed, mode: 'live' });
        }
        throw new Error('No content in MCP response');
      } catch (mcpErr) {
        console.warn('MCP server error, falling back to mock:', mcpErr.message);
      }
    }

    const analysis = generateMockAnalysis(symbol, timeframe);
    res.json(analysis);
  } catch (err) {
    console.error('TradingView analyze error:', err);
    res.status(500).json({ error: 'Failed to analyze symbol' });
  }
});

/* ─── GET /symbols ────────────────────────────────── */
router.get('/symbols', async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      'SELECT DISTINCT UPPER(symbol) as symbol FROM trades WHERE user_id = $1 AND symbol IS NOT NULL',
      [userId]
    );
    const tradeSymbols = result.rows.map(r => r.symbol).filter(Boolean);

    const popular = [
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD',
      'SPY', 'QQQ', 'IWM', 'DIA',
      'BTCUSD', 'ETHUSD', 'SOLUSD',
      'EURUSD', 'GBPUSD', 'USDJPY',
      'ES', 'NQ', 'GC', 'CL',
    ];

    const allSymbols = [...new Set([...tradeSymbols, ...popular])];

    res.json({
      userSymbols: tradeSymbols,
      popular,
      all: allSymbols,
    });
  } catch (err) {
    console.error('Symbols fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch symbols' });
  }
});

/* ─── GET /status ─────────────────────────────────── */
router.get('/status', async (req, res) => {
  if (!MCP_URL) {
    return res.json({ status: 'mock', message: 'Running in demo mode (no MCP server configured)' });
  }
  try {
    const healthRes = await fetch(MCP_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'ping', id: 0 }),
      signal: AbortSignal.timeout(5000),
    });
    if (healthRes.ok) return res.json({ status: 'connected', message: 'MCP server is online' });
    throw new Error(`Status ${healthRes.status}`);
  } catch {
    res.json({ status: 'offline', message: 'MCP server is unreachable' });
  }
});

export default router;
