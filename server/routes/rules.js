import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Get All Rules ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { accountId } = req.query;

    let queryText = 'SELECT * FROM trading_rules WHERE user_id = $1 ORDER BY created_at DESC';
    let params = [userId];

    if (accountId) {
      queryText = 'SELECT * FROM trading_rules WHERE user_id = $1 AND account_id = $2 ORDER BY created_at DESC';
      params.push(accountId);
    }

    const result = await db.query(queryText, params);
    
    // Map database snake_case keys to client camelCase keys
    const rules = result.rows.map(row => ({
      id: row.id,
      accountId: row.account_id,
      ruleText: row.rule_text,
      isActive: row.is_active,
      createdAt: row.created_at
    }));

    res.json(rules);
  } catch (err) {
    console.error('Get rules error:', err);
    res.status(500).json({ error: 'Failed to retrieve trading rules' });
  }
});

// ─── Create Rule ───────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { accountId, ruleText, isActive } = req.body;
    const userId = req.user.id;

    if (!ruleText || !ruleText.trim()) {
      return res.status(400).json({ error: 'Rule text is required' });
    }

    // Validate account belongs to this user if accountId is provided
    if (accountId) {
      const accountCheck = await db.query('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found or unauthorized' });
      }
    }

    const ruleActive = isActive !== undefined ? isActive : true;

    const result = await db.query(`
      INSERT INTO trading_rules (user_id, account_id, rule_text, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [userId, accountId || null, ruleText.trim(), ruleActive]);

    const newRule = result.rows[0];
    res.status(201).json({
      id: newRule.id,
      accountId: newRule.account_id,
      ruleText: newRule.rule_text,
      isActive: newRule.is_active,
      createdAt: newRule.created_at
    });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Failed to create trading rule' });
  }
});

// ─── Update Rule ───────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const userId = req.user.id;
    const { ruleText, isActive, accountId } = req.body;

    // Check ownership
    const existingCheck = await db.query('SELECT id FROM trading_rules WHERE id = $1 AND user_id = $2', [ruleId, userId]);
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trading rule not found' });
    }

    // If updating accountId, validate it
    if (accountId) {
      const accountCheck = await db.query('SELECT id FROM accounts WHERE id = $1 AND user_id = $2', [accountId, userId]);
      if (accountCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found or unauthorized' });
      }
    }

    // Perform selective updates
    const result = await db.query(`
      UPDATE trading_rules
      SET rule_text = COALESCE($1, rule_text),
          is_active = COALESCE($2, is_active),
          account_id = COALESCE($3, account_id)
      WHERE id = $4 AND user_id = $5
      RETURNING *
    `, [
      ruleText !== undefined ? ruleText.trim() : null,
      isActive !== undefined ? isActive : null,
      accountId !== undefined ? accountId : null,
      ruleId,
      userId
    ]);

    const updated = result.rows[0];
    res.json({
      id: updated.id,
      accountId: updated.account_id,
      ruleText: updated.rule_text,
      isActive: updated.is_active,
      createdAt: updated.created_at
    });
  } catch (err) {
    console.error('Update rule error:', err);
    res.status(500).json({ error: 'Failed to update trading rule' });
  }
});

// ─── Delete Rule ───────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const ruleId = req.params.id;
    const userId = req.user.id;

    // Check ownership
    const existingCheck = await db.query('SELECT id FROM trading_rules WHERE id = $1 AND user_id = $2', [ruleId, userId]);
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Trading rule not found' });
    }

    await db.query('DELETE FROM trading_rules WHERE id = $1', [ruleId]);
    res.json({ success: true, message: 'Trading rule deleted successfully' });
  } catch (err) {
    console.error('Delete rule error:', err);
    res.status(500).json({ error: 'Failed to delete trading rule' });
  }
});

export default router;
