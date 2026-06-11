import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BarChart2, Brain,
  Image as ImageIcon, Settings as SettingsIcon,
  LogOut, Activity, TrendingUp, TrendingDown,
  Zap, CalendarDays, NotebookPen, Sun, Moon,
  Leaf, Compass, SunDim, Check, Palette,
  MessageSquare, Wifi
} from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { TradeProvider, useTrades } from './contexts/TradeContext';
import { JournalProvider } from './contexts/JournalContext';
import LoginPage from './components/auth/LoginPage';
import Settings from './pages/Settings';
import Journal from './pages/Journal';
import Emotions from './pages/Emotions';
import Analytics from './pages/Analytics';
import Charts from './pages/Charts';
import CalendarPage from './pages/Calendar';
import DailyJournal from './pages/DailyJournal';
import SharedTrade from './pages/SharedTrade';
import AiCoach from './pages/AiCoach';
import TradingViewPage from './pages/TradingView';
import MT5Connect from './pages/MT5Connect';
import LandingPage from './pages/LandingPage';
import {
  AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { format } from 'date-fns';
import './App.css';

/* ─── Dashboard ─────────────────────────────────── */
const Dashboard = () => {
  const { trades, fetchTrades, analytics, fetchAnalytics, loading } = useTrades();
  
  // Filter states
  const [dateRange, setDateRange] = useState('all');
  const [selectedSymbol, setSelectedSymbol] = useState('All');
  const [selectedSetup, setSelectedSetup] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  
  // Chart view state
  const [chartView, setChartView] = useState('equity');
  const [insightTab, setInsightTab] = useState('metrics'); // 'metrics' or 'leaks'

  useEffect(() => {
    fetchTrades({ limit: 200 });
    fetchAnalytics();
  }, [fetchTrades, fetchAnalytics]);

  // Compute unique symbols & setups for filter dropdowns from all trades
  const uniqueSymbols = useMemo(() => {
    const syms = trades.map(t => t.symbol?.toUpperCase()).filter(Boolean);
    return [...new Set(syms)].sort();
  }, [trades]);

  const uniqueSetups = useMemo(() => {
    const setups = trades.map(t => t.setup).filter(Boolean);
    return [...new Set(setups)].sort();
  }, [trades]);

  // Filter trades locally for fast interactive response
  const filteredTrades = useMemo(() => {
    let result = [...trades];
    const now = new Date();

    // 1. Date filter
    if (dateRange === '7d') {
      const cut = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(t => new Date(t.entryTime || t.entry_time) >= cut);
    } else if (dateRange === '30d') {
      const cut = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(t => new Date(t.entryTime || t.entry_time) >= cut);
    } else if (dateRange === '90d') {
      const cut = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      result = result.filter(t => new Date(t.entryTime || t.entry_time) >= cut);
    } else if (dateRange === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      result = result.filter(t => new Date(t.entryTime || t.entry_time) >= startOfYear);
    }

    // 2. Symbol filter
    if (selectedSymbol !== 'All') {
      result = result.filter(t => t.symbol?.toUpperCase() === selectedSymbol.toUpperCase());
    }

    // 3. Setup filter
    if (selectedSetup !== 'All') {
      result = result.filter(t => t.setup === selectedSetup);
    }

    // 4. Side (type) filter
    if (selectedType !== 'All') {
      result = result.filter(t => t.type === selectedType);
    }

    return result;
  }, [trades, dateRange, selectedSymbol, selectedSetup, selectedType]);

  // Handle reset
  const handleResetFilters = () => {
    setDateRange('all');
    setSelectedSymbol('All');
    setSelectedSetup('All');
    setSelectedType('All');
  };

  // Recalculate stats dynamically based on filtered trades
  const stats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        wins: 0,
        losses: 0,
        profitFactor: '0.00',
        avgWin: '0.00',
        avgLoss: '0.00',
        maxWinStreak: 0,
        maxLossStreak: 0,
        maxDrawdown: 0,
        bestTrade: null,
        worstTrade: null,
      };
    }

    const wins = filteredTrades.filter(t => t.pnl > 0);
    const losses = filteredTrades.filter(t => t.pnl < 0);
    const totalPnL = filteredTrades.reduce((acc, t) => acc + t.pnl, 0);
    const totalWin = wins.reduce((acc, t) => acc + t.pnl, 0);
    const totalLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
    
    const winRate = ((wins.length / totalTrades) * 100).toFixed(1);
    const profitFactor = totalLoss > 0 ? (totalWin / totalLoss).toFixed(2) : (wins.length > 0 ? 'Infinity' : '0.00');
    const avgWin = wins.length > 0 ? (totalWin / wins.length).toFixed(2) : '0.00';
    const avgLoss = losses.length > 0 ? (totalLoss / losses.length).toFixed(2) : '0.00';

    // Streaks (ordered chronologically)
    const chronoTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
    let streakType = null;
    
    chronoTrades.forEach(t => {
      const isWin = t.pnl > 0;
      if (streakType === null) {
        streakType = isWin;
        currentStreak = 1;
      } else if (isWin === streakType) {
        currentStreak++;
      } else {
        streakType = isWin;
        currentStreak = 1;
      }
      if (isWin && currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      if (!isWin && currentStreak > maxLossStreak) maxLossStreak = currentStreak;
    });

    // Drawdowns
    let running = 0, peak = 0, maxDrawdown = 0;
    chronoTrades.forEach(t => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    // Best & Worst
    const bestTrade = filteredTrades.reduce((best, t) => !best || t.pnl > best.pnl ? t : best, null);
    const worstTrade = filteredTrades.reduce((worst, t) => !worst || t.pnl < worst.pnl ? t : worst, null);

    return {
      totalTrades,
      totalPnL,
      winRate: parseFloat(winRate),
      wins: wins.length,
      losses: losses.length,
      profitFactor,
      avgWin,
      avgLoss,
      maxWinStreak,
      maxLossStreak,
      maxDrawdown,
      bestTrade,
      worstTrade,
    };
  }, [filteredTrades]);

  // Compute charts data
  const chartsData = useMemo(() => {
    const chronoTrades = [...filteredTrades].sort((a, b) => new Date(a.entryTime || a.entry_time) - new Date(b.entryTime || b.entry_time));
    
    let running = 0;
    let peak = 0;
    
    const equityCurve = chronoTrades.map((t, idx) => {
      running += t.pnl;
      return {
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d') : '',
        equity: parseFloat(running.toFixed(2)),
        pnl: t.pnl,
        symbol: t.symbol,
      };
    });

    running = 0;
    const drawdownCurve = chronoTrades.map((t, idx) => {
      running += t.pnl;
      if (running > peak) peak = running;
      const dd = peak - running;
      return {
        index: idx + 1,
        date: t.entryTime ? format(new Date(t.entryTime), 'MMM d') : '',
        drawdown: parseFloat(dd.toFixed(2)),
        pnl: t.pnl,
        symbol: t.symbol,
      };
    });

    const pnlBars = chronoTrades.map((t, idx) => ({
      name: `${t.symbol} #${idx+1}`,
      pnl: t.pnl,
    }));

    return { equityCurve, drawdownCurve, pnlBars };
  }, [filteredTrades]);

  // Compute Setup breakdown dynamically
  const setupBreakdown = useMemo(() => {
    const setupsMap = {};
    filteredTrades.forEach(t => {
      const s = t.setup || 'Untagged';
      if (!setupsMap[s]) setupsMap[s] = { setup: s, count: 0, wins: 0, pnl: 0 };
      setupsMap[s].count++;
      setupsMap[s].pnl += t.pnl;
      if (t.pnl > 0) setupsMap[s].wins++;
    });

    return Object.values(setupsMap)
      .map(item => ({
        ...item,
        winRate: item.count ? parseFloat(((item.wins / item.count) * 100).toFixed(1)) : 0,
        pnl: parseFloat(item.pnl.toFixed(2))
      }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  // Compute Cognitive/FOMO leak stats
  const cognitiveLeaks = useMemo(() => {
    const fomoTrades = filteredTrades.filter(t => (t.fomoLevel || 5) > 5);
    const disciplinedTrades = filteredTrades.filter(t => (t.fomoLevel || 5) <= 5);
    
    const fomoCount = fomoTrades.length;
    const discCount = disciplinedTrades.length;

    const fomoPnL = fomoTrades.reduce((acc, t) => acc + t.pnl, 0);
    const discPnL = disciplinedTrades.reduce((acc, t) => acc + t.pnl, 0);

    const fomoWins = fomoTrades.filter(t => t.pnl > 0);
    const fomoWinRate = fomoCount ? ((fomoWins.length / fomoCount) * 100).toFixed(1) : '0';

    const discWins = disciplinedTrades.filter(t => t.pnl > 0);
    const discWinRate = discCount ? ((discWins.length / discCount) * 100).toFixed(1) : '0';

    return {
      fomoCount,
      discCount,
      fomoPnL: parseFloat(fomoPnL.toFixed(2)),
      discPnL: parseFloat(discPnL.toFixed(2)),
      fomoWinRate,
      discWinRate,
      fomoCost: fomoPnL < 0 ? Math.abs(fomoPnL) : 0,
    };
  }, [filteredTrades]);

  if (loading && !trades.length) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--s4)' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass skeleton" style={{ height: '100px', borderRadius: 'var(--r-lg)' }} />
        ))}
      </div>
    );
  }

  // Ring progression helper
  const winRateNum = stats.winRate;
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winRateNum / 100) * circumference;

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const v = payload[0].value;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Trade #{p.index} · {p.date}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s4)' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{p.symbol}</span>
          <span style={{ color: p.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700 }}>
            {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
          </span>
        </div>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem' }}>
            {chartView === 'equity' ? 'Cumulative P&L:' : 'Drawdown:'}
          </span>
          <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: chartView === 'equity' ? (v >= 0 ? 'var(--profit)' : 'var(--loss)') : 'var(--loss)' }}>
            {chartView === 'equity' ? (v >= 0 ? '+' : '') : ''}${v.toFixed(2)}
          </span>
        </div>
      </div>
    );
  };

  const BarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const v = payload[0].value;
    const name = payload[0].payload.name;
    return (
      <div className="glass" style={{ padding: '8px 12px', fontSize: '0.75rem', border: '1px solid var(--border-strong)' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: '2px' }}>{name}</div>
        <span style={{ color: v >= 0 ? 'var(--profit)' : 'var(--loss)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
          {v >= 0 ? '+' : ''}${v.toFixed(2)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s5)' }}>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: 0 }}>
        <div>
          <div className="page-title">
            <span className="status-dot live" />
            Trading Dashboard
          </div>
          <div className="page-subtitle">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} · Running stats for {stats.totalTrades} of {trades.length} total trades
          </div>
        </div>
      </div>

      {/* Filter Station */}
      <div className="glass" style={{ padding: 'var(--s3) var(--s4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--s4)', alignItems: 'center', justifyContent: 'space-between', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Date Range Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="label-sm" style={{ fontSize: '0.58rem' }}>Date Range</span>
            <select className="input btn-ghost" value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: '3px 8px', height: '28px', fontSize: '0.72rem', width: '110px', background: 'var(--bg-primary)' }}>
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>

          {/* Symbol Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="label-sm" style={{ fontSize: '0.58rem' }}>Symbol</span>
            <select className="input btn-ghost" value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)} style={{ padding: '3px 8px', height: '28px', fontSize: '0.72rem', width: '110px', background: 'var(--bg-primary)' }}>
              <option value="All">All Symbols</option>
              {uniqueSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Setup Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="label-sm" style={{ fontSize: '0.58rem' }}>Setup</span>
            <select className="input btn-ghost" value={selectedSetup} onChange={e => setSelectedSetup(e.target.value)} style={{ padding: '3px 8px', height: '28px', fontSize: '0.72rem', width: '120px', background: 'var(--bg-primary)' }}>
              <option value="All">All Setups</option>
              {uniqueSetups.map(s => (
                <option key={s} value={s}>{s || 'Untagged'}</option>
              ))}
            </select>
          </div>

          {/* Side Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span className="label-sm" style={{ fontSize: '0.58rem' }}>Side</span>
            <select className="input btn-ghost" value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ padding: '3px 8px', height: '28px', fontSize: '0.72rem', width: '90px', background: 'var(--bg-primary)' }}>
              <option value="All">All Sides</option>
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleResetFilters} style={{ padding: '3px 10px', height: '28px', fontSize: '0.7rem' }}>
          Reset Filters
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid" style={{ marginBottom: 0 }}>
        {/* Total PnL */}
        <div className="glass glass-hover stat-card anim-fade-up delay-1" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="stat-label">
            <span style={{ color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
              {stats.totalPnL >= 0 ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
            </span>
            Total P&L
          </div>
          <div className="stat-value" style={{ color: stats.totalPnL >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
          </div>
          <div className="stat-delta">
            <span>Wins: {stats.wins} | Losses: {stats.losses}</span>
          </div>
        </div>

        {/* Win Rate Ring */}
        <div className="glass glass-hover stat-card anim-fade-up delay-2" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 'var(--s5)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)' }}>
            <div className="stat-label"><span style={{ color: 'var(--accent)' }}><Zap size={13}/></span> Win Rate</div>
            <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
              {stats.winRate}%
            </div>
            <div className="stat-delta">
              <span>Ratio: {(stats.totalTrades ? (stats.wins / stats.totalTrades) : 0).toFixed(2)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '60px', height: '60px' }}>
            <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="30" cy="30" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="4" />
              <circle cx="30" cy="30" r={radius} fill="transparent" stroke={winRateNum >= 50 ? 'var(--profit)' : 'var(--loss)'} strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', fontSize: '0.62rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              {winRateNum.toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="glass glass-hover stat-card anim-fade-up delay-3">
          <div className="stat-label">
            <span style={{ color: 'var(--info)' }}><Activity size={13}/></span>
            Volume
          </div>
          <div className="stat-value" style={{ color: 'var(--info)' }}>
            {stats.totalTrades}
          </div>
          <div className="stat-delta">
            <span>Streak: Max Win {stats.maxWinStreak} / Loss {stats.maxLossStreak}</span>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="glass glass-hover stat-card anim-fade-up delay-4">
          <div className="stat-label">
            <span style={{ color: 'var(--warn)' }}><BarChart2 size={13}/></span>
            Expectancy
          </div>
          <div className="stat-value" style={{ color: 'var(--warn)' }}>
            {stats.profitFactor === 'Infinity' ? '∞' : stats.profitFactor}
          </div>
          <div className="stat-delta">
            <span>Avg: Win ${stats.avgWin} / Loss -${stats.avgLoss}</span>
          </div>
        </div>
      </div>

      {/* Charts Station & Insights Row */}
      <div className="charts-row" style={{ margin: 0 }}>
        {/* Interactive Chart Panel */}
        <div className="glass chart-panel anim-fade-up delay-3" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="chart-title" style={{ margin: 0 }}>Performance Charts</span>
            <div className="tabs" style={{ margin: 0, borderBottom: 'none', gap: '2px' }}>
              <button className={`tab btn-sm ${chartView === 'equity' ? 'active' : ''}`} onClick={() => setChartView('equity')} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Cumulative P&L</button>
              <button className={`tab btn-sm ${chartView === 'drawdown' ? 'active' : ''}`} onClick={() => setChartView('drawdown')} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Drawdown</button>
              <button className={`tab btn-sm ${chartView === 'pnlBars' ? 'active' : ''}`} onClick={() => setChartView('pnlBars')} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>Trade Bars</button>
            </div>
          </div>

          {filteredTrades.length > 0 ? (
            <div style={{ width: '100%', height: '250px' }}>
              {chartView === 'equity' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.equityCurve} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mid)" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}/>
                    <ReferenceLine y={0} stroke="var(--border-strong)" strokeDasharray="3 3"/>
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}/>
                    <Area type="monotone" dataKey="equity" stroke="var(--accent)" strokeWidth={2} fill="url(#equityGrad)" dot={{ stroke: 'var(--accent)', strokeWidth: 1.5, r: 2, fill: 'var(--bg-secondary)' }}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {chartView === 'drawdown' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.drawdownCurve} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                    <defs>
                      <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--loss)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--loss)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mid)" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}/>
                    <ReferenceLine y={0} stroke="var(--border-strong)"/>
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}/>
                    <Area type="monotone" dataKey="drawdown" stroke="var(--loss)" strokeWidth={1.5} fill="url(#drawdownGrad)" dot={{ stroke: 'var(--loss)', strokeWidth: 1.5, r: 2, fill: 'var(--bg-secondary)' }}/>
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {chartView === 'pnlBars' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartsData.pnlBars} margin={{ top: 10, right: 10, bottom: 0, left: -25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-mid)" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: 'Inter' }} axisLine={false} tickLine={false} hide/>
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false}/>
                    <ReferenceLine y={0} stroke="var(--border-strong)"/>
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--surface-glass-h)' }}/>
                    <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
                      {chartsData.pnlBars.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'} opacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="empty-desc">No trade data matches the selected filters.</span>
            </div>
          )}
        </div>

        {/* Diagnostic Insights Panel */}
        <div className="glass chart-panel anim-fade-up delay-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--s2)' }}>
            <span className="chart-title" style={{ margin: 0 }}>Behavioral Audits</span>
            <div className="tabs" style={{ margin: 0, borderBottom: 'none', gap: '2px' }}>
              <button className={`tab btn-sm ${insightTab === 'metrics' ? 'active' : ''}`} onClick={() => setInsightTab('metrics')} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Metrics</button>
              <button className={`tab btn-sm ${insightTab === 'leaks' ? 'active' : ''}`} onClick={() => setInsightTab('leaks')} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Leaks</button>
            </div>
          </div>

          {insightTab === 'metrics' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', flex: 1, justifyContent: 'center' }}>
              {[
                { label: 'Avg Win Trade', val: `$${stats.avgWin}`, col: 'var(--profit)' },
                { label: 'Avg Loss Trade', val: `-$${stats.avgLoss}`, col: 'var(--loss)' },
                { label: 'Ratio (W/L)', val: stats.avgLoss !== '0.00' ? `1:${(parseFloat(stats.avgWin)/parseFloat(stats.avgLoss) || 1).toFixed(1)}` : '—', col: 'var(--text-primary)' },
                { label: 'Max Drawdown', val: `-$${stats.maxDrawdown.toFixed(2)}`, col: 'var(--loss)' },
              ].map((item, idx) => (
                <div key={item.label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '6px 0',
                  borderBottom: idx < 3 ? '1px solid var(--border)' : 'none',
                  fontSize: '0.78rem'
                }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: item.col, fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>{item.val}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', flex: 1, justifyContent: 'center' }}>
              {cognitiveLeaks.fomoCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', padding: 'var(--s2)', borderRadius: 'var(--r-sm)', background: 'var(--loss-soft)', border: '1px solid var(--loss-border)' }}>
                    <span style={{ color: 'var(--loss)', display: 'flex', alignItems: 'center' }}><TrendingDown size={14} /></span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                      FOMO cost you <strong style={{ color: 'var(--loss)', fontFamily: 'JetBrains Mono' }}>-${cognitiveLeaks.fomoCost.toFixed(2)}</strong> over {cognitiveLeaks.fomoCount} trades.
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Disciplined Win Rate:</span>
                      <span style={{ fontWeight: 600, color: 'var(--profit)' }}>{cognitiveLeaks.discWinRate}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>FOMO Win Rate:</span>
                      <span style={{ fontWeight: 600, color: 'var(--loss)' }}>{cognitiveLeaks.fomoWinRate}%</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                    Coaching tip: Stop chasing entries. Your disciplined execution yields better risk reward.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--s3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--s2)' }}>
                  <span style={{ color: 'var(--profit)', display: 'flex', alignItems: 'center' }}><Check size={20} /></span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>100% Disciplined Session</div>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>No high-FOMO trades found. You've protected your equity curve from emotional leaks!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Setup & Recent Trades Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 'var(--s5)' }}>
        {/* Setup Expectancy */}
        <div className="glass chart-panel anim-fade-up delay-5" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div className="chart-title" style={{ margin: 0, paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
            <span>Performance by Setup</span>
          </div>
          {setupBreakdown.length > 0 ? (
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table className="data-table" style={{ fontSize: '0.72rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 8px' }}>Setup</th>
                    <th style={{ padding: '6px 8px' }}>Trades</th>
                    <th style={{ padding: '6px 8px' }}>Win %</th>
                    <th style={{ padding: '6px 8px' }}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {setupBreakdown.map(item => (
                    <tr key={item.setup} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 600, padding: '8px 8px' }}>{item.setup}</td>
                      <td style={{ color: 'var(--text-muted)', padding: '8px 8px' }}>{item.count}</td>
                      <td style={{ padding: '8px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="progress-track" style={{ width: '40px', height: '3px' }}>
                            <div className="progress-fill" style={{ width: `${item.winRate}%`, background: 'var(--accent)' }}/>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{item.winRate}%</span>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: item.pnl >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'JetBrains Mono', padding: '8px 8px', textAlign: 'right' }}>
                        {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--s5)' }}>
              <span className="empty-desc">No setups logged in this view.</span>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass chart-panel anim-fade-up delay-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div className="chart-title" style={{ margin: 0, paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
            <span>Recent Trades</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', justifyContent: 'center', flex: 1 }}>
            {filteredTrades.slice(0, 4).map((t, idx) => (
              <div key={t.id || idx} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '8px 0',
                borderBottom: idx < 3 ? '1px solid var(--border)' : 'none',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
                  <span className={`badge ${t.type === 'Long' ? 'badge-profit' : 'badge-loss'}`} style={{ padding: '1px 6px', fontSize: '0.6rem' }}>{t.type}</span>
                  <span style={{ fontWeight: 600 }}>{t.symbol}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>({t.setup || 'Untagged'})</span>
                </div>
                <span style={{
                  fontWeight: 700, fontFamily: 'JetBrains Mono',
                  color: t.pnl >= 0 ? 'var(--profit)' : 'var(--loss)',
                  fontSize: '0.78rem'
                }}>
                  {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                </span>
              </div>
            ))}
            {filteredTrades.length === 0 && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textAlign: 'center', padding: 'var(--s4)' }}>No trades found.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Sidebar ─────────────────────────────────── */
const Sidebar = () => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const nav = [
    { path: '/',              icon: <LayoutDashboard size={16}/>, label: 'Dashboard' },
    { path: '/journal',       icon: <BookOpen size={16}/>,        label: 'Journal' },
    { path: '/calendar',      icon: <CalendarDays size={16}/>,    label: 'Calendar' },
    { path: '/analytics',     icon: <BarChart2 size={16}/>,       label: 'Analytics' },
    { path: '/psychology',    icon: <Brain size={16}/>,           label: 'Psychology' },
    { path: '/ai-coach',      icon: <MessageSquare size={16}/>,   label: 'AI Coach' },
    { path: '/tradingview',   icon: <TrendingUp size={16}/>,      label: 'TV Analysis' },
    { path: '/mt5-connect',   icon: <Wifi size={16}/>,             label: 'MT5 Connect' },
    { path: '/daily-journal', icon: <NotebookPen size={16}/>,     label: 'Daily Notes' },
    { path: '/charts',        icon: <ImageIcon size={16}/>,       label: 'Charts' },
  ];

  const initials = user?.displayName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'T';

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">
          <Activity size={16}/>
        </div>
        <span>Trading Journal</span>
      </div>

      <div className="nav-section-label">Navigation</div>
      <nav className="nav-links">
        {nav.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: 'var(--s4)' }}>
        <div className="nav-section-label">System</div>
        <Link to="/settings" className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}>
          <SettingsIcon size={16}/>
          <span>Settings</span>
        </Link>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-info">
          <div className="sidebar-avatar">{initials}</div>
          <div>
            <div className="sidebar-user-name">{user?.displayName || 'Trader'}</div>
            <div className="sidebar-user-role">
              <span className="status-dot live"/>
              online
            </div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          <LogOut size={14}/>
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
};

/* ─── Header ─────────────────────────────────── */
const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [time, setTime] = useState(new Date());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClose = () => setDropdownOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [dropdownOpen]);

  const pageNames = {
    '/': 'Dashboard', '/journal': 'Journal', '/calendar': 'Calendar',
    '/analytics': 'Analytics', '/psychology': 'Psychology',
    '/daily-journal': 'Daily Notes', '/charts': 'Charts', '/settings': 'Settings',
    '/tradingview': 'TradingView Analysis', '/ai-coach': 'AI Coach',
    '/mt5-connect': 'MT5 Connect',
  };

  const themeList = [
    { id: 'dark', name: 'Dark Theme', icon: <Moon size={13} />, bg: '#0a0b0f', accent: '#818cf8' },
    { id: 'light', name: 'Light Theme', icon: <Sun size={13} />, bg: '#ffffff', accent: '#4f46e5' },
    { id: 'nord', name: 'Nord Arctic', icon: <Compass size={13} />, bg: '#1a1e2a', accent: '#88c0d0' },
    { id: 'forest', name: 'Forest Pine', icon: <Leaf size={13} />, bg: '#0b0f0d', accent: '#10b981' },
    { id: 'sunset', name: 'Sunset Amber', icon: <SunDim size={13} />, bg: '#120f0e', accent: '#f97316' },
    { id: 'minimal', name: 'Minimalist', icon: <Palette size={13} />, bg: '#ffffff', accent: '#000000' },
  ];

  const currentThemeObj = themeList.find(t => t.id === theme) || themeList[0];

  return (
    <header className="header">
      <div className="header-breadcrumb">
        <span>Trading Journal</span>
        <span className="header-sep">/</span>
        <strong>{pageNames[location.pathname] || 'Page'}</strong>
      </div>
      <div className="header-right" style={{ gap: 'var(--s3)', position: 'relative' }}>
        <span className="header-time">{format(time, 'HH:mm:ss')}</span>
        
        {/* Custom Premium Theme Selector */}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <button
            className="btn btn-ghost"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '30px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)'
            }}
            title="Choose Theme"
          >
            {currentThemeObj.icon}
            <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>{currentThemeObj.name.split(' ')[0]}</span>
          </button>

          {dropdownOpen && (
            <div
              className="glass anim-fade-up"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                width: '160px',
                zIndex: 1000,
                padding: '4px',
                boxShadow: 'var(--shadow-lg)',
                borderRadius: 'var(--r-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-mid)'
              }}
            >
              {themeList.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 'var(--r-sm)',
                    border: 'none',
                    background: theme === t.id ? 'var(--bg-active)' : 'transparent',
                    color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background var(--t-fast)'
                  }}
                  className="theme-menu-item"
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = theme === t.id ? 'var(--bg-active)' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', color: theme === t.id ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                      {t.icon}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: theme === t.id ? 600 : 400 }}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: t.accent,
                      border: `1px solid ${t.id === 'light' ? 'rgba(0,0,0,0.1)' : 'transparent'}`
                    }} />
                    {theme === t.id && <Check size={11} style={{ color: 'var(--accent)' }} />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="header-avatar">
          {user?.displayName?.[0] || 'T'}
        </div>
      </div>
    </header>
  );
};

/* ─── App Shell ─────────────────────────────────── */
function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: 'var(--s4)',
        color: 'var(--text-muted)', fontSize: '0.8rem',
        background: 'var(--bg-primary)',
      }}>
        <div className="logo-icon anim-fade-in" style={{ width: 40, height: 40, borderRadius: 'var(--r-lg)', background: 'linear-gradient(135deg, var(--accent), #a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Activity size={20} color="#fff"/>
        </div>
        Loading Trading Journal...
      </div>
    );
  }
  const isPublicRoute = location.pathname.startsWith('/shared/');

  if (isPublicRoute) {
    return (
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
        <Routes>
          <Route path="/shared/trade/:token" element={<SharedTrade />} />
        </Routes>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Header />
        <div className="page-container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/psychology" element={<Emotions />} />
            <Route path="/ai-coach" element={<AiCoach />} />
            <Route path="/tradingview" element={<TradingViewPage />} />
            <Route path="/mt5-connect" element={<MT5Connect />} />
            <Route path="/daily-journal" element={<DailyJournal />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <TradeProvider>
          <JournalProvider>
            <Router>
              <AppContent />
            </Router>
          </JournalProvider>
        </TradeProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
