import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { ai as aiApi } from '../services/api';
import {
  Brain, Send, Sparkles, Trash2, Cpu,
  TrendingUp, TrendingDown, Target, Zap, Bot, RefreshCw
} from 'lucide-react';

// Internal parser helper to turn **bold** text into HTML strong tags
const parseBoldText = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

// Custom Markdown Parser
const formatMessageContent = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line.trim();
    if (!content) return <div key={lineIdx} style={{ height: '6px' }} />;

    if (content.startsWith('### ')) {
      return (
        <h4 key={lineIdx} style={{ fontSize: '0.9rem', fontWeight: 800, margin: '10px 0 4px 0', color: 'var(--text-primary)' }}>
          {parseBoldText(content.slice(4))}
        </h4>
      );
    }
    if (content.startsWith('**') && content.endsWith('**') && content.length > 4) {
      return (
        <h5 key={lineIdx} style={{ fontSize: '0.82rem', fontWeight: 700, margin: '8px 0 4px 0', color: 'var(--text-secondary)' }}>
          {parseBoldText(content.slice(2, -2))}
        </h5>
      );
    }

    const isBulletList = content.startsWith('- ') || content.startsWith('* ');
    const isNumberedList = /^\d+\.\s/.test(content);

    if (isBulletList) {
      return (
        <li key={lineIdx} style={{ marginLeft: '12px', paddingLeft: '4px', fontSize: '0.78rem', lineHeight: '1.5', listStyleType: 'disc', margin: '3px 0' }}>
          {parseBoldText(content.substring(2))}
        </li>
      );
    }

    if (isNumberedList) {
      const match = content.match(/^(\d+\.)\s(.*)/);
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', lineHeight: '1.5', margin: '3px 0 3px 4px' }}>
          <strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', minWidth: '18px' }}>{match ? match[1] : ''}</strong>
          <span>{parseBoldText(match ? match[2] : content)}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} style={{ fontSize: '0.78rem', lineHeight: '1.5', margin: '4px 0' }}>
        {parseBoldText(content)}
      </p>
    );
  });
};

// Client-side dynamic AI response generator for instant, intelligent coaching
const getLocalAiResponse = (text, trades, metrics) => {
  const query = text.toLowerCase();
  const tradeCount = trades.length;
  const winRate = metrics?.winRate || '0.0';
  const totalPnL = metrics?.totalPnL || 0;
  const bestSetup = metrics?.bestSetup || 'Indices';
  const avgFomo = metrics?.avgFomo || '5.0';

  let content = '';

  if (query.includes('risk') || query.includes('management') || query.includes('loss') || query.includes('stop')) {
    content = `### Risk Management Blueprint\n\nBased on your **${tradeCount} logged trades**:\n- **Net P&L**: $${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}\n- **Current Win Rate**: ${winRate}%\n\n**Actionable Risk Guidelines**:\n1. **Fixed Fractional Sizing**: Never risk more than 1-2% of total equity per trade.\n2. **Enforce Hard Stop Losses**: Always set your Stop-Loss boundary before clicking entry.\n3. **Max Daily Drawdown**: Stop trading for the day if you encounter 2 consecutive losses.`;
  } else if (query.includes('how to win') || query.includes('win') || query.includes('win rate') || query.includes('performance') || query.includes('pnl')) {
    content = `### Win Rate & Strategy Diagnostics\n\nHere is your current trading snapshot across **${tradeCount} trades**:\n- **Win Rate**: ${winRate}%\n- **Net P&L**: **$${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}**\n- **Top Performing Setup**: **${bestSetup}**\n\n**3 Rules to Increase Your Win Rate**:\n1. **Focus Capital on Edge**: Concentrate 80% of your risk capital on **${bestSetup}** setups.\n2. **Prune Low-Confidence Trades**: Avoid trades entered with low conviction (< 6/10).\n3. **Wait for Candle Confirmation**: Avoid early entries before S/R breakout candle closures.`;
  } else if (query.includes('fomo') || query.includes('emot') || query.includes('psych') || query.includes('confid')) {
    content = `### Emotional Management & FOMO Review\n\n- **Average FOMO Index**: ${avgFomo}/10\n- **Logged Trades**: ${tradeCount}\n\n**Psychology Action Items**:\n1. **The 30-Second Rule**: Pause 30 seconds before clicking entry to confirm setup criteria.\n2. **Reduce Lot Size on Low Confidence**: When confidence is below 6/10, cut lot size in half immediately.`;
  } else if (query.includes('strategy') || query.includes('setup') || query.includes('pattern')) {
    content = `### Strategy Audit\n\nYour top-performing setup in the database is **"${bestSetup}"**.\n\n**Optimization Steps**:\n1. Double down on **${bestSetup}** setups when market structure aligns.\n2. Stop trading unverified or impulse setups.\n3. Log session details (London vs New York) to isolate peak performance hours.`;
  } else {
    content = `Based on your **${tradeCount} logged trades**, your net return is **$${totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}** with a **${winRate}% win rate**.\n\nYour top-performing strategy is **"${bestSetup}"**. Your average FOMO rating is **${avgFomo}/10**.\n\n**Action items to review**:\n- Focus capital allocation on **${bestSetup}** setups.\n- Lower your average FOMO score by adhering strictly to entry rules.\n- Size down on lower-confidence plays.`;
  }

  return { role: 'assistant', content };
};

