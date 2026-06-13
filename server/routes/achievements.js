import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for certificates uploads
const uploadsDir = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `cert_${req.user.id}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

const router = Router();

// ─── Get All Achievements ─────────────────────────────
router.get('/', (req, res) => {
  try {
    const achievements = db.prepare('SELECT * FROM achievements WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    
    const formatted = achievements.map(a => ({
      id: a.id,
      title: a.title,
      type: a.type,
      accountName: a.account_name,
      amount: a.amount,
      date: a.date,
      notes: a.notes,
      certificateUrl: a.certificate_image_path ? `/api/uploads/${path.basename(a.certificate_image_path)}` : null,
      createdAt: a.created_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get achievements error:', err);
    res.status(500).json({ error: 'Failed to retrieve achievements' });
  }
});

// ─── Create Achievement ───────────────────────────────
router.post('/', upload.single('certificate'), (req, res) => {
  try {
    const { title, type, accountName, amount, date, notes } = req.body;
    const userId = req.user.id;

    if (!title || !type || !date) {
      return res.status(400).json({ error: 'Title, Type, and Date are required' });
    }

    const imagePath = req.file ? req.file.path : '';

    const result = db.prepare(`
      INSERT INTO achievements (user_id, title, type, account_name, amount, date, certificate_image_path, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      title,
      type, // 'passed', 'payout', 'failed'
      accountName || '',
      parseFloat(amount) || 0,
      date,
      imagePath,
      notes || ''
    );

    const a = db.prepare('SELECT * FROM achievements WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      id: a.id,
      title: a.title,
      type: a.type,
      accountName: a.account_name,
      amount: a.amount,
      date: a.date,
      notes: a.notes,
      certificateUrl: a.certificate_image_path ? `/api/uploads/${path.basename(a.certificate_image_path)}` : null,
      createdAt: a.created_at,
    });
  } catch (err) {
    console.error('Create achievement error:', err);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

// ─── Delete Achievement ───────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const achievementId = req.params.id;
    const userId = req.user.id;

    const a = db.prepare('SELECT * FROM achievements WHERE id = ? AND user_id = ?').get(achievementId, userId);
    if (!a) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Delete file if it exists
    if (a.certificate_image_path && fs.existsSync(a.certificate_image_path)) {
      try {
        fs.unlinkSync(a.certificate_image_path);
      } catch (err) {
        console.error('Failed to delete certificate file:', err);
      }
    }

    db.prepare('DELETE FROM achievements WHERE id = ?').run(achievementId);
    res.json({ success: true, message: 'Achievement deleted' });
  } catch (err) {
    console.error('Delete achievement error:', err);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

export default router;
