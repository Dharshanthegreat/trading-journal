import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for certificates uploads
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '..', 'data', 'uploads');
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
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM achievements WHERE user_id = $1 ORDER BY date DESC', [req.user.id]);
    
    const formatted = result.rows.map(a => ({
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
router.post('/', upload.single('certificate'), async (req, res) => {
  try {
    const { title, type, accountName, amount, date, notes } = req.body;
    const userId = req.user.id;

    if (!title || !type || !date) {
      return res.status(400).json({ error: 'Title, Type, and Date are required' });
    }

    const imagePath = req.file ? req.file.path : '';

    const result = await db.query(`
      INSERT INTO achievements (user_id, title, type, account_name, amount, date, certificate_image_path, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      userId,
      title,
      type,
      accountName || '',
      parseFloat(amount) || 0,
      date,
      imagePath,
      notes || ''
    ]);

    const a = result.rows[0];
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
router.delete('/:id', async (req, res) => {
  try {
    const achievementId = req.params.id;
    const userId = req.user.id;

    const result = await db.query('SELECT * FROM achievements WHERE id = $1 AND user_id = $2', [achievementId, userId]);
    const a = result.rows[0];
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

    await db.query('DELETE FROM achievements WHERE id = $1', [achievementId]);
    res.json({ success: true, message: 'Achievement deleted' });
  } catch (err) {
    console.error('Delete achievement error:', err);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

// ─── Update Achievement ───────────────────────────────
router.put('/:id', upload.single('certificate'), async (req, res) => {
  try {
    const achievementId = req.params.id;
    const userId = req.user.id;
    const { title, type, accountName, amount, date, notes } = req.body;

    const check = await db.query('SELECT * FROM achievements WHERE id = $1 AND user_id = $2', [achievementId, userId]);
    const oldA = check.rows[0];
    if (!oldA) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    let imagePath = oldA.certificate_image_path;
    if (req.file) {
      // Delete old file if exists
      if (imagePath && fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Failed to delete old certificate file:', err);
        }
      }
      imagePath = req.file.path;
    }

    const result = await db.query(`
      UPDATE achievements 
      SET title = $1, type = $2, account_name = $3, amount = $4, date = $5, certificate_image_path = $6, notes = $7
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `, [
      title || oldA.title,
      type || oldA.type,
      accountName !== undefined ? accountName : oldA.account_name,
      amount !== undefined ? parseFloat(amount) : oldA.amount,
      date || oldA.date,
      imagePath,
      notes !== undefined ? notes : oldA.notes,
      achievementId,
      userId
    ]);

    const a = result.rows[0];
    res.json({
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
    console.error('Update achievement error:', err);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

export default router;
