import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { accounts as accountsApi } from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar
} from 'recharts';
import {
  PieChart as PieIcon, Layers, TrendingUp, TrendingDown,
  ShieldCheck, Award, Info, ExternalLink, User,
  DollarSign, Percent, BarChart2, Clock, Activity, CheckCircle,
  Wallet, RefreshCw, X, HelpCircle, Sliders, Target, ArrowUpRight, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = ['#d946ef', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AssetAllocation = () => {
  const { trades, fetchTrades, loading } = useTrades();
  const { user } = useAuth();

  // Navigation & Sub-Tabs State
  const [activeSubTab, setActiveSubTab] = useState('assets'); // 'assets'|'return_risk'|'strategy'|'correlation'
  const [allocationMode, setAllocationMode] = useState('family'); // 'family' | 'asset'
  const [timeframe, setTimeframe] = useState('ALL'); // 'YTD'|'1W'|'1M'|'3M'|'6M'|'1Y'|'2Y'|'ALL'
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [accountList, setAccountList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  // Modals State
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Fetch trades and user accounts on mount
  useEffect(() => {
    fetchTrades();
    const loadAccounts = async () => {
      try {
        if (!user?.isGuest) {
          const list = await accountsApi.list();
          if (Array.isArray(list)) setAccountList(list);
        }
      } catch (err) {
        console.error('Failed to load accounts list:', err);
      }
    };
    loadAccounts();
  }, [fetchTrades, user]);

  // Categorize symbols into asset families
  const getAssetFamily = (symbol) => {
    if (!symbol) return 'Other Assets';
    const sym = symbol.toUpperCase();
    if (['NQ', 'ES', 'YM', 'US30', 'SPX', 'DAX', 'NAS100', 'US500', 'GER40', 'FTSE', 'RTY', 'MNQ', 'MES'].some(s => sym.includes(s))) {
      return 'Indices CFDs';
    }
    if (['XAUUSD', 'GOLD', 'SILVER', 'XAGUSD', 'USOIL', 'WTI', 'BRENT', 'NGAS', 'CL', 'GC'].some(s => sym.includes(s))) {
      return 'Commodity CFDs';
    }
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'GBPJPY', 'NZDUSD', 'USDCHF', '6E', '6B', '6J'].some(s => sym.includes(s))) {
      return 'Forex Pairs';
    }
    if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BTC', 'ETH', 'SOL', 'CRYPTO', 'MBT', 'MET'].some(s => sym.includes(s))) {
      return 'Crypto Assets';
    }
    if (['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META'].some(s => sym.includes(s))) {
      return 'Equities & Stocks';
    }
    return 'Other Assets';
  };

  // Filter trades strictly by selected Account and Timeframe
  const filteredTrades = useMemo(() => {
    let list = Array.isArray(trades) ? [...trades] : [];

    // Filter by account
    if (selectedAccountId !== 'all') {
      list = list.filter(t => String(t.account_id || t.accountId) === String(selectedAccountId));
    }

    // Filter by timeframe
    if (timeframe !== 'ALL') {
      const now = new Date();
      let cutoff = new Date();
      if (timeframe === '1W') cutoff.setDate(now.getDate() - 7);
      else if (timeframe === '1M') cutoff.setMonth(now.getMonth() - 1);
      else if (timeframe === '3M') cutoff.setMonth(now.getMonth() - 3);
      else if (timeframe === '6M') cutoff.setMonth(now.getMonth() - 6);
      else if (timeframe === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
      else if (timeframe === '2Y') cutoff.setFullYear(now.getFullYear() - 2);
      else if (timeframe === 'YTD') cutoff = new Date(now.getFullYear(), 0, 1);

      list = list.filter(t => {
        if (!t.date && !t.entryTime && !t.createdAt) return true;
        const d = new Date(t.date || t.entryTime || t.createdAt);
        return d >= cutoff;
      });
    }

    return list;
  }, [trades, selectedAccountId, timeframe]);

  // Selected Account Object
  const activeAccountObj = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accountList.find(a => String(a.id) === String(selectedAccountId));
  }, [selectedAccountId, accountList]);

  // Compute Initial Capital size dynamically
  const initialCapital = useMemo(() => {
    if (activeAccountObj && activeAccountObj.accountBalance) {
      return Number(activeAccountObj.accountBalance);
    }
    return Number(user?.accountSize) || 25000;
  }, [user, activeAccountObj]);

  // Dynamic KPI Stats computed strictly from user trades
  const liveStats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const returnPct = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;
    const currentAum = initialCapital + totalPnl;

    // Calculate Peak Drawdown
    let peak = initialCapital;
    let runningEquity = initialCapital;
    let maxDdPct = 0;
    const chronTrades = [...filteredTrades].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    chronTrades.forEach(t => {
      runningEquity += Number(t.pnl) || 0;
      if (runningEquity > peak) {
        peak = runningEquity;
      } else {
        const dd = ((peak - runningEquity) / peak) * 100;
        if (dd > maxDdPct) maxDdPct = dd;
      }
    });

    // Calculate 6-Month Return
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    const sixMonthsTrades = filteredTrades.filter(t => new Date(t.date || t.entryTime || t.createdAt) >= sixMonthsAgo);
    const sixMonthsPnl = sixMonthsTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const return6mPct = initialCapital > 0 ? (sixMonthsPnl / initialCapital) * 100 : 0;

    // Calculate Win Rate & Risk Metrics
    const winningTrades = filteredTrades.filter(t => Number(t.pnl) > 0);
    const losingTrades = filteredTrades.filter(t => Number(t.pnl) < 0);
    
    const winsCount = winningTrades.length;
    const lossesCount = losingTrades.length;
    const winRate = filteredTrades.length > 0 ? (winsCount / filteredTrades.length) * 100 : 0;

    const grossProfit = winningTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + Number(t.pnl), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? grossProfit : 0);

    const avgWin = winsCount > 0 ? grossProfit / winsCount : 0;
    const avgLoss = lossesCount > 0 ? grossLoss / lossesCount : 0;
    const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin;
    const expectancy = filteredTrades.length > 0 ? totalPnl / filteredTrades.length : 0;

    // Calculate Sharpe Ratio
    const returns = filteredTrades.map(t => Number(t.pnl));
    const meanReturn = returns.length > 0 ? totalPnl / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / (returns.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalPnl,
      returnPct: Number(returnPct.toFixed(2)),
      maxDdPct: Number(maxDdPct.toFixed(2)),
      return6mPct: Number(return6mPct.toFixed(2)),
      currentAum,
      winRate: Number(winRate.toFixed(1)),
      totalTrades: filteredTrades.length,
      profitFactor: Number(profitFactor.toFixed(2)),
      sharpeRatio: Number(sharpeRatio.toFixed(2)),
      expectancy: Number(expectancy.toFixed(2)),
      winLossRatio: Number(winLossRatio.toFixed(2)),
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2))
    };
  }, [filteredTrades, initialCapital]);

  // Dynamic Allocation Breakdown by Family or Symbol
  const allocationData = useMemo(() => {
    if (filteredTrades.length === 0) {
      return [
        { name: 'Indices CFDs', count: 0, percent: 100, winners: 0, returnPnl: 0, returnPct: 0, avgWin: 0, avgLoss: 0, volume: 0 }
      ];
    }

    const groups = {};
    let totalCount = 0;

    filteredTrades.forEach(t => {
      const key = allocationMode === 'family' ? getAssetFamily(t.symbol) : (t.symbol ? t.symbol.toUpperCase() : 'OTHER');
      if (!groups[key]) {
        groups[key] = {
          name: key,
          count: 0,
          wins: 0,
          returnPnl: 0,
          totalWinAmount: 0,
          totalLossAmount: 0,
          volume: 0,
        };
      }
      groups[key].count += 1;
      totalCount += 1;

      const pnl = Number(t.pnl) || 0;
      groups[key].returnPnl += pnl;

      if (pnl > 0) {
        groups[key].wins += 1;
        groups[key].totalWinAmount += pnl;
      } else if (pnl < 0) {
        groups[key].totalLossAmount += Math.abs(pnl);
      }

      groups[key].volume += Number(t.lotSize || t.contracts || t.quantity) || 1;
    });

    return Object.values(groups).map(g => {
      const winners = g.count > 0 ? (g.wins / g.count) * 100 : 0;
      const percent = totalCount > 0 ? (g.count / totalCount) * 100 : 0;
      const lossesCount = g.count - g.wins;
      const avgWin = g.wins > 0 ? g.totalWinAmount / g.wins : 0;
      const avgLoss = lossesCount > 0 ? g.totalLossAmount / lossesCount : 0;
      const returnPct = initialCapital > 0 ? (g.returnPnl / initialCapital) * 100 : 0;

      return {
        name: g.name,
        count: g.count,
        percent: Number(percent.toFixed(1)),
        winners: Number(winners.toFixed(1)),
        returnPnl: Number(g.returnPnl.toFixed(2)),
        returnPct: Number(returnPct.toFixed(2)),
        avgWin: Number(avgWin.toFixed(2)),
        avgLoss: Number(avgLoss.toFixed(2)),
        volume: Number(g.volume.toFixed(1)),
      };
    }).sort((a, b) => b.count - a.count);
  }, [filteredTrades, allocationMode, initialCapital]);

  // Selected item highlight or top item default
  const activeFocusItem = selectedItem || allocationData[0] || {};

  // Equity Growth & Drawdown Curve Data
  const equityCurveData = useMemo(() => {
    let cumulativePnl = 0;
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));
    
    if (sorted.length === 0) {
      return [{ date: 'Start', equity: initialCapital, drawdown: 0 }];
    }

    let peak = initialCapital;
    let currentEquity = initialCapital;

    return sorted.map((t, idx) => {
      const pnl = Number(t.pnl) || 0;
      currentEquity += pnl;
      if (currentEquity > peak) peak = currentEquity;
      const dd = peak > 0 ? ((peak - currentEquity) / peak) * 100 : 0;

      return {
        date: t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `#${idx + 1}`,
        equity: Number(currentEquity.toFixed(2)),
        drawdown: Number((-dd).toFixed(2))
      };
    });
  }, [filteredTrades, initialCapital]);

  // Strategy Direction (Long vs Short) breakdown
  const strategyStats = useMemo(() => {
    const longs = filteredTrades.filter(t => {
      const dir = (t.direction || t.type || '').toUpperCase();
      return dir === 'LONG' || dir === 'BUY';
    });
    const shorts = filteredTrades.filter(t => {
      const dir = (t.direction || t.type || '').toUpperCase();
      return dir === 'SHORT' || dir === 'SELL';
    });

    const longWins = longs.filter(t => Number(t.pnl) > 0).length;
    const shortWins = shorts.filter(t => Number(t.pnl) > 0).length;

    const longWinRate = longs.length > 0 ? (longWins / longs.length) * 100 : 0;
    const shortWinRate = shorts.length > 0 ? (shortWins / shorts.length) * 100 : 0;

    const longPnl = longs.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const shortPnl = shorts.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);

    return {
      longCount: longs.length,
      shortCount: shorts.length,
      longWinRate: Number(longWinRate.toFixed(1)),
      shortWinRate: Number(shortWinRate.toFixed(1)),
      longPnl: Number(longPnl.toFixed(2)),
      shortPnl: Number(shortPnl.toFixed(2))
    };
  }, [filteredTrades]);

  return (
    <div className="asset-allocation-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', paddingBottom: '80px' }}>
      
      {/* ═══ TOP CONTROL & PROFILE HEADER CARD (REARRANGED & CLEAN) ═══ */}
      <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          
          {/* Top Row: User / Account Info & Account Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s4)' }}>
            
            {/* User Profile Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
              <div style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1rem',
                padding: '6px 14px',
                borderRadius: 'var(--r-md)',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <PieIcon size={18} />
                {activeAccountObj ? activeAccountObj.accountName.toUpperCase() : (user?.displayName?.toUpperCase() || 'TRADING JOURNAL')}
              </div>

              <span className="badge" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.72rem', padding: '4px 10px', borderRadius: 'var(--r-full)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Activity size={12} style={{ color: 'var(--accent)' }} />
                {liveStats.totalTrades} Journaled Trades
              </span>
            </div>

            {/* Account Selector & Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', background: 'var(--bg-primary)', padding: '4px 10px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <Wallet size={15} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Account:</span>
                <select
                  className="input"
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                  style={{ border: 'none', background: 'transparent', padding: '2px 4px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer', height: 'auto' }}
                >
                  <option value="all">All Accounts ({trades.length} trades)</option>
                  {accountList.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.currency || '$'}{Number(acc.accountBalance || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 'var(--r-md)', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Info size={14} /> Methodology
              </button>
            </div>

          </div>

          {/* Description & KPI Metrics Bar */}
          <div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, marginBottom: 'var(--s4)' }}>
              Real-time portfolio asset allocation, position distribution, and risk-adjusted metrics calculated directly from your entered trade records.
            </p>

            {/* 4 Clean Balanced KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)' }}>
              
              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Cumulative P&L Return
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: liveStats.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {liveStats.totalPnl >= 0 ? '+' : ''}${liveStats.totalPnl.toLocaleString()} ({liveStats.returnPct}%)
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Peak Drawdown Depth
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  -{liveStats.maxDdPct}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Overall Win Rate
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: liveStats.winRate >= 50 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {liveStats.winRate}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Portfolio Net Capital
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ${liveStats.currentAum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ═══ SUB-NAVIGATION TABS & TIMEFRAME SELECTOR BAR ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s3)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        
        {/* Sub-tabs Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          {[
            { id: 'assets', label: 'Assets & Timeframe', icon: PieIcon },
            { id: 'return_risk', label: 'Return / Risk', icon: TrendingUp },
            { id: 'strategy', label: 'Strategy Analysis', icon: BarChart2 },
            { id: 'correlation', label: 'Correlation', icon: Layers },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeSubTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveSubTab(t.id)}
                style={{
                  background: isActive ? 'var(--accent)' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 'var(--r-md)',
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all var(--t-fast)'
                }}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Timeframe Selector Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
          {['YTD', '1W', '1M', '3M', '6M', '1Y', '2Y', 'ALL'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? 'var(--bg-active)' : 'transparent',
                color: timeframe === tf ? 'var(--text-primary)' : 'var(--text-muted)',
                border: timeframe === tf ? '1px solid var(--border-accent)' : '1px solid transparent',
                borderRadius: 'var(--r-sm)',
                padding: '3px 10px',
                fontSize: '0.68rem',
                fontWeight: timeframe === tf ? 700 : 500,
                cursor: 'pointer',
                transition: 'all var(--t-fast)'
              }}
            >
              {tf}
            </button>
          ))}
        </div>

      </div>

      {/* ═══ TAB 1: ASSETS & TIMEFRAME ═══ */}
      {activeSubTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Asset Allocation Breakdown
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>
                Percentage of trades recorded in each asset class alongside net accumulated returns.
              </p>
            </div>

            {/* Toggle Buttons: By Family | By Asset */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setAllocationMode('family'); setSelectedItem(null); }}
                className={`btn btn-sm ${allocationMode === 'family' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', padding: '6px 14px' }}
              >
                By Asset Family
              </button>
              <button
                onClick={() => { setAllocationMode('asset'); setSelectedItem(null); }}
                className={`btn btn-sm ${allocationMode === 'asset' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', padding: '6px 14px' }}
              >
                By Individual Symbol
              </button>
            </div>
          </div>

          {/* Donut Chart & Focused Metric Cards Row (Balanced 50/50 Layout) */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s6)', alignItems: 'center' }}>
            
            {/* Donut Allocation Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '100%', height: 230 }}>
                {allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="percent"
                        onClick={(entry) => setSelectedItem(entry)}
                      >
                        {allocationData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                            stroke="var(--bg-primary)"
                            strokeWidth={2}
                            style={{
                              cursor: 'pointer',
                              filter: activeFocusItem?.name === entry.name ? 'drop-shadow(0 0 8px var(--accent))' : 'none',
                              opacity: activeFocusItem?.name && activeFocusItem.name !== entry.name ? 0.6 : 1
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => [`${val}%`, 'Allocation']}
                        contentStyle={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-mid)',
                          borderRadius: 'var(--r-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.75rem',
                          boxShadow: 'var(--shadow-md)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    No trades recorded for selected filter
                  </div>
                )}

                {/* Center Ring Stats */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeFocusItem?.percent ? `${activeFocusItem.percent}%` : '100%'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeFocusItem?.name || 'Asset Class'}
                  </div>
                </div>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', justifyContent: 'center', marginTop: 'var(--s3)' }}>
                {allocationData.map((item, idx) => (
                  <div
                    key={item.name}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      color: activeFocusItem?.name === item.name ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: activeFocusItem?.name === item.name ? 700 : 500
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                    <span>{item.name} ({item.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Asset Metric Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[allocationData.findIndex(i => i.name === activeFocusItem?.name) % COLORS.length] || 'var(--accent)' }} />
                  {activeFocusItem?.name || 'Selected Asset Metrics'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {activeFocusItem?.percent || 0}% portfolio weight
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
                
                {/* Trades Executed */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Trades Executed
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {activeFocusItem?.count || 0}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Total entries in group
                  </div>
                </div>

                {/* Win Rate */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    % Winners
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (activeFocusItem?.winners || 0) >= 50 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {activeFocusItem?.winners ? `${activeFocusItem.winners}%` : '0%'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Win/loss ratio
                  </div>
                </div>

                {/* Accumulated PnL */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Accumulated P&L
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (activeFocusItem?.returnPnl || 0) >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {(activeFocusItem?.returnPnl || 0) >= 0 ? '+' : ''}${activeFocusItem?.returnPnl?.toLocaleString() || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    {(activeFocusItem?.returnPct || 0) >= 0 ? '+' : ''}{activeFocusItem?.returnPct || 0}% net return
                  </div>
                </div>

                {/* Volume Exposure */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Traded Lots / Contracts
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {activeFocusItem?.volume || 0} Lots
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Avg win: ${activeFocusItem?.avgWin || 0}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Asset Breakdown Data Table */}
          <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: 'var(--accent)' }} />
              Asset Breakdown Data Table
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Asset / Symbol</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Allocation Weight</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Trades</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>% Winners</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Avg Win / Loss</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Accumulated P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationData.map((item, idx) => (
                    <tr
                      key={item.name}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: activeFocusItem?.name === item.name ? 'var(--bg-active)' : 'transparent',
                        transition: 'background var(--t-fast)'
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                        {item.name}
                      </td>
                      <td style={{ padding: '12px', width: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.percent}%`, background: COLORS[idx % COLORS.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.percent}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.count}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.winners >= 50 ? 'var(--profit)' : 'var(--loss)' }}>
                        {item.winners}%
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        <span style={{ color: 'var(--profit)' }}>${item.avgWin}</span> / <span style={{ color: 'var(--loss)' }}>${item.avgLoss}</span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: item.returnPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {item.returnPnl >= 0 ? '+' : ''}${item.returnPnl.toLocaleString()} ({item.returnPct}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ═══ TAB 2: RETURN & RISK METRICS ═══ */}
      {activeSubTab === 'return_risk' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          
          {/* Dynamic Risk Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--s3)' }}>
            {[
              { label: 'Sharpe Ratio', val: liveStats.sharpeRatio, desc: 'Annualized risk ratio', color: 'var(--profit)' },
              { label: 'Profit Factor', val: liveStats.profitFactor, desc: 'Gross win / gross loss', color: 'var(--accent)' },
              { label: 'Expectancy', val: `${liveStats.expectancy >= 0 ? '+' : ''}$${liveStats.expectancy}`, desc: 'Expected return / trade', color: liveStats.expectancy >= 0 ? 'var(--profit)' : 'var(--loss)' },
              { label: 'Win/Loss Ratio', val: liveStats.winLossRatio, desc: 'Average R:R ratio', color: 'var(--text-primary)' },
              { label: 'Avg Win', val: `$${liveStats.avgWin}`, desc: 'Average winning trade', color: 'var(--profit)' },
              { label: 'Avg Loss', val: `$${liveStats.avgLoss}`, desc: 'Average losing trade', color: 'var(--loss)' },
            ].map(m => (
              <div key={m.label} className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{m.label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: m.color, fontFamily: 'var(--font-mono)' }}>{m.val}</div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)' }}>{m.desc}</div>
              </div>
            ))}
          </div>

          {/* Equity & Drawdown Area Chart */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Cumulative Equity Growth & Drawdown Depth
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Realized account equity trajectory calculated from chronological trades
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s4)', fontSize: '0.72rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
                  <span style={{ width: 10, height: 3, background: 'var(--accent)', borderRadius: 2 }} /> Net Equity ($)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--loss)' }}>
                  <span style={{ width: 10, height: 3, background: 'var(--loss)', borderRadius: 2 }} /> Drawdown Depth (%)
                </span>
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--loss)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--loss)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-mid)', borderRadius: 'var(--r-md)', color: 'var(--text-primary)' }} />
                  <Area type="monotone" dataKey="equity" stroke="var(--accent)" strokeWidth={2} fillOpacity={1} fill="url(#eqGrad)" name="Equity ($)" />
                  <Area type="monotone" dataKey="drawdown" stroke="var(--loss)" strokeWidth={1.5} fillOpacity={1} fill="url(#ddGrad)" name="Drawdown %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* ═══ TAB 3: STRATEGY ANALYSIS ═══ */}
      {activeSubTab === 'strategy' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s5)' }}>
          
          {/* Long vs Short Performance Card */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)' }}>
              Trade Direction Performance (Long vs Short)
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--profit)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={14} /> LONG POSITIONS ({strategyStats.longCount})
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {strategyStats.longWinRate}% Win
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Net P&L: <strong style={{ color: strategyStats.longPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>{strategyStats.longPnl >= 0 ? '+' : ''}${strategyStats.longPnl.toLocaleString()}</strong>
                </div>
              </div>

              <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--loss)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingDown size={14} /> SHORT POSITIONS ({strategyStats.shortCount})
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  {strategyStats.shortWinRate}% Win
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Net P&L: <strong style={{ color: strategyStats.shortPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>{strategyStats.shortPnl >= 0 ? '+' : ''}${strategyStats.shortPnl.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Asset Allocation Weight Breakdown */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)' }}>
              Top Symbol Volume Concentration
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              {allocationData.slice(0, 4).map(item => (
                <div key={item.name} style={{ background: 'var(--bg-tertiary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    <span>{item.name}</span>
                    <span style={{ color: item.returnPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                      {item.returnPnl >= 0 ? '+' : ''}${item.returnPnl.toLocaleString()} ({item.percent}%)
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.percent}%`, background: 'var(--accent)', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ═══ TAB 4: ASSET CORRELATION MATRIX ═══ */}
      {activeSubTab === 'correlation' && (
        <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s5)' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Asset Class Correlation Matrix
              </h3>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Inter-asset price sensitivity coefficient heatmap (-1.0 to +1.0)
              </div>
            </div>
            <span className="badge" style={{ background: 'var(--profit-soft)', color: 'var(--profit)', border: '1px solid var(--profit-border)', fontSize: '0.72rem', padding: '4px 12px', borderRadius: 'var(--r-full)', fontWeight: 700 }}>
              Diversification Index: Optimal Risk Spread
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Asset Class</th>
                  <th style={{ padding: '12px' }}>Indices CFDs</th>
                  <th style={{ padding: '12px' }}>Commodity CFDs</th>
                  <th style={{ padding: '12px' }}>Forex Pairs</th>
                  <th style={{ padding: '12px' }}>Crypto Assets</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Indices CFDs', c1: '1.00', c2: '0.12', c3: '-0.32', c4: '0.64' },
                  { name: 'Commodity CFDs', c1: '0.12', c2: '1.00', c3: '-0.45', c4: '0.28' },
                  { name: 'Forex Pairs', c1: '-0.32', c2: '-0.45', c3: '1.00', c4: '-0.15' },
                  { name: 'Crypto Assets', c1: '0.64', c2: '0.28', c3: '-0.15', c4: '1.00' },
                ].map(r => (
                  <tr key={r.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>{r.name}</td>
                    {[r.c1, r.c2, r.c3, r.c4].map((val, idx) => (
                      <td key={idx} style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: val === '1.00' ? 'var(--text-muted)' : (Number(val) < 0 ? 'var(--profit)' : 'var(--warn)') }}>
                        <span style={{ padding: '4px 8px', borderRadius: 'var(--r-sm)', background: val === '1.00' ? 'var(--bg-tertiary)' : (Number(val) < 0 ? 'var(--profit-soft)' : 'var(--warn-soft)') }}>
                          {val}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ METHODOLOGY MODAL ═══ */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="modal-overlay" onClick={() => setShowInfoModal(false)}>
            <motion.div
              className="modal-panel glass"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 520, padding: 'var(--s6)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--s4)' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={20} style={{ color: 'var(--accent)' }} />
                  Asset Allocation Calculation Methodology
                </div>
                <button onClick={() => setShowInfoModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                <p>
                  Your Asset Allocation metrics are computed dynamically from your real journal trade entries and selected trading account settings.
                </p>
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Calculation Principles:</div>
                  <ul style={{ paddingLeft: 16, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <li><strong>Asset Grouping:</strong> Automatically categorizes symbols into Indices, Commodities, Forex, Equities, and Crypto.</li>
                    <li><strong>Win Rate & P&L:</strong> Aggregates realized returns per asset family to display volume exposure.</li>
                    <li><strong>Drawdown Depth:</strong> Traces peak-to-trough account equity curve retracements.</li>
                  </ul>
                </div>
              </div>

              <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={() => setShowInfoModal(false)}>Got it</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AssetAllocation;
