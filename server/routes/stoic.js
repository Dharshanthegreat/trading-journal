import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Curated list of trading-oriented Stoic Quotes
const maxims = [
  // Marcus Aurelius
  { author: 'Marcus Aurelius', quote: 'You have power over your mind - not outside events. Realize this, and you will find strength.' },
  { author: 'Marcus Aurelius', quote: 'The impediment to action advances action. What stands in the way becomes the way.' },
  { author: 'Marcus Aurelius', quote: 'Waste no more time arguing about what a good man should be. Be one.' },
  { author: 'Marcus Aurelius', quote: 'The happiness of your life depends upon the quality of your thoughts.' },
  { author: 'Marcus Aurelius', quote: 'Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.' },
  { author: 'Marcus Aurelius', quote: 'Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart.' },
  { author: 'Marcus Aurelius', quote: 'Very little is needed to make a happy life; it is all within yourself, in your way of thinking.' },
  { author: 'Marcus Aurelius', quote: 'When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love.' },
  { author: 'Marcus Aurelius', quote: 'The best revenge is to be unlike him who performed the injury.' },
  { author: 'Marcus Aurelius', quote: 'Reject your sense of injury and the injury itself disappears.' },
  { author: 'Marcus Aurelius', quote: 'If it is not right do not do it; if it is not true do not say it.' },
  { author: 'Marcus Aurelius', quote: 'Loss is nothing else but change, and change is Nature’s delight.' },

  // Seneca
  { author: 'Seneca', quote: 'We suffer more often in imagination than in reality.' },
  { author: 'Seneca', quote: 'No man is more unhappy than he who never faces adversity, for he is not permitted to prove himself.' },
  { author: 'Seneca', quote: 'Difficulties strengthen the mind, as labor does the body.' },
  { author: 'Seneca', quote: 'If a man knows not to which port he sails, no wind is favorable.' },
  { author: 'Seneca', quote: 'True happiness is to enjoy the present, without anxious dependence upon the future.' },
  { author: 'Seneca', quote: 'Associate with people who are likely to improve you.' },
  { author: 'Seneca', quote: 'He who is brave is free.' },
  { author: 'Seneca', quote: 'Luck is what happens when preparation meets opportunity.' },
  { author: 'Seneca', quote: 'It is the power of the mind to be unconquerable.' },
  { author: 'Seneca', quote: 'He suffers more than is necessary, who suffers before it is necessary.' },
  { author: 'Seneca', quote: 'While we wait for life, life passes.' },
  { author: 'Seneca', quote: 'Most powerful is he who has himself in his own power.' },

  // Epictetus
  { author: 'Epictetus', quote: 'It\'s not what happens to you, but how you react to it that matters.' },
  { author: 'Epictetus', quote: 'Wealth consists not in having great possessions, but in having few wants.' },
  { author: 'Epictetus', quote: 'First say to yourself what you would be; and then do what you have to do.' },
  { author: 'Epictetus', quote: 'Control your passions lest they take vengeance on you.' },
  { author: 'Epictetus', quote: 'No man is free who is not master of himself.' },
  { author: 'Epictetus', quote: 'The key is to keep company only with people who uplift you, whose presence calls forth your best.' },
  { author: 'Epictetus', quote: 'If you want to improve, be content to be thought foolish and stupid.' },
  { author: 'Epictetus', quote: 'Circumstances do not make the man, they only reveal him to himself.' },
  { author: 'Epictetus', quote: 'It is impossible for a man to learn what he thinks he already knows.' },
  { author: 'Epictetus', quote: 'Only the educated are free.' },
  { author: 'Epictetus', quote: 'Make the best use of what is in your power, and take the rest as it happens.' },
  { author: 'Epictetus', quote: 'He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.' },

  // Zeno & others
  { author: 'Zeno of Citium', quote: 'Man conquers the world by conquering himself.' },
  { author: 'Zeno of Citium', quote: 'Steel your sensibilities, so that life shall hurt you as little as possible.' },
  { author: 'Zeno of Citium', quote: 'Well-being is attained by little and little, and yet is no little thing.' },
  { author: 'Chrysippus', quote: 'The wise man lacks nothing, and yet needs everything; the fool needs nothing, and yet lacks everything.' }
];

