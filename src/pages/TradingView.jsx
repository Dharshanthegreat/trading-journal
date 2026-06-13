import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { tradingview } from '../services/api';
import {
  TrendingUp, TrendingDown, Search, Wifi, WifiOff, Zap,
  Activity, BarChart2, Target, ArrowUpCircle, ArrowDownCircle,
  MinusCircle, RefreshCw, Clock, Layers, ChevronRight, AlertTriangle
} from 'lucide-react';

/* ─── Signal color helpers ──────────────────────────── */
const signalColor = (signal) => {
  switch (signal) {
    case 'Strong Buy': return '#22c55e';
    case 'Buy': return '#4ade80';
    case 'Neutral': return '#f59e0b';
    case 'Sell': return '#f87171';
    case 'Strong Sell': return '#ef4444';
    default: return 'var(--text-muted)';
  }
};

const signalIcon = (signal, size = 14) => {
  switch (signal) {
    case 'Buy': case 'Strong Buy':
      return <ArrowUpCircle size={size} style={{ color: signalColor(signal) }} />;
    case 'Sell': case 'Strong Sell':
      return <ArrowDownCircle size={size} style={{ color: signalColor(signal) }} />;
    default:
      return <MinusCircle size={size} style={{ color: signalColor('Neutral') }} />;
  }
};

