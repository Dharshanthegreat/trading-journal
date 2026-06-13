import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Curated list of trading-oriented Stoic Quotes
const STOIC_QUOTES = [
  {
    author: 'Seneca',
    quote: 'We suffer more often in imagination than in reality.',
    translation: 'Do not panic about potential losses or missed moves that haven\'t occurred. Trade the price actions on your screen, not your fearful projections.'
  },
  {
    author: 'Marcus Aurelius',
    quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.',
    translation: 'You cannot control where the market goes or what news spikes occur. You can only control your risk size, your stop-loss placement, and your response.'
  },
  {
    author: 'Epictetus',
    quote: 'It\'s not what happens to you, but how you react to it that matters.',
    translation: 'A loss is just a statistical cost of trading. How you manage your psychology after a loss is what determines your long-term success.'
  },
  {
    author: 'Seneca',
    quote: 'No man is more unhappy than he who never faces adversity, for he is not permitted to prove himself.',
    translation: 'Drawdowns are the testing grounds of a professional trader. Facing them with discipline proves you are a master of your edge, not just a fair-weather scaler.'
  },
  {
    author: 'Marcus Aurelius',
    quote: 'The impediment to action advances action. What stands in the way becomes the way.',
    translation: 'A failed breakout or stopped-out trade is information. It reveals where liquidity is actually sitting. Treat losses as lessons to refine your setups.'
  },
  {
    author: 'Epictetus',
    quote: 'Wealth consists not in having great possessions, but in having few wants.',
    translation: 'Greed kills trading accounts. Focus on executing the process perfectly, and let go of the urge to catch every single pip or make $10,000 in a day.'
  }
];

// Rate limit helper
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

// ─── Get Quotes ──────────────────────────────────────
router.get('/quotes', (req, res) => {
  res.json(STOIC_QUOTES);
});

// ─── Get Dichotomy Reframings ────────────────────────
router.get('/reframes', (req, res) => {
  try {
    const entries = db.prepare(`
      SELECT * FROM stoic_reframings 
      WHERE user_id = ? 
      ORDER BY id DESC 
      LIMIT 30
    `).all(req.user.id);
    res.json(entries);
  } catch (err) {
    console.error('Get reframings error:', err);
    res.status(500).json({ error: 'Failed to retrieve Stoic reframings' });
  }
});

