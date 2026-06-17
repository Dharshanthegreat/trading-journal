import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Get All Accounts ──────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const accountsResult = await db.query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

    // Compute live stats for each account
    const accountsWithStats = await Promise.all(accountsResult.rows.map(async (acc) => {
      const tradesResult = await db.query('SELECT pnl FROM trades WHERE user_id = $1 AND account_id = $2', [userId, acc.id]);
      const totalPnL = tradesResult.rows.reduce((accPnL, t) => accPnL + (t.pnl || 0), 0);
      const tradesCount = tradesResult.rows.length;
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
    }));

    res.json(accountsWithStats);
  } catch (err) {
    console.error('Get accounts error:', err);
    res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
});

// ─── Create Account ────────────────────────────────────
router.post('/', async (req, res) => {
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

    const result = await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, accountName, accType, startBalance, accCurrency, accStatus]);

    const newAccount = result.rows[0];
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
router.delete('/:id', async (req, res) => {
  try {
    const accountId = req.params.id;
    const userId = req.user.id;

    const result = await db.query('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