/* ─── Gauge Component ─────────────────────────────── */
const RadialGauge = ({ value, max = 100, label, color, size = 90 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth="5" opacity="0.3" />
        <circle cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
          style={{ fill: color, fontSize: size * 0.22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </text>
      </svg>
      {label && <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>}
    </div>
  );
};

/* ─── Signal Strength Bar ─────────────────────────── */
const SignalBar = ({ buy, sell, neutral, total }) => {
  const bp = total ? (buy / total * 100) : 0;
  const sp = total ? (sell / total * 100) : 0;
  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden',
        background: 'var(--bg-primary)', gap: '1px',
      }}>
        <div style={{ width: `${bp}%`, background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: '3px 0 0 3px', transition: 'width 0.6s ease' }} />
        <div style={{ flexGrow: 1, background: 'var(--border)' }} />
        <div style={{ width: `${sp}%`, background: 'linear-gradient(90deg, #f87171, #ef4444)', borderRadius: '0 3px 3px 0', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
        <span style={{ color: '#4ade80' }}>{buy} Buy</span>
        <span>{neutral} Neutral</span>
        <span style={{ color: '#f87171' }}>{sell} Sell</span>
      </div>
    </div>
  );
};

/* ─── Support/Resistance Level ────────────────────── */
const SRLevel = ({ level, label, strength, type, price, minPrice, maxPrice }) => {
  const range = maxPrice - minPrice || 1;
  const position = ((level - minPrice) / range) * 100;
  const pricePos = ((price - minPrice) / range) * 100;
  const isSupport = type === 'support';
  const color = isSupport ? '#22c55e' : '#ef4444';
  const opacityMap = { Strong: 1, Medium: 0.7, Weak: 0.4 };

  return (
    <div style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center' }}>
      <div style={{
        position: 'absolute', left: `${position}%`, transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
        opacity: opacityMap[strength] || 0.6,
      }}>
        <span style={{
          fontSize: '0.55rem', fontWeight: 600, color,
          background: `${color}15`, padding: '1px 5px', borderRadius: '3px',
          border: `1px solid ${color}30`, fontFamily: 'JetBrains Mono, monospace',
          whiteSpace: 'nowrap',
        }}>
          {label} ${level}
        </span>
        <div style={{ width: '1px', height: '8px', background: color }} />
      </div>
    </div>
  );
};

/* ─── TradingView Widget ───────────────────────────── */
const TradingViewWidget = ({ symbol }) => {
  const containerId = 'tradingview-widget-container-main';
  const scriptAdded = useRef(false);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '';
    }

    const loadWidget = () => {
      if (window.TradingView) {
        // Handle forex, crypto, stock exchanges appropriately or fallback to BINANCE/FOREXCOM
        let formattedSymbol = symbol;
        if (!symbol.includes(':')) {
          if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD'].includes(symbol)) {
            formattedSymbol = `FX:${symbol}`;
          } else if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD', 'DOGEUSD'].includes(symbol)) {
            formattedSymbol = `COINBASE:${symbol}`;
          } else if (['ES', 'NQ', 'CL', 'GC'].includes(symbol)) {
            formattedSymbol = `CME_MINI:${symbol}1!`;
          } else {
            formattedSymbol = `NASDAQ:${symbol}`;
          }
        }

        new window.TradingView.widget({
          width: '100%',
          height: 480,
          symbol: formattedSymbol,
          interval: 'D',
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
        });
      }
    };

    if (!window.TradingView) {
      if (!scriptAdded.current) {
        scriptAdded.current = true;
        const script = document.createElement('script');
        script.id = 'tradingview-widget-script';
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        script.onload = loadWidget;
        document.head.appendChild(script);
      }
    } else {
      loadWidget();
    }
  }, [symbol]);

  return (
    <div style={{ height: '480px', width: '100%', borderRadius: 'var(--r-lg)', overflow: 'hidden', border: '1px solid var(--border-mid)' }}>
      <div id={containerId} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

/* ─── Main TradingView Page ───────────────────────── */
const TradingView = () => {
  const { trades } = useTrades();

  // State
  const [symbol, setSymbol] = useState('');
  const [timeframe, setTimeframe] = useState('1D');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mcpStatus, setMcpStatus] = useState({ status: 'unknown' });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allSymbols, setAllSymbols] = useState({ userSymbols: [], popular: [], all: [] });
  const inputRef = useRef(null);

  const timeframes = ['1H', '4H', '1D', '1W', '1M'];

  // Fetch symbols and status on mount
  useEffect(() => {
    tradingview.status().then(setMcpStatus).catch(() => setMcpStatus({ status: 'offline' }));
    tradingview.symbols().then(setAllSymbols).catch(() => {});
  }, []);

  // Filter suggestions
  useEffect(() => {
    if (!symbol.trim()) {
      setSuggestions(allSymbols.all.slice(0, 12));
    } else {
      const q = symbol.toUpperCase();
      const filtered = allSymbols.all.filter(s => s.includes(q)).slice(0, 8);
      setSuggestions(filtered);
    }
  }, [symbol, allSymbols]);

  // Analyze handler
  const handleAnalyze = useCallback(async (sym) => {
    const target = (sym || symbol).trim().toUpperCase();
    if (!target) return;
    setSymbol(target);
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const data = await tradingview.analyze(target, timeframe);
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe]);

  // Cross-reference trades for current symbol
  const symbolTrades = useMemo(() => {
    if (!analysis?.symbol) return null;
    const sym = analysis.symbol.toUpperCase();
    const matched = trades.filter(t => t.symbol?.toUpperCase() === sym);
    if (!matched.length) return null;

    const wins = matched.filter(t => t.pnl > 0);
    const netPnl = matched.reduce((a, t) => a + (t.pnl || 0), 0);
    const winRate = matched.length ? ((wins.length / matched.length) * 100).toFixed(1) : '0';
    const lastTrade = matched.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    return {
      total: matched.length,
      wins: wins.length,
      losses: matched.length - wins.length,
      winRate,
      netPnl,
      lastTradeDate: lastTrade?.date,
      avgEntry: +(matched.reduce((a, t) => a + (t.entry_price || 0), 0) / matched.length).toFixed(2),
    };
  }, [analysis, trades]);

  // Key handler
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAnalyze();
    }
  };

  /* ─── Card Style ─────────────────────────────────── */
  const cardStyle = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)',
    padding: '16px',
    transition: 'all var(--t-normal)',
  };

  const cardHeaderStyle = {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
    marginBottom: '12px',
  };

  /* ─── Render ─────────────────────────────────────── */
  return (
    <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>

      {/* ── Search Header ─────────────────────────── */}
      <div className="glass" style={{
        padding: '20px 24px', borderRadius: 'var(--r-xl)',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: 'var(--r-md)',
              background: 'linear-gradient(135deg, var(--accent), #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={18} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                TradingView Analysis
              </h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                MCP-powered technical indicators
              </span>
            </div>
          </div>

          {/* MCP Status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: 'var(--r-full)',
            background: mcpStatus.status === 'connected' ? '#22c55e15' : mcpStatus.status === 'mock' ? '#f59e0b15' : '#ef444415',
            border: `1px solid ${mcpStatus.status === 'connected' ? '#22c55e30' : mcpStatus.status === 'mock' ? '#f59e0b30' : '#ef444430'}`,
            fontSize: '0.6rem', fontWeight: 500,
            color: mcpStatus.status === 'connected' ? '#22c55e' : mcpStatus.status === 'mock' ? '#f59e0b' : '#ef4444',
          }}>
            {mcpStatus.status === 'connected' ? <Wifi size={11} /> : mcpStatus.status === 'mock' ? <Zap size={11} /> : <WifiOff size={11} />}
            {mcpStatus.status === 'connected' ? 'MCP Live' : mcpStatus.status === 'mock' ? 'Demo Mode' : 'Offline'}
          </div>
        </div>

        {/* Search + Timeframe Row */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Symbol Input */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'var(--bg-primary)', border: '1px solid var(--border-mid)',
              borderRadius: 'var(--r-md)', padding: '0 12px',
              transition: 'border-color var(--t-fast)',
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={handleKeyDown}
                placeholder="Search symbol (AAPL, BTCUSD, ES...)"
                style={{
                  flex: 1, border: 'none', background: 'none', outline: 'none',
                  color: 'var(--text-primary)', fontSize: '0.8rem', padding: '10px 0',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
                }}
              />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="anim-fade-up" style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)',
                borderRadius: 'var(--r-md)', zIndex: 100, maxHeight: '200px',
                overflowY: 'auto', boxShadow: 'var(--shadow-lg)',
              }}>
                {allSymbols.userSymbols.length > 0 && (
                  <div style={{ padding: '6px 10px', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                    Your Symbols
                  </div>
                )}
                {suggestions.filter(s => allSymbols.userSymbols.includes(s)).map(s => (
                  <button key={`u-${s}`} onMouseDown={() => { setSymbol(s); handleAnalyze(s); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                      color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
                      textAlign: 'left', transition: 'background var(--t-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <TrendingUp size={12} style={{ color: 'var(--accent)' }} /> {s}
                  </button>
                ))}
                {suggestions.filter(s => !allSymbols.userSymbols.includes(s)).length > 0 && (
                  <div style={{ padding: '6px 10px', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, borderTop: '1px solid var(--border)' }}>
                    Popular
                  </div>
                )}
                {suggestions.filter(s => !allSymbols.userSymbols.includes(s)).map(s => (
                  <button key={`p-${s}`} onMouseDown={() => { setSymbol(s); handleAnalyze(s); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                      padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer',
                      color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace',
                      textAlign: 'left', transition: 'background var(--t-fast)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <BarChart2 size={12} style={{ color: 'var(--text-muted)' }} /> {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', borderRadius: 'var(--r-md)', padding: '3px', border: '1px solid var(--border)' }}>
            {timeframes.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                style={{
                  padding: '6px 12px', border: 'none', borderRadius: 'var(--r-sm)',
                  background: timeframe === tf ? 'var(--accent)' : 'transparent',
                  color: timeframe === tf ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer', fontSize: '0.68rem', fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                  transition: 'all var(--t-fast)',
                }}>
                {tf}
              </button>
            ))}
          </div>

          {/* Analyze Button */}
          <button onClick={() => handleAnalyze()} disabled={loading || !symbol.trim()}
            style={{
              padding: '10px 20px', border: 'none', borderRadius: 'var(--r-md)',
              background: loading ? 'var(--bg-active)' : 'linear-gradient(135deg, var(--accent), #a78bfa)',
              color: '#fff', cursor: loading ? 'default' : 'pointer',
              fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              opacity: !symbol.trim() ? 0.5 : 1,
              transition: 'all var(--t-fast)',
              boxShadow: loading ? 'none' : '0 2px 12px rgba(99, 102, 241, 0.3)',
            }}>
            {loading ? <RefreshCw size={14} className="spin-anim" /> : <Zap size={14} />}
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="anim-fade-in" style={{
          padding: '12px 16px', borderRadius: 'var(--r-md)',
          background: '#ef444415', border: '1px solid #ef444430',
          color: '#f87171', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Empty State */}
      {!analysis && !loading && !error && (
        <div className="glass anim-fade-in" style={{
          padding: '60px 24px', borderRadius: 'var(--r-xl)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: 'var(--r-xl)',
            background: 'linear-gradient(135deg, var(--accent)15, #a78bfa15)',
            border: '1px solid var(--accent)30',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Enter a Symbol to Begin
            </h3>
            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
              Search for any stock, crypto, forex pair, or futures contract to get instant technical analysis powered by MCP.
            </p>
          </div>

          {/* Quick symbols */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
            {['AAPL', 'TSLA', 'BTCUSD', 'SPY', 'NVDA', 'EURUSD'].map(s => (
              <button key={s} onClick={() => { setSymbol(s); handleAnalyze(s); }}
                style={{
                  padding: '6px 14px', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-full)', background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.68rem',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
                  transition: 'all var(--t-fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !analysis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--s4)' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass skeleton" style={{ height: 180, borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      )}

      {/* ── Analysis Results ──────────────────────── */}
      {analysis && (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>

          {/* Top Row: Signal + Price */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 2fr) minmax(200px, 1fr)', gap: 'var(--s4)' }}>

            {/* Overall Signal Card */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <div style={cardHeaderStyle}>
                <Target size={13} /> Overall Signal
              </div>
              <div style={{
                fontSize: '1.3rem', fontWeight: 800, color: signalColor(analysis.overallSignal),
                textShadow: `0 0 20px ${signalColor(analysis.overallSignal)}30`,
                animation: 'fadeIn 0.5s ease',
              }}>
                {analysis.overallSignal}
              </div>
              <SignalBar
                buy={analysis.signalCounts.buy}
                sell={analysis.signalCounts.sell}
                neutral={analysis.signalCounts.neutral}
                total={analysis.signalCounts.total}
              />
              <div style={{
                fontSize: '0.58rem', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <Clock size={10} />
                {analysis.timeframe} · {analysis.mode === 'mock' ? 'Demo' : 'Live'}
              </div>
            </div>

            {/* Indicators Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

              {/* RSI */}
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px' }}>
                <RadialGauge value={analysis.indicators.rsi.value} max={100} label="RSI"
                  color={analysis.indicators.rsi.value < 30 ? '#22c55e' : analysis.indicators.rsi.value > 70 ? '#ef4444' : '#f59e0b'}
                  size={72} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '4px' }}>RSI (14)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {signalIcon(analysis.indicators.rsi.signal)}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: signalColor(analysis.indicators.rsi.signal) }}>
                      {analysis.indicators.rsi.signal}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {analysis.indicators.rsi.value < 30 ? 'Oversold zone' : analysis.indicators.rsi.value > 70 ? 'Overbought zone' : 'Neutral zone'}
                  </div>
                </div>
              </div>

              {/* MACD */}
              <div style={{ ...cardStyle, padding: '12px 14px' }}>
                <div style={{ ...cardHeaderStyle, marginBottom: '8px' }}>
                  <Layers size={12} /> MACD
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  {signalIcon(analysis.indicators.macd.signal_type)}
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: signalColor(analysis.indicators.macd.signal_type) }}>
                    {analysis.indicators.macd.signal_type}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px', fontSize: '0.58rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Line</div>
                    <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{analysis.indicators.macd.line}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Signal</div>
                    <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>{analysis.indicators.macd.signal}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)' }}>Hist</div>
                    <div style={{
                      fontWeight: 600, fontFamily: 'JetBrains Mono',
                      color: analysis.indicators.macd.histogram > 0 ? '#22c55e' : '#ef4444',
                    }}>{analysis.indicators.macd.histogram > 0 ? '+' : ''}{analysis.indicators.macd.histogram}</div>
                  </div>
                </div>
              </div>

              {/* Moving Averages */}
              <div style={{ ...cardStyle, padding: '12px 14px' }}>
                <div style={{ ...cardHeaderStyle, marginBottom: '8px' }}>
                  <TrendingUp size={12} /> Moving Averages
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.6rem' }}>
                  {[
                    { label: 'EMA 20', value: analysis.indicators.ema20.value, signal: analysis.indicators.ema20.signal },
                    { label: 'EMA 50', value: analysis.indicators.ema50.value, signal: analysis.indicators.ema50.signal },
                    { label: 'SMA 200', value: analysis.indicators.sma200.value, signal: analysis.indicators.sma200.signal },
                  ].map(ma => (
                    <div key={ma.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{ma.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>${ma.value}</span>
                        {signalIcon(ma.signal, 12)}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop: '6px', padding: '4px 8px', borderRadius: 'var(--r-sm)',
                  background: analysis.price > analysis.indicators.ema50.value ? '#22c55e10' : '#ef444410',
                  border: `1px solid ${analysis.price > analysis.indicators.ema50.value ? '#22c55e20' : '#ef444420'}`,
                  fontSize: '0.55rem',
                  color: analysis.price > analysis.indicators.ema50.value ? '#22c55e' : '#ef4444',
                  textAlign: 'center',
                }}>
                  Price ${analysis.price} is {analysis.price > analysis.indicators.ema50.value ? 'above' : 'below'} EMA 50
                </div>
              </div>

              {/* Bollinger Bands */}
              <div style={{ ...cardStyle, padding: '12px 14px' }}>
                <div style={{ ...cardHeaderStyle, marginBottom: '8px' }}>
                  <BarChart2 size={12} /> Bollinger Bands
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ef4444' }}>Upper</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>${analysis.indicators.bollingerBands.upper}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Middle</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>${analysis.indicators.bollingerBands.middle}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#22c55e' }}>Lower</span>
                    <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--text-primary)' }}>${analysis.indicators.bollingerBands.lower}</span>
                  </div>
                </div>
                {analysis.indicators.bollingerBands.squeeze && (
                  <div style={{
                    marginTop: '6px', padding: '3px 8px', borderRadius: 'var(--r-sm)',
                    background: '#f59e0b15', border: '1px solid #f59e0b25',
                    fontSize: '0.55rem', color: '#f59e0b', textAlign: 'center',
                    display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center',
                  }}>
                  <Zap size={10} /> Squeeze Detected — Breakout Imminent
                  </div>
                )}
                <div style={{
                  marginTop: '4px', fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center',
                }}>
                  Width: {analysis.indicators.bollingerBands.width}%
                </div>
              </div>
            </div>

            {/* Trade Cross-Reference Card */}
            <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
              <div style={cardHeaderStyle}>
                <ChevronRight size={13} /> Your Trades · {analysis.symbol}
              </div>

              {symbolTrades ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                  <div style={{
                    textAlign: 'center', padding: '10px', borderRadius: 'var(--r-md)',
                    background: symbolTrades.netPnl >= 0 ? '#22c55e10' : '#ef444410',
                    border: `1px solid ${symbolTrades.netPnl >= 0 ? '#22c55e20' : '#ef444420'}`,
                  }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Net P&L</div>
                    <div style={{
                      fontSize: '1.1rem', fontWeight: 800,
                      fontFamily: 'JetBrains Mono', color: symbolTrades.netPnl >= 0 ? '#22c55e' : '#ef4444',
                    }}>
                      {symbolTrades.netPnl >= 0 ? '+' : ''}${symbolTrades.netPnl.toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.6rem' }}>
                    <div style={{ padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.52rem' }}>Trades</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>{symbolTrades.total}</div>
                    </div>
                    <div style={{ padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.52rem' }}>Win Rate</div>
                      <div style={{ fontWeight: 700, color: parseFloat(symbolTrades.winRate) >= 50 ? '#22c55e' : '#ef4444', fontFamily: 'JetBrains Mono' }}>{symbolTrades.winRate}%</div>
                    </div>
                    <div style={{ padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.52rem' }}>W / L</div>
                      <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        <span style={{ color: '#22c55e' }}>{symbolTrades.wins}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: '#ef4444' }}>{symbolTrades.losses}</span>
                      </div>
                    </div>
                    <div style={{ padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.52rem' }}>Avg Entry</div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono' }}>${symbolTrades.avgEntry}</div>
                    </div>
                  </div>

                  {symbolTrades.lastTradeDate && (
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <Clock size={10} /> Last: {symbolTrades.lastTradeDate}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: '8px',
                  color: 'var(--text-muted)', fontSize: '0.7rem', textAlign: 'center',
                }}>
                  <Activity size={24} style={{ opacity: 0.3 }} />
                  <span>No trades logged for {analysis.symbol}</span>
                  <span style={{ fontSize: '0.58rem' }}>
                    Log trades in the Journal to see cross-reference data here.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Interactive Chart Card */}
          <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            <div style={cardHeaderStyle}>
              <TrendingUp size={13} style={{ color: 'var(--accent)' }} /> Live Interactive Technical Chart
            </div>
            <TradingViewWidget symbol={analysis.symbol} />
          </div>

          {/* Volume Card */}
          <div style={{ ...cardStyle, padding: '14px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={cardHeaderStyle}>
                <BarChart2 size={13} /> Volume Analysis
              </div>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.68rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Current: </span>
                  <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                    {(analysis.indicators.volume.current / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Average: </span>
                  <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--text-primary)' }}>
                    {(analysis.indicators.volume.average / 1e6).toFixed(2)}M
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ratio: </span>
                  <span style={{
                    fontWeight: 700, fontFamily: 'JetBrains Mono',
                    color: analysis.indicators.volume.ratio > 1.2 ? '#22c55e' : analysis.indicators.volume.ratio < 0.8 ? '#ef4444' : 'var(--text-primary)',
                  }}>
                    {analysis.indicators.volume.ratio}x
                  </span>
                </div>
              </div>
            </div>
            {/* Volume bar */}
            <div style={{ marginTop: '8px', height: '6px', borderRadius: '3px', background: 'var(--bg-primary)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px',
                width: `${Math.min(analysis.indicators.volume.ratio * 50, 100)}%`,
                background: analysis.indicators.volume.ratio > 1.2
                  ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                  : analysis.indicators.volume.ratio < 0.8
                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                    : 'linear-gradient(90deg, var(--accent), #a78bfa)',
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>

          {/* Support / Resistance */}
          <div style={{ ...cardStyle }}>
            <div style={cardHeaderStyle}>
              <Target size={13} /> Support & Resistance Levels
            </div>
            <div style={{ position: 'relative', marginTop: '8px', padding: '12px 0' }}>
              {/* Price line */}
              <div style={{ position: 'relative', height: '2px', background: 'var(--border)', margin: '20px 0', borderRadius: '1px' }}>
                {/* Current price marker */}
                {(() => {
                  const allLevels = [
                    ...analysis.supportResistance.support.map(s => s.level),
                    ...analysis.supportResistance.resistance.map(r => r.level),
                    analysis.price,
                  ];
                  const minP = Math.min(...allLevels) * 0.99;
                  const maxP = Math.max(...allLevels) * 1.01;
                  const range = maxP - minP || 1;
                  const pricePos = ((analysis.price - minP) / range) * 100;

                  return (
                    <>
                      {/* Support levels */}
                      {analysis.supportResistance.support.map((s, i) => {
                        const pos = ((s.level - minP) / range) * 100;
                        return (
                          <div key={`s-${i}`} style={{
                            position: 'absolute', left: `${pos}%`, top: '-20px',
                            transform: 'translateX(-50%)', textAlign: 'center',
                          }}>
                            <div style={{
                              fontSize: '0.52rem', fontWeight: 600, color: '#22c55e',
                              background: '#22c55e12', padding: '2px 6px', borderRadius: '3px',
                              border: '1px solid #22c55e25', fontFamily: 'JetBrains Mono',
                              whiteSpace: 'nowrap',
                              opacity: s.strength === 'Strong' ? 1 : s.strength === 'Medium' ? 0.75 : 0.5,
                            }}>
                              {s.label} ${s.level}
                            </div>
                            <div style={{ width: '1px', height: '10px', background: '#22c55e50', margin: '0 auto' }} />
                          </div>
                        );
                      })}
                      {/* Resistance levels */}
                      {analysis.supportResistance.resistance.map((r, i) => {
                        const pos = ((r.level - minP) / range) * 100;
                        return (
                          <div key={`r-${i}`} style={{
                            position: 'absolute', left: `${pos}%`, bottom: '-22px',
                            transform: 'translateX(-50%)', textAlign: 'center',
                          }}>
                            <div style={{ width: '1px', height: '10px', background: '#ef444450', margin: '0 auto' }} />
                            <div style={{
                              fontSize: '0.52rem', fontWeight: 600, color: '#ef4444',
                              background: '#ef444412', padding: '2px 6px', borderRadius: '3px',
                              border: '1px solid #ef444425', fontFamily: 'JetBrains Mono',
                              whiteSpace: 'nowrap',
                              opacity: r.strength === 'Strong' ? 1 : r.strength === 'Medium' ? 0.75 : 0.5,
                            }}>
                              {r.label} ${r.level}
                            </div>
                          </div>
                        );
                      })}
                      {/* Current price marker */}
                      <div style={{
                        position: 'absolute', left: `${pricePos}%`, top: '50%', transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                      }}>
                        <div style={{
                          background: 'var(--accent)', color: '#fff', padding: '3px 8px',
                          borderRadius: 'var(--r-sm)', fontSize: '0.6rem', fontWeight: 700,
                          fontFamily: 'JetBrains Mono', whiteSpace: 'nowrap',
                          boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
                        }}>
                          ${analysis.price}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* AI Insight Summary */}
          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-primary))',
            borderLeft: '3px solid var(--accent)',
          }}>
            <div style={cardHeaderStyle}>
              <Zap size={13} style={{ color: 'var(--accent)' }} /> AI Analysis Summary
            </div>
            <div style={{
              fontSize: '0.72rem', lineHeight: 1.6, color: 'var(--text-secondary)',
            }}
              dangerouslySetInnerHTML={{
                __html: analysis.insight
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingView;