// ─── Delete Reframing Entry ──────────────────────────
router.delete('/reframes/:id', (req, res) => {
  try {
    const entry = db.prepare(`
      SELECT id FROM stoic_reframings WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    db.prepare('DELETE FROM stoic_reframings WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Reframe deleted' });
  } catch (err) {
    console.error('Delete reframe error:', err);
    res.status(500).json({ error: 'Failed to delete reframe' });
  }
});

// ─── Save Reframing Entry ────────────────────────────
router.post('/reframes', (req, res) => {
  try {
    const { situation, in_control, out_of_control, stoic_reframe } = req.body;
    
    if (!situation || !in_control || !out_of_control || !stoic_reframe) {
      return res.status(400).json({ error: 'All fields are required to log a reframe.' });
    }

    const result = db.prepare(`
      INSERT INTO stoic_reframings (user_id, situation, in_control, out_of_control, stoic_reframe, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(req.user.id, situation, in_control, out_of_control, stoic_reframe);

    const doc = db.prepare('SELECT * FROM stoic_reframings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(doc);
  } catch (err) {
    console.error('Save reframe error:', err);
    res.status(500).json({ error: 'Failed to save reframe' });
  }
});

// ─── NVIDIA Llama AI Stoic Chat Assistant ──────────────
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    const systemPrompt = `You are a Stoic Trading Mentor powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
Your goal is to guide active traders through emotional triggers, drawdowns, greed, fear of missing out (FOMO), and losses using Stoic philosophy (Seneca, Marcus Aurelius, Epictetus).
Help the trader cultivate emotional resilience, focus purely on their execution rules, and decouple their self-worth from individual trade outcomes.

Adhere to these style principles:
1. Always output in clean, professional Markdown.
2. Emphasize the dichotomy of control (what is in our power vs what is not).
3. Be calm, rational, encouraging, and write in the structured voice of a wise mentor. Keep responses concise and focused on risk limits and psychological calm.`;

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
          temperature: 0.6,
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

    // Fallback: Simulated Llama-3.1-Nemotron-70B Stoic Mentor Engine
    const lastMsg = (Array.isArray(messages) && messages.length > 0)
      ? messages[messages.length - 1]?.content?.toLowerCase() || ''
      : '';
    let fallbackText = '';

    if (lastMsg.includes('drawdown') || lastMsg.includes('loss') || lastMsg.includes('lost')) {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Marcus Aurelius Mode]**

*“The mind adapts and converts to its own purposes the obstacle to our acting.”*

When you encounter a drawdown, consider the following dichotomy:
1. **Outside Your Control**: The market distribution of wins and losses, execution slippage, broker spreads.
2. **Within Your Control**: Your trade sizes, moving your stop-losses, stopping trading for the day to clear your mind.

Your losses are not failures; they are the statistical premium you pay to operate your edge in the markets. Close the charts, take a deep breath, and do not seek revenge on an indifferent market.`;
    } else if (lastMsg.includes('fomo') || lastMsg.includes('chasing') || lastMsg.includes('greed')) {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Seneca Mode]**

*“Wealth consists not in having great possessions, but in having few wants.”*

Chasing entries due to FOMO represents a desire to possess what is not yours. The market is infinite and will offer endless breakouts. 
To control greed:
- Accept that missing a trade does not diminish your worth.
- Commit to entering only at your strict trigger zones.
- Celebrate missing trades that do not fit your rules; that is a victory of discipline.`;
    } else {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Epictetus Mode]**

*“First say to yourself what you would be; and then do what you have to do.”*

I am here to help you navigate the mental friction of the trading session. Tell me:
- Did you just exit a trade early out of fear?
- Are you feeling the urge to increase position sizing after a loss?
- Describe your current state, and let us break down what is in your power.`;
    }

    res.json({
      role: 'assistant',
      content: fallbackText
    });
  } catch (err) {
    console.error('AI Stoic chat error:', err);
    res.status(500).json({ error: 'Failed to generate Stoic response' });
  }
});

// ─── NVIDIA Llama AI Situation Dichotomy Analyzer ─────
router.post('/analyze-situation', async (req, res) => {
  try {
    const { situation } = req.body;
    const userId = req.user.id;

    if (!situation) {
      return res.status(400).json({ error: 'Situation content is required.' });
    }

    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute.' });
    }

    const apiKey = process.env.NVIDIA_API_KEY;

    const systemPrompt = `You are a Stoic Sage and trading psychologist powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
The user will describe a frustrating or challenging trading situation (e.g. "I got stopped out and then the market went in my direction").
Your task is to analyze this situation and divide it into two clear, bulleted lists:
1. What was IN THE TRADER'S CONTROL (e.g. entry criteria, position sizing, stop-loss level, emotional reaction).
2. What was OUT OF THE TRADER'S CONTROL (e.g. news events, market direction, spread size, slippage).

Then, provide a Stoic Reframe (Stoic Guidance) that advises the trader on how to handle this outcome with absolute equanimity, patience, and logic, referencing Seneca, Marcus Aurelius, or Epictetus.

You MUST respond in a clean JSON string with EXACTLY this structure and NO surrounding markdown tags or additional text, so it can be parsed cleanly:
{
  "in_control": "- Bullet points of items in control...",
  "out_of_control": "- Bullet points of items out of control...",
  "stoic_reframe": "Short Stoic guidance paragraph..."
}`;

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
            { role: 'user', content: situation }
          ],
          temperature: 0.2,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Catalog returned error status ${response.status}: ${errText}`);
      }

      const result = await response.json();
      const contentText = result.choices[0]?.message?.content || '{}';
      
      // Clean up potential markdown code block wrappers
      const cleanJsonStr = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch (e) {
        console.warn('Failed to parse AI response as JSON, falling back to simulated parser:', contentText);
        // Fallback to text parsing if JSON fails
      }
    }

    // Fallback: Simulated Llama-3.1-Nemotron-70B Situation Analyzer
    const situationLower = situation.toLowerCase();
    let inControl = '- Following pre-market entry rules\n- Your risk management settings (e.g. 1% risk size)\n- Your emotional response to the loss (avoiding revenge trading)\n- Closing the terminal to take a break';
    let outOfControl = '- The exact path the price takes after your entry\n- Institutional news spikes or spread widening\n- Quick slippage near your stop loss\n- The behaviors of other market participants';
    let reframeText = '“Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.” — Marcus Aurelius. The market does not know you exist, nor does it care. A stop-out is simply data, not a personal insult. Focus on executing your rules, and yield outcomes to the market.';

    if (situationLower.includes('revenge') || situationLower.includes('overtrade') || situationLower.includes('chase')) {
      inControl = '- Closing the charts and walking away\n- Sticking to a maximum trade-per-session limit\n- Logging your emotional state before clicking buy/sell\n- Adhering to your entry checklist';
      outOfControl = '- Missing the initial breakout move\n- How fast the price expands without you\n- The market offering or not offering a pullback entry';
      reframeText = '“No man is hurt but by himself.” — Diogenes. Missing a trade costs nothing but patience. Forcing an entry costs you capital. Reframe missed trades not as lost wealth, but as opportunities to practice self-control.';
    }

    res.json({
      in_control: inControl,
      out_of_control: outOfControl,
      stoic_reframe: reframeText
    });
  } catch (err) {
    console.error('AI Situation analyzer error:', err);
    res.status(500).json({ error: 'Failed to analyze situation stoically' });
  }
});

export default router;
