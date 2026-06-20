import './utils/env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import authRoutes from './routes/auth.js';
import tradeRoutes, { publicRouter as publicTradeRoutes, publicDashboardRouter } from './routes/trades.js';
import journalRoutes from './routes/journal.js';
import aiRoutes from './routes/ai.js';
import tradingviewRoutes from './routes/tradingview.js';
import mt5Routes from './routes/mt5.js';
import backupRoutes from './routes/backup.js';
import newsRoutes from './routes/news.js';
import notionRoutes from './routes/notion.js';
import stoicRoutes from './routes/stoic.js';
import tradovateRoutes from './routes/tradovate.js';
import accountsRoutes from './routes/accounts.js';
import achievementsRoutes from './routes/achievements.js';
import { startNewsAgent } from './utils/news_agent.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

let dbInitialized = false;

// Middleware to lazily initialize PostgreSQL tables on the first Vercel serverless request
app.use(async (req, res, next) => {
  if (process.env.VERCEL && !dbInitialized) {
    try {
      await db.initDB();
      dbInitialized = true;
    } catch (err) {
      console.error('Vercel lazy DB initialization failed:', err);
    }
  }
  next();
});

// ─── Middleware ──────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:4173',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173',
      'https://deft-salmiakki-522460.netlify.app',
      'https://trading-journal-kappa-eight.vercel.app'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    try {
      const url = new URL(origin);
      const hostname = url.hostname;

      const isTunnel = hostname.endsWith('.tunnelmole.net') || 
                       hostname.endsWith('.loca.lt');

      const isLocalIp = hostname === 'localhost' ||
                        hostname === '127.0.0.1' ||
                        /^192\.168\.\d+\.\d+$/.test(hostname) ||
                        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
                        /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname);

      const isVercel = hostname === 'trading-journal-kappa-eight.vercel.app' ||
                       hostname.endsWith('.vercel.app');

      if (isTunnel || isLocalIp || isVercel) {
        return callback(null, true);
      }
    } catch (e) {
      // If URL parsing fails, ignore and deny
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded chart images
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'data', 'uploads');
app.use('/api/uploads', express.static(uploadsDir));

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Public Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/public/trades', publicTradeRoutes);
app.use('/api/public/dashboard', publicDashboardRouter);

// ─── Protected Routes ────────────────────────────────
app.use('/api/trades', authenticateToken, tradeRoutes);
app.use('/api/journal', authenticateToken, journalRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/tradingview', authenticateToken, tradingviewRoutes);
app.use('/api/mt5', authenticateToken, mt5Routes);
app.use('/api/backup', authenticateToken, backupRoutes);
app.use('/api/news', authenticateToken, newsRoutes);
app.use('/api/notion', (req, res, next) => {
  if (req.path === '/proxy' || req.path.startsWith('/proxy/') || req.path.startsWith('/proxy-asset/')) {
    return next();
  }
  authenticateToken(req, res, next);
}, notionRoutes);
app.use('/api/stoic', authenticateToken, stoicRoutes);
app.use('/api/tradovate', authenticateToken, tradovateRoutes);
app.use('/api/accounts', authenticateToken, accountsRoutes);
app.use('/api/achievements', authenticateToken, achievementsRoutes);

// Serve static client assets in production (unified full-stack deployment)
const distDir = path.resolve(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*splat', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ─── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start (async to initialize PostgreSQL first) ────
async function start() {
  try {
    // Only run normal startup if not on Vercel
    if (!process.env.VERCEL) {
      // Initialize PostgreSQL database tables
      try {
        await db.initDB();
      } catch (dbErr) {
        console.warn('\n  ⚠️ PostgreSQL database connection failed.');
        console.warn('  Some backend cloud features may be offline.');
        console.warn(`  Error details: ${dbErr.message}\n`);
      }

      app.listen(PORT, () => {
        console.log(`\n  ⚡ Trading Journal API running at http://localhost:${PORT}`);
        console.log(`  📊 Health check: http://localhost:${PORT}/api/health`);
        console.log(`  🐘 Database: PostgreSQL\n`);
        
        // Start background news synchronization agent
        startNewsAgent();
      });
    }
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;
