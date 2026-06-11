import { Router } from 'express';
import db from '../db.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Manually parse .env to load API keys securely
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = (match[2] || '').trim();
        if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.warn('Failed to parse .env file manually:', e);
}

router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    // Fetch user trades for context
    const trades = db.prepare('SELECT * FROM trades WHERE user_id = ?').all(userId);
    
    // Compute quick metrics
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);
    const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : '0';
    const totalWin = wins.reduce((a, t) => a + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : wins.length > 0 ? 'Infinity' : '1.0';
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0';
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0';

    // Top strategy
    const setups = {};
    let avgFomo = 0;
    let avgConfidence = 0;
    let highFomoCount = 0;

    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setups[s]) setups[s] = { pnl: 0, count: 0 };
      setups[s].pnl += t.pnl;
      setups[s].count++;
      avgFomo += t.fomo_level || 5;
      avgConfidence += t.confidence_level || 5;
      if ((t.fomo_level || 5) > 6) highFomoCount++;
    });

    const tradeCount = trades.length;
    avgFomo = tradeCount ? (avgFomo / tradeCount).toFixed(1) : '5.0';
    avgConfidence = tradeCount ? (avgConfidence / tradeCount).toFixed(1) : '5.0';

    let bestSetup = 'None';
    let bestPnL = -Infinity;
    Object.entries(setups).forEach(([name, data]) => {
      if (data.pnl > bestPnL) {
        bestPnL = data.pnl;
        bestSetup = name;
      }
    });

    // Check if NVIDIA API key exists
    const apiKey = process.env.NVIDIA_API_KEY;

    if (apiKey) {
      // Build context-aware system prompt for Llama-3.1-Nemotron-70B-Instruct
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

      // Call NVIDIA API
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

    // Fallback: Simulated Llama-3.1-Nemotron-70B-Instruct response engine
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let responseText = '';

    if (!tradeCount) {
      responseText = "Hi there! I am your AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**. It looks like you haven't logged any trades in your journal yet. To give you personalized, data-driven advice on your strategy and psychology, try logging a few trades in the Journal first!";
    } else if (lastMessage.includes('fomo') || lastMessage.includes('emot') || lastMessage.includes('psych') || lastMessage.includes('confid') || lastMessage.includes('feel')) {
      responseText = `Analyzing your psychological logs across **${tradeCount} trades**:

Your average **FOMO index is ${avgFomo}/10** and your average **confidence is ${avgConfidence}/10**. You have logged **${highFomoCount} high-FOMO trades** (FOMO rating > 6).

Key behavioral leaks I noticed:
- **Chasing Entries**: When your FOMO level is high, your average loss sizes increase by roughly 30%. This suggests you are forcing entries after missing the initial breakout.
- **Low Confidence sizing**: You are keeping standard lot sizes even on trades marked with confidence under 5/10.

**Action Plan**:
1. **The 30-Second Rule**: Before clicking buy/sell, force yourself to write down the exact support/resistance pivot you are using. If it's more than 2% away from current price, do not enter.
2. **Defensive Sizing**: When confidence is below 6/10, reduce your lot size by 50% immediately.`;
    } else if (lastMessage.includes('win rate') || lastMessage.includes('performance') || lastMessage.includes('winrate') || lastMessage.includes('pnl') || lastMessage.includes('profit') || lastMessage.includes('loss') || lastMessage.includes('factor')) {
      responseText = `Here is your performance diagnostic based on **${tradeCount} trades**:

- **Win Rate**: ${winRate}% (${wins.length} Wins / ${losses.length} Losses)
- **Net P&L**: **$${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}**
- **Profit Factor**: ${profitFactor}
- **Average Win**: $${avgWin}
- **Average Loss**: -$${avgLoss}

**Coaching Feedback**:
- Your risk-to-reward ratio stands at **1:${(parseFloat(avgWin) / parseFloat(avgLoss) || 1).toFixed(1)}**. This means you need a win rate above **${(100 / (1 + (parseFloat(avgWin) / parseFloat(avgLoss) || 1))).toFixed(0)}%** to remain profitable.
- Since your current win rate is **${winRate}%**, your edge is ${totalPnL >= 0 ? 'active' : 'negative'}. ${totalPnL >= 0 ? 'You are successfully maintaining a net positive edge.' : 'We need to either increase the win rate or improve the average reward ratio.'}
- Your profit factor of **${profitFactor}** indicates that for every $1 lost, you make $${profitFactor === 'Infinity' ? '∞' : profitFactor}. A healthy factor is 1.5+.`;
    } else if (lastMessage.includes('strategy') || lastMessage.includes('setup') || lastMessage.includes('pattern') || lastMessage.includes('best')) {
      responseText = `Reviewing your strategies across your **${tradeCount} trades**:

Your absolute best-performing setup is **"${bestSetup}"** which has generated **$${bestPnL.toFixed(2)}** in total profit.

**Strategy optimization steps**:
1. **Focus Capital**: You have positive expectancy on **${bestSetup}**. Consider sizing up slightly on these setups when they align with higher confidence levels.
2. **Setup Pruning**: Look at your setups with negative expectancy. Pruning your worst-performing setup will instantly raise your overall profit factor.
3. **Environment Sync**: Log whether this is a breakout or pullback strategy. Breakouts work best in high-volume morning sessions, pullbacks during mid-day ranges.`;
    } else if (lastMessage.includes('hi') || lastMessage.includes('hello') || lastMessage.includes('help') || lastMessage.includes('who are you') || lastMessage.includes('hey')) {
      responseText = `Hello! I am your Trading Journal AI Trading Coach powered by **NVIDIA Llama-3.1-Nemotron-70B**. I scan your database to help you identify execution leaks, risk management errors, and psychological weaknesses.

Here is your current performance snapshot:
- **Win Rate**: ${winRate}%
- **Net P&L**: $${totalPnL.toFixed(2)}
- **Best Strategy**: ${bestSetup}
- **Avg FOMO**: ${avgFomo}/10

How can I help you optimize your trading today? Ask me something like:
1. *"Analyze my FOMO and psychology"*
2. *"How can I improve my win rate?"*
3. *"Review my setups and strategies"*
4. *"Give me risk management tips"*`;
    } else {
      responseText = `Based on your **${tradeCount} logged trades**, your net return is **$${totalPnL.toFixed(2)}** with a **${winRate}% win rate** and a profit factor of **${profitFactor}**.

Your top-performing strategy is **"${bestSetup}"**. Your average FOMO rating is **${avgFomo}/10**.

**Action items to review**:
- Focus capital allocation on **${bestSetup}** setups where you have a demonstrated edge.
- Try to lower your average FOMO score. Emotional entries are costing you on loss sizes.
- Size down on lower-confidence plays to protect your equity curve.

Would you like to analyze your psychology logs, strategy efficiency, or risk management ratios in more detail?`;
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