const translations = [
  'A loss is a statistical cost of trading. How you manage your psychology after a drawdown determines your long-term consistency.',
  'You cannot control where the market goes. You can only control your risk size, your stop-loss placement, and your session discipline.',
  'Do not panic about potential losses or missed moves that haven\'t occurred. Trade the price action on your screen, not your fearful projections.',
  'Greed kills trading accounts. Focus on executing the process perfectly, and let go of the urge to catch every pip or make quick riches.',
  'Drawdowns are the testing grounds of a professional trader. Facing them with strict rules proves you are a master of your edge.',
  'A failed breakout or stopped-out trade is data. It reveals where liquidity is sitting. Treat losses as lessons to refine your setups.',
  'The market does not care about your financial goals or your revenge feelings. Walk away when your session rules tell you to.',
  'Discipline is doing what needs to be done, regardless of whether you feel like it. Stick to your risk parameters on every single execution.',
  'Do not chase moves in progress. Patience is waiting for the market to come to your pre-determined support/resistance zones.',
  'Every trade is independent of the last. A previous loss has zero bearing on the probability of your next qualified entry.',
  'Accept the outcome of your setups before clicking the order button. If you cannot afford the risk, do not take the trade.',
  'Avoid the urge to over-leverage or double down on losing positions. A single rule violation can wipe out weeks of disciplined work.',
  'Quiet your mind and ignore the hype in social media chat rooms. Trade your own plan and rely on your validated backtests.',
  'Success in trading is not about being right 100% of the time, but about managing risk so that the math works in your favor.',
  'When you feel anger or anxiety rising after a stop-out, take it as an immediate signal to close the trading platform for the day.',
  'Cultivate indifference to individual trade outcomes. Your edge plays out over a sequence of 100 trades, not just one.',
  'Review your trades with absolute honesty. Self-reflection and journaling are the only paths to continuous trading growth.',
  'Stop trading once you reach your daily loss limit. Protecting your capital is more important than recovering today\'s losses.',
  'Focus entirely on high-quality setups. It is better to make zero trades than to force low-probability trades out of boredom.',
  'Treat your trading as a business, not a casino. Keep precise logs, analyze metrics, and manage your risks with absolute professionalism.',
  'Your value as a trader is measured by your rule compliance, not by your daily profit or loss balance.',
  'The best trade you will ever make is the one where you follow your plan, even if it results in a small, disciplined stop-out.',
  'Do not let fear prevent you from executing a valid setup. Hesitation is as dangerous as over-trading; trust your edge.',
  'Let go of the need to predict the future. React rationally to what the market is doing right now at key structural levels.',
  'Patience during flat markets is just as important as speed during breakouts. Protect your cash during chop zones.'
];

const generateQuotes = () => {
  const list = [];
  let id = 1;
  for (let i = 0; i < maxims.length; i++) {
    for (let j = 0; j < translations.length; j++) {
      list.push({
        id,
        author: maxims[i].author,
        quote: maxims[i].quote,
        translation: translations[j]
      });
      id++;
    }
  }
  return list;
};

const STOIC_QUOTES = generateQuotes();

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
router.get('/reframes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM stoic_reframings 
      WHERE user_id = $1 
      ORDER BY id DESC 
      LIMIT 30
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Get reframings error:', err);
    res.status(500).json({ error: 'Failed to retrieve Stoic reframings' });
  }
});

// ─── Delete Reframing Entry ──────────────────────────
router.delete('/reframes/:id', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id FROM stoic_reframings WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await db.query('DELETE FROM stoic_reframings WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Reframe deleted' });
  } catch (err) {
    console.error('Delete reframe error:', err);
    res.status(500).json({ error: 'Failed to delete reframe' });
  }
});

