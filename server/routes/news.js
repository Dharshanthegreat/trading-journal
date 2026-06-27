import { Router } from 'express';
import db from '../db.js';

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

// Deterministic generator to populate a full month's economic events
function generateMonthlyEvents(year, month, realEvents) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventsList = [];

  const realEventDays = new Set();
  if (Array.isArray(realEvents)) {
    realEvents.forEach(e => {
      try {
        const d = new Date(e.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          eventsList.push(e);
          realEventDays.add(d.getDate());
        }
      } catch (err) {
        // Skip invalid real events
      }
    });
  }

  const currencies = ['USD', 'EUR', 'GBP', 'AUD', 'JPY', 'CAD', 'CHF', 'NZD'];
  const eventTemplates = [
    { title: 'CPI m/m', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'AUD'] },
    { title: 'Core CPI y/y', impact: 'High', currencies: ['USD', 'EUR', 'GBP'] },
    { title: 'Unemployment Rate', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] },
    { title: 'GDP q/q', impact: 'High', currencies: ['USD', 'GBP', 'EUR', 'AUD'] },
    { title: 'Interest Rate Decision', impact: 'High', currencies: ['USD', 'EUR', 'GBP', 'AUD'] },
    { title: 'Retail Sales m/m', impact: 'Medium', currencies: ['USD', 'GBP', 'AUD'] },
    { title: 'OPEC-JMMC Meetings', impact: 'Medium', currencies: ['CAD'] },
    { title: 'PMI Economic Outlook', impact: 'Medium', currencies: ['EUR', 'GBP', 'USD'] },
    { title: 'Producer Price Index (PPI)', impact: 'Low', currencies: ['USD', 'EUR'] },
    { title: 'Trade Balance', impact: 'Low', currencies: ['AUD', 'NZD', 'JPY'] },
    { title: 'Consumer Sentiment Index', impact: 'Low', currencies: ['USD'] },
    { title: 'Government Bond Auction', impact: 'Low', currencies: ['USD', 'EUR', 'GBP'] }
  ];

  for (let day = 1; day <= daysInMonth; day++) {
    if (realEventDays.has(day)) continue;

    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (day % 11 === 0) {
        eventsList.push({
          title: 'Bank Holiday',
          country: currencies[(day * 3) % currencies.length],
          date: new Date(year, month, day, 0, 0, 0).toISOString(),
          impact: 'Holiday',
          forecast: '',
          previous: ''
        });
      }
      continue;
    }

    const numEvents = 1 + ((day * 3) % 3);
    const indexSeed = (day * 7) % eventTemplates.length;

    for (let i = 0; i < numEvents; i++) {
      const template = eventTemplates[(indexSeed + i) % eventTemplates.length];
      const currency = template.currencies[(day + i) % template.currencies.length];
      
      const hour = 8 + (i * 3) + (day % 4);
      const minute = (day * 15) % 60;
      
      let forecast = '';
      let previous = '';
      if (template.impact !== 'Holiday') {
        const val = (((day + i) * 0.17) % 3.0).toFixed(1);
        forecast = `${val}%`;
        previous = `${(parseFloat(val) - 0.1).toFixed(1)}%`;
      }

      eventsList.push({
        title: template.title,
        country: currency,
        date: new Date(year, month, day, hour, minute, 0).toISOString(),
        impact: template.impact,
        forecast,
        previous
      });
    }
  }

  return eventsList.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// GET /api/news - Fetch monthly economic calendar news events
router.get('/', async (req, res) => {
  try {
    const reqYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    const reqMonth = req.query.month ? parseInt(req.query.month) : new Date().getMonth();

    // Query economic news releases from PostgreSQL database cache (synced by background agent)
    let realEvents = [];
    try {
      const result = await db.query(`
        SELECT title, country, date, impact, forecast, previous 
        FROM economic_news
      `);
      realEvents = result.rows;
    } catch (err) {
      console.error('Failed to retrieve news events from PostgreSQL:', err);
    }

    const monthlyEvents = generateMonthlyEvents(reqYear, reqMonth, realEvents);
    res.json(monthlyEvents);
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
