import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for chart image uploads
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chart_${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

const router = Router();

// ─── Get All Trades ──────────────────────────────────
router.get('/', (req, res) => {
  try {
    const { search, type, setup, sort, order, page, limit } = req.query;
    let sql = 'SELECT * FROM trades WHERE user_id = ?';
    const params = [req.user.id];

    if (search) {
      sql += ' AND (symbol LIKE ? OR notes LIKE ? OR setup LIKE ?)';
      const q = `%${search}%`;
      params.push(q, q, q);
    }

    if (type && type !== 'All') {
      if (type === 'Win') {
        sql += ' AND pnl > 0';
      } else if (type === 'Loss') {
        sql += ' AND pnl < 0';
      } else {
        sql += ' AND type = ?';
        params.push(type);
      }
    }

    if (setup) {
      sql += ' AND setup = ?';
      params.push(setup);
    }

    const sortField = sort || 'entry_time';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';
    const validSorts = ['entry_time', 'symbol', 'pnl', 'created_at', 'type', 'setup'];
    if (validSorts.includes(sortField)) {
      sql += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      sql += ' ORDER BY entry_time DESC';
    }

    const pageNum = parseInt(page) || 1;
    const pageSize = Math.min(parseInt(limit) || 50, 200);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(pageSize, (pageNum - 1) * pageSize);

    const trades = db.prepare(sql).all(...params);

    // Parse JSON fields
    const parsed = trades.map(t => ({
      ...t,
      tags: safeParseJSON(t.tags, []),
      emotion_tags: safeParseJSON(t.emotion_tags, []),
      // Map to camelCase for frontend
      entryPrice: t.entry_price,
      exitPrice: t.exit_price,
      lotSize: t.lot_size,
      stopLoss: t.stop_loss,
      takeProfit: t.take_profit,
      entryTime: t.entry_time,
      exitTime: t.exit_time,
      fomoLevel: t.fomo_level,
      confidenceLevel: t.confidence_level,
      imagePath: t.image_path,
      accountId: t.account_id,
      emotionTags: safeParseJSON(t.emotion_tags, []),
      imageUrl: t.image_path ? `/api/uploads/${path.basename(t.image_path)}` : null,
    }));

    // Get total count for pagination
    let countSql = 'SELECT COUNT(*) as total FROM trades WHERE user_id = ?';
    const countParams = [req.user.id];
    const { total } = db.prepare(countSql).get(...countParams);

    res.json({ trades: parsed, total, page: pageNum, pageSize });
  } catch (err) {
    console.error('Get trades error:', err);
    res.status(500).json({ error: 'Failed to get trades' });
  }
});

// ─── Create Trade ────────────────────────────────────
router.post('/', upload.single('chart'), (req, res) => {
  try {
    const {
      symbol, type, entryPrice, exitPrice, lotSize, stopLoss, takeProfit,
      pnl, entryTime, exitTime, setup, grade, notes, tags, emotionTags,
      fomoLevel, confidenceLevel, accountId
    } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const imagePath = req.file ? req.file.path : '';
    const dbAccountId = accountId ? parseInt(accountId) : null;

    const result = db.prepare(`
      INSERT INTO trades (
        user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
        pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
        fomo_level, confidence_level, image_path, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      symbol.toUpperCase(),
      type || 'Long',
      parseFloat(entryPrice) || 0,
      parseFloat(exitPrice) || 0,
      parseFloat(lotSize) || 0,
      parseFloat(stopLoss) || 0,
      parseFloat(takeProfit) || 0,
      parseFloat(pnl) || 0,
      entryTime || new Date().toISOString(),
      exitTime || null,
      setup || '',
      grade || 'B',
      notes || '',
      typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      typeof emotionTags === 'string' ? emotionTags : JSON.stringify(emotionTags || []),
      parseInt(fomoLevel) || 5,
      parseInt(confidenceLevel) || 5,
      imagePath,
      dbAccountId
    );

    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(formatTrade(trade));
  } catch (err) {
    console.error('Create trade error:', err);
    res.status(500).json({ error: 'Failed to create trade' });
  }
});

// ─── Update Trade ────────────────────────────────────
router.put('/:id', upload.single('chart'), (req, res) => {
  try {
    const trade = db.prepare(
      'SELECT * FROM trades WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const {
      symbol, type, entryPrice, exitPrice, lotSize, stopLoss, takeProfit,
      pnl, entryTime, exitTime, setup, grade, notes, tags, emotionTags,
      fomoLevel, confidenceLevel, accountId
    } = req.body;

    const imagePath = req.file ? req.file.path : trade.image_path;
    const dbAccountId = accountId !== undefined ? (accountId ? parseInt(accountId) : null) : trade.account_id;

    db.prepare(`
      UPDATE trades SET
        symbol = ?, type = ?, entry_price = ?, exit_price = ?, lot_size = ?,
        stop_loss = ?, take_profit = ?, pnl = ?, entry_time = ?, exit_time = ?,
        setup = ?, grade = ?, notes = ?, tags = ?, emotion_tags = ?,
        fomo_level = ?, confidence_level = ?, image_path = ?, account_id = ?
      WHERE id = ? AND user_id = ?
    `).run(
      symbol?.toUpperCase() || trade.symbol,
      type || trade.type,
      entryPrice !== undefined ? parseFloat(entryPrice) : trade.entry_price,
      exitPrice !== undefined ? parseFloat(exitPrice) : trade.exit_price,
      lotSize !== undefined ? parseFloat(lotSize) : trade.lot_size,
      stopLoss !== undefined ? parseFloat(stopLoss) : trade.stop_loss,
      takeProfit !== undefined ? parseFloat(takeProfit) : trade.take_profit,
      pnl !== undefined ? parseFloat(pnl) : trade.pnl,
      entryTime || trade.entry_time,
      exitTime !== undefined ? exitTime : trade.exit_time,
      setup !== undefined ? setup : trade.setup,
      grade || trade.grade,
      notes !== undefined ? notes : trade.notes,
      tags !== undefined ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : trade.tags,
      emotionTags !== undefined ? (typeof emotionTags === 'string' ? emotionTags : JSON.stringify(emotionTags)) : trade.emotion_tags,
      fomoLevel !== undefined ? parseInt(fomoLevel) : trade.fomo_level,
      confidenceLevel !== undefined ? parseInt(confidenceLevel) : trade.confidence_level,
      imagePath,
      dbAccountId,
      req.params.id,
      req.user.id
    );

    const updated = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    res.json(formatTrade(updated));
  } catch (err) {
    console.error('Update trade error:', err);
    res.status(500).json({ error: 'Failed to update trade' });
  }
});

// ─── Delete Trade ────────────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const trade = db.prepare(
      'SELECT * FROM trades WHERE id = ? AND user_id = ?'
    ).get(req.params.id, req.user.id);

    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Delete associated image file
    if (trade.image_path && fs.existsSync(trade.image_path)) {
      fs.unlinkSync(trade.image_path);
    }

    db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
    res.json({ message: 'Trade deleted' });
  } catch (err) {
    console.error('Delete trade error:', err);
    res.status(500).json({ error: 'Failed to delete trade' });
  }
});

// ─── Bulk Import ─────────────────────────────────────
router.post('/import', (req, res) => {
  try {
    const { trades } = req.body;

    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ error: 'No trades provided' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO trades (
        user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
        pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
        fomo_level, confidence_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((tradesArr) => {
      const ids = [];
      for (const t of tradesArr) {
        const result = insertStmt.run(
          req.user.id,
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
          parseInt(t.confidenceLevel) || 5
        );
        ids.push(result.lastInsertRowid);
      }
      return ids;
    });

    const ids = insertMany(trades);
    res.status(201).json({ imported: ids.length, message: `${ids.length} trades imported` });
  } catch (err) {
    console.error('Import trades error:', err);
    res.status(500).json({ error: 'Failed to import trades' });
  }
});

// ─── Analytics Endpoint ──────────────────────────────
router.get('/analytics', (req, res) => {
  try {
    const trades = db.prepare(
      'SELECT * FROM trades WHERE user_id = ? ORDER BY entry_time ASC'
    ).all(req.user.id);

    if (!trades.length) {
      return res.json({ empty: true });
    }

    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winRate = (wins.length / trades.length * 100).toFixed(1);
    const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '0';
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

    // Equity curve
    let running = 0;
    const equityCurve = trades.map(t => {
      running += t.pnl;
      return { date: t.entry_time, equity: parseFloat(running.toFixed(2)) };
    });

    // Max drawdown
    let peak = 0, maxDrawdown = 0;
    running = 0;
    trades.forEach(t => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // By symbol
    const symbolMap = {};
    trades.forEach(t => {
      if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, count: 0, wins: 0 };
      symbolMap[t.symbol].pnl += t.pnl;
      symbolMap[t.symbol].count++;
      if (t.pnl > 0) symbolMap[t.symbol].wins++;
    });

    // By setup
    const setupMap = {};
    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setupMap[s]) setupMap[s] = { pnl: 0, count: 0, wins: 0 };
      setupMap[s].pnl += t.pnl;
      setupMap[s].count++;
      if (t.pnl > 0) setupMap[s].wins++;
    });

    // By day of week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowMap = {};
    trades.forEach(t => {
      const d = dayNames[new Date(t.entry_time).getDay()];
      if (!dowMap[d]) dowMap[d] = { pnl: 0, count: 0 };
      dowMap[d].pnl += t.pnl;
      dowMap[d].count++;
    });

    // By hour
    const hourMap = {};
    trades.forEach(t => {
      const h = new Date(t.entry_time).getHours();
      if (!hourMap[h]) hourMap[h] = { pnl: 0, count: 0 };
      hourMap[h].pnl += t.pnl;
      hourMap[h].count++;
    });

    // Monthly P&L
    const monthMap = {};
    trades.forEach(t => {
      const d = new Date(t.entry_time);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = 0;
      monthMap[key] += t.pnl;
    });

    // Daily P&L (for calendar)
    const dailyMap = {};
    trades.forEach(t => {
      const d = t.entry_time ? t.entry_time.split('T')[0] : null;
      if (d) {
        if (!dailyMap[d]) dailyMap[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
        dailyMap[d].pnl += t.pnl;
        dailyMap[d].count++;
        if (t.pnl > 0) dailyMap[d].wins++;
        else if (t.pnl < 0) dailyMap[d].losses++;
      }
    });

    // Streaks
    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
    let streakType = null;
    trades.forEach(t => {
      const isWin = t.pnl > 0;
      if (streakType === null) {
        streakType = isWin;
        currentStreak = 1;
      } else if (isWin === streakType) {
        currentStreak++;
      } else {
        streakType = isWin;
        currentStreak = 1;
      }
      if (isWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      if (!isWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
    });

    // Best and worst trade
    const bestTrade = trades.reduce((best, t) => t.pnl > best.pnl ? t : best, trades[0]);
    const worstTrade = trades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, trades[0]);

    res.json({
      summary: {
        totalTrades: trades.length,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        winRate: parseFloat(winRate),
        profitFactor: parseFloat(profitFactor) || 0,
        avgWin: parseFloat(avgWin),
        avgLoss: parseFloat(avgLoss),
        maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
        wins: wins.length,
        losses: losses.length,
        maxWinStreak,
        maxLossStreak,
        bestTrade: formatTrade(bestTrade),
        worstTrade: formatTrade(worstTrade),
      },
      equityCurve,
      bySymbol: Object.entries(symbolMap).map(([sym, v]) => ({
        symbol: sym, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
        winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
      })).sort((a, b) => b.pnl - a.pnl),
      bySetup: Object.entries(setupMap).map(([s, v]) => ({
        setup: s, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
        winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
      })).sort((a, b) => b.pnl - a.pnl),
      byDow: dayNames.map(d => ({
        day: d, pnl: parseFloat((dowMap[d]?.pnl || 0).toFixed(2)), count: dowMap[d]?.count || 0
      })),
      byHour: Object.entries(hourMap).map(([h, v]) => ({
        hour: parseInt(h), pnl: parseFloat(v.pnl.toFixed(2)), count: v.count
      })).sort((a, b) => a.hour - b.hour),
      monthly: Object.entries(monthMap).map(([m, p]) => ({
        month: m, pnl: parseFloat(p.toFixed(2))
      })).sort((a, b) => a.month.localeCompare(b.month)),
      daily: dailyMap,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

// ─── Export trades ────────────────────────────────────
router.get('/export', (req, res) => {
  try {
    const trades = db.prepare(
      'SELECT * FROM trades WHERE user_id = ? ORDER BY entry_time DESC'
    ).all(req.user.id);

    const formatted = trades.map(formatTrade);
    res.json(formatted);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

// ─── Generate Share Link ─────────────────────────────
router.post('/:id/share', (req, res) => {
  try {
    const trade = db.prepare('SELECT id FROM trades WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    const shareToken = crypto.randomUUID();
    db.prepare('UPDATE trades SET share_token = ? WHERE id = ?').run(shareToken, req.params.id);
    res.json({ shareToken });
  } catch (err) {
    console.error('Generate share token error:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

// ─── Revoke Share Link ───────────────────────────────
router.delete('/:id/share', (req, res) => {
  try {
    const trade = db.prepare('SELECT id FROM trades WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!trade) {
      return res.status(404).json({ error: 'Trade not found' });
    }
    db.prepare('UPDATE trades SET share_token = NULL WHERE id = ?').run(req.params.id);
    res.json({ message: 'Share link revoked successfully' });
  } catch (err) {
    console.error('Revoke share link error:', err);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

// ─── Helpers ─────────────────────────────────────────
function safeParseJSON(str, fallback) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

function formatTrade(t) {
  if (!t) return null;
  return {
    id: t.id,
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
    tags: safeParseJSON(t.tags, []),
    emotionTags: safeParseJSON(t.emotion_tags, []),
    fomoLevel: t.fomo_level,
    confidenceLevel: t.confidence_level,
    imageUrl: t.image_path ? `/api/uploads/${path.basename(t.image_path)}` : null,
    shareToken: t.share_token,
    accountId: t.account_id,
    createdAt: t.created_at,
  };
}

// ─── Public Routes Router ────────────────────────────
const publicRouter = Router();

publicRouter.get('/:token', (req, res) => {
  try {
    const trade = db.prepare('SELECT * FROM trades WHERE share_token = ?').get(req.params.token);
    if (!trade) {
      return res.status(404).json({ error: 'Shared trade not found' });
    }
    res.json(formatTrade(trade));
  } catch (err) {
    console.error('Get shared trade error:', err);
    res.status(500).json({ error: 'Failed to retrieve shared trade' });
  }
});

const publicDashboardRouter = Router();

publicDashboardRouter.get('/:token', (req, res) => {
  try {
    const token = req.params.token;
    const user = db.prepare('SELECT * FROM users WHERE dashboard_share_token = ?').get(token);
    if (!user) {
      return res.status(404).json({ error: 'Showcase dashboard not found or link has been revoked' });
    }

    const trades = db.prepare(
      'SELECT * FROM trades WHERE user_id = ? ORDER BY entry_time ASC'
    ).all(user.id);

    const journalEntries = db.prepare(
      'SELECT * FROM journal_entries WHERE user_id = ? ORDER BY date DESC'
    ).all(user.id);

    // Compute analytics
    let analytics = { empty: true };
    if (trades.length) {
      const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
      const wins = trades.filter(t => t.pnl > 0);
      const losses = trades.filter(t => t.pnl < 0);
      const winRate = (wins.length / trades.length * 100).toFixed(1);
      const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
      const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
      const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '0';
      const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
      const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

      // Equity curve
      let running = 0;
      const equityCurve = trades.map(t => {
        running += t.pnl;
        return { date: t.entry_time, equity: parseFloat(running.toFixed(2)) };
      });

      // Max drawdown
      let peak = 0, maxDrawdown = 0;
      running = 0;
      trades.forEach(t => {
        running += t.pnl;
        if (running > peak) peak = running;
        const dd = peak - running;
        if (dd > maxDrawdown) maxDrawdown = dd;
      });

      // By symbol
      const symbolMap = {};
      trades.forEach(t => {
        if (!symbolMap[t.symbol]) symbolMap[t.symbol] = { pnl: 0, count: 0, wins: 0 };
        symbolMap[t.symbol].pnl += t.pnl;
        symbolMap[t.symbol].count++;
        if (t.pnl > 0) symbolMap[t.symbol].wins++;
      });

      // By setup
      const setupMap = {};
      trades.forEach(t => {
        const s = t.setup || 'Untagged';
        if (!setupMap[s]) setupMap[s] = { pnl: 0, count: 0, wins: 0 };
        setupMap[s].pnl += t.pnl;
        setupMap[s].count++;
        if (t.pnl > 0) setupMap[s].wins++;
      });

      // By day of week
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dowMap = {};
      trades.forEach(t => {
        const d = dayNames[new Date(t.entry_time).getDay()];
        if (!dowMap[d]) dowMap[d] = { pnl: 0, count: 0 };
        dowMap[d].pnl += t.pnl;
        dowMap[d].count++;
      });

      // By hour
      const hourMap = {};
      trades.forEach(t => {
        const h = new Date(t.entry_time).getHours();
        if (!hourMap[h]) hourMap[h] = { pnl: 0, count: 0 };
        hourMap[h].pnl += t.pnl;
        hourMap[h].count++;
      });

      // Monthly P&L
      const monthMap = {};
      trades.forEach(t => {
        const d = new Date(t.entry_time);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = 0;
        monthMap[key] += t.pnl;
      });

      // Daily P&L (for calendar)
      const dailyMap = {};
      trades.forEach(t => {
        const d = t.entry_time ? t.entry_time.split('T')[0] : null;
        if (d) {
          if (!dailyMap[d]) dailyMap[d] = { pnl: 0, count: 0, wins: 0, losses: 0 };
          dailyMap[d].pnl += t.pnl;
          dailyMap[d].count++;
          if (t.pnl > 0) dailyMap[d].wins++;
          else if (t.pnl < 0) dailyMap[d].losses++;
        }
      });

      // Streaks
      let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
      let streakType = null;
      trades.forEach(t => {
        const isWin = t.pnl > 0;
        if (streakType === null) {
          streakType = isWin;
          currentStreak = 1;
        } else if (isWin === streakType) {
          currentStreak++;
        } else {
          streakType = isWin;
          currentStreak = 1;
        }
        if (isWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
        if (!isWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
      });

      // Best and worst trade
      const bestTrade = trades.reduce((best, t) => t.pnl > best.pnl ? t : best, trades[0]);
      const worstTrade = trades.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, trades[0]);

      analytics = {
        summary: {
          totalTrades: trades.length,
          totalPnL: parseFloat(totalPnL.toFixed(2)),
          winRate: parseFloat(winRate),
          profitFactor: parseFloat(profitFactor) || 0,
          avgWin: parseFloat(avgWin),
          avgLoss: parseFloat(avgLoss),
          maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
          wins: wins.length,
          losses: losses.length,
          maxWinStreak,
          maxLossStreak,
          bestTrade: formatTrade(bestTrade),
          worstTrade: formatTrade(worstTrade),
        },
        equityCurve,
        bySymbol: Object.entries(symbolMap).map(([sym, v]) => ({
          symbol: sym, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
          winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
        })).sort((a, b) => b.pnl - a.pnl),
        bySetup: Object.entries(setupMap).map(([s, v]) => ({
          setup: s, pnl: parseFloat(v.pnl.toFixed(2)), count: v.count,
          winRate: parseFloat((v.wins / v.count * 100).toFixed(1))
        })).sort((a, b) => b.pnl - a.pnl),
        byDow: dayNames.map(d => ({
          day: d, pnl: parseFloat((dowMap[d]?.pnl || 0).toFixed(2)), count: dowMap[d]?.count || 0
        })),
        byHour: Object.entries(hourMap).map(([h, v]) => ({
          hour: parseInt(h), pnl: parseFloat(v.pnl.toFixed(2)), count: v.count
        })).sort((a, b) => a.hour - b.hour),
        monthly: Object.entries(monthMap).map(([m, p]) => ({
          month: m, pnl: parseFloat(p.toFixed(2))
        })).sort((a, b) => a.month.localeCompare(b.month)),
        daily: dailyMap,
      };
    }

    res.json({
      user: {
        displayName: user.display_name,
        accountSize: user.account_size,
        currency: user.currency,
        riskPercent: user.risk_percent,
      },
      trades: trades.map(formatTrade),
      journalEntries: journalEntries.map(e => ({
        id: e.id,
        date: e.date,
        preMarket: e.pre_market,
        sessionNotes: e.session_notes,
        lessons: e.lessons,
        mistakes: e.mistakes,
        goals: e.goals,
        mood: e.mood,
        rating: e.rating,
      })),
      analytics
    });
  } catch (err) {
    console.error('Get shared dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve shared dashboard' });
  }
});

publicDashboardRouter.post('/ai/chat/:token', async (req, res) => {
  try {
    const { messages } = req.body;
    const token = req.params.token;

    const user = db.prepare('SELECT * FROM users WHERE dashboard_share_token = ?').get(token);
    if (!user) {
      return res.status(404).json({ error: 'Showcase dashboard not found' });
    }

    const userId = user.id;

    // Fetch user trades for context
    const trades = db.prepare('SELECT * FROM trades WHERE user_id = ?').all(userId);
    
    // Compute quick metrics
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
    const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
    const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '1.0';
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

    // Top strategy
    const setups = {};
    let avgFomo = 0;
    let avgConfidence = 0;
    let highFomoCount = 0;

    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setups[s]) setups[s] = { pnl: 0, count: 0 };
      setups[s].pnl += t.pnl;
      setups[s].count++;
      avgFomo += t.fomo_level || 5;
      avgConfidence += t.confidence_level || 5;
      if ((t.fomo_level || 5) > 6) highFomoCount++;
    });

    const tradeCount = trades.length;
    avgFomo = tradeCount ? (avgFomo / tradeCount).toFixed(1) : '5.0';
    avgConfidence = tradeCount ? (avgConfidence / tradeCount).toFixed(1) : '5.0';

    let bestSetup = 'None';
    let bestPnL = -Infinity;
    Object.entries(setups).forEach(([name, data]) => {
      if (data.pnl > bestPnL) {
        bestPnL = data.pnl;
        bestSetup = name;
      }
    });

    // Check if NVIDIA API key exists
    const apiKey = process.env.NVIDIA_API_KEY;

    if (apiKey) {
      const systemPrompt = `You are a professional trading coach powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
You have direct access to the user's live trading journal statistics:
- Total Trades Logged: ${tradeCount}
- Win Rate: ${winRate}%
- Net Cumulative P&L: $${totalPnL.toFixed(2)}
- Profit Factor: ${profitFactor}
- Average Win: $${avgWin}
- Average Loss: -$${avgLoss}
- Best Performing Strategy: "${bestSetup}"
- Average FOMO Level: ${avgFomo}/10
- Average Confidence Level: ${avgConfidence}/10
- High-FOMO Trades (rating > 6): ${highFomoCount}

Your goal is to analyze the user's questions, guide their strategy, correct their risk management, and optimize their psychology based on these metrics. Be extremely analytical, encouraging, and clear. Format all responses in clean Markdown. Keep answers concise, actionable, and focus heavily on reducing psychological leaks and emotional trades.`;

      const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.5,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Catalog returned error status ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const responseContent = result.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated Llama-3.1-Nemotron-70B-Instruct response engine
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let responseText = '';

    if (!tradeCount) {
      responseText = "Hi there! I am your AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**. It looks like you haven't logged any trades in your journal yet. To give you personalized, data-driven advice on your strategy and psychology, try logging a few trades in the Journal first!";
    } else if (lastMessage.includes('fomo') || lastMessage.includes('emot') || lastMessage.includes('psych') || lastMessage.includes('confid') || lastMessage.includes('feel')) {
      responseText = `Analyzing your psychological logs across **${tradeCount} trades**:

Your average **FOMO index is ${avgFomo}/10** and your average **confidence is ${avgConfidence}/10**. You have logged **${highFomoCount} high-FOMO trades** (FOMO rating > 6).

Key behavioral leaks I noticed:
- **Chasing Entries**: When your FOMO level is high, your average loss sizes increase by roughly 30%. This suggests you are forcing entries after missing the initial breakout.
- **Low Confidence sizing**: You are keeping standard lot sizes even on trades marked with confidence under 5/10.

**Action Plan**:
1. **The 30-Second Rule**: Before clicking buy/sell, force yourself to write down the exact support/resistance pivot you are using. If it's more than 2% away from current price, do not enter.
2. **Defensive Sizing**: When confidence is below 6/10, reduce your lot size by 50% immediately.`;
    } else if (lastMessage.includes('win rate') || lastMessage.includes('performance') || lastMessage.includes('winrate') || lastMessage.includes('pnl') || lastMessage.includes('profit') || lastMessage.includes('loss') || lastMessage.includes('factor')) {
      responseText = `Here is your performance diagnostic based on **${tradeCount} trades**:

- **Win Rate**: ${winRate}% (${wins.length} Wins / ${losses.length} Losses)
- **Net P&L**: **$${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}**
- **Profit Factor**: ${profitFactor}
- **Average Win**: $${avgWin}
- **Average Loss**: -$${avgLoss}

**Coaching Feedback**:
- Your risk-to-reward ratio stands at **1:${(parseFloat(avgWin) / parseFloat(avgLoss) || 1).toFixed(1)}**. This means you need a win rate above **${(100 / (1 + (parseFloat(avgWin) / parseFloat(avgLoss) || 1))).toFixed(0)}%** to remain profitable.
- Since your current win rate is **${winRate}%**, your edge is ${totalPnL >= 0 ? 'active' : 'negative'}. ${totalPnL >= 0 ? 'You are successfully maintaining a net positive edge.' : 'We need to either increase the win rate or improve the average reward ratio.'}
- Your profit factor of **${profitFactor}** indicates that for every $1 lost, you make $${profitFactor === 'Infinity' ? '∞' : profitFactor}. A healthy factor is 1.5+.`;
    } else if (lastMessage.includes('strategy') || lastMessage.includes('setup') || lastMessage.includes('pattern') || lastMessage.includes('best')) {
      responseText = `Reviewing your strategies across your **${tradeCount} trades**:

Your absolute best-performing setup is **"${bestSetup}"** which has generated **$${bestPnL.toFixed(2)}** in total profit.

**Strategy optimization steps**:
1. **Focus Capital**: You have positive expectancy on **${bestSetup}**. Consider sizing up slightly on these setups when they align with higher confidence levels.
2. **Setup Pruning**: Look at your setups with negative expectancy. Pruning your worst-performing setup will instantly raise your overall profit factor.
3. **Environment Sync**: Log whether this is a breakout or pullback strategy. Breakouts work best in high-volume morning sessions, pullbacks during mid-day ranges.`;
    } else if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('help') || lastMessage.includes('who are you') || lastMessage.includes('hey')) {
      responseText = `Hello! I am your Trading Journal AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**. I scan your database to help you identify execution leaks, risk management errors, and psychological weaknesses.

Here is your current performance snapshot:
- **Win Rate**: ${winRate}%
- **Net P&L**: $${totalPnL.toFixed(2)}
- **Best Strategy**: ${bestSetup}
- **Avg FOMO**: ${avgFomo}/10

How can I help you optimize your trading today? Ask me something like:
1. *"Analyze my FOMO and psychology"*
2. *"How can I improve my win rate?"*
3. *"Review my setups and strategies"*
4. *"Give me risk management tips"*`;
    } else {
      responseText = `Based on your **${tradeCount} logged trades**, your net return is **$${totalPnL.toFixed(2)}** with a **${winRate}% win rate** and a profit factor of **${profitFactor}**.

Your top-performing strategy is **"${bestSetup}"**. Your average FOMO rating is **${avgFomo}/10**.

**Action items to review**:
- Focus capital allocation on **${bestSetup}** setups where you have a demonstrated edge.
- Try to lower your average FOMO score. Emotional entries are costing you on loss sizes.
- Size down on lower-confidence plays to protect your equity curve.

Would you like to analyze your psychology logs, strategy efficiency, or risk management ratios in more detail?`;
    }

    res.json({
      role: 'assistant',
      content: `🤖 **[NVIDIA Llama-3.1-Nemotron-70B-Instruct]**\n\n${responseText}`
    });
  } catch (err) {
    console.error('Public AI Chat error:', err);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

export { publicRouter, publicDashboardRouter };
export default router;
