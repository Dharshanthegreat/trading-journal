import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { tradingview } from '../services/api';
import {
  TrendingUp, Search, Wifi, WifiOff, Zap,
  Activity, BarChart2, RefreshCw, Clock, ChevronRight, AlertTriangle
} from 'lucide-react';


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
          } else if (symbol === 'ES' || symbol === 'MES') {
            formattedSymbol = 'CAPITALCOM:US500';
          } else if (symbol === 'NQ' || symbol === 'MNQ') {
            formattedSymbol = 'CAPITALCOM:NAS100';
          } else if (symbol === 'CL') {
            formattedSymbol = 'CAPITALCOM:USOIL';
          } else if (symbol === 'GC') {
            formattedSymbol = 'CAPITALCOM:GOLD';
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
          theme: 'light',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          toolbar_bg: '#C3BCB1',
          hide_volume: true,
          overrides: {
            "paneProperties.backgroundType": "solid",
            "paneProperties.background": "#C3BCB1",
            "paneProperties.vertGridProperties.color": "rgba(0, 0, 0, 0.03)",
            "paneProperties.horzGridProperties.color": "rgba(0, 0, 0, 0.03)",
            "scalesProperties.textColor": "#333333",
            "scalesProperties.lineColor": "#A49E93",
            "mainSeriesProperties.candleStyle.upColor": "#ffffff",
            "mainSeriesProperties.candleStyle.downColor": "#333333",
            "mainSeriesProperties.candleStyle.borderUpColor": "#333333",
            "mainSeriesProperties.candleStyle.borderDownColor": "#333333",
            "mainSeriesProperties.candleStyle.wickUpColor": "#333333",
            "mainSeriesProperties.candleStyle.wickDownColor": "#333333",
          }
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
            background: mcpStatus.status === 'connected' ? '#22c55e15' : mcpStatus.status === 'mock' ? '#f59e0b15' : '#f8717115',
            border: `1px solid ${mcpStatus.status === 'connected' ? '#22c55e30' : mcpStatus.status === 'mock' ? '#f59e0b30' : '#f8717130'}`,
            fontSize: '0.6rem', fontWeight: 500,
            color: mcpStatus.status === 'connected' ? '#22c55e' : mcpStatus.status === 'mock' ? '#f59e0b' : '#f87171',
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
          background: '#f8717115', border: '1px solid #f8717130',
          color: '#fca5a5', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px',
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

          {/* Main Layout: Chart on Left, Trades on Right */}
          <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap' }}>
            {/* Live Interactive Chart Card */}
            <div style={{ ...cardStyle, flex: '3 1 600px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
              <div style={cardHeaderStyle}>
                <TrendingUp size={13} style={{ color: 'var(--accent)' }} /> Live Interactive Technical Chart
              </div>
              <TradingViewWidget symbol={analysis.symbol} />
            </div>

            {/* Trade Cross-Reference Card */}
            <div style={{ ...cardStyle, flex: '1 1 250px', minWidth: '200px', display: 'flex', flexDirection: 'column' }}>
              <div style={cardHeaderStyle}>
                <ChevronRight size={13} /> Your Trades · {analysis.symbol}
              </div>

              {symbolTrades ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                  <div style={{
                    textAlign: 'center', padding: '10px', borderRadius: 'var(--r-md)',
                    background: symbolTrades.netPnl >= 0 ? 'var(--profit-soft)' : 'var(--loss-soft)',
                    border: `1px solid ${symbolTrades.netPnl >= 0 ? 'var(--profit-border)' : 'var(--loss-border)'}`,
                  }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Net P&L</div>
                    <div style={{
                      fontSize: '1.1rem', fontWeight: 800,
                      fontFamily: 'JetBrains Mono', color: symbolTrades.netPnl >= 0 ? 'var(--profit)' : 'var(--loss)',
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
                      <div style={{ fontWeight: 700, color: parseFloat(symbolTrades.winRate) >= 50 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono' }}>{symbolTrades.winRate}%</div>
                    </div>
                    <div style={{ padding: '8px', borderRadius: 'var(--r-sm)', background: 'var(--bg-primary)', textAlign: 'center' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.52rem' }}>W / L</div>
                      <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                        <span style={{ color: 'var(--profit)' }}>{symbolTrades.wins}</span>
                        <span style={{ color: 'var(--text-muted)' }}> / </span>
                        <span style={{ color: 'var(--loss)' }}>{symbolTrades.losses}</span>
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


        </div>
      )}
    </div>
  );
};

export default TradingView;
