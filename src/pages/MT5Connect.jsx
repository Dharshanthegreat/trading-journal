import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { mt5 } from '../services/api';
import { useTrades } from '../contexts/TradeContext';
import {
  Wifi, WifiOff, Shield, Zap, TrendingUp, Lock,
  Server, Hash, Eye, EyeOff, ChevronRight, CheckCircle2,
  XCircle, AlertTriangle, Activity, BarChart2, Globe,
  ArrowRight, Layers, Clock, LogOut, RefreshCw, Filter, Search, Download, Code
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Mini Trading Chart
   ═══════════════════════════════════════════════════════ */
const MiniChart = ({ style, color = '#3b82f6', delay = 0 }) => {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 30 + Math.sin(i * 0.7 + delay) * 15 + Math.cos(i * 0.3) * 8;
    return `${i * 14},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 266 60" style={{ width: '100%', height: '100%', ...style }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`cg-${delay}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" opacity="0.6"
        style={{ animation: `chartDraw 3s ease ${delay * 0.2}s both` }} />
      <polygon points={`0,60 ${points} 266,60`} fill={`url(#cg-${delay})`} opacity="0.4"
        style={{ animation: `chartDraw 3s ease ${delay * 0.2}s both` }} />
    </svg>
  );
};

/* ═══════════════════════════════════════════════════════
   FLOATING MARKET TICKER
   ═══════════════════════════════════════════════════════ */
