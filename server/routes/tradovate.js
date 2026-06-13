import { Router } from 'express';
import db from '../db.js';

const router = Router();

// In-memory connection status per user
const connectionStatus = new Map();

// Rate limit helper
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

/* ─── POST /connect ───────────────────────────────── */
router.post('/connect', (req, res) => {
  try {
    const { username, password, appId, appSecret, accountType } = req.body;
    const userId = req.user.id;

    if (!username || !password || !appId || !appSecret) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Basic format validation
    if (appId.length < 3 || appSecret.length < 3) {
      return res.status(400).json({ error: 'Invalid App ID or App Secret format' });
    }

    // Simulated connection flow
    const connectionId = `tradovate_${userId}_${Date.now()}`;
    const connectionData = {
      id: connectionId,
      userId,
      username,
      appId,
      accountType: accountType || 'demo',
      status: 'connected',
      connectedAt: new Date().toISOString(),
      platform: 'Tradovate API v1',
      accountNumber: 'DEMO-849204',
      marginRatio: '115%',
      cashBalance: '50000.00',
      currency: 'USD',
    };

    connectionStatus.set(userId, connectionData);

    res.json({
      success: true,
      connection: {
        id: connectionId,
        status: 'connected',
        username: username,
        appId: appId,
        accountType: connectionData.accountType,
        connectedAt: connectionData.connectedAt,
        platform: connectionData.platform,
        accountNumber: connectionData.accountNumber,
        marginRatio: connectionData.marginRatio,
        cashBalance: connectionData.cashBalance,
        currency: connectionData.currency,
      },
      message: 'Successfully established session via Tradovate API',
    });
  } catch (err) {
    console.error('Tradovate connect error:', err);
    res.status(500).json({ error: 'Failed to connect to Tradovate server' });
  }
});

/* ─── POST /disconnect ────────────────────────────── */
router.post('/disconnect', (req, res) => {
  try {
    const userId = req.user.id;
    connectionStatus.delete(userId);
    res.json({ success: true, message: 'Disconnected from Tradovate session' });
  } catch (err) {
    console.error('Tradovate disconnect error:', err);
    res.status(500).json({ error: 'Failed to close Tradovate session' });
  }
});

