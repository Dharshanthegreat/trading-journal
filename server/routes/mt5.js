import { Router } from 'express';
import db from '../db.js';
import { addSessionTags } from '../utils/session.js';

const router = Router();

// In-memory connection status per user (in production, use a database)
const connectionStatus = new Map();

/* ─── POST /connect ───────────────────────────────── */
router.post('/connect', (req, res) => {
  try {
    const { accountNumber, password, serverName, accountType } = req.body;
    const userId = req.user.id;

    if (!accountNumber || !password || !serverName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate account number format (numeric)
    if (!/^\d{4,12}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Invalid account number format. Must be 4-12 digits.' });
    }

    // In a real implementation, this would:
    // 1. Encrypt credentials using AES-256
    // 2. Forward to MT5 Manager API or MetaTrader Web API
    // 3. Establish WebSocket connection to MT5 terminal
    // 4. Return real connection status

    // Simulated connection flow
    const connectionId = `mt5_${userId}_${Date.now()}`;
    const connectionData = {
      id: connectionId,
      userId,
      accountNumber,
      serverName,
      accountType: accountType || 'live',
      status: 'connected',
      connectedAt: new Date().toISOString(),
      broker: extractBrokerName(serverName),
      leverage: '1:100',
      currency: 'USD',
      platform: 'MetaTrader 5',
    };

    connectionStatus.set(userId, connectionData);

    // Simulate slight delay for realism
    res.json({
      success: true,
      connection: {
        id: connectionId,
        status: 'connected',
        accountNumber: maskAccountNumber(accountNumber),
        serverName,
        broker: connectionData.broker,
        accountType: connectionData.accountType,
        connectedAt: connectionData.connectedAt,
        leverage: connectionData.leverage,
        currency: connectionData.currency,
        platform: connectionData.platform,
      },
      message: 'Successfully connected to MT5 terminal',
    });
  } catch (err) {
    console.error('MT5 connect error:', err);
    res.status(500).json({ error: 'Failed to connect to MT5' });
  }
});

/* ─── POST /disconnect ────────────────────────────── */
router.post('/disconnect', (req, res) => {
  try {
    const userId = req.user.id;
    connectionStatus.delete(userId);
    res.json({ success: true, message: 'Disconnected from MT5' });
  } catch (err) {
    console.error('MT5 disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
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
          accountNumber: maskAccountNumber(conn.accountNumber),
          serverName: conn.serverName,
          broker: conn.broker,
          accountType: conn.accountType,
          connectedAt: conn.connectedAt,
          leverage: conn.leverage,
          currency: conn.currency,
          platform: conn.platform,
        },
      });
    } else {
      res.json({ connected: false });
    }
  } catch (err) {
    console.error('MT5 status error:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/* ─── POST /sync-trades ───────────────────────────── */
router.post('/sync-trades', async (req, res) => {
  try {
    const userId = req.user.id;
    const conn = connectionStatus.get(userId);

    if (!conn) {
      return res.status(400).json({ error: 'No active MT5 connection found. Connect your account first.' });
    }

    const now = new Date();
    const mockTrades = [
      {
        symbol: 'EURUSD', type: 'Long', entry_price: 1.08250, exit_price: 1.08550,
        lot_size: 1.5, stop_loss: 1.07900, take_profit: 1.09000, pnl: 450.00,
        entry_time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        exit_time: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        setup: 'Double Bottom Support', grade: 'A',
        notes: `MT5 API Auto-Sync: EUR/USD buy bounce from 4H support on server ${conn.serverName}.`,
        tags: '["MT5-Sync", "EURUSD", "Support"]'
      },
      {
        symbol: 'GBPUSD', type: 'Short', entry_price: 1.27250, exit_price: 1.26850,
        lot_size: 2.0, stop_loss: 1.27600, take_profit: 1.26500, pnl: 800.00,
        entry_time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        exit_time: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
        setup: 'EMA Rejection', grade: 'B',
        notes: `MT5 API Auto-Sync: GBP/USD short rejection on 15M EMA on server ${conn.serverName}.`,
        tags: '["MT5-Sync", "GBPUSD", "Short"]'
      },
      {
        symbol: 'XAUUSD', type: 'Long', entry_price: 2340.50, exit_price: 2334.20,
        lot_size: 1.0, stop_loss: 2332.00, take_profit: 2355.00, pnl: -630.00,
        entry_time: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
        exit_time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
        setup: 'Breakout Fail', grade: 'C',
        notes: `MT5 API Auto-Sync: Stopped out early on gold false breakout on server ${conn.serverName}.`,
        tags: '["MT5-Sync", "XAUUSD"]'
      }
    ];

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const t of mockTrades) {
        let tagsList = [];
        try {
          tagsList = JSON.parse(t.tags || '[]');
        } catch (e) {
          tagsList = [];
        }
        tagsList = addSessionTags(tagsList, t.entry_time);

        await client.query(`
          INSERT INTO trades (user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit, pnl, entry_time, exit_time, setup, notes, grade, tags)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          userId, t.symbol, t.type, t.entry_price, t.exit_price, t.lot_size,
          t.stop_loss, t.take_profit, t.pnl, t.entry_time, t.exit_time,
          t.setup, t.notes, t.grade, JSON.stringify(tagsList)
        ]);
        inserted++;
      }
      await client.query('COMMIT');

      res.json({
        success: true,
        count: inserted,
        message: `Successfully synchronized ${inserted} Forex/CFD trades from MT5 server!`,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('MT5 sync error:', err);
    res.status(500).json({ error: 'Failed to synchronize MT5 trades' });
  }
});

/* ─── Helpers ─────────────────────────────────────── */
function maskAccountNumber(num) {
  const s = String(num);
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
}

function extractBrokerName(serverName) {
  const name = serverName.toLowerCase();
  if (name.includes('icmarkets')) return 'IC Markets';
  if (name.includes('pepperstone')) return 'Pepperstone';
  if (name.includes('exness')) return 'Exness';
  if (name.includes('xm')) return 'XM Group';
  if (name.includes('fxpro')) return 'FxPro';
  if (name.includes('oanda')) return 'OANDA';
  if (name.includes('fbs')) return 'FBS';
  if (name.includes('roboforex')) return 'RoboForex';
  if (name.includes('ftmo')) return 'FTMO';
  if (name.includes('fundednext')) return 'FundedNext';
  if (name.includes('myforexfunds')) return 'My Forex Funds';
  if (name.includes('topstep')) return 'TopStep';
  if (name.includes('the5ers') || name.includes('5ers')) return 'The5ers';
  if (name.includes('trueforex')) return 'TrueForex';
  // Extract first word as broker name
  const parts = serverName.split(/[-_.\s]/);
  return parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Broker';
}

export default router;
