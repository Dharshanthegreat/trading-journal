import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, authenticateToken } from '../middleware/auth.js';

const router = Router();

// ─── Register ────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = db.prepare(
      'INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)'
    ).run(email, passwordHash, displayName || 'Trader');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        accountSize: user.account_size,
        currency: user.currency,
        riskPercent: user.risk_percent,
      },
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// ─── Login ───────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        accountSize: user.account_size,
        currency: user.currency,
        riskPercent: user.risk_percent,
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── Get Current User ────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  // This route uses the auth middleware applied in server.js
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      accountSize: user.account_size,
      currency: user.currency,
      riskPercent: user.risk_percent,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ─── Update Profile ──────────────────────────────────
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { displayName, accountSize, currency, riskPercent } = req.body;

    db.prepare(`
      UPDATE users SET
        display_name = COALESCE(?, display_name),
        account_size = COALESCE(?, account_size),
        currency = COALESCE(?, currency),
        risk_percent = COALESCE(?, risk_percent)
      WHERE id = ?
    `).run(displayName, accountSize, currency, riskPercent, req.user.id);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      accountSize: user.account_size,
      currency: user.currency,
      riskPercent: user.risk_percent,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── Logout ──────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
