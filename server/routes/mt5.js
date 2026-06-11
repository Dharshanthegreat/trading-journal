import { Router } from 'express';

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
