import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Get All Accounts ──────────────────────────────────
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC').all(userId);

    // Compute live stats for each account
    const accountsWithStats = accounts.map(acc => {
      const trades = db.prepare('SELECT pnl FROM trades WHERE user_id = ? AND account_id = ?').all(userId, acc.id);
      const totalPnL = trades.reduce((accPnL, t) => accPnL + (t.pnl || 0), 0);
      const tradesCount = trades.length;
      const currentBalance = (acc.balance || 0) + totalPnL;

      return {
        id: acc.id,
        accountName: acc.account_name,
        accountType: acc.account_type,
        startingBalance: acc.balance,
        currentBalance,
        totalPnL,
        tradesCount,
        currency: acc.currency || 'USD',
        status: acc.status || 'Active',
        createdAt: acc.created_at,
      };
    });

    res.json(accountsWithStats);
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
});

// ─── Create Account ────────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { accountName, accountType, balance, currency, status } = req.body;
    const userId = req.user.id;

    if (!accountName) {
      return res.status(400).json({ error: 'Account Name is required' });
    }

    const startBalance = parseFloat(balance) || 0;
    const accType = accountType || 'Simulated';
    const accCurrency = currency || 'USD';
    const accStatus = status || 'Active';

    const result = db.prepare(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, accountName, accType, startBalance, accCurrency, accStatus);

    const newAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      id: newAccount.id,
      accountName: newAccount.account_name,
      accountType: newAccount.account_type,
      startingBalance: newAccount.balance,
      currentBalance: newAccount.balance,
      totalPnL: 0,
      tradesCount: 0,
      currency: newAccount.currency,
      status: newAccount.status,
      createdAt: newAccount.created_at,
    });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ─── Delete Account ────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
