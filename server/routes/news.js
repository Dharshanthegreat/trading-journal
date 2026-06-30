import { Router } from 'express';
import db from '../db.js';
import { syncNewsData } from '../utils/news_agent.js';

const router = Router();

// In-memory cache for Forex Factory calendar
let newsCache = null;
let newsCacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes cache

// Simple rate limiter for AI requests
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 15;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// GET /api/news - Fetch monthly economic calendar news events (real Forex Factory data only)
router.get('/', async (req, res) => {
  try {
    const reqYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const reqMonth = req.query.month ? parseInt(req.query.month) : new Date().getMonth();

    // Lazy sync on the fly if needed (every 30 minutes, or if DB has no entries)
    try {
      const syncCheck = await db.query('SELECT MAX(updated_at) as last_update FROM economic_news');
      const lastUpdate = syncCheck.rows[0]?.last_update;
      const shouldSync = !lastUpdate || (new Date() - new Date(lastUpdate)) > 30 * 60 * 1000;
      if (shouldSync) {
        console.log('[News Route] Lazy synchronizing economic news from Forex Factory...');
        await syncNewsData().catch(err => {
          console.error('[News Route] Lazy sync failed:', err);
        });
      }
    } catch (syncErr) {
      console.error('[News Route] Lazy sync check failed:', syncErr);
    }

    // Query real Forex Factory events from PostgreSQL, filtered by the requested month
    let events = [];
    try {
      const result = await db.query(`
        SELECT title, country, date, impact, forecast, previous 
        FROM economic_news
        ORDER BY date ASC
      `);
      
      // Filter events to the requested month (dates are stored as timezone-offset strings)
      events = result.rows.filter(e => {
        try {
          const d = new Date(e.date);
          return d.getFullYear() === reqYear && d.getMonth() === reqMonth;
        } catch {
          return false;
        }
      });
    } catch (err) {
      console.error('Failed to retrieve news events from PostgreSQL:', err);
    }

    // If DB returned no events for this month, try fetching live from Forex Factory CDN
    if (events.length === 0) {
      try {
        const ffResponse = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
        if (ffResponse.ok) {
          const ffData = await ffResponse.json();
          if (Array.isArray(ffData)) {
            events = ffData.filter(e => {
              try {
                const d = new Date(e.date);
                return d.getFullYear() === reqYear && d.getMonth() === reqMonth;
              } catch {
                return false;
              }
            });
          }
        }
      } catch (ffErr) {
        console.error('[News Route] Direct Forex Factory fetch failed:', ffErr);
      }
    }

    res.json(events);
  } catch (err) {
    console.error('Failed to retrieve economic calendar:', err);
    res.status(500).json({ error: 'Failed to retrieve economic calendar' });
  }
});

// POST /api/news/analyze - Analyze specific news event with Nvidia AI
router.post('/analyze', async (req, res) => {
  try {
    const { event, messages } = req.body;
    const userId = req.user.id;

    if (!event) {
      return res.status(400).json({ error: 'Economic news event is required for analysis.' });
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute before sending more messages.' });
    }

    const { title, country, date, impact, forecast, previous } = event;
    const apiKey = req.headers['x-nvidia-api-key'] || req.body.nvidiaApiKey || process.env.NVIDIA_API_KEY;

    const systemPrompt = `You are a professional macroeconomic analyst and Forex coach powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
You are analyzing the following news event:
- Economic Indicator: ${title}
- Currency / Country: ${country}
- Scheduled Time: ${date}
- Impact Level: ${impact}
- Market Forecast: ${forecast || 'N/A'}
- Previous Value: ${previous || 'N/A'}

Provide structured market analysis in neat Markdown.`;

    if (apiKey) {
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

    // Fallback
    const impactUpper = (impact || '').toUpperCase();
    const fallbackText = `🤖 **[NVIDIA Llama-3.1-Nemotron-70B-Instruct - Simulated Analyst]**\n\n### Economic Significance of **${title}** (${country})\nThis is flagged as a **${impact}** impact release for the **${country}** economy.\n\n### Potential Market Scenarios\n* **Bullish Scenario (Actual > Forecast)**: Stronger than expected figures will support the **${country}** currency.\n* **Bearish Scenario (Actual < Forecast)**: Weaker than expected figures will trigger a sell-off.\n\n### Risk Management Rules\n1. **Reduce Risk by 50%** before the release.\n2. **The 5-Minute Candle Filter**: Wait for the 5-minute candle to close to establish clear direction.`;

    res.json({
      role: 'assistant',
      content: fallbackText
    });
  } catch (err) {
    console.error('AI News analysis error:', err);
    res.status(500).json({ error: 'Failed to generate economic news analysis' });
  }
});

export default router;
