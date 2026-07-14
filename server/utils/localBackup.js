import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

let firebaseAdminInitialized = false;

// Initialize Firebase Admin SDK lazily
function initFirebaseAdmin() {
  if (firebaseAdminInitialized) return true;
  try {
    // If running locally without credentials/config, skip
    if (!process.env.FIREBASE_CONFIG && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return false;
    }
    
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    firebaseAdminInitialized = true;
    return true;
  } catch (err) {
    console.warn('[Firebase Backup] Failed to initialize Firebase Admin:', err.message);
    return false;
  }
}

// Upload backup JSON directly to Firebase Cloud Storage bucket
export async function uploadToFirebaseStorage(userId, backupData) {
  if (!initFirebaseAdmin()) {
    console.log('[Firebase Backup] Skipping Cloud Storage backup (Firebase Admin not initialized).');
    return null;
  }

  try {
    const bucket = admin.storage().bucket();
    const fileName = `backups/user_${userId}_backup.json`;
    const file = bucket.file(fileName);

    // Save JSON to storage bucket
    await file.save(JSON.stringify(backupData, null, 2), {
      metadata: {
        contentType: 'application/json',
        metadata: {
          userId: userId.toString(),
          exportedAt: new Date().toISOString()
        }
      }
    });

    console.log(`[Firebase Backup] Successfully stored backup on Firebase Cloud Storage: ${fileName}`);

    // Generate signed URL (valid for far future) so the user can download it
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });
    return url;
  } catch (err) {
    console.error('[Firebase Backup] Error saving backup to Firebase Storage:', err);
    throw err;
  }
}

// Write backup file locally and also upload to Firebase if available
export async function writeLocalBackup(userId) {
  try {
    // 1. Get user details
    const userResult = await db.query('SELECT display_name, account_size, currency, risk_percent, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new Error('User not found.');
    }
    const user = userResult.rows[0];

    // Helper to safely parse JSON columns
    const safeParse = (str) => {
      try {
        return JSON.parse(str || '[]');
      } catch {
        return [];
      }
    };

    // 2. Fetch all user data in parallel
    const [
      tradesResult,
      journalResult,
      accountsResult,
      achievementsResult,
      rulesResult,
      stoicResult,
      notionResult
    ] = await Promise.all([
      db.query('SELECT * FROM trades WHERE user_id = $1 ORDER BY entry_time DESC', [userId]),
      db.query('SELECT * FROM journal_entries WHERE user_id = $1 ORDER BY date DESC', [userId]),
      db.query('SELECT * FROM accounts WHERE user_id = $1 ORDER BY id ASC', [userId]),
      db.query('SELECT * FROM achievements WHERE user_id = $1 ORDER BY date DESC', [userId]),
      db.query('SELECT * FROM trading_rules WHERE user_id = $1 ORDER BY id ASC', [userId]),
      db.query('SELECT * FROM stoic_reframings WHERE user_id = $1 ORDER BY id DESC', [userId]),
      db.query('SELECT * FROM notion_documents WHERE user_id = $1 ORDER BY updated_at DESC', [userId])
    ]);

    // 3. Assemble the backup structure
    const backupData = {
      version: "2.1.0",
      exportedAt: new Date().toISOString(),
      user: {
        displayName: user.display_name,
        accountSize: user.account_size,
        currency: user.currency,
        riskPercent: user.risk_percent,
        email: user.email
      },
      trades: tradesResult.rows.map(t => ({
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
        accountId: t.account_id,
        notionLink: t.notion_link || '',
        riskRewardRatio: t.risk_reward_ratio || 0,
        createdAt: t.created_at
      })),
      journalEntries: journalResult.rows.map(j => ({
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
      })),
      accounts: accountsResult.rows.map(a => ({
        accountName: a.account_name,
        accountType: a.account_type,
        balance: a.balance,
        currency: a.currency,
        status: a.status,
        notionLink: a.notion_link || '',
        notes: a.notes || '',
        profitTarget: a.profit_target || 0,
        maxLossLimit: a.max_loss_limit || 0,
        consistencyRule: a.consistency_rule || 0,
        useTrailingDrawdown: a.use_trailing_drawdown || false,
        createdAt: a.created_at
      })),
      achievements: achievementsResult.rows.map(ac => ({
        title: ac.title,
        type: ac.type,
        accountName: ac.account_name || '',
        amount: ac.amount || 0,
        date: ac.date,
        certificateImagePath: ac.certificate_image_path || '',
        notes: ac.notes || '',
        createdAt: ac.created_at
      })),
      tradingRules: rulesResult.rows.map(r => ({
        accountId: r.account_id,
        ruleText: r.rule_text,
        isActive: r.is_active,
        passedCount: r.passed_count || 0,
        failedCount: r.failed_count || 0,
        createdAt: r.created_at
      })),
      stoicReframings: stoicResult.rows.map(s => ({
        situation: s.situation,
        inControl: s.in_control,
        outOfControl: s.out_of_control,
        stoicReframe: s.stoic_reframe,
        createdAt: s.created_at
      })),
      notionDocuments: notionResult.rows.map(n => ({
        title: n.title,
        content: n.content || '',
        icon: n.icon || '📄',
        tags: safeParse(n.tags),
        externalUrl: n.external_url || '',
        createdAt: n.created_at,
        updatedAt: n.updated_at
      }))
    };

    // 4. Save to local file system if NOT in production cloud mode
    let localPath = null;
    if (!process.env.VERCEL && !process.env.FIREBASE_CONFIG && process.env.NODE_ENV !== 'production') {
      const backupPath = path.join(rootDir, 'trading_journal_backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log(`[Local Backup] Successfully wrote trading journal data to: ${backupPath}`);
      localPath = backupPath;
    }

    // 5. Save to Firebase Storage if configuration exists
    let firebaseUrl = null;
    try {
      firebaseUrl = await uploadToFirebaseStorage(userId, backupData);
    } catch (fbErr) {
      console.error('[Firebase Backup] Failed to upload backup to Firebase Storage:', fbErr);
    }

    return { localPath, firebaseUrl };
  } catch (err) {
    console.error('[Backup Service] Failed to process backup:', err);
    throw err;
  }
}
