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
        notionLink: acc.notion_link || '',
        notes: acc.notes || '',
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
    const { accountName, accountType, balance, currency, status, notionLink, notes } = req.body;
    const userId = req.user.id;

    if (!accountName) {
      return res.status(400).json({ error: 'Account Name is required' });
    }

    const startBalance = parseFloat(balance) || 0;
    const accType = accountType || 'Simulated';
    const accCurrency = currency || 'USD';
    const accStatus = status || 'Active';

    const result = await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status, notion_link, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, accountName, accType, startBalance, accCurrency, accStatus, notionLink || '', notes || '']);

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
      notionLink: newAccount.notion_link || '',
      notes: newAccount.notes || '',
      createdAt: newAccount.created_at,
    });
  } catch (err) {
    console.error('Create account error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ─── Update Account ────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { accountName, accountType, balance, currency, status, notionLink, notes } = req.body;
    const accountId = req.params.id;
    const userId = req.user.id;

    const existing = await db.query('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const result = await db.query(`
      UPDATE accounts 
      SET account_name = COALESCE($1, account_name),
          account_type = COALESCE($2, account_type),
          balance = COALESCE($3, balance),
          currency = COALESCE($4, currency),
          status = COALESCE($5, status),
          notion_link = COALESCE($6, notion_link),
          notes = COALESCE($7, notes)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [accountName, accountType, balance ? parseFloat(balance) : null, currency, status, notionLink, notes, accountId, userId]);

    const updatedAccount = result.rows[0];
    res.json({
      id: updatedAccount.id,
      accountName: updatedAccount.account_name,
      accountType: updatedAccount.account_type,
      startingBalance: updatedAccount.balance,
      currency: updatedAccount.currency,
      status: updatedAccount.status,
      notionLink: updatedAccount.notion_link || '',
      notes: updatedAccount.notes || '',
      createdAt: updatedAccount.created_at,
    });
  } catch (err) {
    console.error('Update account error:', err);
    res.status(500).json({ error: 'Failed to update account' });
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
