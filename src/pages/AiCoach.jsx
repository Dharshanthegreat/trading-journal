import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { ai as aiApi } from '../services/api';
import {
  Brain, Send, Sparkles, Trash2, Cpu,
  TrendingUp, TrendingDown, Target, Zap, Bot
} from 'lucide-react';
import { format } from 'date-fns';

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

// Custom Markdown Parser to style headers, lists, and bold text without third-party dependencies
const formatMessageContent = (text) => {
  if (!text) return null;

  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    let content = line.trim();
    if (!content) return <div key={lineIdx} style={{ height: '8px' }} />;

    // Handle Headers
    if (content.startsWith('### ')) {
      return (
        <h4 key={lineIdx} style={{ fontSize: '0.88rem', fontWeight: 700, margin: '12px 0 6px 0', color: 'var(--text-primary)' }}>
          {parseBoldText(content.slice(4))}
        </h4>
      );
    }
    if (content.startsWith('**') && content.endsWith('**') && content.length > 4) {
      return (
        <h5 key={lineIdx} style={{ fontSize: '0.82rem', fontWeight: 600, margin: '8px 0 4px 0', color: 'var(--text-secondary)' }}>
          {parseBoldText(content.slice(2, -2))}
        </h5>
      );
    }

    // Handle Lists
    const isBulletList = content.startsWith('- ') || content.startsWith('* ');
    const isNumberedList = /^\d+\.\s/.test(content);

    if (isBulletList) {
      return (
        <li key={lineIdx} style={{ marginLeft: '12px', paddingLeft: '4px', fontSize: '0.78rem', lineHeight: '1.5', listStyleType: 'disc', margin: '4px 0' }}>
          {parseBoldText(content.substring(2))}
        </li>
      );
    }

    if (isNumberedList) {
      const match = content.match(/^(\d+\.)\s(.*)/);
      return (
        <div key={lineIdx} style={{ display: 'flex', gap: '6px', fontSize: '0.78rem', lineHeight: '1.5', margin: '4px 0 4px 6px' }}>
          <strong style={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', minWidth: '18px' }}>{match ? match[1] : ''}</strong>
          <span>{parseBoldText(match ? match[2] : content)}</span>
        </div>
      );
    }

    // Standard paragraphs
    return (
      <p key={lineIdx} style={{ fontSize: '0.78rem', lineHeight: '1.5', margin: '6px 0' }}>
        {parseBoldText(content)}
      </p>
    );
  });
};

