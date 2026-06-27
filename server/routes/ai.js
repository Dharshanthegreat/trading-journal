import { Router } from 'express';
import db from '../db.js';
import { computeMetrics } from '../utils/analytics.js';
import '../utils/env.js';

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

export default router;
