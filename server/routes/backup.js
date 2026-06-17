import { Router } from 'express';
import db from '../db.js';

const router = Router();

// ─── Export Backup ───────────────────────────────────
router.get('/export', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user details
    const userResult = await db.query('SELECT display_name, account_size, currency, risk_percent, email FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];
    
    // Get trades
    const tradesResult = await db.query('SELECT * FROM trades WHERE user_id = $1', [userId]);
    const trades = tradesResult.rows;
    
    // Get journal entries
    const journalResult = await db.query('SELECT * FROM journal_entries WHERE user_id = $1', [userId]);
    const journalEntries = journalResult.rows;
    
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
router.post('/import', async (req, res) => {
  try {
    const userId = req.user.id;
    const { trades, journalEntries, user, mode } = req.body;
    
    if (!Array.isArray(trades) || !Array.isArray(journalEntries)) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }
    
    const importMode = mode || 'merge';
    
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Update user settings if present
      if (user) {
        await client.query(`
          UPDATE users SET
            display_name = COALESCE($1, display_name),
            account_size = COALESCE($2, account_size),
            currency = COALESCE($3, currency),
            risk_percent = COALESCE($4, risk_percent)
          WHERE id = $5
        `, [
          user.displayName !== undefined ? user.displayName : null,
          user.accountSize !== undefined ? parseFloat(user.accountSize) : null,
          user.currency !== undefined ? user.currency : null,
          user.riskPercent !== undefined ? parseFloat(user.riskPercent) : null,
          userId
        ]);
      }
      
      let tradesImported = 0;
      let journalsImported = 0;
      
      // 2. Clear out data if Overwrite mode is selected
      if (importMode === 'overwrite') {
        await client.query('DELETE FROM trades WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM journal_entries WHERE user_id = $1', [userId]);
      }
      
      // 3. Import Trades
      const existingTradesResult = await client.query('SELECT entry_time, symbol FROM trades WHERE user_id = $1', [userId]);
      const existingTradeKeys = new Set(
        existingTradesResult.rows.map(t => `${t.entry_time}_${t.symbol.toUpperCase()}`)
      );
      
      for (const t of trades) {
        const key = `${t.entryTime}_${(t.symbol || '').toUpperCase()}`;
        if (importMode === 'merge' && existingTradeKeys.has(key)) {
          continue;
        }
        
        await client.query(`
          INSERT INTO trades (
            user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
            pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
            fomo_level, confidence_level, image_path, share_token
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        `, [
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
        ]);
        tradesImported++;
      }
      
      // 4. Import Journal Entries
      const existingJournalsResult = await client.query('SELECT date FROM journal_entries WHERE user_id = $1', [userId]);
      const existingJournalDates = new Set(existingJournalsResult.rows.map(j => j.date));
      
      for (const j of journalEntries) {
        if (importMode === 'merge' && existingJournalDates.has(j.date)) {
          await client.query(`
            UPDATE journal_entries SET
              pre_market = $1, session_notes = $2, lessons = $3, mistakes = $4,
              goals = $5, mood = $6, rating = $7, updated_at = NOW()
            WHERE user_id = $8 AND date = $9
          `, [
            j.preMarket || '',
            j.sessionNotes || '',
            j.lessons || '',
            j.mistakes || '',
            j.goals || '',
            j.mood || 'neutral',
            parseInt(j.rating) || 5,
            userId,
            j.date
          ]);
          journalsImported++;
        } else {
          await client.query(`
            INSERT INTO journal_entries (user_id, date, pre_market, session_notes, lessons, mistakes, goals, mood, rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId,
            j.date,
            j.preMarket || '',
            j.sessionNotes || '',
            j.lessons || '',
            j.mistakes || '',
            j.goals || '',
            j.mood || 'neutral',
            parseInt(j.rating) || 5
          ]);
          journalsImported++;
        }
      }
      
      await client.query('COMMIT');
      
      res.json({
        message: `Restore completed in ${importMode} mode.`,
        tradesImported,
        journalsImported
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: err.message || 'Failed to import backup data' });
  }
});

export default router;
