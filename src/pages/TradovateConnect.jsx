import React, { useState, useEffect, useCallback, useRef } from 'react';
import { tradovate } from '../services/api';
import {
  Wifi, Shield, Zap, TrendingUp, Lock,
  Server, Hash, Eye, EyeOff, ChevronRight, ChevronLeft, CheckCircle2,
  XCircle, AlertTriangle, Activity, BarChart2, Globe,
  ArrowRight, Layers, Clock, LogOut, MessageSquare, Send, RefreshCw, HelpCircle
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Mini Trading Chart
   ═══════════════════════════════════════════════════════ */
const MiniChart = ({ style, color = '#ff6b00', delay = 0 }) => {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 30 + Math.sin(i * 0.7 + delay) * 15 + Math.cos(i * 0.3) * 8;
    return `${i * 14},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 266 60" style={{ width: '100%', height: '100%', ...style }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`cg-trado-${delay}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6"
        style={{ animation: `chartDraw 3s ease ${delay * 0.2}s both` }} />
      <polygon points={`0,60 ${points} 266,60`} fill={`url(#cg-trado-${delay})`} opacity="0.4"
        style={{ animation: `chartDraw 3s ease ${delay * 0.2}s both` }} />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════
   FLOATING FUTURES CONTRACTS TICKER
   ═══════════════════════════════════════════════════════ */
const FuturesTicker = () => {
  const tickers = [
    { symbol: 'NQ (E-mini Nasdaq)', price: '18,910.50', change: '+0.42%', up: true },
    { symbol: 'ES (E-mini S&P 500)', price: '5,410.25', change: '-0.15%', up: false },
    { symbol: 'CL (Crude Oil)', price: '78.42', change: '+1.10%', up: true },
    { symbol: 'GC (Gold)', price: '2,382.40', change: '+0.65%', up: true },
    { symbol: 'YM (Dow 30 E-mini)', price: '39,120', change: '-0.08%', up: false },
    { symbol: 'RTY (Russell 2000)', price: '2,024.10', change: '+0.33%', up: true },
    { symbol: 'MNQ (Micro Nasdaq)', price: '18,910.50', change: '+0.42%', up: true },
    { symbol: 'MES (Micro S&P 500)', price: '5,410.25', change: '-0.15%', up: false },
  ];

  return (
    <div style={{
      display: 'flex', gap: '24px', overflow: 'hidden', padding: '10px 0',
      maskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      borderRadius: '12px 12px 0 0',
    }}>
      <div style={{
        display: 'flex', gap: '24px', animation: 'tickerScroll 30s linear infinite',
        whiteSpace: 'nowrap',
      }}>
        {[...tickers, ...tickers].map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.68rem', fontFamily: 'JetBrains Mono, monospace',
          }}>
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>{t.symbol}</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{t.price}</span>
            <span style={{
              color: t.up ? 'var(--profit)' : 'var(--loss)', fontWeight: 600,
              fontSize: '0.6rem',
            }}>{t.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   ACCOUNT TYPE CARD
   ═══════════════════════════════════════════════════════ */
const AccountCard = ({ type, title, description, icon, selected, onClick, features }) => {
  const accentColor = '#ff6b00';
  const accentSoft = 'rgba(255, 107, 0, 0.1)';
  const accentHover = '#e05e00';

  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 240px',
        background: selected
          ? `linear-gradient(135deg, ${accentSoft}, var(--bg-hover))`
          : 'var(--bg-secondary)',
        border: selected
          ? `2px solid ${accentColor}`
          : '2px solid var(--border)',
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}
    >
      {selected && (
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '120px', height: '120px', borderRadius: '50%',
          background: `radial-gradient(circle, ${accentSoft}, transparent)`,
          pointerEvents: 'none',
        }} />
      )}

      {/* Mini chart background */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '50px',
        opacity: selected ? 0.25 : 0.08, pointerEvents: 'none',
      }}>
        <MiniChart color={accentColor} delay={type === 'demo' ? 0 : 3} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: `linear-gradient(135deg, ${accentColor}, ${accentHover})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '14px',
          boxShadow: selected ? '0 4px 14px rgba(255, 107, 0, 0.35)' : 'none',
          transition: 'box-shadow 0.3s ease',
        }}>
          {icon}
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700,
          color: 'var(--text-primary)', letterSpacing: '-0.3px',
        }}>{title}</h3>

        {/* Description */}
        <p style={{
          margin: '0 0 12px', fontSize: '0.72rem', lineHeight: 1.4,
          color: 'var(--text-secondary)',
        }}>{description}</p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '0.62rem', color: 'var(--text-secondary)',
            }}>
              <CheckCircle2 size={11} style={{ color: accentColor, flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: selected ? accentColor : 'var(--text-muted)',
          fontSize: '0.68rem', fontWeight: 600,
          transition: 'color 0.3s ease',
        }}>
          Select Server <ArrowRight size={13} />
        </div>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN TRADOVATE CONNECT PAGE
   ═══════════════════════════════════════════════════════ */
const TradovateConnect = () => {
  // Connection states
  const [accountType, setAccountType] = useState('demo');
  const [coachCollapsed, setCoachCollapsed] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Syncing states
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  // AI Chat States
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Futures Margin & Risk Coach** here, backed by **NVIDIA Llama-3.1-Nemotron-70B**.
      
I can assist you with contract calculations, position sizing limits, margin alerts, or prop firm recovery. Try asking:
* *"NQ vs ES tick values"*
* *"Margin management rules"*
* *"Recovering from challenge drawdowns"*`
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  // Fetch status on mount
  useEffect(() => {
    tradovate.status()
      .then(data => {
        if (data.connected) {
          setConnection(data.connection);
        }
      })
      .catch(() => {});
  }, []);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Handle connection submit
  const handleConnect = async (e) => {
    e.preventDefault();
    if (!username || !password || !appId || !appSecret) {
      setError('Please fill in all Tradovate credentials');
      return;
    }
    setConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await tradovate.connect(username, password, appId, appSecret, accountType);
      if (data.success) {
        setConnection(data.connection);
        setSuccess(data.message);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Connection to Tradovate API failed');
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = async () => {
    setError(null);
    setSuccess(null);
    try {
      await tradovate.disconnect();
      setConnection(null);
      setUsername('');
      setAppId('');
      setAppSecret('');
      setSyncMessage(null);
    } catch (err) {
      setError(err.message || 'Disconnect failed');
    }
  };

  // Sync simulated futures trades
  const handleSyncTrades = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const data = await tradovate.syncTrades();
      if (data.success) {
        setSyncMessage({ type: 'success', text: data.message });
        // Update local balance
        setConnection(prev => prev ? { ...prev, cashBalance: data.cashBalance } : null);
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message || 'Failed to sync trades' });
    } finally {
      setSyncing(false);
    }
  };

  // AI Chat Submit
  const handleSendChatMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { role: 'user', content: chatInput };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await tradovate.chat(newMsgs);
      setMessages([...newMsgs, { role: 'assistant', content: res.content }]);
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', content: `❌ Error: ${err.message || 'Failed to fetch AI reply'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setUsername('SimUser_88');
    setAppId('Demo_Sync_Client');
    setAppSecret('SEC-4928A-BD929');
    setPassword('SimulatedPassword123');
  };

  // Page Styling Helpers
  const pageStyle = {
    minHeight: 'calc(100vh - 80px)',
    background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-xl)',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 38px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)',
    fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
    outline: 'none', transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', marginBottom: '5px',
    fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  };

  // Format helper for system messages
  const parseBoldText = (text) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, idx) => {
      if (idx % 2 === 1) {
        return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{part}</strong>;
      }
      return part;
    });
  };

  const formatMessageContent = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      let content = line.trim();
      if (!content) return <div key={lineIdx} style={{ height: '4px' }} />;

      if (content.startsWith('### ')) {
        return (
          <h4 key={lineIdx} style={{ fontSize: '0.78rem', fontWeight: 700, margin: '6px 0 2px 0', color: 'var(--text-primary)' }}>
            {parseBoldText(content.slice(4))}
          </h4>
        );
      }
      if (content.startsWith('**') && content.endsWith('**') && content.length > 4) {
        return (
          <h5 key={lineIdx} style={{ fontSize: '0.72rem', fontWeight: 600, margin: '4px 0 2px 0', color: 'var(--text-secondary)' }}>
            {parseBoldText(content.slice(2, -2))}
          </h5>
        );
      }

      const isBulletList = content.startsWith('- ') || content.startsWith('* ');
      if (isBulletList) {
        return (
          <li key={lineIdx} style={{ marginLeft: '10px', paddingLeft: '2px', fontSize: '0.7rem', lineHeight: '1.35', listStyleType: 'disc', margin: '2px 0' }}>
            {parseBoldText(content.substring(2))}
          </li>
        );
      }

      return (
        <p key={lineIdx} style={{ fontSize: '0.7rem', lineHeight: '1.35', margin: '2px 0' }}>
          {parseBoldText(content)}
        </p>
      );
    });
  };

  return (
    <div style={pageStyle}>
      {/* ── Background Grid Pattern ─────────────────── */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(var(--border) 1px, transparent 1px),
          linear-gradient(90deg, var(--border) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        opacity: 0.25,
      }} />

      {/* ── Top Orange Glow ────────────────────────── */}
      <div style={{
        position: 'absolute', top: '-120px', left: '30%', transform: 'translateX(-50%)',
        width: '600px', height: '320px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255, 107, 0, 0.15), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Scrolling Futures Quotes Ticker ─────────── */}
      <FuturesTicker />

      {/* ── Page Layout Wrapper ─────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
        
        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '4px 12px', borderRadius: '12px',
              background: 'rgba(255, 107, 0, 0.1)',
              border: '1px solid rgba(255, 107, 0, 0.25)',
              marginBottom: '8px', fontSize: '0.62rem', fontWeight: 600,
              color: '#ff6b00', letterSpacing: '0.5px',
            }}>
              <Shield size={10} /> SECURE TRADOVATE API SYNC
            </div>
            <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Futures Trading & Tradovate
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Simulate or authenticate your Tradovate API session to import intraday equity futures logs.
            </p>
          </div>

          {!connection && (
            <button 
              type="button" 
              onClick={fillDemoCredentials}
              className="btn btn-ghost"
              style={{
                fontSize: '0.72rem',
                border: '1px dashed #ff6b00',
                padding: '6px 12px',
                height: 'auto',
                color: '#ff6b00',
                borderRadius: '8px',
                background: 'rgba(255, 107, 0, 0.05)'
              }}
            >
              Fill Demo Credentials
            </button>
          )}
        </div>

        {/* Split Section Layout: Left Connection/Dashboard, Right AI Risk Coach */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: coachCollapsed ? '1fr 48px' : '1.2fr 1fr',
          gap: coachCollapsed ? '12px' : '24px',
          alignItems: 'stretch',
          flex: 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          
          {/* Left Column: Connect Form or Connected Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {!connection ? (
              // Not Connected Panel
              <>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <AccountCard
                    type="demo"
                    title="Simulation Account"
                    description="Connect to Tradovate Simulation Server."
                    icon={<Layers size={18} color="#fff" />}
                    selected={accountType === 'demo'}
                    onClick={() => setAccountType('demo')}
                    features={[
                      'Simulated paper trading logs',
                      'No margin call risk',
                      'Sync mock ES, NQ, CL trades',
                      'Refining futures position sizing rules'
                    ]}
                  />
                  <AccountCard
                    type="live"
                    title="Live Brokerage"
                    description="Connect your Tradovate live funding server."
                    icon={<Zap size={18} color="#fff" />}
                    selected={accountType === 'live'}
                    onClick={() => setAccountType('live')}
                    features={[
                      'Direct live market account access',
                      'Prop firm credentials integration',
                      'Synchronize actual cash balances',
                      'Secure OAuth session management'
                    ]}
                  />
                </div>

                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-mid)',
                  borderRadius: '16px', padding: '24px',
                  backdropFilter: 'blur(20px)',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #ff6b00, #ff8c3a)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Lock size={14} color="#fff" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Tradovate Credentials
                      </h3>
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                        {accountType === 'demo' ? 'Simulation API Server' : 'Live Trading Account'} · Secured via SSL
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* Username */}
                      <div>
                        <label style={labelStyle}>Tradovate Username</label>
                        <div style={{ position: 'relative' }}>
                          <Hash size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="e.g. Trader_User"
                            style={inputStyle}
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label style={labelStyle}>Password</label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="API Password"
                            style={{ ...inputStyle, paddingRight: '36px' }}
                            required
                          />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{
                              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                              color: 'var(--text-muted)', opacity: 0.7,
                            }}>
                            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* App ID */}
                      <div>
                        <label style={labelStyle}>App ID</label>
                        <div style={{ position: 'relative' }}>
                          <Server size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                          <input
                            type="text"
                            value={appId}
                            onChange={e => setAppId(e.target.value)}
                            placeholder="e.g. MyJournalSyncApp"
                            style={inputStyle}
                            required
                          />
                        </div>
                      </div>

                      {/* App Secret */}
                      <div>
                        <label style={labelStyle}>App Secret</label>
                        <div style={{ position: 'relative' }}>
                          <Shield size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.6 }} />
                          <input
                            type="password"
                            value={appSecret}
                            onChange={e => setAppSecret(e.target.value)}
                            placeholder="App Secret Token"
                            style={inputStyle}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'var(--loss-soft)', border: '1px solid var(--loss-border)',
                        color: 'var(--loss)', fontSize: '0.72rem',
                        animation: 'fadeIn 0.3s ease both',
                      }}>
                      <XCircle size={13} /> {error}
                      </div>
                    )}

                    <button type="submit" disabled={connecting}
                      style={{
                        width: '100%', padding: '12px',
                        background: connecting ? 'var(--bg-active)' : 'linear-gradient(135deg, #ff6b00, #ff8c3a)',
                        border: 'none', borderRadius: '10px',
                        color: connecting ? 'var(--text-muted)' : '#fff',
                        fontSize: '0.8rem', fontWeight: 700,
                        cursor: connecting ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        transition: 'all 0.3s ease',
                        boxShadow: connecting ? 'none' : '0 4px 16px rgba(255, 107, 0, 0.25)',
                        marginTop: '6px'
                      }}>
                      {connecting ? (
                        <>
                          <Activity size={14} className="spin-anim" />
                          Connecting to Tradovate Session...
                        </>
                      ) : (
                        <>
                          <Wifi size={14} />
                          Establish Tradovate Connection
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              // Connected Dashboard
              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.08), transparent)',
                border: '1px solid rgba(255, 107, 0, 0.2)',
                borderRadius: '16px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '20px',
                animation: 'fadeIn 0.5s ease both',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: '#ff6b00',
                      boxShadow: '0 0 10px #ff6b00',
                      animation: 'pulse-glow 2s ease-in-out infinite',
                    }} />
                    <span style={{ color: '#ff6b00', fontWeight: 700, fontSize: '0.85rem' }}>Active Tradovate Sync Session</span>
                  </div>
                  <button onClick={handleDisconnect} style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 12px', border: '1px solid var(--loss-border)',
                    borderRadius: '8px', background: 'var(--loss-soft)',
                    color: 'var(--loss)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 500,
                    transition: 'all 0.2s ease',
                  }}>
                    <LogOut size={11} /> Disconnect
                  </button>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px'
                }}>
                  {[
                    { label: 'Account Code', value: connection.accountNumber, icon: <Hash size={12} /> },
                    { label: 'Session Status', value: 'Connected (Live Data)', icon: <Activity size={12} /> },
                    { label: 'Account Type', value: connection.accountType === 'demo' ? 'Tradovate Simulation' : 'Live Brokerage', icon: <Layers size={12} /> },
                    { label: 'Margin Allocation Ratio', value: connection.marginRatio, icon: <BarChart2 size={12} /> },
                    { label: 'Currency', value: connection.currency, icon: <Globe size={12} /> },
                    { label: 'Connection Stamp', value: new Date(connection.connectedAt).toLocaleTimeString(), icon: <Clock size={12} /> },
                  ].map((item, i) => (
                    <div key={i} style={{
                      padding: '10px 12px', borderRadius: '10px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '0.55rem', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
                        marginBottom: '3px',
                      }}>
                        {item.icon} {item.label}
                      </div>
                      <div style={{
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cash Balance Counter */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Simulated Cash Balance
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
                      ${parseFloat(connection.cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(255, 107, 0, 0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#ff6b00'
                  }}>
                    <TrendingUp size={20} />
                  </div>
                </div>

                {/* Synchronize Futures Action Panel */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px dashed rgba(255, 107, 0, 0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Sync Futures Orders
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                      Fetches closed positions for E-mini contracts (NQ, ES, CL) and inserts them into SQLite.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncTrades}
                    disabled={syncing}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: syncing ? 'var(--bg-active)' : 'linear-gradient(135deg, #ff6b00, #ff8c3a)',
                      color: syncing ? 'var(--text-muted)' : '#fff',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      border: 'none',
                      cursor: syncing ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: syncing ? 'none' : '0 4px 12px rgba(255, 107, 0, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <RefreshCw size={14} className={syncing ? 'spin-anim' : ''} />
                    {syncing ? 'Fetching Trades from Tradovate...' : 'Sync Tradovate Futures Log'}
                  </button>

                  {syncMessage && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '6px',
                      background: syncMessage.type === 'success' ? 'var(--profit-soft)' : 'var(--loss-soft)',
                      border: `1px solid ${syncMessage.type === 'success' ? 'var(--profit-border)' : 'var(--loss-border)'}`,
                      color: syncMessage.type === 'success' ? 'var(--profit)' : 'var(--loss)',
                      fontSize: '0.72rem',
                      animation: 'fadeIn 0.3s ease both'
                    }}>
                      {syncMessage.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                      <span>{syncMessage.text}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Specs Cheat Sheet */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              padding: '20px',
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HelpCircle size={14} style={{ color: '#ff6b00' }} /> Futures Contract Specification Cheat Sheet
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.68rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-strong)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '6px 4px' }}>Symbol</th>
                      <th style={{ padding: '6px 4px' }}>Description</th>
                      <th style={{ padding: '6px 4px' }}>Tick Size</th>
                      <th style={{ padding: '6px 4px' }}>Tick Value</th>
                      <th style={{ padding: '6px 4px' }}>Point Value</th>
                      <th style={{ padding: '6px 4px' }}>Intraday Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sym: 'NQ', desc: 'E-mini Nasdaq 100', tick: '0.25', value: '$5.00', ptVal: '$20.00', margin: '$1,000' },
                      { sym: 'ES', desc: 'E-mini S&P 500', tick: '0.25', value: '$12.50', ptVal: '$50.00', margin: '$500' },
                      { sym: 'CL', desc: 'Crude Oil Light Sweet', tick: '0.01', value: '$10.00', ptVal: '$1,000.00', margin: '$1,000' },
                      { sym: 'GC', desc: 'Gold COMEX', tick: '0.10', value: '$10.00', ptVal: '$100.00', margin: '$1,500' },
                      { sym: 'MNQ', desc: 'Micro E-mini Nasdaq', tick: '0.25', value: '$0.50', ptVal: '$2.00', margin: '$100' },
                      { sym: 'MES', desc: 'Micro E-mini S&P 500', tick: '0.25', value: '$1.25', ptVal: '$5.00', margin: '$50' },
                    ].map((spec, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '8px 4px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{spec.sym}</td>
                        <td style={{ padding: '8px 4px' }}>{spec.desc}</td>
                        <td style={{ padding: '8px 4px', fontFamily: 'JetBrains Mono' }}>{spec.tick}</td>
                        <td style={{ padding: '8px 4px', fontFamily: 'JetBrains Mono', color: 'var(--profit)' }}>{spec.value}</td>
                        <td style={{ padding: '8px 4px', fontFamily: 'JetBrains Mono', color: 'var(--profit)' }}>{spec.ptVal}</td>
                        <td style={{ padding: '8px 4px', fontFamily: 'JetBrains Mono', color: '#ff6b00' }}>{spec.margin}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Right Column: NVIDIA Futures Risk Coach (AI Chat) */}
          {coachCollapsed ? (
            <div 
              onClick={() => setCoachCollapsed(false)}
              className="glass tz-card" 
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-mid)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                cursor: 'pointer',
                height: '100%',
                transition: 'all 0.3s ease',
                gap: '20px'
              }}
              title="Expand AI Coach"
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff6b00, #f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 107, 0, 0.4)'
              }}>
                <MessageSquare size={14} color="#fff" />
              </div>
              <div style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                userSelect: 'none',
                opacity: 0.8
              }}>
                NVIDIA AI COACH
              </div>
              <div style={{ flex: 1 }} />
              <div className="status-dot live" style={{ width: '8px', height: '8px', background: '#ff6b00', boxShadow: '0 0 10px #ff6b00' }} />
            </div>
          ) : (
            <div className="glass tz-card" style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-mid)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
              height: '100%'
            }}>
              {/* Coach Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--border)', padding: '12px 16px',
                background: 'var(--bg-primary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ff6b00, #f97316)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <MessageSquare size={14} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      NVIDIA Futures Coach <span className="status-dot live" style={{ width: '6px', height: '6px', background: '#ff6b00', boxShadow: '0 0 8px #ff6b00' }} />
                    </div>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      Llama-3.1-Nemotron-70B-Instruct
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCoachCollapsed(true);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '4px'
                  }}
                  title="Collapse AI Coach"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Messages Stream */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                minHeight: '260px'
              }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    background: msg.role === 'user' ? '#ff6b00' : 'var(--bg-primary)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    borderRadius: msg.role === 'user' ? '12px 12px 0 12px' : '0 12px 12px 12px',
                    padding: '8px 10px',
                    fontSize: '0.7rem',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                    animation: 'fadeIn 0.25s ease both'
                  }}>
                    <div style={{
                      fontSize: '0.55rem',
                      color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                      marginBottom: '2px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {msg.role === 'user' ? 'YOU' : 'NVIDIA COACH'}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {msg.role === 'user' ? msg.content : formatMessageContent(msg.content)}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div style={{
                    alignSelf: 'flex-start', background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    padding: '8px 12px', borderRadius: '0 12px 12px 12px', display: 'flex', alignItems: 'center', gap: '6px',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ff6b00', animation: 'bounce 0.8s infinite 0.1s' }} />
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ff6b00', animation: 'bounce 0.8s infinite 0.2s' }} />
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#ff6b00', animation: 'bounce 0.8s infinite 0.3s' }} />
                    </div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 500 }}>Coach is formulating sizing checks...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Suggestions Chips */}
              <div style={{ padding: '0 12px 6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Margin & Sizing Queries
                </div>
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                  {[
                    { text: 'Compare NQ vs MNQ tick sizing rules', label: 'NQ vs MNQ Specifications' },
                    { text: 'How to manage daily drawdown limits on Tradovate?', label: 'Daily Drawdowns' },
                    { text: 'Explain day trading vs maintenance margins', label: 'Margin Types' },
                    { text: 'What position size for a $50k account?', label: 'Sizing Rules' }
                  ].map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setChatInput(s.text);
                      }}
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.65rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'border-color 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = '#ff6b00'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Input Field */}
              <form onSubmit={handleSendChatMessage} style={{
                display: 'flex', borderTop: '1px solid var(--border)', padding: '8px 12px',
                background: 'var(--bg-primary)', gap: '6px', alignItems: 'center'
              }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Ask Nvidia Coach about sizing/margins..."
                  style={{
                    flex: 1,
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-mid)',
                    borderRadius: 'var(--r-md)',
                    padding: '8px 12px',
                    fontSize: '0.7rem',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    background: chatInput.trim() && !chatLoading ? '#ff6b00' : 'var(--border)',
                    color: chatInput.trim() && !chatLoading ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: 'var(--r-md)',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: chatInput.trim() && !chatLoading ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Futures Risk Disclaimer Banner */}
        <div style={{
          padding: '14px 18px', borderRadius: '12px',
          background: 'rgba(255, 107, 0, 0.05)',
          border: '1px solid rgba(255, 107, 0, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertTriangle size={14} style={{ color: '#ff6b00', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ff6b00', marginBottom: '3px' }}>
                CFTC RULE 4.41 & LEVERAGED FUTURES RISK DISCLAIMER
              </div>
              <p style={{ margin: 0, fontSize: '0.62rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                FUTURES TRADING INVOLVES SIGNIFICANT RISK OF LOSS AND IS NOT SUITABLE FOR ALL TRADERS. Leveraged contracts can amplify both losses and gains. 
                Any simulated account performance displayed here is hypothetical and does not represent actual live market executions. 
                Day trading margins are subject to strict broker liquidation if equity drops below required thresholds. Use of MT5 or Tradovate sync utilities is solely 
                at your own discretion and risk.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Copy */}
      <div style={{
        textAlign: 'center', padding: '12px', fontSize: '0.58rem',
        color: 'var(--text-muted)', borderTop: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        © {new Date().getFullYear()} Trading Journal · Tradovate® is a registered trademark of Tradovate Technologies, LLC.
      </div>

      {/* Keyframe Styles Injection */}
      <style>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes chartDraw {
          from { stroke-dasharray: 1000; stroke-dashoffset: 1000; opacity: 0; }
          to { stroke-dasharray: 0; stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 4px #ff6b00; opacity: 0.8; }
          50% { box-shadow: 0 0 14px #ff6b00; opacity: 1; }
          100% { box-shadow: 0 0 4px #ff6b00; opacity: 0.8; }
        }
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TradovateConnect;
