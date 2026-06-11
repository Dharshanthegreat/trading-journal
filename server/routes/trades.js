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
      fomoLevel, confidenceLevel
    } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const imagePath = req.file ? req.file.path : '';

    const result = db.prepare(`
      INSERT INTO trades (
        user_id, symbol, type, entry_price, exit_price, lot_size, stop_loss, take_profit,
        pnl, entry_time, exit_time, setup, grade, notes, tags, emotion_tags,
        fomo_level, confidence_level, image_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      imagePath
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
      fomoLevel, confidenceLevel
    } = req.body;

    const imagePath = req.file ? req.file.path : trade.image_path;

    db.prepare(`
      UPDATE trades SET
        symbol = ?, type = ?, entry_price = ?, exit_price = ?, lot_size = ?,
        stop_loss = ?, take_profit = ?, pnl = ?, entry_time = ?, exit_time = ?,
        setup = ?, grade = ?, notes = ?, tags = ?, emotion_tags = ?,
        fomo_level = ?, confidence_level = ?, image_path = ?
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

export { publicRouter };
export default router;
