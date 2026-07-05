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
      const tradesResult = await db.query('SELECT pnl, close_time FROM trades WHERE user_id = $1 AND account_id = $2', [userId, acc.id]);
      const totalPnL = tradesResult.rows.reduce((accPnL, t) => accPnL + (t.pnl || 0), 0);
      const tradesCount = tradesResult.rows.length;
      const currentBalance = (acc.balance || 0) + totalPnL;

      // Count distinct trading days
      const tradingDaysSet = new Set();
      tradesResult.rows.forEach(t => {
        if (t.close_time) {
          const dayStr = new Date(t.close_time).toISOString().split('T')[0];
          tradingDaysSet.add(dayStr);
        }
      });
      const tradingDays = tradingDaysSet.size;

      // Prop challenge fields
      const profitTarget = acc.profit_target || 0;
      const maxLossLimit = acc.max_loss_limit || 0;
      const consistencyRule = acc.consistency_rule || 0;
      const mllValue = (acc.balance || 0) - maxLossLimit;
      const targetValue = (acc.balance || 0) + profitTarget;

      // Consistency score: largest single-day PnL as % of total profit
      let consistencyScore = 0;
      if (consistencyRule > 0 && totalPnL > 0) {
        const dailyPnL = {};
        tradesResult.rows.forEach(t => {
          if (t.close_time) {
            const dayStr = new Date(t.close_time).toISOString().split('T')[0];
            dailyPnL[dayStr] = (dailyPnL[dayStr] || 0) + (t.pnl || 0);
          }
        });
        const maxDayPnL = Math.max(...Object.values(dailyPnL).map(Math.abs), 0);
        consistencyScore = totalPnL > 0 ? (maxDayPnL / totalPnL) * 100 : 0;
      }

      return {
        id: acc.id,
        accountName: acc.account_name,
        accountType: acc.account_type,
        startingBalance: acc.balance,
        currentBalance,
        totalPnL,
        tradesCount,
        tradingDays,
        currency: acc.currency || 'USD',
        status: acc.status || 'Active',
        notionLink: acc.notion_link || '',
        notes: acc.notes || '',
        profitTarget,
        maxLossLimit,
        consistencyRule,
        mllValue,
        targetValue,
        consistencyScore,
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
    const { accountName, accountType, balance, currency, status, notionLink, notes, profitTarget, maxLossLimit, consistencyRule } = req.body;
    const userId = req.user.id;

    if (!accountName) {
      return res.status(400).json({ error: 'Account Name is required' });
    }

    const startBalance = parseFloat(balance) || 0;
    const accType = accountType || 'Simulated';
    const accCurrency = currency || 'USD';
    const accStatus = status || 'Active';
    const accProfitTarget = parseFloat(profitTarget) || 0;
    const accMaxLossLimit = parseFloat(maxLossLimit) || 0;
    const accConsistencyRule = parseFloat(consistencyRule) || 0;

    const result = await db.query(`
      INSERT INTO accounts (user_id, account_name, account_type, balance, currency, status, notion_link, notes, profit_target, max_loss_limit, consistency_rule)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [userId, accountName, accType, startBalance, accCurrency, accStatus, notionLink || '', notes || '', accProfitTarget, accMaxLossLimit, accConsistencyRule]);

    const newAccount = result.rows[0];
    res.status(201).json({
      id: newAccount.id,
      accountName: newAccount.account_name,
      accountType: newAccount.account_type,
      startingBalance: newAccount.balance,
      currentBalance: newAccount.balance,
      totalPnL: 0,
      tradesCount: 0,
      tradingDays: 0,
      currency: newAccount.currency,
      status: newAccount.status,
      notionLink: newAccount.notion_link || '',
      notes: newAccount.notes || '',
      profitTarget: newAccount.profit_target || 0,
      maxLossLimit: newAccount.max_loss_limit || 0,
      consistencyRule: newAccount.consistency_rule || 0,
      mllValue: newAccount.balance - (newAccount.max_loss_limit || 0),
      targetValue: newAccount.balance + (newAccount.profit_target || 0),
      consistencyScore: 0,
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
    const { accountName, accountType, balance, currency, status, notionLink, notes, profitTarget, maxLossLimit, consistencyRule } = req.body;
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
          notes = COALESCE($7, notes),
          profit_target = COALESCE($8, profit_target),
          max_loss_limit = COALESCE($9, max_loss_limit),
          consistency_rule = COALESCE($10, consistency_rule)
      WHERE id = $11 AND user_id = $12
      RETURNING *
    `, [
      accountName, accountType, balance ? parseFloat(balance) : null, currency, status, notionLink, notes,
      profitTarget !== undefined ? parseFloat(profitTarget) : null,
      maxLossLimit !== undefined ? parseFloat(maxLossLimit) : null,
      consistencyRule !== undefined ? parseFloat(consistencyRule) : null,
      accountId, userId
    ]);

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
      profitTarget: updatedAccount.profit_target || 0,
      maxLossLimit: updatedAccount.max_loss_limit || 0,
      consistencyRule: updatedAccount.consistency_rule || 0,
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