const AiCoach = () => {
  const { trades, analytics, fetchTrades, fetchAnalytics } = useTrades();
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Sync initial stats
  useEffect(() => {
    if (!trades.length) {
      fetchTrades({ limit: 200 });
    }
    if (!analytics) {
      fetchAnalytics();
    }
  }, []);

  // Initialize with a welcome message from the coach if history is empty
  useEffect(() => {
    const saved = localStorage.getItem('tradezella_ai_chat');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch (e) {
        // Fallback
      }
    }
    
    setMessages([
      {
        role: 'assistant',
        content: `Hello! I am your **Trading Journal AI Trading Coach**. 

I scan your journal database to find execution leaks, emotional traps, and risk management improvements. 

How is your trading session going today? Feel free to ask me questions like:
- *"Analyze my FOMO and psychology logs"*
- *"How can I improve my win rate?"*
- *"Review my setups and strategies"*
        `
      }
    ]);
  }, []);

  // Save chat to local storage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('tradezella_ai_chat', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Extract quick metrics to display in the side bar
  const summaryMetrics = useMemo(() => {
    if (!trades.length) return null;
    const wins = trades.filter(t => t.pnl > 0);
    const totalPnL = trades.reduce((acc, t) => acc + t.pnl, 0);
    const winRate = ((wins.length / trades.length) * 100).toFixed(1);
    
    // Average FOMO Level
    const fomos = trades.map(t => t.fomoLevel || 5);
    const avgFomo = fomos.length ? (fomos.reduce((a, b) => a + b, 0) / fomos.length).toFixed(1) : '5.0';

    // Best Setup
    const setups = {};
    trades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setups[s]) setups[s] = 0;
      setups[s] += t.pnl;
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
      bestSetup: bestSetup !== 'None' ? bestSetup : '—',
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
      // Fetch response from server using message history
      const response = await aiApi.chat(updatedMessages);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I'm having trouble connecting to the analytics engine. Please make sure the backend server is running and try again."
        }
      ]);
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

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the conversation history?")) {
      const initial = [
        {
          role: 'assistant',
          content: "Chat cleared. I'm ready to review your trading records. What would you like to analyze next?"
        }
      ];
      setMessages(initial);
      localStorage.setItem('tradezella_ai_chat', JSON.stringify(initial));
    }
  };

  // Preset Chips
  const suggestionChips = [
    { label: "Analyze Psychology & FOMO", query: "Analyze my FOMO and psychology logs" },
    { label: "Check Win Rate & Expectancy", query: "How can I improve my win rate?" },
    { label: "Audit Setup Strategies", query: "Review my setups and strategies" },
    { label: "Risk Management Feedback", query: "Give me risk management tips" }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      gap: 'var(--s4)',
      height: 'calc(100vh - 120px)',
      minHeight: '480px',
      alignItems: 'stretch'
    }}>
      {/* Left Context Panel */}
      <div className="glass anim-fade-up delay-1" style={{
        padding: 'var(--s4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s5)',
        overflowY: 'auto'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="logo-icon" style={{ width: '24px', height: '24px', borderRadius: 'var(--r-sm)' }}>
              <Brain size={13} color="#fff" />
            </span>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>Coaching Core</strong>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            I inspect your local SQLite database of {trades.length} trades to help discover psychological bottlenecks and strategy edge calculations.
          </p>
        </div>

        {/* Database Context Stats */}
        {summaryMetrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <span className="label-sm" style={{ fontSize: '0.58rem' }}>Active Workspace Context</span>
            <div className="glass-deep" style={{ padding: 'var(--s3)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
                <strong style={{ color: summaryMetrics.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>
                  {summaryMetrics.totalPnL >= 0 ? '+' : ''}${summaryMetrics.totalPnL.toFixed(2)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Win Rate:</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{summaryMetrics.winRate}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Avg FOMO:</span>
                <strong style={{ color: parseFloat(summaryMetrics.avgFomo) > 5 ? 'var(--loss)' : 'var(--profit)', fontFamily: 'JetBrains Mono' }}>{summaryMetrics.avgFomo}/10</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Top Strategy:</span>
                <strong style={{ color: 'var(--warn)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px', textAlign: 'right' }} title={summaryMetrics.bestSetup}>{summaryMetrics.bestSetup}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="skeleton" style={{ height: '100px' }} />
        )}

        {/* Suggestion Chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
          <span className="label-sm" style={{ fontSize: '0.58rem' }}>Quick Diagnostics</span>
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
                padding: '6px 10px',
                fontSize: '0.7rem',
                whiteSpace: 'normal',
                borderRadius: 'var(--r-md)',
                borderColor: 'var(--border)'
              }}
            >
              <span style={{ color: 'var(--accent)', display: 'flex', marginRight: '4px' }}><Sparkles size={11} /></span>
              {chip.label}
            </button>
          ))}
        </div>

        <button
          className="btn btn-danger btn-sm"
          onClick={handleClearChat}
          style={{ marginTop: 'auto', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
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
        borderRadius: 'var(--r-lg)'
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
            <span style={{ color: 'var(--accent)', display: 'flex' }}><Bot size={16} /></span>
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>Coach Terminal</span>
          </div>
          <span style={{
            fontSize: '0.62rem',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            Offline Analytics Model
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
          {messages.map((msg, idx) => (
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
              {/* Profile Avatar Badge */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--r-sm)',
                background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent), #a78bfa)' : 'var(--bg-elevated)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.role === 'user' ? (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff' }}>U</span>
                ) : (
                  <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={12} /></span>
                )}
              </div>

              {/* Message Box */}
              <div style={{
                background: msg.role === 'user' ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                border: '1px solid',
                borderColor: msg.role === 'user' ? 'var(--border-accent)' : 'var(--border)',
                borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                padding: '10px 14px',
                color: 'var(--text-secondary)',
                boxShadow: 'var(--shadow-xs)',
              }}>
                {formatMessageContent(msg.content)}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--r-sm)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'var(--accent)', display: 'flex' }}><Cpu size={12} /></span>
              </div>
              <div className="glass" style={{
                borderRadius: '12px 12px 12px 0',
                padding: '10px 16px',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)'
              }}>
                <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite' }} />
                <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.2s' }} />
                <span className="status-dot live" style={{ animation: 'pulse-glow 1s infinite 0.4s' }} />
              </div>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Form Bar */}
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
            placeholder={loading ? "Coach is generating response..." : "Ask your coach about win rate, fomo, strategy leaks..."}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
            style={{
              flex: 1,
              height: '36px',
              fontSize: '0.78rem',
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-mid)'
            }}
          />
          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !inputVal.trim()}
            style={{
              padding: '0 var(--s4)',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--r-md)',
              boxShadow: '0 0 12px var(--accent-glow)'
            }}
          >
            <Send size={13} style={{ marginRight: '6px' }} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiCoach;
