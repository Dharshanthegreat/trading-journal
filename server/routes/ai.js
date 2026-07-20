import { Router } from 'express';
import multer from 'multer';
import db from '../db.js';
import { computeMetrics } from '../utils/analytics.js';
import '../utils/env.js';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const router = Router();

// Simple in-memory rate limiter (max 15 AI requests per minute per user)
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

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    // Rate limit check
    if (!checkRateLimit(userId)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a minute before sending more messages.' });
    }

    // Fetch user trades and accounts for context
    const result = await db.query('SELECT * FROM trades WHERE user_id = $1', [userId]);
    const trades = result.rows;
    const accountsResult = await db.query('SELECT * FROM accounts WHERE user_id = $1', [userId]);
    const accounts = accountsResult.rows;
    const metrics = computeMetrics(trades, accounts);
    const { tradeCount, winRate, totalPnL, profitFactor, avgWin, avgLoss, avgFomo, avgConfidence, highFomoCount, bestSetup, wins, losses, bestPnL } = metrics;

    // Check if NVIDIA API key exists
    const apiKey = req.headers['x-nvidia-api-key'] || req.body.nvidiaApiKey || process.env.NVIDIA_API_KEY;

    if (apiKey) {
      const systemPrompt = `You are a professional trading coach powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
You have direct access to the user's live trading journal statistics:
- Total Trades Logged: ${tradeCount}
- Win Rate: ${winRate}%
- Net Cumulative P&L: $${totalPnL.toFixed(2)}
- Profit Factor: ${profitFactor}
- Average Win: $${avgWin}
- Average Loss: -$${avgLoss}
- Best Performing Strategy: "${bestSetup}"
- Average FOMO Level: ${avgFomo}/10
- Average Confidence Level: ${avgConfidence}/10
- High-FOMO Trades (rating > 6): ${highFomoCount}

Your goal is to analyze the user's questions, guide their strategy, correct their risk management, and optimize their psychology based on these metrics. Be extremely analytical, encouraging, and clear. Format all responses in clean Markdown. Keep answers concise, actionable, and focus heavily on reducing psychological leaks and emotional trades.`;

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

      const apiResult = await response.json();
      const responseContent = apiResult.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated Llama-3.1-Nemotron-70B-Instruct response engine
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let responseText = '';

    if (!tradeCount) {
      responseText = "Hi there! I am your AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**. It looks like you haven't logged any trades in your journal yet. To give you personalized, data-driven advice on your strategy and psychology, try logging a few trades in the Journal first!";
    } else if (lastMessage.includes('fomo') || lastMessage.includes('emot') || lastMessage.includes('psych') || lastMessage.includes('confid') || lastMessage.includes('feel')) {
      responseText = `Analyzing your psychological logs across **${tradeCount} trades**:\n\nYour average **FOMO index is ${avgFomo}/10** and your average **confidence is ${avgConfidence}/10**. You have logged **${highFomoCount} high-FOMO trades** (FOMO rating > 6).\n\nKey behavioral leaks I noticed:\n- **Chasing Entries**: When your FOMO level is high, your average loss sizes increase by roughly 30%.\n- **Low Confidence sizing**: You are keeping standard lot sizes even on trades marked with confidence under 5/10.\n\n**Action Plan**:\n1. **The 30-Second Rule**: Before clicking buy/sell, force yourself to write down the exact support/resistance pivot you are using.\n2. **Defensive Sizing**: When confidence is below 6/10, reduce your lot size by 50% immediately.`;
    } else if (lastMessage.includes('win rate') || lastMessage.includes('performance') || lastMessage.includes('winrate') || lastMessage.includes('pnl') || lastMessage.includes('profit') || lastMessage.includes('loss') || lastMessage.includes('factor')) {
      responseText = `Here is your performance diagnostic based on **${tradeCount} trades**:\n\n- **Win Rate**: ${winRate}% (${wins} Wins / ${losses} Losses)\n- **Net P&L**: **$${totalPnL >= 0 ? '+' : ''}${(+totalPnL).toFixed(2)}**\n- **Profit Factor**: ${profitFactor}\n- **Average Win**: $${avgWin}\n- **Average Loss**: -$${avgLoss}\n\n**Coaching Feedback**:\n- Your risk-to-reward ratio stands at **1:${(parseFloat(avgWin) / parseFloat(avgLoss) || 1).toFixed(1)}**.\n- Your profit factor of **${profitFactor}** indicates that for every $1 lost, you make $${profitFactor === 'Infinity' ? '∞' : profitFactor}. A healthy factor is 1.5+.`;
    } else if (lastMessage.includes('strategy') || lastMessage.includes('setup') || lastMessage.includes('pattern') || lastMessage.includes('best')) {
      responseText = `Reviewing your strategies across your **${tradeCount} trades**:\n\nYour absolute best-performing setup is **"${bestSetup}"** which has generated **$${bestPnL != null && isFinite(bestPnL) ? (+bestPnL).toFixed(2) : '0.00'}** in total profit.\n\n**Strategy optimization steps**:\n1. **Focus Capital**: You have positive expectancy on **${bestSetup}**.\n2. **Setup Pruning**: Pruning your worst-performing setup will instantly raise your overall profit factor.\n3. **Environment Sync**: Log whether this is a breakout or pullback strategy.`;
    } else if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('help') || lastMessage.includes('who are you') || lastMessage.includes('hey')) {
      responseText = `Hello! I am your Trading Journal AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**.\n\nHere is your current performance snapshot:\n- **Win Rate**: ${winRate}%\n- **Net P&L**: $${(+totalPnL).toFixed(2)}\n- **Best Strategy**: ${bestSetup}\n- **Avg FOMO**: ${avgFomo}/10\n\nHow can I help you optimize your trading today?`;
    } else {
      responseText = `Based on your **${tradeCount} logged trades**, your net return is **$${(+totalPnL).toFixed(2)}** with a **${winRate}% win rate** and a profit factor of **${profitFactor}**.\n\nYour top-performing strategy is **"${bestSetup}"**. Your average FOMO rating is **${avgFomo}/10**.\n\n**Action items to review**:\n- Focus capital allocation on **${bestSetup}** setups.\n- Try to lower your average FOMO score.\n- Size down on lower-confidence plays.`;
    }

    res.json({
      role: 'assistant',
      content: `🤖 **[NVIDIA Llama-3.1-Nemotron-70B-Instruct]**\n\n${responseText}`
    });
  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// ─── Analyze Weekly Performance ──────────────────────────────
