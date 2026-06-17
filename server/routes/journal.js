import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Get Journal Entries ─────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    let result;

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = parseInt(month) + 1;
      const endYear = endMonth > 12 ? parseInt(year) + 1 : year;
      const endDate = `${endYear}-${String(endMonth > 12 ? 1 : endMonth).padStart(2, '0')}-01`;

      result = await db.query(`
        SELECT * FROM journal_entries
        WHERE user_id = $1 AND date >= $2 AND date < $3
        ORDER BY date DESC
      `, [req.user.id, startDate, endDate]);
    } else {
      result = await db.query(`
        SELECT * FROM journal_entries
        WHERE user_id = $1
        ORDER BY date DESC
        LIMIT 50
      `, [req.user.id]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Get journal entries error:', err);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

// ─── Get Entry by Date ───────────────────────────────
router.get('/:date', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM journal_entries WHERE user_id = $1 AND date = $2',
      [req.user.id, req.params.date]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get journal entry error:', err);
    res.status(500).json({ error: 'Failed to get journal entry' });
  }
});

// ─── Create or Update Entry ──────────────────────────
router.post('/', async (req, res) => {
  try {
    const { date, pre_market, session_notes, lessons, mistakes, goals, mood, rating } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Upsert
    const existing = await db.query(
      'SELECT id FROM journal_entries WHERE user_id = $1 AND date = $2',
      [req.user.id, date]
    );

    if (existing.rows.length > 0) {
      await db.query(`
        UPDATE journal_entries SET
          pre_market = $1, session_notes = $2, lessons = $3, mistakes = $4,
          goals = $5, mood = $6, rating = $7, updated_at = NOW()
        WHERE id = $8
      `, [
        pre_market || '', session_notes || '', lessons || '', mistakes || '',
        goals || '', mood || 'neutral', rating || 5, existing.rows[0].id
      ]);

      const entry = await db.query('SELECT * FROM journal_entries WHERE id = $1', [existing.rows[0].id]);
      return res.json(entry.rows[0]);
    }

    const result = await db.query(`
      INSERT INTO journal_entries (user_id, date, pre_market, session_notes, lessons, mistakes, goals, mood, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id, date,
      pre_market || '', session_notes || '', lessons || '', mistakes || '',
      goals || '', mood || 'neutral', rating || 5
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create journal entry error:', err);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// ─── Delete Entry ────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await db.query('DELETE FROM journal_entries WHERE id = $1', [req.params.id]);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error('Delete journal entry error:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