const AiCoach = () => {
  const { user } = useAuth();
  const { trades, analytics, fetchTrades, fetchAnalytics } = useTrades();
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!trades.length) fetchTrades({ limit: 200 });
    if (!analytics) fetchAnalytics();
  }, []);

  // Initialize history cleanly
  useEffect(() => {
    const saved = localStorage.getItem('dtg_ai_chat');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) {
        // Fallback
      }
    }
    
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your **Trading Journal AI Coach**. 

I inspect your journal database to find execution leaks, emotional traps, and risk management improvements. 

How is your trading session going today? Ask me questions like:
- *"How to win more trades?"*
- *"Give me risk management tips"*
- *"Analyze my FOMO and psychology"*
        `
      }
    ]);
  }, [user]);

  // Save chat to local storage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dtg_ai_chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Extract quick metrics
  const summaryMetrics = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const winRate = ((wins.length / trades.length) * 100).toFixed(1);
    
    const fomos = trades.map(t => parseFloat(t.fomoLevel) || 5);
    const avgFomo = fomos.length ? (fomos.reduce((a, b) => a + b, 0) / fomos.length).toFixed(1) : '5.0';

    const setups = {};
    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setups[s]) setups[s] = 0;
      setups[s] += (t.pnl || 0);
    });
    let bestSetup = 'None';
    let bestPnL = -Infinity;
    Object.entries(setups).forEach(([name, pnl]) => {
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestSetup = name;
      }
    });

    return {
      winRate,
      totalPnL,
      avgFomo,
      bestSetup: bestSetup !== 'None' ? bestSetup : 'Indices',
    };
  }, [trades]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputVal;
    if (!text.trim() || loading) return;

    if (!textToSend) setInputVal('');
    
    const userMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      let response;
      if (user?.isGuest) {
        response = getLocalAiResponse(text, trades, summaryMetrics);
      } else {
        response = await aiApi.chat(updatedMessages);
      }
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error('API Chat fallback to local engine:', err);
      const fallbackResponse = getLocalAiResponse(text, trades, summaryMetrics);
      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Instant clear conversation
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem('dtg_ai_chat');
  };

  // Preset Suggestion Chips
  const suggestionChips = [
    { label: "How To Win More Trades", query: "How to win more trades and increase win rate?" },
    { label: "Risk Management Tips", query: "Give me risk management tips" },
    { label: "Analyze Psychology & FOMO", query: "Analyze my FOMO and psychology" },
    { label: "Audit Setup Strategies", query: "Review my setups and strategies" }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: 'var(--s4)',
      height: 'calc(100vh - 120px)',
      minHeight: '480px',
      alignItems: 'stretch',
      paddingBottom: '20px'
    }}>
      {/* Left Context Panel */}
      <div className="glass anim-fade-up delay-1" style={{
        padding: 'var(--s4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s5)',
        overflowY: 'auto',
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="logo-icon" style={{ width: '24px', height: '24px', borderRadius: 'var(--r-sm)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={14} color="#fff" />
            </span>
            <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 800 }}>Coaching Core</strong>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
            Inspects your journal database of {trades.length} trades to discover execution leaks and strategy edge.
          </p>
        </div>

        {/* Workspace Context Stats */}
        {summaryMetrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Workspace Context</span>
            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
                <strong style={{ color: summaryMetrics.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                  {summaryMetrics.totalPnL >= 0 ? '+' : ''}${summaryMetrics.totalPnL.toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>{summaryMetrics.winRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg FOMO:</span>
                <strong style={{ color: parseFloat(summaryMetrics.avgFomo) > 5 ? 'var(--loss)' : 'var(--profit)', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>{summaryMetrics.avgFomo}/10</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Top Strategy:</span>
                <strong style={{ color: 'var(--accent)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', textAlign: 'right', fontWeight: 800 }} title={summaryMetrics.bestSetup}>{summaryMetrics.bestSetup}</strong>
              </div>
            </div>
          </div>
        ) : null}

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quick Diagnostics</span>
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              className="btn btn-ghost btn-sm"
              onClick={() => handleSend(chip.query)}
              disabled={loading}
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                textAlign: 'left',
                padding: '7px 10px',
                fontSize: '0.72rem',
                whiteSpace: 'normal',
                borderRadius: 'var(--r-md)',
                borderColor: 'var(--border)',
                cursor: 'pointer'
              }}
            >
              <span style={{ color: 'var(--accent)', display: 'flex', marginRight: '6px' }}><Sparkles size={12} /></span>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Instant Clear Conversation Button */}
        <button
          className="btn btn-danger btn-sm"
          onClick={handleClearChat}
          style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px', cursor: 'pointer' }}
        >
          <Trash2 size={13} />
          Clear Conversation
        </button>
      </div>

      {/* Right Chat Terminal */}
      <div className="glass anim-fade-up delay-2" style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border)'
      }}>
        {/* Chat Header */}
        <div style={{
          padding: 'var(--s3) var(--s4)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Bot size={18} /></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Coach Terminal</span>
          </div>
          <span className="badge" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--accent)', fontSize: '0.65rem', padding: '3px 10px', borderRadius: 'var(--r-full)', fontWeight: 700 }}>
            Analytics Engine Active
          </span>
        </div>

        {/* Message View Area */}
        <div style={{
          flex: 1,
          padding: 'var(--s4)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s4)',
          background: 'var(--bg-primary)'
        }}>
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.8rem', gap: 'var(--s2)' }}>
              <Bot size={32} style={{ opacity: 0.4, color: 'var(--accent)' }} />
              <span>Conversation cleared. Ask a question to start fresh.</span>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className="anim-fade-in"
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: msg.role === 'user' ? '70%' : '85%',
                  display: 'flex',
                  gap: '10px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: 'var(--r-sm)',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #a78bfa)' : 'var(--bg-tertiary)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? (
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>U</span>
                  ) : (
                    <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={14} /></span>
                  )}
                </div>

                <div style={{
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text-primary)',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '0.78rem',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {formatMessageContent(msg.content)}
                </div>
              </div>
            ))
          )}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: 26, height: 26, borderRadius: 'var(--r-sm)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                <Cpu size={14} style={{ color: 'var(--accent)' }} />
              </div>
              <div className="glass" style={{ padding: '8px 14px', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={12} className="spin" /> Analyzing trade database...
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          padding: 'var(--s3) var(--s4)',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex',
          gap: 'var(--s3)',
          alignItems: 'center'
        }}>
          <input
            type="text"
            className="input"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask your coach about win rate, fomo, strategy leaks..."
            disabled={loading}
            style={{
              flex: 1,
              height: '38px',
              fontSize: '0.78rem',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg-primary)'
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={!inputVal.trim() || loading}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Send size={13} /> Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiCoach;
