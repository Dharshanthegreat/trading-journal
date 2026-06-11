import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import tradeRoutes, { publicRouter as publicTradeRoutes } from './routes/trades.js';
import journalRoutes from './routes/journal.js';
import aiRoutes from './routes/ai.js';
import tradingviewRoutes from './routes/tradingview.js';
import mt5Routes from './routes/mt5.js';
import { authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded chart images
const uploadsDir = path.join(__dirname, 'data', 'uploads');
app.use('/api/uploads', express.static(uploadsDir));

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Public Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/public/trades', publicTradeRoutes);

// ─── Protected Routes ────────────────────────────────
app.use('/api/trades', authenticateToken, tradeRoutes);
app.use('/api/journal', authenticateToken, journalRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/tradingview', authenticateToken, tradingviewRoutes);
app.use('/api/mt5', authenticateToken, mt5Routes);

// ─── Error Handler ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ⚡ Trading Journal API running at http://localhost:${PORT}`);
  console.log(`  📊 Health check: http://localhost:${PORT}/api/health\n`);
});