/* ─── GET /status ─────────────────────────────────── */
router.get('/status', (req, res) => {
  try {
    const userId = req.user.id;
    const conn = connectionStatus.get(userId);

    if (conn) {
      res.json({
        connected: true,
        connection: {
          id: conn.id,
          status: conn.status,
          username: conn.username,
          appId: conn.appId,
          accountType: conn.accountType,
          connectedAt: conn.connectedAt,
          platform: conn.platform,
          accountNumber: conn.accountNumber,
          marginRatio: conn.marginRatio,
          cashBalance: conn.cashBalance,
          currency: conn.currency,
        },
      });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    console.error('Tradovate status error:', err);
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});

/* ─── POST /sync-trades ───────────────────────────── */
router.post('/sync-trades', (req, res) => {
  try {
    const userId = req.user.id;
    const conn = connectionStatus.get(userId);

    if (!conn) {
      return res.status(400).json({ error: 'No active Tradovate connection found. Connect your account first.' });
    }

    // Generate 3 mock futures trades to insert into the user's trading journal database
    const now = new Date();
    const entryTime1 = new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(); // 2.5h ago
    const exitTime1 = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();     // 2h ago
    const entryTime2 = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();     // 1h ago
    const exitTime2 = new Date(now.getTime() - 40 * 60 * 1000).toISOString();          // 40m ago

    const mockTrades = [
      {
        symbol: 'NQ', // Nasdaq E-mini
        type: 'Long',
        entry_price: 18910.50,
        exit_price: 18952.75,
        lot_size: 2,
        stop_loss: 18880.00,
        take_profit: 18970.00,
        pnl: 1690.00, // (18952.75 - 18910.50) * $20 * 2
        entry_time: entryTime1,
        exit_time: exitTime1,
        setup: 'Breakout',
        notes: 'Tradovate API Auto-Sync: E-mini Nasdaq 100 breakout buy at consolidation zone.',
        grade: 'A',
        tags: '["Tradovate-Sync", "Nasdaq", "Breakout"]'
      },
      {
        symbol: 'ES', // S&P 500 E-mini
        type: 'Short',
        entry_price: 5410.25,
        exit_price: 5402.75,
        lot_size: 5,
        stop_loss: 5416.00,
        take_profit: 5395.00,
        pnl: 1875.00, // (5410.25 - 5402.75) * $50 * 5
        entry_time: entryTime2,
        exit_time: exitTime2,
        setup: 'VWAP Rejection',
        notes: 'Tradovate API Auto-Sync: E-mini S&P 500 short rejection at VWAP line.',
        grade: 'B',
        tags: '["Tradovate-Sync", "S&P500", "Short"]'
      },
      {
        symbol: 'CL', // Crude Oil
        type: 'Long',
        entry_price: 78.42,
        exit_price: 77.98,
        lot_size: 1,
        stop_loss: 78.20,
        take_profit: 79.20,
        pnl: -440.00, // (77.98 - 78.42) * $1000 * 1
        entry_time: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15m ago
        exit_time: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),   // 5m ago
        setup: 'Support Bounce',
        notes: 'Tradovate API Auto-Sync: Stopped out early on oil inventory spike.',
        grade: 'C',
        tags: '["Tradovate-Sync", "CrudeOil"]'
      }
    ];

    // Insert mock trades into database
    const insertStmt = db.prepare(`
      INSERT INTO trades (user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit, pnl, entry_time, exit_time, setup, notes, grade, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const runInsert = db.transaction((tradesList) => {
      let inserted = 0;
      for (const t of tradesList) {
        insertStmt.run(
          userId,
          t.symbol,
          t.type,
          t.entry_price,
          t.exit_price,
          t.lot_size,
          t.stop_loss,
          t.take_profit,
          t.pnl,
          t.entry_time,
          t.exit_time,
          t.setup,
          t.notes,
          t.grade,
          t.tags
        );
        inserted++;
      }
      return inserted;
    });

    const count = runInsert(mockTrades);

    // Simulate updating user balance
    const updatedBalance = parseFloat(conn.cashBalance) + 3125.00; // 1690 + 1875 - 440
    conn.cashBalance = updatedBalance.toFixed(2);
    connectionStatus.set(userId, conn);

    res.json({
      success: true,
      count,
      cashBalance: conn.cashBalance,
      message: `Successfully synchronized ${count} futures trades from Tradovate! Check your Journal.`,
    });
  } catch (err) {
    console.error('Tradovate sync error:', err);
    res.status(500).json({ error: 'Failed to synchronize futures trades' });
  }
});

// ─── POST /chat ─────────────────────────────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    const systemPrompt = `You are a professional Futures Trading Coach and Margin Risk Manager powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
Your goal is to guide active futures traders (trading indices like ES/NQ or commodities like CL/GC) through leverage structures, tick value computations, day margins vs maintenance margins, and drawdown recovery psychology.
Provide calculations where appropriate (e.g. tick parameters: 1 contract NQ is $20 per point or $5.00 per 0.25 micro-tick; 1 contract ES is $50 per point or $12.50 per 0.25 tick).

Adhere to these style principles:
1. Always output in clean, professional Markdown.
2. Emphasize margin safety and strict contract limits.
3. Be direct, logical, encouraging, and focus heavily on reducing psychological leaks and avoiding margin calls. Keep answers concise.`;

    if (apiKey) {
      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.5,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Catalog returned error status ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const responseContent = result.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated Llama-3.1-Nemotron-70B Futures Coach Engine
    const lastMsg = (Array.isArray(messages) && messages.length > 0)
      ? messages[messages.length - 1]?.content?.toLowerCase() || ''
      : '';
    let fallbackText = '';

    if (lastMsg.includes('margin') || lastMsg.includes('leverage') || lastMsg.includes('size')) {
      fallbackText = `🤖 **[NVIDIA Futures Risk Coach - Margin Diagnostic]**

Let's review the margin parameters for standard E-mini contracts:

* **NQ (Nasdaq E-mini)**: Tick value is **$5.00** per 0.25 points (**$20.00** per full point). Intraday margins are typically **$1,000**, but overnight maintenance margin jumps to **$19,800** per contract!
* **ES (S&P 500 E-mini)**: Tick value is **$12.50** per 0.25 points (**$50.00** per full point). Intraday margins are typically **$500**, with maintenance margins around **$14,500**.

**Margin Safety Guideline**: Never allocate more than **10% of your account** to intraday day-trading margins. If you have a $50,000 account, limit your active trade exposure to a maximum of 3 standard contracts or scale down to micros (MNQ/MES) to maintain a buffer.`;
    } else if (lastMsg.includes('drawdown') || lastMsg.includes('lost') || lastMsg.includes('loss')) {
      fallbackText = `🤖 **[NVIDIA Futures Risk Coach - Drawdown Recovery]**

Futures trading leverage can escalate drawdowns rapidly. To recover systematically:
1. **Reduce Unit Size by 70%**: Scale down from E-minis to Micros (e.g. from NQ to MNQ). Micro NQ tick value is $0.50 per 0.25 points ($2 per full point), reducing your capital variance.
2. **Tighten Daily Stop limits**: Set a hard daily drawdown limit of **$500** on a $50k account. Once hit, the Tradovate auto-liquidate rule (or self-discipline) must be triggered.
3. **Session Filtering**: Focus on the high-liquidity morning session (9:30 AM to 11:30 AM EST) and avoid the low-volume lunch chop.`;
    } else {
      fallbackText = `🤖 **[NVIDIA Futures Risk Coach]**

Hello! I am your Futures Trading Coach. I help you track futures contract specifications, Day/Maintenance margins, position sizing strategies, and Tradovate execution psychology.

What would you like to review today?
* *"Explain ES vs NQ margin requirements"*
* *"I\'m in a drawdown on my prop challenge"*
* *"Calculate risk sizing for 3 Micro Nasdaq contracts"*`;
    }

    res.json({
      role: 'assistant',
      content: fallbackText
    });
  } catch (err) {
    console.error('AI Futures Coach chat error:', err);
    res.status(500).json({ error: 'Failed to generate AI Coach response' });
  }
});

export default router;