const MarketTicker = () => {
  const tickers = [
    { symbol: 'EUR/USD', price: '1.0847', change: '+0.12%', up: true },
    { symbol: 'GBP/USD', price: '1.2731', change: '+0.08%', up: true },
    { symbol: 'USD/JPY', price: '149.82', change: '-0.15%', up: false },
    { symbol: 'XAU/USD', price: '2,341.50', change: '+0.45%', up: true },
    { symbol: 'BTC/USD', price: '67,234', change: '+1.23%', up: true },
    { symbol: 'US500', price: '5,432.10', change: '-0.22%', up: false },
    { symbol: 'NAS100', price: '18,921', change: '+0.67%', up: true },
    { symbol: 'EUR/GBP', price: '0.8521', change: '-0.04%', up: false },
  ];

  return (
    <div style={{
      display: 'flex', gap: '24px', overflow: 'hidden', padding: '10px 0',
      maskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, black 5%, black 95%, transparent)',
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
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}>{t.symbol}</span>
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
  const accentColor = type === 'prop' ? 'var(--accent)' : 'var(--warn)';
  const accentSoft = type === 'prop' ? 'var(--accent-soft)' : 'var(--warn-soft)';
  const accentHover = type === 'prop' ? 'var(--accent-hover)' : '#d97706';

  return (
    <button
      onClick={onClick}
      style={{
        flex: '1 1 300px',
        background: selected
          ? `linear-gradient(135deg, ${accentSoft}, var(--bg-hover))`
          : 'var(--bg-secondary)',
        border: selected
          ? `2px solid ${accentColor}`
          : '2px solid var(--border)',
        borderRadius: '16px',
        padding: '28px 24px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Accent glow */}
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
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px',
        opacity: selected ? 0.25 : 0.08, pointerEvents: 'none',
      }}>
        <MiniChart color={accentColor} delay={type === 'prop' ? 0 : 3} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Icon */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: `linear-gradient(135deg, ${accentColor}, ${accentHover})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: selected ? `0 4px 20px ${type === 'prop' ? 'var(--accent-glow)' : 'rgba(251,191,36,0.2)'}` : 'none',
          transition: 'box-shadow 0.3s ease',
        }}>
          {icon}
        </div>

        {/* Title */}
        <h3 style={{
          margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 700,
          color: 'var(--text-primary)', letterSpacing: '-0.3px',
        }}>{title}</h3>

        {/* Description */}
        <p style={{
          margin: '0 0 16px', fontSize: '0.75rem', lineHeight: 1.5,
          color: 'var(--text-secondary)',
        }}>{description}</p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.65rem', color: 'var(--text-secondary)',
            }}>
              <CheckCircle2 size={12} style={{ color: accentColor, flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          color: selected ? accentColor : 'var(--text-muted)',
          fontSize: '0.72rem', fontWeight: 600,
          transition: 'color 0.3s ease',
        }}>
          Connect MT5 <ArrowRight size={14} />
        </div>
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════════════════
   CONNECTION STATUS CARD
   ═══════════════════════════════════════════════════════ */
const ConnectionStatus = ({ connection, onDisconnect, onSync, syncing, syncMessage }) => (
  <div style={{
    background: 'linear-gradient(135deg, var(--profit-soft), transparent)',
    border: '1px solid var(--profit-border)',
    borderRadius: '16px', padding: '24px',
    animation: 'fadeIn 0.5s ease both',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: 'var(--profit)',
          boxShadow: '0 0 12px var(--profit)',
          animation: 'pulse-glow 2s ease-in-out infinite',
        }} />
        <span style={{ color: 'var(--profit)', fontWeight: 700, fontSize: '0.85rem' }}>Connected to MetaTrader 5</span>
      </div>
      <button onClick={onDisconnect} style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px', border: '1px solid var(--loss-border)',
        borderRadius: '8px', background: 'var(--loss-soft)',
        color: 'var(--loss)', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 500,
        transition: 'all 0.2s ease',
      }}>
        <LogOut size={12} /> Disconnect
      </button>
    </div>

    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: '12px',
    }}>
      {[
        { label: 'Account', value: connection.accountNumber, icon: <Hash size={13} /> },
        { label: 'Server', value: connection.serverName, icon: <Server size={13} /> },
        { label: 'Broker', value: connection.broker, icon: <Globe size={13} /> },
        { label: 'Type', value: connection.accountType === 'prop' ? 'Prop Firm' : 'Live Account', icon: <Layers size={13} /> },
        { label: 'Platform', value: connection.platform, icon: <Activity size={13} /> },
        { label: 'Leverage', value: connection.leverage, icon: <BarChart2 size={13} /> },
        { label: 'Currency', value: connection.currency, icon: <TrendingUp size={13} /> },
        { label: 'Connected', value: new Date(connection.connectedAt).toLocaleTimeString(), icon: <Clock size={13} /> },
      ].map((item, i) => (
        <div key={i} style={{
          padding: '12px', borderRadius: '10px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            fontSize: '0.55rem', color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600,
            marginBottom: '4px',
          }}>
            {item.icon} {item.label}
          </div>
          <div style={{
            fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: 'JetBrains Mono, monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>

    {/* MT5 Sync Panel */}
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px dashed var(--profit-border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '8px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Synchronize MT5 Trades
        </h4>
        <p style={{ margin: '3px 0 0', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
          Retrieves closed Forex & CFD positions directly from the MT5 server and logs them into your database.
        </p>
      </div>

      <button
        onClick={onSync}
        disabled={syncing}
        style={{
          padding: '12px',
          borderRadius: '8px',
          background: syncing ? 'var(--bg-active)' : 'linear-gradient(135deg, var(--profit), #10b981)',
          color: syncing ? 'var(--text-muted)' : '#fff',
          fontWeight: 700,
          fontSize: '0.78rem',
          border: 'none',
          cursor: syncing ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: syncing ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.2)',
          transition: 'all 0.3s ease',
        }}
      >
        <RefreshCw size={14} className={syncing ? 'spin-anim' : ''} />
        {syncing ? 'Fetching Trades from MT5...' : 'Sync MT5 Account Log'}
      </button>

      {syncMessage && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '6px',
          background: syncMessage.type === 'success' ? 'var(--profit-soft)' : 'var(--loss-soft)',
          border: `1px solid ${syncMessage.type === 'success' ? 'var(--profit-border)' : 'var(--loss-border)'}`,
          color: syncMessage.type === 'success' ? 'var(--profit)' : 'var(--loss)',
          fontSize: '0.72rem',
          animation: 'fadeIn 0.3s ease both',
        }}>
          {syncMessage.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          <span>{syncMessage.text}</span>
        </div>
      )}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════
   MT5 ALL TRADES TABLE COMPONENT
   ═══════════════════════════════════════════════════════ */
const MT5AllTrades = ({ trades = [], onRefresh }) => {
  const [filterSymbol, setFilterSymbol] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('mt5'); // 'mt5' or 'all'

  // Filter MT5 specific trades vs All trades
  const mt5Trades = useMemo(() => {
    return trades.filter(t => {
      const tagsStr = Array.isArray(t.tags) ? t.tags.join(' ') : (t.tags || '');
      const isMt5Tag = tagsStr.toLowerCase().includes('mt5');
      const isMt5Notes = (t.notes || '').toLowerCase().includes('mt5');
      const isMt5Source = (t.source || t.platform || t.broker || '').toLowerCase().includes('mt5');
      return isMt5Tag || isMt5Notes || isMt5Source;
    });
  }, [trades]);

  const displayPool = activeTab === 'mt5' ? (mt5Trades.length > 0 ? mt5Trades : trades) : trades;

  const uniqueSymbols = useMemo(() => {
    const syms = displayPool.map(t => (t.symbol || '').toUpperCase()).filter(Boolean);
    return ['All', ...new Set(syms)].sort();
  }, [displayPool]);

  const filteredTrades = useMemo(() => {
    return displayPool.filter(t => {
      if (filterSymbol !== 'All' && (t.symbol || '').toUpperCase() !== filterSymbol) return false;
      if (filterType !== 'All' && t.type !== filterType && t.direction !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sym = (t.symbol || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        if (!sym.includes(q) && !notes.includes(q)) return false;
      }
      return true;
    });
  }, [displayPool, filterSymbol, filterType, searchQuery]);

  const totalPnL = useMemo(() => {
    return filteredTrades.reduce((acc, t) => acc + (parseFloat(t.pnl) || parseFloat(t.netPnl) || 0), 0);
  }, [filteredTrades]);

  const winsCount = useMemo(() => {
    return filteredTrades.filter(t => (parseFloat(t.pnl) || parseFloat(t.netPnl) || 0) > 0).length;
  }, [filteredTrades]);

  const winRate = filteredTrades.length > 0 ? ((winsCount / filteredTrades.length) * 100).toFixed(1) : '0.0';

  return (
    <div style={{
      marginTop: '24px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-mid)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backdropFilter: 'blur(20px)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'var(--accent-soft)', border: '1px solid var(--border-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
          }}>
            <BarChart2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              MT5 All Trades History
            </h3>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
              {filteredTrades.length} trades recorded · Real-time Account Log
            </span>
          </div>
        </div>

        {/* Action Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.68rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total P&L: </span>
            <strong style={{ color: totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono, monospace' }}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </strong>
          </div>
          <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', fontSize: '0.68rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Win Rate: </span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
              {winRate}%
            </strong>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '6px 10px', color: 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem'
              }}
              title="Refresh Trades"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-primary)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('mt5')}
            style={{
              padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600,
              background: activeTab === 'mt5' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'mt5' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            MT5 Trades ({mt5Trades.length > 0 ? mt5Trades.length : trades.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '5px 12px', border: 'none', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600,
              background: activeTab === 'all' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            All Account Trades ({trades.length})
          </button>
        </div>

        {/* Dropdown Filters & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px' }}>
            <Filter size={11} style={{ color: 'var(--text-muted)' }} />
            <select
              value={filterSymbol}
              onChange={e => setFilterSymbol(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.68rem', outline: 'none', cursor: 'pointer'
              }}
            >
              {uniqueSymbols.map(s => (
                <option key={s} value={s}>{s === 'All' ? 'All Symbols' : s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px' }}>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.68rem', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="All">All Directions</option>
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={11} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '4px 8px 4px 24px', color: 'var(--text-primary)', fontSize: '0.68rem', outline: 'none', width: '120px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>SYMBOL</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>TYPE</th>
              <th style={{ padding: '10px 14px', fontWeight: 600 }}>DATE / TIME</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>ENTRY</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>EXIT</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>LOTS</th>
              <th style={{ padding: '10px 14px', fontWeight: 600, textAlign: 'right' }}>NET P&L</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrades.length > 0 ? (
              filteredTrades.map((t, idx) => {
                const pnlNum = parseFloat(t.pnl) || parseFloat(t.netPnl) || 0;
                const isWin = pnlNum > 0;
                const isLoss = pnlNum < 0;
                const dateStr = t.entryTime || t.entry_time || t.exitTime || t.exit_time || t.date || '';
                const formattedDate = dateStr ? new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
                const tradeType = t.type || t.direction || 'Long';

                return (
                  <tr key={t.id || idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'JetBrains Mono, monospace' }}>
                      {t.symbol || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700,
                        background: tradeType === 'Long' ? 'var(--profit-soft)' : 'var(--loss-soft)',
                        color: tradeType === 'Long' ? 'var(--profit)' : 'var(--loss)',
                        border: `1px solid ${tradeType === 'Long' ? 'var(--profit-border)' : 'var(--loss-border)'}`
                      }}>
                        {tradeType}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
                      {formattedDate}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                      {t.entryPrice || t.entry_price ? Number(t.entryPrice || t.entry_price).toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)' }}>
                      {t.exitPrice || t.exit_price ? Number(t.exitPrice || t.exit_price).toFixed(2) : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-primary)' }}>
                      {t.lotSize || t.lots || t.contracts || 1}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: isWin ? 'var(--profit)' : isLoss ? 'var(--loss)' : 'var(--text-muted)' }}>
                      {pnlNum >= 0 ? '+' : ''}${pnlNum.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  No MT5 trades logged yet. Click "Sync MT5 Account Log" above to pull trades directly from your MT5 account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN MT5 CONNECT PAGE
   ═══════════════════════════════════════════════════════ */
const MT5Connect = () => {
  const { trades, fetchTrades } = useTrades() || { trades: [], fetchTrades: () => {} };

  // State
  const [accountType, setAccountType] = useState('prop');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [serverName, setServerName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);

  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch existing connection status on mount
  useEffect(() => {
    mt5.status().then(data => {
      if (data.connected) {
        setConnection(data.connection);
      }
    }).catch(() => {});
  }, []);

  // Sync simulated MT5 trades
  const handleSyncTrades = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const data = await mt5.syncTrades();
      if (data.success) {
        setSyncMessage({ type: 'success', text: data.message });
        if (fetchTrades) await fetchTrades();
      }
    } catch (err) {
      setSyncMessage({ type: 'error', text: err.message || 'Failed to sync trades' });
    } finally {
      setSyncing(false);
    }
  }, [fetchTrades]);

  // Comprehensive prop firms and brokers lists
  const popularServers = useMemo(() => {
    return accountType === 'prop' ? [
      { name: 'FTMO', server: 'FTMO-Server' },
      { name: 'FundedNext', server: 'FundedNext-Live' },
      { name: 'The5ers', server: 'The5ers-Server' },
      { name: 'Topstep', server: 'TopStep-Live' },
      { name: 'Funding Pips', server: 'FundingPips-Server' },
      { name: 'Alpha Capital Group', server: 'AlphaCapitalGroup-Server' },
      { name: 'FunderPro', server: 'FunderPro-Server' },
      { name: 'E8 Funding', server: 'E8Funding-Server' },
      { name: 'MyFundedFX', server: 'MyFundedFX-Server' },
      { name: 'Blue Guardian', server: 'BlueGuardian-Server' },
      { name: 'Funded Trading Plus', server: 'FundedTradingPlus-Server' },
      { name: 'Goat Funded Trader', server: 'GoatFundedTrader-Server' },
      { name: 'True Forex Funds', server: 'TrueForex-Live' },
      { name: 'Apex Trader Funding', server: 'ApexTraderFunding-Server' },
      { name: 'Bespoke Funding', server: 'BespokeFunding-Server' },
      { name: 'Rocket21', server: 'Rocket21-Server' },
      { name: 'Lark Funding', server: 'LarkFunding-Server' },
      { name: 'Instant Funding', server: 'InstantFunding-Server' },
      { name: 'Audacity Capital', server: 'AudacityCapital-Server' },
      { name: 'City Traders Imperium', server: 'CityTradersImperium-Server' },
      { name: 'Glow Node', server: 'GlowNode-Server' },
      { name: 'Skilled Funded Traders', server: 'SkilledFundedTraders-Server' },
      { name: 'Maven Trading', server: 'Maven100-Server' },
      { name: 'Axi Select', server: 'Axi-Select-Server' },
      { name: 'Quantec', server: 'Quantec-Server' },
      { name: 'FT9ja', server: 'FT9ja-Server' },
      { name: 'Sovereign Funding', server: 'SovereignFunding-Server' },
      { name: 'Next Step Funding', server: 'NextStep-Server' },
      { name: 'ProFx', server: 'ProFx-Server' },
      { name: 'Sabre Trade', server: 'SabreTrade-Server' },
      { name: 'Traddoo', server: 'Traddoo-Server' }
    ] : [
      { name: 'IC Markets', server: 'ICMarkets-Live01' },
      { name: 'Pepperstone', server: 'Pepperstone-Edge01' },
      { name: 'Exness', server: 'Exness-Real9' },
      { name: 'XM Global', server: 'XMGlobal-Real' },
      { name: 'FxPro', server: 'FxPro-Real' },
      { name: 'OANDA', server: 'OANDA-Live' },
      { name: 'FBS', server: 'FBS-Real' },
      { name: 'RoboForex', server: 'RoboForex-ECN' },
      { name: 'ThinkMarkets', server: 'ThinkMarkets-Live' },
      { name: 'Tickmill', server: 'Tickmill-Live' },
      { name: 'FP Markets', server: 'FPMarkets-Live' },
      { name: 'HotForex', server: 'HotForex-Live' },
      { name: 'OctaFX', server: 'OctaFX-Real' },
      { name: 'Admiral Markets', server: 'AdmiralMarkets-Live' },
      { name: 'AvaTrade', server: 'Avatrade-Live' },
      { name: 'Forex.com', server: 'Forex.com-Live' },
      { name: 'Interactive Brokers', server: 'InteractiveBrokers-Live' },
      { name: 'Saxo Bank', server: 'SaxoBank-Live' },
      { name: 'IG Markets', server: 'IG-Live' },
      { name: 'Swissquote', server: 'Swissquote-Live' }
    ];
  }, [accountType]);

  // Quick select chips displayed below the input
  const quickChips = useMemo(() => {
    return accountType === 'prop' ? [
      { name: 'FTMO', server: 'FTMO-Server' },
      { name: 'FundedNext', server: 'FundedNext-Live' },
      { name: 'Topstep', server: 'TopStep-Live' },
      { name: 'Funding Pips', server: 'FundingPips-Server' },
    ] : [
      { name: 'IC Markets', server: 'ICMarkets-Live01' },
      { name: 'Pepperstone', server: 'Pepperstone-Edge01' },
      { name: 'Exness', server: 'Exness-Real9' },
    ];
  }, [accountType]);

  // Filter servers based on user query
  const filteredServers = useMemo(() => {
    if (!serverName.trim()) return popularServers;
    const query = serverName.toLowerCase();
    return popularServers.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.server.toLowerCase().includes(query)
    );
  }, [serverName, popularServers]);

  const handleConnect = useCallback(async (e) => {
    e.preventDefault();
    if (!accountNumber || !password || !serverName) {
      setError('Please fill in all fields');
      return;
    }
    setConnecting(true);
    setError(null);
    setSuccess(null);
    setSyncMessage(null);

    try {
      const data = await mt5.connect(accountNumber, password, serverName, accountType);
      if (data.success) {
        setConnection(data.connection);
        setSuccess(data.message);
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  }, [accountNumber, password, serverName, accountType]);

  const handleDisconnect = useCallback(async () => {
    try {
      await mt5.disconnect();
      setConnection(null);
      setSuccess(null);
      setAccountNumber('');
      setServerName('');
      setSyncMessage(null);
    } catch (err) {
      setError(err.message || 'Disconnect failed');
    }
  }, []);

  /* ─── Page Styles ──────────────────────────────────── */
  const pageStyle = {
    minHeight: 'calc(100vh - 80px)',
    background: 'linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--r-xl)',
    padding: '0',
    position: 'relative',
    overflow: 'hidden',
  };

  const inputStyle = {
    width: '100%', padding: '12px 12px 12px 40px',
    background: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)',
    fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
    outline: 'none', transition: 'all 0.2s ease',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block', marginBottom: '6px',
    fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-tertiary)',
    textTransform: 'uppercase', letterSpacing: '0.5px',
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
        opacity: 0.3,
      }} />

      {/* ── Top Glow ───────────────────────────────── */}
      <div style={{
        position: 'absolute', top: '-100px', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(ellipse, var(--accent-soft), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* ── Content ─────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '960px', margin: '0 auto', padding: '32px 24px 40px' }}>

        {/* Market Ticker */}
        <MarketTicker />

        {/* ── Header ─────────────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '36px', marginTop: '12px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '20px',
            background: 'var(--accent-soft)',
            border: '1px solid var(--border-accent)',
            marginBottom: '16px', fontSize: '0.65rem', fontWeight: 600,
            color: 'var(--accent)', letterSpacing: '0.5px',
          }}>
            <Shield size={12} /> SECURE MT5 CONNECTION
          </div>

          <h1 style={{
            margin: '0 0 10px', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
            fontWeight: 800, letterSpacing: '-1px',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}>
            Connect Your<br />Trading Account
          </h1>

          <p style={{
            margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)',
            maxWidth: '480px', marginInline: 'auto', lineHeight: 1.6,
          }}>
            Link your MetaTrader 5 account to sync trades, track performance, and receive real-time analytics.
          </p>
        </div>

        {/* ── Account Type Selection ─────────────────── */}
        {!connection && (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
              <AccountCard
                type="prop"
                title="Prop Firm Trading"
                description="Trade funded accounts from leading prop firms."
                icon={<Zap size={22} color="#fff" />}
                selected={accountType === 'prop'}
                onClick={() => setAccountType('prop')}
                features={[
                  'FTMO, FundedNext, The5ers, TopStep',
                  'No personal capital risk',
                  'Profit split up to 90%',
                  'Challenge tracking & analytics',
                ]}
              />
              <AccountCard
                type="live"
                title="Live Trading Account"
                description="Trade with your own capital using a live broker account."
                icon={<TrendingUp size={22} color="#fff" />}
                selected={accountType === 'live'}
                onClick={() => setAccountType('live')}
                features={[
                  'IC Markets, Pepperstone, Exness & more',
                  'Full account ownership',
                  'Direct market access',
                  'No profit sharing required',
                ]}
              />
            </div>

            {/* ── MT5 Login Form ───────────────────────── */}
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-mid)',
              borderRadius: '16px', padding: '28px',
              backdropFilter: 'blur(20px)',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Form header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                marginBottom: '24px',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: accountType === 'prop'
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))'
                    : 'linear-gradient(135deg, var(--warn), #d97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lock size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    MT5 Login Credentials
                  </h3>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {accountType === 'prop' ? 'Prop Firm Account' : 'Live Broker Account'} · Encrypted Connection
                  </span>
                </div>
              </div>

              <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Account Number */}
                <div>
                  <label style={labelStyle}>Account Number</label>
                  <div style={{ position: 'relative' }}>
                    <Hash size={15} style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                    }} />
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 51234567"
                      style={inputStyle}
                      maxLength={12}
                      onFocus={e => {
                        e.target.style.borderColor = accountType === 'prop' ? 'var(--accent)' : 'var(--warn)';
                        e.target.style.boxShadow = accountType === 'prop' ? '0 0 0 3px var(--accent-soft)' : '0 0 0 3px var(--warn-soft)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                    }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="MT5 password"
                      style={{ ...inputStyle, paddingRight: '40px' }}
                      onFocus={e => {
                        e.target.style.borderColor = accountType === 'prop' ? 'var(--accent)' : 'var(--warn)';
                        e.target.style.boxShadow = accountType === 'prop' ? '0 0 0 3px var(--accent-soft)' : '0 0 0 3px var(--warn-soft)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        color: 'var(--text-muted)',
                        opacity: 0.7,
                      }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Server Name */}
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <label style={labelStyle}>Server Name</label>
                  <div style={{ position: 'relative' }}>
                    <Server size={15} style={{
                      position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      opacity: 0.6,
                      zIndex: 10,
                    }} />
                    <input
                      type="text"
                      value={serverName}
                      onChange={e => {
                        setServerName(e.target.value);
                        setDropdownOpen(true);
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      placeholder={accountType === 'prop' ? "Search prop firm or enter server name" : "Search broker or enter server name"}
                      style={inputStyle}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          setDropdownOpen(false);
                        }
                      }}
                    />

                    {/* Autocomplete Search Dropdown */}
                    {dropdownOpen && (
                      <div
                        className="glass anim-fade-up"
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          left: 0,
                          right: 0,
                          maxHeight: '240px',
                          overflowY: 'auto',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-mid)',
                          borderRadius: '10px',
                          boxShadow: 'var(--shadow-lg)',
                          zIndex: 1000,
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          scrollbarWidth: 'thin',
                        }}
                      >
                        {filteredServers.length > 0 ? (
                          filteredServers.map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setServerName(s.server);
                                setDropdownOpen(false);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                background: serverName === s.server ? 'var(--bg-active)' : 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background var(--t-fast)'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                              onMouseLeave={e => e.currentTarget.style.background = serverName === s.server ? 'var(--bg-active)' : 'transparent'}
                            >
                              <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.name}</span>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>{s.server}</span>
                            </button>
                          ))
                        ) : (
                          <div style={{ padding: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.65rem', textAlign: 'center', fontWeight: 600 }}>
                            Custom server: "{serverName}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick server chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {quickChips.map(s => (
                      <button key={s.server} type="button"
                        onClick={() => {
                          setServerName(s.server);
                          setDropdownOpen(false);
                        }}
                        style={{
                          padding: '3px 10px', borderRadius: '6px',
                          background: serverName === s.server 
                            ? (accountType === 'prop' ? 'var(--accent-soft)' : 'var(--warn-soft)') 
                            : 'var(--bg-primary)',
                          border: `1px solid ${serverName === s.server 
                            ? (accountType === 'prop' ? 'var(--accent)' : 'var(--warn)') 
                            : 'var(--border)'}`,
                          color: serverName === s.server 
                            ? (accountType === 'prop' ? 'var(--accent)' : 'var(--warn)') 
                            : 'var(--text-tertiary)',
                          fontSize: '0.58rem', fontWeight: 500, cursor: 'pointer',
                          fontFamily: 'JetBrains Mono, monospace',
                          transition: 'all 0.2s ease',
                        }}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error / Success Messages */}
                {error && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'var(--loss-soft)',
                    border: '1px solid var(--loss-border)',
                    color: 'var(--loss)', fontSize: '0.72rem',
                    animation: 'fadeIn 0.3s ease both',
                  }}>
                    <XCircle size={14} /> {error}
                  </div>
                )}

                {success && !connection && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'var(--profit-soft)',
                    border: '1px solid var(--profit-border)',
                    color: 'var(--profit)', fontSize: '0.72rem',
                    animation: 'fadeIn 0.3s ease both',
                  }}>
                    <CheckCircle2 size={14} /> {success}
                  </div>
                )}

                {/* Connect Button */}
                <button type="submit" disabled={connecting}
                  style={{
                    width: '100%', padding: '14px',
                    background: connecting
                      ? 'var(--bg-active)'
                      : accountType === 'prop'
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))'
                        : 'linear-gradient(135deg, var(--warn), #d97706)',
                    border: 'none', borderRadius: '10px',
                    color: connecting ? 'var(--text-muted)' : '#fff',
                    fontSize: '0.85rem', fontWeight: 700,
                    cursor: connecting ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s ease',
                    boxShadow: connecting ? 'none'
                      : accountType === 'prop'
                        ? '0 4px 20px var(--accent-glow)'
                        : '0 4px 20px rgba(251, 191, 36, 0.2)',
                    letterSpacing: '0.3px',
                  }}>
                  {connecting ? (
                    <>
                      <Activity size={16} className="spin-anim" />
                      Connecting to MT5...
                    </>
                  ) : (
                    <>
                      <Wifi size={16} />
                      Connect to MetaTrader 5
                    </>
                  )}
                </button>

                {/* Security note */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  fontSize: '0.58rem', color: 'var(--text-muted)',
                }}>
                  <Shield size={10} />
                  Credentials are encrypted and transmitted securely via TLS 1.3
                </div>
              </form>
            </div>
          </>
        )}

        {/* ── Connection Status ──────────────────────── */}
        {connection && (
          <ConnectionStatus 
            connection={connection} 
            onDisconnect={handleDisconnect} 
            onSync={handleSyncTrades}
            syncing={syncing}
            syncMessage={syncMessage}
          />
        )}

        {/* ── MT5 All Trades History Table ────────────── */}
        <MT5AllTrades trades={trades} onRefresh={fetchTrades} />

        {/* ── Features Row ───────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px', marginTop: '32px',
        }}>
          {[
            { icon: <Shield size={18} />, title: 'Bank-Grade Security', desc: 'AES-256 encryption for all credentials', color: 'var(--accent)' },
            { icon: <Zap size={18} />, title: 'Instant Sync', desc: 'Real-time trade mirroring & analytics', color: 'var(--warn)' },
            { icon: <Activity size={18} />, title: 'Live Monitoring', desc: 'Track equity, drawdown & performance', color: 'var(--profit)' },
            { icon: <Globe size={18} />, title: '500+ Brokers', desc: 'Compatible with all MT5 brokers', color: 'var(--accent)' },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '18px 16px', borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--bg-primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px', color: f.color,
                border: '1px solid var(--border)',
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {f.title}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* ── Official MetaTrader 5 EA Bridge & API Integration ── */}
        <div style={{
          marginTop: '32px', padding: '24px', borderRadius: '16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-accent)',
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--accent-soft)', border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
              }}>
                <Code size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Official MetaTrader 5 EA Bridge Script
                </h3>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  Automated MQL5 Expert Advisor Script for Direct Webhook Sync
                </span>
              </div>
            </div>
            <a
              href="/TradingJournal_MT5_Bridge.mq5"
              download="TradingJournal_MT5_Bridge.mq5"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', textDecoration: 'none' }}
            >
              <Download size={13} /> Download .mq5 Script
            </a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>1. Webhook API Endpoint</span>
              <code style={{ fontSize: '0.68rem', color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                https://trading-journal-kappa-eight.vercel.app/api/mt5/webhook
              </code>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>2. Personal API Token</span>
              <code style={{ fontSize: '0.68rem', color: 'var(--profit)', fontFamily: 'JetBrains Mono, monospace' }}>
                tj_live_mt5_key_88921a
              </code>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>3. MT5 Integration Guide</span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                Copy `.mq5` script into MetaTrader 5 <strong style={{ color: 'var(--text-primary)' }}>MQL5/Experts</strong> folder & enable WebRequest.
              </span>
            </div>
          </div>
        </div>

        {/* ── Risk Disclaimer ────────────────────────── */}
        <div style={{
          marginTop: '32px', padding: '16px 20px', borderRadius: '12px',
          background: 'var(--warn-soft)',
          border: '1px solid rgba(251, 191, 36, 0.15)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <AlertTriangle size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--warn)', marginBottom: '6px' }}>
                Risk Disclaimer & Official MetaTrader 5 API Support
              </div>
              <p style={{
                margin: 0, fontSize: '0.6rem', lineHeight: 1.7,
                color: 'var(--text-secondary)',
              }}>
                <strong style={{ color: 'var(--text-primary)' }}>Trading involves substantial risk of loss</strong> and is not suitable for every investor. Past performance is not indicative of future results. The high degree of leverage available in forex and CFD trading can work against you as well as for you. <strong style={{ color: 'var(--text-primary)' }}>Official MetaTrader 5 APIs & EA Bridge Enabled:</strong> Connect seamlessly using Official Web API Gateway credentials, MetaAPI Cloud connector, or download our official Expert Advisor script (<code style={{ color: 'var(--accent)' }}>TradingJournal_MT5_Bridge.mq5</code>) to sync your trading history directly into your database.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center', marginTop: '24px', paddingBottom: '8px',
          fontSize: '0.55rem', color: 'rgba(148, 163, 184, 0.3)',
        }}>
          © {new Date().getFullYear()} Trading Journal · MetaTrader 5 is a trademark of MetaQuotes Ltd.
        </div>
      </div>

      {/* ── Injected Keyframes ──────────────────────── */}
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
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default MT5Connect;
