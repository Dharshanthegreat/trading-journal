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

    // Dynamic response engine without repeating static headers
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let responseText = '';

    if (!tradeCount) {
      responseText = "Hi there! I am your AI Trading Coach. It looks like you haven't logged any trades in your journal yet. To give you personalized, data-driven advice on your strategy and psychology, try logging a few trades in the Journal first!";
    } else if (lastMessage.includes('risk') || lastMessage.includes('management') || lastMessage.includes('loss') || lastMessage.includes('stop')) {
      responseText = `### Risk Management Blueprint\n\nBased on your **${tradeCount} logged trades**:\n- **Profit Factor**: ${profitFactor}\n- **Average Win**: $${avgWin}\n- **Average Loss**: -$${avgLoss}\n\n**Actionable Risk Guidelines**:\n1. **Fixed Fractional Sizing**: Never risk more than 1-2% of total equity ($${(totalPnL > 0 ? 10000 + totalPnL : 10000) * 0.01}) per trade.\n2. **Enforce Hard Stop Losses**: Always log Stop-Loss boundaries before entering trades.\n3. **Max Daily Loss Limit**: Stop trading for the day if you hit 2 consecutive losses.`;
    } else if (lastMessage.includes('how to win') || lastMessage.includes('win') || lastMessage.includes('win rate') || lastMessage.includes('performance') || lastMessage.includes('winrate') || lastMessage.includes('pnl')) {
      responseText = `### Strategy Edge & Win Rate Diagnostics\n\nHere is your performance snapshot across **${tradeCount} trades**:\n- **Current Win Rate**: ${winRate}% (${wins} Wins / ${losses} Losses)\n- **Net P&L**: **$${totalPnL >= 0 ? '+' : ''}${(+totalPnL).toFixed(2)}**\n- **Profit Factor**: ${profitFactor}\n- **Best Strategy**: **${bestSetup}**\n\n**3 Steps to Increase Your Win Rate**:\n1. **Focus on High-Expectancy Setups**: Allocate 80% of your risk capital to **${bestSetup}** setups.\n2. **Prune Low-Confidence Plays**: Trades logged with confidence < 6/10 account for disproportionate drawdowns.\n3. **Tighten Entry Confirmation**: Wait for candle closure on key S/R levels rather than jumping in early.`;
    } else if (lastMessage.includes('fomo') || lastMessage.includes('emot') || lastMessage.includes('psych') || lastMessage.includes('confid') || lastMessage.includes('feel')) {
      responseText = `### Psychological Analysis\n\nAnalyzing your psychological logs across **${tradeCount} trades**:\n- **Average FOMO Index**: ${avgFomo}/10\n- **Average Confidence**: ${avgConfidence}/10\n- **High-FOMO Trades (>6)**: ${highFomoCount}\n\n**Action Plan**:\n1. **The 30-Second Rule**: Pause 30 seconds before clicking entry to confirm plan alignment.\n2. **Defensive Sizing**: When confidence is below 6/10, cut lot size in half immediately.`;
    } else if (lastMessage.includes('strategy') || lastMessage.includes('setup') || lastMessage.includes('pattern') || lastMessage.includes('best')) {
      responseText = `### Strategy Audit\n\nYour top-performing strategy is **"${bestSetup}"** with total profits of **$${bestPnL != null && isFinite(bestPnL) ? (+bestPnL).toFixed(2) : '0.00'}**.\n\n**Optimization Steps**:\n1. Double down on **${bestSetup}** setups when market structure aligns.\n2. Stop trading unverified or impulse setups.\n3. Log session details (London vs NY) to identify high-probability timeframes.`;
    } else {
      responseText = `Based on your **${tradeCount} logged trades**, your net return is **$${(+totalPnL).toFixed(2)}** with a **${winRate}% win rate** and a profit factor of **${profitFactor}**.\n\nYour top-performing strategy is **"${bestSetup}"**. Your average FOMO rating is **${avgFomo}/10**.\n\n**Action items to review**:\n- Focus capital allocation on **${bestSetup}** setups.\n- Try to lower your average FOMO score.\n- Size down on lower-confidence plays.`;
    }

    res.json({
      role: 'assistant',
      content: responseText
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

    // Default fallback
    res.json({
      role: 'assistant',
      content: `Weekly Review Summary: You logged ${tradeCount} trades this week with a ${winRate}% win rate and net P&L of $${totalPnL.toFixed(2)}. Focus on consistency and risk control for next week.`
    });
  } catch (err) {
    console.error('Analyze week error:', err);
    res.status(500).json({ error: 'Failed to analyze weekly performance' });
  }
});

export default router;
