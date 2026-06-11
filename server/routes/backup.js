import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Export Backup ───────────────────────────────────
router.get('/export', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user details
    const user = db.prepare('SELECT display_name, account_size, currency, risk_percent, email FROM users WHERE id = ?').get(userId);
    
    // Get trades
    const trades = db.prepare('SELECT * FROM trades WHERE user_id = ?').all(userId);
    
    // Get journal entries
    const journalEntries = db.prepare('SELECT * FROM journal_entries WHERE user_id = ?').all(userId);
    
    // Safe JSON parser
    const safeParse = (str) => {
      try {
        return JSON.parse(str || '[]');
      } catch {
        return [];
      }
    };

    res.json({
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      user: {
        displayName: user.display_name,
        accountSize: user.account_size,
        currency: user.currency,
        riskPercent: user.risk_percent
      },
      trades: trades.map(t => ({
        symbol: t.symbol,
        type: t.type,
        entryPrice: t.entry_price,
        exitPrice: t.exit_price,
        lotSize: t.lot_size,
        stopLoss: t.stop_loss,
        takeProfit: t.take_profit,
        pnl: t.pnl,
        entryTime: t.entry_time,
        exitTime: t.exit_time,
        setup: t.setup,
        grade: t.grade,
        notes: t.notes,
        tags: safeParse(t.tags),
        emotionTags: safeParse(t.emotion_tags),
        fomoLevel: t.fomo_level,
        confidenceLevel: t.confidence_level,
        imagePath: t.image_path || '',
        shareToken: t.share_token || null,
        createdAt: t.created_at
      })),
      journalEntries: journalEntries.map(j => ({
        date: j.date,
        preMarket: j.pre_market,
        sessionNotes: j.session_notes,
        lessons: j.lessons,
        mistakes: j.mistakes,
        goals: j.goals,
        mood: j.mood,
        rating: j.rating,
        createdAt: j.created_at,
        updatedAt: j.updated_at
      }))
    });
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Failed to export backup data' });
  }
});

// ─── Import Backup ───────────────────────────────────
router.post('/import', (req, res) => {
  try {
    const userId = req.user.id;
    const { trades, journalEntries, user, mode } = req.body;
    
    if (!Array.isArray(trades) || !Array.isArray(journalEntries)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    
    const importMode = mode || 'merge'; // 'merge' or 'overwrite'
    
    // Execute all database updates in a single, transaction-safe block
    const executeImport = db.transaction(() => {
      // 1. Update user settings if present
      if (user) {
        db.prepare(`
          UPDATE users SET
            display_name = COALESCE(?, display_name),
            account_size = COALESCE(?, account_size),
            currency = COALESCE(?, currency),
            risk_percent = COALESCE(?, risk_percent)
          WHERE id = ?
        `).run(
          user.displayName !== undefined ? user.displayName : null,
          user.accountSize !== undefined ? parseFloat(user.accountSize) : null,
          user.currency !== undefined ? user.currency : null,
          user.riskPercent !== undefined ? parseFloat(user.riskPercent) : null,
          userId
        );
      }
      
      let tradesImported = 0;
      let journalsImported = 0;
      
      // 2. Clear out data if Overwrite mode is selected
      if (importMode === 'overwrite') {
        db.prepare('DELETE FROM trades WHERE user_id = ?').run(userId);
        db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
      }
      
      // 3. Import Trades
      const insertTrade = db.prepare(`
        INSERT INTO trades (
          user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
          pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
          fomo_level, confidence_level, image_path, share_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      // For merges, index active entries to skip duplicates
      const existingTrades = db.prepare('SELECT entry_time, symbol FROM trades WHERE user_id = ?').all(userId);
      const existingTradeKeys = new Set(
        existingTrades.map(t => `${t.entry_time}_${t.symbol.toUpperCase()}`)
      );
      
      for (const t of trades) {
        const key = `${t.entryTime}_${(t.symbol || '').toUpperCase()}`;
        if (importMode === 'merge' && existingTradeKeys.has(key)) {
          continue; // Skip duplicates in merge mode
        }
        
        insertTrade.run(
          userId,
          (t.symbol || '').toUpperCase(),
          t.type || 'Long',
          parseFloat(t.entryPrice) || 0,
          parseFloat(t.exitPrice) || 0,
          parseFloat(t.lotSize) || 0,
          parseFloat(t.stopLoss) || 0,
          parseFloat(t.takeProfit) || 0,
          parseFloat(t.pnl) || 0,
          t.entryTime || new Date().toISOString(),
          t.exitTime || null,
          t.setup || '',
          t.grade || 'B',
          t.notes || '',
          JSON.stringify(t.tags || []),
          JSON.stringify(t.emotionTags || []),
          parseInt(t.fomoLevel) || 5,
          parseInt(t.confidenceLevel) || 5,
          t.imagePath || '',
          t.shareToken || null
        );
        tradesImported++;
      }
      
      // 4. Import Journal Entries
      const insertJournal = db.prepare(`
        INSERT INTO journal_entries (
          user_id, date, pre_market, session_notes, lessons, mistakes, goals, mood, rating
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const updateJournal = db.prepare(`
        UPDATE journal_entries SET
          pre_market = ?, session_notes = ?, lessons = ?, mistakes = ?,
          goals = ?, mood = ?, rating = ?, updated_at = datetime('now')
        WHERE user_id = ? AND date = ?
      `);
      
      const existingJournals = db.prepare('SELECT date FROM journal_entries WHERE user_id = ?').all(userId);
      const existingJournalDates = new Set(existingJournals.map(j => j.date));
      
      for (const j of journalEntries) {
        if (importMode === 'merge' && existingJournalDates.has(j.date)) {
          // Merge strategy updates matching dates rather than duplicating or skipping
          updateJournal.run(
            j.preMarket || '',
            j.sessionNotes || '',
            j.lessons || '',
            j.mistakes || '',
            j.goals || '',
            j.mood || 'neutral',
            parseInt(j.rating) || 5,
            userId,
            j.date
          );
          journalsImported++;
        } else {
          insertJournal.run(
            userId,
            j.date,
            j.preMarket || '',
            j.sessionNotes || '',
            j.lessons || '',
            j.mistakes || '',
            j.goals || '',
            j.mood || 'neutral',
            parseInt(j.rating) || 5
          );
          journalsImported++;
        }
      }
      
      return { tradesImported, journalsImported };
    });
    
    const result = executeImport();
    res.json({
      message: `Restore completed in ${importMode} mode.`,
      tradesImported: result.tradesImported,
      journalsImported: result.journalsImported
    });
    
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import backup data' });
  }
});

export default router;
