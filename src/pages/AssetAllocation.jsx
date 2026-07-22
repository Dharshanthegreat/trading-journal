import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../contexts/TradeContext';
import { useAuth } from '../contexts/AuthContext';
import { accounts as accountsApi } from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
  PieChart as PieIcon, Layers, TrendingUp, TrendingDown,
  ShieldCheck, Award, Info, ExternalLink, Play, Lock, User,
  DollarSign, Percent, BarChart2, Clock, ArrowUpRight, Activity, CheckCircle,
  Sliders, Filter, ChevronRight, Wallet, RefreshCw
} from 'lucide-react';

const COLORS = ['#d946ef', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AssetAllocation = () => {
  const { trades, fetchTrades, loading } = useTrades();
  const { user } = useAuth();

  const [dataMode, setDataMode] = useState('live'); // 'live' | 'demo'
  const [allocationMode, setAllocationMode] = useState('family'); // 'family' | 'asset'
  const [timeframe, setTimeframe] = useState('ALL'); // 'YTD'|'1W'|'1M'|'3M'|'6M'|'1Y'|'2Y'|'ALL'
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [accountList, setAccountList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

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

  // Helper to categorize symbols into asset families
  const getAssetFamily = (symbol) => {
    if (!symbol) return 'Other Assets';
    const sym = symbol.toUpperCase();
    if (['NQ', 'ES', 'YM', 'US30', 'SPX', 'DAX', 'NAS100', 'US500', 'GER40', 'FTSE'].some(s => sym.includes(s))) {
      return 'Indices CFDs';
    }
    if (['XAUUSD', 'GOLD', 'SILVER', 'XAGUSD', 'USOIL', 'WTI', 'BRENT', 'NGAS'].some(s => sym.includes(s))) {
      return 'Commodity CFDs';
    }
    if (['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'EURGBP', 'GBPJPY', 'NZDUSD', 'USDCHF'].some(s => sym.includes(s))) {
      return 'Forex Pairs';
    }
    if (['BTCUSD', 'ETHUSD', 'SOLUSD', 'BTC', 'ETH', 'SOL', 'CRYPTO'].some(s => sym.includes(s))) {
      return 'Crypto Assets';
    }
    if (['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META'].some(s => sym.includes(s))) {
      return 'Equities & Stocks';
    }
    return 'Other Assets';
  };

  // Filter trades by Account and Timeframe
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

  // Compute Initial Capital size
  const initialCapital = useMemo(() => {
    if (selectedAccountId !== 'all' && accountList.length > 0) {
      const acc = accountList.find(a => String(a.id) === String(selectedAccountId));
      if (acc && acc.accountBalance) return Number(acc.accountBalance);
    }
    return Number(user?.accountSize) || 25000;
  }, [user, selectedAccountId, accountList]);

  // Dynamic KPI Stats calculated from actual filtered trades
  const liveStats = useMemo(() => {
    const totalPnl = filteredTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const returnPct = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0;
    const currentAum = initialCapital + totalPnl;
    const currentQuote = 100 + returnPct;

    // Calculate Max Drawdown
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

    // Calculate 6-month return
    const now = new Date();
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 6));
    const sixMonthsTrades = filteredTrades.filter(t => new Date(t.date || t.createdAt) >= sixMonthsAgo);
    const sixMonthsPnl = sixMonthsTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const return6mPct = initialCapital > 0 ? (sixMonthsPnl / initialCapital) * 100 : 0;

    // Calculate Today's PnL
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTrades = filteredTrades.filter(t => (t.date || t.createdAt || '').startsWith(todayStr));
    const todayPnl = todayTrades.reduce((sum, t) => sum + (Number(t.pnl) || 0), 0);
    const todayPct = initialCapital > 0 ? (todayPnl / initialCapital) * 100 : 0;

    // Calculate Win Rate
    const winsCount = filteredTrades.filter(t => Number(t.pnl) > 0).length;
    const winRate = filteredTrades.length > 0 ? (winsCount / filteredTrades.length) * 100 : 0;

    // Determine Tier Badge based on user performance
    let tier = { name: 'SILVER', color: '#cbd5e1', rank: '#2,788' };
    if (totalPnl >= 10000 && winRate >= 65) tier = { name: 'DIAMOND', color: '#38bdf8', rank: '#124' };
    else if (totalPnl >= 5000 && winRate >= 60) tier = { name: 'PLATINUM', color: '#e2e8f0', rank: '#482' };
    else if (totalPnl >= 2000 && winRate >= 55) tier = { name: 'GOLD', color: '#fbbf24', rank: '#1,120' };
    else if (totalPnl < 0) tier = { name: 'BRONZE', color: '#b45309', rank: '#4,512' };

    return {
      totalPnl,
      returnPct: Number(returnPct.toFixed(2)),
      maxDdPct: Number(maxDdPct.toFixed(2)),
      return6mPct: Number(return6mPct.toFixed(2)),
      currentAum,
      currentQuote: Number(currentQuote.toFixed(2)),
      todayPnl: Number(todayPnl.toFixed(2)),
      todayPct: Number(todayPct.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      tier
    };
  }, [filteredTrades, initialCapital]);

  // Compute Allocation Data Breakdown
  const allocationData = useMemo(() => {
    // If user has chosen DEMO mode or has no valid trades, return sample benchmark
    if (dataMode === 'demo' || filteredTrades.length === 0) {
      if (allocationMode === 'family') {
        return [
          { name: 'Commodity CFDs', count: 1240, percent: 48.3, winners: 68.4, returnPnl: 14250.50, returnPct: 14.25, avgWin: 240, avgLoss: 110, volume: 185.4 },
          { name: 'Indices CFDs', count: 820, percent: 31.9, winners: 61.2, returnPnl: 8120.00, returnPct: 8.12, avgWin: 310, avgLoss: 145, volume: 142.0 },
          { name: 'Forex Pairs', count: 350, percent: 13.6, winners: 54.8, returnPnl: -1150.20, returnPct: -1.15, avgWin: 180, avgLoss: 95, volume: 88.5 },
          { name: 'Crypto Assets', count: 159, percent: 6.2, winners: 72.1, returnPnl: 4890.00, returnPct: 4.89, avgWin: 420, avgLoss: 160, volume: 45.2 },
        ];
      } else {
        return [
          { name: 'XAUUSD (Gold)', count: 980, percent: 38.2, winners: 69.5, returnPnl: 11450.00, returnPct: 11.45, avgWin: 260, avgLoss: 115, volume: 145.0 },
          { name: 'NQ (Nasdaq 100)', count: 540, percent: 21.0, winners: 64.1, returnPnl: 6320.00, returnPct: 6.32, avgWin: 340, avgLoss: 150, volume: 95.0 },
          { name: 'ES (S&P 500)', count: 280, percent: 10.9, winners: 55.7, returnPnl: 1800.00, returnPct: 1.80, avgWin: 280, avgLoss: 130, volume: 47.0 },
          { name: 'EURUSD', count: 220, percent: 8.6, winners: 52.3, returnPnl: -850.00, returnPct: -0.85, avgWin: 160, avgLoss: 90, volume: 55.0 },
          { name: 'USOIL (Crude Oil)', count: 260, percent: 10.1, winners: 64.2, returnPnl: 2800.50, returnPct: 2.80, avgWin: 210, avgLoss: 105, volume: 40.4 },
          { name: 'BTCUSD (Bitcoin)', count: 159, percent: 6.2, winners: 72.1, returnPnl: 4890.00, returnPct: 4.89, avgWin: 420, avgLoss: 160, volume: 45.2 },
        ];
      }
    }

    // Group actual user trades dynamically
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

      groups[key].volume += Number(t.lotSize) || 1;
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
  }, [dataMode, filteredTrades, allocationMode, initialCapital]);

  // Selected item highlight or default to top item
  const activeFocusItem = selectedItem || allocationData[0] || {};

  const activeAccountObj = useMemo(() => {
    if (selectedAccountId === 'all') return null;
    return accountList.find(a => String(a.id) === String(selectedAccountId));
  }, [selectedAccountId, accountList]);

  return (
    <div className="asset-allocation-container" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)', paddingBottom: '80px' }}>
      
      {/* ═══ TOP CONTROLS & ACCOUNTS BAR ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--s3)', background: 'var(--bg-secondary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
        
        {/* Account Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
          <Wallet size={16} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Trading Account:</span>
          <select
            className="input"
            value={selectedAccountId}
            onChange={e => setSelectedAccountId(e.target.value)}
            style={{ width: 'auto', minWidth: '180px', padding: '4px 10px', fontSize: '0.78rem', height: 'auto' }}
          >
            <option value="all">All Accounts ({trades.length} trades)</option>
            {accountList.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} ({acc.currency || '$'}{Number(acc.accountBalance || 0).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Live vs Demo Data Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Data Source:</span>
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '3px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setDataMode('live')}
              className={`btn btn-sm ${dataMode === 'live' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '3px 10px', height: 'auto' }}
            >
              <Activity size={12} /> Live Website Data
            </button>
            <button
              onClick={() => setDataMode('demo')}
              className={`btn btn-sm ${dataMode === 'demo' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '3px 10px', height: 'auto' }}
            >
              Demo DARWIN Benchmark
            </button>
          </div>
        </div>

      </div>

      {/* ═══ TOP DARWIN INDEX BANNER ═══ */}
      <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-tertiary))' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--s6)', alignItems: 'start' }}>
          
          {/* Left Column: Index Header & KPI Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
            
            {/* Index Badge & Rank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)', flexWrap: 'wrap' }}>
              <div style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.1rem',
                padding: '6px 16px',
                borderRadius: 'var(--r-md)',
                letterSpacing: '0.04em',
                boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <PieIcon size={18} />
                {activeAccountObj ? activeAccountObj.accountName.slice(0, 8).toUpperCase() : (user?.displayName?.slice(0, 8).toUpperCase() || 'LMJW')}
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)' }}>
                <span style={{ color: 'var(--loss)', fontWeight: 800 }}>{dataMode === 'live' ? liveStats.tier.rank : '2,788th'}</span>{' '}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(May 2026)</span>
              </div>

              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: 'var(--profit)', fontSize: '0.7rem', padding: '4px 10px', borderRadius: 'var(--r-full)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <ShieldCheck size={13} /> DarwinIA Bonus +1 points
              </span>

              <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', color: liveStats.tier.color, fontSize: '0.7rem', padding: '4px 10px', borderRadius: 'var(--r-full)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Award size={13} /> DarwinIA {dataMode === 'live' ? liveStats.tier.name : 'SILVER'}: Active
              </span>
            </div>

            {/* Description Text */}
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              A DARWIN is an independently risk-managed and investable index that combines a trader's signals with Darwinex's independent Risk Management Engine.{' '}
              <a href="#more" onClick={e => e.preventDefault()} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                More information
              </a>
            </p>

            {/* 4 KPI Metric Box Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s3)', marginTop: 'var(--s2)' }}>
              
              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Return (since inception)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (dataMode === 'live' ? liveStats.returnPct : 21.32) >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {(dataMode === 'live' ? liveStats.returnPct : 21.32) >= 0 ? '+' : ''}
                  {dataMode === 'live' ? liveStats.returnPct : 21.32}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Max. drawdown
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  -{dataMode === 'live' ? liveStats.maxDdPct : 12.22}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Return (last 6 months)
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: (dataMode === 'live' ? liveStats.return6mPct : 7.03) >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                  {(dataMode === 'live' ? liveStats.return6mPct : 7.03) >= 0 ? '+' : ''}
                  {dataMode === 'live' ? liveStats.return6mPct : 7.03}%
                </div>
              </div>

              <div style={{ background: 'var(--bg-primary)', padding: 'var(--s3) var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
                  Assets under management
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  ${(dataMode === 'live' ? liveStats.currentAum : 215000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: Quote Card */}
          <div style={{ background: 'var(--bg-primary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Quote</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1.1, marginTop: 2 }}>
                {dataMode === 'live' ? liveStats.currentQuote : '121.32'}
              </div>
              <div style={{ fontSize: '0.72rem', color: (dataMode === 'live' ? liveStats.todayPnl : 0.90) >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                {(dataMode === 'live' ? liveStats.todayPnl : 0.90) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {dataMode === 'live' ? `${liveStats.todayPnl >= 0 ? '+' : ''}$${liveStats.todayPnl} (${liveStats.todayPct}%)` : '0.90 (0.75%) ↑'} today
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 6, fontSize: '0.78rem', background: 'linear-gradient(135deg, var(--accent), #6366f1)' }}>
              Invest in Index <ArrowUpRight size={14} />
            </button>
          </div>

        </div>
      </div>

      {/* ═══ SUB-NAVIGATION TABS & TIMEFRAME BAR ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s3)', flexWrap: 'wrap', gap: 'var(--s3)' }}>
        
        {/* Sub-tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s4)' }}>
          {[
            { id: 'return_risk', label: 'Return / Risk' },
            { id: 'assets', label: 'Assets & timeframe', active: true },
            { id: 'strategy', label: 'Strategy Analysis' },
            { id: 'correlation', label: 'Correlation' },
            { id: 'signal', label: 'Signal Account', locked: true },
          ].map(t => (
            <button
              key={t.id}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: t.active ? '2px solid var(--accent)' : '2px solid transparent',
                padding: '6px 4px',
                fontSize: '0.82rem',
                fontWeight: t.active ? 700 : 500,
                color: t.active ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all var(--t-fast)'
              }}
            >
              {t.label}
              {t.locked && <Lock size={12} style={{ opacity: 0.6 }} />}
            </button>
          ))}
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

      {/* ═══ MAIN ASSET ALLOCATION LAYOUT (MAIN CONTENT + RIGHT SIDEBAR) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--s6)', alignItems: 'start' }}>
        
        {/* Left Side: Asset Allocation Visualizations & Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          
          {/* Header & Toggle */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Asset allocation
                </h2>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                  Last update: {new Date().toLocaleDateString('en-GB')} UTC
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 'var(--s2)', marginBottom: 'var(--s4)' }}>
              Percentage of trades your website journal has recorded in each different asset and by asset family (forex, commodities, indices, stocks...), as well as the accumulated return in each one of them.
            </p>

            {/* Toggle Buttons: By Family | By Asset */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setAllocationMode('family'); setSelectedItem(null); }}
                className={`btn btn-sm ${allocationMode === 'family' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', padding: '6px 14px' }}
              >
                By Family
              </button>
              <button
                onClick={() => { setAllocationMode('asset'); setSelectedItem(null); }}
                className={`btn btn-sm ${allocationMode === 'asset' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.72rem', padding: '6px 14px' }}
              >
                By Asset
              </button>
            </div>
          </div>

          {/* Donut Chart & Highlight Cards Row */}
          <div className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--s6)', alignItems: 'center' }}>
            
            {/* Donut Allocation Chart */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <div style={{ width: '100%', height: 220 }}>
                {allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={allocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
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
                        formatter={(val, name) => [`${val}%`, 'Allocation']}
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
                    No trades found
                  </div>
                )}

                {/* Center Stats Ring Label */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeFocusItem?.percent ? `${activeFocusItem.percent}%` : '100%'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeFocusItem?.name || 'Total Volume'}
                  </div>
                </div>
              </div>

              {/* Chart Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', justifyContent: 'center', marginTop: 'var(--s3)' }}>
                {allocationData.map((item, idx) => (
                  <div
                    key={item.name}
                    onClick={() => setSelectedItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      color: activeFocusItem?.name === item.name ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: activeFocusItem?.name === item.name ? 700 : 400
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[idx % COLORS.length] }} />
                    <span>{item.name} ({item.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Asset/Family KPI Highlights Grid (matches screenshot) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[allocationData.findIndex(i => i.name === activeFocusItem?.name) % COLORS.length] || 'var(--accent)' }} />
                  {activeFocusItem?.name || 'Asset Metrics'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {activeFocusItem?.percent || 0}% of portfolio trades
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
                
                {/* Trades Count */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Trades Executed
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeFocusItem?.count ? activeFocusItem.count.toLocaleString() : '0'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Total positions entered
                  </div>
                </div>

                {/* % Winners */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    % Winners
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: (activeFocusItem?.winners || 0) >= 50 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                    {activeFocusItem?.winners ? `${activeFocusItem.winners}%` : '0%'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Profitable trades ratio
                  </div>
                </div>

                {/* Accumulated Return P&L */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Accumulated P&L
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: (activeFocusItem?.returnPnl || 0) >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                    {(activeFocusItem?.returnPnl || 0) >= 0 ? '+' : ''}${activeFocusItem?.returnPnl?.toLocaleString() || '0.00'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    {(activeFocusItem?.returnPct || 0) >= 0 ? '+' : ''}{activeFocusItem?.returnPct || 0}% account return
                  </div>
                </div>

                {/* Traded Volume */}
                <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Volume Exposure
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeFocusItem?.volume || 0} Lots
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    Avg win: ${activeFocusItem?.avgWin || 0}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Breakdown Table */}
          <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--s4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} style={{ color: 'var(--accent)' }} />
              Asset Breakdown Data Table
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Asset / Family</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600 }}>Allocation %</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Trades</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>% Winners</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Avg Win / Loss</th>
                    <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Accumulated Return</th>
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
                      <td style={{ padding: '12px', width: '180px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${item.percent}%`, background: COLORS[idx % COLORS.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.percent}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.count.toLocaleString()}
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

        {/* Right Sidebar Widgets (matching the right side panel in user's image) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
          
          {/* User Profile Card */}
          <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 'var(--s3)' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', fontWeight: 800, fontSize: '1rem',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              flexShrink: 0
            }}>
              {user?.displayName?.[0] || 'D'}
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Welcome,</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {user?.displayName || 'dharshan'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--profit)', fontWeight: 600, marginTop: 2 }}>
                Active since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : '05/06/2025'}
              </div>
            </div>
          </div>

          {/* DARWIN Index Creation Card */}
          <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>DARWIN Index Creation</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>(3/12)</span>
            </div>

            {/* Video Thumbnail Box */}
            <div style={{
              height: 120,
              background: 'linear-gradient(135deg, #1e1b4b, #0f172a)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border-mid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.4)'
              }}>
                <Play size={18} style={{ color: '#ffffff', marginLeft: 2 }} />
              </div>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Do you have questions?</span>
              <a href="#help" onClick={e => e.preventDefault()} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                Zero Help <ExternalLink size={10} />
              </a>
            </div>
          </div>

          {/* Participating Tier Badge Card */}
          <div className="glass" style={{ padding: 'var(--s5)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Participating in DarwinIA
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '0.04em', color: dataMode === 'live' ? liveStats.tier.color : '#cbd5e1' }}>
              {dataMode === 'live' ? liveStats.tier.name : 'SILVER'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 'var(--s2)', marginTop: 'var(--s1)' }}>
              <span>Current position (temporary)</span>
              <strong style={{ color: 'var(--accent)' }}>{dataMode === 'live' ? liveStats.tier.rank : '#2,788'}</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default AssetAllocation;