// ─── Save Reframing Entry ────────────────────────────
router.post('/reframes', async (req, res) => {
  try {
    const { situation, in_control, out_of_control, stoic_reframe } = req.body;
    
    if (!situation || !in_control || !out_of_control || !stoic_reframe) {
      return res.status(400).json({ error: 'All fields are required to log a reframe.' });
    }

    const result = await db.query(`
      INSERT INTO stoic_reframings (user_id, situation, in_control, out_of_control, stoic_reframe, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `, [req.user.id, situation, in_control, out_of_control, stoic_reframe]);

    res.status(201).json(result.rows[0]);
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

    // Fallback
    const lastMsg = (Array.isArray(messages) && messages.length > 0)
      ? messages[messages.length - 1]?.content?.toLowerCase() || ''
      : '';
    let fallbackText = '';

    if (lastMsg.includes('drawdown') || lastMsg.includes('loss') || lastMsg.includes('lost')) {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Marcus Aurelius Mode]**\n\n*"The mind adapts and converts to its own purposes the obstacle to our acting."*\n\nWhen you encounter a drawdown, consider the following dichotomy:\n1. **Outside Your Control**: The market distribution of wins and losses, execution slippage, broker spreads.\n2. **Within Your Control**: Your trade sizes, moving your stop-losses, stopping trading for the day to clear your mind.\n\nYour losses are not failures; they are the statistical premium you pay to operate your edge in the markets.`;
    } else if (lastMsg.includes('fomo') || lastMsg.includes('chasing') || lastMsg.includes('greed')) {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Seneca Mode]**\n\n*"Wealth consists not in having great possessions, but in having few wants."*\n\nChasing entries due to FOMO represents a desire to possess what is not yours. The market is infinite and will offer endless breakouts.\nTo control greed:\n- Accept that missing a trade does not diminish your worth.\n- Commit to entering only at your strict trigger zones.\n- Celebrate missing trades that do not fit your rules; that is a victory of discipline.`;
    } else {
      fallbackText = `🏛️ **[NVIDIA Stoic Mentor - Epictetus Mode]**\n\n*"First say to yourself what you would be; and then do what you have to do."*\n\nI am here to help you navigate the mental friction of the trading session. Tell me:\n- Did you just exit a trade early out of fear?\n- Are you feeling the urge to increase position sizing after a loss?\n- Describe your current state, and let us break down what is in your power.`;
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
The user will describe a frustrating or challenging trading situation.
Your task is to analyze this situation and divide it into two clear, bulleted lists:
1. What was IN THE TRADER'S CONTROL.
2. What was OUT OF THE TRADER'S CONTROL.

Then, provide a Stoic Reframe that advises the trader on how to handle this outcome with absolute equanimity.

You MUST respond in a clean JSON string with EXACTLY this structure:
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
      const cleanJsonStr = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleanJsonStr);
        return res.json(parsed);
      } catch (e) {
        console.warn('Failed to parse AI response as JSON, falling back:', contentText);
      }
    }

    // Fallback
    const situationLower = situation.toLowerCase();
    let inControl = '- Following pre-market entry rules\n- Your risk management settings (e.g. 1% risk size)\n- Your emotional response to the loss (avoiding revenge trading)\n- Closing the terminal to take a break';
    let outOfControl = '- The exact path the price takes after your entry\n- Institutional news spikes or spread widening\n- Quick slippage near your stop loss\n- The behaviors of other market participants';
    let reframeText = '"Accept the things to which fate binds you, and love the people with whom fate brings you together, but do so with all your heart." — Marcus Aurelius. The market does not know you exist, nor does it care. A stop-out is simply data, not a personal insult.';

    if (situationLower.includes('revenge') || situationLower.includes('overtrade') || situationLower.includes('chase')) {
      inControl = '- Closing the charts and walking away\n- Sticking to a maximum trade-per-session limit\n- Logging your emotional state before clicking buy/sell\n- Adhering to your entry checklist';
      outOfControl = '- Missing the initial breakout move\n- How fast the price expands without you\n- The market offering or not offering a pullback entry';
      reframeText = '"No man is hurt but by himself." — Diogenes. Missing a trade costs nothing but patience. Forcing an entry costs you capital.';
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
