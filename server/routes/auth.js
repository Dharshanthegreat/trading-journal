import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import nodemailer from 'nodemailer';
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
        dashboardShareToken: user.dashboard_share_token,
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
        dashboardShareToken: user.dashboard_share_token,
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
      dashboardShareToken: user.dashboard_share_token,
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
      dashboardShareToken: user.dashboard_share_token,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── Generate Showcase Link ──────────────────────────
router.post('/share-dashboard', authenticateToken, (req, res) => {
  try {
    const token = crypto.randomUUID();
    db.prepare('UPDATE users SET dashboard_share_token = ? WHERE id = ?').run(token, req.user.id);
    res.json({ dashboardShareToken: token });
  } catch (err) {
    console.error('Share dashboard error:', err);
    res.status(500).json({ error: 'Failed to generate showcase link' });
  }
});

// ─── Revoke Showcase Link ────────────────────────────
router.delete('/share-dashboard', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE users SET dashboard_share_token = NULL WHERE id = ?').run(req.user.id);
    res.json({ message: 'Showcase link revoked' });
  } catch (err) {
    console.error('Revoke dashboard error:', err);
    res.status(500).json({ error: 'Failed to revoke showcase link' });
  }
});

// Memory cache for reset codes
const resetCodes = new Map();

// ─── Forgot Password (Code Generator) ────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(404).json({ error: 'No user registered with this email' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"Trading Journal" <${smtpUser}>`;

    // Generate random 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    console.log(`[ForgotPassword] Reset code generated: ${code}`);

    resetCodes.set(email, { code, expires });

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('SMTP credentials not configured in .env file. Unable to send email.');
      return res.status(500).json({
        error: 'SMTP email server is not configured in the server .env file. Email delivery is required to receive the recovery code.'
      });
    }

    // Send email using nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: smtpFrom,
      to: email,
      subject: 'Trading Journal Password Reset Code',
      text: `Your password reset code is: ${code}\n\nThis code will expire in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46ec;">Trading Journal Password Reset</h2>
          <p>We received a request to reset your password.</p>
          <p>Your 6-digit verification code is:</p>
          <div style="background-color: #f3f4f6; padding: 12px 24px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #111827; display: inline-block; border-radius: 6px; margin: 10px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes. If you did not request this reset, you can safely ignore this email.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset code successfully sent to email: ${email}`);

    res.json({ message: 'Reset code successfully sent to your email address.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset code email. Check your SMTP settings.' });
  }
});

// ─── Reset Password (Verification & Save) ────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const entry = resetCodes.get(email);
    if (!entry || entry.code !== code || entry.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update in database
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(passwordHash, email);
    
    // Clear code
    resetCodes.delete(email);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ─── Change Password ─────────────────────────────────
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// ─── Logout ──────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

export default router;