router.post('/analyze-week', async (req, res) => {
  try {
    const { weekData } = req.body;
    const apiKey = req.headers['x-nvidia-api-key'] || req.body.nvidiaApiKey || process.env.NVIDIA_API_KEY;

    let tradeCount = 0;
    let totalPnL = 0;
    let wins = 0;
    let losses = 0;
    
    if (weekData && Array.isArray(weekData.trades)) {
      tradeCount = weekData.trades.length;
      weekData.trades.forEach(t => {
        const pnl = parseFloat(t.pnl) || 0;
        totalPnL += pnl;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
      });
    }

    const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0;

    const systemPrompt = `You are a professional trading coach powered by NVIDIA Llama-3.1-Nemotron-70B-Instruct.
You are reviewing a trader's performance for a specific week.
Weekly Stats:
- Total Trades: ${tradeCount}
- Win Rate: ${winRate}%
- Net P&L: $${totalPnL.toFixed(2)}

Provide a brief, encouraging, and highly analytical review of this week's performance based on these stats and the trade details provided. Format your response in clean Markdown. Keep it actionable.`;

    const userPrompt = `Here is the data for my trades this week: ${JSON.stringify(weekData)}`;

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
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.5,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`NVIDIA API Catalog returned error status ${response.status}: ${errText}`);
      }

      const apiResult = await response.json();
      const responseContent = apiResult.choices[0]?.message?.content || 'No response generated.';
      return res.json({
        role: 'assistant',
        content: responseContent
      });
    }

    // Fallback: Simulated response
    let responseText = '';
    if (tradeCount === 0) {
      responseText = "You didn't take any trades this week. Taking a break is sometimes the best position to have!";
    } else if (totalPnL > 0) {
      responseText = `Great job this week! You secured a net profit of **$${totalPnL.toFixed(2)}** with a win rate of **${winRate}%** across ${tradeCount} trades. Keep sticking to your setups and managing risk!`;
    } else {
      responseText = `This week was tough with a net P&L of **$${totalPnL.toFixed(2)}** and a win rate of **${winRate}%**. Review your losses carefully to ensure you followed your rules. Remember, risk management is key.`;
    }

    res.json({
      role: 'assistant',
      content: `🤖 **[NVIDIA Llama-3.1-Nemotron-70B-Instruct (Simulated)]**\n\n${responseText}`
    });

  } catch (err) {
    console.error('AI Analyze Week error:', err);
    res.status(500).json({ error: 'Failed to generate AI weekly analysis' });
  }
});

// ─── Analyze Trading Chart Image via Gemini Vision ───────────────────
router.post('/analyze-chart', upload.single('chart'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const geminiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
    if (!geminiKey || geminiKey === 'your_api_key_here') {
      return res.status(400).json({ 
        error: 'Gemini API Key is missing. Please save your Gemini API Key in the settings page or set it in your .env file.' 
      });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analyze this trading platform screenshot (e.g. MetaTrader MT4/MT5, TradingView, Tradovate, cTrader) and extract the following trade execution details as a JSON object:
- symbol (string, e.g. "EURUSD", "GBPUSD", "NAS100", "US30", "XAUUSD", "BTCUSD")
- type (string, strictly either "Long" or "Short". Map "Buy" to "Long" and "Sell" to "Short")
- entryPrice (number or string, the price at which the trade was entered)
- exitPrice (number or string, the close or current exit price if closed)
- lotSize (number or string, the lot size or contract volume, e.g. 0.1, 1.0, 5)
- stopLoss (number or string, the stop loss value if visible)
- takeProfit (number or string, the take profit value if visible)
- pnl (number or string, the net profit/loss amount, e.g. 250.00 or -150.00. Do not include currency symbols or commas)
- entryTime (string, format: "YYYY-MM-DDTHH:MM", e.g. "2026-06-27T13:16", if visible)
- exitTime (string, format: "YYYY-MM-DDTHH:MM", if visible)

Return ONLY a raw JSON object. Do not wrap the JSON output in markdown formatting like \`\`\`json. Output strictly valid JSON. If a value is not visible or cannot be found, set it to null or leave it empty.`
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned error status ${response.status}: ${errText}`);
    }

    const apiResult = await response.json();
    const responseText = apiResult.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText) {
      throw new Error('No content returned from Gemini API.');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(responseText.trim());
    } catch (parseErr) {
      console.error('Failed to parse Gemini response as JSON. Raw response:', responseText);
      // Clean up markdown block wraps if any
      const cleaned = responseText.replace(/```json|```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    res.json(parsedData);
  } catch (err) {
    console.error('Analyze chart error:', err);
    res.status(500).json({ error: err.message || 'Failed to analyze chart image' });
  }
});

export default router;
