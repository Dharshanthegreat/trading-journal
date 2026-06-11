import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Get Journal Entries ─────────────────────────────
router.get('/', (req, res) => {
  try {
    const { month, year } = req.query;
    let entries;

    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endMonth = parseInt(month) + 1;
      const endYear = endMonth > 12 ? parseInt(year) + 1 : year;
      const endDate = `${endYear}-${String(endMonth > 12 ? 1 : endMonth).padStart(2, '0')}-01`;

      entries = db.prepare(`
        SELECT * FROM journal_entries
        WHERE user_id = ? AND date >= ? AND date < ?
        ORDER BY date DESC
      `).all(req.user.id, startDate, endDate);
    } else {
      entries = db.prepare(`
        SELECT * FROM journal_entries
        WHERE user_id = ?
        ORDER BY date DESC
        LIMIT 50
      `).all(req.user.id);
    }

    res.json(entries);
  } catch (err) {
    console.error('Get journal entries error:', err);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

// ─── Get Entry by Date ───────────────────────────────
router.get('/:date', (req, res) => {
  try {
    const entry = db.prepare(
      'SELECT * FROM journal_entries WHERE user_id = ? AND date = ?'
    ).get(req.user.id, req.params.date);

    if (!entry) {
      return res.json(null);
    }

    res.json(entry);
  } catch (err) {
    console.error('Get journal entry error:', err);
    res.status(500).json({ error: 'Failed to get journal entry' });
  }
});

// ─── Create or Update Entry ──────────────────────────
router.post('/', (req, res) => {
  try {
    const { date, pre_market, session_notes, lessons, mistakes, goals, mood, rating } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Upsert
    const existing = db.prepare(
      'SELECT id FROM journal_entries WHERE user_id = ? AND date = ?'
    ).get(req.user.id, date);

    if (existing) {
      db.prepare(`
        UPDATE journal_entries SET
          pre_market = ?, session_notes = ?, lessons = ?, mistakes = ?,
          goals = ?, mood = ?, rating = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(
        pre_market || '', session_notes || '', lessons || '', mistakes || '',
        goals || '', mood || 'neutral', rating || 5, existing.id
      );

      const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(existing.id);
      return res.json(entry);
    }

    const result = db.prepare(`
      INSERT INTO journal_entries (user_id, date, pre_market, session_notes, lessons, mistakes, goals, mood, rating)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id, date,
      pre_market || '', session_notes || '', lessons || '', mistakes || '',
      goals || '', mood || 'neutral', rating || 5
    );

    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(entry);
  } catch (err) {
    console.error('Create journal entry error:', err);
    res.status(500).json({ error: 'Failed to save journal entry' });
  }
});

// ─── Delete Entry ────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const entry = db.prepare(
      'SELECT * FROM journal_entries WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    console.error('Delete journal entry error:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
